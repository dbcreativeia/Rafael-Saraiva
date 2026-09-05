import { CityDistributionMap } from '../CityDistributionMap';
import { spCitiesList, spCitiesCleanMap, spCitiesNormMap, fixMojibake, isSpCity, knownNonSpCities } from '../../data/spCities';
import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
  Database,
  Trash2,
  FileSpreadsheet,
  Filter, 
  Users, 
  UserCheck, 
  Flame, 
  MapPin, 
  Calendar, 
  ArrowUpDown, 
  Sparkles, 
  CheckCircle2, 
  ExternalLink, 
  Layers, 
  MessageSquare, 
  Eye, 
  X, 
  ChevronRight, 
  Package, 
  HeartHandshake, 
  Gamepad2, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Map as MapIcon, 
  ListFilter,
  Award,
  AlertCircle,
  Check
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface LeadAction {
  id: string;
  sourceKey: 'APOIO' | 'MATERIAL' | 'NINA' | 'CITIZENS' | 'PETITIONS' | 'CONTRA_MAUS_TRATOS' | 'JOGO' | 'IMPORTED';
  sourceName: string;
  sourceCategory: string;
  date: string;
  rawItem: any;
  details: {
    tipoMaterial?: string;
    adesivoPerfurado?: boolean;
    cidade?: string;
    estado?: string;
    endereco?: string;
    numero?: string;
    complemento?: string;
    bairro?: string;
    cep?: string;
    score?: number;
    usuario?: string;
    extraData?: Record<string, string>;
  };
}

export interface ConsolidatedLead {
  id: string;
  nome: string;
  whatsapp: string;
  email: string;
  cidade: string;
  estado: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string;
  bairro: string;
  totalActions: number;
  distinctCampaigns: string[];
  isMultiAction: boolean;
  isSuperSupporter?: boolean;
  firstDate: string;
  lastDate: string;
  actions: LeadAction[];
  extraData?: Record<string, string>;
}

interface CentralLeadsTabProps {
  refreshTrigger?: number;
}

const SYSTEM_FIELDS = [
  { id: 'nome', label: 'Nome Completo', aliases: ['nome completo', 'full name', 'nomecompleto', 'nome', 'name', 'contato', 'lead', 'apoiador', 'primeiro nome'] },
  { id: 'sobrenome', label: 'Sobrenome', aliases: ['sobrenome', 'last name', 'segundo nome'] },
  { id: 'whatsapp', label: 'WhatsApp / Celular', aliases: ['whatsapp', 'whats', 'celular', 'telefone', 'phone', 'tel', 'fone', 'mobile', 'contato'] },
  { id: 'email', label: 'E-mail', aliases: ['email', 'e-mail', 'mail', 'correio'] },
  { id: 'cep', label: 'CEP', aliases: ['cep', 'zip', 'zipcode', 'codigo postal', 'postal'] },
  { id: 'estado', label: 'Estado (UF)', aliases: ['estado', 'state', 'uf'] },
  { id: 'cidade', label: 'Cidade', aliases: ['cidade', 'city', 'municipio', 'município'] },
  { id: 'endereco', label: 'Endereço / Rua', aliases: ['endereco', 'endereço', 'rua', 'logradouro', 'address', 'street'] },
  { id: 'numero', label: 'Número', aliases: ['numero', 'número', 'num', 'number'] },
  { id: 'complemento', label: 'Complemento', aliases: ['complemento', 'comp', 'complement'] },
  { id: 'bairro', label: 'Bairro', aliases: ['bairro', 'neighborhood', 'distrito'] },
  { id: 'adesivos', label: 'Adesivos (Qtd)', aliases: ['adesivos', 'adesivo', 'qtd adesivos', 'quantidade adesivos'] },
  { id: 'adesivo_perfurado', label: 'Adesivo Perfurado', aliases: ['adesivo perfurado', 'perfurado', 'perfurade', 'adesivo carro'] },
];

