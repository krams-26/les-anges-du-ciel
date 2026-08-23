import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  academicPeriods,
  attendanceRecords,
  attendanceSessions,
  classCourses,
  classes,
  courses,
  enrollmentFinancialAccounts,
  enrollments,
  grades,
  guardianCommunicationPreferences,
  guardianUserLinks,
  guardians,
  studentDocuments,
  studentPayments,
  students,
  teachingAssignments,
  userNotifications,
} from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

async function linkedGuardianIds(userId: number) {
  const db = await database();
  const links = await db.select({ guardianId: guardianUserLinks.guardianId }).from(guardianUserLinks).where(and(eq(guardianUserLinks.userId, userId), eq(guardianUserLinks.status, "active")));
  return links.map((link) => link.guardianId);
}

async function assertParentEnrollment(userId: number, enrollmentId: number) {
  const db = await database();
  const guardianIds = await linkedGuardianIds(userId);
  if (!guardianIds.length) throw new TRPCError({ code: "FORBIDDEN", message: "Aucun élève n’est lié à votre compte parent." });
  const rows = await db.select({ enrollmentId: enrollments.id, guardianId: guardians.id, canViewResults: guardians.canViewResults, canMakePayments: guardians.canMakePayments }).from(enrollments).innerJoin(students, eq(enrollments.studentId, students.id)).innerJoin(guardians, eq(guardians.studentId, students.id)).where(and(eq(enrollments.id, enrollmentId), inArray(guardians.id, guardianIds))).limit(1);
  if (!rows.length) throw new TRPCError({ code: "FORBIDDEN", message: "Ce dossier n’est pas autorisé pour votre compte." });
  return rows[0];
}

function parentOnly(role: "user" | "admin" | "parent") {
  if (role !== "parent") throw new TRPCError({ code: "FORBIDDEN", message: "Cet espace est réservé aux responsables liés à des élèves." });
}

