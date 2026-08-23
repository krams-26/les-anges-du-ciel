import { appRouter } from "../server/routers";
import { closeDbPool } from "../server/db";

const caller = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });

try {
  const sessionLabel = `Délibération de test ${Date.now()}`;
  const existingSettings = await caller.secondSession.settings.list();
  const existingSetting = existingSettings.find((item) => item.academicYearId === 1);
  const setting = await caller.secondSession.settings.save({ id: existingSetting?.id, academicYearId: 1, eligibilityMode: "below_average", thresholdPercent: 50, status: "open", registrationDeadline: null, examStartsAt: null, examEndsAt: null });
  const evaluation = await caller.secondSession.candidates.evaluate({ settingId: setting.id });
  const candidates = await caller.secondSession.candidates.list({ settingId: setting.id });
  const selectedCandidate = candidates[0];
  if (!selectedCandidate) throw new Error("Aucun candidat de test généré.");
  await caller.secondSession.candidates.setStatus({ candidateId: selectedCandidate.id, status: "registered", reason: "Inscription de test en deuxième session" });
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
  console.log(JSON.stringify({ verified: true, settingId: setting.id, evaluated: evaluation.processed, candidates: candidates.length, decisions: initialized.initialized, validatedDecisionId: proposed.id, auditActions: afterRectification.map((event) => event.action) }, null, 2));
} finally {
  await closeDbPool();
}
