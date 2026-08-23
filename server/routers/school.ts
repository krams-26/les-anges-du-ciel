import { and, asc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  academicYears,
  classCourses,
  classes,
  courses,
  enrollments,
  guardians,
  students,
  teachers,
  teachingAssignments,
} from "../../drizzle/schema";
import { getDb } from "../db";
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
};

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données de test n’est pas disponible." });
  return db;
}

export const schoolRouter = router({
  years: router({
    list: protectedProcedure.query(async () => (await database()).select().from(academicYears).orderBy(asc(academicYears.startsAt))),
    create: adminProcedure.input(z.object({ code: z.string().trim().regex(/^\d{4}-\d{4}$/), label: z.string().trim().min(5).max(32), startsAt: z.coerce.date(), endsAt: z.coerce.date() })).mutation(async ({ input }) => {
      if (input.endsAt <= input.startsAt) throw new TRPCError({ code: "BAD_REQUEST", message: "La fin de l’année doit être postérieure à son début." });
      const db = await database();
      await db.insert(academicYears).values({ ...input, status: "draft" });
      return { ok: true };
    }),
  }),
  students: router({
    list: adminProcedure.input(z.object({ academicYearId: z.number().int().positive().optional(), search: z.string().trim().max(120).optional() }).optional()).query(async ({ input }) => {
      const db = await database();
      const base = db.select({ id: students.id, studentCode: students.studentCode, lastName: students.lastName, firstName: students.firstName, sex: students.sex, status: students.status }).from(students).orderBy(asc(students.lastName), asc(students.firstName));
      return base;
    }),
    create: adminProcedure.input(schoolInputs.studentCreate).mutation(async ({ input }) => {
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
    bulkCreate: adminProcedure.input(schoolInputs.studentBulkCreate).mutation(async ({ input }) => {
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
    createForStudent: adminProcedure.input(z.object({ studentId: z.number().int().positive(), academicYearId: z.number().int().positive(), classId: z.number().int().positive().optional(), enrollmentType })).mutation(async ({ input }) => {
      const db = await database();
      const existing = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, input.studentId), eq(enrollments.academicYearId, input.academicYearId))).limit(1);
      if (existing.length) throw new TRPCError({ code: "CONFLICT", message: "Cet élève possède déjà une inscription dans cette année scolaire." });
      await db.insert(enrollments).values({ ...input, classId: input.classId ?? null, status: "active" });
      return { ok: true };
    }),
  }),
  classes: router({
    list: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).query(async ({ input }) => (await database()).select().from(classes).where(eq(classes.academicYearId, input.academicYearId)).orderBy(asc(classes.level), asc(classes.name))),
    create: adminProcedure.input(schoolInputs.classCreate).mutation(async ({ input }) => { const db = await database(); await db.insert(classes).values({ ...input, status: "draft" }); return { ok: true }; }),
  }),
  courses: router({
    list: adminProcedure.query(async () => (await database()).select().from(courses).orderBy(asc(courses.name))),
    create: adminProcedure.input(schoolInputs.courseCreate).mutation(async ({ input }) => { const db = await database(); await db.insert(courses).values(input); return { ok: true }; }),
    configure: adminProcedure.input(schoolInputs.classCourseCreate).mutation(async ({ input }) => { const db = await database(); await db.insert(classCourses).values(input); return { ok: true }; }),
    configured: adminProcedure.input(z.object({ classId: z.number().int().positive() })).query(async ({ input }) => {
      const db = await database();
      return db.select({ id: classCourses.id, courseId: courses.id, courseName: courses.name, courseCode: courses.code, periodWeight: classCourses.periodWeight, status: classCourses.status }).from(classCourses).innerJoin(courses, eq(classCourses.courseId, courses.id)).where(eq(classCourses.classId, input.classId)).orderBy(asc(courses.name));
    }),
    updateWeight: adminProcedure.input(z.object({ classCourseId: z.number().int().positive(), periodWeight: z.number().int().min(1).max(100) })).mutation(async ({ input }) => { const db = await database(); await db.update(classCourses).set({ periodWeight: input.periodWeight }).where(eq(classCourses.id, input.classCourseId)); return { ok: true }; }),
  }),
  teachers: router({
    list: adminProcedure.query(async () => (await database()).select().from(teachers).orderBy(asc(teachers.fullName))),
    create: adminProcedure.input(schoolInputs.teacherCreate).mutation(async ({ input }) => { const db = await database(); await db.insert(teachers).values({ ...input, phone: input.phone || null, email: input.email || null, specialties: input.specialties || null }); return { ok: true }; }),
  }),
  assignments: router({
    list: adminProcedure.query(async () => {
      const db = await database();
      return db.select({ id: teachingAssignments.id, teacherId: teachers.id, teacherName: teachers.fullName, classCourseId: classCourses.id, className: classes.name, courseName: courses.name, periodWeight: classCourses.periodWeight, status: teachingAssignments.status }).from(teachingAssignments).innerJoin(teachers, eq(teachingAssignments.teacherId, teachers.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).innerJoin(courses, eq(classCourses.courseId, courses.id)).orderBy(asc(teachers.fullName));
    }),
    create: adminProcedure.input(schoolInputs.assignmentCreate).mutation(async ({ input }) => { const db = await database(); const duplicate = await db.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(eq(teachingAssignments.teacherId, input.teacherId), eq(teachingAssignments.classCourseId, input.classCourseId))).limit(1); if (duplicate.length) throw new TRPCError({ code: "CONFLICT", message: "Cette affectation existe déjà." }); await db.insert(teachingAssignments).values(input); return { ok: true }; }),
    deactivate: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => { const db = await database(); await db.update(teachingAssignments).set({ status: "inactive" }).where(eq(teachingAssignments.id, input.id)); return { ok: true }; }),
  }),
});
