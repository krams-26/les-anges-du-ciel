import { and, count, eq, inArray, ne } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { academicPeriods, academicYears, auditEvents, classes, deliberationDecisions, deliberationSessions, enrollments, grades, secondSessionCandidates, secondSessionSettings } from "../../drizzle/schema";
import { canArchive, canCloseNotes, canProclaim, type SecondSessionCandidateStatus } from "../annualCycle";
import { getDb } from "../db";
import { assertPermission } from "../permissions";
import { adminProcedure, router } from "../_core/trpc";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

async function yearOrThrow(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, academicYearId: number) {
  const [year] = await db.select().from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1);
  if (!year) throw new TRPCError({ code: "NOT_FOUND", message: "Année scolaire introuvable." });
  return year;
}

export const annualCycleRouter = router({
  get: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).query(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "settings", "view");
    return yearOrThrow(await database(), input.academicYearId);
  }),
  configure: adminProcedure.input(z.object({ academicYearId: z.number().int().positive(), secondSessionRequired: z.boolean(), deliberationEnabled: z.boolean(), allowIndividualDeliberation: z.boolean() })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "settings", "edit");
    if (input.deliberationEnabled && input.allowIndividualDeliberation) throw new TRPCError({ code: "BAD_REQUEST", message: "La délibération globale et la sélection individuelle ne peuvent pas être activées simultanément." });
    const db = await database();
    const year = await yearOrThrow(db, input.academicYearId);
    if (year.status === "proclaimed" || year.status === "archived") throw new TRPCError({ code: "BAD_REQUEST", message: "Une année proclamée ou archivée ne peut plus être reconfigurée." });
    const values = { secondSessionRequired: input.secondSessionRequired, deliberationEnabled: input.deliberationEnabled, allowIndividualDeliberation: input.allowIndividualDeliberation };
    await db.update(academicYears).set(values).where(eq(academicYears.id, input.academicYearId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "annual_cycle_configured", module: "annual_cycle", resourceType: "academic_year", resourceId: input.academicYearId, beforeState: JSON.stringify({ secondSessionRequired: year.secondSessionRequired, deliberationEnabled: year.deliberationEnabled, allowIndividualDeliberation: year.allowIndividualDeliberation }), afterState: JSON.stringify(values) });
    return values;
  }),
  activate: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "settings", "edit");
    const db = await database();
    const year = await yearOrThrow(db, input.academicYearId);
    if (year.status !== "draft") throw new TRPCError({ code: "BAD_REQUEST", message: "Seule une année brouillon peut être activée." });
    await db.update(academicYears).set({ status: "active" }).where(eq(academicYears.id, input.academicYearId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "academic_year_activated", module: "annual_cycle", resourceType: "academic_year", resourceId: input.academicYearId });
    return { ok: true };
  }),
  closeNotes: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "results", "validate");
    const db = await database();
    const year = await yearOrThrow(db, input.academicYearId);
    const [unfinished] = await db.select({ total: count() }).from(grades).innerJoin(enrollments, eq(grades.enrollmentId, enrollments.id)).where(and(eq(enrollments.academicYearId, input.academicYearId), inArray(grades.status, ["draft", "submitted"])));
    const unfinishedCount = Number(unfinished?.total ?? 0);
    if (!canCloseNotes(year.status, unfinishedCount)) throw new TRPCError({ code: "BAD_REQUEST", message: unfinishedCount ? "Des notes restent en brouillon ou soumises ; la clôture est impossible." : "Seule une année active peut être clôturée." });
    await db.update(academicPeriods).set({ status: "closed" }).where(eq(academicPeriods.academicYearId, input.academicYearId));
    await db.update(academicYears).set({ status: "notes_closed", notesClosedAt: new Date() }).where(eq(academicYears.id, input.academicYearId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "annual_notes_closed", module: "annual_cycle", resourceType: "academic_year", resourceId: input.academicYearId, afterState: JSON.stringify({ unfinishedCount }) });
    return { ok: true };
  }),
  setIndividualDeliberation: adminProcedure.input(z.object({ decisionId: z.number().int().positive(), required: z.boolean(), reason: z.string().trim().min(3).max(1500) })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "results", "validate");
    const db = await database();
    const [decision] = await db.select({ id: deliberationDecisions.id, requiresDeliberation: deliberationDecisions.requiresDeliberation, academicYearId: deliberationSessions.academicYearId }).from(deliberationDecisions).innerJoin(deliberationSessions, eq(deliberationDecisions.deliberationSessionId, deliberationSessions.id)).where(eq(deliberationDecisions.id, input.decisionId)).limit(1);
    if (!decision) throw new TRPCError({ code: "NOT_FOUND", message: "Décision de délibération introuvable." });
    const year = await yearOrThrow(db, decision.academicYearId);
    if (year.deliberationEnabled || !year.allowIndividualDeliberation || year.status !== "notes_closed") throw new TRPCError({ code: "BAD_REQUEST", message: "La délibération individuelle n’est pas autorisée pour cette année clôturée." });
    await db.update(deliberationDecisions).set({ requiresDeliberation: input.required }).where(eq(deliberationDecisions.id, input.decisionId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "individual_deliberation_requirement_set", module: "annual_cycle", resourceType: "decision", resourceId: input.decisionId, beforeState: JSON.stringify({ required: decision.requiresDeliberation }), afterState: JSON.stringify({ required: input.required }), reason: input.reason });
    return { ok: true };
  }),
  proclaim: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "results", "validate");
    const db = await database();
    const year = await yearOrThrow(db, input.academicYearId);
    const [active] = await db.select({ total: count() }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(enrollments.academicYearId, input.academicYearId), eq(classes.academicYearId, input.academicYearId), eq(enrollments.status, "active")));
    const [setting] = await db.select({ id: secondSessionSettings.id }).from(secondSessionSettings).where(eq(secondSessionSettings.academicYearId, input.academicYearId)).limit(1);
    if (year.secondSessionRequired && !setting) throw new TRPCError({ code: "BAD_REQUEST", message: "La deuxième session obligatoire doit être configurée avant la proclamation." });
    const candidateRows = setting ? await db.select({ status: secondSessionCandidates.status }).from(secondSessionCandidates).where(eq(secondSessionCandidates.secondSessionSettingId, setting.id)) : [];
    const sessions = await db.select({ id: deliberationSessions.id }).from(deliberationSessions).where(eq(deliberationSessions.academicYearId, input.academicYearId));
    const sessionIds = sessions.map((session) => session.id);
    const decisions = sessionIds.length ? await db.select({ status: deliberationDecisions.status, requiresDeliberation: deliberationDecisions.requiresDeliberation }).from(deliberationDecisions).where(inArray(deliberationDecisions.deliberationSessionId, sessionIds)) : [];
    const validGlobal = decisions.filter((decision) => decision.status === "validated").length;
    const requiredIndividuals = decisions.filter((decision) => decision.requiresDeliberation).length;
    const validIndividuals = decisions.filter((decision) => decision.requiresDeliberation && decision.status === "validated").length;
    const allowed = canProclaim({ status: year.status, secondSessionRequired: year.secondSessionRequired, secondSessionStatuses: candidateRows.map((candidate) => candidate.status as SecondSessionCandidateStatus), deliberationEnabled: year.deliberationEnabled, allowIndividualDeliberation: year.allowIndividualDeliberation, activeEnrollments: Number(active?.total ?? 0), validatedGlobalDecisions: validGlobal, requiredIndividualDecisions: requiredIndividuals, validatedIndividualDecisions: validIndividuals });
    if (!allowed) throw new TRPCError({ code: "BAD_REQUEST", message: "La proclamation exige une clôture des notes, le traitement requis de la deuxième session et les validations de délibération attendues." });
    await db.update(academicYears).set({ status: "proclaimed", proclaimedAt: new Date() }).where(eq(academicYears.id, input.academicYearId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "annual_results_proclaimed", module: "annual_cycle", resourceType: "academic_year", resourceId: input.academicYearId, afterState: JSON.stringify({ candidates: candidateRows.length, decisions: decisions.length }) });
    return { ok: true };
  }),
  archive: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
    await assertPermission(ctx.user.id, "settings", "edit");
    const db = await database();
    const year = await yearOrThrow(db, input.academicYearId);
    if (!canArchive(year.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Seule une année proclamée peut être archivée." });
    await db.update(academicYears).set({ status: "archived", archivedAt: new Date() }).where(eq(academicYears.id, input.academicYearId));
    await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "academic_year_archived", module: "annual_cycle", resourceType: "academic_year", resourceId: input.academicYearId });
    return { ok: true };
  }),
});
