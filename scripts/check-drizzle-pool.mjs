import mysql from "mysql2";
import { drizzle } from "drizzle-orm/mysql2";

const pool = mysql.createPool(process.env.DATABASE_URL);
const db = drizzle({ client: pool });

try {
  const result = await db.execute("SELECT 1 AS connected");
  console.log(JSON.stringify({ connected: true, result }, null, 2));
} finally {
  await new Promise((resolve, reject) => pool.end((error) => (error ? reject(error) : resolve())));
}
