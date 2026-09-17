import { getDbConnection } from "./db.ts";

export const getCrmSummary = async () => {
  const db = await getDbConnection();
  if (!db) return null;

  const [t1]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads");
  const totalUniqueLeads = t1[0].c;

  const [t2]: any = await db.query("SELECT COUNT(*) as c FROM crm_actions");
  const totalSubmissions = t2[0].c;

  const [tF]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 2");
  const frequentLeadsCount = tF[0].c;

  const [tM]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 3");
  const multiActionLeadsCount = tM[0].c;

  const [tS]: any = await db.query("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 5");
  const superSupportersCount = tS[0].c;

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
    frequentLeadsCount,
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

export const getCrmPaginated = async (query: any) => {
  const db = await getDbConnection();
  const page = parseInt(query.page || '1');
  const pageSize = parseInt(query.pageSize || '20');
  const offset = (page - 1) * pageSize;
  const search = query.search || '';
  
  const estado = query.estado || '';
  const cidade = query.cidade || '';
  const campaign = query.campaign || 'all';
  const multiAction = query.multiAction || 'all';
  const leadType = query.leadType || 'all';
  const qualityTier = query.qualityTier || 'all';
  const hasWhatsApp = query.hasWhatsApp || 'all';
  const sortField = query.sortField || 'lastDate';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  let whereClauses: string[] = [];
  let values: any[] = [];
  let joins = '';

  if (search) {
    whereClauses.push('(l.nome LIKE ? OR l.whatsapp LIKE ? OR l.email LIKE ?)');
    values.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (estado) {
    whereClauses.push('l.estado = ?');
    values.push(estado);
  }

  if (cidade) {
    whereClauses.push('l.cidade = ?');
    values.push(cidade);
  }

  if (hasWhatsApp === 'yes') {
    whereClauses.push('l.whatsapp != "" AND l.whatsapp IS NOT NULL');
  } else if (hasWhatsApp === 'no') {
    whereClauses.push('(l.whatsapp = "" OR l.whatsapp IS NULL)');
  }

  if (multiAction === 'frequent') {
    whereClauses.push('l.campaign_count >= 2');
  } else if (multiAction === 'multi') {
    whereClauses.push('l.campaign_count >= 3');
  } else if (multiAction === 'super') {
    whereClauses.push('l.campaign_count >= 5');
  } else if (multiAction === 'OLD_SUPER') {
    whereClauses.push('l.campaign_count >= 3');
  } else if (multiAction === 'single') {
    whereClauses.push('l.campaign_count = 1');
  }

  if (qualityTier !== 'all') {
    // Basic heuristics since exact percentile might be slow.
    // Let's assume diamante >= 4, ouro >= 3, prata >= 2, bronze = 1 for now or map it.
    if (qualityTier === 'diamante') whereClauses.push('l.campaign_count >= 5');
    else if (qualityTier === 'ouro') whereClauses.push('l.campaign_count >= 3 AND l.campaign_count <= 4');
    else if (qualityTier === 'prata') whereClauses.push('l.campaign_count = 2');
    else if (qualityTier === 'bronze') whereClauses.push('l.campaign_count = 1');
    else if (qualityTier === 'high') whereClauses.push('l.campaign_count >= 3');
  }

  if (campaign !== 'all') {
    joins += ' JOIN crm_actions a_camp ON l.id = a_camp.lead_id AND a_camp.campaign_name = ?';
    values.push(campaign);
  }

  if (leadType === 'organic') {
    if (!joins.includes('a_camp')) {
       joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source = ?';
    } else {
       joins += ' AND a_camp.source = ?'; // simplistic if campaign also specified
    }
    values.push('organic'); // Assuming 'organic' is a source type
  } else if (leadType === 'imported') {
    if (!joins.includes('a_camp')) {
       joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source != ?';
    } else {
       joins += ' AND a_camp.source != ?';
    }
    values.push('organic');
  }

  const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // Get total count
  const [countRes]: any = await db.query(`SELECT COUNT(DISTINCT l.id) as total FROM crm_leads l ${joins} ${whereStr}`, values);
  const total = countRes[0].total;

  let orderStr = 'ORDER BY l.created_at ' + sortOrder;
  if (sortField === 'nome') orderStr = 'ORDER BY l.nome ' + sortOrder;
  if (sortField === 'cidade') orderStr = 'ORDER BY l.cidade ' + sortOrder;
  if (sortField === 'totalActions') orderStr = 'ORDER BY l.campaign_count ' + sortOrder;
  if (sortField === 'firstDate') orderStr = 'ORDER BY l.created_at ASC';
  if (sortField === 'lastDate') orderStr = 'ORDER BY l.created_at ' + sortOrder;

  const [rows]: any = await db.query(`
    SELECT DISTINCT l.* 
    FROM crm_leads l ${joins} ${whereStr} 
    ${orderStr} 
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  // For each row, fetch actions
  const leads = await Promise.all(rows.map(async (row: any) => {
    const [acts]: any = await db.query(`SELECT campaign_name, source, created_at FROM crm_actions WHERE lead_id = ? ORDER BY created_at DESC`, [row.id]);
    return {
      id: row.id,
      nome: row.nome,
      whatsapp: row.whatsapp,
      email: row.email,
      cidade: row.cidade,
      estado: row.estado,
      cep: row.cep,
      endereco: row.endereco,
      numero: row.numero,
      complemento: row.complemento,
      bairro: row.bairro,
      totalActions: acts.length,
      isFrequent: row.campaign_count >= 2,
      isSuperSupporter: row.campaign_count >= 3,
      distinctCampaigns: Array.from(new Set(acts.map((a: any) => a.campaign_name))),
      actions: acts.map((a: any) => ({
        sourceKey: a.source,
        sourceName: a.campaign_name,
        date: a.created_at
      }))
    };
  }));

  return { leads, totalFiltered: total, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};
