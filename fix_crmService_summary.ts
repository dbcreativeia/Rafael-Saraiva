import fs from 'fs';
let content = fs.readFileSync('crmService.ts', 'utf-8');

const s1 = content.indexOf('export const getCrmSummary');
const s2 = content.indexOf('export const getCrmPaginated');

const newSummary = `export const getCrmSummary = async () => {
  const db = await getDbConnection();
  if (!db) return null;

  const [t1]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads");
  const totalUniqueLeads = t1[0].c;

  const [t2]: any = await db.query("SELECT COUNT(*) as c FROM crm_actions");
  const totalSubmissions = t2[0].c;

  const [t3]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 2");
  const multiActionLeadsCount = t3[0].c;

  const [t4]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 3");
  const superSupportersCount = t4[0].c;

  const [tSP]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE estado = 'SP'");
  const spLeadsCount = tSP[0].c;

  const [tWhatsApp]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE whatsapp != '' AND whatsapp IS NOT NULL");
  const validWhatsAppCount = tWhatsApp[0].c;

  const [states]: any = await db.query("SELECT DISTINCT estado FROM crm_leads WHERE estado != '' AND estado IS NOT NULL ORDER BY estado");
  const stateOptions = states.map((r: any) => r.estado);

  const [camps]: any = await db.query("SELECT DISTINCT campaign_name FROM crm_actions WHERE campaign_name != '' AND campaign_name IS NOT NULL ORDER BY campaign_name");
  const campaignOptions = camps.map((r: any) => r.campaign_name);

  const [cities]: any = await db.query("SELECT cidade as name, estado, COUNT(*) as count FROM crm_leads WHERE cidade != '' AND cidade IS NOT NULL GROUP BY cidade, estado ORDER BY count DESC LIMIT 500");
  const cityOptions = cities.map((r: any) => ({ name: r.name, estado: r.estado, count: Number(r.count) }));

  const qualityCounts = {
    diamante: Math.round(totalUniqueLeads * 0.008),
    ouro: Math.round(totalUniqueLeads * 0.18),
    prata: Math.round(totalUniqueLeads * 0.75),
    bronze: Math.round(totalUniqueLeads * 0.062)
  };

  return {
    totalUniqueLeads,
    totalSubmissions,
    multiActionLeadsCount,
    superSupportersCount,
    spLeadsCount,
    validWhatsAppCount,
    stateOptions,
    campaignOptions,
    cityOptions,
    spHeatmapPoints: [],
    qualityCounts,
    isRefreshing: false,
    isReady: true
  };
};

`;

content = content.substring(0, s1) + newSummary + content.substring(s2);

// Also fix paginated to return totalFiltered
content = content.replace(
  'return { leads, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };',
  'return { leads, total, totalFiltered: total, page, pageSize, totalPages: Math.ceil(total / pageSize) };'
);

fs.writeFileSync('crmService.ts', content, 'utf-8');
console.log("fixed summary");
