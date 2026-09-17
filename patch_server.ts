import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

// Import crmService
if (!content.includes('import { getCrmSummary, getCrmPaginated }')) {
  content = content.replace('import { getDbConnection } from "./db.ts";', 'import { getDbConnection } from "./db.ts";\nimport { getCrmSummary, getCrmPaginated } from "./crmService.ts";');
}

// Replace /api/leads/summary
content = content.replace(
  /app\.get\('\/api\/leads\/summary'.*?\}\);/s,
  `app.get('/api/leads/summary', async (req, res) => {
    try {
      const summary = await getCrmSummary();
      return res.json(summary);
    } catch (err) {
      console.error("Error in /api/leads/summary:", err);
      return res.status(500).json({ error: "Erro ao obter resumo de leads" });
    }
  });`
);

// Replace /api/leads/paginated
content = content.replace(
  /app\.get\('\/api\/leads\/paginated'.*?\}\);/s,
  `app.get('/api/leads/paginated', async (req, res) => {
    try {
      const result = await getCrmPaginated(req.query);
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/leads/paginated:", err);
      return res.status(500).json({ error: "Erro ao paginar leads" });
    }
  });`
);

// We should also replace /api/imported-leads/campaigns to read from crm_actions
content = content.replace(
  /app\.get\('\/api\/imported-leads\/campaigns'.*?\}\);/s,
  `app.get('/api/imported-leads/campaigns', async (req, res) => {
    try {
      const db = await getDbConnection();
      const [rows] = await db.query('SELECT campaign_name as campanha, COUNT(*) as count, MAX(created_at) as lastImport FROM crm_actions GROUP BY campaign_name ORDER BY lastImport DESC');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: "DB erro" });
    }
  });`
);


fs.writeFileSync('server.ts', content, 'utf-8');
console.log("server.ts patched");
