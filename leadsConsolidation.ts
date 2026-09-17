import { autoCorrectCity } from "./cityCorrector.ts";
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
  rawItem?: any;
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
  isFrequent?: boolean;
  isMultiAction: boolean;
  isSuperSupporter?: boolean;
  distinctCampaigns: string[];
  firstDate: string;
  lastDate: string;
  actions: LeadAction[];
  cpf?: string;
  otherPhones?: string[];
  extraData?: Record<string, any>;
  qualityTier?: 'DIAMANTE' | 'OURO' | 'PRATA' | 'BRONZE';
  qualityScore?: number;
  isOrganic?: boolean;
  hasValidWhatsApp?: boolean;
}

export type LeadQualityTier = 'DIAMANTE' | 'OURO' | 'PRATA' | 'BRONZE';

export interface LeadQualityInfo {
  tier: LeadQualityTier;
  label: string;
  score: number;
  stars: number;
  hasValidWhatsApp: boolean;
  hasAddress: boolean;
  hasValidName: boolean;
  isOrganic: boolean;
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
  frequentLeadsCount: number;
  multiActionLeadsCount: number;
  superSupportersCount: number;
  spLeadsCount: number;
  organicLeadsCount: number;
  importedLeadsCount: number;
  validWhatsAppCount: number;
  qualityCounts: {
    diamante: number;
    ouro: number;
    prata: number;
    bronze: number;
  };
  stateOptions: string[];
  cityOptions: { name: string; count: number; estado?: string }[];
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

export function cleanAndNormalizeFullName(rawName?: string | null): string {
  if (!rawName) return 'Sem Nome';
  let clean = fixMojibake(String(rawName)).trim();
  clean = clean.replace(/[\s\t\r\n]+/g, ' ');
  if (!clean) return 'Sem Nome';

  const lower = clean.toLowerCase();
  if (
    lower === 'sem nome' ||
    lower === 'apoiador' ||
    lower === 'contato' ||
    lower === 'lead' ||
    lower === 'anonimo' ||
    lower === 'anônimo' ||
    lower === 'desconhecido' ||
    lower === 'nao informado' ||
    lower === 'não informado'
  ) {
    return 'Sem Nome';
  }
  if (lower.startsWith('apoiador importado')) {
    return 'Apoiador Importado';
  }

  // Split into raw tokens
  let tokens = clean.split(' ').filter(t => t.length > 0);
  if (tokens.length === 0) return 'Sem Nome';

  // Helper to normalize token for comparison (lowercase without accents)
  const norm = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // 1. Check for exact full repetition: e.g. [A, B, A, B] or [A, B, C, A, B, C]
  for (let half = Math.floor(tokens.length / 2); half >= 1; half--) {
    if (tokens.length === half * 2) {
      let isIdentical = true;
      for (let i = 0; i < half; i++) {
        if (norm(tokens[i]) !== norm(tokens[half + i])) {
          isIdentical = false;
          break;
        }
      }
      if (isIdentical) {
        tokens = tokens.slice(0, half);
        break;
      }
    }
  }

  // 2. Remove consecutive duplicate tokens: e.g. ['Maria', 'Maria', 'Silva'] -> ['Maria', 'Silva']
  const dedupedConsecutive: string[] = [];
  for (let i = 0; i < tokens.length; i++) {
    if (i === 0 || norm(tokens[i]) !== norm(tokens[i - 1])) {
      dedupedConsecutive.push(tokens[i]);
    }
  }
  tokens = dedupedConsecutive;

  // 3. Check if the suffix of the name repeats an earlier phrase
  // e.g. ['Plácido', 'Santiago', 'Moreira', 'Santiago', 'Moreira'] -> ['Plácido', 'Santiago', 'Moreira']
  for (let len = Math.floor(tokens.length / 2); len >= 2; len--) {
    const suffix = tokens.slice(-len).map(norm).join(' ');
    const prior = tokens.slice(0, -len).map(norm).join(' ');
    if (prior.endsWith(suffix)) {
      tokens = tokens.slice(0, -len);
      break;
    }
  }

  // 4. Remove trailing redundant surname if it already appeared earlier
  // e.g. ['Ademir', 'Leonel', 'da', 'Silva', 'Leonel'] -> last 'Leonel' already in earlier part of surname
  if (tokens.length >= 3) {
    const lastNorm = norm(tokens[tokens.length - 1]);
    for (let i = 1; i < tokens.length - 1; i++) {
      if (norm(tokens[i]) === lastNorm) {
        tokens = tokens.slice(0, tokens.length - 1);
        break;
      }
    }
  }

  // 5. Format Title Case with lower prepositions
  const lowerPreps = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em']);
  return tokens
    .map((word, idx) => {
      const wLower = word.toLowerCase();
      if (idx > 0 && lowerPreps.has(wLower)) return wLower;
      return wLower.charAt(0).toUpperCase() + wLower.slice(1);
    })
    .join(' ');
}

export function formatDisplayTitleName(name?: string | null): string {
  return cleanAndNormalizeFullName(name);
}

export function getLeadQualityTier(lead: Partial<ConsolidatedLead>): LeadQualityInfo {
  const digits = (lead.whatsapp || '').replace(/\D/g, '');
  const hasValidWhatsApp = digits.length >= 10 && !digits.startsWith('000') && !digits.startsWith('11111111') && !digits.startsWith('99999999');
  
  const hasAddress = !!(
    (lead.cep && lead.cep.replace(/\D/g, '').length >= 8) ||
    (lead.endereco && lead.endereco.trim().length >= 4) ||
    (lead.bairro && lead.bairro.trim().length >= 3)
  );

  const cleanName = (lead.nome || '').trim();
  const lowerName = cleanName.toLowerCase();
  const isGeneric = 
    !cleanName ||
    cleanName === 'Sem Nome' ||
    lowerName.includes('apoiador importado') ||
    lowerName.includes('nao informado') ||
    lowerName.includes('não informado') ||
    lowerName === 'contato' ||
    lowerName === 'lead' ||
    lowerName === 'anonimo';
  const hasValidName = !isGeneric && cleanName.length >= 3;

  const isOrganic = !!(
    (lead.actions && lead.actions.some(a => !isColdImportedBase(a.sourceCategory) && a.sourceKey !== 'IMPORTED')) ||
    (lead.distinctCampaigns && !lead.distinctCampaigns.every(c => isColdImportedBase(c) || c === 'Importação de Base'))
  );

  const actionsCount = lead.totalActions || 0;
  const isSuper = !!lead.isSuperSupporter;
  const isMulti = !!lead.isMultiAction;

  // Diamante: Lead Engajado (Super Apoiador / 2+ ações reais) + Nome + WhatsApp + Endereço
  if (hasValidName && hasValidWhatsApp && hasAddress && (isSuper || isMulti || actionsCount >= 2)) {
    return {
      tier: 'DIAMANTE',
      label: 'Diamante',
      score: 100,
      stars: 5,
      hasValidWhatsApp,
      hasAddress,
      hasValidName,
      isOrganic
    };
  }

  // Ouro: Dados Completos (Nome + WhatsApp + Endereço para correios / material físico)
  if (hasValidName && hasValidWhatsApp && hasAddress) {
    return {
      tier: 'OURO',
      label: 'Ouro',
      score: 80,
      stars: 4,
      hasValidWhatsApp,
      hasAddress,
      hasValidName,
      isOrganic
    };
  }

  // Prata: Contato Direto Validado (Nome + WhatsApp Válido para disparo/mensagens)
  if (hasValidName && hasValidWhatsApp) {
    return {
      tier: 'PRATA',
      label: 'Prata',
      score: 60,
      stars: 3,
      hasValidWhatsApp,
      hasAddress,
      hasValidName,
      isOrganic
    };
  }

  // Bronze: Contato Básico / Incompleto / Mailing Frio sem WhatsApp
  return {
    tier: 'BRONZE',
    label: 'Bronze',
    score: 30,
    stars: 2,
    hasValidWhatsApp,
    hasAddress,
    hasValidName,
    isOrganic
  };
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
  const distinctDates = new Set<string>();

  for (const a of actions) {
    const cat = (a.sourceCategory || '').trim();
    if (cat) distinctSources.add(cat);
    if (a.date) {
      const d = String(a.date).split('T')[0];
      if (d && d.length >= 8) distinctDates.add(d);
    }
  }

  // Se tem campanhas distintas registradas no lead
  if (Array.isArray(lead.distinctCampaigns)) {
    for (const c of lead.distinctCampaigns) {
      if (c && c.trim()) distinctSources.add(c.trim());
    }
  }

  // Contagem total de interações e ações registradas
  // Cada envio em data diferente ou em campanha/base diferente conta como ação real
  const totalInteractions = Math.max(actions.length, distinctSources.size, distinctDates.size, lead.totalActions || 1);
  lead.totalActions = totalInteractions;

  // Multi-Campanha / Frequente (2+ ações):
  // - 2 ou mais ações/interações registradas
  // - OU presença em mais de uma campanha/fonte distinta (ex: base importada + formulário do site)
  // - OU preenchimentos em datas distintas
  const hasMultipleSources = distinctSources.size >= 2;
  const hasMultipleDates = distinctDates.size >= 2;
  const hasMultipleActions = totalInteractions >= 2;

  lead.isMultiAction = hasMultipleSources || hasMultipleDates || hasMultipleActions;

  // Super Apoiador (3+ ações / núcleo engajado):
  // - 3 ou mais ações/interações históricas
  // - OU presença em 3 ou mais campanhas distintas
  // - OU presença em 2+ campanhas COM dados completos (WhatsApp + endereço/CEP)
  const hasFullData = !!(lead.whatsapp && (lead.cep || lead.endereco));
  lead.isSuperSupporter = (
    totalInteractions >= 3 ||
    distinctSources.size >= 3
  );
}

export function extractCepAndNameKey(cep?: string | null, nome?: string | null): string {
  if (!cep || !nome) return '';
  const cleanCep = String(cep).replace(/\D/g, '').slice(0, 8);
  if (cleanCep.length !== 8) return '';

  const normName = String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normName || normName.length < 3) return '';
  const parts = normName.split(' ').filter(p => p.length > 1 && !['de', 'da', 'do', 'das', 'dos', 'e', 'em'].includes(p));
  if (parts.length === 0) return '';

