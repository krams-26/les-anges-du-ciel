import { TRPCError } from "@trpc/server";
import { and, count, eq, sum } from "drizzle-orm";
import { z } from "zod";
import { academicYears, classes, deliberationDecisions, deliberationSessions, enrollmentFinancialAccounts, enrollments, grades, secondSessionSettings, teacherReports, teachingAssignments, classCourses } from "../../drizzle/schema";
import { adminProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { getAcademicResultsForYear } from "../academicResults";
import { assertPermission } from "../permissions";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

const annualInput = z.object({ academicYearId: z.number().int().positive() });
const numeric = (value: unknown) => Number(value ?? 0);

export const annualControlRouter = router({
  summary: adminProcedure.input(annualInput).query(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "settings", "view");
    await assertPermission(ctx.user.id, "results", "view");
    await assertPermission(ctx.user.id, "finance", "view");
    const db = await database();
    const yearCondition = eq(classes.academicYearId, input.academicYearId);
    const [year] = await db.select({ id: academicYears.id, code: academicYears.code, label: academicYears.label, status: academicYears.status, startsAt: academicYears.startsAt, endsAt: academicYears.endsAt }).from(academicYears).where(eq(academicYears.id, input.academicYearId)).limit(1);
    if (!year) throw new TRPCError({ code: "NOT_FOUND", message: "Année scolaire introuvable." });
    const [enrollmentsTotal] = await db.select({ total: count() }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(yearCondition, eq(enrollments.status, "active")));
    const [gradesDraft] = await db.select({ total: count() }).from(grades).innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(yearCondition, eq(grades.status, "draft")));
    const [gradesSubmitted] = await db.select({ total: count() }).from(grades).innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(yearCondition, eq(grades.status, "submitted")));
    const [gradesValidated] = await db.select({ total: count() }).from(grades).innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(yearCondition, eq(grades.status, "validated")));
    const [reportsDraft] = await db.select({ total: count() }).from(teacherReports).innerJoin(teachingAssignments, eq(teacherReports.teachingAssignmentId, teachingAssignments.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).where(and(yearCondition, eq(teacherReports.status, "draft")));
    const [reportsSubmitted] = await db.select({ total: count() }).from(teacherReports).innerJoin(teachingAssignments, eq(teacherReports.teachingAssignmentId, teachingAssignments.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).where(and(yearCondition, eq(teacherReports.status, "submitted")));
    const [reportsValidated] = await db.select({ total: count() }).from(teacherReports).innerJoin(teachingAssignments, eq(teacherReports.teachingAssignmentId, teachingAssignments.id)).innerJoin(classCourses, eq(teachingAssignments.classCourseId, classCourses.id)).innerJoin(classes, eq(classCourses.classId, classes.id)).where(and(yearCondition, eq(teacherReports.status, "validated")));
    const [finance] = await db.select({ expected: sum(enrollmentFinancialAccounts.expectedAmount), paid: sum(enrollmentFinancialAccounts.paidAmount) }).from(enrollmentFinancialAccounts).innerJoin(enrollments, eq(enrollmentFinancialAccounts.enrollmentId, enrollments.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(yearCondition);
    const decisions = await db.select({ status: deliberationDecisions.status, total: count() }).from(deliberationDecisions).innerJoin(deliberationSessions, eq(deliberationDecisions.deliberationSessionId, deliberationSessions.id)).where(eq(deliberationSessions.academicYearId, input.academicYearId)).groupBy(deliberationDecisions.status);
    const [setting] = await db.select({ id: secondSessionSettings.id, status: secondSessionSettings.status, thresholdPercent: secondSessionSettings.thresholdPercent, registrationDeadline: secondSessionSettings.registrationDeadline, examStartsAt: secondSessionSettings.examStartsAt, examEndsAt: secondSessionSettings.examEndsAt }).from(secondSessionSettings).where(eq(secondSessionSettings.academicYearId, input.academicYearId)).limit(1);
    const academicResults = await getAcademicResultsForYear(db, input.academicYearId, { type: "annual" });
    const comparablePercentages = academicResults.flatMap((result) => result.percentage === null ? [] : [result.percentage]);
    const academicAverage = comparablePercentages.length ? Math.round((comparablePercentages.reduce((total, percentage) => total + percentage, 0) / comparablePercentages.length) * 100) / 100 : null;
    const decisionCounts = Object.fromEntries(decisions.map((item) => [item.status, numeric(item.total)]));
    const expectedAmount = numeric(finance?.expected);
    const paidAmount = numeric(finance?.paid);
    return {
      year,
      enrollmentCount: numeric(enrollmentsTotal?.total),
      grades: { draft: numeric(gradesDraft?.total), submitted: numeric(gradesSubmitted?.total), validated: numeric(gradesValidated?.total) },
      reports: { draft: numeric(reportsDraft?.total), submitted: numeric(reportsSubmitted?.total), validated: numeric(reportsValidated?.total) },
      academic: { comparableEnrollments: comparablePercentages.length, completedEnrollments: academicResults.filter((result) => result.status === "complete").length, averagePercentage: academicAverage, highestPercentage: comparablePercentages.length ? Math.max(...comparablePercentages) : null },
      finance: { expectedAmount, paidAmount, remainingAmount: Math.max(0, expectedAmount - paidAmount), collectionRate: expectedAmount ? Math.round((paidAmount / expectedAmount) * 1000) / 10 : 0 },
      decisions: { draft: decisionCounts.draft ?? 0, proposed: decisionCounts.proposed ?? 0, validated: decisionCounts.validated ?? 0 },
      secondSession: setting ?? null,
    };
  }),
});
