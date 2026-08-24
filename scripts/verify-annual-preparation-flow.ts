import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { enrollments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
  const sourceEnrollmentsBefore = await db.select({ id: enrollments.id, classId: enrollments.classId }).from(enrollments).where(eq(enrollments.academicYearId, source.id));
  const targetEnrollmentsBefore = await db.select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.academicYearId, target.id));
  const before = await caller.school.classes.list({ academicYearId: target.id });
  const result = before.length ? { copiedClasses: 0, configuredCourses: 0, suggestedAssignments: 0 } : await caller.school.years.prepare({ sourceAcademicYearId: source.id, targetAcademicYearId: target.id, copyCourses: true, copyWeights: true, copySuggestions: true });
  const prepared = await caller.school.classes.list({ academicYearId: target.id });
  if (!prepared.length) throw new Error("Aucune classe n’a été préparée.");
  const sourceEnrollmentsAfter = await db.select({ id: enrollments.id, classId: enrollments.classId }).from(enrollments).where(eq(enrollments.academicYearId, source.id));
  const targetEnrollmentsAfter = await db.select({ id: enrollments.id }).from(enrollments).where(eq(enrollments.academicYearId, target.id));
  if (JSON.stringify(sourceEnrollmentsAfter) !== JSON.stringify(sourceEnrollmentsBefore) || targetEnrollmentsAfter.length !== targetEnrollmentsBefore.length) throw new Error("La copie annuelle a modifié des inscriptions, ce qui est interdit.");
  console.log(JSON.stringify({ verified: true, sourceYearId: source.id, targetYearId: target.id, classesBefore: before.length, classesAfter: prepared.length, ...result, sourceEnrollments: sourceEnrollmentsAfter.length, targetEnrollments: targetEnrollmentsAfter.length }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
