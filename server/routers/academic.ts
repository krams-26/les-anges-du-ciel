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
