import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  
  const insertOrganic = async (tableName: string, campaignName: string, source: string) => {
    console.log("Migrating " + tableName + "...");
    try {
      const [rows] = await db.query("SELECT * FROM " + tableName);
      for (const row of (rows as any[])) {
        // Find existing lead by whatsapp or email
        let leadId = "org_" + tableName + "_" + row.id;
        
        // Insert into leads
        await db.query(`
          INSERT INTO crm_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            nome = COALESCE(VALUES(nome), nome),
            whatsapp = COALESCE(VALUES(whatsapp), whatsapp),
            email = COALESCE(VALUES(email), email)
        `, [
          leadId, 
          row.nome || 'Sem Nome', 
          row.whatsapp || '', 
          row.email || '', 
          row.cep || '', 
          row.endereco || '', 
          row.numero || '', 
          row.complemento || '', 
          row.bairro || '', 
          row.cidade || '', 
          row.estado || '', 
          row.createdAt || new Date()
        ]).catch(() => {});
        
        // Insert action
        await db.query(`
          INSERT INTO crm_actions (lead_id, campaign_name, source, created_at)
          VALUES (?, ?, ?, ?)
        `, [leadId, campaignName, source, row.createdAt || new Date()]).catch(() => {});
      }
    } catch (e: any) {
      console.log("Error on " + tableName + ":", e.message);
    }
  };

  await insertOrganic('popup_apoio', 'Apoio Capital', 'POPUP');
  await insertOrganic('material_campaign', 'Material Oficial', 'MATERIAL');
  await insertOrganic('ninapassadore_campaign', 'Maus-Tratos (Nina)', 'NINA');
  await insertOrganic('citizens', 'Projeto de Lei', 'CITIZEN');
  await insertOrganic('contra_maus_tratos', 'Contra Maus-Tratos', 'MAUS_TRATOS');
  await insertOrganic('jogo_users', 'Jogo Resgate', 'JOGO');
  await insertOrganic('petitions', 'Abaixo-Assinado', 'PETITION');

  console.log("Organic leads migrated!");
  process.exit(0);
})();
