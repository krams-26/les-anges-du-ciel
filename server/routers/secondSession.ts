import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { academicYears, auditEvents, classCourses, classes, courses, deliberationAudits, deliberationDecisions, deliberationSessions, enrollments, grades, secondSessionAssessments, secondSessionCandidates, secondSessionSettings, students, users } from "../../drizzle/schema";
import { getDb } from "../db";
import { getAcademicResultsForYear } from "../academicResults";
import { calculateSecondSessionResult, maximumForConfiguredCoursePeriod } from "../academicEngine";
import { canWriteAcademicYear } from "../academicResults";
import { assertPermission } from "../permissions";
import { adminProcedure, router } from "../_core/trpc";

async function database() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La base de données n’est pas disponible." });
  return db;
}

async function assertAnnualWriteAllowed(db: NonNullable<Awaited<ReturnType<typeof getDb>>>, academicYearId: number) {
  const [year] = await db.select({ status: academicYears.status }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1);
  if (!year) throw new TRPCError({ code: "NOT_FOUND", message: "Année scolaire introuvable." });
  if (!canWriteAcademicYear(year.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Les données de cette année proclamée ou archivée sont gelées." });
}

const dateInput = z.coerce.date().optional().nullable();
const decisionEnum = z.enum(["pending", "admitted", "referred", "repeat", "withdrawn"]);
export const secondSessionInputs = {
  assessment: z.object({ candidateId: z.number().int().positive(), classCourseId: z.number().int().positive(), score: z.number().int().min(0), maximum: z.number().int().positive().optional(), status: z.enum(["draft", "submitted", "validated"]) }).refine((value) => value.maximum === undefined || value.score <= value.maximum, { message: "La note ne peut pas dépasser le maximum indiqué.", path: ["score"] }),
};
export const canValidateDeliberation = (status: "draft" | "proposed" | "validated") => status === "proposed";

export const secondSessionRouter = router({
  settings: router({
    list: adminProcedure.query(async ({ ctx }) => { await assertPermission(ctx.user.id, "settings", "view"); return (await database()).select({ id: secondSessionSettings.id, academicYearId: secondSessionSettings.academicYearId, academicYear: academicYears.label, eligibilityMode: secondSessionSettings.eligibilityMode, thresholdPercent: secondSessionSettings.thresholdPercent, registrationDeadline: secondSessionSettings.registrationDeadline, examStartsAt: secondSessionSettings.examStartsAt, examEndsAt: secondSessionSettings.examEndsAt, status: secondSessionSettings.status }).from(secondSessionSettings).innerJoin(academicYears, eq(secondSessionSettings.academicYearId, academicYears.id)).orderBy(desc(secondSessionSettings.updatedAt)); }),
    save: adminProcedure.input(z.object({ id: z.number().int().positive().optional(), academicYearId: z.number().int().positive(), eligibilityMode: z.enum(["below_average", "unvalidated", "manual"]), thresholdPercent: z.number().int().min(0).max(100), registrationDeadline: dateInput, examStartsAt: dateInput, examEndsAt: dateInput, status: z.enum(["draft", "open", "closed", "archived"]) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "settings", "edit");
      const db = await database();
      await assertAnnualWriteAllowed(db, input.academicYearId);
      const values = { academicYearId: input.academicYearId, eligibilityMode: input.eligibilityMode, thresholdPercent: input.thresholdPercent, registrationDeadline: input.registrationDeadline ?? null, examStartsAt: input.examStartsAt ?? null, examEndsAt: input.examEndsAt ?? null, status: input.status };
      if (input.id) {
        await db.update(secondSessionSettings).set(values).where(eq(secondSessionSettings.id, input.id));
        await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "second_session_settings_updated", module: "second_session", resourceType: "setting", resourceId: input.id, afterState: JSON.stringify(values) });
        return { id: input.id };
      }
      await db.insert(secondSessionSettings).values({ ...values, createdByUserId: ctx.user.id });
      const [created] = await db.select({ id: secondSessionSettings.id }).from(secondSessionSettings).where(eq(secondSessionSettings.academicYearId, input.academicYearId)).limit(1);
      if (!created) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La configuration de deuxième session n’a pas été créée." });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "second_session_settings_created", module: "second_session", resourceType: "setting", resourceId: created.id, afterState: JSON.stringify(values) });
      return created;
    }),
  }),
  candidates: router({
    list: adminProcedure.input(z.object({ settingId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "results", "view"); return (await database()).select({ id: secondSessionCandidates.id, enrollmentId: secondSessionCandidates.enrollmentId, status: secondSessionCandidates.status, calculatedAverage: secondSessionCandidates.calculatedAverage, eligibilityReason: secondSessionCandidates.eligibilityReason, studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentCode, className: classes.name }).from(secondSessionCandidates).innerJoin(enrollments, eq(secondSessionCandidates.enrollmentId, enrollments.id)).innerJoin(students, eq(enrollments.studentId, students.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(eq(secondSessionCandidates.secondSessionSettingId, input.settingId)).orderBy(asc(classes.name), asc(students.lastName), asc(students.firstName)); }),
    evaluate: adminProcedure.input(z.object({ settingId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [setting] = await db.select().from(secondSessionSettings).where(eq(secondSessionSettings.id, input.settingId)).limit(1);
      if (!setting) throw new TRPCError({ code: "NOT_FOUND", message: "Configuration de deuxième session introuvable." });
      await assertAnnualWriteAllowed(db, setting.academicYearId);
      const yearEnrollments = await db.select({ id: enrollments.id }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(classes.academicYearId, setting.academicYearId), eq(enrollments.status, "active")));
      const annualResults = await getAcademicResultsForYear(db, setting.academicYearId, { type: "annual" });
      const resultByEnrollment = new Map(annualResults.map((result) => [result.enrollmentId, result]));
      let processed = 0;
      for (const enrollment of yearEnrollments) {
        const result = resultByEnrollment.get(enrollment.id);
        const average = result?.percentage ?? null;
        const eligible = setting.eligibilityMode === "manual" ? false : setting.eligibilityMode === "unvalidated" ? result?.status !== "complete" : average === null || average < setting.thresholdPercent;
        const reason = setting.eligibilityMode === "manual" ? "Évaluation manuelle requise" : average === null ? "Aucun résultat validé disponible" : `Moyenne calculée : ${average} % (seuil ${setting.thresholdPercent} %)`;
        await db.insert(secondSessionCandidates).values({ secondSessionSettingId: setting.id, enrollmentId: enrollment.id, status: eligible ? "eligible" : "ineligible", calculatedAverage: average, eligibilityReason: reason, decidedByUserId: ctx.user.id, decidedAt: new Date() }).onDuplicateKeyUpdate({ set: { status: eligible ? "eligible" : "ineligible", calculatedAverage: average, eligibilityReason: reason, decidedByUserId: ctx.user.id, decidedAt: new Date() } });
        processed += 1;
      }
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "second_session_eligibility_evaluated", module: "second_session", resourceType: "setting", resourceId: setting.id, afterState: JSON.stringify({ processed }) });
      return { processed };
    }),
    setStatus: adminProcedure.input(z.object({ candidateId: z.number().int().positive(), status: z.enum(["eligible", "registered", "exempt", "ineligible", "absent", "completed", "withdrawn"]), reason: z.string().trim().min(3).max(1000) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [candidate] = await db.select({ academicYearId: secondSessionSettings.academicYearId }).from(secondSessionCandidates).innerJoin(secondSessionSettings, eq(secondSessionCandidates.secondSessionSettingId, secondSessionSettings.id)).where(eq(secondSessionCandidates.id, input.candidateId)).limit(1);
      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidat de deuxième session introuvable." });
      await assertAnnualWriteAllowed(db, candidate.academicYearId);
      if (input.status === "completed") {
        const assessments = await db.select({ status: secondSessionAssessments.status }).from(secondSessionAssessments).where(eq(secondSessionAssessments.candidateId, input.candidateId));
        if (!assessments.length || assessments.some((assessment) => assessment.status !== "validated")) throw new TRPCError({ code: "BAD_REQUEST", message: "Un candidat ne peut être déclaré terminé que lorsque toutes ses épreuves enregistrées sont validées." });
      }
      await db.update(secondSessionCandidates).set({ status: input.status, eligibilityReason: input.reason, decidedByUserId: ctx.user.id, decidedAt: new Date() }).where(eq(secondSessionCandidates.id, input.candidateId));
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "second_session_candidate_updated", module: "second_session", resourceType: "candidate", resourceId: input.candidateId, afterState: JSON.stringify(input), reason: input.reason });
      return { ok: true };
    }),
  }),
  assessments: router({
    save: adminProcedure.input(secondSessionInputs.assessment).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "grades", "edit");
      const db = await database();
      const [candidate] = await db.select({ enrollmentId: secondSessionCandidates.enrollmentId, academicYearId: secondSessionSettings.academicYearId, classId: enrollments.classId }).from(secondSessionCandidates).innerJoin(secondSessionSettings, eq(secondSessionCandidates.secondSessionSettingId, secondSessionSettings.id)).innerJoin(enrollments, eq(secondSessionCandidates.enrollmentId, enrollments.id)).where(eq(secondSessionCandidates.id, input.candidateId)).limit(1);
      if (!candidate?.classId) throw new TRPCError({ code: "NOT_FOUND", message: "Candidat de deuxième session introuvable." });
      await assertAnnualWriteAllowed(db, candidate.academicYearId);
      const [configuration] = await db.select({ classId: classCourses.classId, periodWeight: classCourses.periodWeight }).from(classCourses).where(eq(classCourses.id, input.classCourseId)).limit(1);
      if (!configuration || configuration.classId !== candidate.classId) throw new TRPCError({ code: "BAD_REQUEST", message: "Le cours choisi ne correspond pas à la classe annuelle du candidat." });
      const maximum = maximumForConfiguredCoursePeriod(configuration.periodWeight, { kind: "exam" });
      if (!maximum || input.score > maximum) throw new TRPCError({ code: "BAD_REQUEST", message: `La note de deuxième session ne peut pas dépasser ${maximum ?? 0} points.` });
      const values = { candidateId: input.candidateId, classCourseId: input.classCourseId, score: input.score, maximum, status: input.status, enteredByUserId: ctx.user.id, submittedAt: input.status === "draft" ? null : new Date() };
      await db.insert(secondSessionAssessments).values(values).onDuplicateKeyUpdate({ set: { score: values.score, maximum: values.maximum, status: values.status, enteredByUserId: values.enteredByUserId, submittedAt: values.submittedAt } });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "second_session_assessment_saved", module: "second_session", resourceType: "candidate", resourceId: input.candidateId, afterState: JSON.stringify(values) });
      return { ok: true };
    }),
    summary: adminProcedure.input(z.object({ candidateId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "results", "view"); return (await database()).select().from(secondSessionAssessments).where(eq(secondSessionAssessments.candidateId, input.candidateId)); }),
    context: adminProcedure.input(z.object({ candidateId: z.number().int().positive() })).query(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "view");
      const db = await database();
      const [candidate] = await db.select({ id: secondSessionCandidates.id, enrollmentId: secondSessionCandidates.enrollmentId, firstSessionAverage: secondSessionCandidates.calculatedAverage, classId: enrollments.classId }).from(secondSessionCandidates).innerJoin(enrollments, eq(secondSessionCandidates.enrollmentId, enrollments.id)).where(eq(secondSessionCandidates.id, input.candidateId)).limit(1);
      if (!candidate) throw new TRPCError({ code: "NOT_FOUND", message: "Candidat de deuxième session introuvable." });
      const configuredCourses = await db.select({ classCourseId: classCourses.id, courseCode: courses.code, courseName: courses.name, periodWeight: classCourses.periodWeight }).from(classCourses).innerJoin(courses, eq(classCourses.courseId, courses.id)).where(eq(classCourses.classId, Number(candidate.classId))).orderBy(asc(courses.name));
      const assessments = await db.select().from(secondSessionAssessments).where(eq(secondSessionAssessments.candidateId, input.candidateId));
      const secondSessionResult = calculateSecondSessionResult({ enrollmentId: candidate.enrollmentId, classCourses: configuredCourses.map((course) => ({ id: course.classCourseId, courseId: course.classCourseId, courseCode: course.courseCode, courseName: course.courseName, periodWeight: course.periodWeight, status: "configured" as const })), assessments: assessments.map((assessment) => ({ enrollmentId: candidate.enrollmentId, classCourseId: assessment.classCourseId, score: assessment.score, status: assessment.status })) });
      const [finalDecision] = await db.select({ decision: deliberationDecisions.decision, status: deliberationDecisions.status, basis: deliberationDecisions.basis, finalAverage: deliberationDecisions.finalAverage, sessionLabel: deliberationSessions.label }).from(deliberationDecisions).innerJoin(deliberationSessions, eq(deliberationDecisions.deliberationSessionId, deliberationSessions.id)).where(and(eq(deliberationDecisions.enrollmentId, candidate.enrollmentId), eq(deliberationDecisions.status, "validated"))).orderBy(desc(deliberationDecisions.validatedAt)).limit(1);
      return { candidate, finalDecision: finalDecision ?? null, secondSessionResult, courses: configuredCourses.map((course) => ({ ...course, maximum: course.periodWeight * 2, assessment: assessments.find((assessment) => assessment.classCourseId === course.classCourseId) ? { ...assessments.find((assessment) => assessment.classCourseId === course.classCourseId)!, maximum: course.periodWeight * 2 } : null })) };
    }),
  }),
  deliberation: router({
    sessions: adminProcedure.input(z.object({ academicYearId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "results", "view"); return (await database()).select().from(deliberationSessions).where(eq(deliberationSessions.academicYearId, input.academicYearId)).orderBy(desc(deliberationSessions.updatedAt)); }),
    createSession: adminProcedure.input(z.object({ academicYearId: z.number().int().positive(), label: z.string().trim().min(3).max(120) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      await assertAnnualWriteAllowed(db, input.academicYearId);
      await db.insert(deliberationSessions).values({ ...input, createdByUserId: ctx.user.id });
      const [session] = await db.select({ id: deliberationSessions.id }).from(deliberationSessions).where(and(eq(deliberationSessions.academicYearId, input.academicYearId), eq(deliberationSessions.label, input.label))).limit(1);
      if (!session) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La session de délibération n’a pas été créée." });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "deliberation_session_created", module: "deliberation", resourceType: "session", resourceId: session.id, afterState: JSON.stringify(input) });
      return session;
    }),
    initialize: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [session] = await db.select().from(deliberationSessions).where(eq(deliberationSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session de délibération introuvable." });
      await assertAnnualWriteAllowed(db, session.academicYearId);
      const [year] = await db.select({ deliberationEnabled: academicYears.deliberationEnabled }).from(academicYears).where(eq(academicYears.id, session.academicYearId)).limit(1);
      const activeEnrollments = await db.select({ id: enrollments.id }).from(enrollments).innerJoin(classes, eq(enrollments.classId, classes.id)).where(and(eq(classes.academicYearId, session.academicYearId), eq(enrollments.status, "active")));
      const annualResults = await getAcademicResultsForYear(db, session.academicYearId, { type: "annual" });
      const resultByEnrollment = new Map(annualResults.map((result) => [result.enrollmentId, result]));
      for (const enrollment of activeEnrollments) {
        const average = resultByEnrollment.get(enrollment.id)?.percentage ?? null;
        await db.insert(deliberationDecisions).values({ deliberationSessionId: session.id, enrollmentId: enrollment.id, finalAverage: average, proposedByUserId: ctx.user.id, requiresDeliberation: year?.deliberationEnabled ?? false }).onDuplicateKeyUpdate({ set: { finalAverage: average, requiresDeliberation: year?.deliberationEnabled ?? false } });
      }
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "deliberation_decisions_initialized", module: "deliberation", resourceType: "session", resourceId: session.id, afterState: JSON.stringify({ enrollments: activeEnrollments.length }) });
      return { initialized: activeEnrollments.length };
    }),
    decisions: adminProcedure.input(z.object({ sessionId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "results", "view"); return (await database()).select({ id: deliberationDecisions.id, enrollmentId: deliberationDecisions.enrollmentId, decision: deliberationDecisions.decision, basis: deliberationDecisions.basis, finalAverage: deliberationDecisions.finalAverage, rationale: deliberationDecisions.rationale, status: deliberationDecisions.status, studentName: students.firstName, studentLastName: students.lastName, studentCode: students.studentCode, className: classes.name }).from(deliberationDecisions).innerJoin(enrollments, eq(deliberationDecisions.enrollmentId, enrollments.id)).innerJoin(students, eq(enrollments.studentId, students.id)).innerJoin(classes, eq(enrollments.classId, classes.id)).where(eq(deliberationDecisions.deliberationSessionId, input.sessionId)).orderBy(asc(classes.name), asc(students.lastName)); }),
    propose: adminProcedure.input(z.object({ sessionId: z.number().int().positive(), enrollmentId: z.number().int().positive(), decision: decisionEnum, basis: z.enum(["first_session", "second_session", "manual"]), finalAverage: z.number().int().min(0).max(100).nullable(), rationale: z.string().trim().min(3).max(1500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [session] = await db.select({ academicYearId: deliberationSessions.academicYearId }).from(deliberationSessions).where(eq(deliberationSessions.id, input.sessionId)).limit(1);
      if (!session) throw new TRPCError({ code: "NOT_FOUND", message: "Session de délibération introuvable." });
      await assertAnnualWriteAllowed(db, session.academicYearId);
      const [previous] = await db.select().from(deliberationDecisions).where(and(eq(deliberationDecisions.deliberationSessionId, input.sessionId), eq(deliberationDecisions.enrollmentId, input.enrollmentId))).limit(1);
      await db.insert(deliberationDecisions).values({ deliberationSessionId: input.sessionId, enrollmentId: input.enrollmentId, decision: input.decision, basis: input.basis, finalAverage: input.finalAverage, rationale: input.rationale, status: "proposed", proposedByUserId: ctx.user.id, proposedAt: new Date() }).onDuplicateKeyUpdate({ set: { decision: input.decision, basis: input.basis, finalAverage: input.finalAverage, rationale: input.rationale, status: "proposed", proposedByUserId: ctx.user.id, proposedAt: new Date(), validatedByUserId: null, validatedAt: null } });
      const [saved] = await db.select({ id: deliberationDecisions.id }).from(deliberationDecisions).where(and(eq(deliberationDecisions.deliberationSessionId, input.sessionId), eq(deliberationDecisions.enrollmentId, input.enrollmentId))).limit(1);
      if (!saved) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "La proposition n’a pas été enregistrée." });
      await db.insert(deliberationAudits).values({ deliberationDecisionId: saved.id, action: "proposed", previousState: previous ? JSON.stringify(previous) : null, nextState: JSON.stringify(input), reason: input.rationale, actorUserId: ctx.user.id });
      return saved;
    }),
    validate: adminProcedure.input(z.object({ decisionId: z.number().int().positive(), reason: z.string().trim().min(3).max(1500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [previous] = await db.select({ id: deliberationDecisions.id, status: deliberationDecisions.status, decision: deliberationDecisions.decision, basis: deliberationDecisions.basis, finalAverage: deliberationDecisions.finalAverage, rationale: deliberationDecisions.rationale, deliberationSessionId: deliberationDecisions.deliberationSessionId, academicYearId: deliberationSessions.academicYearId }).from(deliberationDecisions).innerJoin(deliberationSessions, eq(deliberationDecisions.deliberationSessionId, deliberationSessions.id)).where(eq(deliberationDecisions.id, input.decisionId)).limit(1);
      if (!previous || !canValidateDeliberation(previous.status)) throw new TRPCError({ code: "BAD_REQUEST", message: "Seule une décision proposée peut être validée." });
      await assertAnnualWriteAllowed(db, previous.academicYearId);
      await db.update(deliberationDecisions).set({ status: "validated", validatedByUserId: ctx.user.id, validatedAt: new Date() }).where(eq(deliberationDecisions.id, input.decisionId));
      await db.insert(deliberationAudits).values({ deliberationDecisionId: input.decisionId, action: "validated", previousState: JSON.stringify(previous), nextState: JSON.stringify({ status: "validated" }), reason: input.reason, actorUserId: ctx.user.id });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "deliberation_decision_validated", module: "deliberation", resourceType: "decision", resourceId: input.decisionId, reason: input.reason });
      return { ok: true };
    }),
    rectify: adminProcedure.input(z.object({ decisionId: z.number().int().positive(), decision: decisionEnum, basis: z.enum(["first_session", "second_session", "manual"]), finalAverage: z.number().int().min(0).max(100).nullable(), rationale: z.string().trim().min(3).max(1500) })).mutation(async ({ ctx, input }) => {
      await assertPermission(ctx.user.id, "results", "validate");
      const db = await database();
      const [previous] = await db.select({ id: deliberationDecisions.id, status: deliberationDecisions.status, decision: deliberationDecisions.decision, basis: deliberationDecisions.basis, finalAverage: deliberationDecisions.finalAverage, rationale: deliberationDecisions.rationale, deliberationSessionId: deliberationDecisions.deliberationSessionId, academicYearId: deliberationSessions.academicYearId }).from(deliberationDecisions).innerJoin(deliberationSessions, eq(deliberationDecisions.deliberationSessionId, deliberationSessions.id)).where(eq(deliberationDecisions.id, input.decisionId)).limit(1);
      if (!previous || previous.status !== "validated") throw new TRPCError({ code: "BAD_REQUEST", message: "Seule une décision validée peut être rectifiée." });
      await assertAnnualWriteAllowed(db, previous.academicYearId);
      await db.update(deliberationDecisions).set({ decision: input.decision, basis: input.basis, finalAverage: input.finalAverage, rationale: input.rationale, status: "proposed", proposedByUserId: ctx.user.id, proposedAt: new Date(), validatedByUserId: null, validatedAt: null }).where(eq(deliberationDecisions.id, input.decisionId));
      await db.insert(deliberationAudits).values({ deliberationDecisionId: input.decisionId, action: "rectified", previousState: JSON.stringify(previous), nextState: JSON.stringify(input), reason: input.rationale, actorUserId: ctx.user.id });
      await db.insert(auditEvents).values({ actorUserId: ctx.user.id, action: "deliberation_decision_rectified", module: "deliberation", resourceType: "decision", resourceId: input.decisionId, reason: input.rationale });
      return { ok: true };
    }),
    history: adminProcedure.input(z.object({ decisionId: z.number().int().positive() })).query(async ({ ctx, input }) => { await assertPermission(ctx.user.id, "audit", "view"); return (await database()).select({ id: deliberationAudits.id, action: deliberationAudits.action, previousState: deliberationAudits.previousState, nextState: deliberationAudits.nextState, reason: deliberationAudits.reason, createdAt: deliberationAudits.createdAt, actorName: users.name }).from(deliberationAudits).leftJoin(users, eq(deliberationAudits.actorUserId, users.id)).where(eq(deliberationAudits.deliberationDecisionId, input.decisionId)).orderBy(desc(deliberationAudits.createdAt)); }),
  }),
});
