const fs = require('fs');

let dbContent = fs.readFileSync('db.ts', 'utf-8');
dbContent = dbContent.replace(
  "cidade VARCHAR(255),",
  "cidade VARCHAR(255),\n        estado VARCHAR(2),"
);
fs.writeFileSync('db.ts', dbContent);

let serverContent = fs.readFileSync('server.ts', 'utf-8');
serverContent = serverContent.replace(
  "const { nomeCompleto, usuario, senha, email, whatsapp, cep, cidade } = req.body;",
  "const { nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado } = req.body;"
);
serverContent = serverContent.replace(
  "'INSERT INTO jogo_users (id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',\n          [id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade]",
  "'INSERT INTO jogo_users (id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',\n          [id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado]"
);
serverContent = serverContent.replace(
  "return res.json({ success: true, data: { id, nomeCompleto, usuario, email, whatsapp, cep, cidade } });",
  "return res.json({ success: true, data: { id, nomeCompleto, usuario, email, whatsapp, cep, cidade, estado } });"
);

fs.writeFileSync('server.ts', serverContent);
