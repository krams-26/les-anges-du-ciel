import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL est requis pour étendre la base de test.");

const connection = await mysql.createConnection(databaseUrl);
const classDefinitions = [
  { name: "7e A — Test", level: "7e", section: "Secondaire" },
  { name: "7e B — Test", level: "7e", section: "Secondaire" },
  { name: "8e A — Test", level: "8e", section: "Secondaire" },
  { name: "8e B — Test", level: "8e", section: "Secondaire" },
  { name: "1re Scientifique — Test", level: "1re", section: "Scientifique" },
  { name: "1re Littéraire — Test", level: "1re", section: "Littéraire" },
  { name: "2e Scientifique — Test", level: "2e", section: "Scientifique" },
  { name: "2e Littéraire — Test", level: "2e", section: "Littéraire" },
  { name: "3e Scientifique — Test", level: "3e", section: "Scientifique" },
  { name: "3e Littéraire — Test", level: "3e", section: "Littéraire" },
  { name: "4e Scientifique — Test", level: "4e", section: "Scientifique" },
  { name: "4e Littéraire — Test", level: "4e", section: "Littéraire" },
];

const courses = [
  ["MATH-TEST", "Mathématiques — Test", 10],
  ["FRA-TEST", "Français — Test", 10],
  ["ANG-TEST", "Anglais — Test", 10],
  ["PHY-TEST", "Physique — Test", 8],
  ["CHI-TEST", "Chimie — Test", 8],
  ["BIO-TEST", "Biologie — Test", 8],
  ["HIST-TEST", "Histoire — Test", 6],
  ["GEO-TEST", "Géographie — Test", 6],
  ["INF-TEST", "Informatique — Test", 6],
  ["LIT-TEST", "Littérature — Test", 6],
];

const studentNames = [
  ["Kabeya", "Aline", "F"], ["Mbuyi", "Christian", "M"], ["Lukusa", "Esther", "F"], ["Kanku", "Daniel", "M"], ["Mulumba", "Ruth", "F"],
  ["Banza", "Jonathan", "M"], ["Kalume", "Nadia", "F"], ["Ilunga", "Samuel", "M"], ["Tshibanda", "Loïse", "F"], ["Kasongo", "Patrick", "M"],
];

try {
  await connection.beginTransaction();
  const [years] = await connection.execute("SELECT id FROM academic_years WHERE code = ? LIMIT 1", ["2026-2027"]);
  const year = years[0];
  if (!year) throw new Error("L’année de test 2026-2027 est introuvable. Lancez d’abord scripts/seed-test-data.mjs.");
  const academicYearId = year.id;

  const courseIds = new Map();
  for (const [code, name, weight] of courses) {
    await connection.execute(
      "INSERT INTO courses (code, name, section, levels, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)",
      [code, name, "Secondaire", "7e–4e", "active"]
    );
    const [rows] = await connection.execute("SELECT id FROM courses WHERE code = ? LIMIT 1", [code]);
    courseIds.set(code, { id: rows[0].id, weight });
  }

  const summary = [];
  for (let index = 0; index < classDefinitions.length; index += 1) {
    const definition = classDefinitions[index];
    await connection.execute(
      "INSERT INTO classes (academicYearId, section, level, name, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE section = VALUES(section), level = VALUES(level), status = VALUES(status)",
      [academicYearId, definition.section, definition.level, definition.name, "active"]
    );
    const [classRows] = await connection.execute("SELECT id FROM classes WHERE academicYearId = ? AND name = ? LIMIT 1", [academicYearId, definition.name]);
    const classId = classRows[0].id;

    for (const [code] of courses) {
      const course = courseIds.get(code);
      await connection.execute(
        "INSERT INTO class_courses (classId, courseId, periodWeight, status) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE periodWeight = VALUES(periodWeight), status = VALUES(status)",
        [classId, course.id, course.weight, "configured"]
      );
    }

    const [[countRow]] = await connection.execute("SELECT COUNT(*) AS total FROM enrollments WHERE academicYearId = ? AND classId = ?", [academicYearId, classId]);
    const missing = Math.max(0, 10 - Number(countRow.total));
    for (let studentIndex = 0; studentIndex < missing; studentIndex += 1) {
      const [lastName, firstName, sex] = studentNames[studentIndex];
      const studentCode = `TEST-${String(index + 1).padStart(2, "0")}-${String(studentIndex + 1).padStart(3, "0")}`;
      await connection.execute(
        "INSERT INTO students (studentCode, lastName, firstName, sex, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status = VALUES(status)",
        [studentCode, lastName, firstName, sex, "active"]
      );
      const [studentRows] = await connection.execute("SELECT id FROM students WHERE studentCode = ? LIMIT 1", [studentCode]);
      const studentId = studentRows[0].id;
      await connection.execute(
        "INSERT INTO enrollments (studentId, academicYearId, classId, enrollmentType, status) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE classId = VALUES(classId), status = VALUES(status)",
        [studentId, academicYearId, classId, "new", "active"]
      );
      await connection.execute(
        "INSERT INTO guardians (studentId, fullName, relationship, phone, isPrimary, receivesCommunications, canViewResults, canMakePayments) SELECT ?, ?, ?, ?, ?, ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM guardians WHERE studentId = ?)",
        [studentId, `Responsable test ${firstName}`, "guardian", "+243800000000", true, true, true, false, studentId]
      );
    }
    summary.push({ className: definition.name, classId, enrolledStudents: Number(countRow.total) + missing, configuredCourses: courses.length });
  }

  await connection.commit();
  console.log(JSON.stringify({ extended: true, classes: summary, totalClasses: summary.length, coursesPerClass: courses.length }, null, 2));
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  await connection.end();
}
