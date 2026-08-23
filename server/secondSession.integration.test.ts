import { afterAll, describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { closeDbPool } from "./db";
import type { TrpcContext } from "./_core/context";

const integration = process.env.RUN_DB_INTEGRATION_TESTS === "true" && process.env.DATABASE_URL ? describe : describe.skip;
const context: TrpcContext = {
  user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
  req: {} as TrpcContext["req"],
  res: {} as TrpcContext["res"],
};

integration.sequential("audit de deuxième session", () => {
  const caller = appRouter.createCaller(context);
  let decisionId = 0;

  afterAll(async () => {
    await closeDbPool();
  });

  it("crée un audit lors de la validation d’une décision proposée", async () => {
    const years = await caller.school.years.list();
    const year = years[0];
    expect(year).toBeDefined();
    const settings = await caller.secondSession.settings.list();
    const existing = settings.find((item) => item.academicYearId === year!.id);
    const setting = await caller.secondSession.settings.save({ id: existing?.id, academicYearId: year!.id, eligibilityMode: "below_average", thresholdPercent: 50, status: "open", registrationDeadline: null, examStartsAt: null, examEndsAt: null });
    await caller.secondSession.candidates.evaluate({ settingId: setting.id });
    const session = await caller.secondSession.deliberation.createSession({ academicYearId: year!.id, label: `Audit Vitest ${Date.now()}` });
    await caller.secondSession.deliberation.initialize({ sessionId: session.id });
    const decisions = await caller.secondSession.deliberation.decisions({ sessionId: session.id });
    const selected = decisions[0];
    expect(selected).toBeDefined();
    await caller.secondSession.deliberation.propose({ sessionId: session.id, enrollmentId: selected!.enrollmentId, decision: "admitted", basis: "manual", finalAverage: selected!.finalAverage, rationale: "Proposition de test Vitest." });
    await caller.secondSession.deliberation.validate({ decisionId: selected!.id, reason: "Validation de test Vitest." });
    decisionId = selected!.id;
    const history = await caller.secondSession.deliberation.history({ decisionId });
    expect(history.some((event) => event.action === "validated")).toBe(true);
  }, 60_000);

  it("journalise une rectification et replace la décision à l’état proposé", async () => {
    expect(decisionId).toBeGreaterThan(0);
    await caller.secondSession.deliberation.rectify({ decisionId, decision: "referred", basis: "manual", finalAverage: 45, rationale: "Rectification de test Vitest." });
    const history = await caller.secondSession.deliberation.history({ decisionId });
    expect(history.some((event) => event.action === "rectified")).toBe(true);
  }, 30_000);
});