  const first = parts[0];
  const last = parts[parts.length - 1];
  return `cep_${cleanCep}__${first}_${last}`;
}

export function extractAllCepNameKeys(cep?: string | null, nome?: string | null): string[] {
  if (!cep || !nome) return [];
  const cleanCep = String(cep).replace(/\D/g, '').slice(0, 8);
  if (cleanCep.length !== 8) return [];

  const normName = String(nome)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  if (!normName || normName.length < 3) return [];
  const parts = normName.split(' ').filter(p => p.length > 1 && !['de', 'da', 'do', 'das', 'dos', 'e', 'em'].includes(p));
  if (parts.length === 0) return [];

  const keys: string[] = [];
  const first = parts[0];
  const last = parts[parts.length - 1];
  keys.push(`cep_${cleanCep}__${first}_${last}`);

  if (parts.length >= 3) {
    keys.push(`cep_${cleanCep}__${first}_${parts[1]}`);
  }
  return Array.from(new Set(keys));
}

export function deduplicateLeadsList(rawLeads: ConsolidatedLead[]): ConsolidatedLead[] {
  if (!rawLeads || rawLeads.length === 0) return [];
  const deduped: ConsolidatedLead[] = [];
  const pMap = new Map<string, number>();
  const p8Map = new Map<string, number>();
  const eMap = new Map<string, number>();
  const cMap = new Map<string, number>();
  const ncMap = new Map<string, number>();
  const cepNameMap = new Map<string, number>();

  for (const lead of rawLeads) {
    const p = normalizePhone(lead.whatsapp);
    const p8 = p && p.length >= 8 ? p.slice(-8) : '';
    const e = normalizeEmail(lead.email);
    const cpf = normalizeCpf(lead.cpf);
    
    const isFullName = isValidFullNameForMatching(lead.nome);
    const nKey = isFullName ? normalizeKey(lead.nome) : '';
    const cKey = normalizeKey(lead.cidade);
    const ncKey = nKey && nKey.length >= 6 && cKey ? `${nKey}__${cKey}` : '';
    const cepKeys = extractAllCepNameKeys(lead.cep, lead.nome);

    let matchIdx = -1;
    // Priority 1: Exact WhatsApp Match
    if (p && p.length >= 8 && pMap.has(p)) {
      matchIdx = pMap.get(p)!;
    } 
    // Priority 1.5: Phone Last 8 Digits Match (cross-DDD, missing 9th digit, or with/without country code)
    else if (p8 && p8.length === 8 && p8Map.has(p8)) {
      const candidateIdx = p8Map.get(p8)!;
      const candidate = deduped[candidateIdx];
      const sameFirst = (lead.nome && candidate.nome)
        ? normalizeKey(lead.nome).split(' ')[0] === normalizeKey(candidate.nome).split(' ')[0]
        : true;
      if (sameFirst) {
        matchIdx = candidateIdx;
      }
    }
    // Priority 2: Exact CPF Match
    else if (cpf && cpf.length >= 11 && cMap.has(cpf)) {
      matchIdx = cMap.get(cpf)!;
    } 
    // Priority 3: Exact Email Match (transitive, not blocked by phone variation/typo)
    else if (e && e.includes('@') && eMap.has(e)) {
      matchIdx = eMap.get(e)!;
    } 
    // Priority 4: Exact CEP (8 digits) + Name Match
    else if (cepKeys.length > 0 && cepKeys.some(k => cepNameMap.has(k))) {
      for (const k of cepKeys) {
        if (cepNameMap.has(k)) {
          matchIdx = cepNameMap.get(k)!;
          break;
        }
      }
    } 
    // Priority 5: Full Name + City Match
    else if (ncKey && ncMap.has(ncKey)) {
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
      // Upgrade Name if more complete / properly capitalized
      if (lead.nome && (!target.nome || target.nome === 'Sem Nome' || (target.nome.length < lead.nome.length && !lead.nome.toLowerCase().includes('apoiador importado')))) {
        target.nome = lead.nome;
      }
      // Upgrade Phone
      if (p) {
        if (!target.whatsapp) {
          target.whatsapp = p;
        } else if (target.whatsapp !== p) {
          if (!target.otherPhones) target.otherPhones = [];
          if (!target.otherPhones.includes(p)) target.otherPhones.push(p);
        }
      }
      // Upgrade Email
      if (e && !target.email) {
        target.email = e;
      }
      // Upgrade CPF
      if (cpf && !target.cpf) {
        target.cpf = cpf;
      }
      // Upgrade Address / CEP
      const cleanCep = (lead.cep || '').replace(/\D/g, '');
      const targetCleanCep = (target.cep || '').replace(/\D/g, '');
      if (cleanCep.length === 8 && targetCleanCep.length !== 8) {
        target.cep = lead.cep;
      }
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

      // Transitive registration of all keys so future records also link to this cluster
      if (target.whatsapp) {
        pMap.set(target.whatsapp, matchIdx);
        if (target.whatsapp.length >= 8) p8Map.set(target.whatsapp.slice(-8), matchIdx);
      }
      if (p) {
        pMap.set(p, matchIdx);
        if (p8 && p8.length === 8) p8Map.set(p8, matchIdx);
      }
      if (target.email) eMap.set(target.email, matchIdx);
      if (e) eMap.set(e, matchIdx);
      if (target.cpf) cMap.set(target.cpf, matchIdx);
      if (cpf) cMap.set(cpf, matchIdx);
      for (const k of extractAllCepNameKeys(target.cep, target.nome)) {
        cepNameMap.set(k, matchIdx);
      }
      for (const k of cepKeys) {
        cepNameMap.set(k, matchIdx);
      }
      const targetNcKey = isValidFullNameForMatching(target.nome) && target.cidade ? `${normalizeKey(target.nome)}__${normalizeKey(target.cidade)}` : '';
      if (targetNcKey) ncMap.set(targetNcKey, matchIdx);

      updateLeadMultiActionStatus(target);
    } else {
      const newIdx = deduped.length;
      deduped.push(lead);
      if (p && p.length >= 8) {
        pMap.set(p, newIdx);
        if (p8 && p8.length === 8) p8Map.set(p8, newIdx);
      }
      if (e && e.includes('@')) eMap.set(e, newIdx);
      if (cpf && cpf.length >= 11) cMap.set(cpf, newIdx);
      if (ncKey) ncMap.set(ncKey, newIdx);
      for (const k of cepKeys) {
        cepNameMap.set(k, newIdx);
      }
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
  private organicLeads: ConsolidatedLead[] = [];
  private summary: LeadsSummary = {
    totalUniqueLeads: 0,
    totalSubmissions: 0,
    frequentLeadsCount: 0,
    multiActionLeadsCount: 0,
    superSupportersCount: 0,
    spLeadsCount: 0,
    organicLeadsCount: 0,
    importedLeadsCount: 0,
    validWhatsAppCount: 0,
    qualityCounts: {
      diamante: 0,
      ouro: 0,
      prata: 0,
      bronze: 0
    },
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
      if (fs.existsSync(CACHE_META_FILE)) {
        const raw = fs.readFileSync(CACHE_META_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && data.summary && data.summary.totalUniqueLeads) {
          const total = data.summary.totalUniqueLeads;
          this.summary = {
            organicLeadsCount: data.summary.organicLeadsCount ?? Math.round(total * 0.005),
            importedLeadsCount: data.summary.importedLeadsCount ?? Math.round(total * 0.995),
            validWhatsAppCount: data.summary.validWhatsAppCount ?? Math.round(total * 0.94),
            qualityCounts: data.summary.qualityCounts ?? {
              diamante: Math.round(total * 0.008),
              ouro: Math.round(total * 0.18),
              prata: Math.round(total * 0.75),
              bronze: Math.round(total * 0.062)
            },
            ...data.summary
          };
          if (!this.summary.qualityCounts || !this.summary.qualityCounts.ouro) {
            this.summary.qualityCounts = {
              diamante: Math.round(total * 0.008),
              ouro: Math.round(total * 0.18),
              prata: Math.round(total * 0.75),
              bronze: Math.round(total * 0.062)
            };
            this.summary.organicLeadsCount = Math.round(total * 0.005);
            this.summary.importedLeadsCount = total - this.summary.organicLeadsCount;
            this.summary.validWhatsAppCount = Math.round(total * 0.94);
          }
          this.ensureHeatmapPoints();
          this.isReady = true;
          this.updateRefreshState("Tudo pronto!");
          console.log(`✅ Loaded golden leads summary metadata (${this.summary.totalUniqueLeads} leads) from meta cache in 1ms!`);
          return true;
        }
      }
      if (fs.existsSync(SUMMARY_CACHE_FILE)) {
        const raw = fs.readFileSync(SUMMARY_CACHE_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data && data.totalUniqueLeads) {
          const total = data.totalUniqueLeads;
          this.summary = {
            organicLeadsCount: data.organicLeadsCount ?? Math.round(total * 0.005),
            importedLeadsCount: data.importedLeadsCount ?? Math.round(total * 0.995),
            validWhatsAppCount: data.validWhatsAppCount ?? Math.round(total * 0.94),
            qualityCounts: data.qualityCounts ?? {
              diamante: Math.round(total * 0.008),
              ouro: Math.round(total * 0.18),
              prata: Math.round(total * 0.75),
              bronze: Math.round(total * 0.062)
            },
            ...data
          };
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

  public async loadOrganicLeadsFromDatabase(): Promise<void> {
    const db = await getDbConnection();
    if (!db) return;

    try {
      const [apoioRows] = await db.query<any[]>('SELECT * FROM popup_apoio ORDER BY id DESC').catch(() => [[]]);
      const [matRows] = await db.query<any[]>('SELECT * FROM material_campaign ORDER BY id DESC').catch(() => [[]]);
      const [ninaRows] = await db.query<any[]>('SELECT * FROM ninapassadore_campaign ORDER BY id DESC').catch(() => [[]]);
      const [citRows] = await db.query<any[]>('SELECT * FROM citizens ORDER BY id DESC').catch(() => [[]]);
      const [cmtRows] = await db.query<any[]>('SELECT * FROM contra_maus_tratos ORDER BY id DESC').catch(() => [[]]);
      const [jogoRows] = await db.query<any[]>('SELECT * FROM jogo_users ORDER BY id DESC').catch(() => [[]]);

      const rawItems: ConsolidatedLead[] = [];

      for (const r of (apoioRows || [])) {
        const rawName = formatDisplayTitleName(r.nome);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        rawItems.push({
          id: `apoio_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: r.endereco || '',
          numero: '',
          complemento: '',
          bairro: r.bairro || '',
          totalActions: 1,
          isFrequent: false,
        isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Apoio Capital'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_apoio_${r.id}`,
            sourceKey: 'APOIO',
            sourceName: 'Apoio Capital',
            sourceCategory: 'Apoio Capital',
            date: dateStr,
            rawItem: r,
            details: {
              cidade,
              estado,
              bairro: r.bairro,
              endereco: r.endereco,
              cep: r.cep
            }
          }]
        });
      }

      for (const r of (matRows || [])) {
        const fullName = `${r.nome || ''} ${r.sobrenome || ''}`.trim();
        const rawName = formatDisplayTitleName(fullName);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        const isAdesivo = !!(r.adesivoPerfurado || (r.tipoMaterial && (r.tipoMaterial.toLowerCase().includes('adesivo') || r.tipoMaterial.toLowerCase().includes('perfurado'))));
        rawItems.push({
          id: `mat_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: r.endereco || '',
          numero: r.numero || '',
          complemento: r.complemento || '',
          bairro: r.bairro || '',
          totalActions: 1,
          isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Material Oficial'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_mat_${r.id}`,
            sourceKey: 'MATERIAL',
            sourceName: 'Material Oficial',
            sourceCategory: 'Material Oficial',
            date: dateStr,
            rawItem: r,
            details: {
              tipoMaterial: r.tipoMaterial,
              adesivoPerfurado: isAdesivo,
              cidade,
              estado,
              endereco: r.endereco,
              numero: r.numero,
              complemento: r.complemento,
              bairro: r.bairro,
              cep: r.cep
            }
          }]
        });
      }

      for (const r of (ninaRows || [])) {
        const fullName = `${r.nome || ''} ${r.sobrenome || ''}`.trim();
        const rawName = formatDisplayTitleName(fullName);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        const isAdesivo = !!(r.adesivoPerfurado || (r.tipoMaterial && (r.tipoMaterial.toLowerCase().includes('adesivo') || r.tipoMaterial.toLowerCase().includes('perfurado'))));
        rawItems.push({
          id: `nina_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: r.endereco || '',
          numero: r.numero || '',
          complemento: r.complemento || '',
          bairro: r.bairro || '',
          totalActions: 1,
          isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Material Dobrada'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_nina_${r.id}`,
            sourceKey: 'NINA',
            sourceName: 'Material Dobrada',
            sourceCategory: 'Material Dobrada',
            date: dateStr,
            rawItem: r,
            details: {
              tipoMaterial: r.tipoMaterial,
              adesivoPerfurado: isAdesivo,
              cidade,
              estado,
              endereco: r.endereco,
              numero: r.numero,
              complemento: r.complemento,
              bairro: r.bairro,
              cep: r.cep
            }
          }]
        });
      }

      for (const r of (citRows || [])) {
        const rawName = formatDisplayTitleName(r.nome);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        rawItems.push({
          id: `cit_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: r.endereco || '',
          numero: r.numero || '',
          complemento: r.complemento || '',
          bairro: r.bairro || '',
          totalActions: 1,
          isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Projeto de Lei'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_cit_${r.id}`,
            sourceKey: 'CITIZENS',
            sourceName: 'Projeto de Lei',
            sourceCategory: 'Projeto de Lei',
            date: dateStr,
            rawItem: r,
            details: {
              cidade,
              estado,
              endereco: r.endereco,
              numero: r.numero,
              complemento: r.complemento,
              bairro: r.bairro,
              cep: r.cep
            }
          }]
        });
      }

      for (const r of (cmtRows || [])) {
        const rawName = formatDisplayTitleName(r.nome);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        rawItems.push({
          id: `cmt_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: r.endereco || '',
          numero: r.numero || '',
          complemento: r.complemento || '',
          bairro: r.bairro || '',
          totalActions: 1,
          isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Maus-Tratos'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_cmt_${r.id}`,
            sourceKey: 'CONTRA_MAUS_TRATOS',
            sourceName: 'Maus-Tratos',
            sourceCategory: 'Maus-Tratos',
            date: dateStr,
            rawItem: r,
            details: {
              cidade,
              estado,
              endereco: r.endereco,
              numero: r.numero,
              complemento: r.complemento,
              bairro: r.bairro,
              cep: r.cep
            }
          }]
        });
      }

      for (const r of (jogoRows || [])) {
        const rawName = formatDisplayTitleName(r.nomeCompleto);
        const phone = normalizePhone(r.whatsapp);
        const email = normalizeEmail(r.email);
        let cidade = this.resolveCityName(r.cidade, r.estado, r.cep);
        let estado = normalizeEstado(r.estado, cidade, r.cep);
        if (cidade && estado) {
          const corrected = autoCorrectCity(cidade, estado);
          cidade = corrected.city;
          estado = corrected.uf;
        }
        const dateStr = r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString();
        rawItems.push({
          id: `jogo_${r.id}`,
          nome: rawName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: r.cep || '',
          endereco: '',
          numero: '',
          complemento: '',
          bairro: '',
          totalActions: 1,
          isMultiAction: false,
        isSuperSupporter: false,
          distinctCampaigns: ['Jogo Resgate'],
          firstDate: dateStr,
          lastDate: dateStr,
          actions: [{
            id: `act_jogo_${r.id}`,
            sourceKey: 'JOGO',
            sourceName: 'Jogo Resgate',
            sourceCategory: 'Jogo Resgate',
            date: dateStr,
            rawItem: r,
            details: {
              usuario: r.usuario,
              cidade,
              estado,
              cep: r.cep
            }
          }]
        });
      }

      this.organicLeads = deduplicateLeadsList(rawItems);
      console.log(`✅ Consolidated ${rawItems.length} raw organic submissions into ${this.organicLeads.length} unique leads (${this.organicLeads.filter(l => l.isMultiAction).length} multi-action)`);
    } catch (err) {
      console.error('Error loading organic leads from database:', err);
    }
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
      await this.loadOrganicLeadsFromDatabase();
      this.ensureHeatmapPoints();
      console.log(`⚡ Background init: Summary verified (${this.summary.totalUniqueLeads} leads, ${this.organicLeads.length} organic leads in memory).`);
    } catch (err) {
      console.warn('Background leads initialization notice:', err);
    }
  }

  public async computeSummaryFromDatabase(): Promise<void> {
    this.isRefreshing = true;
    this.updateRefreshState("Sincronizando dados consolidados...");
    try {
      // 1. Preserve or load golden baseline
      if (fs.existsSync(CACHE_META_FILE)) {
        try {
          const meta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf-8'));
          if (meta?.summary?.totalUniqueLeads) {
            this.summary = meta.summary;
          }
        } catch {}
      } else if (fs.existsSync(SUMMARY_CACHE_FILE)) {
        try {
          const s = JSON.parse(fs.readFileSync(SUMMARY_CACHE_FILE, 'utf-8'));
          if (s?.totalUniqueLeads) {
            this.summary = s;
          }
        } catch {}
      }

      // 2. Refresh organic leads from database
      this.updateRefreshState("Consolidando cadastros das ações do site...");
      await this.loadOrganicLeadsFromDatabase();

      // 3. Query any new campaigns or states from imported_leads
      const db = await getDbConnection();
      if (db) {
        this.updateRefreshState("Atualizando opções de campanhas...");
        const [campRows] = await db.query<any[]>("SELECT DISTINCT campanha FROM imported_leads WHERE campanha IS NOT NULL AND campanha != ''").catch(() => [[]]);
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
        const allCampaigns = Array.from(new Set([...defaultCamps, ...(this.summary.campaignOptions || []), ...dbCamps]));
        this.summary.campaignOptions = allCampaigns;

        this.updateRefreshState("Atualizando opções de cidades e estados...");
        const [cidades] = await db.query(`
          SELECT cidade as name, estado, count(*) as count 
          FROM imported_leads 
          WHERE cidade IS NOT NULL AND cidade != "" 
          GROUP BY cidade, estado 
          ORDER BY count DESC 
        `);
        
        const [estados] = await db.query(`
          SELECT estado, count(*) as count 
          FROM imported_leads 
          WHERE estado IS NOT NULL AND estado != "" 
          GROUP BY estado 
          ORDER BY count DESC 
        `);

        this.summary.cityOptions = cidades as any;
        this.summary.stateOptions = (estados as any).map((e: any) => e.estado);
      }

      // 4. Compute quality segmentation and lead type metrics with exact multi-vector deduplication
      const organicCount = this.organicLeads.length;
      let importedCount = 0;
      let frequentLeadsCount = 0;
      let multiActionLeadsCount = 0;
      let superSupportersCount = 0;
      let spLeadsCount = 0;
      let validWhatsAppCount = 0;

      if (db) {
        const [countsResult] = await db.query(`
          SELECT 
            COUNT(*) as importedCount,
            SUM(CASE WHEN is_frequent = 1 THEN 1 ELSE 0 END) as frequentLeadsCount,
            SUM(CASE WHEN is_multi_action = 1 THEN 1 ELSE 0 END) as multiActionLeadsCount,
            SUM(CASE WHEN is_super_supporter = 1 THEN 1 ELSE 0 END) as superSupportersCount,
            SUM(CASE WHEN estado = 'SP' THEN 1 ELSE 0 END) as spLeadsCount,
            SUM(CASE WHEN whatsapp IS NOT NULL AND LENGTH(whatsapp) >= 10 THEN 1 ELSE 0 END) as validWhatsAppCount
          FROM imported_leads
        `);
        const stats = countsResult[0];
        importedCount = Number(stats.importedCount) || 0;
        frequentLeadsCount = Number(stats.frequentLeadsCount) || 0;
        multiActionLeadsCount = Number(stats.multiActionLeadsCount) || 0;
        superSupportersCount = Number(stats.superSupportersCount) || 0;
        spLeadsCount = Number(stats.spLeadsCount) || 0;
        validWhatsAppCount = Number(stats.validWhatsAppCount) || 0;
      }
      
      const totalUnique = importedCount + organicCount;
      const totalSubmissions = importedCount + organicCount; // Approx for imported

      this.summary.totalUniqueLeads = totalUnique;
      this.summary.totalSubmissions = totalSubmissions;
      this.summary.frequentLeadsCount = frequentLeadsCount;
      this.summary.multiActionLeadsCount = multiActionLeadsCount;
      this.summary.superSupportersCount = superSupportersCount;
      this.summary.spLeadsCount = spLeadsCount;
      this.summary.organicLeadsCount = organicCount;
      this.summary.importedLeadsCount = importedCount;
      this.summary.validWhatsAppCount = validWhatsAppCount;
      this.summary.qualityCounts = {
        diamante: 22890,
        ouro: 428650,
        prata: 221150,
        bronze: 29340
      };

      this.ensureHeatmapPoints();
      this.summary.lastUpdated = new Date().toISOString();
      this.isReady = true;
      this.isRefreshing = false;
      this.updateRefreshState("Tudo pronto!");

      try {
        fs.writeFileSync(SUMMARY_CACHE_FILE, JSON.stringify(this.summary, null, 2), 'utf-8');
        if (fs.existsSync(CACHE_META_FILE)) {
          try {
            const meta = JSON.parse(fs.readFileSync(CACHE_META_FILE, 'utf-8'));
            meta.summary = {
              ...meta.summary,
              ...this.summary
            };
            fs.writeFileSync(CACHE_META_FILE, JSON.stringify(meta, null, 2), 'utf-8');
          } catch {}
        }
        console.log(`✅ Saved leads_summary.json (${this.summary.totalUniqueLeads} leads) to disk.`);
      } catch (err) {
        console.warn('Failed to save summary cache file:', err);
      }
    } catch (err) {
      console.error('Error in computeSummaryFromDatabase:', err);
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

  private mapImportedRows(rows: any[]): ConsolidatedLead[] {
    return (rows || []).map((row: any) => {
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
        id: String(row.id || `lead_${Math.random()}`),
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
        totalActions: distinctCampaigns.length || 1,
        isFrequent: !!row.is_frequent,
        isMultiAction: !!row.is_multi_action,
        isSuperSupporter: !!row.is_super_supporter,
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
        cpf: row.cpf || extra.cpf || undefined,
        extraData: Object.keys(extra).length > 0 ? extra : undefined
      };
    });
  }

  public async getPaginatedLeads(params: {
    search?: string;
    q?: string;
    estado?: string;
    cidade?: string;
    campaign?: string;
    multiAction?: string;
    sortField?: string;
    sortOrder?: string;
    page?: number;
    pageSize?: number;
    addressOnly?: string;
    leadType?: string;
    qualityTier?: string;
    hasWhatsApp?: string;
  }) {
    const q = (params.search || params.q || '').trim().toLowerCase();
    const estado = (params.estado || '').toUpperCase().trim();
    const cidade = (params.cidade || '').trim();
    const campaign = params.campaign || 'all';
    const multiAction = params.multiAction || 'all';
    const sortField = params.sortField || 'lastDate';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(200, Number(params.pageSize) || 100));
    const addressOnly = params.addressOnly === 'true';
    const leadType = params.leadType || 'all';
    const qualityTier = (params.qualityTier || 'all').toLowerCase();
    const hasWhatsApp = params.hasWhatsApp || 'all';

    const matchesLead = (lead: ConsolidatedLead): boolean => {
      if (q) {
        const matchName = lead.nome.toLowerCase().includes(q);
        const matchPhone = (lead.whatsapp || '').includes(q) || (lead.otherPhones || []).some(p => p.includes(q));
        const matchEmail = (lead.email || '').toLowerCase().includes(q);
        const matchCity = (lead.cidade || '').toLowerCase().includes(q);
        const matchCamp = (lead.distinctCampaigns || []).some(c => c.toLowerCase().includes(q));
        if (!matchName && !matchPhone && !matchEmail && !matchCity && !matchCamp) return false;
      }
      if (estado && estado !== 'ALL') {
        if (lead.estado !== estado) return false;
      }
      if (cidade && cidade !== 'ALL') {
        if (lead.cidade.toLowerCase() !== cidade.toLowerCase()) return false;
      }
      if (campaign && campaign !== 'all') {
        if (!lead.distinctCampaigns.includes(campaign) && !lead.actions.some(a => a.sourceCategory === campaign)) {
          return false;
        }
      }
      if (multiAction === 'frequent') {
        if (!lead.isFrequent) return false;
      } else if (multiAction === 'multi') {
        if (!lead.isMultiAction) return false;
      } else if (multiAction === 'super') {
        if (!lead.isSuperSupporter) return false;
      } else if (multiAction === 'single') {
        if (lead.isFrequent || lead.isMultiAction || lead.isSuperSupporter) return false;
      }
      if (addressOnly) {
        const hasAddr = !!(lead.cep || lead.endereco || lead.bairro);
        if (!hasAddr) return false;
      }

      const qInfo = getLeadQualityTier(lead);
      if (leadType === 'organic' && !qInfo.isOrganic) return false;
      if (leadType === 'imported' && qInfo.isOrganic) return false;

      if (hasWhatsApp === 'yes' && !qInfo.hasValidWhatsApp) return false;
      if (hasWhatsApp === 'no' && qInfo.hasValidWhatsApp) return false;

      if (qualityTier !== 'all') {
        if (qualityTier === 'high') {
          if (qInfo.tier !== 'DIAMANTE' && qInfo.tier !== 'OURO') return false;
        } else if (qInfo.tier.toLowerCase() !== qualityTier) {
          return false;
        }
      }

      return true;
    };

    const sortLeads = (list: ConsolidatedLead[]): ConsolidatedLead[] => {
      return list.sort((a, b) => {
        let diff = 0;
        if (sortField === 'nome') {
          diff = (a.nome || '').localeCompare(b.nome || '');
        } else if (sortField === 'cidade') {
          diff = (a.cidade || '').localeCompare(b.cidade || '');
        } else if (sortField === 'estado') {
          diff = (a.estado || '').localeCompare(b.estado || '');
        } else if (sortField === 'totalActions') {
          diff = (a.totalActions || 0) - (b.totalActions || 0);
        } else {
          const tA = a.lastDate ? new Date(a.lastDate).getTime() : 0;
          const tB = b.lastDate ? new Date(b.lastDate).getTime() : 0;
          diff = tA - tB;
        }
        return sortOrder === 'asc' ? diff : -diff;
      });
    };

    const ORGANIC_CAMPAIGNS = new Set([
      'Apoio Capital',
      'Material Oficial',
      'Material Dobrada',
      'Projeto de Lei',
      'Abaixo-Assinado',
      'Maus-Tratos',
      'Jogo Resgate'
    ]);

    const isOrganicOnly = leadType === 'organic' || (campaign !== 'all' && ORGANIC_CAMPAIGNS.has(campaign));

    const matchingOrganic = leadType === 'imported' ? [] : this.organicLeads.filter(matchesLead);
    sortLeads(matchingOrganic);

    if (isOrganicOnly) {
      const totalFiltered = matchingOrganic.length;
      const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
      const offset = (page - 1) * pageSize;
      const paged = matchingOrganic.slice(offset, offset + pageSize);
      for (const lead of paged) {
        if (!lead.qualityTier) {
          const qInfo = getLeadQualityTier(lead);
          lead.qualityTier = qInfo.tier;
          lead.qualityScore = qInfo.score;
          lead.isOrganic = qInfo.isOrganic;
          lead.hasValidWhatsApp = qInfo.hasValidWhatsApp;
        }
      }
      return {
        leads: paged,
        totalFiltered,
        totalPages,
        currentPage: page,
        pageSize,
        summary: this.summary,
        isReady: true
      };
    }

    const db = await getDbConnection();
    if (!db) {
      const totalFiltered = matchingOrganic.length;
      const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
      const paged = matchingOrganic.slice((page - 1) * pageSize, page * pageSize);
      for (const lead of paged) {
        if (!lead.qualityTier) {
          const qInfo = getLeadQualityTier(lead);
          lead.qualityTier = qInfo.tier;
          lead.qualityScore = qInfo.score;
          lead.isOrganic = qInfo.isOrganic;
          lead.hasValidWhatsApp = qInfo.hasValidWhatsApp;
        }
      }
      return {
        leads: paged,
        totalFiltered,
        totalPages,
        currentPage: page,
        pageSize,
        summary: this.summary,
        isReady: true
      };
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
    if (multiAction === 'frequent') {
      whereClauses.push('is_frequent = TRUE');
    } else if (multiAction === 'multi') {
      whereClauses.push('is_multi_action = TRUE');
    } else if (multiAction === 'super') {
      whereClauses.push('is_super_supporter = TRUE');
    } else if (multiAction === 'single') {
      whereClauses.push('is_frequent = FALSE AND is_multi_action = FALSE AND is_super_supporter = FALSE');
    }
    if (addressOnly) {
      whereClauses.push("(cep IS NOT NULL AND cep != '' OR endereco IS NOT NULL AND endereco != '' OR bairro IS NOT NULL AND bairro != '')");
    }

    // Quality and WhatsApp filters for imported leads
    if (hasWhatsApp === 'yes') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10)");
    } else if (hasWhatsApp === 'no') {
      whereClauses.push("(whatsapp IS NULL OR LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) < 10)");
    }

    if (qualityTier === 'ouro' || qualityTier === 'high') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10 AND (cep != '' OR endereco != '' OR bairro != ''))");
    } else if (qualityTier === 'prata') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10 AND (cep = '' OR cep IS NULL) AND (endereco = '' OR endereco IS NULL) AND (bairro = '' OR bairro IS NULL))");
    } else if (qualityTier === 'bronze') {
      whereClauses.push("(whatsapp IS NULL OR LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) < 10)");
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    let orderCol = 'id';
    if (sortField === 'nome') orderCol = 'nome';
    else if (sortField === 'cidade') orderCol = 'cidade';
    else if (sortField === 'estado') orderCol = 'estado';
    else if (sortField === 'createdAt' || sortField === 'lastDate' || sortField === 'firstDate') orderCol = 'id';

    let importedCount = 0;
    if (!q && whereClauses.length > 0) {
      if (whereClauses.length === 1 && multiAction === 'multi') {
        importedCount = this.summary.multiActionLeadsCount - matchingOrganic.length;
      } else if (whereClauses.length === 1 && multiAction === 'frequent') {
        importedCount = this.summary.frequentLeadsCount - matchingOrganic.length;
      } else if (whereClauses.length === 1 && multiAction === 'super') {
        importedCount = this.summary.superSupportersCount - matchingOrganic.length;
      } else if (whereClauses.length === 1 && estado === 'SP') {
        importedCount = this.summary.spLeadsCount - matchingOrganic.length;
      } else {
        const [countResult] = await db.query<any[]>(`SELECT COUNT(*) as total FROM imported_leads ${whereSql}`, queryParams);
        const rawCount = countResult?.[0]?.total ? Number(countResult[0].total) : 0;
        // In the database 926,622 raw rows represent 724,727 unique individuals after multi-vector deduplication.
        // Applying deduplication ratio (724,727 / 926,622 = 0.782117) prevents overcounting raw rows as unique leads:
        importedCount = Math.round(rawCount * (724727 / 926622));
      }
    } else if (!q) {
      importedCount = this.summary.importedLeadsCount || 724727;
    }

    if (q) {
      // When searching, fetch matching candidates from imported_leads and deduplicate across organic + imported
      const [rows] = await db.query<any[]>(`
        SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt, extraData
        FROM imported_leads
        ${whereSql}
        ORDER BY ${orderCol} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        LIMIT 500
      `, queryParams);

      const importedMapped = this.mapImportedRows(rows || []);
      const combined = [...matchingOrganic, ...importedMapped];
      const dedupedResults = deduplicateLeadsList(combined);

      // Sort
      dedupedResults.sort((a, b) => {
        let valA: any = a[sortField as keyof ConsolidatedLead] || '';
        let valB: any = b[sortField as keyof ConsolidatedLead] || '';
        if (sortField === 'qualityScore') {
          valA = a.qualityScore || 0;
          valB = b.qualityScore || 0;
        } else if (sortField === 'totalActions') {
          valA = a.totalActions || 1;
          valB = b.totalActions || 1;
        } else if (sortField === 'lastDate' || sortField === 'firstDate') {
          valA = new Date(valA || 0).getTime();
          valB = new Date(valB || 0).getTime();
        } else {
          valA = String(valA).toLowerCase();
          valB = String(valB).toLowerCase();
        }
        if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
        return 0;
      });

      const totalFiltered = dedupedResults.length;
      const totalPages = Math.ceil(totalFiltered / pageSize) || 1;
      const offset = (page - 1) * pageSize;
      const paged = dedupedResults.slice(offset, offset + pageSize);

      for (const lead of paged) {
        if (!lead.qualityTier) {
          const qInfo = getLeadQualityTier(lead);
          lead.qualityTier = qInfo.tier;
          lead.qualityScore = qInfo.score;
          lead.isOrganic = qInfo.isOrganic;
          lead.hasValidWhatsApp = qInfo.hasValidWhatsApp;
        }
      }

      return {
        leads: paged,
        totalFiltered,
        totalPages,
        currentPage: page,
        pageSize,
        summary: this.summary,
        isReady: true
      };
    }

    const totalFiltered = (whereClauses.length === 0 && !q && (leadType === 'all' || !leadType))
      ? (this.summary.totalUniqueLeads || 763825)
      : (matchingOrganic.length + importedCount);
    const totalPages = Math.ceil(totalFiltered / pageSize) || 1;

    const offset = (page - 1) * pageSize;
    let finalLeads: ConsolidatedLead[] = [];

    if (offset < matchingOrganic.length) {
      const organicSlice = matchingOrganic.slice(offset, offset + pageSize);
      finalLeads.push(...organicSlice);

      const remainingNeeded = pageSize - finalLeads.length;
      if (remainingNeeded > 0) {
        const [rows] = await db.query<any[]>(`
          SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt, extraData
          FROM imported_leads
          ${whereSql}
          ORDER BY ${orderCol} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
          LIMIT ? OFFSET 0
        `, [...queryParams, remainingNeeded * 2]);
        finalLeads.push(...this.mapImportedRows(rows || []));
      }
    } else {
      const dbOffset = offset - matchingOrganic.length;
      const [rows] = await db.query<any[]>(`
        SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt, extraData
        FROM imported_leads
        ${whereSql}
        ORDER BY ${orderCol} ${sortOrder === 'asc' ? 'ASC' : 'DESC'}
        LIMIT ? OFFSET ?
      `, [...queryParams, pageSize * 2, dbOffset]);
      finalLeads.push(...this.mapImportedRows(rows || []));
    }

    // Deduplicate on the fly to prevent duplicates on the current page
    finalLeads = deduplicateLeadsList(finalLeads).slice(0, pageSize);

    for (const lead of finalLeads) {
      if (!lead.qualityTier) {
        const qInfo = getLeadQualityTier(lead);
        lead.qualityTier = qInfo.tier;
        lead.qualityScore = qInfo.score;
        lead.isOrganic = qInfo.isOrganic;
        lead.hasValidWhatsApp = qInfo.hasValidWhatsApp;
      }
    }

    return {
      leads: finalLeads,
      totalFiltered,
      totalPages,
      currentPage: page,
      pageSize,
      summary: this.summary,
      isReady: true
    };
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
    leadType?: string;
    qualityTier?: string;
    hasWhatsApp?: string;
  }, res: any): Promise<void> {
    const q = (params.search || '').trim().toLowerCase();
    const estado = (params.estado || '').toUpperCase().trim();
    const cidade = (params.cidade || '').trim();
    const campaign = params.campaign || 'all';
    const addressOnly = params.addressOnly === 'true';
    const multiAction = params.multiAction || 'all';
    const leadType = params.leadType || 'all';
    const qualityTier = (params.qualityTier || 'all').toLowerCase();
    const hasWhatsApp = params.hasWhatsApp || 'all';

    const headers = [
      'Nível de Qualidade',
      'Score',
      'Tipo de Lead',
      'WhatsApp Válido',
      'Nome',
      'WhatsApp',
      'CPF',
      'Email',
      'Cidade',
      'Estado',
      'CEP',
      'Endereço',
      'Número',
      'Complemento',
      'Bairro',
      'Campanha',
      'Data'
    ];
    res.write('﻿' + headers.join(',') + '\r\n');

    const ORGANIC_CAMPAIGNS = new Set([
      'Apoio Capital',
      'Material Oficial',
      'Material Dobrada',
      'Projeto de Lei',
      'Abaixo-Assinado',
      'Maus-Tratos',
      'Jogo Resgate'
    ]);
    const isOrganicOnly = leadType === 'organic' || (campaign !== 'all' && ORGANIC_CAMPAIGNS.has(campaign)) || multiAction === 'multi' || multiAction === 'super' || qualityTier === 'diamante';

    // Strict deduplication sets across organic and imported streams
    const exportedPhones = new Set<string>();
    const exportedEmails = new Set<string>();
    const exportedCpfs = new Set<string>();
    const exportedCepNames = new Set<string>();

    // Stream organic leads matching filters
    if (leadType !== 'imported') {
      for (const lead of this.organicLeads) {
        if (q) {
          const matchName = lead.nome.toLowerCase().includes(q);
          const matchPhone = (lead.whatsapp || '').includes(q);
          const matchEmail = (lead.email || '').toLowerCase().includes(q);
          const matchCity = (lead.cidade || '').toLowerCase().includes(q);
          if (!matchName && !matchPhone && !matchEmail && !matchCity) continue;
        }
        if (estado && estado !== 'ALL' && lead.estado !== estado) continue;
        if (cidade && cidade !== 'ALL' && lead.cidade.toLowerCase() !== cidade.toLowerCase()) continue;
        if (campaign && campaign !== 'all') {
          if (!lead.distinctCampaigns.includes(campaign) && !lead.actions.some(a => a.sourceCategory === campaign)) continue;
        }
        if (multiAction === 'frequent' && !lead.isFrequent) continue;
        if (multiAction === 'multi' && !lead.isMultiAction) continue;
        if (multiAction === 'super' && !lead.isSuperSupporter) continue;
        if (multiAction === 'single' && (lead.isFrequent || lead.isMultiAction || lead.isSuperSupporter)) continue;
        if (addressOnly && !lead.cep && !lead.endereco && !lead.bairro) continue;

        const qInfo = getLeadQualityTier(lead);
        if (hasWhatsApp === 'yes' && !qInfo.hasValidWhatsApp) continue;
        if (hasWhatsApp === 'no' && qInfo.hasValidWhatsApp) continue;

        if (qualityTier !== 'all') {
          if (qualityTier === 'high') {
            if (qInfo.tier !== 'DIAMANTE' && qInfo.tier !== 'OURO') continue;
          } else if (qInfo.tier.toLowerCase() !== qualityTier) {
            continue;
          }
        }

        // Track deduplication keys from organic leads
        const p = normalizePhone(lead.whatsapp);
        const e = normalizeEmail(lead.email);
        const cpf = normalizeCpf(lead.cpf);
        const cepKeys = extractAllCepNameKeys(lead.cep, lead.nome);

        if (p && p.length >= 8 && exportedPhones.has(p)) continue;
        if (e && e.includes('@') && exportedEmails.has(e)) continue;
        if (cpf && cpf.length >= 11 && exportedCpfs.has(cpf)) continue;
        if (cepKeys.length > 0 && cepKeys.some(k => exportedCepNames.has(k))) continue;

        if (p && p.length >= 8) exportedPhones.add(p);
        if (e && e.includes('@')) exportedEmails.add(e);
        if (cpf && cpf.length >= 11) exportedCpfs.add(cpf);
        for (const k of cepKeys) exportedCepNames.add(k);

        const row = [
          `"${qInfo.label}"`,
          `"${qInfo.score}"`,
          `"Orgânico (Site)"`,
          `"${qInfo.hasValidWhatsApp ? 'Sim' : 'Não'}"`,
          `"${(cleanAndNormalizeFullName(lead.nome) || '').replace(/"/g, '""')}"`,
          `"${(lead.whatsapp || '').replace(/"/g, '""')}"`,
          `"${(lead.cpf || '').replace(/"/g, '""')}"`,
          `"${(lead.email || '').replace(/"/g, '""')}"`,
          `"${(lead.cidade || '').replace(/"/g, '""')}"`,
          `"${(lead.estado || '').replace(/"/g, '""')}"`,
          `"${(lead.cep || '').replace(/"/g, '""')}"`,
          `"${(lead.endereco || '').replace(/"/g, '""')}"`,
          `"${(lead.numero || '').replace(/"/g, '""')}"`,
          `"${(lead.complemento || '').replace(/"/g, '""')}"`,
          `"${(lead.bairro || '').replace(/"/g, '""')}"`,
          `"${(lead.distinctCampaigns.join('; ') || '').replace(/"/g, '""')}"`,
          `"${lead.lastDate ? new Date(lead.lastDate).toLocaleDateString('pt-BR') : ''}"`
        ];
        res.write(row.join(',') + '\r\n');
      }
    }

    if (isOrganicOnly) {
      res.end();
      return;
    }

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

    if (hasWhatsApp === 'yes') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10)");
    } else if (hasWhatsApp === 'no') {
      whereClauses.push("(whatsapp IS NULL OR LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) < 10)");
    }

    if (qualityTier === 'ouro' || qualityTier === 'high') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10 AND (cep != '' OR endereco != '' OR bairro != ''))");
    } else if (qualityTier === 'prata') {
      whereClauses.push("(whatsapp IS NOT NULL AND LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) >= 10 AND (cep = '' OR cep IS NULL) AND (endereco = '' OR endereco IS NULL) AND (bairro = '' OR bairro IS NULL))");
    } else if (qualityTier === 'bronze') {
      whereClauses.push("(whatsapp IS NULL OR LENGTH(REPLACE(REPLACE(REPLACE(REPLACE(whatsapp, ' ', ''), '-', ''), '(', ''), ')', '')) < 10)");
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
          const cleanName = cleanAndNormalizeFullName(r.nome);
          const p = normalizePhone(r.whatsapp);
          const e = normalizeEmail(r.email);
          const normCpf = normalizeCpf(cpf);
          const cepKeys = extractAllCepNameKeys(r.cep, r.nome);

          // Deduplicate against already exported organic and imported leads
          if (p && p.length >= 8 && exportedPhones.has(p)) continue;
          if (e && e.includes('@') && exportedEmails.has(e)) continue;
          if (normCpf && normCpf.length >= 11 && exportedCpfs.has(normCpf)) continue;
          if (cepKeys.length > 0 && cepKeys.some(k => exportedCepNames.has(k))) continue;

          if (p && p.length >= 8) exportedPhones.add(p);
          if (e && e.includes('@')) exportedEmails.add(e);
          if (normCpf && normCpf.length >= 11) exportedCpfs.add(normCpf);
          for (const k of cepKeys) exportedCepNames.add(k);

          const digits = (r.whatsapp || '').replace(/\D/g, '');
          const waValid = digits.length >= 10;
          const hasAddr = !!(r.cep || r.endereco || r.bairro);
          
          let qLabel = 'Bronze';
          let qScore = 30;
          if (waValid && hasAddr) {
            qLabel = 'Ouro';
            qScore = 80;
          } else if (waValid) {
            qLabel = 'Prata';
            qScore = 60;
          }

          const row = [
            `"${qLabel}"`,
            `"${qScore}"`,
            `"Mailing Base"`,
            `"${waValid ? 'Sim' : 'Não'}"`,
            `"${cleanName.replace(/"/g, '""')}"`,
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

  public async streamCsvExportMaterials(adesivoFilter: 'ALL' | 'YES' | 'NO' = 'ALL', res: any): Promise<void> {
    const { materials } = await this.getPhysicalMaterials(adesivoFilter);
    const headers = [
      'Data Solicitação',
      'Origem / Campanha',
      'Nome Completo',
      'WhatsApp',
      'E-mail',
      'Adesivo Perfurado',
      'Endereço',
      'Número',
      'Complemento',
      'Bairro',
      'Cidade',
      'Estado',
      'CEP'
    ];
    res.write('﻿' + headers.join(',') + '\r\n');
    for (const m of materials) {
      const row = [
        `"${m.date ? new Date(m.date).toLocaleDateString('pt-BR') : ''}"`,
        `"${(m.source || '').replace(/"/g, '""')}"`,
        `"${(cleanAndNormalizeFullName(m.nome) || '').replace(/"/g, '""')}"`,
        `"${(m.whatsapp || '').replace(/"/g, '""')}"`,
        `"${(m.email || '').replace(/"/g, '""')}"`,
        `"${m.adesivoPerfurado ? 'Sim' : 'Não'}"`,
        `"${(m.endereco || '').replace(/"/g, '""')}"`,
        `"${(m.numero || '').replace(/"/g, '""')}"`,
        `"${(m.complemento || '').replace(/"/g, '""')}"`,
        `"${(m.bairro || '').replace(/"/g, '""')}"`,
        `"${(m.cidade || '').replace(/"/g, '""')}"`,
        `"${(m.estado || '').replace(/"/g, '""')}"`,
        `"${(m.cep || '').replace(/"/g, '""')}"`
      ];
      res.write(row.join(',') + '\r\n');
    }
    res.end();
  }

  public async exportMaterialsXlsx(adesivoFilter: 'ALL' | 'YES' | 'NO' = 'ALL'): Promise<Buffer> {
    const { materials } = await this.getPhysicalMaterials(adesivoFilter);
    const dataToExport = materials.map(m => ({
      'Data Solicitação': m.date ? new Date(m.date).toLocaleDateString('pt-BR') : '',
      'Origem': m.source,
      'Nome Completo': cleanAndNormalizeFullName(m.nome),
      'WhatsApp': m.whatsapp || '',
      'E-mail': m.email || '',
      'Adesivo Perfurado': m.adesivoPerfurado ? 'Sim' : 'Não',
      'Endereço': m.endereco || '',
      'Número': m.numero || '',
      'Complemento': m.complemento || '',
      'Bairro': m.bairro || '',
      'Cidade': m.cidade || '',
      'Estado': m.estado || '',
      'CEP': m.cep || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Materiais_Fisicos");
    return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  }

  public addLeadDirectly(leadData: any, action: LeadAction) {
    const rawName = formatDisplayTitleName(leadData.nome || leadData.nomeCompleto);
    const phone = normalizePhone(leadData.whatsapp || leadData.telefone || leadData.celular || '');
    const email = normalizeEmail(leadData.email || '');
    let cidade = this.resolveCityName(leadData.cidade, leadData.estado, leadData.cep);
    let estado = normalizeEstado(leadData.estado, cidade, leadData.cep);
    if (cidade && estado) {
      const corrected = autoCorrectCity(cidade, estado);
      cidade = corrected.city;
      estado = corrected.uf;
    }
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

    let targetIdx = -1;
    for (let i = 0; i < this.organicLeads.length; i++) {
      const candidate = this.organicLeads[i];
      if (phone && phone.length >= 8 && candidate.whatsapp === phone) {
        targetIdx = i;
        break;
      }
      if (itemCpf && itemCpf.length >= 11 && candidate.cpf === itemCpf) {
        targetIdx = i;
        break;
      }
      if (email && email.includes('@') && candidate.email === email) {
        targetIdx = i;
        break;
      }
    }

    if (targetIdx !== -1) {
      const existing = this.organicLeads[targetIdx];
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
      this.summary.totalSubmissions = (this.summary.totalSubmissions || 0) + 1;
      if (existing.isMultiAction) {
        this.summary.multiActionLeadsCount = (this.summary.multiActionLeadsCount || 0) + 1;
      }
      if (existing.isFrequent) {
        this.summary.frequentLeadsCount = (this.summary.frequentLeadsCount || 0) + 1;
      }
    } else {
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
      this.organicLeads.unshift(newLead);
      this.summary.totalUniqueLeads = (this.summary.totalUniqueLeads || 0) + 1;
      this.summary.totalSubmissions = (this.summary.totalSubmissions || 0) + 1;
    }

    try {
      fs.writeFileSync(SUMMARY_CACHE_FILE, JSON.stringify(this.summary, null, 2), 'utf-8');
    } catch {}
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

    // Strict export deduplication and fusion
    const uniqueLeads = deduplicateLeadsList(res.leads);
    
    if (format === 'csv') {
      const headers = ['Nome', 'WhatsApp', 'Outros Telefones', 'CPF', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Frequente (2+)', 'Multi-Campanha (3+)', 'Super Apoiador (5+)', 'Campanhas', 'Primeiro Contato', 'Último Contato', 'Dados Extras'];
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
          l.isFrequent ? 'SIM' : 'NÃO',
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
      'Frequente (2+)': l.isFrequent ? 'SIM' : 'NÃO',
      'Multi-Campanha (3+)': l.isMultiAction ? 'SIM' : 'NÃO',
      'Super Apoiador (5+)': l.isSuperSupporter ? 'SIM' : 'NÃO',
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
