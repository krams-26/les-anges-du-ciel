import mysql from "mysql2/promise";
import { appRouter } from "../server/routers";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL est requis.");

const connection = await mysql.createConnection(databaseUrl);

try {
  const [[teacher]] = await connection.query("SELECT userId FROM teachers WHERE employeeCode = 'EMP-TEST-001' LIMIT 1");
  const [[assignment]] = await connection.query("SELECT id FROM teaching_assignments WHERE id = 1 AND status = 'active' LIMIT 1");
  const [[period]] = await connection.query("SELECT id FROM academic_periods WHERE code = 'P1' LIMIT 1");
  const [enrollments] = await connection.query("SELECT id FROM enrollments WHERE classId = 1 AND status = 'active' ORDER BY id");

  if (!teacher?.userId || !assignment?.id || !period?.id || enrollments.length < 10) throw new Error("Le contexte de test enseignant est incomplet.");

  const caller = appRouter.createCaller({
    user: { id: Number(teacher.userId), openId: "test-teacher", name: "Enseignant de test", email: null, loginMethod: "test", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    req: {} as never,
    res: {} as never,
  });

  const records = enrollments.map((enrollment: { id: number }, index: number) => ({ enrollmentId: Number(enrollment.id), status: index === 2 ? "late" as const : "present" as const }));
  const scores = enrollments.map((enrollment: { id: number }, index: number) => ({ enrollmentId: Number(enrollment.id), score: 6 + (index % 5), maximum: 10 }));

  const attendance = await caller.teaching.attendance.save({ assignmentId: Number(assignment.id), sessionDate: new Date("2026-08-24T00:00:00.000Z"), records });
  const draft = await caller.teaching.grades.saveDraft({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const submitted = await caller.teaching.grades.submit({ assignmentId: Number(assignment.id), periodId: Number(period.id), scores });
  const report = await caller.teaching.reports.save({ assignmentId: Number(assignment.id), periodId: Number(period.id), courseDelivery: "Séance de test validée.", plannedProgram: "Calcul numérique.", completedProgram: "Calcul numérique.", progressPercentage: 100, classParticipation: "B", generalNotes: "Rapport généré pour la vérification du parcours enseignant.", submit: true });

  console.log(JSON.stringify({ verified: true, attendance, draft, submitted, report, enrollmentCount: enrollments.length }, null, 2));
} finally {
  await connection.end();
}
