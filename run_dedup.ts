import { getDbConnection } from "./db.ts";
import fs from "fs";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Creating deduplication aggregated table...");
  
  await db.query(`DROP TABLE IF EXISTS imported_leads_deduped`);
  await db.query(`
    CREATE TABLE imported_leads_deduped LIKE imported_leads
  `);

  console.log("Aggregating campaigns into ExtraData...");
  // We use GROUP_CONCAT to keep all campaigns
  
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT 
      MIN(id) as id, 
      MAX(nome) as nome, 
      whatsapp, 
      MAX(email) as email, 
      MAX(cep) as cep, 
      MAX(endereco) as endereco, 
      MAX(numero) as numero, 
      MAX(complemento) as complemento, 
      MAX(bairro) as bairro, 
      MAX(cidade) as cidade, 
      MAX(estado) as estado, 
      MAX(campanha) as campanha, 
      MAX(origem) as origem, 
      MAX(createdAt) as createdAt, 
      JSON_SET('{}', '$.historico_campanhas', GROUP_CONCAT(DISTINCT campanha SEPARATOR '|')) as extraData,
      CASE WHEN COUNT(DISTINCT campanha) >= 2 OR COUNT(*) >= 2 THEN 1 ELSE 0 END as is_frequent,
      CASE WHEN COUNT(DISTINCT campanha) >= 3 OR COUNT(*) >= 3 THEN 1 ELSE 0 END as is_multi_action,
      CASE WHEN COUNT(DISTINCT campanha) >= 5 OR COUNT(*) >= 5 THEN 1 ELSE 0 END as is_super_supporter
    FROM imported_leads
    WHERE whatsapp IS NOT NULL AND LENGTH(whatsapp) > 7
    GROUP BY whatsapp
  `);

  console.log("Processing Email (excluding those with WA)...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT 
      MIN(id), MAX(nome), MAX(whatsapp), email, MAX(cep), MAX(endereco), MAX(numero), MAX(complemento), MAX(bairro), MAX(cidade), MAX(estado), MAX(campanha), MAX(origem), MAX(createdAt), 
      JSON_SET('{}', '$.historico_campanhas', GROUP_CONCAT(DISTINCT campanha SEPARATOR '|')),
      CASE WHEN COUNT(DISTINCT campanha) >= 2 OR COUNT(*) >= 2 THEN 1 ELSE 0 END,
      CASE WHEN COUNT(DISTINCT campanha) >= 3 OR COUNT(*) >= 3 THEN 1 ELSE 0 END,
      CASE WHEN COUNT(DISTINCT campanha) >= 5 OR COUNT(*) >= 5 THEN 1 ELSE 0 END
    FROM imported_leads
    WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) AND email IS NOT NULL AND email LIKE '%@%'
    GROUP BY email
  `);

  console.log("Processing Name+CEP (excluding those with WA and Email)...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT 
      MIN(id), MAX(nome), MAX(whatsapp), MAX(email), cep, MAX(endereco), MAX(numero), MAX(complemento), MAX(bairro), MAX(cidade), MAX(estado), MAX(campanha), MAX(origem), MAX(createdAt), 
      JSON_SET('{}', '$.historico_campanhas', GROUP_CONCAT(DISTINCT campanha SEPARATOR '|')),
      CASE WHEN COUNT(DISTINCT campanha) >= 2 OR COUNT(*) >= 2 THEN 1 ELSE 0 END,
      CASE WHEN COUNT(DISTINCT campanha) >= 3 OR COUNT(*) >= 3 THEN 1 ELSE 0 END,
      CASE WHEN COUNT(DISTINCT campanha) >= 5 OR COUNT(*) >= 5 THEN 1 ELSE 0 END
    FROM imported_leads
    WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) 
      AND (email IS NULL OR email NOT LIKE '%@%')
      AND nome IS NOT NULL AND cep IS NOT NULL AND LENGTH(cep) >= 8
    GROUP BY CONCAT(nome, cep)
  `);

  console.log("Processing the Rest (no unique keys)...");
  await db.query(`
    INSERT INTO imported_leads_deduped
    SELECT 
      id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, origem, createdAt, extraData, 0, 0, 0
    FROM imported_leads
    WHERE (whatsapp IS NULL OR LENGTH(whatsapp) <= 7) 
      AND (email IS NULL OR email NOT LIKE '%@%')
      AND (cep IS NULL OR LENGTH(cep) < 8)
  `);

  const [count] = await db.query("SELECT COUNT(*) as c FROM imported_leads_deduped");
  console.log("New deduplicated row count:", count[0].c);

  console.log("Swapping tables...");
  await db.query(`RENAME TABLE imported_leads TO imported_leads_old, imported_leads_deduped TO imported_leads`);
  await db.query(`DROP TABLE imported_leads_old`);
  
  process.exit(0);
})();
