import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  // We will re-evaluate the flags STRICTLY based on the number of distinct campaigns in extraData.historico_campanhas.
  // Because "multi-campanhas" means 3+ campaigns.
  // We'll update the table:
  await db.query(`
    UPDATE imported_leads 
    SET 
      is_frequent = CASE WHEN extraData LIKE '%historico_campanhas%' AND LENGTH(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas'))) - LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas')), '|', '')) + 1 >= 2 THEN 1 ELSE 0 END,
      is_multi_action = CASE WHEN extraData LIKE '%historico_campanhas%' AND LENGTH(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas'))) - LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas')), '|', '')) + 1 >= 3 THEN 1 ELSE 0 END,
      is_super_supporter = CASE WHEN extraData LIKE '%historico_campanhas%' AND LENGTH(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas'))) - LENGTH(REPLACE(JSON_UNQUOTE(JSON_EXTRACT(extraData, '$.historico_campanhas')), '|', '')) + 1 >= 5 THEN 1 ELSE 0 END
    WHERE extraData IS NOT NULL AND extraData LIKE '%historico_campanhas%';
  `);
  
  // For rows without historico_campanhas, they have 1 action.
  await db.query(`
    UPDATE imported_leads 
    SET is_frequent = 0, is_multi_action = 0, is_super_supporter = 0
    WHERE extraData IS NULL OR extraData NOT LIKE '%historico_campanhas%';
  `);

  process.exit(0);
})();
