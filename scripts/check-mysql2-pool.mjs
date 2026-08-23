import mysql from "mysql2";

const pool = mysql.createPool(process.env.DATABASE_URL);

pool.query("SELECT 1 AS connected", (error, rows) => {
  const config = pool.config.connectionConfig;
  console.log(JSON.stringify({ error: error ? { code: error.code, message: error.message } : null, rows, host: config.host, port: config.port, database: config.database }, null, 2));
  pool.end();
});
