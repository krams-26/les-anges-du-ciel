import { and, count, desc, eq, gte, inArray, isNull, like, lte, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { academicYears, classes, deliberationDecisions, enrollments, grades, guardianUserLinks, guardians, studentDocuments, studentPayments, students, teacherReports, teachers, teachingAssignments, userNotifications, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Les données personnelles ne sont pas disponibles actuellement." });
  return db;
}

const searchInput = z.object({ query: z.string().trim().min(2).max(100), category: z.enum(["all", "students", "staff", "classes", "finance", "documents"]).default("all") });
const documentInput = z.object({ query: z.string().trim().max(100).optional(), category: z.string().trim().max(80).optional(), yearCode: z.string().trim().max(32).optional(), classId: z.number().int().positive().optional(), createdAfter: z.string().date().optional(), createdBefore: z.string().date().optional() }).optional();

async function parentStudentIds(userId: number) {
  const db = await database();
  const rows = await db.select({ studentId: guardians.studentId }).from(guardianUserLinks).innerJoin(guardians, eq(guardianUserLinks.guardianId, guardians.id)).where(and(eq(guardianUserLinks.userId, userId), eq(guardianUserLinks.status, "active")));
  return Array.from(new Set(rows.map((row) => row.studentId)));
}

export const personalRouter = router({
  profile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      const [account] = await (await database()).select({ id: users.id, name: users.name, email: users.email, role: users.role, accountStatus: users.accountStatus, accessRoleId: users.accessRoleId, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, ctx.user.id)).limit(1);
      return account ?? ctx.user;
    }),
    update: protectedProcedure.input(z.object({ name: z.string().trim().min(2).max(160), email: z.string().trim().email().nullable() })).mutation(async ({ ctx, input }) => {
      const db = await database();
      await db.update(users).set(input).where(eq(users.id, ctx.user.id));
      return { ok: true };
    }),
  }),
  notifications: router({
    list: protectedProcedure.input(z.object({ unreadOnly: z.boolean().optional() }).optional()).query(async ({ ctx, input }) => {
      const db = await database();
      return db.select().from(userNotifications).where(and(eq(userNotifications.userId, ctx.user.id), input?.unreadOnly ? isNull(userNotifications.readAt) : undefined)).orderBy(desc(userNotifications.createdAt));
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await (await database()).update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.id, input.id), eq(userNotifications.userId, ctx.user.id)));
      return { ok: true };
    }),
    markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
      await (await database()).update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.userId, ctx.user.id), isNull(userNotifications.readAt)));
      return { ok: true };
    }),
  }),
  tasks: protectedProcedure.query(async ({ ctx }) => {
    const db = await database();
    const tasks: Array<{ id: string; title: string; detail: string; priority: "high" | "medium" | "low"; route: string }> = [];
    if (ctx.user.role === "admin") {
      const [submittedGrades] = await db.select({ value: count() }).from(grades).where(eq(grades.status, "submitted"));
      const [submittedReports] = await db.select({ value: count() }).from(teacherReports).where(eq(teacherReports.status, "submitted"));
      const [pendingPayments] = await db.select({ value: count() }).from(studentPayments).where(eq(studentPayments.status, "pending"));
      const [proposedDecisions] = await db.select({ value: count() }).from(deliberationDecisions).where(eq(deliberationDecisions.status, "proposed"));
      if (submittedGrades?.value) tasks.push({ id: "grades", title: `${submittedGrades.value} notes à valider`, detail: "Des notes soumises attendent un contrôle pédagogique.", priority: "high", route: "validation-notes" });
      if (submittedReports?.value) tasks.push({ id: "reports", title: `${submittedReports.value} rapports à valider`, detail: "Des rapports enseignants attendent un examen.", priority: "medium", route: "suivi-saisies" });
      if (pendingPayments?.value) tasks.push({ id: "payments", title: `${pendingPayments.value} paiements à vérifier`, detail: "Des transactions financières nécessitent une confirmation.", priority: "medium", route: "paiements" });
      if (proposedDecisions?.value) tasks.push({ id: "decisions", title: `${proposedDecisions.value} décisions finales à valider`, detail: "Des délibérations proposées attendent une validation.", priority: "high", route: "examens" });
    } else if (ctx.user.role === "parent") {
      const unread = await db.select({ value: count() }).from(userNotifications).where(and(eq(userNotifications.userId, ctx.user.id), isNull(userNotifications.readAt)));
      if (unread[0]?.value) tasks.push({ id: "notifications", title: `${unread[0].value} notifications à consulter`, detail: "Des informations liées à vos enfants nécessitent votre attention.", priority: "medium", route: "notifications-parent" });
    } else {
      const [draftReports] = await db.select({ value: count() }).from(teacherReports).innerJoin(teachingAssignments, eq(teacherReports.teachingAssignmentId, teachingAssignments.id)).innerJoin(teachers, eq(teachingAssignments.teacherId, teachers.id)).where(and(eq(teachers.userId, ctx.user.id), eq(teacherReports.status, "draft")));
      if (draftReports?.value) tasks.push({ id: "reports", title: `${draftReports.value} rapports à compléter`, detail: "Des rapports pédagogiques restent au statut brouillon.", priority: "medium", route: "rapport-enseignant" });
    }
    return tasks;
  }),
  search: protectedProcedure.input(searchInput).query(async ({ ctx, input }) => {
    const db = await database();
    const term = `%${input.query}%`;
    const result: Array<{ id: number; category: "students" | "staff" | "classes" | "finance" | "documents"; title: string; detail: string; route: string; fileUrl?: string }> = [];
    const showStudents = input.category === "all" || input.category === "students";
    const showStaff = input.category === "all" || input.category === "staff";
    const showClasses = input.category === "all" || input.category === "classes";
    const showFinance = input.category === "all" || input.category === "finance";
    const showDocuments = input.category === "all" || input.category === "documents";
    if (showStudents) {
      let allowedStudentIds: number[] | null = null;
      if (ctx.user.role === "parent") allowedStudentIds = await parentStudentIds(ctx.user.id);
      if (allowedStudentIds === null || allowedStudentIds.length) {
        const rows = await db.select({ id: students.id, code: students.studentCode, firstName: students.firstName, lastName: students.lastName }).from(students).where(and(allowedStudentIds ? inArray(students.id, allowedStudentIds) : undefined, or(like(students.studentCode, term), like(students.firstName, term), like(students.lastName, term)))).limit(8);
        result.push(...rows.map((row) => ({ id: row.id, category: "students" as const, title: `${row.lastName} ${row.firstName}`, detail: row.code, route: ctx.user.role === "parent" ? "mes-enfants" : "eleves" })));
      }
    }
    if (showStaff && ctx.user.role === "admin") {
      const rows = await db.select({ id: teachers.id, name: teachers.fullName, specialties: teachers.specialties }).from(teachers).where(like(teachers.fullName, term)).limit(8);
      result.push(...rows.map((row) => ({ id: row.id, category: "staff" as const, title: row.name, detail: row.specialties || "Enseignant", route: "enseignants" })));
    }
    if (showClasses && ctx.user.role !== "parent") {
      const rows = await db.select({ id: classes.id, name: classes.name, section: classes.section, level: classes.level }).from(classes).where(or(like(classes.name, term), like(classes.section, term), like(classes.level, term))).limit(8);
      result.push(...rows.map((row) => ({ id: row.id, category: "classes" as const, title: row.name, detail: `${row.section} · ${row.level}`, route: "classes" })));
    }
    if (showFinance && ctx.user.role === "admin") {
      const rows = await db.select({ id: studentPayments.id, reference: studentPayments.reference, amount: studentPayments.amount, currency: studentPayments.currency, firstName: students.firstName, lastName: students.lastName }).from(studentPayments).innerJoin(enrollments, eq(studentPayments.enrollmentId, enrollments.id)).innerJoin(students, eq(enrollments.studentId, students.id)).where(or(like(studentPayments.reference, term), like(students.firstName, term), like(students.lastName, term))).limit(8);
      result.push(...rows.map((row) => ({ id: row.id, category: "finance" as const, title: `Paiement ${row.reference}`, detail: `${row.lastName} ${row.firstName} · ${new Intl.NumberFormat("fr-FR").format(row.amount)} ${row.currency}`, route: "Paiements" })));
    }
    if (showDocuments && ctx.user.role === "admin") {
      const rows = await db.select({ id: studentDocuments.id, fileName: studentDocuments.fileName, category: studentDocuments.category, fileUrl: studentDocuments.fileUrl }).from(studentDocuments).where(like(studentDocuments.fileName, term)).limit(8);
      result.push(...rows.map((row) => ({ id: row.id, category: "documents" as const, title: row.fileName, detail: row.category, route: "documents", fileUrl: row.fileUrl })));
    }
    return result;
  }),
  documents: protectedProcedure.input(documentInput).query(async ({ ctx, input }) => {
    const db = await database();
    const term = input?.query ? `%${input.query}%` : null;
    const after = input?.createdAfter ? new Date(`${input.createdAfter}T00:00:00.000Z`) : undefined;
    const before = input?.createdBefore ? new Date(`${input.createdBefore}T23:59:59.999Z`) : undefined;
    if (ctx.user.role === "parent") {
      const ids = await parentStudentIds(ctx.user.id);
      if (!ids.length) return [];
      return db.select({ id: studentDocuments.id, fileName: studentDocuments.fileName, category: studentDocuments.category, fileUrl: studentDocuments.fileUrl, createdAt: studentDocuments.createdAt, studentName: students.firstName, studentLastName: students.lastName, classId: classes.id, className: classes.name, yearCode: academicYears.code }).from(studentDocuments).innerJoin(enrollments, eq(studentDocuments.enrollmentId, enrollments.id)).innerJoin(students, eq(enrollments.studentId, students.id)).leftJoin(classes, eq(enrollments.classId, classes.id)).leftJoin(academicYears, eq(classes.academicYearId, academicYears.id)).where(and(inArray(students.id, ids), eq(studentDocuments.parentVisible, true), term ? like(studentDocuments.fileName, term) : undefined, input?.category ? eq(studentDocuments.category, input.category) : undefined, input?.yearCode ? eq(academicYears.code, input.yearCode) : undefined, input?.classId ? eq(classes.id, input.classId) : undefined, after ? gte(studentDocuments.createdAt, after) : undefined, before ? lte(studentDocuments.createdAt, before) : undefined)).orderBy(desc(studentDocuments.createdAt));
    }
    if (ctx.user.role !== "admin") return [];
    return db.select({ id: studentDocuments.id, fileName: studentDocuments.fileName, category: studentDocuments.category, fileUrl: studentDocuments.fileUrl, createdAt: studentDocuments.createdAt, studentName: students.firstName, studentLastName: students.lastName, classId: classes.id, className: classes.name, yearCode: academicYears.code }).from(studentDocuments).innerJoin(enrollments, eq(studentDocuments.enrollmentId, enrollments.id)).innerJoin(students, eq(enrollments.studentId, students.id)).leftJoin(classes, eq(enrollments.classId, classes.id)).leftJoin(academicYears, eq(classes.academicYearId, academicYears.id)).where(and(term ? like(studentDocuments.fileName, term) : undefined, input?.category ? eq(studentDocuments.category, input.category) : undefined, input?.yearCode ? eq(academicYears.code, input.yearCode) : undefined, input?.classId ? eq(classes.id, input.classId) : undefined, after ? gte(studentDocuments.createdAt, after) : undefined, before ? lte(studentDocuments.createdAt, before) : undefined)).orderBy(desc(studentDocuments.createdAt));
  }),
});
