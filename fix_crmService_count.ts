import fs from 'fs';
let content = fs.readFileSync('crmService.ts', 'utf-8');

const s1 = content.indexOf('const [t3]: any = await db.query');
const s2 = content.indexOf('const [tSP]: any = await db.query');

const replacement = `const [tF]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 2");
  const frequentLeadsCount = tF[0].c;

  const [tM]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 3");
  const multiActionLeadsCount = tM[0].c;

  const [tS]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 5");
  const superSupportersCount = tS[0].c;

  `;

content = content.substring(0, s1) + replacement + content.substring(s2);

// Also we need to export frequentLeadsCount
content = content.replace(
  'return {\n    totalUniqueLeads',
  'return {\n    frequentLeadsCount,\n    totalUniqueLeads'
);

fs.writeFileSync('crmService.ts', content, 'utf-8');
console.log("fixed crmService counts");
