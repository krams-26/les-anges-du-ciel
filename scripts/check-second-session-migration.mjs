import mysql from "mysql2/promise";

const required = ["second_session_settings", "second_session_candidates", "second_session_assessments", "deliberation_sessions", "deliberation_decisions", "deliberation_audits"];
const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  const [rows] = await connection.query("SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN (?)", [required]);
  const present = rows.map((row) => row.table_name);
  console.log(JSON.stringify({ present, missing: required.filter((table) => !present.includes(table)) }, null, 2));
} finally {
  await connection.end();
}
