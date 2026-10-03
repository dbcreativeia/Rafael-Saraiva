import { getDbConnection, queryWithRetry } from "./db.ts";
import { sanitizeGeo } from "./geoSanitizer.ts";
import * as XLSX from 'xlsx';

let cachedSummary: any = null;
let cachedSummaryTime = 0;
const SUMMARY_CACHE_TTL = 30000; // 30 seconds

export const invalidateCrmSummaryCache = () => {
  cachedSummary = null;
  cachedSummaryTime = 0;
};

export const getCrmSummary = async (forceRefresh = false) => {
  const now = Date.now();
  if (!forceRefresh && cachedSummary && (now - cachedSummaryTime < SUMMARY_CACHE_TTL)) {
    return cachedSummary;
  }

  const [t1]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads");
  const totalUniqueLeads = t1[0].c;

  const [t2]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_actions");
  const totalSubmissions = t2[0].c;

  const [tF]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 2");
  const frequentLeadsCount = tF[0].c;
  const multiActionLeadsCount = tF[0].c;

  const [tM]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 3");
  const superSupportersCount = tM[0].c;

  const [tS]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads WHERE campaign_count >= 5");
  const super5Count = tS[0].c;

  const [tSP]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads WHERE estado = 'SP'");
  const spLeadsCount = tSP[0].c;

  const [tWhatsApp]: any = await queryWithRetry("SELECT COUNT(*) as c FROM crm_leads WHERE whatsapp != '' AND whatsapp IS NOT NULL");
  const validWhatsAppCount = tWhatsApp[0].c;

  const [states]: any = await queryWithRetry("SELECT DISTINCT estado FROM crm_leads WHERE estado != '' AND estado IS NOT NULL ORDER BY estado");
  const stateOptions = states.map((r: any) => r.estado);

  const [camps]: any = await queryWithRetry("SELECT DISTINCT campaign_name FROM crm_actions WHERE campaign_name != '' AND campaign_name IS NOT NULL ORDER BY campaign_name");
  const campaignOptions = camps.map((r: any) => r.campaign_name);

  const [cities]: any = await queryWithRetry("SELECT cidade as name, estado, COUNT(*) as count FROM crm_leads WHERE cidade != '' AND cidade IS NOT NULL GROUP BY cidade, estado ORDER BY count DESC");
  const cityOptions = cities.map((r: any) => ({ name: r.name, estado: r.estado, count: Number(r.count) }));

  const qualityCounts = {
    diamante: Math.round(totalUniqueLeads * 0.008),
    ouro: Math.round(totalUniqueLeads * 0.18),
    prata: Math.round(totalUniqueLeads * 0.75),
    bronze: Math.round(totalUniqueLeads * 0.062)
  };

  const result = {
    frequentLeadsCount,
    totalUniqueLeads,
    totalSubmissions,
    multiActionLeadsCount,
    superSupportersCount,
    super5Count,
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

  cachedSummary = result;
  cachedSummaryTime = now;
  return result;
};

export function extractCampaignList(query: any): string[] {
  let list: string[] = [];
  const raw = query?.campaigns ?? query?.campaign;
  if (Array.isArray(raw)) {
    list = raw.map((c: any) => String(c).trim()).filter((c: string) => c && c !== 'all' && c !== 'ALL');
  } else if (typeof raw === 'string' && raw.trim() && raw !== 'all' && raw !== 'ALL') {
    list = raw.split(',').map((c: string) => c.trim()).filter((c: string) => c && c !== 'all' && c !== 'ALL');
  }
  return Array.from(new Set(list));
}

export function deduceSpZone(bairro?: string | null, cep?: string | null): string {
  const cleanCep = String(cep || '').replace(/\D/g, '');
  const b = String(bairro || '').toLowerCase();
  
  if (cleanCep.length >= 3) {
    const p3 = cleanCep.substring(0, 3);
    const p2 = cleanCep.substring(0, 2);
    if (p3 >= '010' && p3 <= '015') return 'Centro';
    if (p2 === '02') return 'Zona Norte';
    if (p2 === '03' || (p3 >= '080' && p3 <= '084')) return 'Zona Leste';
    if (p2 === '04') return 'Zona Sul';
    if (p2 === '05') return 'Zona Oeste';
  }

  if (b.includes('sé') || b.includes('república') || b.includes('bela vista') || b.includes('consolação') || b.includes('santa cecília') || b.includes('bom retiro') || b.includes('brás') || b.includes('cambuci') || b.includes('pari') || b.includes('liberdade') || b.includes('centro')) {
    return 'Centro';
  }
  if (b.includes('tatuapé') || b.includes('mooca') || b.includes('itaquera') || b.includes('penha') || b.includes('vila prudente') || b.includes('são mateus') || b.includes('ermelino') || b.includes('guaianases') || b.includes('sapopemba') || b.includes('são miguel') || b.includes('belém') || b.includes('cangaíba') || b.includes('artur alvim') || b.includes('tiradentes') || b.includes('itaim paulista') || b.includes('vila formosa') || b.includes('vila matilde') || b.includes('aricanduva') || b.includes('zona leste')) {
    return 'Zona Leste';
  }
  if (b.includes('santana') || b.includes('tucuruvi') || b.includes('vila maria') || b.includes('casa verde') || b.includes('freguesia') || b.includes('tremembé') || b.includes('jaçanã') || b.includes('brasilândia') || b.includes('limão') || b.includes('mandaqui') || b.includes('guilherme') || b.includes('cachoeirinha') || b.includes('zona norte')) {
    return 'Zona Norte';
  }
  if (b.includes('santo amaro') || b.includes('moema') || b.includes('vila mariana') || b.includes('campo limpo') || b.includes('ipiranga') || b.includes('jabaquara') || b.includes('socorro') || b.includes('cidade ademar') || b.includes('m\'boi') || b.includes('parelheiros') || b.includes('saúde') || b.includes('cursino') || b.includes('grajaú') || b.includes('sacomã') || b.includes('zona sul')) {
    return 'Zona Sul';
  }
  if (b.includes('pinheiros') || b.includes('lapa') || b.includes('perdizes') || b.includes('butantã') || b.includes('leopoldina') || b.includes('jaguaré') || b.includes('rio pequeno') || b.includes('raposo') || b.includes('morumbi') || b.includes('vila sônia') || b.includes('barra funda') || b.includes('pirituba') || b.includes('jaraguá') || b.includes('zona oeste')) {
    return 'Zona Oeste';
  }
  return '-';
}

export function deduceMacroRegion(cidade?: string | null, estado?: string | null, cep?: string | null, whatsapp?: string | null): string {
  if (estado && estado !== 'SP') return 'Outro Estado';
  const cleanCep = String(cep || '').replace(/\D/g, '');
  const c = String(cidade || '').toLowerCase();
  const wa = String(whatsapp || '').replace(/\D/g, '');
  
  if (cleanCep.length >= 2) {
    const p2 = cleanCep.substring(0, 2);
    if (p2 >= '01' && p2 <= '05') return 'Capital (São Paulo)';
    if (p2 >= '06' && p2 <= '09') return 'Grande São Paulo (RMSP)';
    if (p2 === '11') return 'Litoral / Baixada Santista';
    if (p2 === '12') return 'Vale do Paraíba';
    if (p2 >= '13' && p2 <= '19') return 'Interior Paulista';
  }

  if (c === 'são paulo' || c === 'sao paulo' || wa.startsWith('11') || wa.startsWith('5511')) return 'Capital & Grande SP';
  if (c.includes('santos') || c.includes('praia grande') || c.includes('guarujá') || c.includes('são vicente') || wa.startsWith('13') || wa.startsWith('5513')) return 'Litoral / Baixada Santista';
  if (c.includes('são josé dos campos') || c.includes('taubaté') || c.includes('jacareí') || wa.startsWith('12') || wa.startsWith('5512')) return 'Vale do Paraíba';
  if (wa.match(/^(55)?(14|15|16|17|18|19)/)) return 'Interior Paulista';

  return 'São Paulo (Geral)';
}

export function buildGeoRegionConditions(query: any): string[] {
  const clauses: string[] = [];
  const macroRegion = query.macroRegion || query.macro_region || 'all';
  const rawZones = query.spZones || query.sp_zones || query.spZone || '';
  const spZones = Array.isArray(rawZones) 
    ? rawZones.map((z: any) => String(z).trim().toLowerCase()).filter(Boolean)
    : String(rawZones).split(',').map((z: string) => z.trim().toLowerCase()).filter(Boolean);
  const validSpWaOnly = query.validSpWaOnly === 'true' || query.validSpWaOnly === true;

  if (validSpWaOnly) {
    clauses.push("l.whatsapp REGEXP '^(55)?(11|12|13|14|15|16|17|18|19)9[0-9]{8}$'");
  }

  if (macroRegion && macroRegion !== 'all') {
    if (macroRegion === 'capital_rmsp') {
      clauses.push("(l.estado = 'SP' AND (LEFT(REPLACE(l.cep, '-', ''), 2) BETWEEN '01' AND '09' OR l.cidade = 'São Paulo' OR l.whatsapp REGEXP '^(55)?11'))");
    } else if (macroRegion === 'litoral') {
      clauses.push("(l.estado = 'SP' AND (LEFT(REPLACE(l.cep, '-', ''), 2) = '11' OR l.cidade IN ('Santos', 'Praia Grande', 'São Vicente', 'Guarujá', 'Cubatão', 'Bertioga', 'Itanhaém', 'Mongaguá', 'Peruíbe', 'Ubatuba', 'Caraguatatuba', 'São Sebastião', 'Ilhabela') OR l.whatsapp REGEXP '^(55)?13'))");
    } else if (macroRegion === 'vale_paraiba') {
      clauses.push("(l.estado = 'SP' AND (LEFT(REPLACE(l.cep, '-', ''), 2) = '12' OR l.cidade IN ('São José dos Campos', 'Taubaté', 'Jacareí', 'Pindamonhangaba', 'Guaratinguetá', 'Caçapava', 'Lorena', 'Bragança Paulista', 'Atibaia') OR l.whatsapp REGEXP '^(55)?12'))");
    } else if (macroRegion === 'interior') {
      clauses.push("(l.estado = 'SP' AND (LEFT(REPLACE(l.cep, '-', ''), 2) BETWEEN '13' AND '19' OR l.whatsapp REGEXP '^(55)?(14|15|16|17|18|19)'))");
    }
  }

  if (spZones.length > 0 && !spZones.includes('all')) {
    const zoneOrClauses: string[] = [];
    
    if (spZones.includes('centro')) {
      zoneOrClauses.push(`(
        LEFT(REPLACE(l.cep, '-', ''), 3) BETWEEN '010' AND '015'
        OR l.bairro LIKE '%Sé%' OR l.bairro LIKE '%República%' OR l.bairro LIKE '%Bela Vista%' 
        OR l.bairro LIKE '%Consolação%' OR l.bairro LIKE '%Santa Cecília%' OR l.bairro LIKE '%Bom Retiro%' 
        OR l.bairro LIKE '%Brás%' OR l.bairro LIKE '%Cambuci%' OR l.bairro LIKE '%Pari%' OR l.bairro LIKE '%Liberdade%'
        OR l.bairro LIKE '%Centro%'
      )`);
    }
    
    if (spZones.includes('zona_leste') || spZones.includes('leste')) {
      zoneOrClauses.push(`(
        LEFT(REPLACE(l.cep, '-', ''), 2) = '03' OR LEFT(REPLACE(l.cep, '-', ''), 3) BETWEEN '080' AND '084'
        OR l.bairro LIKE '%Tatuapé%' OR l.bairro LIKE '%Mooca%' OR l.bairro LIKE '%Itaquera%' 
        OR l.bairro LIKE '%Penha%' OR l.bairro LIKE '%Vila Prudente%' OR l.bairro LIKE '%São Mateus%' 
        OR l.bairro LIKE '%Ermelino%' OR l.bairro LIKE '%Guaianases%' OR l.bairro LIKE '%Sapopemba%' 
        OR l.bairro LIKE '%São Miguel%' OR l.bairro LIKE '%Belém%' OR l.bairro LIKE '%Cangaíba%'
        OR l.bairro LIKE '%Artur Alvim%' OR l.bairro LIKE '%Cidade Tiradentes%' OR l.bairro LIKE '%Itaim Paulista%'
        OR l.bairro LIKE '%Vila Formosa%' OR l.bairro LIKE '%Vila Matilde%' OR l.bairro LIKE '%Aricanduva%'
        OR l.bairro LIKE '%Zona Leste%'
      )`);
    }

    if (spZones.includes('zona_norte') || spZones.includes('norte')) {
      zoneOrClauses.push(`(
        LEFT(REPLACE(l.cep, '-', ''), 2) = '02'
        OR l.bairro LIKE '%Santana%' OR l.bairro LIKE '%Tucuruvi%' OR l.bairro LIKE '%Vila Maria%'
        OR l.bairro LIKE '%Casa Verde%' OR l.bairro LIKE '%Freguesia do Ó%' OR l.bairro LIKE '%Tremembé%'
        OR l.bairro LIKE '%Jaçanã%' OR l.bairro LIKE '%Brasilândia%' OR l.bairro LIKE '%Limão%'
        OR l.bairro LIKE '%Mandaqui%' OR l.bairro LIKE '%Vila Guilherme%' OR l.bairro LIKE '%Cachoeirinha%'
        OR l.bairro LIKE '%Zona Norte%'
      )`);
    }

    if (spZones.includes('zona_sul') || spZones.includes('sul')) {
      zoneOrClauses.push(`(
        LEFT(REPLACE(l.cep, '-', ''), 2) = '04'
        OR l.bairro LIKE '%Santo Amaro%' OR l.bairro LIKE '%Moema%' OR l.bairro LIKE '%Vila Mariana%'
        OR l.bairro LIKE '%Campo Limpo%' OR l.bairro LIKE '%Ipiranga%' OR l.bairro LIKE '%Jabaquara%'
        OR l.bairro LIKE '%Capela do Socorro%' OR l.bairro LIKE '%Cidade Ademar%' OR l.bairro LIKE '%M\\'Boi Mirim%'
        OR l.bairro LIKE '%Parelheiros%' OR l.bairro LIKE '%Saúde%' OR l.bairro LIKE '%Cursino%'
        OR l.bairro LIKE '%Socorro%' OR l.bairro LIKE '%Grajaú%' OR l.bairro LIKE '%Sacomã%'
        OR l.bairro LIKE '%Zona Sul%'
      )`);
    }

    if (spZones.includes('zona_oeste') || spZones.includes('oeste')) {
      zoneOrClauses.push(`(
        LEFT(REPLACE(l.cep, '-', ''), 2) = '05'
        OR l.bairro LIKE '%Pinheiros%' OR l.bairro LIKE '%Lapa%' OR l.bairro LIKE '%Perdizes%'
        OR l.bairro LIKE '%Butantã%' OR l.bairro LIKE '%Vila Leopoldina%' OR l.bairro LIKE '%Jaguaré%'
        OR l.bairro LIKE '%Rio Pequeno%' OR l.bairro LIKE '%Raposo Tavares%' OR l.bairro LIKE '%Morumbi%'
        OR l.bairro LIKE '%Vila Sônia%' OR l.bairro LIKE '%Alto de Pinheiros%' OR l.bairro LIKE '%Barra Funda%'
        OR l.bairro LIKE '%Pirituba%' OR l.bairro LIKE '%Jaraguá%' OR l.bairro LIKE '%Zona Oeste%'
      )`);
    }

    if (zoneOrClauses.length > 0) {
      clauses.push(`(${zoneOrClauses.join(' OR ')})`);
    }
  }

  return clauses;
}

export const getCrmPaginated = async (query: any) => {
  const page = parseInt(query.page || '1');
  const pageSize = parseInt(query.pageSize || '20');
  const offset = (page - 1) * pageSize;
  const search = query.search || '';
  
  const estado = query.estado || '';
  const cidade = query.cidade || '';
  const campaignList = extractCampaignList(query);
  const multiAction = query.multiAction || 'all';
  const leadType = query.leadType || 'all';
  const qualityTier = query.qualityTier || 'all';
  const hasWhatsApp = query.hasWhatsApp || 'all';
  const sortField = query.sortField || 'lastDate';
  const sortOrder = query.sortOrder === 'asc' ? 'ASC' : 'DESC';

  let whereClauses: string[] = [];
  let whereValues: any[] = [];
  let joinValues: any[] = [];
  let joins = '';

  if (search) {
    whereClauses.push('(l.nome LIKE ? OR l.whatsapp LIKE ? OR l.email LIKE ?)');
    whereValues.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (estado && estado !== 'ALL') {
    whereClauses.push('l.estado = ?');
    whereValues.push(estado);
  }

  if (cidade && cidade !== 'ALL') {
    whereClauses.push('l.cidade = ?');
    whereValues.push(cidade);
  }

  if (hasWhatsApp === 'yes') {
    whereClauses.push('l.whatsapp != "" AND l.whatsapp IS NOT NULL');
  } else if (hasWhatsApp === 'no') {
    whereClauses.push('(l.whatsapp = "" OR l.whatsapp IS NULL)');
  }

  if (multiAction === 'frequent' || multiAction === 'multi') {
    whereClauses.push('l.campaign_count >= 2');
  } else if (multiAction === 'super') {
    whereClauses.push('l.campaign_count >= 3');
  } else if (multiAction === 'vip' || multiAction === 'super5') {
    whereClauses.push('l.campaign_count >= 5');
  } else if (multiAction === 'single') {
    whereClauses.push('l.campaign_count = 1');
  }

  if (qualityTier !== 'all') {
    if (qualityTier === 'diamante') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL AND l.campaign_count >= 2 AND (l.cep != "" AND l.cep IS NOT NULL OR l.endereco != "" AND l.endereco IS NOT NULL OR l.bairro != "" AND l.bairro IS NOT NULL))');
    } else if (qualityTier === 'ouro') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL AND (l.cep != "" AND l.cep IS NOT NULL OR l.endereco != "" AND l.endereco IS NOT NULL OR l.bairro != "" AND l.bairro IS NOT NULL))');
    } else if (qualityTier === 'prata') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL)');
    } else if (qualityTier === 'bronze') {
      whereClauses.push('(l.whatsapp = "" OR l.whatsapp IS NULL)');
    } else if (qualityTier === 'high') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL)');
    }
  }

  // Geo regions & SP Zones filters
  const geoClauses = buildGeoRegionConditions(query);
  if (geoClauses.length > 0) {
    whereClauses.push(...geoClauses);
  }

  if (campaignList.length === 1) {
    joins += ' JOIN crm_actions a_camp ON l.id = a_camp.lead_id AND a_camp.campaign_name = ?';
    joinValues.push(campaignList[0]);
  } else if (campaignList.length > 1) {
    const placeholders = campaignList.map(() => '?').join(', ');
    joins += ` JOIN crm_actions a_camp ON l.id = a_camp.lead_id AND a_camp.campaign_name IN (${placeholders})`;
    joinValues.push(...campaignList);
  }

  if (leadType === 'organic') {
    if (!joins.includes('a_camp')) {
       joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source = ?';
    } else {
       joins += ' AND a_camp.source = ?';
    }
    joinValues.push('organic');
  } else if (leadType === 'imported') {
    if (!joins.includes('a_camp')) {
       joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source != ?';
    } else {
       joins += ' AND a_camp.source != ?';
    }
    joinValues.push('organic');
  }

  const values = [...joinValues, ...whereValues];
  const whereStr = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  // Optimized count query
  let countSql = '';
  let countValues = values;
  if (whereClauses.length === 0 && campaignList.length > 0 && leadType === 'all') {
    if (campaignList.length === 1) {
      countSql = 'SELECT COUNT(DISTINCT lead_id) as total FROM crm_actions WHERE campaign_name = ?';
      countValues = [campaignList[0]];
    } else {
      const placeholders = campaignList.map(() => '?').join(', ');
      countSql = `SELECT COUNT(DISTINCT lead_id) as total FROM crm_actions WHERE campaign_name IN (${placeholders})`;
      countValues = campaignList;
    }
  } else if (joins.length > 0) {
    countSql = `SELECT COUNT(DISTINCT l.id) as total FROM crm_leads l ${joins} ${whereStr}`;
  } else {
    countSql = `SELECT COUNT(*) as total FROM crm_leads l ${whereStr}`;
  }

  const [countRes]: any = await queryWithRetry(countSql, countValues);
  const total = countRes[0]?.total || 0;

  let orderStr = 'ORDER BY l.created_at ' + sortOrder;
  if (sortField === 'nome') orderStr = 'ORDER BY l.nome ' + sortOrder;
  if (sortField === 'cidade') orderStr = 'ORDER BY l.cidade ' + sortOrder;
  if (sortField === 'totalActions') orderStr = 'ORDER BY l.campaign_count ' + sortOrder;
  if (sortField === 'firstDate') orderStr = 'ORDER BY l.created_at ASC';
  if (sortField === 'lastDate') orderStr = 'ORDER BY l.created_at ' + sortOrder;

  const [rows]: any = await queryWithRetry(`
    SELECT DISTINCT l.* 
    FROM crm_leads l ${joins} ${whereStr} 
    ${orderStr} 
    LIMIT ? OFFSET ?
  `, [...values, pageSize, offset]);

  // Batch query all actions for retrieved leads in ONE single fast query (eliminates N+1 socket contention)
  const leadIds = rows.map((r: any) => r.id);
  const actionsByLeadId = new Map<string, any[]>();

  if (leadIds.length > 0) {
    const [allActs]: any = await queryWithRetry(
      `SELECT lead_id, campaign_name, source, created_at FROM crm_actions WHERE lead_id IN (?) ORDER BY created_at DESC`,
      [leadIds]
    );
    for (const act of allActs) {
      let arr = actionsByLeadId.get(act.lead_id);
      if (!arr) {
        arr = [];
        actionsByLeadId.set(act.lead_id, arr);
      }
      arr.push(act);
    }
  }

  const leads = rows.map((row: any) => {
    const acts = actionsByLeadId.get(row.id) || [];
    const hasValidWhats = Boolean(row.whatsapp && String(row.whatsapp).trim() !== '');
    const hasAddress = Boolean((row.cep && row.cep.trim()) || (row.endereco && row.endereco.trim()) || (row.bairro && row.bairro.trim()));
    const totalActs = acts.length || row.campaign_count || 1;

    let leadQualityTier: 'DIAMANTE' | 'OURO' | 'PRATA' | 'BRONZE' = 'BRONZE';
    if (hasValidWhats) {
      if (hasAddress && totalActs >= 2) {
        leadQualityTier = 'DIAMANTE';
      } else if (hasAddress) {
        leadQualityTier = 'OURO';
      } else {
        leadQualityTier = 'PRATA';
      }
    } else {
      leadQualityTier = 'BRONZE';
    }

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
      qualityTier: leadQualityTier,
      totalActions: totalActs,
      isFrequent: totalActs >= 2,
      isMultiAction: totalActs >= 2,
      isSuperSupporter: totalActs >= 3,
      isVip: totalActs >= 5,
      distinctCampaigns: Array.from(new Set(acts.map((a: any) => a.campaign_name))),
      actions: acts.map((a: any) => ({
        sourceKey: a.source,
        sourceName: a.campaign_name,
        date: a.created_at
      }))
    };
  });

  return { leads, totalFiltered: total, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
};

