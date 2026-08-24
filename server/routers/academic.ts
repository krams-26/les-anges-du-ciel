import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { classes, enrollments } from "../../drizzle/schema";
import { getAcademicResultsForYear } from "../academicResults";
import { rankAcademicResults } from "../academicEngine";
import { getDb } from "../db";
import { assertPermission } from "../permissions";
import { adminProcedure, router } from "../_core/trpc";

const scopeInput = z.discriminatedUnion("type", [
  z.object({ type: z.literal("period"), periodId: z.number().int().positive() }),
  z.object({ type: z.literal("semester"), semester: z.union([z.literal(1), z.literal(2)]) }),
  z.object({ type: z.literal("annual") }),
]);

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

/** API commune pour résultats, relevés, dashboard et statistiques administratives. */
export const academicRouter = router({
  yearClassSummaries: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "results", "view");
    const db = await database();
    const yearClasses = await db.select({ id: classes.id, name: classes.name, level: classes.level, section: classes.section }).from(classes).where(and(eq(classes.academicYearId, input.academicYearId), eq(classes.status, "active")));
    const activeEnrollments = await db.select({ id: enrollments.id, classId: enrollments.classId }).from(enrollments).where(and(eq(enrollments.academicYearId, input.academicYearId), eq(enrollments.status, "active")));
    const annualResults = await getAcademicResultsForYear(db, input.academicYearId, { type: "annual" });
    return yearClasses.map((schoolClass) => {
      const enrollmentIds = activeEnrollments.filter((enrollment) => enrollment.classId === schoolClass.id).map((enrollment) => enrollment.id);
      const percentages = annualResults.filter((result) => enrollmentIds.includes(result.enrollmentId) && result.percentage !== null).map((result) => result.percentage as number);
      return { ...schoolClass, activeStudentCount: enrollmentIds.length, averagePercentage: percentages.length ? Math.round((percentages.reduce((total, percentage) => total + percentage, 0) / percentages.length) * 100) / 100 : null, completedStudentCount: annualResults.filter((result) => enrollmentIds.includes(result.enrollmentId) && result.status === "complete").length };
    });
  }),
  classResults: adminProcedure.input(z.object({ classId: z.number().int().positive(), scope: scopeInput })).query(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "results", "view");
    const db = await database();
    const [schoolClass] = await db.select({ id: classes.id, academicYearId: classes.academicYearId }).from(classes).where(eq(classes.id, input.classId)).limit(1);
    if (!schoolClass) throw new TRPCError({ code: "NOT_FOUND", message: "Classe introuvable." });
    const classEnrollments = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.classId, input.classId), eq(enrollments.academicYearId, schoolClass.academicYearId), eq(enrollments.status, "active")));
    const ids = new Set(classEnrollments.map((enrollment) => enrollment.id));
    const results = (await getAcademicResultsForYear(db, schoolClass.academicYearId, input.scope)).filter((result) => ids.has(result.enrollmentId));
    return rankAcademicResults(results);
  }),
});
