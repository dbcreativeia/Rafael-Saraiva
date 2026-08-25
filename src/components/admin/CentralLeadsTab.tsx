import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';
import { 
  Search, 
  RefreshCw, 
  Download, 
  Upload,
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
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet';
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
  firstDate: string;
  lastDate: string;
  actions: LeadAction[];
}

interface CentralLeadsTabProps {
  refreshTrigger?: number;
}

export const CentralLeadsTab: React.FC<CentralLeadsTabProps> = ({ refreshTrigger }) => {
  const [loading, setLoading] = useState(false);
  const [activeView, setActiveView] = useState<'LIST' | 'HEATMAP'>('LIST');

  // Raw data from sources
  const [rawData, setRawData] = useState<{
    popupApoio: any[];
    materialCampaign: any[];
    ninaCampaign: any[];
    citizens: any[];
    petitions: any[];
    contraMausTratos: any[];
    jogoUsers: any[];
    importedLeads: any[];
  }>({
    popupApoio: [],
    materialCampaign: [],
    ninaCampaign: [],
    citizens: [],
    petitions: [],
    contraMausTratos: [],
    jogoUsers: [],
    importedLeads: []
  });

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
  const [campaignInput, setCampaignInput] = useState('');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvFileName, setCsvFileName] = useState('');
  const [parsedCsvLeads, setParsedCsvLeads] = useState<any[]>([]);
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

  const fetchAllLeads = async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const res = await fetch(`/api/leads/consolidated?_t=${t}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (res.ok) {
        const json = await res.json();
        setRawData({
          popupApoio: Array.isArray(json.popupApoio) ? json.popupApoio : [],
          materialCampaign: Array.isArray(json.materialCampaign) ? json.materialCampaign : [],
          ninaCampaign: Array.isArray(json.ninaCampaign) ? json.ninaCampaign : [],
          citizens: Array.isArray(json.citizens) ? json.citizens : [],
          petitions: Array.isArray(json.petitions) ? json.petitions : [],
          contraMausTratos: Array.isArray(json.contraMausTratos) ? json.contraMausTratos : [],
          jogoUsers: Array.isArray(json.jogoUsers) ? json.jogoUsers : [],
          importedLeads: Array.isArray(json.importedLeads) ? json.importedLeads : []
        });
      } else {
        // Fallback: fetch individual endpoints
        const [
          apoioRes,
          matRes,
          ninaRes,
          citRes,
          petRes,
          contraRes,
          jogoRes,
          impRes
        ] = await Promise.all([
          fetch(`/api/popup-apoio?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/material?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/ninapassadore?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/citizens?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/petitions?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/contra-maus-tratos?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/jogo/users?_t=${t}`).then(r => r.json()).catch(() => []),
          fetch(`/api/imported-leads?_t=${t}`).then(r => r.json()).catch(() => [])
        ]);

        setRawData({
          popupApoio: Array.isArray(apoioRes) ? apoioRes : [],
          materialCampaign: Array.isArray(matRes) ? matRes : [],
          ninaCampaign: Array.isArray(ninaRes) ? ninaRes : [],
          citizens: Array.isArray(citRes) ? citRes : [],
          petitions: Array.isArray(petRes) ? petRes : [],
          contraMausTratos: Array.isArray(contraRes) ? contraRes : [],
          jogoUsers: Array.isArray(jogoRes) ? jogoRes : [],
          importedLeads: Array.isArray(impRes) ? impRes : []
        });
      }
    } catch (err) {
      console.warn("Erro ao buscar dados consolidados:", err);
    } finally {
      setLoading(false);
    }
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
          return;
        }

        // Intelligently map column names from any CSV source
        const normalizedList = rows.map((row) => {
          const findValue = (aliases: string[]) => {
            const keys = Object.keys(row);
            for (const key of keys) {
              const cleanKey = key
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]/g, '')
                .trim();

              for (const alias of aliases) {
                const cleanAlias = alias
                  .toLowerCase()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, '')
                  .replace(/[^a-z0-9]/g, '')
                  .trim();

                if (cleanKey === cleanAlias || cleanKey.includes(cleanAlias)) {
                  const val = row[key];
                  if (val !== undefined && val !== null && String(val).trim() !== '') {
                    return String(val).trim();
                  }
                }
              }
            }
            return '';
          };

          const nome = findValue(['nome completo', 'full name', 'nomecompleto', 'nome', 'name', 'contato', 'lead', 'apoiador', 'primeiro nome']);
          const sobrenome = findValue(['sobrenome', 'last name', 'segundo nome']);
          const finalName = sobrenome ? `${nome} ${sobrenome}`.trim() : nome;

          const whatsapp = findValue(['whatsapp', 'whats', 'celular', 'telefone', 'phone', 'tel', 'fone', 'mobile', 'contato']);
          const email = findValue(['email', 'e-mail', 'mail', 'correio']);
          const cidade = formatCityName(findValue(['cidade', 'city', 'municipio', 'municipio']));
          let estado = (findValue(['estado', 'state', 'uf']) || 'SP').toUpperCase();
          if (estado.length > 2) estado = estado.substring(0, 2);
          const cep = findValue(['cep', 'zip', 'zipcode', 'codigo postal', 'postal']);
          const endereco = findValue(['endereco', 'endereço', 'rua', 'logradouro', 'address', 'street']);
          const numero = findValue(['numero', 'número', 'num', 'number']);
          const complemento = findValue(['complemento', 'comp', 'complement']);
          const bairro = findValue(['bairro', 'neighborhood', 'distrito']);

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
            bairro
          };
        }).filter(item => item.nome || item.whatsapp || item.email);

        if (normalizedList.length === 0) {
          setUploadError('Nenhum registro com nome, WhatsApp ou e-mail válido foi encontrado no CSV.');
          setParsedCsvLeads([]);
          return;
        }

        setParsedCsvLeads(normalizedList);
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
    setUploadSuccessMessage('');

    try {
      const res = await fetch('/api/imported-leads/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leads: parsedCsvLeads,
          campanha: campaignInput.trim()
        })
      });

      let data;
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        console.error('Resposta do servidor não é JSON:', text.substring(0, 200));
        throw new Error('Servidor retornou um formato inesperado. O arquivo pode ser muito grande.');
      }

      if (res.ok && data.success) {
        setUploadSuccessMessage(`Sucesso! ${data.count} leads importados para a campanha "${campaignInput.trim()}".`);
        // Atualiza a listagem consolidada imediatamente
        await fetchAllLeads();
        setTimeout(() => {
          setIsUploadModalOpen(false);
          setUploadSuccessMessage('');
          setParsedCsvLeads([]);
          setCsvFile(null);
          setCsvFileName('');
          setCampaignInput('');
        }, 1800);
      } else {
        setUploadError(data.error || 'Erro ao processar importação no servidor.');
      }
    } catch (err) {
      console.error('Erro ao enviar leads importados:', err);
      setUploadError('Erro de conexão ao enviar os leads para o servidor.');
    } finally {
      setIsUploading(false);
    }
  };

  useEffect(() => {
    fetchAllLeads();
  }, [refreshTrigger]);

  // Helpers for normalization & deduplication
  const normalizePhone = (phone?: string) => {
    if (!phone) return '';
    let digits = phone.replace(/\D/g, '');
    if (digits.startsWith('55') && digits.length >= 12) {
      digits = digits.substring(2);
    }
    return digits;
  };

  const normalizeEmail = (email?: string) => {
    if (!email) return '';
    return email.trim().toLowerCase();
  };

  const normalizeName = (name?: string) => {
    if (!name) return '';
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const formatCityName = (city?: string) => {
    if (!city) return 'São Paulo';
    
    const normalized = city.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (normalized === 'sao paulo' || normalized === 'sp' || normalized === 'sao paulo sp' || normalized === 'sao paulo - sp' || normalized === 'capital') {
      return 'São Paulo';
    }
    
    return city
      .trim()
      .toLowerCase()
      .split(/\s+/)
      .map(word => {
        if (['de', 'da', 'do', 'das', 'dos', 'e'].includes(word)) return word;
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(' ');
  };

  // Consolidate all actions into unique lead profiles
  const consolidatedLeads = useMemo(() => {
    const rawActions: LeadAction[] = [];

    // 1. Popup Apoio Capital
    rawData.popupApoio.forEach(item => {
      rawActions.push({
        id: `apoio_${item.id || Math.random()}`,
        sourceKey: 'APOIO',
        sourceName: 'Apoio Capital / SP',
        sourceCategory: 'Apoio Capital',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 2. Material Oficial
    rawData.materialCampaign.forEach(item => {
      const isImpresso = item.tipoMaterial === 'impresso';
      rawActions.push({
        id: `material_${item.id || Math.random()}`,
        sourceKey: 'MATERIAL',
        sourceName: `Material Campanha (${isImpresso ? 'Impresso' : 'Digital'})`,
        sourceCategory: 'Material Oficial',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          tipoMaterial: item.tipoMaterial,
          adesivoPerfurado: !!item.adesivoPerfurado,
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 3. Material Dobrada Nina Passadore
    rawData.ninaCampaign.forEach(item => {
      const isImpresso = item.tipoMaterial === 'impresso';
      rawActions.push({
        id: `nina_${item.id || Math.random()}`,
        sourceKey: 'NINA',
        sourceName: `Material Dobrada Nina (${isImpresso ? 'Impresso' : 'Digital'})`,
        sourceCategory: 'Material Dobrada',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          tipoMaterial: item.tipoMaterial,
          adesivoPerfurado: !!item.adesivoPerfurado,
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 4. Citizens / Minuta Código Animal (PL)
    rawData.citizens.forEach(item => {
      rawActions.push({
        id: `citizens_${item.id || Math.random()}`,
        sourceKey: 'CITIZENS',
        sourceName: 'Minuta Código Animal (PL)',
        sourceCategory: 'Projeto de Lei',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 5. Petitions / Abaixo-Assinado Oficial
    rawData.petitions.forEach(item => {
      rawActions.push({
        id: `petitions_${item.id || Math.random()}`,
        sourceKey: 'PETITIONS',
        sourceName: 'Abaixo-Assinado Código Animal',
        sourceCategory: 'Abaixo-Assinado',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 6. Contra Maus-Tratos
    rawData.contraMausTratos.forEach(item => {
      rawActions.push({
        id: `contra_${item.id || Math.random()}`,
        sourceKey: 'CONTRA_MAUS_TRATOS',
        sourceName: 'Assinatura Contra Maus-Tratos',
        sourceCategory: 'Maus-Tratos',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // 7. Jogo Missão Resgate
    rawData.jogoUsers.forEach(item => {
      rawActions.push({
        id: `jogo_${item.id || Math.random()}`,
        sourceKey: 'JOGO',
        sourceName: 'Jogador Missão Resgate',
        sourceCategory: 'Jogo Resgate',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          cep: item.cep,
          usuario: item.usuario,
          score: item.maxScore || 0
        }
      });
    });

    // 8. Base Externa Importada (CSV)
    (rawData.importedLeads || []).forEach(item => {
      rawActions.push({
        id: `imported_${item.id || Math.random()}`,
        sourceKey: 'IMPORTED',
        sourceName: `Base Externa: ${item.campanha || 'Importação CSV'}`,
        sourceCategory: item.campanha || 'Base Externa',
        date: item.createdAt || new Date().toISOString(),
        rawItem: item,
        details: {
          cidade: formatCityName(item.cidade),
          estado: item.estado || 'SP',
          endereco: item.endereco,
          numero: item.numero,
          complemento: item.complemento,
          bairro: item.bairro,
          cep: item.cep
        }
      });
    });

    // Grouping Map
    // Key indexing: phone -> index, email -> index, name_city -> index
    const leads: ConsolidatedLead[] = [];
    const phoneToLeadIdx = new Map<string, number>();
    const emailToLeadIdx = new Map<string, number>();
    const nameCityToLeadIdx = new Map<string, number>();

    rawActions.forEach(action => {
      const item = action.rawItem;
      const fullName = item.nomeCompleto || (item.sobrenome ? `${item.nome} ${item.sobrenome}`.trim() : item.nome) || 'Anônimo';
      const phone = item.whatsapp || '';
      const email = item.email || '';
      const cidade = formatCityName(item.cidade);
      const estado = (item.estado || 'SP').toUpperCase();
      const cep = item.cep || '';
      const endereco = item.endereco || '';
      const numero = item.numero || '';
      const complemento = item.complemento || '';
      const bairro = item.bairro || '';

      const normPhone = normalizePhone(phone);
      const normEmail = normalizeEmail(email);
      const normName = normalizeName(fullName);
      const normCity = normalizeName(cidade);
      const nameCityKey = normName && normName.length > 5 ? `${normName}__${normCity}` : '';

      let targetIdx = -1;

      if (normPhone && normPhone.length >= 8 && phoneToLeadIdx.has(normPhone)) {
        targetIdx = phoneToLeadIdx.get(normPhone)!;
      } else if (normEmail && normEmail.includes('@') && emailToLeadIdx.has(normEmail)) {
        targetIdx = emailToLeadIdx.get(normEmail)!;
      } else if (nameCityKey && nameCityToLeadIdx.has(nameCityKey)) {
        targetIdx = nameCityToLeadIdx.get(nameCityKey)!;
      }

      if (targetIdx !== -1) {
        // Merge into existing lead
        const existing = leads[targetIdx];
        existing.actions.push(action);
        existing.totalActions = existing.actions.length;

        // Upgrade data with non-empty fields
        if (fullName && fullName.length > existing.nome.length && !existing.nome.includes(fullName)) {
          existing.nome = fullName;
        }
        if (phone && !existing.whatsapp) existing.whatsapp = phone;
        if (email && !existing.email) existing.email = email;
        if (cidade && existing.cidade === 'São Paulo' && cidade !== 'São Paulo') existing.cidade = cidade;
        if (estado && !existing.estado) existing.estado = estado;
        if (cep && !existing.cep) existing.cep = cep;
        if (endereco && !existing.endereco) existing.endereco = endereco;
        if (numero && !existing.numero) existing.numero = numero;
        if (complemento && !existing.complemento) existing.complemento = complemento;
        if (bairro && !existing.bairro) existing.bairro = bairro;

        // Update dates
        if (new Date(action.date).getTime() < new Date(existing.firstDate).getTime()) {
          existing.firstDate = action.date;
        }
        if (new Date(action.date).getTime() > new Date(existing.lastDate).getTime()) {
          existing.lastDate = action.date;
        }

        // Distinct campaigns
        if (!existing.distinctCampaigns.includes(action.sourceCategory)) {
          existing.distinctCampaigns.push(action.sourceCategory);
        }
        existing.isMultiAction = existing.actions.length > 1;

        // Register any newly discovered keys
        if (normPhone && normPhone.length >= 8) phoneToLeadIdx.set(normPhone, targetIdx);
        if (normEmail && normEmail.includes('@')) emailToLeadIdx.set(normEmail, targetIdx);
        if (nameCityKey) nameCityToLeadIdx.set(nameCityKey, targetIdx);
      } else {
        // Create new lead record
        const newLeadIdx = leads.length;
        const newLead: ConsolidatedLead = {
          id: `lead_${Date.now()}_${newLeadIdx}_${Math.random().toString(36).substring(2, 7)}`,
          nome: fullName,
          whatsapp: phone,
          email: email,
          cidade: cidade,
          estado: estado,
          cep: cep,
          endereco: endereco,
          numero: numero,
          complemento: complemento,
          bairro: bairro,
          totalActions: 1,
          distinctCampaigns: [action.sourceCategory],
          isMultiAction: false,
          firstDate: action.date,
          lastDate: action.date,
          actions: [action]
        };

        leads.push(newLead);

        if (normPhone && normPhone.length >= 8) phoneToLeadIdx.set(normPhone, newLeadIdx);
        if (normEmail && normEmail.includes('@')) emailToLeadIdx.set(normEmail, newLeadIdx);
        if (nameCityKey) nameCityToLeadIdx.set(nameCityKey, newLeadIdx);
      }
    });

    // Sort actions of each lead newest first
    leads.forEach(lead => {
      lead.actions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    });

    return leads;
  }, [rawData]);

  // City & State Lists for Dropdowns
  const stateOptions = useMemo(() => {
    const states = new Set<string>();
    consolidatedLeads.forEach(l => {
      if (l.estado) states.add(l.estado.toUpperCase());
    });
    return Array.from(states).sort();
  }, [consolidatedLeads]);

  const cityOptions = useMemo(() => {
    const map = new Map<string, number>();
    consolidatedLeads.forEach(l => {
      if (estadoFilter && l.estado?.toUpperCase() !== estadoFilter.toUpperCase()) return;
      const c = l.cidade || 'São Paulo';
      map.set(c, (map.get(c) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [consolidatedLeads, estadoFilter]);

  const campaignOptions = useMemo(() => {
    const list: string[] = [
      'Apoio Capital',
      'Material Oficial',
      'Material Dobrada',
      'Projeto de Lei',
      'Abaixo-Assinado',
      'Maus-Tratos',
      'Jogo Resgate'
    ];
    const set = new Set<string>(list);
    consolidatedLeads.forEach(l => {
      l.distinctCampaigns.forEach(c => {
        if (c && !set.has(c)) {
          set.add(c);
          list.push(c);
        }
      });
    });
    return list;
  }, [consolidatedLeads]);

  // Filtered & Sorted Leads
  const filteredLeads = useMemo(() => {
    const q = deferredSearch.toLowerCase().trim();

    return consolidatedLeads.filter(lead => {
      // 1. Search filter (Name, WhatsApp, Email, City, Address, CEP)
      if (q) {
        const matchNome = lead.nome.toLowerCase().includes(q);
        const matchPhone = lead.whatsapp.toLowerCase().includes(q);
        const matchEmail = lead.email.toLowerCase().includes(q);
        const matchCidade = (lead.cidade || '').toLowerCase().includes(q);
        const matchBairro = (lead.bairro || '').toLowerCase().includes(q);
        const matchCep = (lead.cep || '').toLowerCase().includes(q);
        const matchCampaign = lead.distinctCampaigns.some(c => c.toLowerCase().includes(q));
        if (!matchNome && !matchPhone && !matchEmail && !matchCidade && !matchBairro && !matchCep && !matchCampaign) {
          return false;
        }
      }

      // 2. Estado filter
      if (estadoFilter && lead.estado?.toUpperCase() !== estadoFilter.toUpperCase()) {
        return false;
      }

      // 3. Cidade filter
      if (cidadeFilter && lead.cidade?.toLowerCase() !== cidadeFilter.toLowerCase()) {
        return false;
      }

      // 4. Multi-action filter
      if (multiActionFilter === 'multi' && lead.totalActions <= 1) {
        return false;
      }
      if (multiActionFilter === 'super' && lead.totalActions < 3) {
        return false;
      }
      if (multiActionFilter === 'single' && lead.totalActions > 1) {
        return false;
      }

      // 5. Campaign filter
      if (campaignFilter !== 'all') {
        if (!lead.distinctCampaigns.includes(campaignFilter)) {
          return false;
        }
      }

      return true;
    }).sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (sortField === 'lastDate' || sortField === 'firstDate') {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      } else if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = (valB || '').toLowerCase();
      }

      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [consolidatedLeads, deferredSearch, estadoFilter, cidadeFilter, multiActionFilter, campaignFilter, sortField, sortOrder]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, estadoFilter, cidadeFilter, multiActionFilter, campaignFilter, sortField, sortOrder]);

  // Paginated Leads
  const paginatedLeads = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredLeads, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);

  // Global KPIs
  const totalUniqueLeads = consolidatedLeads.length;
  const totalSubmissions = useMemo(() => {
    return consolidatedLeads.reduce((acc, curr) => acc + curr.totalActions, 0);
  }, [consolidatedLeads]);
  const multiActionLeadsCount = useMemo(() => {
    return consolidatedLeads.filter(l => l.isMultiAction).length;
  }, [consolidatedLeads]);
  const superSupportersCount = useMemo(() => {
    return consolidatedLeads.filter(l => l.totalActions >= 3).length;
  }, [consolidatedLeads]);
  const spLeadsCount = useMemo(() => {
    return consolidatedLeads.filter(l => l.estado?.toUpperCase() === 'SP' || !l.estado).length;
  }, [consolidatedLeads]);

  // SP Heatmap Points Calculation
  const spHeatmapPoints = useMemo(() => {
    if (!municipiosData.length || !consolidatedLeads.length) return [];

    // Group leads by normalized city name in SP
    const cityMap: Record<string, { count: number; totalActions: number; multiCount: number; displayName: string }> = {};

    consolidatedLeads.forEach(lead => {
      if (lead.estado && lead.estado.toUpperCase() !== 'SP') return;
      const rawCity = lead.cidade || 'São Paulo';
      const normKey = rawCity.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

      if (!cityMap[normKey]) {
        cityMap[normKey] = {
          count: 0,
          totalActions: 0,
          multiCount: 0,
          displayName: rawCity
        };
      }
      cityMap[normKey].count += 1;
      cityMap[normKey].totalActions += lead.totalActions;
      if (lead.isMultiAction) {
        cityMap[normKey].multiCount += 1;
      }
    });

    const points: {
      lat: number;
      lng: number;
      name: string;
      count: number;
      totalActions: number;
      multiCount: number;
      densityColor: string;
      radius: number;
    }[] = [];

    municipiosData.forEach(mun => {
      if (mun.codigo_uf !== 35) return; // SP state code
      const munNorm = (mun.nome || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
      const cityData = cityMap[munNorm];

      if (cityData && cityData.count > 0) {
        // Color scale for heatmap
        let densityColor = '#3B82F6'; // Blue for 1
        if (cityData.count >= 20) {
          densityColor = '#DC2626'; // Red intense
        } else if (cityData.count >= 10) {
          densityColor = '#EA580C'; // Orange fire
        } else if (cityData.count >= 5) {
          densityColor = '#F59E0B'; // Amber warm
        } else if (cityData.count >= 2) {
          densityColor = '#8B5CF6'; // Purple medium
        }

        const radius = Math.min(36, Math.max(7, Math.sqrt(cityData.count) * 6.5));

        points.push({
          lat: mun.latitude,
          lng: mun.longitude,
          name: mun.nome,
          count: cityData.count,
          totalActions: cityData.totalActions,
          multiCount: cityData.multiCount,
          densityColor,
          radius
        });
      }
    });

    return points.sort((a, b) => b.count - a.count);
  }, [consolidatedLeads, municipiosData]);

  const exportMailMergeExcel = () => {
    const listToExport = filteredLeads.length > 0 ? filteredLeads : consolidatedLeads;
    
    // Filtra apenas leads que tem endereço consideravelmente completo
    const completeAddresses = listToExport.filter(lead => {
      return lead.endereco && lead.endereco.trim().length > 3 && 
             lead.numero && lead.numero.trim().length > 0 &&
             lead.cidade && lead.cidade.trim().length > 2 &&
             lead.estado && lead.estado.trim().length > 1 &&
             lead.cep && lead.cep.trim().length >= 8;
    });
    
    if (completeAddresses.length === 0) {
      alert("Nenhum lead com endereço completo encontrado.");
      return;
    }

    const data = completeAddresses.map(lead => {
      return {
        'Nome Completo': lead.nome,
        'WhatsApp / Telefone': lead.whatsapp || 'Não informado',
        'Endereço': lead.endereco ? `${lead.endereco}, ${lead.numero || 'S/N'} ${lead.complemento ? `(${lead.complemento})` : ''}`.trim() : '',
        'Bairro': lead.bairro || '',
        'Cidade': lead.cidade || 'São Paulo',
        'Estado': lead.estado || 'SP',
        'CEP': lead.cep || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Endereços Postais');
    
    const count = completeAddresses.length;
    XLSX.writeFile(workbook, `Enderecos_Correios_N${count}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Unified List to Excel (.xlsx)
  const exportConsolidatedExcel = () => {
    const listToExport = filteredLeads.length > 0 ? filteredLeads : consolidatedLeads;

    const data = listToExport.map(lead => {
      const allCampaigns = lead.distinctCampaigns.join(' | ');
      const actionsSummary = lead.actions
        .map(a => `[${formatDate(a.date)}] ${a.sourceName}`)
        .join('; ');

      return {
        'Nome Completo': lead.nome,
        'WhatsApp / Telefone': lead.whatsapp || 'Não informado',
        'E-mail': lead.email || 'Não informado',
        'Cidade': lead.cidade || 'São Paulo',
        'Estado': lead.estado || 'SP',
        'CEP': lead.cep || '',
        'Endereço': lead.endereco ? `${lead.endereco}, ${lead.numero || 'S/N'} ${lead.complemento ? `(${lead.complemento})` : ''}`.trim() : '',
        'Bairro': lead.bairro || '',
        'Total de Ações / Formulários': lead.totalActions,
        'Preencheu Mais de 1 Campanha?': lead.isMultiAction ? 'SIM' : 'NÃO',
        'Campanhas Preenchidas': allCampaigns,
        'Primeiro Preenchimento': formatDate(lead.firstDate),
        'Último Preenchimento': formatDate(lead.lastDate),
        'Histórico Completo de Interações': actionsSummary
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Central de Leads');

    // Auto column widths
    const colWidths = [
      { wch: 28 }, // Nome
      { wch: 18 }, // WhatsApp
      { wch: 26 }, // Email
      { wch: 18 }, // Cidade
      { wch: 8 },  // Estado
      { wch: 12 }, // CEP
      { wch: 32 }, // Endereco
      { wch: 18 }, // Bairro
      { wch: 15 }, // Total Acoes
      { wch: 16 }, // Multi-Acao
      { wch: 35 }, // Campanhas
      { wch: 20 }, // Primeira Data
      { wch: 20 }, // Ultima Data
      { wch: 45 }  // Historico
    ];
    worksheet['!cols'] = colWidths;

    const todayStr = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `Central_Leads_Consolidada_RafaelSaraiva_${todayStr}.xlsx`);
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
              onClick={fetchAllLeads}
              disabled={loading}
              className="bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold py-2.5 px-4 rounded-xl border border-white/20 flex items-center gap-2 text-xs sm:text-sm transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-300' : ''}`} />
              <span>{loading ? 'Atualizando...' : 'Sincronizar'}</span>
            </button>

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
              <span>Exportar Lista Única (.xlsx)</span>
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
            <span>Lista de Leads ({filteredLeads.length})</span>
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
            <span>Mapa de Calor Estado de SP</span>
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
              activeView === 'HEATMAP' ? 'bg-red-800 text-white' : 'bg-red-100 text-red-700'
            }`}>
              {spHeatmapPoints.length} cidades
            </span>
          </button>
        </div>

        <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500 font-medium pr-2">
          <MapPin className="w-3.5 h-3.5 text-blue-600" />
          <span>Base em SP: <strong className="text-gray-800">{spLeadsCount}</strong> leads</span>
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
                      fillOpacity: 0.65,
                      weight: 2
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
                        <button
                          onClick={() => {
                            setCidadeFilter(pt.name);
                            setEstadoFilter('SP');
                            setActiveView('LIST');
                          }}
                          className="mt-2 w-full py-1 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-[11px] font-bold text-center cursor-pointer shadow-xs"
                        >
                          Ver Leads de {pt.name} →
                        </button>
                      </div>
                    </Tooltip>
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
                  <option value="">Todos os Estados ({consolidatedLeads.length})</option>
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
                  <option value="">Todas as Cidades ({cityOptions.length})</option>
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
                Todos ({consolidatedLeads.length})
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
                <span>Multi-Campanhas ({multiActionLeadsCount})</span>
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
                <span>Super Apoiadores 3+ ({superSupportersCount})</span>
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
                  {filteredLeads.length} {filteredLeads.length === 1 ? 'lead único' : 'leads únicos'}
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
            ) : filteredLeads.length === 0 ? (
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
                              {lead.totalActions >= 3 ? (
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
                              lead.totalActions >= 3
                                ? 'bg-purple-600 text-white shadow-xs'
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
                Exibindo <strong className="text-gray-900">{filteredLeads.length}</strong> de <strong className="text-gray-900">{consolidatedLeads.length}</strong> leads consolidados
              </div>
              <div className="flex items-center gap-4">
                <span>🔥 Multi-Campanhas: <strong className="text-amber-700">{multiActionLeadsCount}</strong></span>
                <span>⭐ Super Apoiadores: <strong className="text-purple-700">{superSupportersCount}</strong></span>
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
                {selectedLead.totalActions >= 3 ? (
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
                    setCsvFile(null);
                    setCsvFileName('');
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
                    setCsvFile(null);
                    setCsvFileName('');
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