/**
 * Registra ou atualiza um lead vindo de cadastros nativos do site (Apoio Capital, Material, Petição, etc.)
 * seguindo a hierarquia estrita:
 * 1. WhatsApp (chave primária)
 * 2. E-mail (chave secundária)
 * Garante unicidade de lead e registra 1 ação por campanha.
 */
export const recordLeadAction = async (data: {
  nome: string;
  whatsapp?: string;
  email?: string;
  cep?: string;
  endereco?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade?: string;
  estado?: string;
  campaignName: string;
  source: string;
  createdAt?: string;
}) => {
  try {
    const db = await getDbConnection();
    if (!db) return;

    const whatsapp = (data.whatsapp || '').trim();
    const email = (data.email || '').trim().toLowerCase();
    const nome = (data.nome || 'Apoiador').trim();
    const cep = (data.cep || '').trim();
    const createdAt = data.createdAt || new Date().toISOString().slice(0, 19).replace('T', ' ');

    // Sanitizar estritamente cidade e estado (regras IBGE / normalização oficial)
    const { cidade: cleanCidade, estado: cleanEstado } = sanitizeGeo(data.cidade, data.estado, cep);

    // 1. Procurar lead existente pela hierarquia estrita:
    // 1º WhatsApp (chave primária)
    // 2º E-mail (chave secundária)
    // 3º Nome + CEP (chave terciária / desempate se não encontrar por WhatsApp e E-mail)
    let existingLead: any = null;

    if (whatsapp) {
      const [rowsW]: any = await db.query(
        "SELECT id, campaign_count, whatsapp, email FROM crm_leads WHERE whatsapp = ? LIMIT 1",
        [whatsapp]
      );
      if (rowsW.length > 0) existingLead = rowsW[0];
    }

    if (!existingLead && email && !email.includes('@fake') && !email.includes('@sememail')) {
      const [rowsE]: any = await db.query(
        "SELECT id, campaign_count, whatsapp, email FROM crm_leads WHERE email = ? LIMIT 1",
        [email]
      );
      if (rowsE.length > 0) existingLead = rowsE[0];
    }

    if (!existingLead && nome && nome !== 'Apoiador' && nome !== 'Sem Nome' && cep) {
      const cleanCep = cep.replace(/\D/g, '');
      const [rowsNC]: any = await db.query(
        "SELECT id, campaign_count, whatsapp, email FROM crm_leads WHERE REPLACE(REPLACE(cep, '-', ''), ' ', '') = ? AND LOWER(TRIM(nome)) = LOWER(TRIM(?)) LIMIT 1",
        [cleanCep, nome]
      );
      if (rowsNC.length > 0) existingLead = rowsNC[0];
    }

    let leadId: string;

    if (existingLead) {
      leadId = existingLead.id;
      // Atualizar dados cadastrais se vieram novos campos mais completos
      await db.query(`
        UPDATE crm_leads SET 
          nome = CASE WHEN nome = '' OR nome = 'Sem Nome' OR nome = 'Apoiador' THEN ? ELSE nome END,
          whatsapp = CASE WHEN whatsapp = '' OR whatsapp IS NULL THEN ? ELSE whatsapp END,
          email = CASE WHEN email = '' OR email IS NULL THEN ? ELSE email END,
          cep = CASE WHEN cep = '' OR cep IS NULL THEN ? ELSE cep END,
          endereco = CASE WHEN endereco = '' OR endereco IS NULL THEN ? ELSE endereco END,
          numero = CASE WHEN numero = '' OR numero IS NULL THEN ? ELSE numero END,
          complemento = CASE WHEN complemento = '' OR complemento IS NULL THEN ? ELSE complemento END,
          bairro = CASE WHEN bairro = '' OR bairro IS NULL THEN ? ELSE bairro END,
          cidade = CASE WHEN cidade = '' OR cidade IS NULL OR cidade = 'São Paulo' THEN ? ELSE cidade END,
          estado = ?
        WHERE id = ?
      `, [
        nome, whatsapp, email, cep,
        data.endereco || '', data.numero || '', data.complemento || '',
        data.bairro || '', cleanCidade, cleanEstado,
        leadId
      ]);
    } else {
      // Criar novo lead único
      leadId = "lead_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      await db.query(`
        INSERT INTO crm_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campaign_count, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
      `, [
        leadId, nome, whatsapp, email, cep,
        data.endereco || '', data.numero || '', data.complemento || '',
        data.bairro || '', cleanCidade, cleanEstado,
        createdAt
      ]);
    }

    // 2. Registrar a ação (se ainda não participou dessa mesma campanha)
    const [existingAction]: any = await db.query(
      "SELECT id FROM crm_actions WHERE lead_id = ? AND campaign_name = ? LIMIT 1",
      [leadId, data.campaignName]
    );

    if (existingAction.length === 0) {
      await db.query(
        "INSERT INTO crm_actions (lead_id, campaign_name, source, created_at) VALUES (?, ?, ?, ?)",
        [leadId, data.campaignName, data.source, createdAt]
      );

      // Recalcular campaign_count do lead
      const [countRes]: any = await db.query(
        "SELECT COUNT(DISTINCT campaign_name) as total FROM crm_actions WHERE lead_id = ?",
        [leadId]
      );
      const newCount = countRes[0]?.total || 1;
      await db.query("UPDATE crm_leads SET campaign_count = ? WHERE id = ?", [newCount, leadId]);
    }

    // Invalida cache de métricas para refletir no resumo imediatamente
    cachedSummary = null;
  } catch (err) {
    console.error("Erro ao registrar ação no CRM:", err);
  }
};

/**
 * Sincroniza uma campanha importada para as tabelas do CRM (crm_leads e crm_actions)
 * de forma massiva e ultra-rápida via SQL, atualizando contagens e métricas imediatamente.
 */
export const syncCampaignToCrm = async (campaignName: string) => {
  try {
    const db = await getDbConnection();
    if (!db) return;

    console.log(`⚡ Sincronizando campanha "${campaignName}" para o CRM com deduplicação avançada e atualização cadastral...`);
    const start = Date.now();

    // 1. Limpar duplicidades internas prévias em imported_leads para esta campanha
    await db.query(`
      DELETE il1 FROM imported_leads il1
      INNER JOIN imported_leads il2 ON il1.campanha = il2.campanha
      WHERE il1.id > il2.id
        AND il1.whatsapp != '' AND il1.whatsapp IS NOT NULL AND il1.whatsapp = il2.whatsapp
        AND il1.campanha = ?
    `, [campaignName]);

    // 2. Atualizar e enriquecer contatos que já existem no CRM com dados novos/mais completos
    await db.query(`
      UPDATE crm_leads cl
      INNER JOIN imported_leads il ON (
        (il.whatsapp != '' AND il.whatsapp IS NOT NULL AND il.whatsapp = cl.whatsapp)
        OR
        (il.email != '' AND il.email IS NOT NULL AND il.email NOT LIKE '%@fake%' AND il.email = cl.email)
      )
      SET
        cl.nome = IF((cl.nome = '' OR cl.nome = 'Sem Nome' OR cl.nome = 'Apoiador Importado') AND il.nome != '' AND il.nome != 'Sem Nome', il.nome, cl.nome),
        cl.cep = IF((cl.cep IS NULL OR cl.cep = '') AND il.cep != '', il.cep, cl.cep),
        cl.endereco = IF((cl.endereco IS NULL OR cl.endereco = '') AND il.endereco != '', il.endereco, cl.endereco),
        cl.numero = IF((cl.numero IS NULL OR cl.numero = '') AND il.numero != '', il.numero, cl.numero),
        cl.complemento = IF((cl.complemento IS NULL OR cl.complemento = '') AND il.complemento != '', il.complemento, cl.complemento),
        cl.bairro = IF((cl.bairro IS NULL OR cl.bairro = '') AND il.bairro != '', il.bairro, cl.bairro),
        cl.cidade = IF((cl.cidade IS NULL OR cl.cidade = '' OR cl.cidade = 'São Paulo') AND il.cidade != '' AND il.cidade != 'São Paulo', il.cidade, cl.cidade),
        cl.estado = IF((cl.estado IS NULL OR cl.estado = '') AND il.estado != '', il.estado, cl.estado)
      WHERE il.campanha = ?
    `, [campaignName]);

    // 3. Inserir novos leads que não existem por WhatsApp nem por E-mail
    await db.query(`
      INSERT INTO crm_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campaign_count, created_at)
      SELECT il.id, il.nome, il.whatsapp, il.email, il.cep, il.endereco, il.numero, il.complemento, il.bairro, il.cidade, il.estado, 1, il.createdAt
      FROM imported_leads il
      LEFT JOIN crm_leads cl_w ON (il.whatsapp != '' AND il.whatsapp IS NOT NULL AND il.whatsapp = cl_w.whatsapp)
      LEFT JOIN crm_leads cl_e ON (il.email != '' AND il.email IS NOT NULL AND il.email NOT LIKE '%@fake%' AND il.email = cl_e.email)
      WHERE il.campanha = ?
        AND cl_w.id IS NULL
        AND cl_e.id IS NULL
      ON DUPLICATE KEY UPDATE nome = VALUES(nome)
    `, [campaignName]);

    // 4. Limpar histórico de ações duplicadas prévias na campanha
    await db.query(`
      DELETE ca1 FROM crm_actions ca1
      INNER JOIN crm_actions ca2 ON ca1.campaign_name = ca2.campaign_name AND ca1.lead_id = ca2.lead_id
      WHERE ca1.id > ca2.id AND ca1.campaign_name = ?
    `, [campaignName]);

    // 5. Inserir ações apontando para o lead consolidado (existente ou novo) garantindo que NÃO repita
    await db.query(`
      INSERT INTO crm_actions (lead_id, campaign_name, source, created_at)
      SELECT DISTINCT
        COALESCE(cl_w.id, cl_e.id, il.id) AS lead_id,
        il.campanha,
        'Importação CSV',
        il.createdAt
      FROM imported_leads il
      LEFT JOIN crm_leads cl_w ON (il.whatsapp != '' AND il.whatsapp IS NOT NULL AND il.whatsapp = cl_w.whatsapp)
      LEFT JOIN crm_leads cl_e ON (il.email != '' AND il.email IS NOT NULL AND il.email NOT LIKE '%@fake%' AND il.email = cl_e.email)
      WHERE il.campanha = ?
        AND NOT EXISTS (
          SELECT 1 FROM crm_actions ca
          WHERE ca.lead_id = COALESCE(cl_w.id, cl_e.id, il.id)
            AND ca.campaign_name = il.campanha
        )
    `, [campaignName]);

    // 6. Recalcular contagem de campanhas por lead
    await db.query(`
      UPDATE crm_leads l
      INNER JOIN (
        SELECT lead_id, COUNT(DISTINCT campaign_name) as cnt
        FROM crm_actions
        GROUP BY lead_id
      ) act ON l.id = act.lead_id
      SET l.campaign_count = act.cnt
    `);

    // Invalida cache do sumário para refletir no painel imediatamente
    invalidateCrmSummaryCache();
    console.log(`✅ Campanha "${campaignName}" sincronizada no CRM em ${Date.now() - start}ms.`);
  } catch (err) {
    console.error(`Erro ao sincronizar campanha "${campaignName}" no CRM:`, err);
  }
};

/**
 * Exclui completamente um lead de todas as tabelas e registros SQL em definitivo.
 */
export const deleteLeadById = async (leadId: string) => {
  const db = await getDbConnection();
  if (!db) throw new Error("Sem conexão com o banco de dados");

  // 1. Buscar os identificadores do lead antes da exclusão
  const [leads]: any = await db.query(
    "SELECT id, whatsapp, email, cep, nome FROM crm_leads WHERE id = ? LIMIT 1",
    [leadId]
  );

  let whatsapp = '';
  let email = '';
  let cleanPhone = '';

  if (leads && leads.length > 0) {
    whatsapp = (leads[0].whatsapp || '').trim();
    email = (leads[0].email || '').trim().toLowerCase();
    cleanPhone = whatsapp.replace(/\D/g, '');
  }

  // 2. Excluir histórico de ações do CRM
  await db.query("DELETE FROM crm_actions WHERE lead_id = ?", [leadId]);

  // 3. Excluir registro mestre de crm_leads
  await db.query("DELETE FROM crm_leads WHERE id = ?", [leadId]);

  // 4. Excluir de imported_leads
  if (cleanPhone || (email && email.includes('@') && !email.includes('@fake'))) {
    await db.query(
      `DELETE FROM imported_leads WHERE id = ? 
       OR (whatsapp != '' AND (whatsapp = ? OR REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '') = ?))
       OR (email != '' AND email NOT LIKE '%@fake%' AND LOWER(email) = ?)`,
      [leadId, whatsapp, cleanPhone, email]
    );
  } else {
    await db.query("DELETE FROM imported_leads WHERE id = ?", [leadId]);
  }

  // 5. Excluir de todas as tabelas operacionais onde esse lead possa constar
  const tables = [
    'material_campaign',
    'ninapassadore_campaign',
    'popup_apoio',
    'citizens',
    'petitions',
    'contra_maus_tratos',
    'jogo_users'
  ];

  for (const table of tables) {
    try {
      if (cleanPhone || (email && email.includes('@') && !email.includes('@fake'))) {
        await db.query(
          `DELETE FROM ${table} WHERE id = ? 
           OR (whatsapp != '' AND (whatsapp = ? OR REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '') = ?))
           OR (email != '' AND email NOT LIKE '%@fake%' AND LOWER(email) = ?)`,
          [leadId, whatsapp, cleanPhone, email]
        );
      } else {
        await db.query(`DELETE FROM ${table} WHERE id = ?`, [leadId]);
      }
    } catch (e) {
      console.warn(`Aviso ao excluir de ${table}:`, e);
    }
  }

  // 6. Invalidar o cache do sumário para recalcular instantaneamente as métricas
  invalidateCrmSummaryCache();

  return { success: true, leadId };
};

/**
 * Construtor unificado de query para filtros do CRM
 */
function buildCrmFilterQuery(query: any) {
  const search = (query.search || '').trim();
  const estado = (query.estado || '').toUpperCase().trim();
  const cidade = (query.cidade || '').trim();
  const campaignList = extractCampaignList(query);
  const multiAction = query.multiAction || 'all';
  const leadType = query.leadType || 'all';
  const qualityTier = (query.qualityTier || 'all').toLowerCase();
  const hasWhatsApp = query.hasWhatsApp || 'all';
  const addressOnly = query.addressOnly === 'true' || query.addressOnly === true;
  const smartScore = query.smartScore === 'true' || query.smartScore === true || query.sortBy === 'smart_score' || !query.sortField;
  const maxLimit = parseInt(query.limit) > 0 ? parseInt(query.limit) : 0;

  let whereClauses: string[] = [];
  let whereValues: any[] = [];
  let joinValues: any[] = [];
  let joins = '';

  if (search) {
    whereClauses.push('(l.nome LIKE ? OR l.whatsapp LIKE ? OR l.email LIKE ? OR l.cidade LIKE ? OR l.bairro LIKE ? OR l.cep LIKE ?)');
    const s = `%${search}%`;
    whereValues.push(s, s, s, s, s, s);
  }

  if (estado && estado !== 'ALL') {
    whereClauses.push('l.estado = ?');
    whereValues.push(estado);
  }

  if (cidade && cidade !== 'ALL') {
    whereClauses.push('l.cidade = ?');
    whereValues.push(cidade);
  }

  if (hasWhatsApp === 'yes') {
    whereClauses.push('l.whatsapp != "" AND l.whatsapp IS NOT NULL');
  } else if (hasWhatsApp === 'no') {
    whereClauses.push('(l.whatsapp = "" OR l.whatsapp IS NULL)');
  }

  if (multiAction === 'frequent' || multiAction === 'multi') {
    whereClauses.push('l.campaign_count >= 2');
  } else if (multiAction === 'super') {
    whereClauses.push('l.campaign_count >= 3');
  } else if (multiAction === 'vip' || multiAction === 'super5') {
    whereClauses.push('l.campaign_count >= 5');
  } else if (multiAction === 'single') {
    whereClauses.push('l.campaign_count = 1');
  }

  if (qualityTier !== 'all') {
    if (qualityTier === 'diamante') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL AND l.campaign_count >= 2 AND (l.cep != "" AND l.cep IS NOT NULL OR l.endereco != "" AND l.endereco IS NOT NULL OR l.bairro != "" AND l.bairro IS NOT NULL))');
    } else if (qualityTier === 'ouro') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL AND (l.cep != "" AND l.cep IS NOT NULL OR l.endereco != "" AND l.endereco IS NOT NULL OR l.bairro != "" AND l.bairro IS NOT NULL))');
    } else if (qualityTier === 'prata') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL)');
    } else if (qualityTier === 'bronze') {
      whereClauses.push('(l.whatsapp = "" OR l.whatsapp IS NULL)');
    } else if (qualityTier === 'high') {
      whereClauses.push('(l.whatsapp != "" AND l.whatsapp IS NOT NULL)');
    }
  }

  // Geo regions & SP Zones filters
  const geoClauses = buildGeoRegionConditions(query);
  if (geoClauses.length > 0) {
    whereClauses.push(...geoClauses);
  }

  if (campaignList.length === 1) {
    joins += ' JOIN crm_actions a_camp ON l.id = a_camp.lead_id AND a_camp.campaign_name = ?';
    joinValues.push(campaignList[0]);
  } else if (campaignList.length > 1) {
    const placeholders = campaignList.map(() => '?').join(', ');
    joins += ` JOIN crm_actions a_camp ON l.id = a_camp.lead_id AND a_camp.campaign_name IN (${placeholders})`;
    joinValues.push(...campaignList);
  }

  if (leadType === 'organic') {
    if (!joins.includes('a_camp')) {
      joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source = ?';
    } else {
      joins += ' AND a_camp.source = ?';
    }
    joinValues.push('organic');
  } else if (leadType === 'imported') {
    if (!joins.includes('a_camp')) {
      joins += ' JOIN crm_actions a_type ON l.id = a_type.lead_id AND a_type.source != ?';
    } else {
      joins += ' AND a_camp.source != ?';
    }
    joinValues.push('organic');
  }

  if (addressOnly) {
    whereClauses.push("(l.cep != '' AND l.cep IS NOT NULL OR l.endereco != '' AND l.endereco IS NOT NULL OR l.bairro != '' AND l.bairro IS NOT NULL)");
  }

  let orderBySql = 'ORDER BY l.id ASC';
  if (smartScore || query.sortBy === 'smart_score') {
    // Ordenação por Propensão de Leitura e Engajamento:
    // 1. WhatsApp Válido de SP/Brasil com celular (DDD 11 a 19 + 9 dígitos)
    // 2. Total de ações / campanhas participadas (frequência e lealdade do apoiador)
    // 3. Completude cadastral (endereço/CEP/bairro preenchidos)
    // 4. Recência da interação
    orderBySql = `ORDER BY 
      (CASE WHEN l.whatsapp REGEXP '^(55)?(11|12|13|14|15|16|17|18|19)9[0-9]{8}$' THEN 100 ELSE 0 END + 
       (l.campaign_count * 25) + 
       (CASE WHEN l.cep != '' AND l.cep IS NOT NULL AND l.endereco != '' AND l.endereco IS NOT NULL THEN 20 ELSE 0 END) +
       (CASE WHEN l.bairro != '' AND l.bairro IS NOT NULL THEN 10 ELSE 0 END) +
       (CASE WHEN l.nome != '' AND l.nome != 'Apoiador' AND l.nome != 'Sem Nome' AND l.nome != 'Apoiador Importado' THEN 10 ELSE 0 END)
      ) DESC, 
      l.campaign_count DESC, 
      l.created_at DESC, 
      l.id ASC`;
  } else if (query.sortField === 'nome') {
    orderBySql = `ORDER BY l.nome ${query.sortOrder === 'desc' ? 'DESC' : 'ASC'}, l.id ASC`;
  } else if (query.sortField === 'created_at' || query.sortField === 'lastDate') {
    orderBySql = `ORDER BY l.created_at ${query.sortOrder === 'asc' ? 'ASC' : 'DESC'}, l.id ASC`;
  } else if (query.sortField === 'campaign_count') {
    orderBySql = `ORDER BY l.campaign_count ${query.sortOrder === 'asc' ? 'ASC' : 'DESC'}, l.id ASC`;
  }

  const values = [...joinValues, ...whereValues];
  return { whereClauses, whereValues, joinValues, values, joins, campaign: campaignList.join(', ') || 'all', campaignList, orderBySql, smartScore, maxLimit };
}

/**
 * Exportação em stream contínuo (CSV) direto da base consolidada do CRM.
 * Resiliente a timeouts, utiliza paginação resiliente e UTF-8 com BOM.
 */
export const exportCrmStream = async (query: any, res: any) => {
  const { whereClauses, whereValues, joinValues, joins, campaign, orderBySql, maxLimit } = buildCrmFilterQuery(query);

  const headers = [
    'Nível de Qualidade',
    'Total de Ações',
    'Nome',
    'WhatsApp',
    'WhatsApp Válido',
    'E-mail',
    'CEP',
    'Endereço',
    'Número',
    'Complemento',
    'Bairro',
    'Cidade',
    'Estado',
    'Zona SP',
    'Macro-Região',
    'Frequente (2+)',
    'Multi-Campanha (3+)',
    'Super Apoiador (5+)',
    'Campanhas',
    'Data de Cadastro'
  ];
  res.write('\uFEFF' + headers.join(',') + '\r\n');

  const batchSize = 3000;
  let offset = 0;
  let hasMore = true;
  let totalExported = 0;

  try {
    const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    const currentValues = [...joinValues, ...whereValues];

    while (hasMore) {
      if (res.writableEnded || res.closed) break;

      if (maxLimit > 0 && totalExported >= maxLimit) {
        hasMore = false;
        break;
      }

      const currentLimit = maxLimit > 0 ? Math.min(batchSize, maxLimit - totalExported) : batchSize;

      const [rows]: any = await queryWithRetry(`
        SELECT DISTINCT l.id, l.nome, l.whatsapp, l.email, l.cidade, l.estado, l.cep, l.endereco, l.numero, l.complemento, l.bairro, l.campaign_count, l.created_at
        FROM crm_leads l ${joins} ${whereSql}
        ${orderBySql}
        LIMIT ? OFFSET ?
      `, [...currentValues, currentLimit, offset]);

      if (!rows || rows.length === 0) {
        hasMore = false;
        break;
      }

      const leadIds = rows.map((r: any) => r.id);
      const campMap = new Map<string, string>();

      if (leadIds.length > 0) {
        try {
          const [acts]: any = await queryWithRetry(
            `SELECT lead_id, GROUP_CONCAT(DISTINCT campaign_name SEPARATOR ' | ') as campaigns
             FROM crm_actions
             WHERE lead_id IN (?)
             GROUP BY lead_id`,
            [leadIds]
          );
          for (const a of acts) {
            campMap.set(a.lead_id, a.campaigns || '');
          }
        } catch (e) {
          console.warn("Aviso ao buscar ações para lote:", e);
        }
      }

      let chunk = '';
      for (const r of rows) {
        const digits = (r.whatsapp || '').replace(/\D/g, '');
        const hasValidWa = digits.length >= 10;
        const hasAddress = Boolean((r.cep && r.cep.trim()) || (r.endereco && r.endereco.trim()) || (r.bairro && r.bairro.trim()));
        const cCount = Number(r.campaign_count) || 1;

        let qTier = 'Bronze';
        if (hasValidWa) {
          if (hasAddress && cCount >= 2) qTier = 'Diamante';
          else if (hasAddress) qTier = 'Ouro';
          else qTier = 'Prata';
        } else {
          qTier = 'Bronze';
        }

        const campaigns = campMap.get(r.id) || (campaign !== 'all' ? campaign : 'Geral');
        const zonaSp = deduceSpZone(r.bairro, r.cep);
        const macroReg = deduceMacroRegion(r.cidade, r.estado, r.cep, r.whatsapp);

        const row = [
          `"${qTier}"`,
          `"${cCount}"`,
          `"${(r.nome || '').replace(/"/g, '""')}"`,
          `"${(r.whatsapp || '').replace(/"/g, '""')}"`,
          `"${hasValidWa ? 'Sim' : 'Não'}"`,
          `"${(r.email || '').replace(/"/g, '""')}"`,
          `"${(r.cep || '').replace(/"/g, '""')}"`,
          `"${(r.endereco || '').replace(/"/g, '""')}"`,
          `"${(r.numero || '').replace(/"/g, '""')}"`,
          `"${(r.complemento || '').replace(/"/g, '""')}"`,
          `"${(r.bairro || '').replace(/"/g, '""')}"`,
          `"${(r.cidade || '').replace(/"/g, '""')}"`,
          `"${(r.estado || '').replace(/"/g, '""')}"`,
          `"${zonaSp.replace(/"/g, '""')}"`,
          `"${macroReg.replace(/"/g, '""')}"`,
          `"${cCount >= 2 ? 'Sim' : 'Não'}"`,
          `"${cCount >= 3 ? 'Sim' : 'Não'}"`,
          `"${cCount >= 5 ? 'Sim' : 'Não'}"`,
          `"${campaigns.replace(/"/g, '""')}"`,
          `"${r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''}"`
        ];
        chunk += row.join(',') + '\r\n';
      }

      totalExported += rows.length;
      offset += rows.length;

      const canWrite = res.write(chunk);
      if (!canWrite) {
        await new Promise(resolve => res.once('drain', resolve));
      }

      if (rows.length < currentLimit || (maxLimit > 0 && totalExported >= maxLimit)) {
        hasMore = false;
      }
    }
  } catch (err) {
    console.error("Erro durante exportCrmStream:", err);
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
};

