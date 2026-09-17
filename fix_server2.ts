import fs from 'fs';

let content = fs.readFileSync('server.ts', 'utf-8');

const startIdx = content.indexOf(`app.get('/api/imported-leads/campaigns'`);
const nextRouteIdx = content.indexOf(`app.delete('/api/imported-leads/campaign/:campaignName'`);

if (startIdx > -1 && nextRouteIdx > -1) {
  content = content.substring(0, startIdx) + 
  `app.get('/api/imported-leads/campaigns', async (req, res) => {
    try {
      const db = await getDbConnection();
      const [rows] = await db.query('SELECT campaign_name as campanha, COUNT(*) as count, MAX(created_at) as lastImport FROM crm_actions GROUP BY campaign_name ORDER BY lastImport DESC');
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: "DB erro" });
    }
  });\n\n  ` + content.substring(nextRouteIdx);
}

fs.writeFileSync('server.ts', content, 'utf-8');
console.log("fixed2");
