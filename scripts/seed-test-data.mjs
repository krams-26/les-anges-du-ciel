import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL est requis pour initialiser la base de test.");
}

const connection = await mysql.createConnection(databaseUrl);

try {
  const [[counts]] = await connection.query(`
    SELECT
      (SELECT COUNT(*) FROM academic_years) AS years,
      (SELECT COUNT(*) FROM classes) AS classes,
      (SELECT COUNT(*) FROM courses) AS courses,
      (SELECT COUNT(*) FROM teachers) AS teachers,
      (SELECT COUNT(*) FROM students) AS students,
      (SELECT COUNT(*) FROM teaching_assignments) AS assignments
  `);

  const existingSchoolData = Object.values(counts).some((count) => Number(count) > 0);
  if (existingSchoolData) {
    throw new Error("Initialisation annulée : la base contient déjà des données scolaires. Aucune écriture n’a été effectuée.");
  }

  const [accounts] = await connection.query(
    "SELECT id, name, email FROM users WHERE role = 'user' ORDER BY lastSignedIn DESC LIMIT 1"
  );
  const account = accounts[0];
  if (!account) {
    throw new Error("Initialisation annulée : aucun compte enseignant connecté n’a été trouvé. Connectez-vous d’abord une fois avec le compte enseignant.");
  }

  await connection.beginTransaction();

  const [yearResult] = await connection.execute(
    "INSERT INTO academic_years (code, label, status, startsAt, endsAt) VALUES (?, ?, ?, ?, ?)",
    ["2026-2027", "Année scolaire 2026-2027 — test", "active", "2026-08-01 00:00:00", "2027-07-31 23:59:59"]
  );
  const academicYearId = yearResult.insertId;

  const [classResult] = await connection.execute(
    "INSERT INTO classes (academicYearId, section, level, name, status) VALUES (?, ?, ?, ?, ?)",
    [academicYearId, "Secondaire", "7e", "7e A — Test", "active"]
  );
  const classId = classResult.insertId;

  const [courseResult] = await connection.execute(
    "INSERT INTO courses (code, name, section, levels, status) VALUES (?, ?, ?, ?, ?)",
    ["MATH-TEST", "Mathématiques — Test", "Secondaire", "7e", "active"]
  );
  const courseId = courseResult.insertId;

  const [classCourseResult] = await connection.execute(
    "INSERT INTO class_courses (classId, courseId, periodWeight, status) VALUES (?, ?, ?, ?)",
    [classId, courseId, 10, "configured"]
  );
  const classCourseId = classCourseResult.insertId;

  const [teacherResult] = await connection.execute(
    "INSERT INTO teachers (userId, employeeCode, fullName, email, specialties, status) VALUES (?, ?, ?, ?, ?, ?)",
    [account.id, "EMP-TEST-001", account.name || "Enseignant de test", account.email || null, "Mathématiques", "active"]
  );
  const teacherId = teacherResult.insertId;

  const [assignmentResult] = await connection.execute(
    "INSERT INTO teaching_assignments (teacherId, classCourseId, status) VALUES (?, ?, ?)",
    [teacherId, classCourseId, "active"]
  );
  const assignmentId = assignmentResult.insertId;

  const [periodResult] = await connection.execute(
    "INSERT INTO academic_periods (academicYearId, code, label, kind, sequence, startsAt, endsAt, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
    [academicYearId, "P1", "Période 1 — Test", "period", 1, "2026-08-01 00:00:00", "2026-10-31 23:59:59", "active"]
  );
  const academicPeriodId = periodResult.insertId;

  const testStudents = [
    ["TEST-2026-001", "Kambale", "Noël", "M"],
    ["TEST-2026-002", "Ilunga", "Sifa", "F"],
    ["TEST-2026-003", "Mbuyi", "Patrick", "M"],
    ["TEST-2026-004", "Tshala", "Grâce", "F"],
  ];
  const enrollmentIds = [];
  for (const [studentCode, lastName, firstName, sex] of testStudents) {
    const [studentResult] = await connection.execute(
      "INSERT INTO students (studentCode, lastName, firstName, sex, status) VALUES (?, ?, ?, ?, ?)",
      [studentCode, lastName, firstName, sex, "active"]
    );
    const studentId = studentResult.insertId;
    const [enrollmentResult] = await connection.execute(
      "INSERT INTO enrollments (studentId, academicYearId, classId, enrollmentType, status) VALUES (?, ?, ?, ?, ?)",
      [studentId, academicYearId, classId, "new", "active"]
    );
    enrollmentIds.push(enrollmentResult.insertId);
    await connection.execute(
      "INSERT INTO guardians (studentId, fullName, relationship, phone, isPrimary, receivesCommunications, canViewResults, canMakePayments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [studentId, `Responsable test de ${firstName}`, "guardian", "+243800000000", true, true, true, false]
    );
  }

  await connection.commit();
  console.log(JSON.stringify({ seeded: true, academicYearId, classId, courseId, classCourseId, teacherId, assignmentId, academicPeriodId, enrollmentIds, teacherAccountId: account.id }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
