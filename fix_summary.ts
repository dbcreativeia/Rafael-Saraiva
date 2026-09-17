import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');
content = content.replace(
  'return res.status(500).json({ error: "Erro ao obter resumo de leads" });',
  'return res.status(500).json({ error: "Erro ao obter resumo de leads", details: String(err) });'
);
fs.writeFileSync('server.ts', content, 'utf-8');
