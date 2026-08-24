import { and, eq } from "drizzle-orm";
import { appRouter } from "../server/routers";
import { closeDbPool, getDb } from "../server/db";
import { academicPeriods, enrollments, teachers, teachingAssignments } from "../drizzle/schema";

let completed = false;

try {
  const db = await getDb();
  if (!db) throw new Error("Base de données indisponible.");
  const [teacher] = await db.select({ userId: teachers.userId }).from(teachers).where(eq(teachers.employeeCode, "EMP-TEST-001")).limit(1);
  const [assignment] = await db.select({ id: teachingAssignments.id }).from(teachingAssignments).where(and(eq(teachingAssignments.id, 1), eq(teachingAssignments.status, "active"))).limit(1);
  const [period] = await db.select({ id: academicPeriods.id }).from(academicPeriods).where(eq(academicPeriods.code, "P1")).limit(1);
  const rosterRows = await db.select({ id: enrollments.id }).from(enrollments).where(and(eq(enrollments.classId, 1), eq(enrollments.status, "active"))).orderBy(enrollments.id);

  if (!teacher?.userId || !assignment?.id || !period?.id || rosterRows.length < 10) throw new Error("Le contexte de test enseignant est incomplet.");

  const caller = appRouter.createCaller({
    user: { id: Number(teacher.userId), openId: "test-teacher", name: "Enseignant de test", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });

  const records = rosterRows.map((enrollment, index) => ({ enrollmentId: enrollment.id, status: index === 2 ? "late" as const : "present" as const }));
  const scores = rosterRows.map((enrollment, index) => ({ enrollmentId: enrollment.id, score: 6 + (index % 5), maximum: 10 }));

  const attendance = await caller.teaching.attendance.save({ assignmentId: Number(assignment.id), sessionDate: new Date("2026-08-24T00:00:00.000Z"), records });
  const draft = await caller.teaching.grades.saveDraft({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const submitted = await caller.teaching.grades.submit({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const report = await caller.teaching.reports.save({ assignmentId: Number(assignment.id), periodId: Number(period.id), courseDelivery: "Séance de test validée.", plannedProgram: "Calcul numérique.", completedProgram: "Calcul numérique.", progressPercentage: 100, classParticipation: "B", generalNotes: "Rapport généré pour la vérification du parcours enseignant.", submit: true });

  console.log(JSON.stringify({ verified: true, attendance, draft, submitted, report, enrollmentCount: rosterRows.length }, null, 2));
  completed = true;
} finally {
  await closeDbPool();
  if (completed) process.exit(0);
}
