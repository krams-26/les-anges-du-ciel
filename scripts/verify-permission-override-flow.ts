import { appRouter } from "../server/routers";
import { closeDbPool } from "../server/db";

const admin = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
const parent = appRouter.createCaller({ user: { id: 600005, openId: "test-parent-open-id", name: "Parent portail de test", email: null, loginMethod: "test", role: "parent", accountStatus: "active", accessRoleId: 3, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
let completed = false;

try {
  const children = await parent.parent.children();
  const enrollmentId = children[0]?.enrollmentId;
  if (!enrollmentId) throw new Error("Aucun enfant de test lié au parent.");
  const before = await parent.parent.results({ enrollmentId });
  await admin.governance.permissions.saveOverride({ userId: 600005, resource: "grades", action: "view", allowed: false, reason: "Vérification e2e de refus temporaire." });
  let refused = false;
  try {
    await parent.parent.results({ enrollmentId });
  } catch (error) {
    refused = error instanceof Error && error.message.includes("retirée des permissions");
  }
  if (!refused) throw new Error("La dérogation de refus n’a pas bloqué la route parent.results.");
  await admin.governance.permissions.resetOverride({ userId: 600005, resource: "grades", action: "view" });
  const after = await parent.parent.results({ enrollmentId });
  await parent.personal.search({ query: "Test", category: "students" });
  await admin.governance.permissions.saveOverride({ userId: 600005, resource: "students", action: "view", allowed: false, reason: "Vérification e2e de refus transverse." });
  let transverseRefusalObserved = false;
  try {
    await parent.personal.search({ query: "Test", category: "students" });
  } catch (error) {
    transverseRefusalObserved = error instanceof Error && error.message.includes("retirée des permissions");
  }
  if (!transverseRefusalObserved) throw new Error("La dérogation de refus n’a pas bloqué la route personal.search.");
  await admin.governance.permissions.resetOverride({ userId: 600005, resource: "students", action: "view" });
  const transverseAfterReset = await parent.personal.search({ query: "Test", category: "students" });
  console.log(JSON.stringify({ verified: true, enrollmentId, resultsBefore: before.length, resultsAfterReset: after.length, refusalObserved: refused, transverseRefusalObserved, transverseResultsAfterReset: transverseAfterReset.length }, null, 2));
  completed = true;
} finally {
  try { await admin.governance.permissions.resetOverride({ userId: 600005, resource: "grades", action: "view" }); } catch { /* la réinitialisation de sûreté ne doit pas masquer le résultat principal */ }
  try { await admin.governance.permissions.resetOverride({ userId: 600005, resource: "students", action: "view" }); } catch { /* la réinitialisation de sûreté ne doit pas masquer le résultat principal */ }
  await closeDbPool();
  if (completed) process.exit(0);
}
