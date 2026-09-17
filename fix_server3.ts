import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// Replace everything between app.get('/api/leads/summary' and app.get('/api/leads/physical-materials'
const s1 = content.indexOf(`app.get('/api/leads/summary'`);
const s2 = content.indexOf(`app.get('/api/leads/physical-materials'`);

if (s1 > -1 && s2 > -1) {
  content = content.substring(0, s1) + 
  `app.get('/api/leads/summary', async (req, res) => {
    try {
      const summary = await getCrmSummary();
      return res.json(summary);
    } catch (err) {
      console.error("Error in /api/leads/summary:", err);
      return res.status(500).json({ error: "Erro ao obter resumo de leads" });
    }
  });

  app.get('/api/leads/paginated', async (req, res) => {
    try {
      const result = await getCrmPaginated(req.query);
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/leads/paginated:", err);
      return res.status(500).json({ error: "Erro ao paginar leads" });
    }
  });\n\n  ` + content.substring(s2);
}

fs.writeFileSync('server.ts', content, 'utf-8');
console.log("fixed3");
