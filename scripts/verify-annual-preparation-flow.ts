import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { enrollments } from "../drizzle/schema";
import { and, eq } from "drizzle-orm";

const caller = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
let completed = false;

try {
  const years = await caller.school.years.list();
  const source = years.find((year) => year.code === "2026-2027");
  if (!source) throw new Error("Année source introuvable.");
  let target = years.find((year) => year.code === "2028-2029");
  if (!target) {
    await caller.school.years.create({ code: "2028-2029", label: "Année 2028-2029 test", startsAt: new Date("2028-08-01T00:00:00.000Z"), endsAt: new Date("2029-07-31T23:59:59.000Z") });
    target = (await caller.school.years.list()).find((year) => year.code === "2028-2029");
  }
  if (!target) throw new Error("Année cible introuvable.");
  const db = await getDb();
  if (!db) throw new Error("Base indisponible.");
  const sourceEnrollmentsBefore = await db.select({ id: enrollments.id, studentId: enrollments.studentId, classId: enrollments.classId }).from(enrollments).where(eq(enrollments.academicYearId, source.id));
  const targetEnrollmentsBefore = await db.select({ id: enrollments.id, studentId: enrollments.studentId }).from(enrollments).where(eq(enrollments.academicYearId, target.id));
  const before = await caller.school.classes.list({ academicYearId: target.id, includeDraft: true });
  const result = before.length ? { copiedClasses: 0, configuredCourses: 0, suggestedAssignments: 0 } : await caller.school.years.prepare({ sourceAcademicYearId: source.id, targetAcademicYearId: target.id, copyCourses: true, copyWeights: true, copySuggestions: true });
  let repeatedPreparationBlocked = false;
  if (before.length) {
    try { await caller.school.years.prepare({ sourceAcademicYearId: source.id, targetAcademicYearId: target.id, copyCourses: true, copyWeights: true, copySuggestions: true }); } catch (error) { repeatedPreparationBlocked = ["CONFLICT", "BAD_REQUEST"].includes((error as { code?: string }).code ?? ""); }
  }
  const prepared = await caller.school.classes.list({ academicYearId: target.id, includeDraft: true });
  const expectedStructure = ["7e A — Test", "7e B — Test", "8e A — Test", "8e B — Test", "1re Littéraire — Test", "1re Scientifique — Test", "2e Littéraire — Test", "2e Scientifique — Test", "3e Littéraire — Test", "3e Scientifique — Test", "4e Littéraire — Test", "4e Scientifique — Test"];
  if (expectedStructure.some((name) => !prepared.some((schoolClass) => schoolClass.name === name)) || (result.copiedClasses > 0 && result.copiedClasses !== expectedStructure.length)) throw new Error("La structure annuelle préparée ne respecte pas les 12 classes institutionnelles attendues.");
  const sourceEnrollmentsAfter = await db.select({ id: enrollments.id, studentId: enrollments.studentId, classId: enrollments.classId }).from(enrollments).where(eq(enrollments.academicYearId, source.id));
  const targetEnrollmentsAfter = await db.select({ id: enrollments.id, studentId: enrollments.studentId }).from(enrollments).where(eq(enrollments.academicYearId, target.id));
  if (JSON.stringify(sourceEnrollmentsAfter) !== JSON.stringify(sourceEnrollmentsBefore) || targetEnrollmentsAfter.length !== targetEnrollmentsBefore.length) throw new Error("La copie annuelle a modifié des inscriptions, ce qui est interdit.");
  if (before.length && !repeatedPreparationBlocked) throw new Error("La préparation annuelle répétée doit être refusée.");
  const targetClass = prepared.find((schoolClass) => schoolClass.name === "7e A — Test");
  const sourceForExplicitEnrollment = sourceEnrollmentsBefore.find((row) => !targetEnrollmentsBefore.some((targetEnrollment) => targetEnrollment.studentId === row.studentId));
  if (!targetClass || !sourceForExplicitEnrollment) throw new Error("Dossier ou classe secondaire préparée indisponible pour le contrôle de doublon.");
  let temporaryEnrollmentCreated = false;
  let duplicateEnrollmentBlocked = false;
  try {
    await caller.school.enrollments.createForStudent({ studentId: sourceForExplicitEnrollment.studentId, academicYearId: target.id, classId: targetClass.id, enrollmentType: "re_enrollment" });
    temporaryEnrollmentCreated = true;
    try { await caller.school.enrollments.createForStudent({ studentId: sourceForExplicitEnrollment.studentId, academicYearId: target.id, classId: targetClass.id, enrollmentType: "re_enrollment" }); } catch (error) { duplicateEnrollmentBlocked = (error as { code?: string }).code === "CONFLICT"; }
    if (!duplicateEnrollmentBlocked) throw new Error("Une inscription annuelle dupliquée dans la structure secondaire doit être refusée.");
  } finally {
    if (temporaryEnrollmentCreated) await db.delete(enrollments).where(and(eq(enrollments.studentId, sourceForExplicitEnrollment.studentId), eq(enrollments.academicYearId, target.id)));
  }
  const targetEnrollmentsAfterCleanup = await db.select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.academicYearId, target.id));
  if (targetEnrollmentsAfterCleanup.length !== targetEnrollmentsAfter.length) throw new Error("Le contrôle anti-doublon doit nettoyer son inscription temporaire.");
  console.log(JSON.stringify({ verified: true, sourceYearId: source.id, targetYearId: target.id, classesBefore: before.length, classesAfter: prepared.length, repeatedPreparationBlocked, duplicateEnrollmentBlocked, temporaryEnrollmentCleaned: true, ...result, sourceEnrollments: sourceEnrollmentsAfter.length, targetEnrollments: targetEnrollmentsAfterCleanup.length }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