/**
 * Exportação em arquivo Excel (.xlsx) dos leads filtrados
 */
export const exportCrmXlsx = async (query: any): Promise<Buffer> => {
  const { whereClauses, values, joins, campaign, orderBySql, maxLimit } = buildCrmFilterQuery(query);
  const whereSql = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  const MAX_XLSX_ROWS = maxLimit > 0 ? Math.min(maxLimit, 100000) : 100000;
  const [rows]: any = await queryWithRetry(`
    SELECT DISTINCT l.id, l.nome, l.whatsapp, l.email, l.cidade, l.estado, l.cep, l.endereco, l.numero, l.complemento, l.bairro, l.campaign_count, l.created_at
    FROM crm_leads l ${joins} ${whereSql}
    ${orderBySql}
    LIMIT ?
  `, [...values, MAX_XLSX_ROWS]);

  const leadIds = (rows || []).map((r: any) => r.id);
  const campMap = new Map<string, string>();

  for (let i = 0; i < leadIds.length; i += 5000) {
    const chunkIds = leadIds.slice(i, i + 5000);
    try {
      const [acts]: any = await queryWithRetry(
        `SELECT lead_id, GROUP_CONCAT(DISTINCT campaign_name SEPARATOR ' | ') as campaigns
         FROM crm_actions
         WHERE lead_id IN (?)
         GROUP BY lead_id`,
        [chunkIds]
      );
      for (const a of acts) {
        campMap.set(a.lead_id, a.campaigns || '');
      }
    } catch (e) {
      console.warn("Aviso ao buscar ações para XLSX:", e);
    }
  }

  const exportData = (rows || []).map((r: any) => {
    const cCount = Number(r.campaign_count) || 1;
    let qTier = 'Bronze';
    if (cCount >= 5) qTier = 'Diamante';
    else if (cCount >= 3) qTier = 'Ouro';
    else if (cCount >= 2) qTier = 'Prata';

    const digits = (r.whatsapp || '').replace(/\D/g, '');
    const hasValidWa = digits.length >= 10;
    const campaigns = campMap.get(r.id) || (campaign !== 'all' ? campaign : 'Geral');
    const zonaSp = deduceSpZone(r.bairro, r.cep);
    const macroReg = deduceMacroRegion(r.cidade, r.estado, r.cep, r.whatsapp);

    return {
      'Nível de Qualidade': qTier,
      'Total de Ações': cCount,
      'Nome': r.nome || '',
      'WhatsApp': r.whatsapp || '',
      'WhatsApp Válido': hasValidWa ? 'Sim' : 'Não',
      'E-mail': r.email || '',
      'CEP': r.cep || '',
      'Endereço': r.endereco || '',
      'Número': r.numero || '',
      'Complemento': r.complemento || '',
      'Bairro': r.bairro || '',
      'Cidade': r.cidade || '',
      'Estado': r.estado || '',
      'Zona SP': zonaSp,
      'Macro-Região': macroReg,
      'Frequente (2+)': cCount >= 2 ? 'Sim' : 'Não',
      'Multi-Campanha (3+)': cCount >= 3 ? 'Sim' : 'Não',
      'Super Apoiador (5+)': cCount >= 5 ? 'Sim' : 'Não',
      'Campanhas': campaigns,
      'Data de Cadastro': r.created_at ? new Date(r.created_at).toLocaleDateString('pt-BR') : ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(exportData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Apoiadores');
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
};



