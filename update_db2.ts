import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Creating temporary table of counts...");
  
  await db.query(`
    CREATE TEMPORARY TABLE IF NOT EXISTS lead_counts AS
    SELECT whatsapp, COUNT(DISTINCT campanha) as distinct_camps, COUNT(DISTINCT DATE(createdAt)) as distinct_dates, COUNT(*) as raw_count
    FROM imported_leads 
    WHERE whatsapp IS NOT NULL AND LENGTH(whatsapp) >= 8
    GROUP BY whatsapp
  `);
  
  await db.query("CREATE INDEX idx_tmp_wa ON lead_counts(whatsapp)");

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
    CREATE TEMPORARY TABLE IF NOT EXISTS email_counts AS
    SELECT email, COUNT(DISTINCT campanha) as distinct_camps, COUNT(DISTINCT DATE(createdAt)) as distinct_dates, COUNT(*) as raw_count
    FROM imported_leads 
    WHERE email IS NOT NULL AND email LIKE '%@%'
    GROUP BY email
  `);

  await db.query("CREATE INDEX idx_tmp_em ON email_counts(email)");

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
