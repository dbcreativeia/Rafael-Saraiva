import fs from 'fs';
import path from 'path';
import * as XLSX from 'xlsx';
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
const CACHE_VERSION = 'v3_strict_phone_and_fullname_dedup';
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
  let digits = p.replace(/\D/g, '');
  if (digits.length === 0) return '';
  if (digits.startsWith('0') && digits.length > 10) digits = digits.substring(1);
  if (digits.startsWith('55') && digits.length >= 12) return digits;
  if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
  return digits;
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
  return COLD_IMPORTED_BASES.has(category.toLowerCase().trim());
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
  lead.totalActions = actions.length;

  // Rule: Do NOT consider multi-campanha or super apoiadores if the ONLY actions are from
  // "Lista de Telefones Completos" or "Endereços Completos Geral"
  const onlyCold = actions.length > 0 && actions.every(a => isColdImportedBase(a.sourceCategory));
  if (onlyCold || actions.length === 0) {
    lead.isMultiAction = false;
    lead.isSuperSupporter = false;
    return;
  }

  // Count distinct campaign sources, grouping cold imported bases as at most 1 base contact source
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

  // Multi-action: has at least one real engagement + another source (or 2+ real engagements)
  lead.isMultiAction = distinctSources.size > 1 || realActionsCount > 1;

  // Super supporter: at least 3 distinct campaign engagements
  lead.isSuperSupporter = distinctSources.size >= 3;
}

class LeadsConsolidationManager {
  private consolidatedLeads: ConsolidatedLead[] = [];
  private phoneMap: Map<string, number> = new Map();
  private emailMap: Map<string, number> = new Map();
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
  private municipiosSP: Array<{ codigo_ibge: number; nome: string; latitude: number; longitude: number }> = [];
  private spCitiesMap: Map<string, string> = new Map();

