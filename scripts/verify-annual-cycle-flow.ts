import { eq } from "drizzle-orm";
import { academicYears, auditEvents, classes, enrollments, students } from "../drizzle/schema";
import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";

let completed = false;

try {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  const existingYears = await db.select({ code: academicYears.code }).from(academicYears);
  const existingCodes = new Set(existingYears.map((year) => year.code));
  const startYear = Array.from({ length: 8 }, (_, index) => 2030 + index).find((year) => !existingCodes.has(`${year}-${year + 1}`));
  if (!startYear) throw new Error("Aucune année de test disponible dans la plage compatible MySQL.");
  const code = `${startYear}-${startYear + 1}`;
  const caller = appRouter.createCaller({ user: { id: 1, openId: "annual-cycle-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
  const created = await caller.school.years.create({ code, label: `Année de cycle ${code}`, startsAt: new Date(`${startYear}-09-01T00:00:00.000Z`), endsAt: new Date(`${startYear + 1}-07-31T00:00:00.000Z`) });
  if (!created.id) throw new Error("L’année de test n’a pas été créée.");
  const academicYearId = Number(created.id);
  await caller.annualCycle.activate({ academicYearId });
  await caller.annualCycle.configure({ academicYearId, secondSessionRequired: false, deliberationEnabled: false, allowIndividualDeliberation: true });
  const className = `Cycle test ${code}`;
  const studentCode = `CYCLE-${startYear}`;
  await db.insert(classes).values({ academicYearId, section: "Test", level: "Cycle", name: className, status: "active" });
  const [testClass] = await db.select({ id: classes.id }).from(classes).where(eq(classes.name, className)).limit(1);
  if (!testClass) throw new Error("Classe de test du cycle introuvable.");
  await db.insert(students).values({ studentCode, lastName: "Cycle", firstName: "Test", sex: "F" });
  const [student] = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, studentCode)).limit(1);
  if (!student) throw new Error("Élève de test du cycle introuvable.");
  await db.insert(enrollments).values({ studentId: student.id, academicYearId, classId: testClass.id, enrollmentType: "new", status: "active" });
  const session = await caller.secondSession.deliberation.createSession({ academicYearId, label: `Délibération individuelle ${code}` });
  await caller.secondSession.deliberation.initialize({ sessionId: session.id });
  await caller.annualCycle.closeNotes({ academicYearId });
  const [decision] = await caller.secondSession.deliberation.decisions({ sessionId: session.id });
  if (!decision) throw new Error("Décision individuelle de test introuvable.");
  await caller.annualCycle.setIndividualDeliberation({ decisionId: decision.id, required: true, reason: "Délibération individuelle obligatoire pour le test du cycle." });
  let blockedBeforeIndividualValidation = false;
  try { await caller.annualCycle.proclaim({ academicYearId }); } catch (error) { blockedBeforeIndividualValidation = (error as { code?: string }).code === "BAD_REQUEST"; }
  if (!blockedBeforeIndividualValidation) throw new Error("La proclamation devait être refusée avant validation individuelle.");
  await caller.secondSession.deliberation.propose({ sessionId: session.id, enrollmentId: decision.enrollmentId, decision: "admitted", basis: "manual", finalAverage: decision.finalAverage, rationale: "Décision individuelle de test." });
  const [proposed] = await caller.secondSession.deliberation.decisions({ sessionId: session.id });
  if (!proposed) throw new Error("Décision proposée de test introuvable.");
  await caller.secondSession.deliberation.validate({ decisionId: proposed.id, reason: "Validation individuelle de test." });
  await caller.annualCycle.proclaim({ academicYearId });
  await caller.annualCycle.archive({ academicYearId });
  let frozen = false;
  try { await caller.annualCycle.configure({ academicYearId, secondSessionRequired: true, deliberationEnabled: false, allowIndividualDeliberation: false }); } catch (error) { frozen = (error as { code?: string }).code === "BAD_REQUEST"; }
  if (!frozen) throw new Error("Une année archivée ne doit plus être modifiable.");
  const [year] = await db.select({ status: academicYears.status }).from(academicYears).where(eq(academicYears.id, academicYearId)).limit(1);
  const audits = await db.select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.resourceId, academicYearId));
  for (const action of ["academic_year_activated", "annual_notes_closed", "annual_results_proclaimed", "academic_year_archived"]) if (!audits.some((audit) => audit.action === action)) throw new Error(`Audit annuel absent : ${action}`);
  if (year?.status !== "archived") throw new Error("Le cycle annuel n’a pas atteint l’archivage.");
  console.log(JSON.stringify({ verified: true, academicYearId, status: year.status, blockedBeforeIndividualValidation, frozen, auditsVerified: true }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
