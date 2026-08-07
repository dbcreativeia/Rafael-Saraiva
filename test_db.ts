import { getDbConnection } from './db.js';

async function run() {
  const db = await getDbConnection();
  if (!db) return;
  const usuario = 'nalvinhaxgirl@gmail.com';
  const [users] = await db.query('SELECT usuario, nomeCompleto FROM jogo_users WHERE email = ? OR usuario = ?', [usuario, usuario]);
  console.log("Found:", users);
  
  if (db.end) await db.end();
}
run();