export const parentRouter = router({
  children: protectedProcedure.query(async ({ ctx }) => {
    parentOnly(ctx.user.role);
    const db = await database();
    const guardianIds = await linkedGuardianIds(ctx.user.id);
    if (!guardianIds.length) return [];
    return db.select({
      guardianId: guardians.id,
      guardianName: guardians.fullName,
      relationship: guardians.relationship,
      enrollmentId: enrollments.id,
      studentId: students.id,
      studentCode: students.studentCode,
      firstName: students.firstName,
      lastName: students.lastName,
      sex: students.sex,
      enrollmentStatus: enrollments.status,
      className: classes.name,
      section: classes.section,
      level: classes.level,
      expectedAmount: enrollmentFinancialAccounts.expectedAmount,
      paidAmount: enrollmentFinancialAccounts.paidAmount,
      currency: enrollmentFinancialAccounts.currency,
    }).from(guardianUserLinks)
      .innerJoin(guardians, eq(guardianUserLinks.guardianId, guardians.id))
      .innerJoin(students, eq(guardians.studentId, students.id))
      .innerJoin(enrollments, eq(enrollments.studentId, students.id))
      .leftJoin(classes, eq(enrollments.classId, classes.id))
      .leftJoin(enrollmentFinancialAccounts, eq(enrollmentFinancialAccounts.enrollmentId, enrollments.id))
      .where(and(eq(guardianUserLinks.userId, ctx.user.id), eq(guardianUserLinks.status, "active"), eq(enrollments.status, "active")))
      .orderBy(asc(students.lastName), asc(students.firstName));
  }),
  results: protectedProcedure.input(z.object({ enrollmentId: z.number().int().positive(), periodId: z.number().int().positive().optional() })).query(async ({ ctx, input }) => {
    parentOnly(ctx.user.role);
    const access = await assertParentEnrollment(ctx.user.id, input.enrollmentId);
    if (!access.canViewResults) throw new TRPCError({ code: "FORBIDDEN", message: "La consultation des résultats n’est pas autorisée pour ce responsable." });
    const db = await database();
    const resultRows = await db.select({ courseName: courses.name, courseCode: courses.code, score: grades.score, maximum: grades.maximum, periodId: academicPeriods.id, periodCode: academicPeriods.code, periodLabel: academicPeriods.label }).from(grades)
      .innerJoin(teachingAssignments, eq(grades.teachingAssignmentId, teachingAssignments.id))
      .innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id))
      .innerJoin(courses, eq(classCourses.courseId, courses.id))
      .innerJoin(academicPeriods, eq(grades.academicPeriodId, academicPeriods.id))
      .where(and(eq(grades.enrollmentId, input.enrollmentId), eq(grades.status, "validated"), input.periodId ? eq(grades.academicPeriodId, input.periodId) : undefined))
      .orderBy(asc(courses.name));
    return resultRows;
  }),
  attendance: protectedProcedure.input(z.object({ enrollmentId: z.number().int().positive(), month: z.string().regex(/^\d{4}-\d{2}$/).optional() })).query(async ({ ctx, input }) => {
    parentOnly(ctx.user.role);
    await assertParentEnrollment(ctx.user.id, input.enrollmentId);
    const db = await database();
    return db.select({ status: attendanceRecords.status, sessionDate: attendanceSessions.sessionDate }).from(attendanceRecords)
      .innerJoin(attendanceSessions, eq(attendanceRecords.attendanceSessionId, attendanceSessions.id))
      .where(eq(attendanceRecords.enrollmentId, input.enrollmentId))
      .orderBy(desc(attendanceSessions.sessionDate));
  }),
  finances: protectedProcedure.input(z.object({ enrollmentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    parentOnly(ctx.user.role);
    await assertParentEnrollment(ctx.user.id, input.enrollmentId);
    const db = await database();
    const [account] = await db.select().from(enrollmentFinancialAccounts).where(eq(enrollmentFinancialAccounts.enrollmentId, input.enrollmentId)).limit(1);
    const payments = await db.select({ id: studentPayments.id, amount: studentPayments.amount, currency: studentPayments.currency, reference: studentPayments.reference, status: studentPayments.status, paidAt: studentPayments.paidAt }).from(studentPayments).where(eq(studentPayments.enrollmentId, input.enrollmentId)).orderBy(desc(studentPayments.paidAt));
    return { account: account ?? null, payments };
  }),
  documents: protectedProcedure.input(z.object({ enrollmentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    parentOnly(ctx.user.role);
    await assertParentEnrollment(ctx.user.id, input.enrollmentId);
    const db = await database();
    return db.select({ id: studentDocuments.id, category: studentDocuments.category, fileName: studentDocuments.fileName, fileUrl: studentDocuments.fileUrl, createdAt: studentDocuments.createdAt }).from(studentDocuments).where(and(eq(studentDocuments.enrollmentId, input.enrollmentId), eq(studentDocuments.parentVisible, true))).orderBy(desc(studentDocuments.createdAt));
  }),
  preferences: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      parentOnly(ctx.user.role);
      const db = await database();
      const guardianIds = await linkedGuardianIds(ctx.user.id);
      if (!guardianIds.length) return [];
      return db.select({ guardianId: guardians.id, guardianName: guardians.fullName, phone: guardians.phone, preferences: guardianCommunicationPreferences }).from(guardians).leftJoin(guardianCommunicationPreferences, eq(guardianCommunicationPreferences.guardianId, guardians.id)).where(inArray(guardians.id, guardianIds));
    }),
    update: protectedProcedure.input(z.object({ guardianId: z.number().int().positive(), appNotifications: z.boolean(), sms: z.boolean(), whatsapp: z.boolean(), email: z.boolean(), results: z.boolean(), attendance: z.boolean(), finance: z.boolean(), general: z.boolean() })).mutation(async ({ ctx, input }) => {
      parentOnly(ctx.user.role);
      const guardianIds = await linkedGuardianIds(ctx.user.id);
      if (!guardianIds.includes(input.guardianId)) throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne pouvez modifier que vos propres préférences." });
      const db = await database();
      await db.insert(guardianCommunicationPreferences).values(input).onDuplicateKeyUpdate({ set: { ...input, guardianId: undefined } });
      return { ok: true };
    }),
  }),
  notifications: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      parentOnly(ctx.user.role);
      return (await database()).select().from(userNotifications).where(eq(userNotifications.userId, ctx.user.id)).orderBy(desc(userNotifications.createdAt));
    }),
    markRead: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      parentOnly(ctx.user.role);
      const db = await database();
      await db.update(userNotifications).set({ readAt: new Date() }).where(and(eq(userNotifications.id, input.id), eq(userNotifications.userId, ctx.user.id)));
      return { ok: true };
    }),
  }),
});
