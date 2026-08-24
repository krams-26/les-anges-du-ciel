import { and, asc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  academicYears,
  auditEvents,
  classCourses,
  classes,
  courses,
  enrollments,
  guardians,
  guardianUserLinks,
  students,
  teachers,
  teachingAssignments,
  users,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { assertPermission } from "../permissions";
import { adminProcedure, protectedProcedure, router } from "../_core/trpc";

const sex = z.enum(["F", "M"]);
const enrollmentType = z.enum(["new", "re_enrollment", "transfer", "repeat"]);

export const schoolInputs = {
  studentCreate: z.object({
    studentCode: z.string().trim().min(4).max(32),
    lastName: z.string().trim().min(2).max(120),
    postName: z.string().trim().max(120).optional(),
    firstName: z.string().trim().min(2).max(120),
    sex,
    birthDate: z.coerce.date().optional(),
    phone: z.string().trim().max(40).optional(),
    academicYearId: z.number().int().positive(),
    classId: z.number().int().positive().optional(),
    enrollmentType,
    guardians: z.array(z.object({
      fullName: z.string().trim().min(2).max(180),
      relationship: z.enum(["father", "mother", "guardian", "other"]),
      phone: z.string().trim().min(5).max(40),
      isPrimary: z.boolean().default(false),
      receivesCommunications: z.boolean().default(true),
      canViewResults: z.boolean().default(true),
      canMakePayments: z.boolean().default(false),
    })).min(1),
  }),
  studentBulkCreate: z.object({
    academicYearId: z.number().int().positive(),
    classId: z.number().int().positive().optional(),
    rows: z.array(z.object({
      studentCode: z.string().trim().min(4).max(32),
      lastName: z.string().trim().min(2).max(120),
      postName: z.string().trim().max(120).optional(),
      firstName: z.string().trim().min(2).max(120),
      sex,
      birthDate: z.coerce.date().optional(),
      phone: z.string().trim().max(40).optional(),
      guardianName: z.string().trim().max(180).optional(),
      guardianPhone: z.string().trim().max(40).optional(),
    })).min(1).max(250),
  }),
  classCreate: z.object({ academicYearId: z.number().int().positive(), section: z.string().trim().min(2).max(80), level: z.string().trim().min(1).max(32), name: z.string().trim().min(2).max(80) }),
  courseCreate: z.object({ code: z.string().trim().toUpperCase().min(2).max(32), name: z.string().trim().min(2).max(160), section: z.string().trim().min(2).max(80), levels: z.string().trim().min(1).max(120) }),
  teacherCreate: z.object({ employeeCode: z.string().trim().toUpperCase().min(3).max(32), fullName: z.string().trim().min(3).max(180), phone: z.string().trim().max(40).optional(), email: z.string().trim().email().optional(), specialties: z.string().trim().max(500).optional() }),
  classCourseCreate: z.object({ classId: z.number().int().positive(), courseId: z.number().int().positive(), periodWeight: z.number().int().min(1).max(100) }),
  assignmentCreate: z.object({ teacherId: z.number().int().positive(), classCourseId: z.number().int().positive() }),
  annualPrepare: z.object({ sourceAcademicYearId: z.number().int().positive(), targetAcademicYearId: z.number().int().positive(), copyCourses: z.boolean(), copyWeights: z.boolean(), copySuggestions: z.boolean() }),
};

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données de test n’est pas disponible." });
  return db;
}

