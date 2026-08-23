import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

try {
  const [rows] = await connection.query("SHOW TABLES");
  const tables = rows.map((row) => Object.values(row)[0]);
  const expected = [
    "audit_events",
    "enrollment_financial_accounts",
    "guardian_communication_preferences",
    "guardian_user_links",
    "student_payments",
    "user_notifications",
  ];
  const [roleColumns] = await connection.query("SHOW COLUMNS FROM users LIKE 'role'");
  console.log(JSON.stringify({ tables: expected.map((table) => ({ table, exists: tables.includes(table) })), roleColumn: roleColumns[0] ?? null }, null, 2));
} finally {
  await connection.end();
}
