import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { academicPeriods, attendanceRecords, attendanceSessions, classCourses, classes, courses, enrollments, grades, students, teacherReports, teachers, teachingAssignments } from "../../drizzle/schema";
import { getDb } from "../db";
import { protectedProcedure, router } from "../_core/trpc";

async function dbOrThrow() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

export function canAccessAssignment(userRole: "user" | "admin", linkedUserId: number | null, currentUserId: number) {
  return userRole === "admin" || linkedUserId === currentUserId;
}

async function assertAssignmentAccess(userId: number, userRole: "user" | "admin", assignmentId: number) {
  if (userRole === "admin") return;
  const db = await dbOrThrow();
  const matches = await db.select({ id: teachingAssignments.id, linkedUserId: teachers.userId }).from(teachingAssignments).innerJoin(teachers, eq(teachingAssignments.teacherId, teachers.id)).where(eq(teachingAssignments.id, assignmentId)).limit(1);
  if (!matches.length || !canAccessAssignment(userRole, matches[0].linkedUserId, userId)) throw new TRPCError({ code: "FORBIDDEN", message: "Cette affectation ne vous autorise pas à effectuer cette opération." });
}

export const teachingInputs = {
  attendance: z.object({ assignmentId: z.number().int().positive(), sessionDate: z.coerce.date(), records: z.array(z.object({ enrollmentId: z.number().int().positive(), status: z.enum(["present", "absent", "late", "excused"]), note: z.string().trim().max(500).optional() })).min(1) }),
  grades: z.object({ assignmentId: z.number().int().positive(), periodId: z.number().int().positive(), scores: z.array(z.object({ enrollmentId: z.number().int().positive(), score: z.number().int().min(0), maximum: z.number().int().min(1).max(100) })).min(1) }).refine((value) => value.scores.every((score) => score.score <= score.maximum), { message: "Une note ne peut pas dépasser son maximum." }),
};

export const teachingRouter = router({
  myAssignments: protectedProcedure.query(async ({ ctx }) => {
    const db = await dbOrThrow();
    const assignmentFields = { id: teachingAssignments.id, teacherId: teachingAssignments.teacherId, status: teachingAssignments.status, courseName: courses.name, courseCode: courses.code, className: classes.name };
    const query = db.select(assignmentFields).from(teachingAssignments).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(courses, eq(classCourses.courseId, courses.id)).innerJoin(classes, eq(classCourses.classId, classes.id));
    if (ctx.user.role === "admin") return query;
    const [teacher] = await db.select({ id: teachers.id }).from(teachers).where(eq(teachers.userId, ctx.user.id)).limit(1);
    if (!teacher) return [];
    return query.where(and(eq(teachingAssignments.teacherId, teacher.id), eq(teachingAssignments.status, "active")));
  }),
  roster: protectedProcedure.input(z.object({ assignmentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId);
    const db = await dbOrThrow();
    return db.select({ enrollmentId: enrollments.id, studentId: students.id, studentCode: students.studentCode, lastName: students.lastName, firstName: students.firstName, sex: students.sex }).from(teachingAssignments).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(enrollments, eq(classCourses.classId, enrollments.classId)).innerJoin(students, eq(enrollments.studentId, students.id)).where(and(eq(teachingAssignments.id, input.assignmentId), eq(enrollments.status, "active")));
  }),
  periods: protectedProcedure.input(z.object({ assignmentId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId);
    const db = await dbOrThrow();
    return db.select({ id: academicPeriods.id, code: academicPeriods.code, label: academicPeriods.label, startsAt: academicPeriods.startsAt, endsAt: academicPeriods.endsAt }).from(teachingAssignments).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).innerJoin(academicPeriods, eq(classes.academicYearId, academicPeriods.academicYearId)).where(eq(teachingAssignments.id, input.assignmentId));
  }),
  attendance: router({
    save: protectedProcedure.input(teachingInputs.attendance).mutation(async ({ ctx, input }) => {
      await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId); const db = await dbOrThrow();
      await db.insert(attendanceSessions).values({ teachingAssignmentId: input.assignmentId, sessionDate: input.sessionDate, status: "submitted", submittedByUserId: ctx.user.id, submittedAt: new Date() }).onDuplicateKeyUpdate({ set: { status: "submitted", submittedByUserId: ctx.user.id, submittedAt: new Date() } });
      const [session] = await db.select({ id: attendanceSessions.id }).from(attendanceSessions).where(and(eq(attendanceSessions.teachingAssignmentId, input.assignmentId), eq(attendanceSessions.sessionDate, input.sessionDate))).limit(1);
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La séance de présence n’a pas été créée." });
      await Promise.all(input.records.map((record) => db.insert(attendanceRecords).values({ attendanceSessionId: session.id, enrollmentId: record.enrollmentId, status: record.status, note: record.note || null }).onDuplicateKeyUpdate({ set: { status: record.status, note: record.note || null } })));
      return { saved: input.records.length };
    }),
  }),
  grades: router({
    saveDraft: protectedProcedure.input(teachingInputs.grades).mutation(async ({ ctx, input }) => {
      await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId); const db = await dbOrThrow();
      await Promise.all(input.scores.map((score) => db.insert(grades).values({ teachingAssignmentId: input.assignmentId, academicPeriodId: input.periodId, enrollmentId: score.enrollmentId, score: score.score, maximum: score.maximum, status: "draft", enteredByUserId: ctx.user.id }).onDuplicateKeyUpdate({ set: { score: score.score, maximum: score.maximum, status: "draft", enteredByUserId: ctx.user.id } })));
      return { saved: input.scores.length, status: "draft" as const };
    }),
    submit: protectedProcedure.input(teachingInputs.grades).mutation(async ({ ctx, input }) => {
      await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId); const db = await dbOrThrow();
      await Promise.all(input.scores.map((score) => db.insert(grades).values({ teachingAssignmentId: input.assignmentId, academicPeriodId: input.periodId, enrollmentId: score.enrollmentId, score: score.score, maximum: score.maximum, status: "submitted", enteredByUserId: ctx.user.id, submittedAt: new Date() }).onDuplicateKeyUpdate({ set: { score: score.score, maximum: score.maximum, status: "submitted", enteredByUserId: ctx.user.id, submittedAt: new Date() } })));
      return { submitted: input.scores.length, status: "submitted" as const };
    }),
  }),
  reports: router({
    save: protectedProcedure.input(z.object({ assignmentId: z.number().int().positive(), periodId: z.number().int().positive(), courseDelivery: z.string().max(10000).optional(), plannedProgram: z.string().max(10000).optional(), completedProgram: z.string().max(10000).optional(), progressPercentage: z.number().int().min(0).max(100).optional(), difficulties: z.string().max(10000).optional(), classParticipation: z.enum(["TB", "B", "M", "INSUFFICIENT"]).optional(), generalNotes: z.string().max(10000).optional(), additionalComments: z.string().max(10000).optional(), submit: z.boolean().default(false) })).mutation(async ({ ctx, input }) => {
      await assertAssignmentAccess(ctx.user.id, ctx.user.role, input.assignmentId); const db = await dbOrThrow(); const { assignmentId, periodId, submit, ...values } = input;
      await db.insert(teacherReports).values({ teachingAssignmentId: assignmentId, academicPeriodId: periodId, ...values, status: submit ? "submitted" : "draft", submittedAt: submit ? new Date() : null }).onDuplicateKeyUpdate({ set: { ...values, status: submit ? "submitted" : "draft", submittedAt: submit ? new Date() : null } });
      return { status: submit ? "submitted" as const : "draft" as const };
    }),
  }),
});
