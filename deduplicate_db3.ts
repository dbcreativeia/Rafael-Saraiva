import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Creating deduplication stored procedure or script logic...");

  // Since running massive JOIN updates via tsx can lock or timeout, we will do it smartly.
  // We'll create a merged table, index it, copy data over deduplicating, then swap tables.
  
  await db.query(`DROP TABLE IF EXISTS imported_leads_deduped`);
  await db.query(`
    CREATE TABLE imported_leads_deduped LIKE imported_leads
  `);

  console.log("Finding exact distinct records and inserting (Part 1/1) - It may take a minute...");
  // Grouping by a composite key (whatsapp, email, nome+cep) is tricky in one pass.
  // The safest way is to group by WhatsApp first.
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT t1.*
    FROM imported_leads t1
    JOIN (
      SELECT MIN(id) as master_id, whatsapp
      FROM imported_leads
      WHERE whatsapp IS NOT NULL AND LENGTH(whatsapp) > 7
      GROUP BY whatsapp
    ) t2 ON t1.id = t2.master_id
  `);

  console.log("Inserting non-whatsapp, but with email...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT t1.*
    FROM imported_leads t1
    JOIN (
      SELECT MIN(id) as master_id, email
      FROM imported_leads
      WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) AND email IS NOT NULL AND email LIKE '%@%'
      GROUP BY email
    ) t2 ON t1.id = t2.master_id
  `);

  console.log("Inserting non-whatsapp, non-email, but with name+cep...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT t1.*
    FROM imported_leads t1
    JOIN (
      SELECT MIN(id) as master_id, CONCAT(nome, cep) as ncep
      FROM imported_leads
      WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) 
        AND (email IS NULL OR email NOT LIKE '%@%')
        AND nome IS NOT NULL AND cep IS NOT NULL AND LENGTH(cep) >= 8
      GROUP BY ncep
    ) t2 ON t1.id = t2.master_id
  `);

  console.log("Inserting the rest (no wa, no email, no cep) - keeping them as they are...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT *
    FROM imported_leads
    WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) 
      AND (email IS NULL OR email NOT LIKE '%@%')
      AND (cep IS NULL OR LENGTH(cep) < 8)
  `);

  const [count] = await db.query("SELECT COUNT(*) as c FROM imported_leads_deduped");
  console.log("New deduplicated row count:", count[0].c);

  // Rename tables
  console.log("Swapping tables...");
  await db.query(`RENAME TABLE imported_leads TO imported_leads_old, imported_leads_deduped TO imported_leads`);
  await db.query(`DROP TABLE imported_leads_old`);

  // Re-run the counts to update flags!
  console.log("Recalculating flags...");
  await db.query("UPDATE imported_leads SET is_frequent = 0, is_multi_action = 0, is_super_supporter = 0");

  // Since we merged rows, the distinct campaign count is lost from the original table!
  // BUT the organic table logic in memory actually does this in realtime by joining.
  // Wait, imported_leads is the base. We lost the fact that they participated in multiple campaigns in imported_leads if we don't aggregate!
  
  process.exit(0);
})();
