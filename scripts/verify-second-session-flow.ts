import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { auditEvents } from "../drizzle/schema";
import { eq } from "drizzle-orm";

let completed = false;

const caller = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });

try {
  const sessionLabel = `Délibération de test ${Date.now()}`;
  const existingSettings = await caller.secondSession.settings.list();
  const existingSetting = existingSettings.find((item) => item.academicYearId === 1);
  const setting = await caller.secondSession.settings.save({ id: existingSetting?.id, academicYearId: 1, eligibilityMode: "below_average", thresholdPercent: 50, status: "open", registrationDeadline: null, examStartsAt: null, examEndsAt: null });
  const evaluation = await caller.secondSession.candidates.evaluate({ settingId: setting.id });
  const candidates = await caller.secondSession.candidates.list({ settingId: setting.id });
  const selectedCandidate = candidates[0];
  const completedCandidate = candidates[1];
  if (!selectedCandidate || !completedCandidate) throw new Error("Deux candidats de test sont nécessaires.");
  await caller.secondSession.candidates.setStatus({ candidateId: selectedCandidate.id, status: "absent", reason: "Absence constatée lors des épreuves de deuxième session" });
  const completedContext = await caller.secondSession.assessments.context({ candidateId: completedCandidate.id });
  for (const course of completedContext.courses) await caller.secondSession.assessments.save({ candidateId: completedCandidate.id, classCourseId: course.classCourseId, score: 0, status: "validated" });
  await caller.secondSession.candidates.setStatus({ candidateId: completedCandidate.id, status: "completed", reason: "Toutes les épreuves de deuxième session ont été validées." });
  const refreshedCandidates = await caller.secondSession.candidates.list({ settingId: setting.id });
  if (refreshedCandidates.find((candidate) => candidate.id === selectedCandidate.id)?.status !== "absent" || refreshedCandidates.find((candidate) => candidate.id === completedCandidate.id)?.status !== "completed") throw new Error("Les statuts absent et terminé n’ont pas été persistés.");
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible pour la vérification des audits.");
  const absentAudits = await db.select({ afterState: auditEvents.afterState }).from(auditEvents).where(eq(auditEvents.resourceId, selectedCandidate.id));
  const completedAudits = await db.select({ afterState: auditEvents.afterState }).from(auditEvents).where(eq(auditEvents.resourceId, completedCandidate.id));
  if (!absentAudits.some((audit) => audit.afterState?.includes('"status":"absent"')) || !completedAudits.some((audit) => audit.afterState?.includes('"status":"completed"'))) throw new Error("Audit de statut absent ou terminé introuvable.");
  const session = await caller.secondSession.deliberation.createSession({ academicYearId: 1, label: sessionLabel });
  const initialized = await caller.secondSession.deliberation.initialize({ sessionId: session.id });
  const decisions = await caller.secondSession.deliberation.decisions({ sessionId: session.id });
  const selectedDecision = decisions[0];
  if (!selectedDecision) throw new Error("Aucune décision de test générée.");
  await caller.secondSession.deliberation.propose({ sessionId: session.id, enrollmentId: selectedDecision.enrollmentId, decision: "admitted", basis: "manual", finalAverage: selectedDecision.finalAverage, rationale: "Validation fonctionnelle du circuit de délibération." });
  const refreshed = await caller.secondSession.deliberation.decisions({ sessionId: session.id });
  const proposed = refreshed.find((decision) => decision.id === selectedDecision.id);
  if (!proposed) throw new Error("Décision proposée introuvable.");
  await caller.secondSession.deliberation.validate({ decisionId: proposed.id, reason: "Validation de test administrateur." });
  const afterValidation = await caller.secondSession.deliberation.history({ decisionId: proposed.id });
  if (!afterValidation.some((event) => event.action === "validated")) throw new Error("Audit de validation introuvable.");
  await caller.secondSession.deliberation.rectify({ decisionId: proposed.id, decision: "admitted", basis: "manual", finalAverage: proposed.finalAverage, rationale: "Rectification fonctionnelle de test." });
  const afterRectification = await caller.secondSession.deliberation.history({ decisionId: proposed.id });
  if (!afterRectification.some((event) => event.action === "rectified")) throw new Error("Audit de rectification introuvable.");
  console.log(JSON.stringify({ verified: true, settingId: setting.id, evaluated: evaluation.processed, candidates: candidates.length, absentCandidateId: selectedCandidate.id, completedCandidateId: completedCandidate.id, statusAuditsVerified: true, decisions: initialized.initialized, validatedDecisionId: proposed.id, auditActions: afterRectification.map((event) => event.action) }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
