import fs from "fs";

let content = fs.readFileSync("server.ts", "utf-8");

// The import-worker or server bulk insert currently does simple inserts.
// To prevent the base from getting duplicate rows upon new imports, we should update the insert query to ON DUPLICATE KEY UPDATE.
// However, imported_leads doesn't have a UNIQUE key constraint across (whatsapp, email) because that's not possible (they can be null).
// Alternatively, we can add a simple post-processing deduplication step at the end of the batch import in server.ts.

const searchImport = `    const db = await getDbConnection();
    if (db) {
      try {
        const valuesArray = parsedLeads.map(l => [
          l.id || \`imp_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
          l.nome,
          l.whatsapp,
          l.email,
          l.cep,
          l.endereco,
          l.numero,
          l.complemento,
          l.bairro,
          l.cidade,
          l.estado,
          l.campanha,
          l.origem || 'Importação CSV',
          new Date(l.createdAt || Date.now()),
          l.extraData ? JSON.stringify(l.extraData) : null
        ]);

        const CHUNK_SIZE = 5000;
        for (let i = 0; i < valuesArray.length; i += CHUNK_SIZE) {
          const chunk = valuesArray.slice(i, i + CHUNK_SIZE);
          await db.query(
            \`INSERT INTO imported_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, origem, createdAt, extraData) VALUES ?\`,
            [chunk]
          );
        }`;

const replaceImport = `    const db = await getDbConnection();
    if (db) {
      try {
        const valuesArray = parsedLeads.map(l => [
          l.id || \`imp_\${Date.now()}_\${Math.random().toString(36).substring(2, 9)}\`,
          l.nome,
          l.whatsapp,
          l.email,
          l.cep,
          l.endereco,
          l.numero,
          l.complemento,
          l.bairro,
          l.cidade,
          l.estado,
          l.campanha,
          l.origem || 'Importação CSV',
          new Date(l.createdAt || Date.now()),
          l.extraData ? JSON.stringify(l.extraData) : null
        ]);

        const CHUNK_SIZE = 5000;
        for (let i = 0; i < valuesArray.length; i += CHUNK_SIZE) {
          const chunk = valuesArray.slice(i, i + CHUNK_SIZE);
          await db.query(
            \`INSERT INTO imported_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, origem, createdAt, extraData) VALUES ?\`,
            [chunk]
          );
        }
        
        // Asynchronous post-processing deduplication via background task (non-blocking)
        import('child_process').then(cp => {
          cp.exec('npx tsx deduplicate_db.ts', (err) => {
            if (err) console.error("Auto-deduplication error:", err);
            import('./leadsConsolidation.ts').then(mod => mod.leadsConsolidator.refreshFromDatabase());
          });
        });`;

if (content.includes(searchImport)) {
  content = content.replace(searchImport, replaceImport);
  fs.writeFileSync("server.ts", content);
  console.log("Updated import endpoint");
}

