import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Adding is_frequent column if not exists...");
  try {
    await db.query("ALTER TABLE imported_leads ADD COLUMN is_frequent TINYINT(1) DEFAULT 0 AFTER extraData");
  } catch (e: any) {
    if (e.code !== 'ER_DUP_FIELDNAME') {
      console.log("Error adding column:", e.message);
    } else {
      console.log("Column already exists.");
    }
  }

  console.log("Resetting all counters...");
  await db.query("UPDATE imported_leads SET is_frequent = 0, is_multi_action = 0, is_super_supporter = 0");

  console.log("Setting flags for whatsapp...");
  await db.query(`
    UPDATE imported_leads i
    JOIN lead_counts c ON i.whatsapp = c.whatsapp
    SET i.is_frequent = 1
    WHERE c.distinct_camps >= 2 OR c.distinct_dates >= 2 OR c.raw_count >= 2
  `);

  await db.query(`
    UPDATE imported_leads i
    JOIN lead_counts c ON i.whatsapp = c.whatsapp
    SET i.is_multi_action = 1
    WHERE c.distinct_camps >= 3 OR c.distinct_dates >= 3 OR c.raw_count >= 3
  `);
  
  await db.query(`
    UPDATE imported_leads i
    JOIN lead_counts c ON i.whatsapp = c.whatsapp
    SET i.is_super_supporter = 1
    WHERE c.distinct_camps >= 5 OR c.distinct_dates >= 5 OR c.raw_count >= 5
  `);
  
  console.log("Setting flags for email...");
  await db.query(`
    UPDATE imported_leads i
    JOIN email_counts c ON i.email = c.email
    SET i.is_frequent = 1
    WHERE c.distinct_camps >= 2 OR c.distinct_dates >= 2 OR c.raw_count >= 2
  `);

  await db.query(`
    UPDATE imported_leads i
    JOIN email_counts c ON i.email = c.email
    SET i.is_multi_action = 1
    WHERE c.distinct_camps >= 3 OR c.distinct_dates >= 3 OR c.raw_count >= 3
  `);
  
  await db.query(`
    UPDATE imported_leads i
    JOIN email_counts c ON i.email = c.email
    SET i.is_super_supporter = 1
    WHERE c.distinct_camps >= 5 OR c.distinct_dates >= 5 OR c.raw_count >= 5
  `);

  const [freq] = await db.query("SELECT COUNT(*) as count FROM imported_leads WHERE is_frequent = 1");
  const [multi] = await db.query("SELECT COUNT(*) as count FROM imported_leads WHERE is_multi_action = 1");
  const [superLead] = await db.query("SELECT COUNT(*) as count FROM imported_leads WHERE is_super_supporter = 1");
  
  console.log("Updated DB!");
  console.log("Frequent:", freq[0].count);
  console.log("Multi actions:", multi[0].count);
  console.log("Super supporters:", superLead[0].count);

  process.exit(0);
})();