export const CentralLeadsTab: React.FC<CentralLeadsTabProps> = ({ refreshTrigger }) => {
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'LIST' | 'HEATMAP' | 'MATERIAL'>('LIST');
  const [materialFilterAdesivo, setMaterialFilterAdesivo] = useState<'ALL' | 'YES' | 'NO'>('ALL');

  // Server-side consolidated state
  const [summary, setSummary] = useState<{
    totalUniqueLeads: number;
    totalSubmissions: number;
    multiActionLeadsCount: number;
    superSupportersCount: number;
    spLeadsCount: number;
    stateOptions: string[];
    cityOptions: { name: string; count: number }[];
    campaignOptions: string[];
    spHeatmapPoints: any[];
  }>({
    totalUniqueLeads: 0,
    totalSubmissions: 0,
    multiActionLeadsCount: 0,
    superSupportersCount: 0,
    spLeadsCount: 0,
    stateOptions: [],
    cityOptions: [],
    campaignOptions: [],
    spHeatmapPoints: []
  });

  const [serverLeads, setServerLeads] = useState<ConsolidatedLead[]>([]);
  const [totalFiltered, setTotalFiltered] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [physicalMaterials, setPhysicalMaterials] = useState<any[]>([]);

  // Filters & State
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [multiActionFilter, setMultiActionFilter] = useState<'all' | 'multi' | 'super' | 'single'>('all');
  const [campaignFilter, setCampaignFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<'lastDate' | 'firstDate' | 'totalActions' | 'nome' | 'cidade'>('lastDate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 100;

  // Selected Lead for Detailed 360º View Modal
  const [selectedLead, setSelectedLead] = useState<ConsolidatedLead | null>(null);

  // CSV Upload Modal State

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isManageBasesModalOpen, setIsManageBasesModalOpen] = useState(false);
  const [importedBases, setImportedBases] = useState<any[]>([]);
  const [isDeletingBase, setIsDeletingBase] = useState('');
  const [confirmDeleteBase, setConfirmDeleteBase] = useState('');

  const [campaignInput, setCampaignInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedCsvLeads, setParsedCsvLeads] = useState<any[]>([]);
  const [csvMappedHeaders, setCsvMappedHeaders] = useState<{systemFieldId: string; originalHeader: string | null}[]>([]);
  const [csvRawRows, setCsvRawRows] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState('');
  const [isDragActive, setIsDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SP Municipalities for Heatmap
  const [municipiosData, setMunicipiosData] = useState<any[]>([]);

  useEffect(() => {
    fetch('/municipios.json')
      .then(res => res.json())
      .then(d => {
        setMunicipiosData(Array.isArray(d) ? d : []);
      })
      .catch(e => console.warn('Erro ao carregar municipios.json:', e));
  }, []);

  const fetchSummary = async () => {
    try {
      const res = await fetch(`/api/leads/summary?_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setSummary(data);
      }
    } catch (err) {
      console.warn("Erro ao buscar resumo de leads:", err);
    }
  };

  const fetchLeadsPage = async (page = currentPage) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(itemsPerPage),
        search: deferredSearch.trim(),
        estado: estadoFilter,
        cidade: cidadeFilter,
        campaign: campaignFilter,
        multiAction: multiActionFilter,
        sortField: sortField,
        sortOrder: sortOrder
      });
      const res = await fetch(`/api/leads/paginated?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setServerLeads(data.leads || []);
        setTotalFiltered(data.totalFiltered || 0);
        setTotalPages(data.totalPages || 1);
        if (data.summary && (!summary.totalUniqueLeads || summary.totalUniqueLeads === 0)) {
          setSummary(data.summary);
        }
      }
    } catch (err) {
      console.warn("Erro ao buscar leads paginados:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPhysicalMaterials = async () => {
    try {
      const res = await fetch(`/api/leads/physical-materials?adesivoFilter=${materialFilterAdesivo}&_t=${Date.now()}`);
      if (res.ok) {
        const data = await res.json();
        setPhysicalMaterials(data.materials || []);
      }
    } catch (err) {
      console.warn("Erro ao buscar materiais físicos:", err);
    }
  };

  const fetchAllLeads = async (force = false) => {
    setLoading(true);
    try {
      await Promise.all([
        fetchSummary(),
        fetchLeadsPage(1)
      ]);
    } finally {
      setLoading(false);
    }
  };

  
  const generateParsedLeads = (rows: any[], mapping: any[]) => {
    const getMapVal = (mappingList: any[], row: any, sysField: string) => {
      const m = mappingList.find((x: any) => x.systemFieldId === sysField);
      if (m && m.originalHeader && row[m.originalHeader] !== undefined && row[m.originalHeader] !== null && String(row[m.originalHeader]).trim() !== '') {
        return String(row[m.originalHeader]).trim();
      }
      return '';
    };

    const list = rows.map((row) => {
      let nome = fixMojibake(getMapVal(mapping, row, 'nome'));
      const sobrenome = fixMojibake(getMapVal(mapping, row, 'sobrenome'));

      let whatsapp = getMapVal(mapping, row, 'whatsapp');
      let email = getMapVal(mapping, row, 'email');
      const rawCity = fixMojibake(getMapVal(mapping, row, 'cidade'));
      const cleanNormCity = rawCity.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
      const forcedState = knownNonSpCities[cleanNormCity] || null;
      const cep = getMapVal(mapping, row, 'cep') || '';
      const deducedState = getStateFromCep(cep);
      const estado = forcedState || normalizeState(getMapVal(mapping, row, 'estado'), deducedState);
      const cidade = getIbgeCityName(rawCity, estado, cep);
      const endereco = fixMojibake(getMapVal(mapping, row, 'endereco'));
      const numero = getMapVal(mapping, row, 'numero');
      const complemento = fixMojibake(getMapVal(mapping, row, 'complemento'));
      const bairro = fixMojibake(getMapVal(mapping, row, 'bairro'));
      const adesivos = getMapVal(mapping, row, 'adesivos');
      const adesivo_perfurado = getMapVal(mapping, row, 'adesivo_perfurado');
      
      const extraData: any = {};
      const mappedHeaders = mapping.map((m: any) => m.originalHeader).filter(Boolean);
      
      let extraPhones: string[] = whatsapp ? [whatsapp] : [];
      let extraEmails: string[] = email ? [email] : [];
      let extraNames: string[] = nome ? [nome] : [];

      Object.keys(row).forEach(key => {
        if (!mappedHeaders.includes(key) && row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
          const val = String(row[key]).trim();
          const keyLower = key.toLowerCase();
          
          // Always keep the original category/column name
          extraData[key] = val;
          
          // Auto-detect extra phones (only to help populate primary if missing)
          if (keyLower.includes('tel') || keyLower.includes('cel') || keyLower.includes('whats') || keyLower.includes('fone') || keyLower.includes('contato')) {
            const digits = val.replace(/\D/g, '');
            if (digits.length >= 8 && digits.length <= 14) {
              if (!extraPhones.includes(val)) extraPhones.push(val);
            }
          } 
          // Auto-detect extra emails
          else if (keyLower.includes('email') || keyLower.includes('e-mail') || keyLower.includes('mail') || val.includes('@')) {
            if (val.includes('@') && val.includes('.')) {
              if (!extraEmails.includes(val)) extraEmails.push(val);
            }
          }
          // Auto-detect fallback names
          else if (keyLower.includes('nome') && !keyLower.includes('sobrenome')) {
            extraNames.push(val);
          }
        }
      });

      // Populate primary if empty
      if (!whatsapp && extraPhones.length > 0) whatsapp = extraPhones[0];
      if (!email && extraEmails.length > 0) email = extraEmails[0];
      
      if (!nome && extraNames.length > 0) nome = extraNames[0];

      const finalName = sobrenome ? `${nome} ${sobrenome}`.trim() : nome;

      return {
        nome: finalName || 'Apoiador Importado',
        whatsapp,
        email,
        cidade: cidade.trim(),
        estado: estado.trim() || 'SP',
        cep,
        endereco,
        numero,
        complemento,
        bairro,
        adesivos,
        adesivoPerfurado: adesivo_perfurado ? (String(adesivo_perfurado).toLowerCase() === 'sim' || String(adesivo_perfurado).toLowerCase() === 's' || String(adesivo_perfurado).toLowerCase() === 'true' || String(adesivo_perfurado) === '1' || String(adesivo_perfurado).toLowerCase() === 'x' || String(adesivo_perfurado).toLowerCase() === 'ok' || String(adesivo_perfurado).toLowerCase() === 'marcado') : false,
        extraData: Object.keys(extraData).length > 0 ? extraData : undefined
      };
    }).filter((item: any) => item.nome !== 'Apoiador Importado' || item.whatsapp || item.email);
    
    setParsedCsvLeads(list);
  };

  const handleHeaderMappingChange = (systemFieldId: string, newOriginalHeader: string) => {
    const newMapping = csvMappedHeaders.map(m => 
      m.systemFieldId === systemFieldId 
        ? { ...m, originalHeader: newOriginalHeader === '' ? null : newOriginalHeader }
        : m
    );
    setCsvMappedHeaders(newMapping);
    generateParsedLeads(csvRawRows, newMapping);
  };

  const handleProcessCsvFile = (file: File) => {
    setUploadError('');
    setUploadSuccessMessage('');
    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith('.csv') && !fileName.endsWith('.xlsx') && !file.type.includes('csv') && !file.type.includes('excel') && !file.type.includes('spreadsheetml')) {
      setUploadError('Por favor, selecione um arquivo válido no formato .CSV ou .XLSX');
      return;
    }

    setCsvFile(file);
    setCsvFileName(file.name);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result as ArrayBuffer;
        if (!data || data.byteLength === 0) {
          setUploadError('O arquivo selecionado está vazio.');
          setParsedCsvLeads([]);
                    setCsvMappedHeaders([]);
          return;
        }

        // Parse with XLSX reader which seamlessly handles CSVs and XLSX files
        const workbook = XLSX.read(data, { type: 'array', raw: true });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rows || rows.length === 0) {
          setUploadError('Não foram encontradas linhas de dados no arquivo.');
          setParsedCsvLeads([]);
                    setCsvMappedHeaders([]);
          return;
        }

        const headers = Object.keys(rows[0] || {});
        setCsvHeaders(headers);
        setCsvRawRows(rows);

        const initialMapping = SYSTEM_FIELDS.map(field => {
          let matchedHeader: string | null = null;
          for (const header of headers) {
            const cleanHeader = header.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
            for (const alias of field.aliases) {
              const cleanAlias = alias.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '').trim();
              if (cleanHeader === cleanAlias || cleanHeader.includes(cleanAlias)) {
                matchedHeader = header;
                break;
              }
            }
            if (matchedHeader) break;
          }
          return { systemFieldId: field.id, originalHeader: matchedHeader };
        });

        setCsvMappedHeaders(initialMapping);
        generateParsedLeads(rows, initialMapping);
      } catch (err) {
        console.error('Erro ao processar arquivo:', err);
        setUploadError('Erro ao ler a formatação do arquivo. Verifique o arquivo enviado.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmCsvImport = async () => {
    if (!campaignInput.trim()) {
      setUploadError('Por favor, informe o nome da campanha ou origem desta lista.');
      return;
    }
    if (!parsedCsvLeads || parsedCsvLeads.length === 0) {
      setUploadError('Nenhum dado válido para importar. Selecione um arquivo .CSV.');
      return;
    }

    setIsUploading(true);
    setUploadError('');
    setUploadSuccessMessage('Iniciando importação...');

    try {
      const CHUNK_SIZE = 2500;
      const totalLeads = parsedCsvLeads.length;
      const totalBatches = Math.ceil(totalLeads / CHUNK_SIZE);
      let importedCount = 0;

      for (let i = 0; i < totalLeads; i += CHUNK_SIZE) {
        const chunk = parsedCsvLeads.slice(i, i + CHUNK_SIZE);
        const currentBatch = Math.floor(i / CHUNK_SIZE) + 1;
        setUploadSuccessMessage(`Importando lote ${currentBatch} de ${totalBatches}... (${importedCount} de ${totalLeads})`);
        
        let success = false;
        let lastError = '';

        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const res = await fetch('/api/imported-leads/bulk', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                leads: chunk,
                campanha: campaignInput.trim()
              })
            });

            const contentType = res.headers.get('content-type') || '';
            if (!contentType.includes('application/json')) {
              throw new Error(`Servidor ocupado (HTTP ${res.status}). Tentando novamente (${attempt}/3)...`);
            }

            const data = await res.json();
            if (res.ok && data.success) {
              importedCount += data.count;
              success = true;
              break;
            } else {
              throw new Error(data.error || `Erro ao processar lote ${currentBatch}`);
            }
          } catch (err: any) {
            lastError = err.message || 'Erro de conexão';
            if (attempt < 3) {
              setUploadSuccessMessage(`Lote ${currentBatch} oscilou. Tentativa ${attempt + 1} de 3 em instantes...`);
              await new Promise(r => setTimeout(r, 1200 * attempt));
            }
          }
        }

        if (!success) {
          throw new Error(`Falha no lote ${currentBatch} de ${totalBatches}: ${lastError}`);
        }
      }

      setUploadSuccessMessage(`Sucesso! ${importedCount} leads importados para a campanha "${campaignInput.trim()}".`);
      try {
        await fetch('/api/leads/refresh-cache', { method: 'POST' });
      } catch (e) {}
      await fetchAllLeads(true);
      setTimeout(() => {
        setIsUploadModalOpen(false);
        setUploadSuccessMessage('');
        setParsedCsvLeads([]);
        setCsvMappedHeaders([]);
        setCsvFile(null);
        setCsvFileName('');
        setCsvRawRows([]);
        setCsvHeaders([]);
        setCampaignInput('');
      }, 1800);
    } catch (err: any) {
      console.error('Erro ao enviar leads importados:', err);
      setUploadError(err.message || 'Erro de conexão ao enviar os leads para o servidor.');
    } finally {    setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchAllLeads();
  }, [refreshTrigger]);

  // Helpers for normalization & deduplication

  const fetchImportedBases = async () => {
    try {
      const res = await fetch('/api/imported-leads/campaigns');
      if (res.ok) {
        const data = await res.json();
        setImportedBases(data);
      }
    } catch (err) {
      console.error('Erro ao buscar bases importadas:', err);
    }
  };

  const handleDeleteBase = async (campaignName: string) => {
    setIsDeletingBase(campaignName);
    try {
      const res = await fetch(`/api/imported-leads/campaign/${encodeURIComponent(campaignName)}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchImportedBases();
        fetchAllLeads(); // Atualiza os leads consolidados
        setConfirmDeleteBase('');
      }
    } catch (err) {
      console.error('Erro ao excluir base:', err);
    } finally {
      setIsDeletingBase('');
    }
  };

  const normalizePhone = (phone?: string) => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.length === 0) return '';
    if (digits.startsWith('0') && digits.length > 10) digits = digits.substring(1);
    if (digits.startsWith('55') && digits.length >= 12) return digits;
    if (digits.length >= 10 && digits.length <= 11) return '55' + digits;
    return digits;
  };

  const formatDisplayTitleName = (n?: string) => {
    if (!n) return 'Sem Nome';
    const fixed = fixMojibake(n);
    let cleaned = fixed.replace(/[0-9_!@#$%^&*()+=\[\]{};':"\\|<>\/?]/g, '');
    cleaned = cleaned.replace(/\s+/g, ' ').trim();
    if (!cleaned) return 'Sem Nome';
    return cleaned.toLowerCase().split(' ').map(word => {
      if (['da', 'de', 'do', 'das', 'dos', 'e'].includes(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const normalizeEmail = (email?: string) => {
    if (!email) return '';
    return email.trim().toLowerCase();
  };

  const nameCache = new Map();
  const normalizeName = (name?: string) => {
    if (!name) return '';
    if (nameCache.has(name)) return nameCache.get(name);
    const res = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    nameCache.set(name, res);
    return res;
  };




  const stateCache = new Map();
  const normalizeState = (stateStr, deducedState) => {
    const defaultState = deducedState || 'SP';
    if (!stateStr) return defaultState;
    const cacheKey = stateStr + '_' + deducedState;
    if (stateCache.has(cacheKey)) return stateCache.get(cacheKey);
    let s = stateStr.trim().toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    if (s === 'SAO PAULO' || s.startsWith('SAO') || s.startsWith('SÃ') || s === 'S.P' || s === 'SP.' || s === 'S/' || s === 'SA' || s === 'S') {
      stateCache.set(cacheKey, 'SP');
      return 'SP';
    }
    
    const stateMap = {
      'SAO PAULO': 'SP', 'RIO DE JANEIRO': 'RJ', 'MINAS GERAIS': 'MG', 'ESPIRITO SANTO': 'ES',
      'PARANA': 'PR', 'SANTA CATARINA': 'SC', 'RIO GRANDE DO SUL': 'RS',
      'BAHIA': 'BA', 'SERGIPE': 'SE', 'ALAGOAS': 'AL', 'PERNAMBUCO': 'PE',
      'PARAIBA': 'PB', 'RIO GRANDE DO NORTE': 'RN', 'CEARA': 'CE', 'PIAUI': 'PI', 'MARANHAO': 'MA',
      'TOCANTINS': 'TO', 'GOIAS': 'GO', 'DISTRITO FEDERAL': 'DF', 'MATO GROSSO': 'MT', 'MATO GROSSO DO SUL': 'MS',
      'RONDONIA': 'RO', 'ACRE': 'AC', 'AMAZONAS': 'AM', 'RORAIMA': 'RR', 'AMAPA': 'AP', 'PARA': 'PA',
    };
    if (stateMap[s]) {
      stateCache.set(cacheKey, stateMap[s]);
      return stateMap[s];
    }
    
    const officialStates = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];
    
    // Sometimes they type exactly 2 chars but it's a typo like "SA" or "S/"
    if (s.length === 2) {
      if (officialStates.includes(s)) return s;
      return defaultState;
    }
    
    return defaultState;
  };

  const getStateFromCep = (cep) => {
    if (!cep) return null;
    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) return null;
    const prefix = parseInt(cleanCep.substring(0, 5), 10);
    
    if (prefix >= 1000 && prefix <= 19999) return 'SP';
    if (prefix >= 20000 && prefix <= 28999) return 'RJ';
    if (prefix >= 29000 && prefix <= 29999) return 'ES';
    if (prefix >= 30000 && prefix <= 39999) return 'MG';
    if (prefix >= 40000 && prefix <= 48999) return 'BA';
    if (prefix >= 49000 && prefix <= 49999) return 'SE';
    if (prefix >= 50000 && prefix <= 56999) return 'PE';
    if (prefix >= 57000 && prefix <= 57999) return 'AL';
    if (prefix >= 58000 && prefix <= 58999) return 'PB';
    if (prefix >= 59000 && prefix <= 59999) return 'RN';
    if (prefix >= 60000 && prefix <= 63999) return 'CE';
    if (prefix >= 64000 && prefix <= 64999) return 'PI';
    if (prefix >= 65000 && prefix <= 65999) return 'MA';
    if (prefix >= 66000 && prefix <= 68899) return 'PA';
    if (prefix >= 68900 && prefix <= 68999) return 'AP';
    if (prefix >= 69000 && prefix <= 69299) return 'AM';
    if (prefix >= 69300 && prefix <= 69399) return 'RR';
    if (prefix >= 69900 && prefix <= 69999) return 'AC';
    if (prefix >= 70000 && prefix <= 73699) return 'DF';
    if (prefix >= 73700 && prefix <= 76799) return 'GO';
    if (prefix >= 77000 && prefix <= 77999) return 'TO';
    if (prefix >= 78000 && prefix <= 78899) return 'MT';
    if (prefix >= 78900 && prefix <= 78999) return 'RO';
    if (prefix >= 79000 && prefix <= 79999) return 'MS';
    if (prefix >= 80000 && prefix <= 87999) return 'PR';
    if (prefix >= 88000 && prefix <= 89999) return 'SC';
    if (prefix >= 90000 && prefix <= 99999) return 'RS';
    return null;
  };



  // spCitiesList, spCitiesCleanMap, spCitiesNormMap are imported from ../../data/spCities (Official IBGE 645 SP cities)

  
  const levenshtein = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }
    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
        }
      }
    }
    return matrix[b.length][a.length];
  };

  const cityCache = new Map();
  const fastCityCache = new Map();

  const getIbgeCityName = (cityStr?: string | null, stateStr?: string | null, cepStr?: string | null) => {
    const rawCity = fixMojibake(cityStr);
    const rawState = fixMojibake(stateStr);
    const fastKey = `${rawCity}_${rawState}_${cepStr}`;
    if (fastCityCache.has(fastKey)) return fastCityCache.get(fastKey);

    let deducedState = getStateFromCep(cepStr);
    let finalState = normalizeState(rawState, deducedState);

    if (!rawCity) {
      const res = finalState === 'SP' ? 'São Paulo' : 'Não Informada';
      fastCityCache.set(fastKey, res);
      return res;
    }
    
    // Convert to lowercase, remove accents
    let norm = rawCity.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    
    // Remove state abbreviations at the end
    norm = norm.replace(/[-\/,\s]+(sp|rj|mg|es|pr|sc|rs|ba|pe|ce|df|go|ma|pb|pe|rn|al|se|pi|to|ro|ac|ap|am|rr|pa|mt|ms)$/i, '').trim();
    
    // Clean to alphanumeric and spaces
    norm = norm.replace(/[^a-z0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
    const cleanK = norm.replace(/\s+/g, '');

    // 1. If it is a known municipality outside SP (e.g. Teresópolis, Aldeias Altas, Curitiba, etc.)
    if (knownNonSpCities[cleanK]) {
      const res = formatDisplayTitleName(rawCity);
      fastCityCache.set(fastKey, res);
      return res;
    }
    
    const cacheKey = `${norm}_${finalState}`;
    if (cityCache.has(cacheKey)) {
      const cached = cityCache.get(cacheKey);
      fastCityCache.set(fastKey, cached);
      return cached;
    }
    
    // Explicit mappings for abbreviations, variants, and common alternate spellings in SP
    const cityMap: Record<string, string> = {
      'sao paulo': 'São Paulo', 'sp': 'São Paulo', 'capital': 'São Paulo', 'sampa': 'São Paulo',
      'sbc': 'São Bernardo do Campo', 'sao bernardo': 'São Bernardo do Campo', 'sao bernardo do campo': 'São Bernardo do Campo',
      'scs': 'São Caetano do Sul', 'sao caetano': 'São Caetano do Sul', 'sao caetano do sul': 'São Caetano do Sul',
      'sa': 'Santo André', 'santo andre': 'Santo André', 'sta andre': 'Santo André',
      'sjc': 'São José dos Campos', 'sao jose': 'São José dos Campos', 'sao jose dos campos': 'São José dos Campos',
      's j dos campos': 'São José dos Campos', 's jose dos campos': 'São José dos Campos', 'sao jose dps campos': 'São José dos Campos',
      'mogi': 'Mogi das Cruzes', 'mogi das cruzes': 'Mogi das Cruzes',
      'rib preto': 'Ribeirão Preto', 'ribeirao preto': 'Ribeirão Preto',
      'sjrp': 'São José do Rio Preto', 'rio preto': 'São José do Rio Preto', 'sao jose do rio preto': 'São José do Rio Preto',
      's j rio preto': 'São José do Rio Preto', 'sj do rio preto': 'São José do Rio Preto',
      'pinda': 'Pindamonhangaba', 'pindamonhangaba': 'Pindamonhangaba',
      'itaq': 'Itaquaquecetuba', 'itaqua': 'Itaquaquecetuba', 'itaquaquecetuba': 'Itaquaquecetuba',
      'guarulhos': 'Guarulhos', 'campinas': 'Campinas', 'osasco': 'Osasco', 'barueri': 'Barueri', 'diadema': 'Diadema',
      'maua': 'Mauá', 'carapicuiba': 'Carapicuíba', 'piracicaba': 'Piracicaba', 'bauru': 'Bauru', 'franca': 'Franca',
      'taubate': 'Taubaté', 'suzano': 'Suzano', 'taboao da serra': 'Taboão da Serra', 'sorocaba': 'Sorocaba', 'jundiai': 'Jundiaí',
      'poa': 'Poá', 'itapecerica': 'Itapecerica da Serra', 'itapecerica da serra': 'Itapecerica da Serra',
      'embu': 'Embu das Artes', 'embu das artes': 'Embu das Artes',
      's b do campo': 'São Bernardo do Campo',
      's andre': 'Santo André',
      'sta barbara': "Santa Bárbara d'Oeste", 'santa barbara': "Santa Bárbara d'Oeste",
      'santa barbara d oeste': "Santa Bárbara d'Oeste", 'sta barbara d oeste': "Santa Bárbara d'Oeste",
      // IBGE official corrections and variants
      'florinea': 'Florínia',
      'florinia': 'Florínia',
      'luiz antonio': 'Luís Antônio',
      'luis antonio': 'Luís Antônio',
      'biritiba mirim': 'Biritiba-Mirim',
      'biritiba-mirim': 'Biritiba-Mirim',
      'sao joao do pau dalho': "São João do Pau d'Alho",
      'sao joao do pau d alho': "São João do Pau d'Alho",
      'pompeia': 'Pompéia',
      'boraceia': 'Boracéia',
      'rubineia': 'Rubinéia',
      'lindoia': 'Lindóia',
      'itaoca': 'Itaóca',
      'embu guacu': 'Embu-Guaçu',
      'embu-guacu': 'Embu-Guaçu',
      'pariquera acu': 'Pariquera-Açu',
      'pariquera-acu': 'Pariquera-Açu',
      'arco iris': 'Arco-Íris',
      'arco-iris': 'Arco-Íris',
      'aparecida doeste': "Aparecida d'Oeste",
      'aparecida d oeste': "Aparecida d'Oeste",
      'estrela doeste': "Estrela d'Oeste",
      'estrela d oeste': "Estrela d'Oeste",
      'guarani doeste': "Guarani d'Oeste",
      'guarani d oeste': "Guarani d'Oeste",
      'palmeira doeste': "Palmeira d'Oeste",
      'palmeira d oeste': "Palmeira d'Oeste",
      'santa clara doeste': "Santa Clara d'Oeste",
      'santa clara d oeste': "Santa Clara d'Oeste",
      'santa rita doeste': "Santa Rita d'Oeste",
      'santa rita d oeste': "Santa Rita d'Oeste"
    };

    let result: string;
    if (cityMap[norm] || cityMap[cleanK]) {
      result = cityMap[norm] || cityMap[cleanK];
    } else if (spCitiesCleanMap.has(cleanK)) {
      result = spCitiesCleanMap.get(cleanK)!;
    } else if (spCitiesNormMap.has(norm)) {
      result = spCitiesNormMap.get(norm)!;
    } else if (finalState === 'SP') {
      // Direct instant match or typo fallback via Levenshtein against official 645 IBGE SP municipalities
      let bestMatch = 'São Paulo';
      let bestDist = Infinity;
      
      for (const item of spCitiesList) {
        const dist = levenshtein(norm, item.norm);
        if (dist < bestDist) {
          bestDist = dist;
          bestMatch = item.official;
          if (bestDist === 1) break;
        }
      }
      
      if (bestDist <= Math.max(3, Math.floor(norm.length * 0.4))) {
        result = bestMatch;
      } else {
        result = 'São Paulo';
      }
    } else {
      // Capitalize properly for non-SP
      result = formatDisplayTitleName(rawCity);
    }
    
    cityCache.set(cacheKey, result);
    fastCityCache.set(fastKey, result);
    return result;
  };

  // Synchronized variables connected directly to server state
  const totalUniqueLeads = summary.totalUniqueLeads;
  const totalSubmissions = summary.totalSubmissions;
  const multiActionLeadsCount = summary.multiActionLeadsCount;
  const superSupportersCount = summary.superSupportersCount;
  const spLeadsCount = summary.spLeadsCount;
  const stateOptions = summary.stateOptions || [];
  const cityOptions = summary.cityOptions || [];
  const campaignOptions = summary.campaignOptions || [];
  const spHeatmapPoints = summary.spHeatmapPoints || [];
  const paginatedLeads = serverLeads;
  const filteredPhysicalMaterials = physicalMaterials;
  const filteredLeads = serverLeads;
  const consolidatedLeads = serverLeads;

  useEffect(() => {
    fetchLeadsPage(currentPage);
  }, [deferredSearch, estadoFilter, cidadeFilter, campaignFilter, multiActionFilter, sortField, sortOrder, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [deferredSearch, estadoFilter, cidadeFilter, campaignFilter, multiActionFilter, sortField, sortOrder]);

  useEffect(() => {
    if (activeView === 'MATERIAL') {
      fetchPhysicalMaterials();
    }
  }, [activeView, materialFilterAdesivo]);

  const handleExportPhysicalMaterials = () => {
    if (!filteredPhysicalMaterials || filteredPhysicalMaterials.length === 0) return;

    const dataToExport = filteredPhysicalMaterials.map(m => ({
      'Data Solicitação': new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }),
      'Origem': m.source,
      'Nome': m.nome,
      'Sobrenome': m.sobrenome || '',
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

    XLSX.writeFile(workbook, `exportacao_materiais_fisicos_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const exportMailMergeExcel = () => {
    const params = new URLSearchParams({
      search: search.trim(),
      estado: estadoFilter,
      cidade: cidadeFilter,
      campaign: campaignFilter,
      multiAction: multiActionFilter,
      sortField: sortField,
      sortOrder: sortOrder,
      addressOnly: 'true',
      format: 'csv'
    });
    window.location.href = `/api/leads/export?${params.toString()}`;
  };

  // Export Unified List to Excel (.xlsx) using high-speed server stream
  const exportConsolidatedExcel = () => {
    const params = new URLSearchParams({
      search: search.trim(),
      estado: estadoFilter,
      cidade: cidadeFilter,
      campaign: campaignFilter,
      multiAction: multiActionFilter,
      sortField: sortField,
      sortOrder: sortOrder,
      format: 'csv'
    });
    window.location.href = `/api/leads/export?${params.toString()}`;
  };


  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };

  const getCampaignBadgeStyle = (category: string) => {
    switch (category) {
      case 'Apoio Capital':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'Material Oficial':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'Material Dobrada':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'Projeto de Lei':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Abaixo-Assinado':
        return 'bg-teal-50 text-teal-700 border-teal-200';
      case 'Maus-Tratos':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'Jogo Resgate':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      default:
        return 'bg-blue-50 text-blue-700 border-blue-200';
    }
  };

  const getSourceIcon = (sourceKey: string) => {
    switch (sourceKey) {
      case 'APOIO':
        return <HeartHandshake className="w-4 h-4 text-orange-600" />;
      case 'MATERIAL':
        return <Package className="w-4 h-4 text-indigo-600" />;
      case 'NINA':
        return <Sparkles className="w-4 h-4 text-purple-600" />;
      case 'CITIZENS':
      case 'PETITIONS':
      case 'CONTRA_MAUS_TRATOS':
        return <FileText className="w-4 h-4 text-emerald-600" />;
      case 'JOGO':
        return <Gamepad2 className="w-4 h-4 text-sky-600" />;
      case 'IMPORTED':
        return <Upload className="w-4 h-4 text-blue-600" />;
      default:
        return <Layers className="w-4 h-4 text-gray-600" />;
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Overview */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 text-blue-300 text-xs font-black uppercase tracking-wider mb-3 border border-blue-400/30">
              <ShieldCheck className="w-3.5 h-3.5" />
              Central Unificada de Leads 360º
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white">
              Gestão Consolidada de Apoiadores
            </h1>
            <p className="text-sm sm:text-base text-blue-100/80 mt-1 max-w-2xl font-medium">
              Todos os cadastros do site e bases externas unificados por pessoa: Apoio SP, Materiais, Abaixo-assinados, Minuta do PL, Jogo e Listas Importadas.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">

            <button
              onClick={() => {
                setIsUploadModalOpen(true);
                setUploadError('');
                setUploadSuccessMessage('');
              }}
              className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-blue-900/40 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer border border-blue-400/40"
            >
              <Upload className="w-4 h-4" />
              <span>Importar Base (.CSV/.XLSX)</span>
            </button>

            <button
              onClick={() => {
                fetchImportedBases();
                setIsManageBasesModalOpen(true);
              }}
              className="bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-slate-900/40 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer border border-slate-500/40"
            >
              <Database className="w-4 h-4" />
              <span>Gerenciar Bases</span>
            </button>


            
            <button
              onClick={exportMailMergeExcel}
              disabled={consolidatedLeads.length === 0}
              className="bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-amber-900/30 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Endereços Correios</span>
            </button>
            <button
              onClick={exportConsolidatedExcel}

              disabled={consolidatedLeads.length === 0}
              className="bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white font-bold py-2.5 px-5 rounded-xl shadow-lg shadow-emerald-900/30 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Exportar Lista Única (.csv)</span>
            </button>
          </div>
        </div>

        {/* Global KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-blue-200 text-xs font-bold uppercase tracking-wider">
              <Users className="w-4 h-4 text-blue-400" />
              <span>Leads Únicos</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-white mt-1">
              {totalUniqueLeads.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-blue-200/70 mt-0.5">Pessoas cadastradas</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-amber-200 text-xs font-bold uppercase tracking-wider">
              <Flame className="w-4 h-4 text-amber-400" />
              <span>Multi-Campanha</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-amber-300 mt-1">
              {multiActionLeadsCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-amber-200/70 mt-0.5">
              {totalUniqueLeads > 0 ? `${((multiActionLeadsCount / totalUniqueLeads) * 100).toFixed(1)}% preencheram +1 ação` : '0%'}
            </div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-purple-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-4 h-4 text-purple-400" />
              <span>Super Apoiadores</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-purple-300 mt-1">
              {superSupportersCount.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-purple-200/70 mt-0.5">3 ou mais participações</div>
          </div>

          <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/10">
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-wider">
              <Layers className="w-4 h-4 text-emerald-400" />
              <span>Total de Ações</span>
            </div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-300 mt-1">
              {totalSubmissions.toLocaleString('pt-BR')}
            </div>
            <div className="text-[11px] text-emerald-200/70 mt-0.5">Formulários preenchidos</div>
          </div>
        </div>
      </div>

      {/* View Switcher: Lista vs Mapa de Calor */}
      <div className="flex items-center justify-between gap-4 bg-white p-2 rounded-2xl border border-gray-200/80 shadow-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveView('LIST')}
            className={`py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'LIST'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            <span>Lista de Leads ({totalFiltered.toLocaleString('pt-BR')})</span>
          </button>

          <button
            onClick={() => setActiveView('HEATMAP')}
            className={`py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'HEATMAP'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <MapIcon className="w-4 h-4" />
            <span>Mapa de Calor</span>
          </button>

          <button
            onClick={() => setActiveView('MATERIAL')}
            className={`py-2 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
              activeView === 'MATERIAL'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Materiais Físicos</span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium pr-2">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Base em SP: <strong className="text-gray-800">{spLeadsCount.toLocaleString('pt-BR')}</strong> leads</span>
        </div>
      </div>

      {/* VIEW 1: MAPA DE CALOR DO ESTADO DE SÃO PAULO */}
      {activeView === 'HEATMAP' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black uppercase text-dark flex items-center gap-2">
                  <Flame className="w-6 h-6 text-red-500" />
                  Mapa de Calor Geoespacial • Estado de São Paulo
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Densidade de apoiadores e volume de interações distribuídos pelos 645 municípios paulistas.
                </p>
              </div>

              {/* Legenda de Intensidade */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-bold bg-gray-50 p-2.5 rounded-xl border border-gray-200">
                <span className="text-gray-500 uppercase tracking-wider mr-1 text-[10px]">Intensidade:</span>
                <span className="flex items-center gap-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span> 1 Lead
                </span>
                <span className="flex items-center gap-1 text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> 2 a 4
                </span>
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> 5 a 9
                </span>
                <span className="flex items-center gap-1 text-orange-700 bg-orange-50 px-2 py-0.5 rounded border border-orange-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span> 10 a 19
                </span>
                <span className="flex items-center gap-1 text-red-700 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600"></span> 20+ Leads
                </span>
              </div>
            </div>

            {/* Container do Mapa Leaflet */}
            <div className="h-[520px] w-full bg-slate-100 rounded-2xl overflow-hidden relative z-0 border border-gray-200 shadow-inner">
              <MapContainer
                center={[-22.5, -48.5]}
                zoom={7}
                style={{ height: '100%', width: '100%' }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution="&copy; OpenStreetMap contributors"
                />
                {spHeatmapPoints.map((pt, i) => (
                  <CircleMarker
                    key={i}
                    center={[pt.lat, pt.lng]}
                    radius={pt.radius}
                    pathOptions={{
                      color: pt.densityColor,
                      fillColor: pt.densityColor,
                      fillOpacity: 0.55,
                      weight: 1
                    }}
                  >
                    <Tooltip>
                      <div className="p-1 min-w-[170px]">
                        <div className="font-black text-gray-900 text-sm">{pt.name} / SP</div>
                        <div className="mt-1.5 space-y-0.5 text-xs text-gray-700">
                          <div>👥 <strong>{pt.count}</strong> {pt.count === 1 ? 'Lead Único' : 'Leads Únicos'}</div>
                          <div>⚡ <strong>{pt.totalActions}</strong> Ações / Cadastros</div>
                          {pt.multiCount > 0 && (
                            <div className="text-amber-700 font-bold">🔥 {pt.multiCount} Multi-Campanhas</div>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400 mt-2 text-center">(Clique para Ver Leads)</div>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="p-1 min-w-[170px]">
                        <div className="font-black text-gray-900 text-sm">{pt.name} / SP</div>
                        <button
                          onClick={() => {
                            setCidadeFilter(pt.name);
                            setEstadoFilter('SP');
                            setActiveView('LIST');
                          }}
                          className="mt-2 w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold text-center cursor-pointer shadow-xs flex items-center justify-center gap-1"
                        >
                          <Search className="w-3.5 h-3.5" />
                          Ver Leads de {pt.name}
                        </button>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
            </div>

            {/* Top Cidades de SP Grid */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-amber-500" />
                Municípios com Maior Volume de Apoiadores no Estado de SP:
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {spHeatmapPoints.slice(0, 12).map((pt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCidadeFilter(pt.name);
                      setEstadoFilter('SP');
                      setActiveView('LIST');
                    }}
                    className="p-2.5 rounded-xl bg-gray-50 hover:bg-blue-50 text-left border border-gray-200 transition-all cursor-pointer group"
                  >
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-black text-gray-900 group-hover:text-blue-600 truncate">
                        {pt.name}
                      </span>
                      <span
                        className="text-[11px] font-black px-1.5 py-0.2 rounded-md text-white flex-shrink-0"
                        style={{ backgroundColor: pt.densityColor }}
                      >
                        {pt.count}
                      </span>
                    </div>
                    <div className="text-[10px] text-gray-500 mt-1 flex items-center justify-between">
                      <span>{pt.totalActions} ações</span>
                      {pt.multiCount > 0 && <span className="text-amber-600 font-bold">🔥 {pt.multiCount}</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

            {/* VIEW 3: MATERIAIS FÍSICOS */}
      {activeView === 'MATERIAL' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h2 className="text-xl font-black uppercase text-dark flex items-center gap-2">
                  <Package className="w-6 h-6 text-indigo-500" />
                  Logística de Materiais Físicos
                </h2>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Lista unificada de apoiadores que solicitaram material impresso (Oficial ou Dobrada Nina).
                </p>
              </div>
              <div className="w-full mt-4 flex items-center gap-4">
                <label className="text-sm font-bold text-gray-700">Adesivo Perfurado:</label>
                <select 
                  value={materialFilterAdesivo} 
                  onChange={(e) => setMaterialFilterAdesivo(e.target.value as any)}
                  className="p-2 border border-gray-300 rounded-lg text-sm bg-white outline-none"
                >
                  <option value="ALL">Todos</option>
                  <option value="YES">Com Adesivo Perfurado</option>
                  <option value="NO">Sem Adesivo Perfurado</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleExportPhysicalMaterials}
                  disabled={filteredPhysicalMaterials.length === 0}
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar XLSX</span>
                </button>
                <div className="flex items-center gap-2 text-xs font-bold bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-xl border border-indigo-100">
                  <span>Total Solicitado:</span>
                  <span className="text-base">{filteredPhysicalMaterials.length}</span>
                </div>
              </div>
            </div>

                        <div className="mb-8">
              <CityDistributionMap 
                items={filteredPhysicalMaterials} 
                title="Geolocalização de Entregas (Materiais Físicos)" 
                subtitle="Mapa de calor das solicitações de material e adesivos." 
                itemLabel="solicitações"
                accentColor="indigo"
              />
            </div>

            <div className="overflow-x-auto rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="p-3">Data</th>
                    <th className="p-3">Origem</th>
                    <th className="p-3">Nome / Contato</th>
                    <th className="p-3">Endereço de Entrega</th>
                    <th className="p-3">Adesivo Perfurado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredPhysicalMaterials.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-gray-400 font-medium">
                        Nenhuma solicitação de material impresso encontrada.
                      </td>
                    </tr>
                  ) : (
                    filteredPhysicalMaterials.map((item, i) => (
                      <tr key={i} className="hover:bg-gray-50 transition-colors">
                        <td className="p-3 text-xs text-gray-500">
                          {new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase whitespace-nowrap ${
                            item.source === 'Oficial Rafael' ? 'bg-blue-100 text-blue-700' : item.source === 'Dobrada Nina' ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {item.source}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-bold text-gray-900">{item.nome} {item.sobrenome}</div>
                          <div className="text-xs text-gray-500 flex flex-col gap-0.5 mt-0.5">
                            {item.whatsapp && <span>WhatsApp: {item.whatsapp}</span>}
                            {item.email && <span>Email: {item.email}</span>}
                          </div>
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          {item.endereco ? (
                            <>
                              <div>{item.endereco}, {item.numero} {item.complemento && `(${item.complemento})`}</div>
                              <div>{item.bairro} - {item.cidade}/{item.estado}</div>
                              <div className="text-gray-400 font-medium">CEP: {item.cep}</div>
                            </>
                          ) : (
                            <span className="text-gray-400 italic">Não informado</span>
                          )}
                        </td>
                        <td className="p-3">
                          {item.adesivoPerfurado ? (
                            <span className="flex items-center gap-1 text-emerald-600 text-[11px] font-bold uppercase">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Solicitou Adesivo
                            </span>
                          ) : (
                            <span className="text-gray-400 text-[11px] uppercase font-bold">Não</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            

          </div>
        </div>
      )}


      {/* VIEW 2: LISTA DE LEADS & FILTROS INTELIGENTES */}
      {activeView === 'LIST' && (
        <div className="space-y-6">
          
          {/* Painel de Filtros & Busca */}
          <div className="bg-white rounded-3xl p-6 border border-gray-200/80 shadow-xs space-y-4">
            
            {/* Linha 1: Busca & Exportação */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por Nome, WhatsApp, E-mail, Cidade, Bairro, CEP ou Campanha..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-sm font-medium outline-none transition-all"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Botão de Limpar Todos os Filtros se houver algum ativo */}
              {(search || estadoFilter || cidadeFilter || multiActionFilter !== 'all' || campaignFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSearch('');
                    setEstadoFilter('');
                    setCidadeFilter('');
                    setMultiActionFilter('all');
                    setCampaignFilter('all');
                  }}
                  className="px-3.5 py-2.5 rounded-xl border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Limpar Filtros</span>
                </button>
              )}
            </div>

            {/* Linha 2: Dropdowns e Filtros de Multi-Ação */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-gray-100">
              
              {/* Filtro Estado */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Estado
                </label>
                <select
                  value={estadoFilter}
                  onChange={(e) => {
                    setEstadoFilter(e.target.value);
                    setCidadeFilter(''); // reset city when state changes
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-blue-500"
                >
                  <option value="">Todos os Estados ({stateOptions.length})</option>
                  {stateOptions.map(st => (
                    <option key={st} value={st}>
                      {st === 'SP' ? 'São Paulo (SP) ⭐️' : st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro Cidade */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Cidade / Município
                </label>
                <select
                  value={cidadeFilter}
                  onChange={(e) => setCidadeFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-blue-500"
                >
                  <option value="">Todas as Cidades</option>
                  {cityOptions.map(c => (
                    <option key={c.name} value={c.name}>
                      {c.name} ({c.count})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filtro de Multi-Campanhas */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Engajamento / Ações
                </label>
                <select
                  value={multiActionFilter}
                  onChange={(e) => setMultiActionFilter(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-blue-500"
                >
                  <option value="all">Todas as Participações</option>
                  <option value="multi">🔥 Multi-Campanhas (+ de 1 ação)</option>
                  <option value="super">⭐ Super Apoiadores (3+ ações)</option>
                  <option value="single">Apenas 1 Ação</option>
                </select>
              </div>

              {/* Filtro de Campanha Específica */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                  Canal / Formulário / Campanha
                </label>
                <select
                  value={campaignFilter}
                  onChange={(e) => setCampaignFilter(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-gray-700 outline-none focus:border-blue-500"
                >
                  <option value="all">Todos os Canais / Campanhas</option>
                  {campaignOptions.map(camp => (
                    <option key={camp} value={camp}>{camp}</option>
                  ))}
                </select>
              </div>

            </div>

            {/* Quick Chips de Multi-Campanha */}
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mr-1">Filtros Rápidos:</span>
              
              <button
                onClick={() => setMultiActionFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  multiActionFilter === 'all'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Todos ({totalUniqueLeads.toLocaleString('pt-BR')})
              </button>

              <button
                onClick={() => setMultiActionFilter('multi')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  multiActionFilter === 'multi'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Multi-Campanhas ({multiActionLeadsCount.toLocaleString('pt-BR')})</span>
              </button>

              <button
                onClick={() => setMultiActionFilter('super')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  multiActionFilter === 'super'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Super Apoiadores 3+ ({superSupportersCount.toLocaleString('pt-BR')})</span>
              </button>

              <button
                onClick={() => {
                  setEstadoFilter('SP');
                  setCidadeFilter('São Paulo');
                }}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  cidadeFilter === 'São Paulo'
                    ? 'bg-blue-600 text-white shadow-xs'
                    : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>São Paulo / Capital</span>
              </button>
            </div>

          </div>

          {/* Tabela de Leads Consolidados */}
          <div className="bg-white rounded-3xl shadow-xs border border-gray-200/80 overflow-hidden">
            
            {/* Header da Tabela com Contadores e Ordenação */}
            <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-gray-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-black text-gray-900 uppercase tracking-tight">
                  Listagem Consolidada de Leads
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-blue-100 text-blue-800">
                  {totalFiltered.toLocaleString('pt-BR')} {totalFiltered === 1 ? 'lead único' : 'leads únicos'}
                </span>
              </div>

              {/* Ordenação */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 font-bold">Ordenar por:</span>
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as any)}
                  className="px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 text-xs"
                >
                  <option value="lastDate">Data Mais Recente (Última Ação)</option>
                  <option value="firstDate">Data Mais Antiga (Primeira Ação)</option>
                  <option value="totalActions">Maior Engajamento (Mais Ações)</option>
                  <option value="nome">Nome (A-Z)</option>
                  <option value="cidade">Cidade (A-Z)</option>
                </select>

                <button
                  onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-100 text-gray-600 transition-colors"
                  title="Inverter Ordem"
                >
                  <ArrowUpDown className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Conteúdo da Tabela */}
            {loading ? (
              <div className="p-16 text-center text-gray-500">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-blue-600 mb-3" />
                <p className="font-bold text-sm">Carregando e consolidando leads de todos os formulários...</p>
              </div>
            ) : totalFiltered === 0 ? (
              <div className="p-16 text-center text-gray-500">
                <Users className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                <h3 className="font-black text-gray-700 text-base uppercase">Nenhum Lead Encontrado</h3>
                <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  Nenhum registro corresponde aos filtros selecionados. Tente ajustar os termos de busca ou limpar os filtros.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200/80 bg-gray-50 text-[11px] font-black uppercase tracking-wider text-gray-500">
                      <th className="py-3.5 px-4">Lead / Apoiador</th>
                      <th className="py-3.5 px-4">Contato (WhatsApp & E-mail)</th>
                      <th className="py-3.5 px-4">Localização (Cidade/UF)</th>
                      <th className="py-3.5 px-4">Campanhas Preenchidas</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                      <th className="py-3.5 px-4">Última Data</th>
                      <th className="py-3.5 px-4 text-right">Ficha 360º</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs">
                    {paginatedLeads.map((lead) => {
                      const cleanPhone = lead.whatsapp.replace(/\D/g, '');
                      const waLink = cleanPhone ? `https://wa.me/55${cleanPhone.startsWith('55') ? cleanPhone.substring(2) : cleanPhone}` : null;

                      return (
                        <tr 
                          key={lead.id} 
                          className="hover:bg-blue-50/40 transition-colors group cursor-pointer"
                          onClick={() => setSelectedLead(lead)}
                        >
                          {/* Coluna 1: Nome & Badges de Engajamento */}
                          <td className="py-3.5 px-4">
                            <div className="font-black text-gray-900 text-sm group-hover:text-blue-600 transition-colors">
                              {lead.nome}
                            </div>
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {lead.isSuperSupporter ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  Super Apoiador ({lead.totalActions})
                                </span>
                              ) : lead.isMultiAction ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  Multi-Campanha ({lead.totalActions})
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold text-gray-500 bg-gray-100">
                                  1 ação
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Coluna 2: Contatos */}
                          <td className="py-3.5 px-4">
                            <div className="space-y-1">
                              {lead.whatsapp ? (
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-gray-800">{lead.whatsapp}</span>
                                  {waLink && (
                                    <a
                                      href={waLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      title="Abrir WhatsApp"
                                      className="p-1 rounded-md bg-green-50 hover:bg-green-100 text-green-600 transition-colors inline-flex"
                                    >
                                      <MessageSquare className="w-3.5 h-3.5" />
                                    </a>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400 italic">Sem telefone</span>
                              )}

                              {lead.email ? (
                                <div className="text-gray-500 font-medium truncate max-w-[200px]" title={lead.email}>
                                  {lead.email}
                                </div>
                              ) : null}
                            </div>
                          </td>

                          {/* Coluna 3: Localização */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1 font-bold text-gray-800">
                              <MapPin className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
                              <span>{lead.cidade || 'São Paulo'} / {lead.estado || 'SP'}</span>
                            </div>
                            {lead.bairro && (
                              <div className="text-[11px] text-gray-500 font-medium pl-4.5">
                                {lead.bairro}
                              </div>
                            )}
                          </td>

                          {/* Coluna 4: Badges de Campanhas */}
                          <td className="py-3.5 px-4">
                            <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                              {lead.distinctCampaigns.map((cat, idx) => (
                                <span
                                  key={idx}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${getCampaignBadgeStyle(cat)}`}
                                >
                                  {cat}
                                </span>
                              ))}
                            </div>
                          </td>

                          {/* Coluna 5: Total de Ações */}
                          <td className="py-3.5 px-4 text-center">
                            <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black ${
                              lead.isSuperSupporter ? 'bg-purple-600 text-white shadow-xs'
                                : lead.isMultiAction
                                ? 'bg-amber-500 text-white shadow-xs'
                                : 'bg-gray-100 text-gray-700'
                            }`}>
                              {lead.totalActions}
                            </span>
                          </td>

                          {/* Coluna 6: Última Data */}
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-gray-800 text-[11px]">
                              {formatDate(lead.lastDate)}
                            </div>
                            {lead.firstDate !== lead.lastDate && (
                              <div className="text-[10px] text-gray-400 font-medium">
                                1ª ação: {formatDate(lead.firstDate).split(' ')[0]}
                              </div>
                            )}
                          </td>

                          {/* Coluna 7: Ação de Ver Ficha */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedLead(lead);
                              }}
                              className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs transition-colors inline-flex items-center gap-1 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver Ficha</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            
            {/* Controles de Paginação */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-white">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Anterior
                </button>
                
                <span className="text-sm font-medium text-gray-700">
                  Página {currentPage} de {totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Próxima
                </button>
              </div>
            )}

            {/* Footer da Tabela com Totais */}

            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex flex-col sm:flex-row items-center justify-between text-xs text-gray-500 font-medium gap-2">
              <div>
                Exibindo <strong className="text-gray-900">{serverLeads.length}</strong> nesta página (de <strong className="text-gray-900">{totalFiltered.toLocaleString('pt-BR')}</strong> leads filtrados / {totalUniqueLeads.toLocaleString('pt-BR')} total)
              </div>
              <div className="flex items-center gap-4">
                <span>🔥 Multi-Campanhas: <strong className="text-amber-700">{multiActionLeadsCount.toLocaleString('pt-BR')}</strong></span>
                <span>⭐ Super Apoiadores: <strong className="text-purple-700">{superSupportersCount.toLocaleString('pt-BR')}</strong></span>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* MODAL 360º: DETALHES COMPLETOS E HISTÓRICO DE TODAS AS AÇÕES DO LEAD */}
      {selectedLead && (
        <div 
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
          onClick={() => setSelectedLead(null)}
        >
          <div 
            className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-8"
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-slate-900 to-blue-950 p-6 text-white relative">
              <button
                onClick={() => setSelectedLead(null)}
                className="absolute right-5 top-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 text-xs font-bold text-blue-300 uppercase tracking-wider mb-2">
                <ShieldCheck className="w-4 h-4 text-blue-400" />
                Ficha Cadastral Consolidada 360º
              </div>

              <h2 className="text-2xl font-black uppercase tracking-tight text-white">
                {selectedLead.nome}
              </h2>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                {selectedLead.isSuperSupporter ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-purple-500 text-white shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                    Super Apoiador ({selectedLead.totalActions} ações no site)
                  </span>
                ) : selectedLead.isMultiAction ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase bg-amber-500 text-white shadow-sm">
                    <Flame className="w-3.5 h-3.5" />
                    Multi-Campanha ({selectedLead.totalActions} ações no site)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/20 text-white">
                    1 Participação Registrada
                  </span>
                )}

                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {selectedLead.cidade || 'São Paulo'} / {selectedLead.estado || 'SP'}
                </span>
              </div>
            </div>

            {/* Dados Principais do Lead */}
            <div className="p-6 bg-gray-50/70 border-b border-gray-200/80">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-500 mb-3">
                Informações de Contato & Endereço Consolidado
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                
                <div className="bg-white p-3.5 rounded-2xl border border-gray-200">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">WhatsApp / Celular</div>
                  <div className="font-black text-gray-900 text-sm mt-0.5">
                    {selectedLead.whatsapp || 'Não informado'}
                  </div>
                  {selectedLead.whatsapp && (
                    <a
                      href={`https://wa.me/55${selectedLead.whatsapp.replace(/\D/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-green-500 hover:bg-green-600 text-white font-bold text-[11px] transition-colors"
                    >
                      <MessageSquare className="w-3 h-3" />
                      Conversar no WhatsApp
                    </a>
                  )}
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">E-mail</div>
                  <div className="font-bold text-gray-900 text-xs mt-0.5 truncate" title={selectedLead.email}>
                    {selectedLead.email || 'Não informado'}
                  </div>
                  {selectedLead.email && (
                    <a
                      href={`mailto:${selectedLead.email}`}
                      className="mt-2 inline-flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-bold text-[11px]"
                    >
                      Enviar e-mail →
                    </a>
                  )}
                </div>

                <div className="bg-white p-3.5 rounded-2xl border border-gray-200 sm:col-span-2 md:col-span-1">
                  <div className="text-gray-400 font-bold uppercase text-[10px]">Endereço / Local</div>
                  <div className="font-bold text-gray-900 text-xs mt-0.5">
                    {selectedLead.endereco ? `${selectedLead.endereco}, ${selectedLead.numero || 'S/N'}` : 'Endereço não informado'}
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    {selectedLead.bairro && `${selectedLead.bairro} • `}
                    {selectedLead.cep && `CEP: ${selectedLead.cep}`}
                  </div>
                </div>

              </div>
            </div>

            {/* Linha do Tempo de Preenchimentos (Tudo o que a pessoa já preencheu) */}
            <div className="p-6 max-h-[420px] overflow-y-auto">
              <div className="flex items-center justify-between gap-2 mb-4">
                <h3 className="text-sm font-black uppercase tracking-tight text-gray-900 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Histórico de Participações & Formulários ({selectedLead.actions.length})
                </h3>
                <span className="text-xs font-bold text-gray-400">
                  Ordenado por data mais recente
                </span>
              </div>

              <div className="space-y-3 relative before:absolute before:left-5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gray-200">
                {selectedLead.actions.map((action, idx) => {
                  return (
                    <div 
                      key={action.id || idx}
                      className="relative pl-12"
                    >
                      {/* Timeline Dot Icon */}
                      <div className="absolute left-2.5 top-2.5 -translate-x-1/2 w-6 h-6 rounded-full bg-white border-2 border-blue-500 flex items-center justify-center shadow-xs">
                        {getSourceIcon(action.sourceKey)}
                      </div>

                      <div className="bg-gray-50 hover:bg-gray-100/80 p-4 rounded-2xl border border-gray-200 transition-colors">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-gray-900 text-sm">
                              {action.sourceName}
                            </span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getCampaignBadgeStyle(action.sourceCategory)}`}>
                              {action.sourceCategory}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-gray-500 flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(action.date)}
                          </span>
                        </div>

                        {/* Detalhes específicos dessa submissão */}
                        <div className="mt-2.5 pt-2.5 border-t border-gray-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-gray-600">
                          {action.details.tipoMaterial && (
                            <div>
                              <strong className="text-gray-800">Tipo de Material:</strong> {action.details.tipoMaterial === 'impresso' ? '📦 Material Impresso' : '📱 Material Digital'}
                            </div>
                          )}
                          {action.details.adesivoPerfurado && (
                            <div className="text-purple-700 font-bold">
                              ✨ Solicitou Adesivo Perfurado de Carro
                            </div>
                          )}
                          {action.details.usuario && (
                            <div>
                              <strong className="text-gray-800">Usuário no Jogo:</strong> @{action.details.usuario}
                            </div>
                          )}
                          {action.details.score !== undefined && action.details.score > 0 && (
                            <div>
                              <strong className="text-gray-800">Pontuação Máxima:</strong> {action.details.score} pts
                            </div>
                          )}
                          {action.details.endereco && (
                            <div className="sm:col-span-2">
                              <strong className="text-gray-800">Endereço Informado Nesta Ação:</strong> {action.details.endereco}, {action.details.numero || 'S/N'} {action.details.bairro ? `(${action.details.bairro})` : ''} - {action.details.cidade}/{action.details.estado} {action.details.cep ? `• CEP: ${action.details.cep}` : ''}
                            </div>
                          )}
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

            </div>

            {/* Footer do Modal */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedLead(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-black text-white text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>

          </div>
        </div>
      )}

      
      {/* MODAL DE GERENCIAMENTO DE BASES */}
      {isManageBasesModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white relative">
              <button
                onClick={() => setIsManageBasesModalOpen(false)}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-500/20 border border-slate-400/30 flex items-center justify-center text-slate-300">
                  <Database className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    Gerenciar Bases Importadas
                  </h2>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Visualize e exclua lotes de contatos importados manualmente.
                  </p>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1 bg-gray-50/50">
              {importedBases.length === 0 ? (
                <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-300">
                  <Database className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium text-sm">Nenhuma base importada encontrada.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {importedBases.map((base, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex items-center justify-between gap-4">
                      <div>
                        <h4 className="font-black text-gray-800">{base.campanha}</h4>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Users className="w-3.5 h-3.5" />
                            {base.count} leads
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(base.lastImport).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                      </div>
                      {confirmDeleteBase === base.campanha ? (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-red-600 font-bold hidden sm:inline">Excluir tudo?</span>
                          <button
                            onClick={() => handleDeleteBase(base.campanha)}
                            disabled={isDeletingBase === base.campanha}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors flex items-center gap-1"
                          >
                            {isDeletingBase === base.campanha ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Sim'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteBase('')}
                            disabled={isDeletingBase === base.campanha}
                            className="px-3 py-1.5 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-300 transition-colors"
                          >
                            Cancelar
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteBase(base.campanha)}
                          className="p-2.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl transition-colors border border-red-100"
                          title="Excluir Base Inteira"
                        >
                          <Trash2 className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            
          </div>
        </div>
      )}

      {/* MODAL DE UPLOAD DE CSV */}

      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-gray-100 animate-in fade-in zoom-in duration-200">
            
            {/* Header do Modal */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 p-6 text-white relative">
              <button
                onClick={() => {
                  if (!isUploading) {
                    setIsUploadModalOpen(false);
                    setUploadError('');
                    setUploadSuccessMessage('');
                    setParsedCsvLeads([]);
                    setCsvMappedHeaders([]);
                    setCsvFile(null);
          setCsvFileName('');
          setCsvRawRows([]);
          setCsvHeaders([]);
                  }
                }}
                className="absolute top-5 right-5 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300">
                  <Upload className="w-6 h-6" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/30 text-blue-200 text-[10px] font-black uppercase tracking-wider mb-1">
                    <FileSpreadsheet className="w-3 h-3" />
                    Upload de Base Externa
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                    Importar Leads (.CSV / .XLSX)
                  </h2>
                  <p className="text-xs text-blue-100/80 mt-0.5">
                    Adicione listas externas para cruzar com a base consolidada de apoiadores.
                  </p>
                </div>
              </div>
            </div>

            {/* Conteúdo do Formulário */}
            <div className="p-6 overflow-y-auto space-y-6 flex-1">
              
              {/* Notificação de Sucesso */}
              {uploadSuccessMessage && (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-800 text-sm font-bold animate-in fade-in">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                    <Check className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-black">Importação Concluída com Sucesso!</div>
                    <div className="text-xs font-normal text-emerald-700 mt-0.5">{uploadSuccessMessage}</div>
                  </div>
                </div>
              )}

              {/* Notificação de Erro */}
              {uploadError && (
                <div className="p-4 rounded-2xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-800 text-sm font-bold animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                  <span className="text-xs sm:text-sm">{uploadError}</span>
                </div>
              )}

              {/* 1. Pergunta da Campanha */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">1</span>
                  Qual foi a campanha ou origem que gerou estes leads? <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={campaignInput}
                  onChange={(e) => setCampaignInput(e.target.value)}
                  placeholder="Ex: Meta Ads - Março 2026, Feira Adoção Ibirapuera, Mutirão ZL..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium transition-all"
                />
                
                {/* Sugestões Rápidas */}
                <div className="pt-1">
                  <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">Sugestões rápidas de campanha:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Meta Ads (Instagram/FB)',
                      'Feira de Adoção',
                      'Mutirão de Castração',
                      'Ação de Panfletagem',
                      'Base de Voluntários',
                      'Evento Presencial',
                      'Lista WhatsApp'
                    ].map((sug) => (
                      <button
                        key={sug}
                        type="button"
                        onClick={() => setCampaignInput(sug)}
                        className={`text-xs px-2.5 py-1 rounded-lg border font-semibold transition-all cursor-pointer ${
                          campaignInput === sug
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                            : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                        }`}
                      >
                        {sug}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 2. Seleção do Arquivo CSV/XLSX */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                  Selecione o arquivo .CSV ou .XLSX da lista <span className="text-red-500">*</span>
                </label>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleProcessCsvFile(file);
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragActive(true);
                  }}
                  onDragLeave={() => setIsDragActive(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragActive(false);
                    const file = e.dataTransfer.files?.[0];
                    if (file) handleProcessCsvFile(file);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-6 border-2 border-dashed rounded-2xl text-center cursor-pointer transition-all ${
                    isDragActive
                      ? 'border-blue-500 bg-blue-50/50 scale-[0.99]'
                      : csvFile
                      ? 'border-emerald-400 bg-emerald-50/30'
                      : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50/50'
                  }`}
                >
                  {csvFile ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <FileSpreadsheet className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-gray-900 text-sm">{csvFileName}</div>
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-black">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        {parsedCsvLeads.length} contatos válidos detectados
                      </div>
                      <span className="text-xs text-blue-600 hover:underline mt-1 font-semibold">
                        Clique para escolher outro arquivo
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="font-bold text-gray-800 text-sm">
                        Arraste e solte o arquivo (.CSV ou .XLSX) aqui
                      </div>
                      <div className="text-xs text-gray-500">
                        ou clique para navegar no seu computador
                      </div>
                      <div className="text-[11px] text-gray-400 mt-1">
                        Formatos aceitos: colunas com Nome, WhatsApp/Telefone, E-mail, Cidade, etc.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              
              {/* Confirmação de Mapeamento de Colunas */}
              {csvMappedHeaders.length > 0 && (
                <div className="space-y-3 pt-4 border-t border-gray-100">
                  <h3 className="text-xs font-black uppercase tracking-wider text-gray-800 flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px]">2</span>
                    Verificação e Mapeamento de Colunas
                  </h3>
                  <p className="text-xs text-gray-500">
                    Analise e ajuste as correspondências entre as colunas da sua planilha e os campos do sistema:
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {csvMappedHeaders.map((mapping, idx) => {
                      const sysField = SYSTEM_FIELDS.find(f => f.id === mapping.systemFieldId);
                      return (
                        <div key={idx} className={`p-3 rounded-xl border flex flex-col gap-1 text-xs ${mapping.originalHeader ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-200'}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-black text-gray-700">{sysField?.label}</span>
                            {mapping.originalHeader ? (
                              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                            ) : (
                              <span className="text-[10px] uppercase font-bold text-gray-400 bg-gray-200 px-1.5 py-0.5 rounded">Vazio</span>
                            )}
                          </div>
                          
                          <select 
                            value={mapping.originalHeader || ''}
                            onChange={(e) => handleHeaderMappingChange(mapping.systemFieldId, e.target.value)}
                            className="mt-1 w-full bg-white border border-gray-300 rounded-lg text-xs p-1.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          >
                            <option value="">-- Não importar --</option>
                            {csvHeaders.map(h => (
                              <option key={h} value={h}>{h}</option>
                            ))}
                          </select>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Prévia dos Dados */}
              {parsedCsvLeads.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-gray-700">
                      Prévia dos dados identificados (primeiros 3 leads):
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      Total: {parsedCsvLeads.length} leads
                    </span>
                  </div>

                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                        <tr>
                          <th className="p-2.5">Nome</th>
                          <th className="p-2.5">WhatsApp/Tel</th>
                          <th className="p-2.5">E-mail</th>
                          <th className="p-2.5">Cidade/UF</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {parsedCsvLeads.slice(0, 3).map((item, idx) => (
                          <tr key={idx} className="hover:bg-gray-50/50">
                            <td className="p-2.5 font-bold text-gray-900">{item.nome}</td>
                            <td className="p-2.5 text-gray-600">{item.whatsapp || '-'}</td>
                            <td className="p-2.5 text-gray-600">{item.email || '-'}</td>
                            <td className="p-2.5 text-gray-600">{item.cidade}/{item.estado}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>

            {/* Footer do Modal de Upload */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!isUploading) {
                    setIsUploadModalOpen(false);
                    setUploadError('');
                    setUploadSuccessMessage('');
                    setParsedCsvLeads([]);
                    setCsvMappedHeaders([]);
                    setCsvFile(null);
          setCsvFileName('');
          setCsvRawRows([]);
          setCsvHeaders([]);
                  }
                }}
                disabled={isUploading}
                className="px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-100 text-xs font-bold transition-all cursor-pointer"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleConfirmCsvImport}
                disabled={isUploading || parsedCsvLeads.length === 0 || !campaignInput.trim()}
                className={`px-6 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all shadow-md ${
                  isUploading || parsedCsvLeads.length === 0 || !campaignInput.trim()
                    ? 'bg-gray-400 cursor-not-allowed opacity-70'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 shadow-blue-900/30 cursor-pointer'
                }`}
              >
                {isUploading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Importando...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>
                      {parsedCsvLeads.length > 0
                        ? `Confirmar Importação (${parsedCsvLeads.length} Leads)`
                        : 'Confirmar Importação'}
                    </span>
                  </>
                )}
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
