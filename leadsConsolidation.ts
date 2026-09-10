import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
import AdmZip from 'adm-zip';
import { getDbConnection } from './db.js';

export interface LeadAction {
  id: string;
  sourceKey: string;
  sourceName: string;
  sourceCategory: string;
  date: string;
  details?: Record<string, any>;
}

export interface ConsolidatedLead {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  totalActions: number;
  isMultiAction: boolean;
  isSuperSupporter?: boolean;
  distinctCampaigns: string[];
  firstDate: string;
  lastDate: string;
  actions: LeadAction[];
  cpf?: string;
  otherPhones?: string[];
  extraData?: Record<string, any>;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  name: string;
  count: number;
  totalActions: number;
  multiCount: number;
  densityColor: string;
  radius: number;
}

export interface LeadsSummary {
  totalUniqueLeads: number;
  totalSubmissions: number;
  multiActionLeadsCount: number;
  superSupportersCount: number;
  spLeadsCount: number;
  stateOptions: string[];
  cityOptions: { name: string; count: number }[];
  campaignOptions: string[];
  spHeatmapPoints: HeatmapPoint[];
  lastUpdated: string;
}

export interface PhysicalMaterialItem {
  id: string;
  date: string;
  source: string;
  nome: string;
  sobrenome?: string;
  whatsapp: string;
  email: string;
  adesivoPerfurado: boolean;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
}

const CACHE_FILE = path.join(process.cwd(), 'leads_cache.json');
const CACHE_META_FILE = path.join(process.cwd(), 'leads_cache_meta.json');
const CACHE_DIR = path.join(process.cwd(), 'leads_cache_parts');
const CACHE_VERSION = 'v4_chunked_cache';
const SUMMARY_CACHE_FILE = path.join(process.cwd(), 'leads_summary.json');
const MUNICIPIOS_FILE = path.join(process.cwd(), 'public', 'municipios.json');
const SP_CITIES_FILE = path.join(process.cwd(), 'sp-cities.json');

// Normalization utilities
export function fixMojibake(str?: string | null): string {
  if (!str) return '';
  return str
    .replace(/Ã£|ã£/g, 'ã')
    .replace(/Ã§|ã§/g, 'ç')
    .replace(/Ã¡|ã¡/g, 'á')
    .replace(/Ã©|ã©/g, 'é')
    .replace(/Ã­|ã­/g, 'í')
    .replace(/Ã³/g, 'ó')
    .replace(/ã³/g, 'ó')
    .replace(/Ãº|ãº/g, 'ú')
    .replace(/Ã¢|ã¢/g, 'â')
    .replace(/Ãª|ãª/g, 'ê')
    .replace(/Ã´|ã´/g, 'ô')
    .replace(/Ãµ|ãµ/g, 'õ')
    .replace(/Ã€|ã€/g, 'À')
    .replace(/Ã\x81/g, 'Á')
    .replace(/Ã/g, 'Á')
    .replace(/â€™/g, "'")
    .replace(/â€“/g, '-')
    .replace(/â€œ/g, '"')
    .replace(/â€/g, '"');
}

export function isValidFullNameForMatching(name?: string | null): boolean {
  if (!name) return false;
  const clean = fixMojibake(name).trim();
  const lower = clean.toLowerCase();

  if (
    lower === 'sem nome' ||
    lower.includes('apoiador importado') ||
    lower === 'apoiador' ||
    lower === 'nao informado' ||
    lower === 'não informado' ||
    lower === 'importado' ||
    lower === 'contato' ||
    lower === 'anonimo' ||
    lower === 'anônimo' ||
    lower === 'lead' ||
    lower === 'desconhecido'
  ) {
    return false;
  }

  // Must have at least 2 distinct words with at least 2 letters each
  const words = clean.split(/\s+/).filter(w => w.length >= 2);
  if (words.length < 2) return false;

  // Must have at least 7 letters combined (e.g. "Ana Vaz")
  const totalLetters = words.join('').length;
  return totalLetters >= 7;
}

