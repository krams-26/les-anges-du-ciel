import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { academicPeriods } from "../drizzle/schema";
import { eq } from "drizzle-orm";

const caller = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
const stamp = Date.now();
let completed = false;

try {
  const years = await caller.school.years.list();
  const year = years[0];
  if (!year) throw new Error("Aucune année scolaire disponible.");
  await caller.school.years.ensurePeriods({ academicYearId: year.id });
  const periods = await (await getDb())?.select({ code: academicPeriods.code }).from(academicPeriods).where(eq(academicPeriods.academicYearId, year.id));
  const requiredPeriods = ["P1", "P2", "EX1", "P3", "P4", "EX2"];
  if (!requiredPeriods.every((code) => periods?.some((period) => period.code === code))) throw new Error("Calendrier académique annuel incomplet.");
  const annualSummary = await caller.annualControl.summary({ academicYearId: year.id });
  if (annualSummary.year.id !== year.id || annualSummary.enrollmentCount < 0) throw new Error("Synthèse annuelle incohérente.");

  const className = `Audit ${String(stamp).slice(-6)}`;
  await caller.school.classes.create({ academicYearId: year.id, section: "Secondaire", level: "Audit", name: className });
  const createdClass = (await caller.school.classes.list({ academicYearId: year.id })).find((item) => item.name === className);
  if (!createdClass) throw new Error("Classe d’audit introuvable.");

  const courseCode = `AUD${String(stamp).slice(-5)}`;
  await caller.school.courses.create({ code: courseCode, name: `Contrôle ${stamp}`, section: "Secondaire", levels: "Audit" });
  const createdCourse = (await caller.school.courses.list()).find((item) => item.code === courseCode);
  if (!createdCourse) throw new Error("Cours d’audit introuvable.");
  await caller.school.courses.configure({ classId: createdClass.id, courseId: createdCourse.id, periodWeight: 10 });
  const configuredCourse = (await caller.school.courses.configured({ classId: createdClass.id })).find((item) => item.courseId === createdCourse.id);
  if (!configuredCourse) throw new Error("Configuration de cours introuvable.");

  const employeeCode = `AUD${String(stamp).slice(-6)}`;
  await caller.school.teachers.create({ employeeCode, fullName: `Enseignant Audit ${stamp}`, specialties: "Contrôle" });
  const teacher = (await caller.school.teachers.list()).find((item) => item.employeeCode === employeeCode);
  if (!teacher) throw new Error("Enseignant d’audit introuvable.");
  await caller.school.assignments.create({ teacherId: teacher.id, classCourseId: configuredCourse.id });
  const assignment = (await caller.school.assignments.list()).find((item) => item.teacherId === teacher.id && item.classCourseId === configuredCourse.id);
  if (!assignment) throw new Error("Affectation d’audit introuvable.");

  await caller.governance.permissions.saveOverride({ userId: 600005, resource: "students", action: "view", allowed: true, reason: "Vérification e2e administrateur réversible." });
  const permissionState = await caller.governance.permissions.user({ userId: 600005 });
  if (!permissionState.overrides.some((item) => item.resource === "students" && item.action === "view" && item.allowed)) throw new Error("Dérogation de gouvernance introuvable.");
  await caller.governance.permissions.resetOverride({ userId: 600005, resource: "students", action: "view" });

  console.log(JSON.stringify({ verified: true, academicYearId: year.id, academicPeriods: requiredPeriods, enrollmentCount: annualSummary.enrollmentCount, classId: createdClass.id, courseId: createdCourse.id, teacherId: teacher.id, assignmentId: assignment.id, governanceOverrideReset: true }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
