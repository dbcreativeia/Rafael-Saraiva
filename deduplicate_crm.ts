import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  console.log("Starting CRM deduplication by WhatsApp...");
  
  // 1. Group by whatsapp, get min id as master
  const [duplicatePhones] = await db.query(`
    SELECT whatsapp, MIN(id) as master_id, COUNT(*) as c 
    FROM crm_leads 
    WHERE whatsapp IS NOT NULL AND whatsapp != '' AND whatsapp != 'Sem Telefone'
    GROUP BY whatsapp 
    HAVING c > 1
  `);

  let countP = 0;
  for (const dup of (duplicatePhones as any[])) {
    const w = dup.whatsapp;
    const masterId = dup.master_id;
    
    // Find all other IDs
    const [others] = await db.query(`SELECT id FROM crm_leads WHERE whatsapp = ? AND id != ?`, [w, masterId]);
    const idsToMerge = (others as any[]).map(o => o.id);
    
    if (idsToMerge.length > 0) {
      await db.query(`UPDATE crm_actions SET lead_id = ? WHERE lead_id IN (?)`, [masterId, idsToMerge]);
      await db.query(`DELETE FROM crm_leads WHERE id IN (?)`, [idsToMerge]);
    }
    countP++;
    if (countP % 100 === 0) console.log(`Deduped ${countP} phones`);
  }

  console.log("Starting CRM deduplication by Email...");
  
  // 2. Group by email, get min id as master
  const [duplicateEmails] = await db.query(`
    SELECT email, MIN(id) as master_id, COUNT(*) as c 
    FROM crm_leads 
    WHERE email IS NOT NULL AND email != '' AND email != 'Sem Email'
    GROUP BY email 
    HAVING c > 1
  `);

  let countE = 0;
  for (const dup of (duplicateEmails as any[])) {
    const e = dup.email;
    const masterId = dup.master_id;
    
    const [others] = await db.query(`SELECT id FROM crm_leads WHERE email = ? AND id != ?`, [e, masterId]);
    const idsToMerge = (others as any[]).map(o => o.id);
    
    if (idsToMerge.length > 0) {
      await db.query(`UPDATE crm_actions SET lead_id = ? WHERE lead_id IN (?)`, [masterId, idsToMerge]);
      await db.query(`DELETE FROM crm_leads WHERE id IN (?)`, [idsToMerge]);
    }
    countE++;
    if (countE % 100 === 0) console.log(`Deduped ${countE} emails`);
  }

  console.log("CRM deduplication complete!");
  process.exit(0);
})();
