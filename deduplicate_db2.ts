import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Checking DB row count...");
  const [rows] = await db.query("SELECT COUNT(*) as c FROM imported_leads");
  console.log("Count:", rows[0].c);

  process.exit(0);
})();
