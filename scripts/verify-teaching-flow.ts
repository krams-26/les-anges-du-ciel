import { and, eq } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { academicPeriods, auditEvents, enrollments, teachers, teachingAssignments } from "../drizzle/schema";
import { ne } from "drizzle-orm";

let completed = false;

try {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  const [teacher] = await db.select({ userId: teachers.userId }).from(teachers).where(eq(teachers.employeeCode, "EMP-TEST-001")).limit(1);
  const [assignment] = await db.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(eq(teachingAssignments.id, 1), eq(teachingAssignments.status, "active"))).limit(1);
  const [period] = await db.select({ id: academicPeriods.id }).from(academicPeriods).where(eq(academicPeriods.code, "P1")).limit(1);
  const rosterRows = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.classId, 1), eq(enrollments.status, "active"))).orderBy(enrollments.id);
  const [otherClassEnrollment] = await db.select({ id: enrollments.id }).from(enrollments).where(and(ne(enrollments.classId, 1), eq(enrollments.status, "active"))).limit(1);
  let otherYearPeriod: { id: number } | undefined;
  const [otherAssignment] = await db.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(ne(teachingAssignments.id, 1), eq(teachingAssignments.status, "active"))).limit(1);

  if (!teacher?.userId || !assignment?.id || !period?.id || !otherClassEnrollment?.id || !otherAssignment?.id || rosterRows.length < 10) throw new Error("Le contexte de test enseignant est incomplet.");

  const caller = appRouter.createCaller({
    user: { id: Number(teacher.userId), openId: "test-teacher", name: "Enseignant de test", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });
  const adminCaller = appRouter.createCaller({ user: { id: 1, openId: "test-admin", name: "Administrateur de test", email: null, loginMethod: "test", role: "admin", accountStatus: "active", accessRoleId: 1, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as never, res: {} as never });
  const otherYear = (await adminCaller.school.years.list()).find((year) => Number(year.id) !== 1);
  if (!otherYear) throw new Error("Une deuxième année scolaire est nécessaire pour le contrôle interannuel.");
  await adminCaller.school.years.ensurePeriods({ academicYearId: Number(otherYear.id) });
  [otherYearPeriod] = await db.select({ id: academicPeriods.id }).from(academicPeriods).where(eq(academicPeriods.academicYearId, Number(otherYear.id))).limit(1);
  if (!otherYearPeriod) throw new Error("Aucune période de l’autre année scolaire n’a pu être configurée.");
  const expectRefusal = async (label: string, operation: () => Promise<unknown>) => {
    try { await operation(); } catch (error) { if ((error as { code?: string }).code === "FORBIDDEN" || (error as { code?: string }).code === "BAD_REQUEST") return label; throw error; }
    throw new Error(`${label} : l’opération devait être refusée.`);
  };

  const records = rosterRows.map((enrollment, index) => ({ enrollmentId: enrollment.id, status: index === 2 ? "late" as const : "present" as const }));
  const scores = rosterRows.map((enrollment, index) => ({ enrollmentId: enrollment.id, score: 6 + (index % 5), maximum: 10 }));

  const attendance = await caller.teaching.attendance.save({ assignmentId: Number(assignment.id), sessionDate: new Date("2026-08-24T00:00:00.000Z"), records });
  const draft = await caller.teaching.grades.saveDraft({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const submitted = await caller.teaching.grades.submit({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const report = await caller.teaching.reports.save({ assignmentId: Number(assignment.id), periodId: Number(period.id), courseDelivery: "Séance de test validée.", plannedProgram: "Calcul numérique.", completedProgram: "Calcul numérique.", progressPercentage: 100, classParticipation: "B", generalNotes: "Rapport généré pour la vérification du parcours enseignant.", submit: true });
  const rejectedOtherClassGrade = await expectRefusal("élève d’une autre classe", () => caller.teaching.grades.saveDraft({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores: [{ enrollmentId: Number(otherClassEnrollment.id), score: 8, maximum: 10 }] }));
  const rejectedOtherClassAttendance = await expectRefusal("présence d’un élève d’une autre classe", () => caller.teaching.attendance.save({ assignmentId: Number(assignment.id), sessionDate: new Date("2026-08-25T00:00:00.000Z"), records: [{ enrollmentId: Number(otherClassEnrollment.id), status: "present" }] }));
  const rejectedOtherCourse = await expectRefusal("autre cours ou affectation", () => caller.teaching.roster({ assignmentId: Number(otherAssignment.id) }));
  const rejectedOtherYear = await expectRefusal("période d’une autre année", () => caller.teaching.reports.save({ assignmentId: Number(assignment.id), periodId: Number(otherYearPeriod.id), courseDelivery: "Tentative interannuelle", submit: false }));
  const adminRoster = await adminCaller.teaching.roster({ assignmentId: Number(assignment.id) });
  if (!adminRoster.length) throw new Error("L’administrateur autorisé devrait pouvoir consulter le roster de l’affectation.");
  const auditActions = await db.select({ action: auditEvents.action }).from(auditEvents).where(and(eq(auditEvents.module, "teaching"), eq(auditEvents.resourceId, Number(assignment.id))));
  for (const action of ["teacher_attendance_saved", "teacher_grades_drafted", "teacher_grades_submitted", "teacher_report_submitted"]) if (!auditActions.some((event) => event.action === action)) throw new Error(`Audit pédagogique manquant : ${action}.`);

  console.log(JSON.stringify({ verified: true, attendance, draft, submitted, report, enrollmentCount: rosterRows.length, rejections: [rejectedOtherClassGrade, rejectedOtherClassAttendance, rejectedOtherCourse, rejectedOtherYear], adminAuthorized: true, auditsVerified: true }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
