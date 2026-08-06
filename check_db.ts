import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();
async function run() {
  const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env;
  if (DB_HOST) {
    const pool = mysql.createPool({
      host: DB_HOST, user: DB_USER, password: DB_PASSWORD, database: DB_NAME, port: DB_PORT ? parseInt(DB_PORT) : 3306,
    });
    const [rows] = await pool.query('SHOW CREATE TABLE jogo_users');
    console.log(rows[0]['Create Table']);
    process.exit(0);
  }
}
run();