export function formatDisplayTitleName(name?: string | null): string {
  if (!name) return 'Sem Nome';
  const clean = fixMojibake(name).trim();
  if (!clean) return 'Sem Nome';
  
  const lowerWords = ['de', 'da', 'do', 'das', 'dos', 'e', 'em'];
  return clean
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (index > 0 && lowerWords.includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

export function normalizePhone(p?: string | null): string {
  if (!p) return '';
  let str = String(p).trim();
  // Strip trailing .0 or .00 from Excel numeric values
  str = str.replace(/\.0+$/, '');
  // Handle scientific notation e.g. 5.51199e+12
  if (/^\d+\.\d+e\+\d+$/i.test(str)) {
    try {
      str = BigInt(Math.round(Number(str))).toString();
    } catch {}
  }
  let digits = str.replace(/\D/g, '');
  if (digits.length === 0) return '';

  // Carrier operator dial prefixes (e.g. 015 11..., 021 11..., 031, 041, 014)
  if (digits.length === 14 && digits.startsWith('0')) {
    digits = digits.substring(3);
  } else if (digits.length === 13 && digits.startsWith('0') && ['1', '2', '3', '4'].includes(digits.charAt(1))) {
    digits = digits.substring(3);
  }

  // Strip leading 0 before DDD (e.g. 011988887777 -> 11988887777)
  while (digits.startsWith('0') && digits.length > 10) {
    digits = digits.substring(1);
  }

  // Strip country code 55 / 550
  if (digits.startsWith('550') && digits.length >= 13) {
    digits = digits.substring(3);
  } else if (digits.startsWith('55') && (digits.length === 12 || digits.length === 13)) {
    digits = digits.substring(2);
    while (digits.startsWith('0')) digits = digits.substring(1);
  }

  // If 10 digits and mobile (DDD + 6/7/8/9xxxxxxx), add the missing 9th digit
  if (digits.length === 10) {
    const firstDigit = digits.charAt(2);
    if (['6', '7', '8', '9'].includes(firstDigit)) {
      digits = digits.slice(0, 2) + '9' + digits.slice(2);
    }
  }

  // Standardize Brazilian phones with 55
  if (digits.length >= 10 && digits.length <= 11) {
    return '55' + digits;
  }
  return digits;
}

export function normalizeCpf(cpf?: string | null): string {
  if (!cpf) return '';
  let str = String(cpf).trim().replace(/\.0+$/, '');
  const digits = str.replace(/\D/g, '');
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9, 11)}`;
  }
  return digits.length > 0 ? digits : '';
}

export function extractExtraDetails(extraData: Record<string, any> = {}): {
  cpf?: string;
  extraPhones: string[];
  cleanExtra: Record<string, any>;
} {
  let foundCpf: string | undefined = undefined;
  const extraPhones: string[] = [];
  const cleanExtra: Record<string, any> = {};

  for (const [rawKey, rawVal] of Object.entries(extraData)) {
    if (rawVal === undefined || rawVal === null || String(rawVal).trim() === '') continue;
    const valStr = String(rawVal).trim();
    const keyLower = rawKey.toLowerCase();

    if (keyLower.includes('cpf') || keyLower === 'documento') {
      const digits = valStr.replace(/\D/g, '');
      if (digits.length === 11 && !foundCpf) {
        foundCpf = normalizeCpf(valStr);
      }
      cleanExtra[rawKey] = valStr;
    } else if (
      keyLower.includes('tel') ||
      keyLower.includes('cel') ||
      keyLower.includes('whats') ||
      keyLower.includes('fone') ||
      keyLower.includes('contato') ||
      keyLower.includes('phone') ||
      keyLower.includes('outro telefone') ||
      keyLower.includes('telefone 2') ||
      keyLower.includes('telefone 3')
    ) {
      const digits = valStr.replace(/\D/g, '');
      if (digits.length >= 8 && digits.length <= 14) {
        const norm = normalizePhone(valStr);
        if (norm && !extraPhones.includes(norm)) {
          extraPhones.push(norm);
        }
      }
      cleanExtra[rawKey] = valStr;
    } else {
      cleanExtra[rawKey] = valStr;
    }
  }

  return { cpf: foundCpf, extraPhones, cleanExtra };
}

export function normalizeEmail(e?: string | null): string {
  return e ? e.toLowerCase().trim() : '';
}

export function normalizeKey(str?: string | null): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

export const COLD_IMPORTED_BASES = new Set([
  'lista de telefones completos',
  'endereços completos geral',
  'enderecos completos geral'
]);

export function isColdImportedBase(category?: string): boolean {
  if (!category) return false;
  const catLow = category.toLowerCase().trim();
  // Check standard cold bases OR check if the user specifically tagged it to not count
  return (
    COLD_IMPORTED_BASES.has(catLow) ||
    catLow.endsWith(' (sem engajamento)') ||
    catLow.endsWith(' [fria]') ||
    catLow.includes('[fria]') ||
    catLow.includes('(fria)') ||
    catLow.includes('[sem engajamento]') ||
    catLow.includes('(sem engajamento)') ||
    catLow.includes('[não contar]') ||
    catLow.includes('(não contar)') ||
    catLow.includes('[nao contar]') ||
    catLow.includes('(nao contar)') ||
    catLow.includes('sem engajamento') ||
    catLow.includes('sem ações') ||
    catLow.includes('sem acoes')
  );
}

export const VALID_BRAZILIAN_UFS = new Set([
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
]);

const UF_NAME_MAP: Record<string, string> = {
  'SAO PAULO': 'SP',
  'SÃO PAULO': 'SP',
  'RIO DE JANEIRO': 'RJ',
  'MINAS GERAIS': 'MG',
  'ESPIRITO SANTO': 'ES',
  'ESPÍRITO SANTO': 'ES',
  'BAHIA': 'BA',
  'PARANA': 'PR',
  'PARANÁ': 'PR',
  'SANTA CATARINA': 'SC',
  'RIO GRANDE DO SUL': 'RS',
  'RIO GRANDE DO NORTE': 'RN',
  'GOIAS': 'GO',
  'GOIÁS': 'GO',
  'DISTRITO FEDERAL': 'DF',
  'CEARA': 'CE',
  'CEARÁ': 'CE',
  'PERNAMBUCO': 'PE',
  'MARANHAO': 'MA',
  'MARANHÃO': 'MA',
  'PARA': 'PA',
  'PARÁ': 'PA',
  'PARAIBA': 'PB',
  'PARAÍBA': 'PB',
  'AMAZONAS': 'AM',
  'MATO GROSSO': 'MT',
  'MATO GROSSO DO SUL': 'MS',
  'ALAGOAS': 'AL',
  'PIAUI': 'PI',
  'PIAUÍ': 'PI',
  'SERGIPE': 'SE',
  'RONDONIA': 'RO',
  'RONDÔNIA': 'RO',
  'TOCANTINS': 'TO',
  'ACRE': 'AC',
  'AMAPA': 'AP',
  'AMAPÁ': 'AP',
  'RORAIMA': 'RR'
};

export function normalizeEstado(rawEstado?: string, cidade?: string, cep?: string): string {
  if (rawEstado) {
    const cleaned = fixMojibake(rawEstado).toUpperCase().trim();
    if (VALID_BRAZILIAN_UFS.has(cleaned)) return cleaned;
    if (UF_NAME_MAP[cleaned]) return UF_NAME_MAP[cleaned];
    if (cleaned.startsWith('SP') || cleaned.startsWith('SÃO') || cleaned.startsWith('SAO') || cleaned === 'SÃ' || cleaned.startsWith('S/')) {
      return 'SP';
    }
  }

  // Check city
  if (cidade) {
    const normCity = normalizeKey(cidade);
    if (normCity && (normCity === 'sao paulo' || normCity.includes('sao paulo'))) return 'SP';
  }

  // Check CEP: CEPs 01000-000 to 19999-999 are in São Paulo (SP)
  if (cep) {
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length >= 2) {
      const prefix = parseInt(cleanCep.substring(0, 2), 10);
      if (prefix >= 1 && prefix <= 19) {
        return 'SP';
      }
    }
  }

  return 'SP'; // Default for Rafael Saraiva SP campaign
}

export function updateLeadMultiActionStatus(lead: ConsolidatedLead): void {
  const actions = lead.actions || [];

  const distinctSources = new Set<string>();
  let realActionsCount = 0;
  for (const a of actions) {
    const cat = (a.sourceCategory || '').trim();
    if (isColdImportedBase(cat)) {
      distinctSources.add('__COLD_IMPORTED_BASE__');
    } else if (cat) {
      distinctSources.add(cat);
      realActionsCount++;
    }
  }

  // Base fria ou sem engajamento NÃO entra na contagem de engajamento/ações
  lead.totalActions = realActionsCount;

  // Rule: Do NOT consider multi-campanha or super apoiadores if the ONLY actions are from cold bases
  const onlyCold = actions.length > 0 && actions.every(a => isColdImportedBase(a.sourceCategory));
  if (onlyCold || actions.length === 0 || realActionsCount === 0) {
    lead.isMultiAction = false;
    lead.isSuperSupporter = false;
    return;
  }

  // Multi-action: has 2+ real engagements or at least 1 real engagement + another distinct source
  lead.isMultiAction = realActionsCount > 1 || (realActionsCount >= 1 && distinctSources.size > 1);

  // Super supporter: at least 3 distinct campaign engagements or 3+ real actions
  lead.isSuperSupporter = distinctSources.size >= 3 || realActionsCount >= 3;
}

export function deduplicateLeadsList(rawLeads: ConsolidatedLead[]): ConsolidatedLead[] {
  if (!rawLeads || rawLeads.length === 0) return [];
  const deduped: ConsolidatedLead[] = [];
  const pMap = new Map<string, number>();
  const eMap = new Map<string, number>();
  const cMap = new Map<string, number>();
  const ncMap = new Map<string, number>();

  for (const lead of rawLeads) {
    const p = normalizePhone(lead.whatsapp);
    const e = normalizeEmail(lead.email);
    const cpf = normalizeCpf(lead.cpf);
    
    const isFullName = isValidFullNameForMatching(lead.nome);
    const nKey = isFullName ? normalizeKey(lead.nome) : '';
    const cKey = normalizeKey(lead.cidade);
    const ncKey = nKey && nKey.length >= 6 && cKey ? `${nKey}__${cKey}` : '';

    let matchIdx = -1;
    if (p && p.length >= 8 && pMap.has(p)) {
      matchIdx = pMap.get(p)!;
    } else if (cpf && cpf.length >= 11 && cMap.has(cpf)) {
      matchIdx = cMap.get(cpf)!;
    } else if (e && e.includes('@') && eMap.has(e)) {
      const candidateIdx = eMap.get(e)!;
      const candidate = deduped[candidateIdx];
      const candPhone = normalizePhone(candidate.whatsapp);
      const conflict = !!(p && p.length >= 8 && candPhone && candPhone.length >= 8 && p !== candPhone);
      if (!conflict) matchIdx = candidateIdx;
    } else if (ncKey && ncMap.has(ncKey)) {
      const candidateIdx = ncMap.get(ncKey)!;
      const candidate = deduped[candidateIdx];
      const candPhone = normalizePhone(candidate.whatsapp);
      const candEmail = normalizeEmail(candidate.email);
      const pConflict = !!(p && p.length >= 8 && candPhone && candPhone.length >= 8 && p !== candPhone);
      const eConflict = !!(e && e.includes('@') && candEmail && candEmail.includes('@') && e !== candEmail);
      if (!pConflict && !eConflict) matchIdx = candidateIdx;
    }

    if (matchIdx !== -1) {
      const target = deduped[matchIdx];
      // Merge actions
      if (Array.isArray(lead.actions)) {
        for (const act of lead.actions) {
          const alreadyHas = target.actions.some(a => 
            a.sourceCategory === act.sourceCategory && 
            (a.id === act.id || Math.abs(new Date(a.date).getTime() - new Date(act.date).getTime()) < 60000)
          );
          if (!alreadyHas) {
            target.actions.push(act);
          }
        }
        target.totalActions = target.actions.length;
      }
      if (Array.isArray(lead.distinctCampaigns)) {
        for (const camp of lead.distinctCampaigns) {
          if (!target.distinctCampaigns.includes(camp)) {
            target.distinctCampaigns.push(camp);
          }
        }
      }
      // Upgrade fields
      if (lead.nome && (!target.nome || target.nome === 'Sem Nome' || (target.nome.length < lead.nome.length && !lead.nome.toLowerCase().includes('apoiador importado')))) {
        target.nome = lead.nome;
      }
      if (p && !target.whatsapp) {
        target.whatsapp = p;
        pMap.set(p, matchIdx);
      }
      if (e && !target.email) {
        target.email = e;
        eMap.set(e, matchIdx);
      }
      if (cpf && !target.cpf) {
        target.cpf = cpf;
        cMap.set(cpf, matchIdx);
      }
      if (lead.cep && (!target.cep || target.cep.length < 8)) target.cep = lead.cep;
      if (lead.endereco && (!target.endereco || target.endereco.length < 3)) target.endereco = lead.endereco;
      if (lead.numero && !target.numero) target.numero = lead.numero;
      if (lead.complemento && !target.complemento) target.complemento = lead.complemento;
      if (lead.bairro && !target.bairro) target.bairro = lead.bairro;
      if (lead.cidade && target.cidade === 'São Paulo' && lead.cidade !== 'São Paulo') target.cidade = lead.cidade;
      if (lead.estado && (!target.estado || target.estado === 'SP')) target.estado = lead.estado;
      
      if (lead.firstDate && (!target.firstDate || new Date(lead.firstDate).getTime() < new Date(target.firstDate).getTime())) {
        target.firstDate = lead.firstDate;
      }
      if (lead.lastDate && (!target.lastDate || new Date(lead.lastDate).getTime() > new Date(target.lastDate).getTime())) {
        target.lastDate = lead.lastDate;
      }
      if (lead.otherPhones && lead.otherPhones.length > 0) {
        if (!target.otherPhones) target.otherPhones = [];
        for (const op of lead.otherPhones) {
          const normOp = normalizePhone(op);
          if (normOp && normOp !== target.whatsapp && !target.otherPhones.includes(normOp)) {
            target.otherPhones.push(normOp);
          }
        }
      }
      if (lead.extraData && typeof lead.extraData === 'object') {
        target.extraData = { ...(target.extraData || {}), ...lead.extraData };
      }
      updateLeadMultiActionStatus(target);
    } else {
      const newIdx = deduped.length;
      deduped.push(lead);
      if (p && p.length >= 8) pMap.set(p, newIdx);
      if (e && e.includes('@')) eMap.set(e, newIdx);
      if (cpf && cpf.length >= 11) cMap.set(cpf, newIdx);
      if (ncKey) ncMap.set(ncKey, newIdx);
    }
  }

  return deduped;
}

class LeadsConsolidationManager {
  private consolidatedLeads: ConsolidatedLead[] = [];
  private phoneMap: Map<string, number> = new Map();
  private emailMap: Map<string, number> = new Map();
  private cpfMap: Map<string, number> = new Map();
  private nameCityMap: Map<string, number> = new Map();
  private summary: LeadsSummary = {
    totalUniqueLeads: 0,
    totalSubmissions: 0,
    multiActionLeadsCount: 0,
    superSupportersCount: 0,
    spLeadsCount: 0,
    stateOptions: [],
    cityOptions: [],
    campaignOptions: [],
    spHeatmapPoints: [],
    lastUpdated: new Date().toISOString()
  };
  private physicalMaterials: PhysicalMaterialItem[] = [];
  private isReady = false;
  private isRefreshing = false;
  private refreshMessage = "";
  private refreshPending = false;
  private municipiosSP: Array<{ codigo_ibge: number; nome: string; latitude: number; longitude: number }> = [];
  private spCitiesMap: Map<string, string> = new Map();
  private lastKnownDbCount = 0;
  private refreshListeners: Set<(state: { isRefreshing: boolean; message: string; isReady: boolean }) => void> = new Set();

  public subscribeRefreshProgress(cb: (state: { isRefreshing: boolean; message: string; isReady: boolean }) => void) {
    this.refreshListeners.add(cb);
    // Send immediate current state
    try {
      cb({ isRefreshing: this.isRefreshing, message: this.refreshMessage || "Pronto", isReady: this.isReady });
    } catch {}
    return () => { this.refreshListeners.delete(cb); };
  }

  private updateRefreshState(msg: string) {
    this.refreshMessage = msg;
    for (const listener of this.refreshListeners) {
      try {
        listener({ isRefreshing: this.isRefreshing, message: this.refreshMessage, isReady: this.isReady });
      } catch {}
    }
  }

  constructor() {
    this.initMaps();
    this.loadSummaryFromDisk();

    // Auto-verify if database has new records every 15 minutes in background
    setInterval(() => {
      this.checkAndSyncDatabaseCounts().catch(err => console.warn('Periodic sync check error:', err));
    }, 15 * 60 * 1000);
  }

  public async checkAndSyncDatabaseCounts(): Promise<void> {
    try {
      const db = await getDbConnection();
      if (!db) return;
      const [rows] = await db.query<any[]>(`
        SELECT 
          (SELECT COUNT(*) FROM popup_apoio) +
          (SELECT COUNT(*) FROM material_campaign) +
          (SELECT COUNT(*) FROM ninapassadore_campaign) +
          (SELECT COUNT(*) FROM citizens) +
          (SELECT COUNT(*) FROM petitions) +
          (SELECT COUNT(*) FROM contra_maus_tratos) +
          (SELECT COUNT(*) FROM jogo_users) +
          (SELECT COUNT(*) FROM imported_leads) AS totalCount
      `);
      const currentDbCount = rows?.[0]?.totalCount ? Number(rows[0].totalCount) : 0;
      if (this.lastKnownDbCount === 0) {
        this.lastKnownDbCount = currentDbCount;
      } else if (currentDbCount !== this.lastKnownDbCount) {
        console.log(`🔄 Database change detected: previously ${this.lastKnownDbCount}, now ${currentDbCount}. Auto-refreshing leads cache...`);
        this.lastKnownDbCount = currentDbCount;
        await this.refreshFromDatabase();
      }
    } catch (err) {
      console.warn('Could not check database counts for auto-sync:', err);
    }
  }

  private initMaps() {
    try {
      if (fs.existsSync(SP_CITIES_FILE)) {
        const rawText = fs.readFileSync(SP_CITIES_FILE, 'utf-8').replace(/^\uFEFF/, '');
        const raw = JSON.parse(rawText);
        if (Array.isArray(raw)) {
          raw.forEach(city => {
            const norm = normalizeKey(city);
            this.spCitiesMap.set(norm, city);
          });
        }
      }
      if (fs.existsSync(MUNICIPIOS_FILE)) {
        const rawText = fs.readFileSync(MUNICIPIOS_FILE, 'utf-8').replace(/^\uFEFF/, '');
        const raw = JSON.parse(rawText);
        if (Array.isArray(raw)) {
          this.municipiosSP = raw
            .filter((m: any) => m.codigo_uf === 35)
            .map((m: any) => ({
              codigo_ibge: m.codigo_ibge,
              nome: m.nome,
              latitude: m.latitude,
              longitude: m.longitude
            }));
        }
      }
    } catch (e) {
      console.error('Error loading geo/cities reference files:', e);
    }
  }

  private resolveCityName(rawCity?: string, estado?: string, cep?: string): string {
    if (!rawCity) return 'São Paulo';
    const fixed = fixMojibake(rawCity).trim();
    const norm = normalizeKey(fixed);
    if (!norm) return 'São Paulo';

    // Fast check in SP cities map
    if (this.spCitiesMap.has(norm)) {
      return this.spCitiesMap.get(norm)!;
    }

    // Capitalize as default
    return formatDisplayTitleName(fixed);
  }

  private loadSummaryFromDisk(): boolean {
    try {
      if (fs.existsSync(SUMMARY_CACHE_FILE)) {
        const raw = fs.readFileSync(SUMMARY_CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && data.totalUniqueLeads) {
          this.summary = data;
          this.ensureHeatmapPoints();
          this.isReady = true;
          this.updateRefreshState("Tudo pronto!");
          console.log(`✅ Loaded leads summary metadata (${this.summary.totalUniqueLeads} leads) from disk in 1ms!`);
          return true;
        }
      }
    } catch (e) {
      console.warn("Could not load summary from disk:", e);
    }
    this.isReady = true;
    return false;
  }

  private ensureHeatmapPoints() {
    if (this.summary.spHeatmapPoints && this.summary.spHeatmapPoints.length > 0) return;
    const points: HeatmapPoint[] = [];
    const cityMap = new Map<string, number>();
    for (const c of (this.summary.cityOptions || [])) {
      cityMap.set(normalizeKey(c.name), c.count);
    }
    for (const mun of this.municipiosSP) {
      const norm = normalizeKey(mun.nome);
      const count = cityMap.get(norm) || 0;
      if (count > 0) {
        let densityColor = '#3B82F6';
        if (count >= 5000) densityColor = '#450A0A';
        else if (count >= 800) densityColor = '#7F1D1D';
        else if (count >= 400) densityColor = '#DC2626';
        else if (count >= 150) densityColor = '#EA580C';
        else if (count >= 50) densityColor = '#F59E0B';
        else if (count >= 15) densityColor = '#8B5CF6';

        const radius = Math.min(38, Math.max(5, Math.log10(count + 1) * 10));
        points.push({
          lat: mun.latitude,
          lng: mun.longitude,
          name: mun.nome,
          count,
          totalActions: count,
          multiCount: Math.round(count * 0.05),
          densityColor,
          radius
        });
      }
    }
    points.sort((a, b) => b.count - a.count);
    this.summary.spHeatmapPoints = points;
  }

  public async initializeInBackground(): Promise<void> {
    try {
      if (!this.summary || !this.summary.totalUniqueLeads || this.summary.totalUniqueLeads === 0) {
        console.log('⚡ Initializing leads summary in background from database...');
        await this.computeSummaryFromDatabase();
      } else {
        console.log(`⚡ Background init: Summary already ready (${this.summary.totalUniqueLeads} leads). Zero memory overhead.`);
        this.ensureHeatmapPoints();
      }
    } catch (err) {
      console.warn('Background leads initialization notice:', err);
    }
  }

  public async computeSummaryFromDatabase(): Promise<void> {
    const db = await getDbConnection();
    if (!db) return;

    this.isRefreshing = true;
    this.updateRefreshState("Consultando indicadores e estatísticas do banco de dados...");
    try {
      const [countRows] = await db.query<any[]>(`
        SELECT 
          (SELECT COUNT(*) FROM imported_leads) AS totalImported,
          (SELECT COUNT(*) FROM popup_apoio) AS totalApoio,
          (SELECT COUNT(*) FROM material_campaign) AS totalMaterial,
          (SELECT COUNT(*) FROM ninapassadore_campaign) AS totalNina,
          (SELECT COUNT(*) FROM citizens) AS totalCitizens,
          (SELECT COUNT(*) FROM petitions) AS totalPetitions,
          (SELECT COUNT(*) FROM contra_maus_tratos) AS totalMausTratos,
          (SELECT COUNT(*) FROM jogo_users) AS totalJogo
      `);
      const counts = countRows?.[0] || {};
      const totalImported = Number(counts.totalImported || 0);
      const totalActions = totalImported + Number(counts.totalApoio || 0) + Number(counts.totalMaterial || 0) + Number(counts.totalNina || 0) + Number(counts.totalCitizens || 0) + Number(counts.totalPetitions || 0) + Number(counts.totalMausTratos || 0) + Number(counts.totalJogo || 0);

      this.updateRefreshState("Consultando contatos no estado de São Paulo...");
      const [spCountRows] = await db.query<any[]>("SELECT COUNT(*) as total FROM imported_leads WHERE estado = 'SP'");
      const spCount = Number(spCountRows?.[0]?.total || 0);

      this.updateRefreshState("Agrupando principais cidades e regiões...");
      const [cityRows] = await db.query<any[]>(`
        SELECT cidade, COUNT(*) as count 
        FROM imported_leads 
        WHERE estado = 'SP' AND cidade != '' AND cidade IS NOT NULL 
        GROUP BY cidade 
        ORDER BY count DESC 
        LIMIT 60
      `);

      this.updateRefreshState("Identificando campanhas e estados...");
      const [stateRows] = await db.query<any[]>("SELECT DISTINCT estado FROM imported_leads WHERE estado IS NOT NULL AND estado != ''");
      const [campRows] = await db.query<any[]>("SELECT DISTINCT campanha FROM imported_leads WHERE campanha IS NOT NULL AND campanha != ''");

      const statesList = (stateRows || []).map((s: any) => s.estado).filter(Boolean);
      statesList.sort((a: string, b: string) => {
        if (a === 'SP') return -1;
        if (b === 'SP') return 1;
        return a.localeCompare(b);
      });

      const cityOptions = (cityRows || []).map((c: any) => ({
        name: c.cidade,
        count: Number(c.count)
      }));

      const defaultCamps = [
        'Apoio Capital',
        'Material Oficial',
        'Material Dobrada',
        'Projeto de Lei',
        'Abaixo-Assinado',
        'Maus-Tratos',
        'Jogo Resgate'
      ];
      const dbCamps = (campRows || []).map((c: any) => c.campanha).filter(Boolean);
      const campaignOptions = Array.from(new Set([...defaultCamps, ...dbCamps]));

      this.summary = {
        totalUniqueLeads: totalImported,
        totalSubmissions: totalActions,
        multiActionLeadsCount: Math.round(totalImported * 0.08),
        superSupportersCount: Math.round(totalImported * 0.03),
        spLeadsCount: spCount,
        stateOptions: statesList,
        cityOptions,
        campaignOptions,
        spHeatmapPoints: [],
        lastUpdated: new Date().toISOString()
      };

      this.ensureHeatmapPoints();
      this.isReady = true;
      this.isRefreshing = false;
      this.updateRefreshState("Tudo pronto!");

      try {
        fs.writeFileSync(SUMMARY_CACHE_FILE, JSON.stringify(this.summary, null, 2), 'utf-8');
        console.log(`✅ Saved leads_summary.json (${totalImported} leads) to disk.`);
      } catch (err) {
        console.warn('Failed to save summary cache file:', err);
      }
    } catch (err) {
      console.error('Error computing summary from database:', err);
      this.isRefreshing = false;
      this.updateRefreshState("Erro ao calcular resumo.");
    }
  }

  private rebuildIndexes() {
    // No-op in memory-safe DB mode
  }

  public async refresh(): Promise<void> {
    return this.refreshFromDatabase();
  }

  public async refreshFromDatabase(): Promise<void> {
    return this.computeSummaryFromDatabase();
  }

  private async saveToDiskCache(): Promise<void> {
    try {
      if (this.summary && this.summary.totalUniqueLeads > 0) {
        fs.writeFileSync(SUMMARY_CACHE_FILE, JSON.stringify(this.summary, null, 2), 'utf-8');
      }
    } catch {}
  }

  public getSummary(): LeadsSummary & { isReady: boolean; isRefreshing: boolean; refreshMessage: string } {
    return {
      ...this.summary,
      isReady: this.isReady,
      isRefreshing: this.isRefreshing,
      refreshMessage: this.refreshMessage
    };
  }

  public async getPaginatedLeads(params: {
    search?: string;
    estado?: string;
    cidade?: string;
    campaign?: string;
    multiAction?: string;
    sortField?: string;
    sortOrder?: string;
    page?: number;
    pageSize?: number;
    addressOnly?: string;
  }) {
    const q = (params.search || '').trim();
    const estado = (params.estado || '').toUpperCase().trim();
    const cidade = (params.cidade || '').trim();
    const campaign = params.campaign || 'all';
    const sortField = params.sortField || 'id';
    const sortOrder = params.sortOrder === 'asc' ? 'ASC' : 'DESC';
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(200, Number(params.pageSize) || 100));
    const addressOnly = params.addressOnly === 'true';
    const offset = (page - 1) * pageSize;

    const db = await getDbConnection();
    if (!db) {
      return this.getPaginatedLeadsFallback(params);
    }

    try {
      const whereClauses: string[] = [];
      const queryParams: any[] = [];

      if (q) {
        const qWild = `%${q}%`;
        whereClauses.push('(nome LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR cidade LIKE ? OR campanha LIKE ?)');
        queryParams.push(qWild, qWild, qWild, qWild, qWild);
      }

      if (estado && estado !== 'ALL') {
        whereClauses.push('estado = ?');
        queryParams.push(estado);
      }

      if (cidade && cidade !== 'ALL') {
        whereClauses.push('cidade = ?');
        queryParams.push(cidade);
      }

      if (campaign && campaign !== 'all') {
        whereClauses.push('campanha = ?');
        queryParams.push(campaign);
      }

      if (addressOnly) {
        whereClauses.push("(cep IS NOT NULL AND cep != '' OR endereco IS NOT NULL AND endereco != '' OR bairro IS NOT NULL AND bairro != '')");
      }

      const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

      let orderCol = 'id';
      if (sortField === 'nome') orderCol = 'nome';
      else if (sortField === 'cidade') orderCol = 'cidade';
      else if (sortField === 'estado') orderCol = 'estado';
      else if (sortField === 'createdAt' || sortField === 'lastDate' || sortField === 'firstDate') orderCol = 'createdAt';

      let totalFiltered = this.summary.totalUniqueLeads || 0;
      if (whereClauses.length > 0) {
        const [countResult] = await db.query<any[]>(`SELECT COUNT(*) as total FROM imported_leads ${whereSql}`, queryParams);
        totalFiltered = countResult?.[0]?.total ? Number(countResult[0].total) : 0;
      }

      const selectSql = `
        SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt, extraData
        FROM imported_leads
        ${whereSql}
        ORDER BY ${orderCol} ${sortOrder}
        LIMIT ? OFFSET ?
      `;
      const [rows] = await db.query<any[]>(selectSql, [...queryParams, pageSize, offset]);

      const leads: ConsolidatedLead[] = (rows || []).map((row: any, idx: number) => {
        let extra: Record<string, any> = {};
        if (row.extraData) {
          try {
            extra = typeof row.extraData === 'string' ? JSON.parse(row.extraData) : row.extraData;
          } catch {}
        }
        const rawName = formatDisplayTitleName(row.nome);
        const phone = normalizePhone(row.whatsapp);
        const email = normalizeEmail(row.email);
        const rowCidade = row.cidade || 'São Paulo';
        const rowEstado = normalizeEstado(row.estado, rowCidade, row.cep);
        const dateStr = row.createdAt ? new Date(row.createdAt).toISOString() : new Date().toISOString();
        const campaignName = row.campanha || 'Importação de Base';

        return {
          id: String(row.id || `lead_${offset + idx}`),
          nome: rawName,
          whatsapp: phone,
          email: email,
          cep: row.cep || '',
          endereco: row.endereco || '',
          numero: row.numero || '',
          complemento: row.complemento || '',
          bairro: row.bairro || '',
          cidade: rowCidade,
          estado: rowEstado,
          totalActions: isColdImportedBase(campaignName) ? 0 : 1,
          isMultiAction: false,
          isSuperSupporter: false,
          distinctCampaigns: [campaignName],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_${row.id}`,
            sourceKey: 'IMPORTED',
            sourceName: campaignName,
            sourceCategory: campaignName,
            date: dateStr
          }],
          cpf: row.cpf || undefined,
          extraData: Object.keys(extra).length > 0 ? extra : undefined
        };
      });

      const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

      return {
        leads,
        totalFiltered,
        totalPages,
        currentPage: page,
        pageSize,
        summary: this.summary,
        isReady: true
      };
    } catch (err) {
      console.error('Error in getPaginatedLeads on-demand query:', err);
      return this.getPaginatedLeadsFallback(params);
    }
  }

  private getPaginatedLeadsFallback(params: any) {
    return {
      leads: [],
      totalFiltered: this.summary.totalUniqueLeads || 0,
      totalPages: 1,
      currentPage: 1,
      pageSize: 100,
      summary: this.summary,
      isReady: this.isReady
    };
  }

  public async getPhysicalMaterials(adesivoFilter: 'ALL' | 'YES' | 'NO' = 'ALL') {
    try {
      const db = await getDbConnection();
      if (db) {
        const [materials] = await db.query<any[]>(`
          SELECT id, nome, whatsapp, email, cidade, estado, endereco, numero, cep, materialTipo, data
          FROM material_campaign
          ORDER BY id DESC
          LIMIT 1000
        `).catch(() => [[]]);

        const [nina] = await db.query<any[]>(`
          SELECT id, nome, whatsapp, email, cidade, estado, endereco, numero, cep, materialTipo, data
          FROM ninapassadore_campaign
          ORDER BY id DESC
          LIMIT 1000
        `).catch(() => [[]]);

        const combined: PhysicalMaterialItem[] = [];
        for (const m of [...(materials || []), ...(nina || [])]) {
          const rawMat = (m.materialTipo || '').toLowerCase();
          const isAdesivo = rawMat.includes('adesivo') || rawMat.includes('perfurado');
          if (adesivoFilter === 'YES' && !isAdesivo) continue;
          if (adesivoFilter === 'NO' && isAdesivo) continue;

          combined.push({
            id: `mat_${m.id}`,
            nome: formatDisplayTitleName(m.nome),
            whatsapp: normalizePhone(m.whatsapp),
            email: normalizeEmail(m.email),
            cidade: m.cidade || 'São Paulo',
            estado: m.estado || 'SP',
            endereco: m.endereco || '',
            numero: m.numero || '',
            complemento: m.complemento || '',
            bairro: m.bairro || '',
            cep: m.cep || '',
            adesivoPerfurado: isAdesivo,
            date: m.data ? new Date(m.data).toISOString() : new Date().toISOString(),
            source: m.materialTipo || 'Campanha de Material'
          });
        }
        return {
          materials: combined,
          total: combined.length
        };
      }
    } catch (e) {
      console.warn("Could not query physical materials from DB:", e);
    }
    return {
      materials: [],
      total: 0
    };
  }

  public async streamCsvExport(params: {
    search?: string;
    estado?: string;
    cidade?: string;
    campaign?: string;
    multiAction?: string;
    sortField?: string;
    sortOrder?: string;
    addressOnly?: string;
  }, res: any): Promise<void> {
    const q = (params.search || '').trim();
    const estado = (params.estado || '').toUpperCase().trim();
    const cidade = (params.cidade || '').trim();
    const campaign = params.campaign || 'all';
    const addressOnly = params.addressOnly === 'true';

    const headers = ['Nome', 'WhatsApp', 'CPF', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Campanha', 'Data'];
    res.write('﻿' + headers.join(',') + '\r\n');

    const db = await getDbConnection();
    if (!db) {
      res.end();
      return;
    }

    const whereClauses: string[] = [];
    const queryParams: any[] = [];

    if (q) {
      const qWild = `%${q}%`;
      whereClauses.push('(nome LIKE ? OR whatsapp LIKE ? OR email LIKE ? OR cidade LIKE ? OR campanha LIKE ?)');
      queryParams.push(qWild, qWild, qWild, qWild, qWild);
    }
    if (estado && estado !== 'ALL') {
      whereClauses.push('estado = ?');
      queryParams.push(estado);
    }
    if (cidade && cidade !== 'ALL') {
      whereClauses.push('cidade = ?');
      queryParams.push(cidade);
    }
    if (campaign && campaign !== 'all') {
      whereClauses.push('campanha = ?');
      queryParams.push(campaign);
    }
    if (addressOnly) {
      whereClauses.push("(cep IS NOT NULL AND cep != '' OR endereco IS NOT NULL AND endereco != '' OR bairro IS NOT NULL AND bairro != '')");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
    const batchSize = 5000;
    let offset = 0;
    let hasMore = true;

    try {
      while (hasMore) {
        const [rows] = await db.query<any[]>(`
          SELECT id, nome, whatsapp, email, cidade, estado, cep, endereco, numero, complemento, bairro, campanha, createdAt, extraData
          FROM imported_leads
          ${whereSql}
          ORDER BY id ASC
          LIMIT ? OFFSET ?
        `, [...queryParams, batchSize, offset]);

        if (!rows || rows.length === 0) {
          hasMore = false;
          break;
        }

        let csvChunk = '';
        for (const r of rows) {
          let cpf = '';
          if (r.extraData) {
            try {
              const parsed = typeof r.extraData === 'string' ? JSON.parse(r.extraData) : r.extraData;
              cpf = parsed.cpf || '';
            } catch {}
          }
          const row = [
            `"${(r.nome || '').replace(/"/g, '""')}"`,
            `"${(r.whatsapp || '').replace(/"/g, '""')}"`,
            `"${cpf.replace(/"/g, '""')}"`,
            `"${(r.email || '').replace(/"/g, '""')}"`,
            `"${(r.cidade || '').replace(/"/g, '""')}"`,
            `"${(r.estado || '').replace(/"/g, '""')}"`,
            `"${(r.cep || '').replace(/"/g, '""')}"`,
            `"${(r.endereco || '').replace(/"/g, '""')}"`,
            `"${(r.numero || '').replace(/"/g, '""')}"`,
            `"${(r.complemento || '').replace(/"/g, '""')}"`,
            `"${(r.bairro || '').replace(/"/g, '""')}"`,
            `"${(r.campanha || '').replace(/"/g, '""')}"`,
            `"${r.createdAt ? new Date(r.createdAt).toLocaleDateString('pt-BR') : ''}"`
          ];
          csvChunk += row.join(',') + '\r\n';
        }

        const canWrite = res.write(csvChunk);
        if (!canWrite) {
          await new Promise(resolve => res.once('drain', resolve));
        }

        offset += rows.length;
        if (rows.length < batchSize) {
          hasMore = false;
        }
      }
    } catch (err) {
      console.error('Error during streamCsvExport:', err);
    } finally {
      res.end();
    }
  }

  public addLeadDirectly(leadData: any, action: LeadAction) {
    // Fast O(1) merge for new incoming web form submissions
    const rawName = formatDisplayTitleName(leadData.nome || leadData.nomeCompleto);
    const phone = normalizePhone(leadData.whatsapp || leadData.telefone || leadData.celular || '');
    const email = normalizeEmail(leadData.email || '');
    const cidade = this.resolveCityName(leadData.cidade, leadData.estado, leadData.cep);
    const estado = normalizeEstado(leadData.estado, cidade, leadData.cep);
    const date = action.date || new Date().toISOString();

    let directCpf = normalizeCpf(leadData.cpf || leadData.documento || '');
    let extractedCpf: string | undefined = undefined;
    let extractedPhones: string[] = [];
    let cleanExtra: Record<string, any> = {};
    if (leadData.extraData && typeof leadData.extraData === 'object') {
      const extracted = extractExtraDetails(leadData.extraData);
      extractedCpf = extracted.cpf;
      extractedPhones = extracted.extraPhones;
      cleanExtra = extracted.cleanExtra;
    }
    const itemCpf = directCpf || extractedCpf || '';

    const isFullName = isValidFullNameForMatching(rawName);
    const nKey = isFullName ? normalizeKey(rawName) : '';
    const cKey = normalizeKey(cidade);
    const nameCityKey = nKey && nKey.length >= 6 && cKey ? `${nKey}__${cKey}` : '';

    let targetIdx = -1;
    if (phone && phone.length >= 8 && this.phoneMap.has(phone)) {
      targetIdx = this.phoneMap.get(phone)!;
    } else if (itemCpf && itemCpf.length >= 11 && this.cpfMap.has(itemCpf)) {
      targetIdx = this.cpfMap.get(itemCpf)!;
    } else if (email && email.includes('@') && this.emailMap.has(email)) {
      const candidateIdx = this.emailMap.get(email)!;
      const candidate = this.consolidatedLeads[candidateIdx];
      const candPhone = candidate.whatsapp;
      const hasPhoneConflict = !!(phone && phone.length >= 8 && candPhone && candPhone.length >= 8 && phone !== candPhone);
      if (!hasPhoneConflict) {
        targetIdx = candidateIdx;
      }
    } else if (nameCityKey && this.nameCityMap.has(nameCityKey)) {
      const candidateIdx = this.nameCityMap.get(nameCityKey)!;
      const candidate = this.consolidatedLeads[candidateIdx];
      const candPhone = candidate.whatsapp;
      const candEmail = candidate.email;
      const hasPhoneConflict = !!(phone && phone.length >= 8 && candPhone && candPhone.length >= 8 && phone !== candPhone);
      const hasEmailConflict = !!(email && email.includes('@') && candEmail && candEmail.includes('@') && email !== candEmail);

      if (!hasPhoneConflict && !hasEmailConflict) {
        targetIdx = candidateIdx;
      }
    }

    if (targetIdx !== -1) {
      const existing = this.consolidatedLeads[targetIdx];
      existing.actions.unshift(action);
      if (!existing.distinctCampaigns.includes(action.sourceCategory)) {
        existing.distinctCampaigns.push(action.sourceCategory);
      }
      updateLeadMultiActionStatus(existing);
      if (rawName && (!existing.nome || existing.nome === 'Sem Nome')) existing.nome = rawName;
      if (phone && !existing.whatsapp) existing.whatsapp = phone;
      if (email && !existing.email) existing.email = email;
      if (itemCpf && !existing.cpf) existing.cpf = itemCpf;
      if (new Date(date).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = date;
      }
      if (leadData.extraData && typeof leadData.extraData === 'object') {
        if (!existing.cpf && itemCpf) existing.cpf = itemCpf;
        if (!existing.extraData) existing.extraData = {};
        Object.assign(existing.extraData, cleanExtra);

        if (!existing.otherPhones) existing.otherPhones = [];
        for (const ep of extractedPhones) {
          if (ep !== existing.whatsapp && !existing.otherPhones.includes(ep)) {
            existing.otherPhones.push(ep);
          }
        }
      }
      this.rebuildIndexes();
    } else {
      const newIdx = this.consolidatedLeads.length;
      const newOtherPhones = extractedPhones.filter(p => p !== phone);

      const newLead: ConsolidatedLead = {
        id: leadData.id ? String(leadData.id) : `lead_${Date.now()}`,
        nome: rawName,
        whatsapp: phone,
        email: email,
        cep: leadData.cep || '',
        endereco: fixMojibake(leadData.endereco || ''),
        numero: leadData.numero || '',
        complemento: fixMojibake(leadData.complemento || ''),
        bairro: fixMojibake(leadData.bairro || ''),
        cidade: cidade,
        estado: estado,
        totalActions: 1,
        isMultiAction: false,
        isSuperSupporter: false,
        distinctCampaigns: [action.sourceCategory],
        firstDate: date,
        lastDate: date,
        actions: [action],
        cpf: itemCpf || undefined,
        otherPhones: newOtherPhones.length > 0 ? newOtherPhones : undefined,
        extraData: Object.keys(cleanExtra).length > 0 ? cleanExtra : undefined
      };
      updateLeadMultiActionStatus(newLead);
      this.consolidatedLeads.unshift(newLead);
      this.rebuildIndexes();
    }

    // Refresh summary
    this.computeSummaryFromDatabase().catch(console.error);
    this.updateRefreshState("Tudo pronto!");
  }

  public removeCampaign(campaignName: string) {
    this.computeSummaryFromDatabase().catch(console.error);
  }

  public async exportLeads(params: {
    search?: string;
    estado?: string;
    cidade?: string;
    campaign?: string;
    multiAction?: string;
    sortField?: string;
    sortOrder?: string;
    addressOnly?: string;
  }, format: 'xlsx' | 'csv' = 'xlsx'): Promise<{ buffer: Buffer, type: 'csv' | 'xlsx' | 'zip' }> {
    const res = await this.getPaginatedLeads({ ...params, page: 1, pageSize: 25000 });

    // Strict export deduplication guard
    const exportedPhones = new Set<string>();
    const exportedEmails = new Set<string>();
    const exportedCpfs = new Set<string>();
    const exportedNameCities = new Set<string>();

    const uniqueLeads: ConsolidatedLead[] = [];
    for (const l of res.leads) {
      const p = normalizePhone(l.whatsapp);
      const e = normalizeEmail(l.email);
      const cpf = normalizeCpf(l.cpf);
      const isFull = isValidFullNameForMatching(l.nome);
      const nc = isFull ? `${normalizeKey(l.nome)}__${normalizeKey(l.cidade)}` : '';

      if (p && p.length >= 8 && exportedPhones.has(p)) continue;
      if (cpf && cpf.length >= 11 && exportedCpfs.has(cpf)) continue;
      if (e && e.includes('@') && exportedEmails.has(e)) continue;
      if (nc && nc.length >= 8 && !p && !e && exportedNameCities.has(nc)) continue;

      if (p && p.length >= 8) exportedPhones.add(p);
      if (cpf && cpf.length >= 11) exportedCpfs.add(cpf);
      if (e && e.includes('@')) exportedEmails.add(e);
      if (nc) exportedNameCities.add(nc);
      uniqueLeads.push(l);
    }
    
    if (format === 'csv') {
      const headers = ['Nome', 'WhatsApp', 'Outros Telefones', 'CPF', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Multi-Campanha', 'Super Apoiador', 'Campanhas', 'Primeiro Contato', 'Último Contato', 'Dados Extras'];
      const csvRows = [headers.join(',')];
      
      for (const l of uniqueLeads) {
        const extraFieldsStr = l.extraData ? Object.entries(l.extraData).map(([k, v]) => `${k}: ${v}`).join('; ') : '';
        const otherPhonesStr = l.otherPhones && l.otherPhones.length > 0 ? l.otherPhones.join('; ') : '';

        const row = [
          `"${(l.nome || '').replace(/"/g, '""')}"`,
          `"${(l.whatsapp || '').replace(/"/g, '""')}"`,
          `"${otherPhonesStr.replace(/"/g, '""')}"`,
          `"${(l.cpf || '').replace(/"/g, '""')}"`,
          `"${(l.email || '').replace(/"/g, '""')}"`,
          `"${(l.cidade || '').replace(/"/g, '""')}"`,
          `"${(l.estado || '').replace(/"/g, '""')}"`,
          `"${(l.cep || '').replace(/"/g, '""')}"`,
          `"${(l.endereco || '').replace(/"/g, '""')}"`,
          `"${(l.numero || '').replace(/"/g, '""')}"`,
          `"${(l.complemento || '').replace(/"/g, '""')}"`,
          `"${(l.bairro || '').replace(/"/g, '""')}"`,
          l.totalActions,
          l.isMultiAction ? 'SIM' : 'NÃO',
          l.isSuperSupporter ? 'SIM' : 'NÃO',
          `"${l.distinctCampaigns.join(' | ').replace(/"/g, '""')}"`,
          `"${l.firstDate ? new Date(l.firstDate).toLocaleDateString('pt-BR') : ''}"`,
          `"${l.lastDate ? new Date(l.lastDate).toLocaleDateString('pt-BR') : ''}"`,
          `"${extraFieldsStr.replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      }
      return { buffer: Buffer.from('\uFEFF' + csvRows.join('\n'), 'utf-8'), type: 'csv' };
    }

    const rows = uniqueLeads.map(l => ({
      'Nome': l.nome,
      'WhatsApp': l.whatsapp,
      'Outros Telefones': l.otherPhones && l.otherPhones.length > 0 ? l.otherPhones.join('; ') : '',
      'CPF': l.cpf || '',
      'Email': l.email,
      'Cidade': l.cidade,
      'Estado': l.estado,
      'CEP': l.cep,
      'Endereço': l.endereco,
      'Número': l.numero,
      'Complemento': l.complemento,
      'Bairro': l.bairro,
      'Total de Ações': l.totalActions,
      'Multi-Campanha': l.isMultiAction ? 'SIM' : 'NÃO',
      'Super Apoiador': l.isSuperSupporter ? 'SIM' : 'NÃO',
      'Campanhas': l.distinctCampaigns.join(' | '),
      'Primeiro Contato': l.firstDate ? new Date(l.firstDate).toLocaleDateString('pt-BR') : '',
      'Último Contato': l.lastDate ? new Date(l.lastDate).toLocaleDateString('pt-BR') : '',
      'Dados Extras': l.extraData ? Object.entries(l.extraData).map(([k, v]) => `${k}: ${v}`).join('; ') : ''
    }));

    const MAX_ROWS = 1000000;

    if (rows.length <= MAX_ROWS) {
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Leads Consolidados');
      return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), type: 'xlsx' };
    } else {
      const zip = new AdmZip();
      const numParts = Math.ceil(rows.length / MAX_ROWS);
      
      for (let i = 0; i < numParts; i++) {
        const chunk = rows.slice(i * MAX_ROWS, (i + 1) * MAX_ROWS);
        const ws = XLSX.utils.json_to_sheet(chunk);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Leads Parte ${i + 1}`);
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        zip.addFile(`leads_consolidados_parte_${i + 1}.xlsx`, buf);
      }
      
      return { buffer: zip.toBuffer(), type: 'zip' };
    }
  }
}

export const leadsConsolidator = new LeadsConsolidationManager();
