import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  if (DB_HOST) {
    const pool = mysql.createPool({
      host: DB_HOST,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      port: DB_PORT ? parseInt(DB_PORT) : 3306,
    });
    try {
      await pool.query('ALTER TABLE jogo_scores ADD COLUMN usuario VARCHAR(255)');
      console.log("Added usuario column to jogo_scores");
    } catch (e) {
      console.log("Column might exist or error:", e.message);
    }
    process.exit(0);
  }
}
run();
