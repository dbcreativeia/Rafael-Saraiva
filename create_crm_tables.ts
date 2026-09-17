import { getDbConnection } from "./db.ts";

(async () => {
  const db = await getDbConnection();
  if (!db) {
    console.error("No DB connection");
    process.exit(1);
  }

  console.log("Creating crm_leads table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_leads (
      id VARCHAR(255) PRIMARY KEY,
      nome VARCHAR(255) NOT NULL,
      whatsapp VARCHAR(255),
      email VARCHAR(255),
      cep VARCHAR(20),
      endereco TEXT,
      numero VARCHAR(50),
      complemento VARCHAR(255),
      bairro VARCHAR(255),
      cidade VARCHAR(255),
      estado VARCHAR(2),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Creating crm_actions table...");
  await db.query(`
    CREATE TABLE IF NOT EXISTS crm_actions (
      id INT AUTO_INCREMENT PRIMARY KEY,
      lead_id VARCHAR(255) NOT NULL,
      campaign_name VARCHAR(255) NOT NULL,
      source VARCHAR(100) DEFAULT 'Importação CSV',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_lead_id (lead_id),
      INDEX idx_campaign (campaign_name)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  console.log("Tables created successfully.");
  process.exit(0);
})();