  constructor() {
    this.initMaps();
    const loaded = this.loadFromDiskCache();
    if (!loaded) {
      setTimeout(() => {
        this.refreshFromDatabase().catch(err => console.error('Auto startup refresh error:', err));
      }, 1500);
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

  private loadFromDiskCache(): boolean {
    if (!fs.existsSync(CACHE_FILE)) {
      return false;
    }
    try {
      console.log('⚡ Loading consolidated leads from local disk cache...');
      const start = Date.now();
      const content = fs.readFileSync(CACHE_FILE, 'utf-8');
      const data = JSON.parse(content);
      if (data && data.version === CACHE_VERSION && Array.isArray(data.leads) && data.summary) {
        this.consolidatedLeads = data.leads;
        // Re-sanitize states and apply new multi-action/super-supporter business rules
        for (let i = 0; i < this.consolidatedLeads.length; i++) {
          const l = this.consolidatedLeads[i];
          l.estado = normalizeEstado(l.estado, l.cidade, l.cep);
          updateLeadMultiActionStatus(l);
        }
        this.physicalMaterials = Array.isArray(data.physicalMaterials) ? data.physicalMaterials : [];
        this.rebuildIndexes();
        this.computeSummary();
        this.isReady = true;
        this.saveToDiskCache();
        console.log(`✅ Loaded and sanitized ${this.consolidatedLeads.length} leads from disk cache in ${Date.now() - start}ms!`);
        return true;
      }
    } catch (err) {
      console.error('Failed to read disk cache:', err);
    }
    return false;
  }

  private rebuildIndexes() {
    this.phoneMap.clear();
    this.emailMap.clear();
    this.nameCityMap.clear();

    for (let i = 0; i < this.consolidatedLeads.length; i++) {
      const lead = this.consolidatedLeads[i];
      const p = normalizePhone(lead.whatsapp);
      if (p && p.length >= 8) this.phoneMap.set(p, i);
      const e = normalizeEmail(lead.email);
      if (e && e.includes('@')) this.emailMap.set(e, i);
      if (isValidFullNameForMatching(lead.nome)) {
        const nKey = normalizeKey(lead.nome);
        const cKey = normalizeKey(lead.cidade);
        if (nKey && nKey.length >= 6 && cKey) {
          this.nameCityMap.set(`${nKey}__${cKey}`, i);
        }
      }
    }
  }

  public async refresh(): Promise<void> {
    return this.refreshFromDatabase();
  }

  public async refreshFromDatabase(): Promise<void> {
    if (this.isRefreshing) return;
    this.isRefreshing = true;

    try {
      const db = await getDbConnection();
      if (!db) {
        console.log('No database connection available for refresh.');
        this.isRefreshing = false;
        return;
      }

      console.log('🔄 Starting full database lead consolidation in background...');
      const start = Date.now();

      const [popupApoio] = await db.query('SELECT * FROM popup_apoio').catch(() => [[]]);
      const [materialCampaign] = await db.query('SELECT * FROM material_campaign').catch(() => [[]]);
      const [ninaCampaign] = await db.query('SELECT * FROM ninapassadore_campaign').catch(() => [[]]);
      const [citizens] = await db.query('SELECT * FROM citizens').catch(() => [[]]);
      const [petitions] = await db.query('SELECT * FROM petitions').catch(() => [[]]);
      const [contraMausTratos] = await db.query('SELECT * FROM contra_maus_tratos').catch(() => [[]]);
      const [jogoUsers] = await db.query('SELECT * FROM jogo_users').catch(() => [[]]);
      
      const leads: ConsolidatedLead[] = [];
      const phoneIndex = new Map<string, number>();
      const emailIndex = new Map<string, number>();
      const nameCityIndex = new Map<string, number>();
      const materialsMap = new Map<string, PhysicalMaterialItem>();

      const addOrMerge = (data: any, action: LeadAction) => {
        const rawName = formatDisplayTitleName(data.nome || data.nomeCompleto);
        const phone = normalizePhone(data.whatsapp || data.telefone || data.celular || '');
        const email = normalizeEmail(data.email || '');
        const cidade = this.resolveCityName(data.cidade, data.estado, data.cep);
        const estado = normalizeEstado(data.estado, cidade, data.cep);
        const date = action.date || new Date().toISOString();
        const cep = (data.cep || '').trim();
        const endereco = fixMojibake(data.endereco || '');
        const numero = data.numero || '';
        const complemento = fixMojibake(data.complemento || '');
        const bairro = fixMojibake(data.bairro || '');

        const isFullName = isValidFullNameForMatching(rawName);
        const nKey = isFullName ? normalizeKey(rawName) : '';
        const cKey = normalizeKey(cidade);
        const nameCityKey = nKey && nKey.length >= 6 && cKey ? `${nKey}__${cKey}` : '';

        let targetIdx = -1;
        if (phone && phone.length >= 8 && phoneIndex.has(phone)) {
          targetIdx = phoneIndex.get(phone)!;
        } else if (email && email.includes('@') && emailIndex.has(email)) {
          const candidateIdx = emailIndex.get(email)!;
          const candidate = leads[candidateIdx];
          const candPhone = candidate.whatsapp;
          // Never merge if phone numbers conflict!
          const hasPhoneConflict = !!(phone && phone.length >= 8 && candPhone && candPhone.length >= 8 && phone !== candPhone);
          if (!hasPhoneConflict) {
            targetIdx = candidateIdx;
          }
        } else if (nameCityKey && nameCityIndex.has(nameCityKey)) {
          const candidateIdx = nameCityIndex.get(nameCityKey)!;
          const candidate = leads[candidateIdx];
          const candPhone = candidate.whatsapp;
          const candEmail = candidate.email;
          // Never merge if phone numbers or emails conflict!
          const hasPhoneConflict = !!(phone && phone.length >= 8 && candPhone && candPhone.length >= 8 && phone !== candPhone);
          const hasEmailConflict = !!(email && email.includes('@') && candEmail && candEmail.includes('@') && email !== candEmail);

          if (!hasPhoneConflict && !hasEmailConflict) {
            targetIdx = candidateIdx;
          }
        }

        if (targetIdx !== -1) {
          const existing = leads[targetIdx];
          const hasDup = existing.actions.some(a => a.sourceCategory === action.sourceCategory);
          if (!hasDup) {
            existing.actions.push(action);
            existing.totalActions = existing.actions.length;
          }
          if (!existing.distinctCampaigns.includes(action.sourceCategory)) {
            existing.distinctCampaigns.push(action.sourceCategory);
          }

          // Upgrade fields
          if (rawName && (!existing.nome || existing.nome === 'Sem Nome' || (existing.nome.length < rawName.length && rawName !== 'Sem Nome' && !rawName.toLowerCase().includes('apoiador importado')))) {
            existing.nome = rawName;
          }
          if (phone && !existing.whatsapp) {
            existing.whatsapp = phone;
            phoneIndex.set(phone, targetIdx);
          }
          if (email && !existing.email) {
            existing.email = email;
            emailIndex.set(email, targetIdx);
          }
          if (cep && (!existing.cep || existing.cep.length < 8)) existing.cep = cep;
          if (endereco && (!existing.endereco || existing.endereco.length < 3)) existing.endereco = endereco;
          if (numero && !existing.numero) existing.numero = numero;
          if (complemento && !existing.complemento) existing.complemento = complemento;
          if (bairro && !existing.bairro) existing.bairro = bairro;
          if (cidade && existing.cidade === 'São Paulo' && cidade !== 'São Paulo') existing.cidade = cidade;
          if (estado && (!existing.estado || existing.estado === 'SP')) existing.estado = estado;
          existing.estado = normalizeEstado(existing.estado, existing.cidade, existing.cep);

          if (new Date(date).getTime() < new Date(existing.firstDate).getTime()) {
            existing.firstDate = date;
          }
          if (new Date(date).getTime() > new Date(existing.lastDate).getTime()) {
            existing.lastDate = date;
          }

          if (nameCityKey && !nameCityIndex.has(nameCityKey)) {
            nameCityIndex.set(nameCityKey, targetIdx);
          }
        } else {
          const newIdx = leads.length;
          const newLead: ConsolidatedLead = {
            id: data.id ? String(data.id) : `lead_${newIdx}_${Math.random().toString(36).substring(2, 7)}`,
            nome: rawName,
            whatsapp: phone,
            email: email,
            cep: cep,
            endereco: endereco,
            numero: numero,
            complemento: complemento,
            bairro: bairro,
            cidade: cidade,
            estado: estado,
            totalActions: 1,
            isMultiAction: false,
            isSuperSupporter: false,
            distinctCampaigns: [action.sourceCategory],
            firstDate: date,
            lastDate: date,
            actions: [action]
          };
          leads.push(newLead);
          if (phone && phone.length >= 8) phoneIndex.set(phone, newIdx);
          if (email && email.includes('@')) emailIndex.set(email, newIdx);
          if (nameCityKey) nameCityIndex.set(nameCityKey, newIdx);
        }

        // Check physical materials
        const isImpresso = data.tipoMaterial === 'impresso' || action.details?.tipoMaterial === 'impresso';
        const isPerfurado = !!data.adesivoPerfurado || !!action.details?.adesivoPerfurado || (data.campanha && String(data.campanha).toLowerCase().includes('perfurado'));
        const isMaterialCamp = action.sourceKey === 'MATERIAL' || action.sourceKey === 'NINA' || (data.campanha && String(data.campanha).toLowerCase().includes('material'));

        if (isImpresso || (isMaterialCamp && (isPerfurado || data.endereco))) {
          const matKey = phone || email || (nameCityKey || `mat_${Math.random()}`);
          let sourceLabel = action.sourceName;
          if (action.sourceKey === 'MATERIAL') sourceLabel = 'Oficial Rafael';
          else if (action.sourceKey === 'NINA') sourceLabel = 'Dobrada Nina';

          if (materialsMap.has(matKey)) {
            const m = materialsMap.get(matKey)!;
            if (m.source !== sourceLabel && !m.source.includes('Ambos')) {
              m.source = 'Ambos (Rafael + Nina)';
            }
            if (isPerfurado) m.adesivoPerfurado = true;
            if (new Date(date).getTime() > new Date(m.date).getTime()) m.date = date;
          } else {
            materialsMap.set(matKey, {
              id: `mat_${materialsMap.size}_${Math.random().toString(36).substring(2, 6)}`,
              date: date,
              source: sourceLabel,
              nome: rawName,
              sobrenome: data.sobrenome || '',
              whatsapp: phone,
              email: email,
              adesivoPerfurado: isPerfurado,
              endereco: endereco,
              numero: numero,
              complemento: complemento,
              bairro: bairro,
              cidade: cidade,
              estado: estado,
              cep: cep
            });
          }
        }
      };

      // Process all sources
      (popupApoio as any[]).forEach(item => addOrMerge(item, {
        id: `apoio_${item.id}`,
        sourceKey: 'APOIO',
        sourceName: 'Apoio Capital / SP',
        sourceCategory: 'Apoio Capital',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, bairro: item.bairro, cep: item.cep }
      }));

      (materialCampaign as any[]).forEach(item => addOrMerge(item, {
        id: `mat_${item.id}`,
        sourceKey: 'MATERIAL',
        sourceName: `Material Campanha (${item.tipoMaterial === 'impresso' ? 'Impresso' : 'Digital'})`,
        sourceCategory: 'Material Oficial',
        date: item.createdAt,
        details: { tipoMaterial: item.tipoMaterial, adesivoPerfurado: !!item.adesivoPerfurado, cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      (ninaCampaign as any[]).forEach(item => addOrMerge(item, {
        id: `nina_${item.id}`,
        sourceKey: 'NINA',
        sourceName: `Material Dobrada Nina (${item.tipoMaterial === 'impresso' ? 'Impresso' : 'Digital'})`,
        sourceCategory: 'Material Dobrada',
        date: item.createdAt,
        details: { tipoMaterial: item.tipoMaterial, adesivoPerfurado: !!item.adesivoPerfurado, cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      (citizens as any[]).forEach(item => addOrMerge(item, {
        id: `cit_${item.id}`,
        sourceKey: 'CITIZENS',
        sourceName: 'Minuta Código Animal (PL)',
        sourceCategory: 'Projeto de Lei',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      (petitions as any[]).forEach(item => addOrMerge(item, {
        id: `pet_${item.id}`,
        sourceKey: 'PETITIONS',
        sourceName: 'Abaixo-Assinado Código Animal',
        sourceCategory: 'Abaixo-Assinado',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      (contraMausTratos as any[]).forEach(item => addOrMerge(item, {
        id: `cmt_${item.id}`,
        sourceKey: 'CONTRA_MAUS_TRATOS',
        sourceName: 'Assinatura Contra Maus-Tratos',
        sourceCategory: 'Maus-Tratos',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
      }));

      (jogoUsers as any[]).forEach(item => addOrMerge(item, {
        id: `jogo_${item.id}`,
        sourceKey: 'JOGO',
        sourceName: 'Jogador Missão Resgate',
        sourceCategory: 'Jogo Resgate',
        date: item.createdAt,
        details: { cidade: item.cidade, estado: item.estado, usuario: item.usuario }
      }));

      // Stream imported leads in chunks to prevent OOM
      let offset = 0;
      const limit = 50000;
      while (true) {
        try {
          const [importedChunk] = await db.query(`SELECT id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, createdAt FROM imported_leads LIMIT ${limit} OFFSET ${offset}`);
          const chunk = importedChunk as any[];
          if (chunk.length === 0) break;
          
          chunk.forEach(item => addOrMerge(item, {
            id: `imp_${item.id}`,
            sourceKey: 'IMPORTED',
            sourceName: `Base Externa: ${item.campanha || 'Importação CSV'}`,
            sourceCategory: item.campanha || 'Base Externa',
            date: item.createdAt,
            details: { cidade: item.cidade, estado: item.estado, endereco: item.endereco, numero: item.numero, bairro: item.bairro, cep: item.cep }
          }));
          
          offset += limit;
        } catch (err) {
          console.error("Error fetching imported_leads chunk:", err);
          break;
        }
      }

      // Sort actions descending and update multi-action / super-supporter status
      leads.forEach(l => {
        l.actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        l.estado = normalizeEstado(l.estado, l.cidade, l.cep);
        updateLeadMultiActionStatus(l);
      });

      this.consolidatedLeads = leads;
      this.phoneMap = phoneIndex;
      this.emailMap = emailIndex;
      this.nameCityMap = nameCityIndex;
      this.physicalMaterials = Array.from(materialsMap.values()).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Generate summary
      this.computeSummary();
      this.isReady = true;

      console.log(`✨ Consolidation complete in ${Date.now() - start}ms: ${leads.length} unique leads.`);

      // Write to disk cache asynchronously
      this.saveToDiskCache();

    } catch (err) {
      console.error('Error in refreshFromDatabase:', err);
    } finally {
      this.isRefreshing = false;
    }
  }

  private computeSummary() {
    const states = new Set<string>();
    const citiesMap = new Map<string, number>();
    const campaignsSet = new Set<string>([
      'Apoio Capital',
      'Material Oficial',
      'Material Dobrada',
      'Projeto de Lei',
      'Abaixo-Assinado',
      'Maus-Tratos',
      'Jogo Resgate'
    ]);

    let totalSubmissions = 0;
    let multiActionCount = 0;
    let superSupportersCount = 0;
    let spLeadsCount = 0;

    // SP City map for heatmap
    const spCityMap: Record<string, { count: number; totalActions: number; multiCount: number }> = {};

    for (let i = 0; i < this.consolidatedLeads.length; i++) {
      const l = this.consolidatedLeads[i];
      totalSubmissions += l.totalActions;
      if (l.isMultiAction) multiActionCount++;
      if (l.isSuperSupporter) superSupportersCount++;
      if (l.estado === 'SP' || !l.estado) spLeadsCount++;

      if (l.estado && VALID_BRAZILIAN_UFS.has(l.estado)) {
        states.add(l.estado);
      }
      const c = l.cidade || 'São Paulo';
      citiesMap.set(c, (citiesMap.get(c) || 0) + 1);

      l.distinctCampaigns.forEach(camp => {
        if (camp) campaignsSet.add(camp);
      });

      if (l.estado === 'SP' || !l.estado) {
        const normCity = normalizeKey(c);
        if (!spCityMap[normCity]) {
          spCityMap[normCity] = { count: 0, totalActions: 0, multiCount: 0 };
        }
        spCityMap[normCity].count++;
        spCityMap[normCity].totalActions += l.totalActions;
        if (l.isMultiAction) spCityMap[normCity].multiCount++;
      }
    }

    // Heatmap calculation
    const spHeatmapPoints: HeatmapPoint[] = [];
    this.municipiosSP.forEach(mun => {
      const norm = normalizeKey(mun.nome);
      const data = spCityMap[norm];
      if (data && data.count > 0) {
        let densityColor = '#3B82F6';
        if (data.count >= 5000) densityColor = '#450A0A';
        else if (data.count >= 800) densityColor = '#7F1D1D';
        else if (data.count >= 400) densityColor = '#DC2626';
        else if (data.count >= 150) densityColor = '#EA580C';
        else if (data.count >= 50) densityColor = '#F59E0B';
        else if (data.count >= 15) densityColor = '#8B5CF6';

        const radius = Math.min(38, Math.max(5, Math.log10(data.count + 1) * 10));

        spHeatmapPoints.push({
          lat: mun.latitude,
          lng: mun.longitude,
          name: mun.nome,
          count: data.count,
          totalActions: data.totalActions,
          multiCount: data.multiCount,
          densityColor,
          radius
        });
      }
    });

    spHeatmapPoints.sort((a, b) => b.count - a.count);

    const cityOptions = Array.from(citiesMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const sortedStates = Array.from(states).sort((a, b) => {
      if (a === 'SP') return -1;
      if (b === 'SP') return 1;
      return a.localeCompare(b);
    });

    this.summary = {
      totalUniqueLeads: this.consolidatedLeads.length,
      totalSubmissions,
      multiActionLeadsCount: multiActionCount,
      superSupportersCount,
      spLeadsCount,
      stateOptions: sortedStates,
      cityOptions,
      campaignOptions: Array.from(campaignsSet),
      spHeatmapPoints,
      lastUpdated: new Date().toISOString()
    };
  }

  private saveToDiskCache() {
    try {
      console.log('💾 Saving leads to disk cache...');
      const payload = {
        version: CACHE_VERSION,
        summary: this.summary,
        physicalMaterials: this.physicalMaterials,
        leads: this.consolidatedLeads
      };
      const tmpFile = CACHE_FILE + '.tmp';
      fs.writeFileSync(tmpFile, JSON.stringify(payload), 'utf-8');
      fs.renameSync(tmpFile, CACHE_FILE);
      console.log('✅ Disk cache updated successfully.');
    } catch (e) {
      console.error('Failed to write disk cache:', e);
    }
  }

  public getSummary(): LeadsSummary & { isReady: boolean } {
    return {
      ...this.summary,
      isReady: this.isReady
    };
  }

  public getPaginatedLeads(params: {
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
    const q = (params.search || '').toLowerCase().trim();
    const estado = (params.estado || '').toUpperCase().trim();
    const cidade = (params.cidade || '').toLowerCase().trim();
    const campaign = params.campaign || 'all';
    const multiAction = params.multiAction || 'all';
    const sortField = params.sortField || 'lastDate';
    const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
    const page = Math.max(1, Number(params.page) || 1);
    const pageSize = Math.max(1, Math.min(500000, Number(params.pageSize) || 100));
    const addressOnly = params.addressOnly === 'true';

    let filtered = this.consolidatedLeads;

    // Filter
    if (q || estado || cidade || campaign !== 'all' || multiAction !== 'all' || addressOnly) {
      filtered = filtered.filter(lead => {
        if (addressOnly) {
          if (!lead.cep && !lead.endereco && !lead.bairro) return false;
        }
        if (q) {
          const matchNome = lead.nome.toLowerCase().includes(q);
          const matchPhone = lead.whatsapp.toLowerCase().includes(q);
          const matchEmail = lead.email.toLowerCase().includes(q);
          const matchCidade = (lead.cidade || '').toLowerCase().includes(q);
          const matchBairro = (lead.bairro || '').toLowerCase().includes(q);
          const matchCep = (lead.cep || '').toLowerCase().includes(q);
          const matchCamp = lead.distinctCampaigns.some(c => c.toLowerCase().includes(q));
          if (!matchNome && !matchPhone && !matchEmail && !matchCidade && !matchBairro && !matchCep && !matchCamp) {
            return false;
          }
        }
        if (estado && lead.estado?.toUpperCase() !== estado) return false;
        if (cidade && lead.cidade?.toLowerCase() !== cidade) return false;
        if (campaign !== 'all' && !lead.distinctCampaigns.includes(campaign)) return false;
        if (multiAction === 'multi' && !lead.isMultiAction) return false;
        if (multiAction === 'super' && !lead.isSuperSupporter) return false;
        if (multiAction === 'single' && lead.isMultiAction) return false;
        return true;
      });
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (sortField === 'lastDate' || sortField === 'firstDate') {
        valA = new Date(valA || 0).getTime();
        valB = new Date(valB || 0).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const totalFiltered = filtered.length;
    const totalPages = Math.ceil(totalFiltered / pageSize);
    const startIndex = (page - 1) * pageSize;
    const leads = filtered.slice(startIndex, startIndex + pageSize);

    return {
      leads,
      totalFiltered,
      totalPages,
      currentPage: page,
      pageSize,
      summary: this.summary,
      isReady: this.isReady
    };
  }

  public getPhysicalMaterials(adesivoFilter: 'ALL' | 'YES' | 'NO' = 'ALL') {
    let list = this.physicalMaterials;
    if (adesivoFilter === 'YES') list = list.filter(m => m.adesivoPerfurado);
    else if (adesivoFilter === 'NO') list = list.filter(m => !m.adesivoPerfurado);

    return {
      materials: list,
      total: list.length
    };
  }

  public addLeadDirectly(leadData: any, action: LeadAction) {
    // Fast O(1) merge for new incoming web form submissions
    const rawName = formatDisplayTitleName(leadData.nome || leadData.nomeCompleto);
    const phone = normalizePhone(leadData.whatsapp || leadData.telefone || leadData.celular || '');
    const email = normalizeEmail(leadData.email || '');
    const cidade = this.resolveCityName(leadData.cidade, leadData.estado, leadData.cep);
    const estado = normalizeEstado(leadData.estado, cidade, leadData.cep);
    const date = action.date || new Date().toISOString();

    const isFullName = isValidFullNameForMatching(rawName);
    const nKey = isFullName ? normalizeKey(rawName) : '';
    const cKey = normalizeKey(cidade);
    const nameCityKey = nKey && nKey.length >= 6 && cKey ? `${nKey}__${cKey}` : '';

    let targetIdx = -1;
    if (phone && phone.length >= 8 && this.phoneMap.has(phone)) {
      targetIdx = this.phoneMap.get(phone)!;
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
      if (new Date(date).getTime() > new Date(existing.lastDate).getTime()) {
        existing.lastDate = date;
      }
    } else {
      const newIdx = this.consolidatedLeads.length;
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
        actions: [action]
      };
      updateLeadMultiActionStatus(newLead);
      this.consolidatedLeads.unshift(newLead);
      this.rebuildIndexes();
    }

    // Refresh summary
    this.computeSummary();
  }

  public removeCampaign(campaignName: string) {
    const cleanTarget = campaignName.toLowerCase().trim();
    this.consolidatedLeads = this.consolidatedLeads.filter(lead => {
      lead.actions = lead.actions.filter(a => a.sourceCategory.toLowerCase().trim() !== cleanTarget);
      lead.distinctCampaigns = lead.distinctCampaigns.filter(c => c.toLowerCase().trim() !== cleanTarget);
      updateLeadMultiActionStatus(lead);
      return lead.actions.length > 0;
    });
    this.rebuildIndexes();
    this.computeSummary();
    this.saveToDiskCache();
  }

  public exportLeads(params: {
    search?: string;
    estado?: string;
    cidade?: string;
    campaign?: string;
    multiAction?: string;
    sortField?: string;
    sortOrder?: string;
    addressOnly?: string;
  }, format: 'xlsx' | 'csv' = 'xlsx'): Buffer {
    const res = this.getPaginatedLeads({ ...params, page: 1, pageSize: 500000 });
    
    if (format === 'csv') {
      const headers = ['Nome', 'WhatsApp', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Multi-Campanha', 'Super Apoiador', 'Campanhas', 'Primeiro Contato', 'Último Contato'];
      const csvRows = [headers.join(',')];
      
      for (const l of res.leads) {
        const row = [
          `"${(l.nome || '').replace(/"/g, '""')}"`,
          `"${(l.whatsapp || '').replace(/"/g, '""')}"`,
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
          `"${l.lastDate ? new Date(l.lastDate).toLocaleDateString('pt-BR') : ''}"`
        ];
        csvRows.push(row.join(','));
      }
      return Buffer.from('\uFEFF' + csvRows.join('\n'), 'utf-8');
    }

    const rows = res.leads.map(l => ({
      'Nome': l.nome,
      'WhatsApp': l.whatsapp,
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
      'Último Contato': l.lastDate ? new Date(l.lastDate).toLocaleDateString('pt-BR') : ''
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Leads Consolidados');

    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }
}

export const leadsConsolidator = new LeadsConsolidationManager();
