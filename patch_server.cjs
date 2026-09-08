const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf8');
content = content.replace(
  "leadsConsolidator.refreshFromDatabase().catch(console.error);",
  "await leadsConsolidator.refreshFromDatabase();"
);
content = content.replace(
  "message: \"Atualização de leads iniciada em segundo plano.\"",
  "message: \"Atualização concluída com sucesso.\""
);
fs.writeFileSync('server.ts', content);
