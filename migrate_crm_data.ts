import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  console.log("Migrating leads to crm_leads...");
  await db.query(`
    INSERT IGNORE INTO crm_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, created_at)
    SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt 
    FROM imported_leads;
  `);
  console.log("Leads migrated!");

  console.log("Migrating actions from JSON...");
  // Read leads in batches
  const BATCH_SIZE = 20000;
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const [rows] = await db.query(`SELECT id, campanha, extraData FROM imported_leads LIMIT ? OFFSET ?`, [BATCH_SIZE, offset]);
    if ((rows as any[]).length === 0) {
      hasMore = false;
      break;
    }

    const actions = [];
    for (const row of (rows as any[])) {
      let campaigns = [row.campanha];
      if (row.extraData) {
        try {
          const parsed = JSON.parse(row.extraData);
          if (parsed.historico_campanhas) {
             campaigns = parsed.historico_campanhas.split('|').filter(Boolean);
          }
        } catch (e) {}
      }
      
      // Deduplicate campaigns for the same lead just in case
      const uniqueCampaigns = Array.from(new Set(campaigns));
      for (const camp of uniqueCampaigns) {
        actions.push([row.id, camp.trim()]);
      }
    }

    if (actions.length > 0) {
      // Chunk inserts
      const CHUNK = 5000;
      for (let i = 0; i < actions.length; i += CHUNK) {
        const chunk = actions.slice(i, i + CHUNK);
        await db.query(`INSERT INTO crm_actions (lead_id, campaign_name) VALUES ?`, [chunk]);
      }
    }

    offset += BATCH_SIZE;
    console.log(`Processed ${offset} leads...`);
  }

  console.log("Migration complete!");
  process.exit(0);
})();
