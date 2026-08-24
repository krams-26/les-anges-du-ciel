import { and, eq } from "drizzle-orm";
import { academicYears, auditEvents, classes, enrollments, students } from "../drizzle/schema";
import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";

let completed = false;

try {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  const existingYears = await db.select({ code: academicYears.code }).from(academicYears);
  const existingCodes = new Set(existingYears.map((year) => year.code));
  const startYear = Array.from({ length: 16 }, (_, index) => 2010 + index).find((year) => !existingCodes.has(`${year}-${year + 1}`) && !existingCodes.has(`${year + 1}-${year + 2}`));
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
  const exitStudentCode = `EXIT-${startYear}`;
  await db.insert(students).values({ studentCode: exitStudentCode, lastName: "Sortie", firstName: "Test", sex: "M" });
  const [exitStudent] = await db.select({ id: students.id }).from(students).where(eq(students.studentCode, exitStudentCode)).limit(1);
  if (!exitStudent) throw new Error("Élève de sortie de test introuvable.");
  await db.insert(enrollments).values({ studentId: exitStudent.id, academicYearId, classId: testClass.id, enrollmentType: "new", status: "active" });
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
  const targetStartYear = startYear + 1;
  const targetCode = `${targetStartYear}-${targetStartYear + 1}`;
  if ((await db.select({ code: academicYears.code }).from(academicYears)).some((item) => item.code === targetCode)) throw new Error("L’année cible de promotion existe déjà ; relancez avec une plage de test disponible.");
  const targetYear = await caller.school.years.create({ code: targetCode, label: `Année cible ${targetCode}`, startsAt: new Date(`${targetStartYear}-09-01T00:00:00.000Z`), endsAt: new Date(`${targetStartYear + 1}-07-31T00:00:00.000Z`) });
  if (!targetYear.id) throw new Error("Année cible de promotion introuvable.");
  const prepared = await caller.school.years.prepare({ sourceAcademicYearId: academicYearId, targetAcademicYearId: Number(targetYear.id), copyCourses: true, copyWeights: true, copySuggestions: true });
  if (prepared.copiedClasses !== 1) throw new Error("La structure annuelle cible n’a pas été préparée depuis l’année archivée.");
  const [targetClass] = await db.select({ id: classes.id }).from(classes).where(and(eq(classes.academicYearId, Number(targetYear.id)), eq(classes.name, className))).limit(1);
  const [sourceEnrollment] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, student.id), eq(enrollments.academicYearId, academicYearId))).limit(1);
  const [exitEnrollment] = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.studentId, exitStudent.id), eq(enrollments.academicYearId, academicYearId))).limit(1);
  if (!targetClass || !sourceEnrollment || !exitEnrollment) throw new Error("Contexte de promotion ou de sortie introuvable.");
  const transition = await caller.school.enrollments.transition({ sourceEnrollmentId: sourceEnrollment.id, transition: "promote", targetAcademicYearId: Number(targetYear.id), targetClassId: targetClass.id, reason: "Promotion annuelle de test, avec conservation du dossier permanent." });
  let duplicateBlocked = false;
  try { await caller.school.enrollments.transition({ sourceEnrollmentId: sourceEnrollment.id, transition: "promote", targetAcademicYearId: Number(targetYear.id), targetClassId: targetClass.id, reason: "Tentative répétée de promotion." }); } catch (error) { duplicateBlocked = (error as { code?: string }).code === "BAD_REQUEST" || (error as { code?: string }).code === "CONFLICT"; }
  const history = await caller.school.enrollments.history({ studentId: student.id });
  if (!duplicateBlocked || history.length !== 2 || history.some((entry) => entry.enrollmentId === transition.targetEnrollmentId && entry.status !== "active")) throw new Error("La promotion explicite ou la protection contre doublon n’a pas été appliquée.");
  await caller.school.enrollments.transition({ sourceEnrollmentId: exitEnrollment.id, transition: "withdraw", reason: "Départ volontaire de test sans réinscription automatique." });
  const exitHistory = await caller.school.enrollments.history({ studentId: exitStudent.id });
  const exitAudits = await db.select({ action: auditEvents.action }).from(auditEvents).where(eq(auditEvents.resourceId, exitEnrollment.id));
  if (exitHistory.length !== 1 || exitHistory[0].status !== "withdrawn" || !exitAudits.some((audit) => audit.action === "annual_enrollment_exit_recorded")) throw new Error("La sortie annuelle n’a pas préservé son historique et son audit.");
  console.log(JSON.stringify({ verified: true, academicYearId, status: year.status, blockedBeforeIndividualValidation, frozen, auditsVerified: true, promotionEnrollmentId: transition.targetEnrollmentId, duplicateBlocked, historyCount: history.length, exitStatus: exitHistory[0].status, exitAuditVerified: true }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