export const schoolRouter = router({
  years: router({
    list: protectedProcedure.query(async () => (await database()).select().from(academicYears).orderBy(asc(academicYears.startsAt))),
    create: adminProcedure.input(z.object({ code: z.string().trim().regex(/^\d{4}-\d{4}$/), label: z.string().trim().min(5).max(32), startsAt: z.coerce.date(), endsAt: z.coerce.date() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La fin de l’année doit être postérieure à son début." });
      const db = await database();
      await db.insert(academicYears).values({ ...input, status: "draft" });
      const [created] = await db.select({ id: academicYears.id }).from(academicYears).where(eq(academicYears.code, input.code)).limit(1);
      return { ok: true, id: created?.id };
    }),
    prepare: adminProcedure.input(schoolInputs.annualPrepare).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      if (input.sourceAcademicYearId === input.targetAcademicYearId) throw new TRPCError({ code: "BAD_REQUEST", message: "Choisissez une année cible distincte." });
      const db = await database();
      const sourceClasses = await db.select().from(classes).where(eq(classes.academicYearId, input.sourceAcademicYearId));
      if (!sourceClasses.length) throw new TRPCError({ code: "NOT_FOUND", message: "Aucune classe source à préparer." });
      const targetClasses = await db.select({ id: classes.id }).from(classes).where(eq(classes.academicYearId, input.targetAcademicYearId)).limit(1);
      if (targetClasses.length) throw new TRPCError({ code: "CONFLICT", message: "L’année cible contient déjà des classes ; sa préparation doit rester explicite." });
      let configuredCourses = 0;
      let suggestedAssignments = 0;
      await db.transaction(async (tx) => {
        await tx.insert(classes).values(sourceClasses.map((sourceClass) => ({ academicYearId: input.targetAcademicYearId, section: sourceClass.section, level: sourceClass.level, name: sourceClass.name, status: "draft" as const })));
        if (!input.copyCourses) return;
        const targetRows = await tx.select({ id: classes.id, name: classes.name }).from(classes).where(eq(classes.academicYearId, input.targetAcademicYearId));
        const targetByName = new Map(targetRows.map((row) => [row.name, row.id]));
        const sourceById = new Map(sourceClasses.map((row) => [row.id, row]));
        const configurations = await tx.select({ id: classCourses.id, classId: classCourses.classId, courseId: classCourses.courseId, periodWeight: classCourses.periodWeight }).from(classCourses).where(inArray(classCourses.classId, sourceClasses.map((row) => row.id)));
        const copiedConfigurations = configurations.flatMap((configuration) => { const sourceClass = sourceById.get(configuration.classId); const targetClassId = sourceClass ? targetByName.get(sourceClass.name) : undefined; return targetClassId ? [{ classId: targetClassId, courseId: configuration.courseId, periodWeight: input.copyWeights ? configuration.periodWeight : 1, status: "configured" as const }] : []; });
        if (copiedConfigurations.length) await tx.insert(classCourses).values(copiedConfigurations);
        configuredCourses = copiedConfigurations.length;
        if (!input.copySuggestions || !configurations.length) return;
        const targetConfigurations = await tx.select({ id: classCourses.id, classId: classCourses.classId, courseId: classCourses.courseId }).from(classCourses).where(inArray(classCourses.classId, targetRows.map((row) => row.id)));
        const targetConfigurationByKey = new Map(targetConfigurations.map((row) => [`${row.classId}:${row.courseId}`, row.id]));
        const sourceAssignments = await tx.select({ teacherId: teachingAssignments.teacherId, classCourseId: teachingAssignments.classCourseId }).from(teachingAssignments).where(and(inArray(teachingAssignments.classCourseId, configurations.map((row) => row.id)), eq(teachingAssignments.status, "active")));
        const suggestions = sourceAssignments.flatMap((assignment) => { const configuration = configurations.find((row) => row.id === assignment.classCourseId); const sourceClass = configuration ? sourceById.get(configuration.classId) : undefined; const targetClassId = sourceClass ? targetByName.get(sourceClass.name) : undefined; const targetConfigurationId = targetClassId && configuration ? targetConfigurationByKey.get(`${targetClassId}:${configuration.courseId}`) : undefined; return targetConfigurationId ? [{ teacherId: assignment.teacherId, classCourseId: targetConfigurationId, status: "inactive" as const }] : []; });
        if (suggestions.length) await tx.insert(teachingAssignments).values(suggestions);
        suggestedAssignments = suggestions.length;
      });
      return { copiedClasses: sourceClasses.length, configuredCourses, suggestedAssignments };
    }),
  }),
  students: router({
    list: adminProcedure.input(z.object({ academicYearId: z.number().int().positive().optional(), search: z.string().trim().max(120).optional() }).optional()).query(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "students", "view");
      const db = await database();
      const base = db.select({ id: students.id, studentCode: students.studentCode, lastName: students.lastName, firstName: students.firstName, sex: students.sex, status: students.status }).from(students).orderBy(asc(students.lastName), asc(students.firstName));
      return base;
    }),
    create: adminProcedure.input(schoolInputs.studentCreate).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "students", "create");
      const db = await database();
      const exists = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, input.studentCode)).limit(1);
      if (exists.length) throw new TRPCError({ code: "CONFLICT", message: "Ce matricule existe déjà." });
      await db.insert(students).values({ studentCode: input.studentCode, lastName: input.lastName, postName: input.postName || null, firstName: input.firstName, sex: input.sex, birthDate: input.birthDate, phone: input.phone || null });
      const [student] = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, input.studentCode)).limit(1);
      if (!student) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Le dossier élève n’a pas pu être créé." });
      await db.insert(enrollments).values({ studentId: student.id, academicYearId: input.academicYearId, classId: input.classId ?? null, enrollmentType: input.enrollmentType, status: "active" });
      await db.insert(guardians).values(input.guardians.map((guardian) => ({ studentId: student.id, fullName: guardian.fullName, relationship: guardian.relationship, phone: guardian.phone, isPrimary: guardian.isPrimary, receivesCommunications: guardian.receivesCommunications, canViewResults: guardian.canViewResults, canMakePayments: guardian.canMakePayments })));
      return { studentId: student.id, studentCode: input.studentCode };
    }),
    bulkCreate: adminProcedure.input(schoolInputs.studentBulkCreate).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "students", "create");
      const db = await database();
      const uniqueCodes = new Set(input.rows.map((row) => row.studentCode));
      if (uniqueCodes.size !== input.rows.length) throw new TRPCError({ code: "BAD_REQUEST", message: "Le fichier contient des matricules dupliqués." });
      for (const row of input.rows) {
        const exists = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, row.studentCode)).limit(1);
        if (exists.length) throw new TRPCError({ code: "CONFLICT", message: `Le matricule ${row.studentCode} existe déjà.` });
      }
      let inserted = 0;
      for (const row of input.rows) {
        await db.insert(students).values({ studentCode: row.studentCode, lastName: row.lastName, postName: row.postName || null, firstName: row.firstName, sex: row.sex, birthDate: row.birthDate, phone: row.phone || null });
        const [student] = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, row.studentCode)).limit(1);
        if (!student) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Une ligne du fichier n’a pas pu être enregistrée." });
        await db.insert(enrollments).values({ studentId: student.id, academicYearId: input.academicYearId, classId: input.classId ?? null, enrollmentType: "new", status: "active" });
        if (row.guardianName && row.guardianPhone) await db.insert(guardians).values({ studentId: student.id, fullName: row.guardianName, relationship: "guardian", phone: row.guardianPhone, isPrimary: true, receivesCommunications: true, canViewResults: true, canMakePayments: false });
        inserted += 1;
      }
      return { inserted };
    }),
  }),
  enrollments: router({
    createForStudent: adminProcedure.input(z.object({ studentId: z.number().int().positive(), academicYearId: z.number().int().positive(), classId: z.number().int().positive().optional(), enrollmentType })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "enrollments", "create");
      const db = await database();
      const existing = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.academicYearId, input.academicYearId))).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Cet élève possède déjà une inscription dans cette année scolaire." });
      await db.insert(enrollments).values({ ...input, classId: input.classId ?? null, status: "active" });
      return { ok: true };
    }),
  }),
  classes: router({
    list: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "enrollments", "view"); return (await database()).select().from(classes).where(eq(classes.academicYearId, input.academicYearId)).orderBy(asc(classes.level), asc(classes.name)); }),
    create: adminProcedure.input(schoolInputs.classCreate).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "enrollments", "create"); const db = await database(); await db.insert(classes).values({ ...input, status: "draft" }); return { ok: true }; }),
  }),
  courses: router({
    list: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "settings", "view"); return (await database()).select().from(courses).orderBy(asc(courses.name)); }),
    create: adminProcedure.input(schoolInputs.courseCreate).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "edit"); const db = await database(); await db.insert(courses).values(input); return { ok: true }; }),
    configure: adminProcedure.input(schoolInputs.classCourseCreate).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "edit"); const db = await database(); await db.insert(classCourses).values(input); return { ok: true }; }),
    configured: adminProcedure.input(z.object({ classId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "view");
      const db = await database();
      return db.select({ id: classCourses.id, courseId: courses.id, courseName: courses.name, courseCode: courses.code, periodWeight: classCourses.periodWeight, status: classCourses.status }).from(classCourses).innerJoin(courses, eq(classCourses.courseId, courses.id)).where(eq(classCourses.classId, input.classId)).orderBy(asc(courses.name));
    }),
    updateWeight: adminProcedure.input(z.object({ classCourseId: z.number().int().positive(), periodWeight: z.number().int().min(1).max(100) })).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "edit"); const db = await database(); await db.update(classCourses).set({ periodWeight: input.periodWeight }).where(eq(classCourses.id, input.classCourseId)); return { ok: true }; }),
  }),
  teachers: router({
    list: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "users", "view"); return (await database()).select().from(teachers).orderBy(asc(teachers.fullName)); }),
    create: adminProcedure.input(schoolInputs.teacherCreate).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "users", "edit"); const db = await database(); await db.insert(teachers).values({ ...input, phone: input.phone || null, email: input.email || null, specialties: input.specialties || null }); return { ok: true }; }),
    linkableUsers: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "users", "view"); return (await database()).select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(eq(users.role, "user")).orderBy(asc(users.name)); }),
    linkAccount: adminProcedure.input(z.object({ teacherId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "edit");
      const db = await database();
      const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.id, input.teacherId)).limit(1);
      if (!teacher) throw new TRPCError({ code: "NOT_FOUND", message: "La fiche enseignant est introuvable." });
      const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user || user.role !== "user") throw new TRPCError({ code: "BAD_REQUEST", message: "Sélectionnez un compte enseignant valide." });
      const [alreadyLinked] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, input.userId)).limit(1);
      if (alreadyLinked && alreadyLinked.id !== input.teacherId) throw new TRPCError({ code: "CONFLICT", message: "Ce compte est déjà lié à une autre fiche enseignant." });
      await db.update(teachers).set({ userId: input.userId }).where(eq(teachers.id, input.teacherId));
      return { ok: true };
    }),
  }),
  guardians: router({
    list: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "students", "view"); return (await database()).select({ id: guardians.id, studentId: guardians.studentId, fullName: guardians.fullName, relationship: guardians.relationship, phone: guardians.phone, canViewResults: guardians.canViewResults, canMakePayments: guardians.canMakePayments }).from(guardians).orderBy(asc(guardians.fullName)); }),
    linkableUsers: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "users", "view"); return (await database()).select({ id: users.id, name: users.name, email: users.email, role: users.role }).from(users).where(inArray(users.role, ["user", "parent"])).orderBy(asc(users.name)); }),
    linkAccount: adminProcedure.input(z.object({ guardianId: z.number().int().positive(), userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "edit");
      const db = await database();
      const [guardian] = await db.select({ id: guardians.id }).from(guardians).where(eq(guardians.id, input.guardianId)).limit(1);
      if (!guardian) throw new TRPCError({ code: "NOT_FOUND", message: "Le responsable est introuvable." });
      const [user] = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user || user.role === "admin") throw new TRPCError({ code: "BAD_REQUEST", message: "Sélectionnez un compte parent valide." });
      await db.update(users).set({ role: "parent" }).where(eq(users.id, input.userId));
      await db.insert(guardianUserLinks).values({ guardianId: input.guardianId, userId: input.userId, status: "active", linkedByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { status: "active", linkedByUserId: ctx.user.id, revokedAt: null } });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "parent_account_linked", module: "parents", resourceType: "guardian", resourceId: input.guardianId, afterState: JSON.stringify({ userId: input.userId }) });
      return { ok: true };
    }),
    revokeAccount: adminProcedure.input(z.object({ guardianId: z.number().int().positive(), userId: z.number().int().positive(), reason: z.string().trim().min(3).max(500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "users", "edit");
      const db = await database();
      await db.update(guardianUserLinks).set({ status: "revoked", revokedAt: new Date() }).where(and(eq(guardianUserLinks.guardianId, input.guardianId), eq(guardianUserLinks.userId, input.userId)));
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "parent_account_revoked", module: "parents", resourceType: "guardian", resourceId: input.guardianId, reason: input.reason });
      return { ok: true };
    }),
  }),
  assignments: router({
    list: adminProcedure.query(async ({ ctx }) => {
      await assertPermission(ctx.user.id, "settings", "view");
      const db = await database();
      return db.select({ id: teachingAssignments.id, teacherId: teachers.id, teacherName: teachers.fullName, classCourseId: classCourses.id, className: classes.name, courseName: courses.name, periodWeight: classCourses.periodWeight, status: teachingAssignments.status }).from(teachingAssignments).innerJoin(teachers, eq(teachingAssignments.teacherId, teachers.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).innerJoin(courses, eq(classCourses.courseId, courses.id)).orderBy(asc(teachers.fullName));
    }),
    create: adminProcedure.input(schoolInputs.assignmentCreate).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "edit"); const db = await database(); const duplicate = await db.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(eq(teachingAssignments.teacherId, input.teacherId), eq(teachingAssignments.classCourseId, input.classCourseId))).limit(1); if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "Cette affectation existe déjà." }); await db.insert(teachingAssignments).values(input); return { ok: true }; }),
    deactivate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "settings", "edit"); const db = await database(); await db.update(teachingAssignments).set({ status: "inactive" }).where(eq(teachingAssignments.id, input.id)); return { ok: true }; }),
  }),
});
