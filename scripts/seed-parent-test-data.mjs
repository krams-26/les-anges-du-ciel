import mysql from "mysql2/promise";

const connection = await mysql.createConnection({ uri: process.env.DATABASE_URL, connectTimeout: 15_000 });

try {
  const [[enrollment]] = await connection.query("SELECT e.id AS enrollmentId, s.id AS studentId FROM enrollments e INNER JOIN students s ON s.id = e.studentId WHERE e.classId = 1 AND e.status = 'active' ORDER BY e.id LIMIT 1");
  if (!enrollment) throw new Error("L’inscription de test est introuvable.");
  await connection.query("INSERT INTO guardians (studentId, fullName, relationship, phone, isPrimary, receivesCommunications, canViewResults, canMakePayments) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM guardians WHERE studentId = ? AND fullName = ?)", [enrollment.studentId, "Parent portail de test", "guardian", "+243800000001", true, true, true, true, enrollment.studentId, "Parent portail de test"]);
  const [[guardian]] = await connection.query("SELECT id FROM guardians WHERE studentId = ? AND fullName = ? LIMIT 1", [enrollment.studentId, "Parent portail de test"]);
  await connection.query("INSERT INTO users (openId, name, email, loginMethod, role, lastSignedIn) VALUES (?, ?, ?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE role = VALUES(role), name = VALUES(name)", ["test-parent-open-id", "Parent portail de test", "parent.test@anges.test", "test", "parent"]);
  const [[parent]] = await connection.query("SELECT id FROM users WHERE openId = ? LIMIT 1", ["test-parent-open-id"]);
  await connection.query("INSERT INTO guardian_user_links (guardianId, userId, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), revokedAt = NULL", [guardian.id, parent.id, "active"]);
  await connection.query("INSERT INTO guardian_communication_preferences (guardianId) VALUES (?) ON DUPLICATE KEY UPDATE updatedAt = NOW()", [guardian.id]);
  await connection.query("INSERT INTO enrollment_financial_accounts (enrollmentId, expectedAmount, paidAmount, currency) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE expectedAmount = VALUES(expectedAmount), paidAmount = VALUES(paidAmount), currency = VALUES(currency)", [enrollment.enrollmentId, 850000, 750000, "CDF"]);
  await connection.query("INSERT INTO student_payments (enrollmentId, amount, currency, reference, status, paidAt, recordedByUserId) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status), paidAt = VALUES(paidAt)", [enrollment.enrollmentId, 750000, "CDF", "TEST-PARENT-2026-001", "verified", "2026-08-24 00:00:00", 1]);
  await connection.query("UPDATE grades SET status = 'validated' WHERE enrollmentId = ? AND academicPeriodId = 1", [enrollment.enrollmentId]);
  await connection.query("INSERT INTO user_notifications (userId, category, title, description, resourceType, resourceId) SELECT ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM user_notifications WHERE userId = ? AND title = ?)", [parent.id, "results", "Résultats P1 disponibles", "Le relevé de côtes de P1 est disponible pour votre enfant de test.", "enrollment", enrollment.enrollmentId, parent.id, "Résultats P1 disponibles"]);
  console.log(JSON.stringify({ seeded: true, parentUserId: parent.id, guardianId: guardian.id, enrollmentId: enrollment.enrollmentId }, null, 2));
} finally {
  await connection.end();
}
