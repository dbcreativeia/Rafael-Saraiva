import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  // The database lost the count of total interactions per user because I merged rows and only kept DISTINCT campaigns.
  // Wait, I can't recover the exact number of duplicate rows per user unless I have a backup of the table!
  const [tables] = await db.query("SHOW TABLES LIKE '%imported_leads%'");
  console.log(tables);
  process.exit(0);
})();
