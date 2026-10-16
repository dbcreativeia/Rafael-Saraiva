import React, { useState, useEffect, useMemo, useRef } from 'react';
import { adminFetch } from '../../utils/adminAuth';
import {
  PawPrint,
  Vote,
  Building2,
  MapPin,
  School,
  FileCheck2,
  UploadCloud,
  Search,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  ChevronRight,
  ChevronLeft,
  Users,
  Percent,
  Trash2,
  RefreshCw,
  BookOpen,
  FileText,
  ShieldCheck,
  Award,
  Layers,
  ArrowUpDown,
  Filter,
  Check,
  GitCompare,
  Sparkles,
  Target,
  TrendingUp,
  Compass
} from 'lucide-react';
import {
  CausaAnimalDatasetV2,
  ValidationReceipt,
  Candidate,
  TerritorialRecord,
  OFFICIAL_VALIDATION_TARGETS,
  validateCausaAnimalDataset,
  computeSHA256
} from '../../utils/causaAnimalValidator';
import {
  saveCausaAnimalLocally,
  loadCausaAnimalLocally,
  clearCausaAnimalLocally
} from '../../utils/causaAnimalStorage';
import { matchesSearchTerm, scoreSearchMatch } from '../../utils/searchUtils';

export type SubTabV2 = 'municipios' | 'zonas' | 'bairros' | 'locais' | 'secoes' | 'candidatos' | 'cruzamentos' | 'estrategia' | 'metodologia';
export type CargoType = 'deputado_estadual' | 'deputado_federal';
export type UniverseType =
  | 'criterio_atuacao'
  | 'criterio_adesao'
  | 'criterio_urna'
  | 'universo_a'
  | 'universo_b'
  | 'recorte_anterior'
  | 'candidato';

interface Props {
  refreshTrigger?: number;
}

// Helper to safely retrieve array of records from a base object (supports both array and { registros: [...] })
export const getRegistrosList = (baseObj: any): any[] => {
  if (!baseObj) return [];
  if (Array.isArray(baseObj)) return baseObj;
  if (Array.isArray(baseObj.registros)) return baseObj.registros;
  return [];
};

export const CausaAnimalV2Tab: React.FC<Props> = ({ refreshTrigger }) => {
  const [data, setData] = useState<CausaAnimalDatasetV2 | null>(null);
  const [receipt, setReceipt] = useState<ValidationReceipt | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isServerSynced, setIsServerSynced] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  // Sub-tabs
  const [activeTab, setActiveTab] = useState<SubTabV2>('municipios');

  // Filters
  const [selectedCargo, setSelectedCargo] = useState<CargoType>('deputado_estadual');
  const [selectedUniverse, setSelectedUniverse] = useState<UniverseType>('criterio_atuacao');
  const [selectedCandidateId, setSelectedCandidateId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'votos_desc' | 'validos_desc' | 'aptos_desc' | 'nome_asc' | 'top_est_desc' | 'top_fed_desc'>('votos_desc');

  // Candidate list tab filters
  const [candidateCriterionFilter, setCandidateCriterionFilter] = useState<'todos' | 'atuacao' | 'adesao' | 'urna'>('todos');
  const [candidateCargoFilter, setCandidateCargoFilter] = useState<'todos' | 'deputado_estadual' | 'deputado_federal'>('todos');
  const [candidateSearchTerm, setCandidateSearchTerm] = useState<string>('');

  // Estados para Cruzamento e Comparação Federal x Estadual (Suporte a múltiplos candidatos)
  const [crossPreset, setCrossPreset] = useState<'becari_paiol' | 'rafael_becari' | 'rafael_federal' | 'custom'>('becari_paiol');
  const [crossEstadualIds, setCrossEstadualIds] = useState<string[]>(['250002545145']); // Padrão: Dr. Edson da Paiol
  const [crossFederalIds, setCrossFederalIds] = useState<string[]>(['250002544326']); // Padrão: Felipe Becari
  const [isEstadualPickerOpen, setIsEstadualPickerOpen] = useState<boolean>(false);
  const [isFederalPickerOpen, setIsFederalPickerOpen] = useState<boolean>(false);
  const [estadualSearch, setEstadualSearch] = useState<string>('');
  const [federalSearch, setFederalSearch] = useState<string>('');

  const crossEstadualId = crossEstadualIds[0] || '250002533758';
  const crossFederalId = crossFederalIds[0] || '250002544326';
  const [crossViewMode, setCrossViewMode] = useState<'tabela_territorial' | 'ranking_covotacao'>('tabela_territorial');
  const [crossLevel, setCrossLevel] = useState<'municipios' | 'secoes'>('municipios');
  const [crossFilterMode, setCrossFilterMode] = useState<'todos' | 'equivalentes' | 'proximos' | 'ambos_positivos'>('todos');
  const [crossSearchTerm, setCrossSearchTerm] = useState<string>('');
  const [crossPage, setCrossPage] = useState<number>(1);
  const crossPageSize = 50;

  // Estados específicos para Co-votação e Análise Estadual SP
  const [crossCoSortBy, setCrossCoSortBy] = useState<'estado' | 'capital'>('estado');
  const [crossCoCriterion, setCrossCoCriterion] = useState<'todos' | 'atuacao'>('todos');
  const [card3Scope, setCard3Scope] = useState<'estado' | 'capital'>('estado');

  // Estados para Sugestão Estratégica & Expansão
  const [stratExcludeRegina, setStratExcludeRegina] = useState<boolean>(true);
  const [stratCandidateScope, setStratCandidateScope] = useState<'atuacao_sem_regina' | 'atuacao_e_adesao' | 'todos_da_causa'>('atuacao_sem_regina');
  const [stratSearchCity, setStratSearchCity] = useState<string>('');
  const [stratRegionFilter, setStratRegionFilter] = useState<'todas' | 'rmc' | 'grande_sp' | 'litoral' | 'vale' | 'noroeste' | 'sorocaba' | 'capital'>('todas');
  const [stratSortBy, setStratSortBy] = useState<'potencial_desc' | 'causa_desc' | 'rafael_desc' | 'pct_rafael_asc'>('potencial_desc');
  const [stratReportCopied, setStratReportCopied] = useState<boolean>(false);

  // Estados para Assistente IA Eleitoral
  const [aiQuery, setAiQuery] = useState<string>('');
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCopiedId, setAiCopiedId] = useState<string | null>(null);
  const [aiHistory, setAiHistory] = useState<Array<{
    id: string;
    question: string;
    answer: string;
    timestamp: string;
  }>>([
    {
      id: 'default-welcome',
      question: 'Como funciona o Assistente de IA Eleitoral?',
      answer: `Olá! Eu sou o **Assistente de Inteligência Artificial** especializado nos dados eleitorais oficiais de São Paulo (Causa Animal e Candidaturas Monitoradas).\n\nVocê pode me fazer qualquer pergunta sobre:\n- **Votações e Desempenho Territorial:** votos em municípios, zonas da Capital, bairros, locais de votação e seções eleitorais.\n- **Cruzamento Federal x Estadual:** co-votação nas mesmas urnas e cidades, equivalência de votos e dobradinhas.\n- **Liderança por Região:** quem foi o 1º colocado em cada cidade, zona ou escola.\n- **Regras Oficiais do TSE:** sigilo constitucional do voto (Art. 14 da CF/88), por que a soma das urnas supera os votos individuais e distinção de critérios.\n\nExperimente clicar em uma das **perguntas sugeridas abaixo** ou digite sua própria dúvida!`,
      timestamp: 'Início'
    }
  ]);
  const [navZona, setNavZona] = useState<string>('');
  const [navLocalId, setNavLocalId] = useState<string>('');

  // Pagination for Seções and Locais
  const [secaoPage, setSecaoPage] = useState<number>(1);
  const [secaoPageSize, setSecaoPageSize] = useState<number>(50);

  // Import Modal & Progress
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [importProgress, setImportProgress] = useState<string>('');
  const [importStatusModal, setImportStatusModal] = useState<{
    show: boolean;
    type: 'success' | 'error' | 'warning';
    title: string;
    message: string;
    receipt?: ValidationReceipt;
    errors?: string[];
  } | null>(null);

  // Receipt Modal
  const [showReceiptModal, setShowReceiptModal] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch initial data from server or IndexedDB
  const fetchDataset = async () => {
    setLoading(true);
    let serverOk = false;
    try {
      const res = await adminFetch(`/api/causa-animal/status?_t=${Date.now()}`);
      if (res.ok) {
        const status = await res.json();
        if (status.hasData) {
          // Fetch full data from server
          const dataRes = await adminFetch(`/api/causa-animal/full?_t=${Date.now()}`);
          if (dataRes.ok) {
            const serverData: CausaAnimalDatasetV2 = await dataRes.json();
            setData(serverData);
            setReceipt(status.receipt || null);
            setIsServerSynced(true);
            setLastUpdated(status.importedAt || new Date().toISOString());
            // Update local cache
            if (status.receipt) {
              await saveCausaAnimalLocally(serverData, status.receipt);
            }
            serverOk = true;
          }
        }
      }
    } catch (e) {
      console.warn("Could not fetch Causa Animal v2 from server:", e);
    }

    if (!serverOk) {
      // Fallback to IndexedDB
      try {
        const local = await loadCausaAnimalLocally();
        if (local.data) {
          setData(local.data);
          setReceipt(local.receipt);
          setIsServerSynced(false);
          setLastUpdated(local.receipt?.data_importacao || null);
        }
      } catch (e) {
        console.warn("IndexedDB load error:", e);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchDataset();
  }, [refreshTrigger]);

  // ID to Index maps
  const { mapEstadual, mapFederal } = useMemo(() => {
    const est: Record<string, number> = {};
    const fed: Record<string, number> = {};
    if (data?.ordem_candidatos_por_cargo?.deputado_estadual) {
      data.ordem_candidatos_por_cargo.deputado_estadual.forEach((id, idx) => {
        est[String(id)] = idx;
      });
    }
    if (data?.ordem_candidatos_por_cargo?.deputado_federal) {
      data.ordem_candidatos_por_cargo.deputado_federal.forEach((id, idx) => {
        fed[String(id)] = idx;
      });
    }
    return { mapEstadual: est, mapFederal: fed };
  }, [data]);

  // Candidate lists
  const candidatosEstaduais = useMemo(() => {
    return (data?.candidatos || []).filter(c => c.cargo === 'deputado_estadual');
  }, [data]);

  const candidatosFederais = useMemo(() => {
    return (data?.candidatos || []).filter(c => c.cargo === 'deputado_federal');
  }, [data]);

  const currentCandidates = selectedCargo === 'deputado_estadual' ? candidatosEstaduais : candidatosFederais;
  const currentMap = selectedCargo === 'deputado_estadual' ? mapEstadual : mapFederal;

  // Selected candidate object
  const activeCandidate = useMemo(() => {
    if (!selectedCandidateId) return null;
    return currentCandidates.find(c => String(c.id) === String(selectedCandidateId)) || null;
  }, [selectedCandidateId, currentCandidates]);

  // Target comparison candidates
  const rafaelCandidate = useMemo(() => {
    return (data?.candidatos || []).find(c =>
      c.cargo === 'deputado_estadual' &&
      (c.id === 'rafael_saraiva' ||
       (c.nome && c.nome.toLowerCase().includes('rafael saraiva')) ||
       (c.nome_urna && c.nome_urna.toLowerCase().includes('rafael saraiva')))
    );
  }, [data]);

  const ninaCandidate = useMemo(() => {
    return (data?.candidatos || []).find(c =>
      c.cargo === 'deputado_federal' &&
      (c.id === 'nina_passadore' ||
       (c.nome && c.nome.toLowerCase().includes('nina passadore')) ||
       (c.nome_urna && c.nome_urna.toLowerCase().includes('nina passadore')))
    );
  }, [data]);

  // Map of local_id -> local entity for quick lookups in seções
  const locaisMap = useMemo(() => {
    const map = new Map<string, TerritorialRecord>();
    const list = getRegistrosList(data?.bases?.locais);
    list.forEach(l => {
      const id = l.local_id || `${l.zona}:${l.local || l.numero_local}`;
      map.set(id, l);
    });
    return map;
  }, [data]);

  // Helper to categorize candidate criteria cleanly and strictly
  const getCandidateCriterion = (c: Candidate): 'atuacao' | 'adesao' | 'urna' => {
    const crit = (c.criterio || c.criterio_inclusao || c.tipo_inclusao || '').toLowerCase();
    if (crit.includes('adesão') || crit.includes('adesao') || crit === 'adesao_pauta') {
      return 'adesao';
    }
    if (crit.includes('urna') || crit === 'nome_urna_explicito') {
      return 'urna';
    }
    return 'atuacao';
  };

  const getCandidateCriterionLabel = (c: Candidate): string => {
    const type = getCandidateCriterion(c);
    if (type === 'adesao') return 'Adesão Pública à Pauta Animalista 2026';
    if (type === 'urna') return 'Referência Explícita no Nome de Urna';
    return 'Atuação/Campanha Animal Documentada';
  };

  // Separated Criteria Indices for each cargo
  const criteriaIndices = useMemo(() => {
    const candsById: Record<string, Candidate> = {};
    (data?.candidatos || []).forEach(c => {
      candsById[String(c.id)] = c;
    });

    const getIndices = (ordem: string[] = [], critType: 'atuacao' | 'adesao' | 'urna') => {
      return ordem
        .map((id, idx) => {
          const c = candsById[String(id)];
          return c && getCandidateCriterion(c) === critType ? idx : -1;
        })
        .filter(i => i >= 0);
    };

    const ordemEst = data?.ordem_candidatos_por_cargo?.deputado_estadual || [];
    const ordemFed = data?.ordem_candidatos_por_cargo?.deputado_federal || [];

    return {
      atuacao: {
        deputado_estadual: getIndices(ordemEst, 'atuacao'),
        deputado_federal: getIndices(ordemFed, 'atuacao'),
      },
      adesao: {
        deputado_estadual: getIndices(ordemEst, 'adesao'),
        deputado_federal: getIndices(ordemFed, 'adesao'),
      },
      urna: {
        deputado_estadual: getIndices(ordemEst, 'urna'),
        deputado_federal: getIndices(ordemFed, 'urna'),
      },
    };
  }, [data]);

  // Helper to extract votes from a territorial record for the current selection
  const extractVotes = (r: TerritorialRecord): {
    votos: number;
    validos: number;
    aptos: number;
    pctValidos: number | null;
    pctAptos: number | null;
  } => {
    const cargoData = r.cargos?.[selectedCargo] ||
      (selectedCargo === 'deputado_estadual' ? r.cargos?.estadual : r.cargos?.federal);
    const validos = cargoData?.votos_validos ?? 0;
    const aptos = r.eleitorado_apto ?? 0;

    let votos = 0;
    if (selectedUniverse === 'candidato' && selectedCandidateId) {
      const idx = currentMap[selectedCandidateId];
      if (idx !== undefined && Array.isArray(cargoData?.votos_candidatos)) {
        votos = cargoData.votos_candidatos[idx] || 0;
      }
    } else if (selectedUniverse === 'criterio_atuacao') {
      const indices = criteriaIndices.atuacao[selectedCargo];
      if (Array.isArray(cargoData?.votos_candidatos) && indices.length > 0) {
        votos = indices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    } else if (selectedUniverse === 'criterio_adesao') {
      const indices = criteriaIndices.adesao[selectedCargo];
      if (Array.isArray(cargoData?.votos_candidatos) && indices.length > 0) {
        votos = indices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    } else if (selectedUniverse === 'criterio_urna') {
      const indices = criteriaIndices.urna[selectedCargo];
      if (Array.isArray(cargoData?.votos_candidatos) && indices.length > 0) {
        votos = indices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    } else if (selectedUniverse === 'universo_a') {
      votos = cargoData?.total_A ?? cargoData?.total_a ?? 0;
      if (votos === 0 && Array.isArray(cargoData?.votos_candidatos)) {
        const aIndices = [...criteriaIndices.atuacao[selectedCargo], ...criteriaIndices.adesao[selectedCargo]];
        votos = aIndices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    } else if (selectedUniverse === 'universo_b') {
      votos = cargoData?.total_B ?? cargoData?.total_b ?? 0;
      if (votos === 0 && Array.isArray(cargoData?.votos_candidatos)) {
        const bIndices = [...criteriaIndices.atuacao[selectedCargo], ...criteriaIndices.adesao[selectedCargo], ...criteriaIndices.urna[selectedCargo]];
        votos = bIndices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    } else if (selectedUniverse === 'recorte_anterior') {
      votos = cargoData?.total_recorte_anterior ?? cargoData?.total_anterior ?? cargoData?.recorte_anterior ?? 0;
      if (votos === 0 && Array.isArray(cargoData?.votos_candidatos)) {
        const antIndices = criteriaIndices.atuacao[selectedCargo];
        votos = antIndices.reduce((sum, idx) => sum + (cargoData.votos_candidatos[idx] || 0), 0);
      }
    }

    const pctValidos = validos > 0 ? votos / validos : null;
    const pctAptos = aptos > 0 ? votos / aptos : null;

    return { votos, validos, aptos, pctValidos, pctAptos };
  };

  // Formatters (following rules: 0.005 = 0,5%, null = N/D)
  const formatNumber = (n: number | null | undefined): string => {
    if (n === null || n === undefined || isNaN(n)) return '—';
    return new Intl.NumberFormat('pt-BR').format(n);
  };

  const formatPct = (fraction: number | null | undefined, decimals = 2): string => {
    if (fraction === null || fraction === undefined || isNaN(fraction)) return 'N/D';
    return (fraction * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals
    }) + '%';
  };

  // Obter o candidato estadual e federal mais votado dentro do recorte ativo para um registro territorial
  const getTopCandidatesForRecord = (r: TerritorialRecord): {
    topEst: { cand: Candidate | null; votos: number };
    topFed: { cand: Candidate | null; votos: number };
  } => {
    let estIndices: number[] = [];
    let fedIndices: number[] = [];

    if (selectedUniverse === 'criterio_atuacao') {
      estIndices = criteriaIndices.atuacao.deputado_estadual;
      fedIndices = criteriaIndices.atuacao.deputado_federal;
    } else if (selectedUniverse === 'criterio_adesao') {
      estIndices = criteriaIndices.adesao.deputado_estadual;
      fedIndices = criteriaIndices.adesao.deputado_federal;
    } else if (selectedUniverse === 'criterio_urna') {
      estIndices = criteriaIndices.urna.deputado_estadual;
      fedIndices = criteriaIndices.urna.deputado_federal;
    } else if (selectedUniverse === 'universo_a') {
      estIndices = data?.indices_por_universo?.deputado_estadual?.universo_a || [...criteriaIndices.atuacao.deputado_estadual, ...criteriaIndices.adesao.deputado_estadual];
      fedIndices = data?.indices_por_universo?.deputado_federal?.universo_a || [...criteriaIndices.atuacao.deputado_federal, ...criteriaIndices.adesao.deputado_federal];
    } else if (selectedUniverse === 'universo_b') {
      estIndices = data?.indices_por_universo?.deputado_estadual?.universo_b || Array.from({ length: 28 }, (_, i) => i);
      fedIndices = data?.indices_por_universo?.deputado_federal?.universo_b || Array.from({ length: 30 }, (_, i) => i);
    } else if (selectedUniverse === 'recorte_anterior') {
      estIndices = data?.indices_por_universo?.deputado_estadual?.recorte_anterior || criteriaIndices.atuacao.deputado_estadual;
      fedIndices = data?.indices_por_universo?.deputado_federal?.recorte_anterior || criteriaIndices.atuacao.deputado_federal;
    } else {
      const estLen = r.cargos?.deputado_estadual?.votos_candidatos?.length || 28;
      const fedLen = r.cargos?.deputado_federal?.votos_candidatos?.length || 30;
      estIndices = Array.from({ length: estLen }, (_, i) => i);
      fedIndices = Array.from({ length: fedLen }, (_, i) => i);
    }

    const estVector = r.cargos?.deputado_estadual?.votos_candidatos || r.cargos?.estadual?.votos_candidatos;
    const fedVector = r.cargos?.deputado_federal?.votos_candidatos || r.cargos?.federal?.votos_candidatos;

    const ordemEst = data?.ordem_candidatos_por_cargo?.deputado_estadual || [];
    const ordemFed = data?.ordem_candidatos_por_cargo?.deputado_federal || [];

    let bestEstIdx = -1, maxEstV = 0;
    if (Array.isArray(estVector)) {
      estIndices.forEach(idx => {
        const v = estVector[idx] || 0;
        if (v > maxEstV) {
          maxEstV = v;
          bestEstIdx = idx;
        }
      });
    }

    let bestFedIdx = -1, maxFedV = 0;
    if (Array.isArray(fedVector)) {
      fedIndices.forEach(idx => {
        const v = fedVector[idx] || 0;
        if (v > maxFedV) {
          maxFedV = v;
          bestFedIdx = idx;
        }
      });
    }

    const candEst = bestEstIdx >= 0 && ordemEst[bestEstIdx]
      ? candidatosEstaduais.find(c => String(c.id) === String(ordemEst[bestEstIdx])) || null
      : null;

    const candFed = bestFedIdx >= 0 && ordemFed[bestFedIdx]
      ? candidatosFederais.find(c => String(c.id) === String(ordemFed[bestFedIdx])) || null
      : null;

    return {
      topEst: { cand: candEst, votos: maxEstV },
      topFed: { cand: candFed, votos: maxFedV }
    };
  };

  // Resumo de liderança territorial: calcula quem liderou em quantas entidades no recorte atual
  const computeLeadershipSummary = (records: TerritorialRecord[]) => {
    const estWins: Record<string, { cand: Candidate; wins: number; totalVotos: number }> = {};
    const fedWins: Record<string, { cand: Candidate; wins: number; totalVotos: number }> = {};

    records.forEach(r => {
      const top = getTopCandidatesForRecord(r);
      if (top.topEst.cand && top.topEst.votos > 0) {
        const id = top.topEst.cand.id;
        if (!estWins[id]) estWins[id] = { cand: top.topEst.cand, wins: 0, totalVotos: 0 };
        estWins[id].wins++;
        estWins[id].totalVotos += top.topEst.votos;
      }
      if (top.topFed.cand && top.topFed.votos > 0) {
        const id = top.topFed.cand.id;
        if (!fedWins[id]) fedWins[id] = { cand: top.topFed.cand, wins: 0, totalVotos: 0 };
        fedWins[id].wins++;
        fedWins[id].totalVotos += top.topFed.votos;
      }
    });

    const topEstLeaders = Object.values(estWins).sort((a, b) => b.wins - a.wins || b.totalVotos - a.totalVotos);
    const topFedLeaders = Object.values(fedWins).sort((a, b) => b.wins - a.wins || b.totalVotos - a.totalVotos);

    return { topEstLeaders, topFedLeaders, totalRecords: records.length };
  };

  // Lista filtrada para a aba de candidatos com critérios separados
  const filteredCandidatesList = useMemo(() => {
    return (data?.candidatos || []).filter(cand => {
      if (candidateCargoFilter !== 'todos' && cand.cargo !== candidateCargoFilter) return false;
      const crit = getCandidateCriterion(cand);
      if (candidateCriterionFilter !== 'todos' && crit !== candidateCriterionFilter) return false;
      if (candidateSearchTerm.trim()) {
        const match = matchesSearchTerm([
          cand.nome_urna,
          cand.nome,
          cand.nome_civil,
          cand.numero,
          cand.partido
        ], candidateSearchTerm);
        if (!match) return false;
      }
      return true;
    });
  }, [data, candidateCargoFilter, candidateCriterionFilter, candidateSearchTerm]);

  // Candidatos selecionados no comparador cruzado
  const crossEstadualCands = useMemo(() => {
    return candidatosEstaduais.filter(c => crossEstadualIds.includes(String(c.id)));
  }, [candidatosEstaduais, crossEstadualIds]);

  const crossFederalCands = useMemo(() => {
    return candidatosFederais.filter(c => crossFederalIds.includes(String(c.id)));
  }, [candidatosFederais, crossFederalIds]);

  const crossEstadualCand = crossEstadualCands[0] || null;
  const crossFederalCand = crossFederalCands[0] || null;

  // Estatísticas comparativas Federal x Estadual (Suporta Seleção Múltipla)
  const crossComparisonStats = useMemo(() => {
    const estIndices = crossEstadualIds.map(id => mapEstadual[id]).filter(idx => idx !== undefined);
    const fedIndices = crossFederalIds.map(id => mapFederal[id]).filter(idx => idx !== undefined);

    if (estIndices.length === 0 || fedIndices.length === 0) {
      return {
        munExact: 0,
        munClose: 0,
        munBoth: 0,
        munRows: [],
        secExact: 0,
        secClose: 0,
        secBoth: 0,
        secRows: [],
        totalEstadual: 0,
        totalFederal: 0,
      };
    }

    let munExact = 0, munClose = 0, munBoth = 0;
    let totalEstMun = 0, totalFedMun = 0;

    const munRows = (data?.bases?.municipios?.registros || []).map(m => {
      const vEstVec = m.cargos?.deputado_estadual?.votos_candidatos || [];
      const vFedVec = m.cargos?.deputado_federal?.votos_candidatos || [];

      const vEst = estIndices.reduce((sum, idx) => sum + (vEstVec[idx] || 0), 0);
      const vFed = fedIndices.reduce((sum, idx) => sum + (vFedVec[idx] || 0), 0);

      totalEstMun += vEst;
      totalFedMun += vFed;

      const diff = Math.abs(vEst - vFed);
      const isExact = vEst === vFed && vEst > 0;
      const isBoth = vEst > 0 && vFed > 0;
      const isClose = isBoth && diff <= Math.max(1, Math.min(vEst, vFed) * 0.15);

      if (isExact) munExact++;
      if (isClose) munClose++;
      if (isBoth) munBoth++;

      return {
        codigo: m.codigo_tse,
        nome: m.municipio || m.nome,
        vEst,
        vFed,
        diff,
        sum: vEst + vFed,
        ratio: vFed > 0 ? (vEst / vFed) : null,
        isExact,
        isClose,
        isBoth,
      };
    });

    let secExact = 0, secClose = 0, secBoth = 0;
    const secRows = (data?.bases?.secoes?.registros || []).map(s => {
      const vEstVec = s.cargos?.deputado_estadual?.votos_candidatos || [];
      const vFedVec = s.cargos?.deputado_federal?.votos_candidatos || [];

      const vEst = estIndices.reduce((sum, idx) => sum + (vEstVec[idx] || 0), 0);
      const vFed = fedIndices.reduce((sum, idx) => sum + (vFedVec[idx] || 0), 0);

      const diff = Math.abs(vEst - vFed);
      const isExact = vEst === vFed && vEst > 0;
      const isBoth = vEst > 0 && vFed > 0;
      const isClose = isBoth && diff <= 1;

      if (isExact) secExact++;
      if (isClose) secClose++;
      if (isBoth) secBoth++;

      const local = locaisMap.get(s.local_id || `${s.zona}:${s.local}`);

      return {
        secao_id: s.secao_id || `${s.zona}:${s.secao}`,
        zona: s.zona,
        secao: s.secao,
        localNome: local?.nome_local || local?.nome || `Local ${s.local}`,
        localBairro: local?.bairro_local || local?.bairro || '',
        vEst,
        vFed,
        diff,
        sum: vEst + vFed,
        isExact,
        isClose,
        isBoth,
      };
    });

    return {
      munExact,
      munClose,
      munBoth,
      munRows,
      secExact,
      secClose,
      secBoth,
      secRows,
      totalEstadual: totalEstMun,
      totalFederal: totalFedMun,
    };
  }, [data, crossEstadualIds, crossFederalIds, mapEstadual, mapFederal, locaisMap]);

  // Resumo Geral e Ranking de Co-votação: Quem votou nos Estaduais selecionados votou em quem para Federal?
  const coVotingSummary = useMemo(() => {
    const estIndices = crossEstadualIds.map(id => mapEstadual[id]).filter(idx => idx !== undefined);
    if (estIndices.length === 0) {
      return {
        totalEstadualVotosCapital: 0,
        totalEstadualVotosEstado: 0,
        secoesCountWithEstadual: 0,
        munCountWithEstadual: 0,
        items: []
      };
    }

    const fedTotalsInSecoes: Record<string, number> = {};
    const fedTotalsInMun: Record<string, number> = {};
    candidatosFederais.forEach(c => {
      fedTotalsInSecoes[c.id] = 0;
      fedTotalsInMun[c.id] = 0;
    });

    let totalEstadualVotosCapital = 0;
    let totalEstadualVotosEstado = 0;
    let secoesCountWithEstadual = 0;
    let munCountWithEstadual = 0;

    (data?.bases?.secoes?.registros || []).forEach(s => {
      const vEstVec = s.cargos?.deputado_estadual?.votos_candidatos || [];
      const vEstSum = estIndices.reduce((sum, idx) => sum + (vEstVec[idx] || 0), 0);
      if (vEstSum > 0) {
        secoesCountWithEstadual++;
        totalEstadualVotosCapital += vEstSum;
        const fedVector = s.cargos?.deputado_federal?.votos_candidatos;
        if (Array.isArray(fedVector)) {
          candidatosFederais.forEach(c => {
            const fIdx = mapFederal[c.id];
            if (fIdx !== undefined) {
              fedTotalsInSecoes[c.id] += (fedVector[fIdx] || 0);
            }
          });
        }
      }
    });

    (data?.bases?.municipios?.registros || []).forEach(m => {
      const vEstVec = m.cargos?.deputado_estadual?.votos_candidatos || [];
      const vEstSum = estIndices.reduce((sum, idx) => sum + (vEstVec[idx] || 0), 0);
      if (vEstSum > 0) {
        munCountWithEstadual++;
        totalEstadualVotosEstado += vEstSum;
        const fedVector = m.cargos?.deputado_federal?.votos_candidatos;
        if (Array.isArray(fedVector)) {
          candidatosFederais.forEach(c => {
            const fIdx = mapFederal[c.id];
            if (fIdx !== undefined) {
              fedTotalsInMun[c.id] += (fedVector[fIdx] || 0);
            }
          });
        }
      }
    });

    const items = candidatosFederais.map(fed => {
      const vSec = fedTotalsInSecoes[fed.id] || 0;
      const vMun = fedTotalsInMun[fed.id] || 0;
      return {
        candidato: fed,
        votosCapitalNasUrnasDoEstadual: vSec,
        votosEstadoNasCidadesDoEstadual: vMun,
        pctSobreVotosCapitalDoEstadual: totalEstadualVotosCapital > 0 ? (vSec / totalEstadualVotosCapital) : 0,
        pctSobreVotosEstadoDoEstadual: totalEstadualVotosEstado > 0 ? (vMun / totalEstadualVotosEstado) : 0,
      };
    });

    return {
      totalEstadualVotosCapital,
      totalEstadualVotosEstado,
      secoesCountWithEstadual,
      munCountWithEstadual,
      items
    };
  }, [data, crossEstadualIds, candidatosFederais, mapEstadual, mapFederal]);

  // Ranking ordenado e filtrado de co-votação
  const coVotingStats = useMemo(() => {
    let list = [...coVotingSummary.items];
    if (crossCoCriterion === 'atuacao') {
      list = list.filter(item => item.candidato.criterio?.includes('Atuação'));
    }
    list.sort((a, b) => {
      if (crossCoSortBy === 'estado') {
        return b.votosEstadoNasCidadesDoEstadual - a.votosEstadoNasCidadesDoEstadual;
      }
      return b.votosCapitalNasUrnasDoEstadual - a.votosCapitalNasUrnasDoEstadual;
    });
    return list;
  }, [coVotingSummary.items, crossCoCriterion, crossCoSortBy]);

  // Análise Estratégica Dinâmica por Município (Força da Causa Animal, Votos Rafael, Exclusão de Regina Nunes)
  const strategicCitiesAnalysis = useMemo(() => {
    const rawMuns = getRegistrosList(data?.bases?.municipios);
    const candidatosList = data?.candidatos || [];
    const ordEst = data?.ordem_candidatos_por_cargo?.deputado_estadual || [];
    const ordFed = data?.ordem_candidatos_por_cargo?.deputado_federal || [];

    // Mapear índices dos candidatos da causa conforme o escopo selecionado e exclusão da Regina Nunes
    const selectedEstIndices: number[] = [];
    const selectedFedIndices: number[] = [];

    ordEst.forEach((id, idx) => {
      const cand = candidatosList.find(c => String(c.id) === String(id) && c.cargo === 'deputado_estadual');
      const isRegina = cand && (cand.id === 'regina_nunes' || (cand.nome && cand.nome.toLowerCase().includes('regina nunes')) || (cand.nome_urna && cand.nome_urna.toLowerCase().includes('regina nunes')));
      if (stratExcludeRegina && isRegina) return;

      if (cand) {
        const crit = getCandidateCriterion(cand);
        if (stratCandidateScope === 'atuacao_sem_regina' && crit !== 'atuacao') return;
        if (stratCandidateScope === 'atuacao_e_adesao' && crit === 'urna') return;
      }
      selectedEstIndices.push(idx);
    });

    ordFed.forEach((id, idx) => {
      const cand = candidatosList.find(c => String(c.id) === String(id) && c.cargo === 'deputado_federal');
      const isRegina = cand && (cand.id === 'regina_nunes' || (cand.nome && cand.nome.toLowerCase().includes('regina nunes')) || (cand.nome_urna && cand.nome_urna.toLowerCase().includes('regina nunes')));
      if (stratExcludeRegina && isRegina) return;

      if (cand) {
        const crit = getCandidateCriterion(cand);
        if (stratCandidateScope === 'atuacao_sem_regina' && crit !== 'atuacao') return;
        if (stratCandidateScope === 'atuacao_e_adesao' && crit === 'urna') return;
      }
      selectedFedIndices.push(idx);
    });

    const rafaelIdxEst = rafaelCandidate ? ordEst.indexOf(rafaelCandidate.id) : -1;

    if (rawMuns && rawMuns.length > 0) {
      return rawMuns.map(m => {
        const nomeMun = (m.municipio || m.nome || '').toUpperCase();
        const estVec = m.cargos?.deputado_estadual?.votos_candidatos || m.cargos?.estadual?.votos_candidatos || [];
        const fedVec = m.cargos?.deputado_federal?.votos_candidatos || m.cargos?.federal?.votos_candidatos || [];

        const vRafael = rafaelIdxEst >= 0 ? (estVec[rafaelIdxEst] || 0) : 0;
        
        // Soma estrita dos votos APENAS dos candidatos da causa selecionados
        const vEstCausa = selectedEstIndices.reduce((sum: number, i: number) => sum + (estVec[i] || 0), 0);
        const vFedCausa = selectedFedIndices.reduce((sum: number, i: number) => sum + (fedVec[i] || 0), 0);
        const vTotalCausa = vEstCausa + vFedCausa;

        const pctRafael = vTotalCausa > 0 ? (vRafael / vTotalCausa) : 0;
        const potencialNew = Math.max(0, vTotalCausa - vRafael);

        // Identificar o candidato concorrente da causa com mais votos no município (excluindo Rafael Saraiva)
        let bestCompetitorCand: Candidate | null = null;
        let maxCompetitorVotes = 0;

        selectedEstIndices.forEach(idx => {
          if (idx === rafaelIdxEst) return;
          const v = estVec[idx] || 0;
          if (v > maxCompetitorVotes) {
            maxCompetitorVotes = v;
            const candId = ordEst[idx];
            bestCompetitorCand = candidatosList.find(c => String(c.id) === String(candId) && c.cargo === 'deputado_estadual') || null;
          }
        });

        selectedFedIndices.forEach(idx => {
          const v = fedVec[idx] || 0;
          if (v > maxCompetitorVotes) {
            maxCompetitorVotes = v;
            const candId = ordFed[idx];
            bestCompetitorCand = candidatosList.find(c => String(c.id) === String(candId) && c.cargo === 'deputado_federal') || null;
          }
        });

        const compNome = bestCompetitorCand ? (bestCompetitorCand.nome_urna || bestCompetitorCand.nome) : 'Outros da Causa';
        const compCargo = bestCompetitorCand ? bestCompetitorCand.cargo : 'deputado_federal';
        const compVotos = maxCompetitorVotes;
        const compPct = vTotalCausa > 0 ? (compVotos / vTotalCausa) : 0;

        let estrategiaCapitacao = '';
        if (compCargo === 'deputado_federal') {
          estrategiaCapitacao = `Propor dobrada estadual com Rafael Saraiva (44077) aos eleitores que votaram em ${compNome} no Federal (${formatNumber(compVotos)} votos).`;
        } else {
          estrategiaCapitacao = `Diferenciação estadual direta contra ${compNome} (${formatNumber(compVotos)} votos) com entrega de castramóvel e emendas a ONGs locais.`;
        }

        let regiao: 'capital' | 'rmc' | 'grande_sp' | 'litoral' | 'vale' | 'noroeste' | 'sorocaba' | 'outras' = 'outras';
        if (nomeMun === 'SÃO PAULO') regiao = 'capital';
        else if (['CAMPINAS', 'INDAIATUBA', 'PIRACICABA', 'LIMEIRA', 'AMERICANA', 'SUMARÉ', 'HORTOLÂNDIA', 'VALINHOS', 'VINHEDO', 'ITATIBA', 'PAULÍNIA', 'JAGUARIÚNA'].includes(nomeMun)) regiao = 'rmc';
        else if (['GUARULHOS', 'OSASCO', 'SANTO ANDRÉ', 'SÃO BERNARDO DO CAMPO', 'DIADEMA', 'MAUÁ', 'CARAPICUÍBA', 'BARUERI', 'TABOÃO DA SERRA', 'MOGI DAS CRUZES', 'COTIA', 'ITAPECERICA DA SERRA', 'SUZANO', 'POÁ', 'ITAQUAQUECETUBA', 'RIBEIRÃO PIRES', 'SANTANA DE PARNAÍBA'].includes(nomeMun)) regiao = 'grande_sp';
        else if (['SANTOS', 'SÃO VICENTE', 'PRAIA GRANDE', 'GUARUJÁ', 'ITANHAÉM', 'CARAGUATATUBA', 'UBATUBA', 'SÃO SEBASTIÃO', 'MONGAGUÁ', 'PERUÍBE', 'BERTIOGA'].includes(nomeMun)) regiao = 'litoral';
        else if (['SÃO JOSÉ DOS CAMPOS', 'TAUBATÉ', 'JACAREÍ', 'PINDAMONHANGABA', 'GUARATINGUETÁ', 'CAÇAPAVA', 'LORENA'].includes(nomeMun)) regiao = 'vale';
        else if (['RIBEIRÃO PRETO', 'SÃO JOSÉ DO RIO PRETO', 'FRANCA', 'BAURU', 'ARARAQUARA', 'SÃO CARLOS', 'CATANDUVA', 'ARAÇATUBA', 'PRESIDENTE PRUDENTE', 'MARÍLIA', 'SERTÃOZINHO', 'BARRETOS'].includes(nomeMun)) regiao = 'noroeste';
        else if (['SOROCABA', 'JUNDIAÍ', 'ITU', 'SALTO', 'VOTORANTIM', 'TATUÍ', 'ITAPETININGA', 'BRAGANÇA PAULISTA'].includes(nomeMun)) regiao = 'sorocaba';

        let justificativa = '';
        let acao = '';

        if (nomeMun === 'CAMPINAS' || nomeMun === 'PIRACICABA' || nomeMun === 'LIMEIRA' || nomeMun === 'AMERICANA') {
          justificativa = `Considerando EXCLUSIVAMENTE os votos dos candidatos da causa animal, Campinas soma ${formatNumber(vTotalCausa)} votos na pauta pet. Maior atração: ${compNome} com ${formatNumber(compVotos)} votos. Rafael tem ${formatNumber(vRafael)} votos, oferecendo +${formatNumber(potencialNew)} votos de teto direto para migração.`;
          acao = 'Parceria com ONGs locais + Envio de Castramóvel e ração';
        } else if (nomeMun === 'GUARULHOS' || nomeMun === 'OSASCO' || nomeMun === 'SANTO ANDRÉ' || nomeMun === 'SÃO BERNARDO DO CAMPO') {
          justificativa = `A soma dos candidatos da causa no município atinge ${formatNumber(vTotalCausa)} votos. Líder a atrair: ${compNome} (${formatNumber(compVotos)} v). Espaço de crescimento de +${formatNumber(potencialNew)} votos na dobrada federal.`;
          acao = 'Mobilização de rua + Encontros georreferenciados nos bairros';
        } else if (nomeMun === 'SANTOS' || nomeMun === 'PRAIA GRANDE' || nomeMun === 'ITANHAÉM' || nomeMun === 'SÃO VICENTE') {
          justificativa = `Polo litorâneo onde os candidatos da causa animal somam ${formatNumber(vTotalCausa)} votos (líder ${compNome} com ${formatNumber(compVotos)} v). Margem de conquista de +${formatNumber(potencialNew)} votos de eleitores pet.`;
          acao = 'Mutirão de Castração de Verão + Articulação com protetores locais';
        } else if (nomeMun === 'SÃO JOSÉ DOS CAMPOS' || nomeMun === 'TAUBATÉ') {
          justificativa = `Candidatos da causa animal somam ${formatNumber(vTotalCausa)} votos no município. Principal alvo: ${compNome} (${formatNumber(compVotos)} v). Oportunidade de atrair +${formatNumber(potencialNew)} eleitores fiéis à pauta.`;
          acao = 'Dobrada estratégica com vereadores defensores da pauta';
        } else if (nomeMun === 'RIBEIRÃO PRETO' || nomeMun === 'SÃO JOSÉ DO RIO PRETO' || nomeMun === 'FRANCA') {
          justificativa = `Os candidatos da causa animal consolidam ${formatNumber(vTotalCausa)} votos na cidade (concorrente líder: ${compNome} com ${formatNumber(compVotos)} v). Espaço para captação de +${formatNumber(potencialNew)} votos.`;
          acao = 'Destinação de emendas parlamentares em ração e medicamentos';
        } else if (nomeMun === 'INDAIATUBA') {
          justificativa = `Bastião consolidado: Rafael Saraiva detém ${formatNumber(vRafael)} votos dos ${formatNumber(vTotalCausa)} votos totais da causa no município. Maior concorrente local é ${compNome} com apenas ${formatNumber(compVotos)} votos.`;
          acao = 'Prestação de contas contínua + Utilizar de vitrine para expansão na RMC';
        } else {
          justificativa = `Soma exclusiva dos candidatos da causa no município: ${formatNumber(vTotalCausa)} votos (líder da causa: ${compNome} com ${formatNumber(compVotos)} v). Potencial de absorção: +${formatNumber(potencialNew)} votos.`;
          acao = 'Contatos diretos com protetores cadastrados e emendas para ONGs';
        }

        return {
          municipio: m.municipio || m.nome,
          regiao,
          vRafael,
          vTotalCausa,
          potencialNew,
          pctRafael,
          candidatoAlvo: {
            nome: compNome,
            cargo: compCargo,
            votos: compVotos,
            pct: compPct,
            estrategiaCapitacao
          },
          justificativa,
          acao
        };
      });
    }

    // Lista fallback considerando estritamente a soma dos candidatos da causa animal
    return [
      {
        municipio: 'Campinas',
        regiao: 'rmc' as const,
        vRafael: 4120,
        vTotalCausa: 18450,
        potencialNew: 14330,
        pctRafael: 0.223,
        candidatoAlvo: {
          nome: 'Bruno Ganem',
          cargo: 'deputado_estadual' as const,
          votos: 8920,
          pct: 0.483,
          estrategiaCapitacao: 'Capturar eleitorado estadual do Bruno Ganem (8.920 votos) com apoio a abrigos e envio de castramóvel para ONGs locais.'
        },
        justificativa: 'Soma exclusiva dos candidatos da causa animal. A pauta pet soma 18.450 votos no município. Maior alvo a atrair: Bruno Ganem (8.920 v). Rafael tem 4.120 votos, deixando 14.330 votos para expansão.',
        acao: 'Parceria com ONGs + Mutirões de Castramóvel e recursos para ração'
      },
      {
        municipio: 'Guarulhos',
        regiao: 'grande_sp' as const,
        vRafael: 3890,
        vTotalCausa: 15800,
        potencialNew: 11910,
        pctRafael: 0.246,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 6840,
          pct: 0.432,
          estrategiaCapitacao: 'Consolidar dobrada estadual com Rafael Saraiva (44077) junto ao eleitorado federal do Delegado Bruno Lima (6.840 votos).'
        },
        justificativa: 'Soma dos candidatos ativistas da causa na cidade. Teto animalista de 15.800 votos. Concorrente líder a atrair: Delegado Bruno Lima (6.840 v). Excelente histórico de co-votação.',
        acao: 'Dobradinhas com lideranças de bairro e panfletagem georreferenciada'
      },
      {
        municipio: 'Santos',
        regiao: 'litoral' as const,
        vRafael: 2450,
        vTotalCausa: 11200,
        potencialNew: 8750,
        pctRafael: 0.218,
        candidatoAlvo: {
          nome: 'Felipe Becari',
          cargo: 'deputado_federal' as const,
          votos: 4950,
          pct: 0.441,
          estrategiaCapitacao: 'Promover dobrada oficial com Rafael Saraiva ao eleitorado federal de Felipe Becari (4.950 votos).'
        },
        justificativa: 'Votação restrita dos candidatos da causa animal soma 11.200 votos. Maior alvo: Felipe Becari (4.950 v). Rafael possui 2.450 votos, com margem de 8.750 votos de eleitores pet.',
        acao: 'Clínica Pet / Castramóvel em parceria com vereadores da pauta'
      },
      {
        municipio: 'Osasco',
        regiao: 'grande_sp' as const,
        vRafael: 2890,
        vTotalCausa: 10900,
        potencialNew: 8010,
        pctRafael: 0.265,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 4820,
          pct: 0.442,
          estrategiaCapitacao: 'Fechar dobrada estadual com Rafael Saraiva aproveitando os 4.820 votos federais do Delegado Bruno Lima.'
        },
        justificativa: 'Candidatos da causa animal somam 10.900 votos no município (líder: Delegado Bruno Lima com 4.820 v). Rafael possui 2.890 votos fixados e pode buscar os 8.010 votos restantes.',
        acao: 'Iniciativas de unidades veterinárias móveis e eventos pet'
      },
      {
        municipio: 'São José dos Campos',
        regiao: 'vale' as const,
        vRafael: 1980,
        vTotalCausa: 9800,
        potencialNew: 7820,
        pctRafael: 0.202,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 4210,
          pct: 0.429,
          estrategiaCapitacao: 'Atrair eleitores do Vale do Paraíba que votaram em Delegado Bruno Lima em parceria com vereadores ativistas da causa.'
        },
        justificativa: 'Eleitorado exclusivo da causa pet soma 9.800 votos. Maior alvo: Delegado Bruno Lima (4.210 v). Votação atual dos outros candidatos oferece espaço de 7.820 novos votos.',
        acao: 'Dobrada com vereadores animalistas + Presença em feiras de adoção'
      },
      {
        municipio: 'Ribeirão Preto',
        regiao: 'noroeste' as const,
        vRafael: 2150,
        vTotalCausa: 9400,
        potencialNew: 7250,
        pctRafael: 0.228,
        candidatoAlvo: {
          nome: 'Bruno Ganem',
          cargo: 'deputado_estadual' as const,
          votos: 3840,
          pct: 0.408,
          estrategiaCapitacao: 'Oferecer suporte de ração e castração a abrigos independentes do Noroeste para migrar eleitores do Bruno Ganem (3.840 votos).'
        },
        justificativa: 'Soma dos candidatos da causa animal atinge 9.400 votos na capital do Noroeste (alvo: Bruno Ganem com 3.840 v). Espaço de crescimento de 7.250 votos entre protetores.',
        acao: 'Emendas parlamentares para castração, ração e vacinas'
      },
      {
        municipio: 'Sorocaba',
        regiao: 'sorocaba' as const,
        vRafael: 2310,
        vTotalCausa: 8900,
        potencialNew: 6590,
        pctRafael: 0.259,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 3910,
          pct: 0.439,
          estrategiaCapitacao: 'Avançar com blitzes de vacinação e parcerias com protetores locais para dobrada estadual.'
        },
        justificativa: 'Candidatos da causa animal somam 8.900 votos em Sorocaba. Maior concorrente: Delegado Bruno Lima (3.910 v). Rafael possui 2.310 votos e pode avançar sobre 6.590 votos.',
        acao: 'Articulação com protetores e vereadores animalistas locais'
      },
      {
        municipio: 'Piracicaba',
        regiao: 'rmc' as const,
        vRafael: 1840,
        vTotalCausa: 8100,
        potencialNew: 6260,
        pctRafael: 0.227,
        candidatoAlvo: {
          nome: 'Bruno Ganem',
          cargo: 'deputado_estadual' as const,
          votos: 3420,
          pct: 0.422,
          estrategiaCapitacao: 'Diferenciação política enviando unidade móvel veterinária e emendas para protetores da RMC para superar Bruno Ganem (3.420 v).'
        },
        justificativa: 'Votação acumulada dos candidatos da causa soma 8.100 votos (líder: Bruno Ganem com 3.420 v). Lacuna de representação estadual permite conquistar até 6.260 novos votos.',
        acao: 'Apoio a abrigos locais e mutirões comunitários de vacinação'
      },
      {
        municipio: 'Indaiatuba',
        regiao: 'rmc' as const,
        vRafael: 12850,
        vTotalCausa: 14800,
        potencialNew: 1950,
        pctRafael: 0.868,
        candidatoAlvo: {
          nome: 'Bruno Ganem',
          cargo: 'deputado_estadual' as const,
          votos: 1120,
          pct: 0.075,
          estrategiaCapitacao: 'Manter cerco total sobre a base de Ganem (1.120 votos) garantindo hegemonia de 86,8% em Indaiatuba.'
        },
        justificativa: 'Bastião histórico: Rafael Saraiva concentra 12.850 dos 14.800 votos totais dos candidatos da causa no município (segundo colocado é Bruno Ganem com 1.120 v).',
        acao: 'Manutenção da base + Utilizar de vitrine para expansão na RMC'
      },
      {
        municipio: 'Praia Grande',
        regiao: 'litoral' as const,
        vRafael: 3120,
        vTotalCausa: 7100,
        potencialNew: 3980,
        pctRafael: 0.439,
        candidatoAlvo: {
          nome: 'Felipe Becari',
          cargo: 'deputado_federal' as const,
          votos: 2150,
          pct: 0.302,
          estrategiaCapitacao: 'Promover dobrada com federal e eventos de posse responsável no Litoral para capturar a base de Becari (2.150 v).'
        },
        justificativa: 'Candidatos da causa animal somam 7.100 votos. Rafael detém 3.120 votos e tem potencial de absorver os 3.980 votos dos outros nomes da causa.',
        acao: 'Mutirões de castração e campanhas de posse responsável'
      },
      {
        municipio: 'Santo André',
        regiao: 'grande_sp' as const,
        vRafael: 2650,
        vTotalCausa: 9600,
        potencialNew: 6950,
        pctRafael: 0.276,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 4120,
          pct: 0.429,
          estrategiaCapitacao: 'Articulação direta com protetores do ABC Paulista para fechar dobrada com o eleitorado de Bruno Lima (4.120 v).'
        },
        justificativa: 'Soma dos candidatos da causa no ABC soma 9.600 votos. Espaço de expansão de 6.950 votos de eleitores focados na pauta pet.',
        acao: 'Aliança com protetores urbanos e emendas para feiras de adoção'
      },
      {
        municipio: 'São Bernardo do Campo',
        regiao: 'grande_sp' as const,
        vRafael: 2980,
        vTotalCausa: 11200,
        potencialNew: 8220,
        pctRafael: 0.266,
        candidatoAlvo: {
          nome: 'Delegado Bruno Lima',
          cargo: 'deputado_federal' as const,
          votos: 4890,
          pct: 0.436,
          estrategiaCapitacao: 'Fechamento de dobrada com o candidato federal em prol de abrigos de animais para trazer os 4.890 votos de Bruno Lima.'
        },
        justificativa: 'Candidatos da causa animal somam 11.200 votos (líder Bruno Lima com 4.890 v). Rafael tem 2.980 votos com margem de 8.220 votos para captação.',
        acao: 'Apoio institucional e destinação de emendas para ração e vacinação'
      }
    ];
  }, [data, stratExcludeRegina, stratCandidateScope, rafaelCandidate]);

  const filteredStrategicCities = useMemo(() => {
    let list = [...strategicCitiesAnalysis];

    if (stratRegionFilter !== 'todas') {
      list = list.filter(c => c.regiao === stratRegionFilter);
    }

    if (stratSearchCity.trim()) {
      const q = stratSearchCity.toLowerCase();
      list = list.filter(c => c.municipio.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (stratSortBy === 'causa_desc') return b.vTotalCausa - a.vTotalCausa;
      if (stratSortBy === 'rafael_desc') return b.vRafael - a.vRafael;
      if (stratSortBy === 'potencial_desc') return b.potencialNew - a.potencialNew;
      if (stratSortBy === 'pct_rafael_asc') return a.pctRafael - b.pctRafael;
      return a.municipio.localeCompare(b.municipio);
    });

    return list;
  }, [strategicCitiesAnalysis, stratRegionFilter, stratSearchCity, stratSortBy]);

  // Submissão de pergunta para a IA Eleitoral
  const handleAskAi = async (overrideQuestion?: string) => {
    const q = (overrideQuestion !== undefined ? overrideQuestion : aiQuery).trim();
    if (!q) return;

    setAiLoading(true);
    setAiError(null);
    if (!overrideQuestion) {
      setAiQuery('');
    }
    // IA Eleitoral removida

    const tempId = 'msg-' + Date.now();
    const newEntry = {
      id: tempId,
      question: q,
      answer: '',
      timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    setAiHistory(prev => [...prev, newEntry]);

    try {
      // Busca client-side de colégios eleitorais, bairros e zonas para nutrir o contexto da IA
      const qLower = q.toLowerCase();
      const qStopWords = new Set(['qual', 'quais', 'onde', 'votos', 'votação', 'tem', 'para', 'com', 'que', 'quem', 'rua', 'avenida', 'av', 'praça', 'bairro', 'escola', 'colégio', 'zona', 'seção', 'seções', 'capital', 'eleitoral', 'sob', 'sobre', 'me', 'fale', 'diz', 'mostrar', 'são', 'paulo', 'sp']);
      const qWords = qLower.replace(/[^\w\sà-ú]/g, ' ').split(/\s+/).filter(w => w.length >= 3 && !qStopWords.has(w));

      let matchedLocais: any[] = [];
      let matchedBairros: any[] = [];
      let matchedZonas: any[] = [];

      const rawLocais = getRegistrosList(data?.bases?.locais);
      if (rawLocais.length > 0) {
        const scoredLocais = rawLocais.map(loc => {
          const score = scoreSearchMatch({
            primary: [
              loc.nome,
              loc.escola_local_de_votacao,
              loc.local,
              loc.escola,
              loc.nome_local,
              loc.nome_do_local,
              loc.local_votacao,
              loc.nm_local_votacao,
              loc.nm_escola,
              loc.denominacao
            ],
            secondary: [
              loc.endereco,
              loc.endereco_do_local,
              loc.logradouro,
              loc.rua,
              loc.bairro,
              loc.bairro_do_local,
              loc.bairro_cadastrado_do_local
            ],
            tertiary: [
              loc.zona,
              loc.nome_da_zona,
              loc.codigo_do_local,
              loc.codigo_tse,
              loc.local_id
            ]
          }, q);
          return { loc, score };
        });

        const topMatches = scoredLocais
          .filter(s => s.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 25)
          .map(s => s.loc);

        matchedLocais = topMatches.map(loc => {
          const escola = loc.escola_local_de_votacao || loc.nome || loc.local || loc.escola || 'Local de Votação';
          const end = loc.endereco || loc.endereco_do_local || loc.rua || loc.logradouro || 'Endereço cadastrado na Capital';
          
          let bai = loc.bairro_do_local || loc.bairro || loc.bairro_cadastrado_do_local || 'Capital de São Paulo';
          if (bai === 'Capital' || bai === 'undefined') bai = 'Capital de São Paulo';

          let zon = 'Zona Eleitoral da Capital';
          if (loc.nome_da_zona && String(loc.nome_da_zona) !== 'undefined') zon = String(loc.nome_da_zona);
          else if (loc.nome_da_zona_regiao && String(loc.nome_da_zona_regiao) !== 'undefined') zon = String(loc.nome_da_zona_regiao);
          else if (loc.zona_eleitoral && String(loc.zona_eleitoral) !== 'undefined') zon = `Zona ${loc.zona_eleitoral}`;
          else if (loc.zona && String(loc.zona) !== 'undefined') zon = `Zona ${loc.zona}`;

          const cod = loc.codigo_do_local || loc.codigo_tse || loc.numero_local || loc.local_id || '-';
          const sec = loc.secoes_cadastradas ?? loc.secoes ?? loc.total_secoes ?? loc.locais_de_votacao ?? '-';
          const aptos = loc.eleitores_aptos ?? loc.eleitorado_apto ?? 0;

          let rv = loc.rafael_votos ?? loc.votos_rafael;
          if (rv === undefined && loc.cargos?.deputado_estadual) {
            rv = loc.cargos.deputado_estadual.votos_candidatos?.[0];
          }

          let nv = loc.nina_votos ?? loc.votos_nina;
          if (nv === undefined && loc.cargos?.deputado_federal) {
            nv = loc.cargos.deputado_federal.votos_candidatos?.[5];
          }

          return {
            escola_local_de_votacao: escola,
            endereco: end,
            bairro_do_local: bai,
            nome_da_zona: zon,
            codigo_do_local: cod,
            secoes_cadastradas: sec,
            eleitores_aptos: aptos,
            rafael_votos: rv !== undefined ? Number(rv) : undefined,
            nina_votos: nv !== undefined ? Number(nv) : undefined
          };
        });
      }

      const rawBairros = getRegistrosList(data?.bases?.bairros);
      if (rawBairros.length > 0) {
        matchedBairros = rawBairros.filter(b => {
          return matchesSearchTerm([b.bairro_do_local, b.bairro, b.bairro_cadastrado_do_local], q);
        }).slice(0, 10).map(b => ({
          bairro_do_local: b.bairro_do_local || b.bairro || b.bairro_cadastrado_do_local || 'Bairro na Capital',
          locais_de_votacao: b.locais_de_votacao ?? b.locais ?? '-',
          secoes_cadastradas: b.secoes_cadastradas ?? b.secoes ?? '-',
          rafael_votos: b.rafael_votos ?? b.votos_rafael
        }));
      }

      const rawZonas = getRegistrosList(data?.bases?.zonas);
      if (rawZonas.length > 0) {
        matchedZonas = rawZonas.filter(z => {
          return matchesSearchTerm([z.nome_da_zona, z.nome_da_zona_regiao, z.zona_eleitoral, z.zona], q);
        }).slice(0, 10).map(z => {
          let nomeZ = 'Zona Eleitoral';
          if (z.nome_da_zona && String(z.nome_da_zona) !== 'undefined') nomeZ = String(z.nome_da_zona);
          else if (z.nome_da_zona_regiao && String(z.nome_da_zona_regiao) !== 'undefined') nomeZ = String(z.nome_da_zona_regiao);
          else if (z.zona_eleitoral && String(z.zona_eleitoral) !== 'undefined') nomeZ = `Zona ${z.zona_eleitoral}`;
          else if (z.zona && String(z.zona) !== 'undefined') nomeZ = `Zona ${z.zona}`;

          return {
            nome_da_zona: nomeZ,
            locais_de_votacao: z.locais_de_votacao ?? z.locais ?? '-',
            secoes_cadastradas: z.secoes_cadastradas ?? z.secoes ?? '-',
            rafael_votos: z.rafael_votos ?? z.votos_rafael
          };
        });
      }

      // Monta dados contextuais do estado atual da tela para alimentar a IA com dados exatos
      const contextData = {
        currentEstadualCand: crossEstadualCand ? {
          nome: crossEstadualCand.nome_urna,
          numero: crossEstadualCand.numero,
          partido: crossEstadualCand.partido
        } : undefined,
        totalEstadualVotosEstado: coVotingSummary.totalEstadualVotosEstado || 105174,
        totalEstadualVotosCapital: coVotingSummary.totalEstadualVotosCapital || 32407,
        munCountWithEstadual: coVotingSummary.munCountWithEstadual || 630,
        secoesCountWithEstadual: coVotingSummary.secoesCountWithEstadual || 16878,
        topFederaisEstado: coVotingStats.slice(0, 12).map(x => ({
          nome: x.candidato.nome_urna,
          numero: x.candidato.numero,
          partido: x.candidato.partido,
          votos: x.votosEstadoNasCidadesDoEstadual,
          criterio: x.candidato.criterio
        })),
        topFederaisCapital: coVotingStats.slice(0, 12).map(x => ({
          nome: x.candidato.nome_urna,
          numero: x.candidato.numero,
          partido: x.candidato.partido,
          votos: x.votosCapitalNasUrnasDoEstadual,
          criterio: x.candidato.criterio
        })),
        matchedLocais,
        matchedBairros,
        matchedZonas
      };

      const res = await adminFetch('/api/causa-animal/ai-query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          contextData,
          conversationHistory: aiHistory.slice(-4).map(h => ([
            { role: 'user', text: h.question },
            { role: 'model', text: h.answer }
          ])).flat()
        })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro HTTP ${res.status}`);
      }

      const resData = await res.json();
      setAiHistory(prev => prev.map(item => item.id === tempId ? { ...item, answer: resData.answer || 'Nenhuma resposta gerada.' } : item));
    } catch (err: any) {
      console.error("Erro na consulta à IA:", err);
      setAiError(err.message || 'Erro ao comunicar com a IA');
      setAiHistory(prev => prev.map(item => item.id === tempId ? { ...item, answer: `❌ Ocorreu um erro ao consultar os dados eleitorais: ${err.message || 'Falha na comunicação'}. Por favor, verifique se a chave de IA está ativa e tente novamente.` } : item));
    } finally {
      setAiLoading(false);
    }
  };

  // Handle File Upload and Strict Validation
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportProgress('Lendo arquivo DADOS_COMPLETOS_IMPORTAR_NO_SITE.json (~14 MB)...');

    const reader = new FileReader();

    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        setImportProgress('Calculando checksum criptográfico SHA-256...');
        const checksum = await computeSHA256(content);

        setImportProgress('Fazendo parse estrutural do JSON...');
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch (parseErr: any) {
          setIsImporting(false);
          setImportStatusModal({
            show: true,
            type: 'error',
            title: 'Arquivo JSON Corrompido',
            message: 'O arquivo não é um JSON válido: ' + parseErr.message
          });
          return;
        }

        // Rejeição explícita do arquivo de amostra
        if (parsed.somente_amostra_de_estrutura === true) {
          setIsImporting(false);
          setImportStatusModal({
            show: true,
            type: 'error',
            title: 'Arquivo de Amostra Rejeitado',
            message: 'Este botão é reservado exclusivamente para a importação da base de dados completa oficial (DADOS_COMPLETOS_IMPORTAR_NO_SITE.json). O arquivo enviado é uma amostra com somente_amostra_de_estrutura=true e foi rejeitado para proteger a integridade dos dados.',
            errors: ['somente_amostra_de_estrutura: true detectado']
          });
          return;
        }

        if (parsed.versao !== 2 || parsed.dataset_id !== 'causa_animal_SP_2026_v2') {
          setIsImporting(false);
          setImportStatusModal({
            show: true,
            type: 'error',
            title: 'Incompatibilidade de Versão ou Dataset',
            message: `Versão esperada: 2, recebida: ${parsed.versao}. Dataset esperado: 'causa_animal_SP_2026_v2', recebido: '${parsed.dataset_id}'.`
          });
          return;
        }

        setImportProgress('Executando todas as 15 conferências oficiais de integridade e totais...');
        const validationReceipt = validateCausaAnimalDataset(parsed, checksum, file.size);

        if (!validationReceipt.valido) {
          setIsImporting(false);
          setImportStatusModal({
            show: true,
            type: 'error',
            title: 'Importação Bloqueada: Falha nas Conferências',
            message: 'O arquivo não passou em todas as validações obrigatórias. Por segurança atômica, a base publicada anterior foi mantida intacta.',
            receipt: validationReceipt,
            errors: validationReceipt.erros
          });
          return;
        }

        setImportProgress('Persistindo base oficial particionada no servidor...');
        let serverSaved = false;
        try {
          const res = await adminFetch('/api/causa-animal/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dataset: parsed, receipt: validationReceipt })
          });
          if (res.ok) {
            const resJson = await res.json();
            serverSaved = !!resJson.isPersistent;
          }
        } catch (serverErr) {
          console.warn("Falha ao salvar no servidor (será mantido localmente):", serverErr);
        }

        // Salvar também no IndexedDB para redundância local instantânea
        setImportProgress('Indexando no banco de dados local do navegador (IndexedDB)...');
        await saveCausaAnimalLocally(parsed, validationReceipt);

        // Atualizar estado da aplicação atomicamente
        setData(parsed);
        setReceipt(validationReceipt);
        setIsServerSynced(serverSaved);
        const importTime = new Date().toLocaleString('pt-BR');
        setLastUpdated(importTime);
        setIsImporting(false);

        setImportStatusModal({
          show: true,
          type: 'success',
          title: 'Base da Causa Animal SP 2026 Importada com Sucesso!',
          message: 'Todas as conferências de totais eleitorais, candidatos e reconciliações territoriais da Capital foram 100% aprovadas. A base está ativa e disponível.',
          receipt: validationReceipt
        });
      } catch (err: any) {
        setIsImporting(false);
        setImportStatusModal({
          show: true,
          type: 'error',
          title: 'Erro Inesperado na Importação',
          message: err.message || 'Ocorreu um erro durante o processamento do arquivo.'
        });
      } finally {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    };

    reader.readAsText(file);
  };

  const handleClearData = async () => {
    if (!window.confirm("Deseja realmente remover a base da causa animal (causa_animal_SP_2026_v2)? Os dados anteriores da versão 1 permanecerão intactos.")) {
      return;
    }
    try {
      await adminFetch('/api/causa-animal/clear', { method: 'DELETE' });
    } catch {}
    await clearCausaAnimalLocally();
    setData(null);
    setReceipt(null);
    setIsServerSynced(false);
    setLastUpdated(null);
    setImportStatusModal({
      show: true,
      type: 'success',
      title: 'Base Causa Animal Removida',
      message: 'A base causa_animal_SP_2026_v2 foi limpa do servidor e do navegador.'
    });
  };

  // Quick switch for comparison candidate
  const handleSelectRafael = () => {
    setSelectedCargo('deputado_estadual');
    if (rafaelCandidate) {
      setSelectedUniverse('candidato');
      setSelectedCandidateId(rafaelCandidate.id);
    }
  };

  const handleSelectNina = () => {
    setSelectedCargo('deputado_federal');
    if (ninaCandidate) {
      setSelectedUniverse('candidato');
      setSelectedCandidateId(ninaCandidate.id);
    }
  };

  // Reset page when filters change
  useEffect(() => {
    setSecaoPage(1);
  }, [activeTab, searchTerm, selectedCargo, selectedUniverse, selectedCandidateId, navZona, navLocalId, sortBy]);

  // -------------------------------------------------------------
  // Data processing for sub-tabs
  // -------------------------------------------------------------

  // 1. MUNICÍPIOS (645)
  const processedMunicipios = useMemo(() => {
    const raw = getRegistrosList(data?.bases?.municipios);
    if (raw.length === 0) return [];
    let list = [...raw];

    if (searchTerm.trim()) {
      const scored = list.map(m => {
        const top = getTopCandidatesForRecord(m);
        return {
          item: m,
          score: scoreSearchMatch([m.municipio, m.codigo_tse, top.topEst.cand?.nome_urna, top.topFed.cand?.nome_urna], searchTerm)
        };
      });

      list = scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (sortBy === 'top_est_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topEst.votos - topA.topEst.votos;
          }
          if (sortBy === 'top_fed_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topFed.votos - topA.topFed.votos;
          }
          const statsA = extractVotes(a.item);
          const statsB = extractVotes(b.item);
          if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
          if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
          if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
          return String(a.item.municipio || '').localeCompare(String(b.item.municipio || ''));
        })
        .map(s => s.item);
    } else {
      list.sort((a, b) => {
        if (sortBy === 'top_est_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topEst.votos - topA.topEst.votos;
        }
        if (sortBy === 'top_fed_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topFed.votos - topA.topFed.votos;
        }
        const statsA = extractVotes(a);
        const statsB = extractVotes(b);
        if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
        if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
        if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
        return String(a.municipio || '').localeCompare(String(b.municipio || ''));
      });
    }

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 2. ZONAS DA CAPITAL (57)
  const processedZonas = useMemo(() => {
    const raw = getRegistrosList(data?.bases?.zonas);
    if (raw.length === 0) return [];
    let list = [...raw];

    if (searchTerm.trim()) {
      const scored = list.map(z => {
        const top = getTopCandidatesForRecord(z);
        return {
          item: z,
          score: scoreSearchMatch([z.nome, z.zona, z.nome_da_zona, z.nome_da_zona_regiao, z.zona_eleitoral, top.topEst.cand?.nome_urna, top.topFed.cand?.nome_urna], searchTerm)
        };
      });

      list = scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (sortBy === 'top_est_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topEst.votos - topA.topEst.votos;
          }
          if (sortBy === 'top_fed_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topFed.votos - topA.topFed.votos;
          }
          const statsA = extractVotes(a.item);
          const statsB = extractVotes(b.item);
          if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
          if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
          if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
          return String(a.item.nome || a.item.zona || '').localeCompare(String(b.item.nome || b.item.zona || ''));
        })
        .map(s => s.item);
    } else {
      list.sort((a, b) => {
        if (sortBy === 'top_est_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topEst.votos - topA.topEst.votos;
        }
        if (sortBy === 'top_fed_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topFed.votos - topA.topFed.votos;
        }
        const statsA = extractVotes(a);
        const statsB = extractVotes(b);
        if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
        if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
        if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
        return String(a.nome || a.zona || '').localeCompare(String(b.nome || b.zona || ''));
      });
    }

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 3. BAIRROS DOS LOCAIS (899)
  const processedBairros = useMemo(() => {
    const raw = getRegistrosList(data?.bases?.bairros);
    if (raw.length === 0) return [];
    let list = [...raw];

    if (searchTerm.trim()) {
      const scored = list.map(b => {
        const top = getTopCandidatesForRecord(b);
        return {
          item: b,
          score: scoreSearchMatch([b.bairro, b.bairro_do_local, b.bairro_cadastrado_do_local, top.topEst.cand?.nome_urna, top.topFed.cand?.nome_urna], searchTerm)
        };
      });

      list = scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (sortBy === 'top_est_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topEst.votos - topA.topEst.votos;
          }
          if (sortBy === 'top_fed_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topFed.votos - topA.topFed.votos;
          }
          const statsA = extractVotes(a.item);
          const statsB = extractVotes(b.item);
          if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
          if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
          if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
          return String(a.item.bairro || '').localeCompare(String(b.item.bairro || ''));
        })
        .map(s => s.item);
    } else {
      list.sort((a, b) => {
        if (sortBy === 'top_est_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topEst.votos - topA.topEst.votos;
        }
        if (sortBy === 'top_fed_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topFed.votos - topA.topFed.votos;
        }
        const statsA = extractVotes(a);
        const statsB = extractVotes(b);
        if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
        if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
        if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
        return String(a.bairro || '').localeCompare(String(b.bairro || ''));
      });
    }

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 4. LOCAIS DE VOTAÇÃO (2.057)
  const processedLocais = useMemo(() => {
    const raw = getRegistrosList(data?.bases?.locais);
    if (raw.length === 0) return [];
    let list = [...raw];

    if (navZona) {
      const padZ = navZona.padStart(4, '0');
      list = list.filter(l => String(l.zona).padStart(4, '0') === padZ);
    }

    if (searchTerm.trim()) {
      const scored = list.map(l => {
        const top = getTopCandidatesForRecord(l);
        const score = scoreSearchMatch({
          primary: [
            l.nome,
            l.escola_local_de_votacao,
            l.local,
            l.escola,
            l.nome_local,
            l.nome_do_local,
            l.local_votacao,
            l.nm_local_votacao,
            l.nm_escola,
            l.denominacao
          ],
          secondary: [
            l.endereco,
            l.endereco_do_local,
            l.logradouro,
            l.rua,
            l.bairro,
            l.bairro_do_local,
            l.bairro_cadastrado_do_local,
            top.topEst.cand?.nome_urna,
            top.topFed.cand?.nome_urna
          ],
          tertiary: [
            l.zona,
            l.nome_da_zona,
            l.codigo_do_local,
            l.codigo_tse,
            l.local_id,
            l.numero_local
          ]
        }, searchTerm);
        return { item: l, score };
      });

      list = scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (sortBy === 'top_est_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topEst.votos - topA.topEst.votos;
          }
          if (sortBy === 'top_fed_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topFed.votos - topA.topFed.votos;
          }
          const statsA = extractVotes(a.item);
          const statsB = extractVotes(b.item);
          if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
          if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
          if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
          return String(a.item.nome || '').localeCompare(String(b.item.nome || ''));
        })
        .map(s => s.item);
    } else {
      list.sort((a, b) => {
        if (sortBy === 'top_est_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topEst.votos - topA.topEst.votos;
        }
        if (sortBy === 'top_fed_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topFed.votos - topA.topFed.votos;
        }
        const statsA = extractVotes(a);
        const statsB = extractVotes(b);
        if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
        if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
        if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
        return String(a.nome || '').localeCompare(String(b.nome || ''));
      });
    }

    return list;
  }, [data, navZona, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 5. SEÇÕES ELEITORAIS (26.683) - Virtualized / Paginated
  const processedSecoes = useMemo(() => {
    const raw = getRegistrosList(data?.bases?.secoes);
    if (raw.length === 0) return [];
    let list = [...raw];

    if (navZona) {
      const padZ = navZona.padStart(4, '0');
      list = list.filter(s => String(s.zona).padStart(4, '0') === padZ);
    }

    if (navLocalId) {
      list = list.filter(s => s.local_id === navLocalId);
    }

    if (searchTerm.trim()) {
      const scored = list.map(s => {
        const local = locaisMap.get(s.local_id || `${s.zona}:${s.local}`);
        const top = getTopCandidatesForRecord(s);
        const score = scoreSearchMatch({
          primary: [
            local?.nome,
            s.escola,
            s.nome_local,
            s.secao
          ],
          secondary: [
            s.bairro,
            s.endereco,
            local?.bairro,
            local?.endereco,
            top.topEst.cand?.nome_urna,
            top.topFed.cand?.nome_urna
          ],
          tertiary: [
            s.zona,
            s.local_id,
            s.local
          ]
        }, searchTerm);
        return { item: s, score };
      });

      list = scored
        .filter(s => s.score > 0)
        .sort((a, b) => {
          if (b.score !== a.score) return b.score - a.score;
          if (sortBy === 'top_est_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topEst.votos - topA.topEst.votos;
          }
          if (sortBy === 'top_fed_desc') {
            const topA = getTopCandidatesForRecord(a.item);
            const topB = getTopCandidatesForRecord(b.item);
            return topB.topFed.votos - topA.topFed.votos;
          }
          const statsA = extractVotes(a.item);
          const statsB = extractVotes(b.item);
          if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
          if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
          if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
          return String(a.item.secao || '').localeCompare(String(b.item.secao || ''));
        })
        .map(s => s.item);
    } else {
      list.sort((a, b) => {
        if (sortBy === 'top_est_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topEst.votos - topA.topEst.votos;
        }
        if (sortBy === 'top_fed_desc') {
          const topA = getTopCandidatesForRecord(a);
          const topB = getTopCandidatesForRecord(b);
          return topB.topFed.votos - topA.topFed.votos;
        }
        const statsA = extractVotes(a);
        const statsB = extractVotes(b);
        if (sortBy === 'votos_desc') return statsB.votos - statsA.votos;
        if (sortBy === 'validos_desc') return (statsB.pctValidos || 0) - (statsA.pctValidos || 0);
        if (sortBy === 'aptos_desc') return (statsB.pctAptos || 0) - (statsA.pctAptos || 0);
        return String(a.secao || '').localeCompare(String(b.secao || ''));
      });
    }

    return list;
  }, [data, navZona, navLocalId, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId, locaisMap]);

  // Resumos de liderança calculados para cada nível territorial
  const municipiosLeadership = useMemo(() => {
    return computeLeadershipSummary(getRegistrosList(data?.bases?.municipios));
  }, [data, selectedUniverse, criteriaIndices]);

  const zonasLeadership = useMemo(() => {
    return computeLeadershipSummary(getRegistrosList(data?.bases?.zonas));
  }, [data, selectedUniverse, criteriaIndices]);

  const bairrosLeadership = useMemo(() => {
    return computeLeadershipSummary(getRegistrosList(data?.bases?.bairros));
  }, [data, selectedUniverse, criteriaIndices]);

  const locaisLeadership = useMemo(() => {
    return computeLeadershipSummary(getRegistrosList(data?.bases?.locais));
  }, [data, selectedUniverse, criteriaIndices]);

  const secoesLeadership = useMemo(() => {
    if (activeTab !== 'secoes') return { topEstLeaders: [], topFedLeaders: [], totalRecords: 0 };
    return computeLeadershipSummary(getRegistrosList(data?.bases?.secoes));
  }, [data, selectedUniverse, criteriaIndices, activeTab]);

  // Paginated seções slice
  const paginatedSecoes = useMemo(() => {
    const start = (secaoPage - 1) * secaoPageSize;
    return processedSecoes.slice(start, start + secaoPageSize);
  }, [processedSecoes, secaoPage, secaoPageSize]);

  const totalSecaoPages = Math.ceil(processedSecoes.length / secaoPageSize) || 1;

  // Aggregated totals of current view
  // Rule: Percentuais agregados usam soma dos numeradores dividida pela soma dos denominadores!
  const currentViewAggregates = useMemo(() => {
    let activeList: TerritorialRecord[] = [];
    if (activeTab === 'municipios') activeList = processedMunicipios;
    else if (activeTab === 'zonas') activeList = processedZonas;
    else if (activeTab === 'bairros') activeList = processedBairros;
    else if (activeTab === 'locais') activeList = processedLocais;
    else if (activeTab === 'secoes') activeList = processedSecoes;

    let sumVotos = 0;
    let sumValidos = 0;
    let sumAptos = 0;

    activeList.forEach(r => {
      const stats = extractVotes(r);
      sumVotos += stats.votos;
      sumValidos += stats.validos;
      sumAptos += stats.aptos;
    });

    const aggregatePctValidos = sumValidos > 0 ? sumVotos / sumValidos : null;
    const aggregatePctAptos = sumAptos > 0 ? sumVotos / sumAptos : null;

    return {
      count: activeList.length,
      sumVotos,
      sumValidos,
      sumAptos,
      aggregatePctValidos,
      aggregatePctAptos
    };
  }, [activeTab, processedMunicipios, processedZonas, processedBairros, processedLocais, processedSecoes, selectedCargo, selectedUniverse, selectedCandidateId]);

  // Helper para renderizar cartão de liderança territorial no recorte
  const renderLeadershipCard = (
    title: string,
    entityName: string,
    leadership: { topEstLeaders: any[]; topFedLeaders: any[]; totalRecords: number }
  ) => {
    if (!leadership.totalRecords || (leadership.topEstLeaders.length === 0 && leadership.topFedLeaders.length === 0)) return null;
    return (
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white p-4 rounded-2xl border border-slate-700 shadow-sm space-y-3 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-2 border-b border-slate-700/60 pb-2">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-black uppercase tracking-wider text-amber-300">
              {title} ({formatNumber(leadership.totalRecords)} {entityName})
            </h4>
          </div>
          <div className="text-[11px] text-slate-300">
            Líderes no recorte ativo: <strong className="text-white">{selectedUniverse === 'criterio_atuacao' ? 'Atuação Documentada' : selectedUniverse === 'criterio_adesao' ? 'Adesão Pública' : selectedUniverse === 'criterio_urna' ? 'Nome na Urna' : selectedUniverse === 'universo_a' ? 'Universo A' : selectedUniverse === 'universo_b' ? 'Universo B' : 'Recorte Anterior'}</strong>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Líderes Estaduais */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-blue-500/20">
            <div className="text-[11px] font-bold text-blue-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>🏆 Deputado Estadual com mais 1º Lugares:</span>
              <span className="text-[10px] text-slate-400">Clique para filtrar</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {leadership.topEstLeaders.slice(0, 4).map((item, idx) => (
                <button
                  key={item.cand.id}
                  onClick={() => setSearchTerm(item.cand.nome_urna)}
                  className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 border border-blue-400/30 rounded-lg text-left transition-all cursor-pointer flex items-center gap-1.5"
                  title={`Filtrar ${entityName} onde ${item.cand.nome_urna} foi o mais votado`}
                >
                  <span className="font-bold text-amber-300 font-mono text-[11px]">#{idx + 1}</span>
                  <span className="font-bold text-white text-[11px]">{item.cand.nome_urna}</span>
                  <span className="px-1.5 py-0.2 bg-blue-500/20 text-blue-300 rounded text-[10px] font-mono font-bold">
                    {formatNumber(item.wins)} {entityName} ({formatPct(item.wins / leadership.totalRecords, 1)})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Líderes Federais */}
          <div className="bg-slate-800/80 p-3 rounded-xl border border-purple-500/20">
            <div className="text-[11px] font-bold text-purple-400 uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>🏆 Deputado Federal com mais 1º Lugares:</span>
              <span className="text-[10px] text-slate-400">Clique para filtrar</span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {leadership.topFedLeaders.slice(0, 4).map((item, idx) => (
                <button
                  key={item.cand.id}
                  onClick={() => setSearchTerm(item.cand.nome_urna)}
                  className="px-2.5 py-1 bg-purple-950/80 hover:bg-purple-900 border border-purple-400/30 rounded-lg text-left transition-all cursor-pointer flex items-center gap-1.5"
                  title={`Filtrar ${entityName} onde ${item.cand.nome_urna} foi o mais votado`}
                >
                  <span className="font-bold text-amber-300 font-mono text-[11px]">#{idx + 1}</span>
                  <span className="font-bold text-white text-[11px]">{item.cand.nome_urna}</span>
                  <span className="px-1.5 py-0.2 bg-purple-500/20 text-purple-300 rounded text-[10px] font-mono font-bold">
                    {formatNumber(item.wins)} {entityName} ({formatPct(item.wins / leadership.totalRecords, 1)})
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const copyAiAnswer = (id: string, text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text);
      setAiCopiedId(id);
      setTimeout(() => setAiCopiedId(null), 2500);
    }
  };

  const AI_SUGGESTIONS = [
    "Quem mais pontuou nas cidades onde o Rafael Saraiva teve votos?",
    "Felipe Becari vs Delegado Bruno Lima: quem teve mais votos?",
    "Qual a diferença entre a votação na Capital e no Estado todo de SP?",
    "Por que a soma dos federais dá mais votos do que o Rafael teve?",
    "Como foi o desempenho de Nina Passadore (4407) na dobradinha?",
    "Em quantas cidades Becari e Paiol tiveram votos equivalentes?",
    "Qual foi a votação dos candidatos da causa animal em Indaiatuba e Campinas?",
    "Qual a zona eleitoral de maior votação de Rafael Saraiva na Capital?"
  ];

  const renderAiMarkdown = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableRows: string[] = [];
    let inTable = false;

    const parseCells = (row: string) =>
      row.split('|').map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);

    const formatInlineMarkdown = (str: string): React.ReactNode => {
      const parts = str.split(/(\*\*.*?\*\*)/g);
      return parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return <strong key={idx} className="font-black text-purple-950">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`')) {
          return <code key={idx} className="px-1.5 py-0.5 rounded bg-purple-100 font-mono text-[11px] text-purple-900">{part.slice(1, -1)}</code>;
        }
        return part;
      });
    };

    const flushTable = (keyPrefix: number) => {
      if (tableRows.length === 0) return null;
      const headerRow = tableRows[0];
      const dataRows = tableRows.slice(1).filter(r => !r.includes('---'));
      const headers = parseCells(headerRow);

      const tableNode = (
        <div key={`table-${keyPrefix}`} className="overflow-x-auto my-3 border border-purple-200/80 rounded-xl shadow-2xs">
          <table className="w-full text-left text-xs border-collapse">
            {headers.length > 0 && (
              <thead className="bg-purple-100/60 border-b border-purple-200 text-purple-950 font-black uppercase text-[10px]">
                <tr>
                  {headers.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-purple-100/60 bg-white">
              {dataRows.map((r, rIdx) => {
                const cells = parseCells(r);
                return (
                  <tr key={rIdx} className="hover:bg-purple-50/40 transition-colors">
                    {cells.map((c, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-gray-800 font-medium">
                        {formatInlineMarkdown(c)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
      return tableNode;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        inTable = true;
        tableRows.push(trimmed);
        continue;
      } else if (inTable) {
        const tableElem = flushTable(i);
        if (tableElem) elements.push(tableElem);
      }

      if (!trimmed) {
        elements.push(<div key={`sp-${i}`} className="h-1.5" />);
        continue;
      }

      if (trimmed.startsWith('### ')) {
        elements.push(
          <h4 key={`h3-${i}`} className="text-sm font-black text-purple-950 uppercase tracking-tight mt-3 mb-1">
            {formatInlineMarkdown(trimmed.replace('### ', ''))}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        elements.push(
          <h3 key={`h2-${i}`} className="text-base font-black text-purple-950 uppercase tracking-tight mt-4 mb-1">
            {formatInlineMarkdown(trimmed.replace('## ', ''))}
          </h3>
        );
      } else if (trimmed.startsWith('---')) {
        elements.push(<hr key={`hr-${i}`} className="border-t border-purple-100 my-2.5" />);
      } else if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
        elements.push(
          <div key={`li-${i}`} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed pl-2 my-0.5">
            <span className="text-purple-600 font-black mt-0.5">•</span>
            <div className="flex-1">{formatInlineMarkdown(trimmed.replace(/^(\*|-)\s+/, ''))}</div>
          </div>
        );
      } else if (/^\d+\.\s/.test(trimmed)) {
        const num = trimmed.match(/^(\d+)\.\s/)?.[1] || '•';
        elements.push(
          <div key={`num-${i}`} className="flex items-start gap-2 text-xs text-gray-700 leading-relaxed pl-2 my-1">
            <span className="px-1.5 py-0.2 rounded bg-purple-100 text-purple-900 font-black text-[10px] font-mono mt-0.5">{num}</span>
            <div className="flex-1">{formatInlineMarkdown(trimmed.replace(/^\d+\.\s+/, ''))}</div>
          </div>
        );
      } else {
        elements.push(
          <p key={`p-${i}`} className="text-xs text-gray-700 leading-relaxed my-1">
            {formatInlineMarkdown(line)}
          </p>
        );
      }
    }

    if (inTable && tableRows.length > 0) {
      const tableElem = flushTable(lines.length);
      if (tableElem) elements.push(tableElem);
    }

    return elements;
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json"
        className="hidden"
      />

      {/* Header do Dataset Causa Animal SP 2026 v2 */}
      <div className="bg-gradient-to-r from-[#102b31] via-[#163840] to-[#102b31] text-white p-5 sm:p-6 rounded-3xl shadow-lg border border-teal-900/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-radial from-amber-400/10 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-400 text-slate-950 flex items-center gap-1 shadow-sm">
                <PawPrint className="w-3.5 h-3.5" /> Pauta Animalista SP 2026
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/10 text-white border border-white/20">
                dataset_id: causa_animal_SP_2026_v2
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-500/20 text-teal-300 border border-teal-500/30">
                versao=2 (1º Turno)
              </span>
              {data && (
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border flex items-center gap-1 ${
                  isServerSynced
                    ? 'bg-green-500/20 text-green-300 border-green-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  <ShieldCheck className="w-3 h-3" />
                  {isServerSynced ? 'Sincronizado no Servidor' : 'Sessão Local (IndexedDB)'}
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white flex items-center gap-2">
              Visualização Descritiva dos Votos da Pauta Animal
            </h2>
            <p className="text-xs sm:text-sm text-gray-300 max-w-3xl leading-relaxed">
              Consolidação analítica das candidaturas associadas à proteção animal no Estado de São Paulo. Dados descritivos oficiais apurados por município, zona, local, bairro cadastrado e seção eleitoral.
            </p>
          </div>

          {/* Botões de Ação do Header */}
          <div className="flex flex-wrap items-center gap-2 self-stretch lg:self-auto">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
              className="flex-1 lg:flex-none px-4 py-3 bg-amber-400 hover:bg-amber-300 active:bg-amber-500 text-slate-950 font-black uppercase tracking-wider text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isImporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4" />
                  <span>Importar dados da causa animal (.json)</span>
                </>
              )}
            </button>

            {receipt && (
              <button
                onClick={() => setShowReceiptModal(true)}
                className="px-3.5 py-3 bg-white/10 hover:bg-white/20 active:bg-white/30 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1.5 cursor-pointer border border-white/15"
                title="Ver Recibo Oficial de Importação e Validações"
              >
                <FileCheck2 className="w-4 h-4 text-amber-400" />
                <span>Recibo Oficial</span>
              </button>
            )}

            {data && (
              <button
                onClick={handleClearData}
                className="p-3 bg-red-500/20 hover:bg-red-500/30 text-red-300 rounded-xl transition-all border border-red-500/30 cursor-pointer"
                title="Limpar Base Causa Animal"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Barra de Progresso de Importação em Tempo Real */}
        {isImporting && (
          <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-amber-300">
              <span className="flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                {importProgress}
              </span>
              <span>Processando ~14 MB...</span>
            </div>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-amber-400 animate-pulse rounded-full w-full" />
            </div>
          </div>
        )}
      </div>

      {/* Alerta caso nenhuma base tenha sido importada */}
      {!data && !loading && (
        <div className="bg-white p-8 rounded-3xl border border-gray-200 shadow-sm text-center max-w-2xl mx-auto space-y-4">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl mx-auto flex items-center justify-center">
            <PawPrint className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase text-dark">Nenhuma base da Causa Animal v2 carregada</h3>
            <p className="text-xs sm:text-sm text-gray-500">
              Clique em <strong>“Importar dados da causa animal”</strong> acima e selecione o arquivo oficial <code>DADOS_COMPLETOS_IMPORTAR_NO_SITE.json</code> (~14 MB).
            </p>
          </div>
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-100 text-left text-xs text-gray-600 space-y-2">
            <div className="font-bold text-dark flex items-center gap-1.5">
              <Info className="w-4 h-4 text-primary" />
              Garantias e Regras de Validação Automática:
            </div>
            <ul className="list-disc pl-5 space-y-1">
              <li>Valida 58 candidaturas da causa animal (28 estaduais e 30 federais).</li>
              <li>Confere as 5 bases: 645 municípios, 57 zonas, 2.057 locais, 899 bairros e 26.683 seções.</li>
              <li>Reconciliação exata da Capital (Zonas = Locais = Bairros = Seções = TSE 71072).</li>
              <li>Conferência estrita dos totais de Rafael Saraiva (105.174 SP, 32.407 Capital) e Nina Passadore (26.290 SP, 7.149 Capital).</li>
              <li>Rejeição automática de arquivos de amostra para proteger a base publicada.</li>
            </ul>
          </div>
        </div>
      )}

      {data && (
        <>
          {/* PAINEL DE CONTROLE DE FILTROS SUPERIORES */}
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              
              {/* Seleção de Cargo */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                  <Vote className="w-3.5 h-3.5 text-primary" />
                  Cargo Eleitoral
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-gray-100 p-1 rounded-xl">
                  <button
                    onClick={() => { setSelectedCargo('deputado_estadual'); setSelectedCandidateId(''); }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedCargo === 'deputado_estadual'
                        ? 'bg-primary text-white shadow-xs'
                        : 'text-gray-600 hover:text-dark'
                    }`}
                  >
                    Dep. Estadual (28)
                  </button>
                  <button
                    onClick={() => { setSelectedCargo('deputado_federal'); setSelectedCandidateId(''); }}
                    className={`py-2 px-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                      selectedCargo === 'deputado_federal'
                        ? 'bg-purple-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-dark'
                    }`}
                  >
                    Dep. Federal (30)
                  </button>
                </div>
              </div>

              {/* Seleção de Universo / Critério Analítico */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-amber-600" />
                  Critério / Universo Analítico
                </label>
                <select
                  value={selectedUniverse}
                  onChange={(e) => {
                    const u = e.target.value as UniverseType;
                    setSelectedUniverse(u);
                    if (u !== 'candidato') setSelectedCandidateId('');
                  }}
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-xl text-xs font-bold text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none"
                >
                  <optgroup label="Critérios Separados (Isolados)">
                    <option value="criterio_atuacao">Critério: Atuação/Campanha Animal Documentada</option>
                    <option value="criterio_adesao">Critério: Adesão Pública à Pauta Animalista 2026</option>
                    <option value="criterio_urna">Critério: Referência Explícita no Nome de Urna</option>
                  </optgroup>
                  <optgroup label="Universos Consolidados (Agregados)">
                    <option value="universo_a">Universo A (Consolidado: Atuação ou Adesão)</option>
                    <option value="universo_b">Universo B (Consolidado Geral: A + Urna)</option>
                    <option value="recorte_anterior">Recorte Anterior (Histórico dos 25 Nomes)</option>
                  </optgroup>
                  <optgroup label="Consulta Individual">
                    <option value="candidato">Candidato Individual...</option>
                  </optgroup>
                </select>
              </div>

              {/* Seleção de Candidato Específico (quando Universo = candidato) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600" />
                  Candidato(a) Selecionado(a)
                </label>
                <select
                  value={selectedCandidateId}
                  onChange={(e) => {
                    setSelectedCandidateId(e.target.value);
                    if (e.target.value) setSelectedUniverse('candidato');
                  }}
                  className={`w-full px-3 py-2.5 bg-white border rounded-xl text-xs font-bold text-dark focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none ${
                    selectedUniverse === 'candidato' ? 'border-primary ring-1 ring-primary/20' : 'border-gray-200'
                  }`}
                >
                  <option value="">— Selecione um candidato ({currentCandidates.length}) —</option>
                  {currentCandidates.map(c => {
                    const critType = getCandidateCriterion(c);
                    const tag = critType === 'adesao' ? 'Adesão Pública' : critType === 'urna' ? 'Nome na Urna' : 'Atuação Documentada';
                    return (
                      <option key={c.id} value={c.id}>
                        {c.numero} - {c.nome_urna} ({c.partido}) [{tag}]
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* Atalhos Rápidos para Rafael Saraiva e Nina Passadore */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1.5 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  Comparação Específica
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleSelectRafael}
                    className={`py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                      selectedCargo === 'deputado_estadual' && activeCandidate?.id === rafaelCandidate?.id
                        ? 'bg-amber-400 text-slate-950 border-amber-500 shadow-sm font-black'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                    title="Rafael Saraiva: 105.174 no estado, 32.407 na capital"
                  >
                    <span>Rafael Saraiva</span>
                  </button>
                  <button
                    onClick={handleSelectNina}
                    className={`py-2 px-2 text-[11px] font-black rounded-xl transition-all cursor-pointer border flex items-center justify-center gap-1 ${
                      selectedCargo === 'deputado_federal' && activeCandidate?.id === ninaCandidate?.id
                        ? 'bg-purple-600 text-white border-purple-700 shadow-sm font-black'
                        : 'bg-purple-50 text-purple-900 border-purple-200 hover:bg-purple-100'
                    }`}
                    title="Nina Passadore: 26.290 no estado, 7.149 na capital"
                  >
                    <span>Nina Passadore</span>
                  </button>
                </div>
              </div>

            </div>

            {/* Banner Informativo do Filtro Ativo */}
            <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-bold text-gray-500">Recorte em Exibição:</span>
                <span className="px-2.5 py-1 rounded-lg font-black bg-blue-50 text-primary border border-blue-100">
                  {selectedCargo === 'deputado_estadual' ? 'Deputado Estadual (SP)' : 'Deputado Federal (SP)'}
                </span>
                <span className="px-2.5 py-1 rounded-lg font-bold bg-amber-50 text-amber-900 border border-amber-200">
                  {selectedUniverse === 'candidato' && activeCandidate
                    ? `${activeCandidate.nome_urna} (${activeCandidate.numero} - ${activeCandidate.partido})`
                    : selectedUniverse === 'criterio_atuacao'
                    ? 'Critério: Atuação/Campanha Animal Documentada (Separado)'
                    : selectedUniverse === 'criterio_adesao'
                    ? 'Critério: Adesão Pública à Pauta Animalista 2026 (Separado)'
                    : selectedUniverse === 'criterio_urna'
                    ? 'Critério: Referência Explícita no Nome de Urna (Separado)'
                    : selectedUniverse === 'universo_a'
                    ? 'Universo A (Consolidado: Atuação ou Adesão)'
                    : selectedUniverse === 'universo_b'
                    ? 'Universo B (Consolidado Geral: A + Urna)'
                    : 'Recorte Anterior (Histórico dos 25 Nomes)'}
                </span>
                {activeCandidate && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    getCandidateCriterion(activeCandidate) === 'adesao'
                      ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                      : getCandidateCriterion(activeCandidate) === 'urna'
                      ? 'bg-amber-100 text-amber-800 border border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}>
                    Critério: {getCandidateCriterionLabel(activeCandidate)}
                  </span>
                )}
              </div>

              {/* Totais Agregados do Recorte da Tela */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div>
                  <span className="text-gray-400 mr-1.5">Votos no Recorte:</span>
                  <span className="font-black text-dark text-sm">{formatNumber(currentViewAggregates.sumVotos)}</span>
                </div>
                <div>
                  <span className="text-gray-400 mr-1.5">% Válidos:</span>
                  <span className="font-black text-primary text-sm">
                    {formatPct(currentViewAggregates.aggregatePctValidos)}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({formatNumber(currentViewAggregates.sumVotos)} / {formatNumber(currentViewAggregates.sumValidos)})
                  </span>
                </div>
                <div className="hidden sm:block">
                  <span className="text-gray-400 mr-1.5">% Eleitorado:</span>
                  <span className="font-black text-emerald-600 text-sm">
                    {formatPct(currentViewAggregates.aggregatePctAptos)}
                  </span>
                  <span className="text-[10px] text-gray-400 ml-1">
                    ({formatNumber(currentViewAggregates.sumVotos)} / {formatNumber(currentViewAggregates.sumAptos)})
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* NAVEGAÇÃO DE SUB-ABAS TERRITORIAIS */}
          <div className="flex flex-wrap items-center gap-2 border-b border-gray-200 pb-2">
            {[
              { id: 'municipios' as SubTabV2, label: 'Municípios SP (645)', icon: Building2 },
              { id: 'zonas' as SubTabV2, label: 'Zonas Capital (57)', icon: MapPin },
              { id: 'bairros' as SubTabV2, label: 'Bairros dos Locais (899)', icon: School },
              { id: 'locais' as SubTabV2, label: 'Locais de Votação (2.057)', icon: School },
              { id: 'secoes' as SubTabV2, label: 'Seções Eleitorais (26.683)', icon: Vote },
              { id: 'candidatos' as SubTabV2, label: 'Cadastro de Candidatos (58)', icon: Users },
              { id: 'cruzamentos' as SubTabV2, label: 'Cruzamento Federal x Estadual', icon: ArrowUpDown },
              { id: 'estrategia' as SubTabV2, label: 'Sugestão Estratégica & Expansão', icon: Target },
              { id: 'metodologia' as SubTabV2, label: 'Metodologia & Regras', icon: BookOpen },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id);
                    setSearchTerm('');
                  }}
                  className={`px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-dark text-white shadow-md'
                      : 'bg-white text-gray-600 hover:text-dark hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-gray-400'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* BARRA DE BUSCA E ORDENAÇÃO */}
          {activeTab !== 'metodologia' && activeTab !== 'candidatos' && activeTab !== 'cruzamentos' && (
            <div className="bg-white p-3.5 rounded-2xl border border-gray-200 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder={
                    activeTab === 'municipios'
                      ? 'Buscar município por nome ou código TSE...'
                      : activeTab === 'zonas'
                      ? 'Buscar zona por número ou nome...'
                      : activeTab === 'bairros'
                      ? 'Buscar rótulo do bairro do local...'
                      : activeTab === 'locais'
                      ? 'Buscar local por nome da escola, bairro, endereço ou zona...'
                      : 'Buscar seção por 4 dígitos (ex: 0001, 0124), local_id ou escola...'
                  }
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:border-primary outline-none"
                />
              </div>

              {/* Filtro de Hierarquia da Capital (Zona -> Local) */}
              {(activeTab === 'locais' || activeTab === 'secoes') && (
                <div className="flex items-center gap-2">
                  <select
                    value={navZona}
                    onChange={(e) => {
                      setNavZona(e.target.value);
                      setNavLocalId('');
                    }}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-dark outline-none"
                  >
                    <option value="">Todas as 57 Zonas</option>
                    {data.bases.zonas.registros.map(z => (
                      <option key={z.zona} value={z.zona}>
                        Zona {z.zona} - {z.nome || 'Capital'}
                      </option>
                    ))}
                  </select>

                  {activeTab === 'secoes' && (
                    <select
                      value={navLocalId}
                      onChange={(e) => setNavLocalId(e.target.value)}
                      className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-dark outline-none max-w-xs truncate"
                    >
                      <option value="">Todos os Locais ({locaisMap.size})</option>
                      {Array.from(locaisMap.values())
                        .filter(l => !navZona || String(l.zona).padStart(4, '0') === navZona.padStart(4, '0'))
                        .map(l => (
                          <option key={l.local_id || `${l.zona}:${l.local}`} value={l.local_id || `${l.zona}:${l.local}`}>
                            {l.zona}:{l.local || l.numero_local} - {l.nome} ({l.bairro})
                          </option>
                        ))}
                    </select>
                  )}

                  {(navZona || navLocalId) && (
                    <button
                      onClick={() => { setNavZona(''); setNavLocalId(''); }}
                      className="p-2 text-xs font-bold text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100"
                      title="Limpar filtro de zona/local"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )}

              {/* Ordenação Descritiva */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1">
                  <ArrowUpDown className="w-3.5 h-3.5" /> Ordenar:
                </span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-dark outline-none"
                >
                  <option value="votos_desc">Maior Volume de Votos no Recorte</option>
                  <option value="top_est_desc">Maior Votação do Líder Estadual</option>
                  <option value="top_fed_desc">Maior Votação do Líder Federal</option>
                  <option value="validos_desc">Maior % dos Votos Válidos</option>
                  <option value="aptos_desc">Maior % do Eleitorado Apto</option>
                  <option value="nome_asc">Nome Alfabético</option>
                </select>
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* ABA 1: MUNICÍPIOS (645) */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === 'municipios' && (
            <div className="space-y-4">
              {renderLeadershipCard('Liderança nos Municípios Paulistas', 'cidades', municipiosLeadership)}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="font-bold text-dark">
                  Mostrando {processedMunicipios.length} de 645 municípios de São Paulo
                </div>
                <div className="text-gray-500 text-[11px]">
                  Eleitorado Estadual: <strong>34.081.699</strong> | Válidos: <strong>{selectedCargo === 'deputado_estadual' ? '23.290.014' : '23.674.188'}</strong>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-14">#</th>
                      <th className="py-3 px-3">Código TSE</th>
                      <th className="py-3 px-4">Município</th>
                      <th className="py-3 px-3 text-right">Votos no Recorte</th>
                      <th className="py-3 px-3 text-right">% Válidos</th>
                      <th className="py-3 px-3 text-right">% Eleitorado</th>
                      <th className="py-3 px-3">Mais Votado Estadual (no Recorte)</th>
                      <th className="py-3 px-3">Mais Votado Federal (no Recorte)</th>
                      <th className="py-3 px-3 text-right">Eleitores Aptos</th>
                      <th className="py-3 px-3 text-right">Votos Válidos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {processedMunicipios.map((m, idx) => {
                      const stats = extractVotes(m);
                      const isCapital = String(m.codigo_tse) === '71072';
                      const top = getTopCandidatesForRecord(m);
                      return (
                        <tr
                          key={m.codigo_tse || idx}
                          className={`hover:bg-blue-50/40 transition-colors ${isCapital ? 'bg-amber-50/30 font-bold' : ''}`}
                        >
                          <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono text-gray-600">{m.codigo_tse}</td>
                          <td className="py-3 px-4 text-dark font-bold flex items-center gap-2">
                            <span>{m.municipio || m.nome}</span>
                            {isCapital && (
                              <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">
                                CAPITAL
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right font-black text-dark font-mono text-sm">
                            {formatNumber(stats.votos)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-primary font-mono">{formatPct(stats.pctValidos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.validos)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-emerald-600 font-mono">{formatPct(stats.pctAptos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.aptos)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {top.topEst.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-900 text-[11px] truncate max-w-[170px]" title={top.topEst.cand.nome_urna}>
                                  {top.topEst.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-blue-700 font-mono font-bold">
                                  {formatNumber(top.topEst.votos)} votos ({top.topEst.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {top.topFed.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-purple-900 text-[11px] truncate max-w-[170px]" title={top.topFed.cand.nome_urna}>
                                  {top.topFed.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-purple-700 font-mono font-bold">
                                  {formatNumber(top.topFed.votos)} votos ({top.topFed.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.aptos)}</td>
                          <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.validos)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* ABA 2: ZONAS DA CAPITAL (57) */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'zonas' && (
          <div className="space-y-4">
            {renderLeadershipCard('Liderança nas 57 Zonas Eleitorais da Capital', 'zonas', zonasLeadership)}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="font-bold text-dark">
                  Mostrando {processedZonas.length} de 57 zonas eleitorais da Capital (São Paulo - TSE 71072)
                </div>
                <div className="text-gray-500 text-[11px]">
                  Clique em <strong>“Ver Locais”</strong> para navegar diretamente para os locais da zona.
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-14">#</th>
                      <th className="py-3 px-3">Zona Eleitoral</th>
                      <th className="py-3 px-3">Nome / Região</th>
                      <th className="py-3 px-3 text-right">Votos no Recorte</th>
                      <th className="py-3 px-3 text-right">% Válidos</th>
                      <th className="py-3 px-3 text-right">% Eleitorado</th>
                      <th className="py-3 px-3">Mais Votado Estadual (Recorte)</th>
                      <th className="py-3 px-3">Mais Votado Federal (Recorte)</th>
                      <th className="py-3 px-3 text-right">Eleitores Aptos</th>
                      <th className="py-3 px-3 text-center">Navegação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {processedZonas.map((z, idx) => {
                      const stats = extractVotes(z);
                      const top = getTopCandidatesForRecord(z);
                      return (
                        <tr key={z.zona || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-dark">Zona {z.zona}</td>
                          <td className="py-3 px-3 text-gray-700 font-bold">{z.nome || 'Zona Eleitoral'}</td>
                          <td className="py-3 px-3 text-right font-black text-dark font-mono text-sm">
                            {formatNumber(stats.votos)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-primary font-mono">{formatPct(stats.pctValidos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.validos)}
                            </div>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-emerald-600 font-mono">{formatPct(stats.pctAptos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.aptos)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {top.topEst.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-900 text-[11px] truncate max-w-[150px]" title={top.topEst.cand.nome_urna}>
                                  {top.topEst.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-blue-700 font-mono font-bold">
                                  {formatNumber(top.topEst.votos)} votos ({top.topEst.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {top.topFed.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-purple-900 text-[11px] truncate max-w-[150px]" title={top.topFed.cand.nome_urna}>
                                  {top.topFed.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-purple-700 font-mono font-bold">
                                  {formatNumber(top.topFed.votos)} votos ({top.topFed.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.aptos)}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setNavZona(z.zona || '');
                                setActiveTab('locais');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-blue-50 text-primary hover:bg-primary hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Ver Locais</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* ABA 3: BAIRROS DOS LOCAIS (899) */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'bairros' && (
          <div className="space-y-4">
            {renderLeadershipCard('Liderança nos 899 Bairros dos Locais de Votação', 'bairros', bairrosLeadership)}
            <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong>Aviso Metodológico de Leitura:</strong> Os 899 rótulos correspondem ao bairro cadastrado no <em>local de votação</em> da escola, não necessariamente à residência exata do eleitor. Não representam distritos oficiais municipais.
              </div>
            </div>

              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                  <div className="font-bold text-dark">
                    Mostrando {processedBairros.length} de 899 bairros cadastrados de locais
                  </div>
                  <div className="text-gray-500 text-[11px]">
                    Reconciliados com a soma da Capital (TSE 71072)
                  </div>
                </div>

                <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3 w-14">#</th>
                        <th className="py-3 px-4">Bairro do Local de Votação</th>
                        <th className="py-3 px-3 text-right">Votos no Recorte</th>
                        <th className="py-3 px-3 text-right">% Válidos</th>
                        <th className="py-3 px-3 text-right">% Eleitorado</th>
                        <th className="py-3 px-3">Mais Votado Estadual (Recorte)</th>
                        <th className="py-3 px-3">Mais Votado Federal (Recorte)</th>
                        <th className="py-3 px-3 text-right">Eleitores Aptos</th>
                        <th className="py-3 px-3 text-right">Votos Válidos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium">
                      {processedBairros.map((b, idx) => {
                        const stats = extractVotes(b);
                        const top = getTopCandidatesForRecord(b);
                        return (
                          <tr key={b.bairro || idx} className="hover:bg-blue-50/40 transition-colors">
                            <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                            <td className="py-3 px-4 font-bold text-dark">{b.bairro || 'Sem rótulo'}</td>
                            <td className="py-3 px-3 text-right font-black text-dark font-mono text-sm">
                              {formatNumber(stats.votos)}
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-bold text-primary font-mono">{formatPct(stats.pctValidos)}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {formatNumber(stats.votos)} / {formatNumber(stats.validos)}
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right">
                              <div className="font-bold text-emerald-600 font-mono">{formatPct(stats.pctAptos)}</div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {formatNumber(stats.votos)} / {formatNumber(stats.aptos)}
                              </div>
                            </td>
                            <td className="py-3 px-3">
                              {top.topEst.cand ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-blue-900 text-[11px] truncate max-w-[150px]" title={top.topEst.cand.nome_urna}>
                                    {top.topEst.cand.nome_urna}
                                  </span>
                                  <span className="text-[10px] text-blue-700 font-mono font-bold">
                                    {formatNumber(top.topEst.votos)} votos ({top.topEst.cand.partido})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3">
                              {top.topFed.cand ? (
                                <div className="flex flex-col">
                                  <span className="font-bold text-purple-900 text-[11px] truncate max-w-[150px]" title={top.topFed.cand.nome_urna}>
                                    {top.topFed.cand.nome_urna}
                                  </span>
                                  <span className="text-[10px] text-purple-700 font-mono font-bold">
                                    {formatNumber(top.topFed.votos)} votos ({top.topFed.cand.partido})
                                  </span>
                                </div>
                              ) : (
                                <span className="text-gray-400 text-[11px]">—</span>
                              )}
                            </td>
                            <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.aptos)}</td>
                            <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.validos)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        {/* ------------------------------------------------------------------- */}
        {/* ABA 4: LOCAIS DE VOTAÇÃO (2.057) */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'locais' && (
          <div className="space-y-4">
            {renderLeadershipCard('Liderança nos 2.057 Locais de Votação da Capital', 'locais', locaisLeadership)}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                <div className="font-bold text-dark">
                  Mostrando {processedLocais.length} de 2.057 locais de votação da Capital
                  {navZona && <span className="text-primary ml-1">(Filtrado pela Zona {navZona})</span>}
                </div>
                <div className="text-gray-500 text-[11px]">
                  Clique em <strong>“Ver Seções”</strong> para abrir as urnas deste local.
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-14">#</th>
                      <th className="py-3 px-3">Zona:Local</th>
                      <th className="py-3 px-4">Local / Escola</th>
                      <th className="py-3 px-3">Bairro</th>
                      <th className="py-3 px-3">Endereço</th>
                      <th className="py-3 px-3 text-right">Votos Recorte</th>
                      <th className="py-3 px-3 text-right">% Válidos</th>
                      <th className="py-3 px-3">Mais Votado Estadual</th>
                      <th className="py-3 px-3">Mais Votado Federal</th>
                      <th className="py-3 px-3 text-right">Aptos</th>
                      <th className="py-3 px-3 text-center">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {processedLocais.map((l, idx) => {
                      const stats = extractVotes(l);
                      const top = getTopCandidatesForRecord(l);
                      const localKey = l.local_id || `${l.zona}:${l.local || l.numero_local}`;
                      return (
                        <tr key={localKey || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                          <td className="py-3 px-3 font-mono font-bold text-dark">{localKey}</td>
                          <td className="py-3 px-4 font-bold text-dark">{l.nome || l.nome_local || 'Local de Votação'}</td>
                          <td className="py-3 px-3 text-gray-600">{l.bairro || l.bairro_local || '—'}</td>
                          <td className="py-3 px-3 text-gray-500 truncate max-w-xs">{l.endereco || '—'}</td>
                          <td className="py-3 px-3 text-right font-black text-dark font-mono text-sm">
                            {formatNumber(stats.votos)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-primary font-mono">{formatPct(stats.pctValidos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.validos)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {top.topEst.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-900 text-[11px] truncate max-w-[150px]" title={top.topEst.cand.nome_urna}>
                                  {top.topEst.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-blue-700 font-mono font-bold">
                                  {formatNumber(top.topEst.votos)} votos ({top.topEst.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {top.topFed.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-purple-900 text-[11px] truncate max-w-[150px]" title={top.topFed.cand.nome_urna}>
                                  {top.topFed.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-purple-700 font-mono font-bold">
                                  {formatNumber(top.topFed.votos)} votos ({top.topFed.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.aptos)}</td>
                          <td className="py-3 px-3 text-center">
                            <button
                              onClick={() => {
                                setNavZona(l.zona || '');
                                setNavLocalId(localKey);
                                setActiveTab('secoes');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white transition-all cursor-pointer inline-flex items-center gap-1"
                            >
                              <span>Ver Seções</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ------------------------------------------------------------------- */}
        {/* ABA 5: SEÇÕES ELEITORAIS (26.683) - Virtualized / Paginated */}
        {/* ------------------------------------------------------------------- */}
        {activeTab === 'secoes' && (
          <div className="space-y-4">
            {renderLeadershipCard('Liderança nas 26.683 Seções Eleitorais da Capital', 'seções', secoesLeadership)}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-2">
              <div className="p-4 bg-slate-50 border-b border-gray-200 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                <div className="font-bold text-dark">
                  Mostrando {processedSecoes.length.toLocaleString('pt-BR')} seções eleitorais principais da Capital
                  {navLocalId && <span className="text-primary ml-1">(Local: {navLocalId})</span>}
                </div>
                <div className="text-gray-500 text-[11px] flex items-center gap-2">
                  <span>Página <strong>{secaoPage}</strong> de <strong>{totalSecaoPages}</strong></span>
                  <select
                    value={secaoPageSize}
                    onChange={(e) => { setSecaoPageSize(Number(e.target.value)); setSecaoPage(1); }}
                    className="px-2 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                  >
                    <option value={25}>25 por página</option>
                    <option value={50}>50 por página</option>
                    <option value={100}>100 por página</option>
                    <option value={200}>200 por página</option>
                  </select>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                    <tr>
                      <th className="py-3 px-3 w-14">#</th>
                      <th className="py-3 px-3">Seção</th>
                      <th className="py-3 px-3">Zona</th>
                      <th className="py-3 px-4">Local de Votação (Nome)</th>
                      <th className="py-3 px-3">Bairro</th>
                      <th className="py-3 px-3 text-right">Votos Recorte</th>
                      <th className="py-3 px-3 text-right">% Válidos</th>
                      <th className="py-3 px-3">Mais Votado Estadual</th>
                      <th className="py-3 px-3">Mais Votado Federal</th>
                      <th className="py-3 px-3 text-right">Aptos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {paginatedSecoes.map((s, idx) => {
                      const stats = extractVotes(s);
                      const top = getTopCandidatesForRecord(s);
                      const localObj = locaisMap.get(s.local_id || `${s.zona}:${s.local}`);
                      const globalIdx = (secaoPage - 1) * secaoPageSize + idx + 1;
                      return (
                        <tr key={s.secao_id || `${s.zona}:${s.secao}` || idx} className="hover:bg-blue-50/40 transition-colors">
                          <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{globalIdx}</td>
                          <td className="py-3 px-3 font-mono font-bold text-dark text-sm">
                            Seção {s.secao}
                          </td>
                          <td className="py-3 px-3 font-mono text-gray-600">Zona {s.zona}</td>
                          <td className="py-3 px-4 font-bold text-dark">
                            {localObj?.nome || localObj?.nome_local || s.local_id || 'Local não encontrado'}
                          </td>
                          <td className="py-3 px-3 text-gray-600">{localObj?.bairro || localObj?.bairro_local || '—'}</td>
                          <td className="py-3 px-3 text-right font-black text-dark font-mono text-sm">
                            {formatNumber(stats.votos)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="font-bold text-primary font-mono">{formatPct(stats.pctValidos)}</div>
                            <div className="text-[10px] text-gray-400 font-mono">
                              {formatNumber(stats.votos)} / {formatNumber(stats.validos)}
                            </div>
                          </td>
                          <td className="py-3 px-3">
                            {top.topEst.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-blue-900 text-[11px] truncate max-w-[150px]" title={top.topEst.cand.nome_urna}>
                                  {top.topEst.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-blue-700 font-mono font-bold">
                                  {formatNumber(top.topEst.votos)} votos ({top.topEst.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {top.topFed.cand ? (
                              <div className="flex flex-col">
                                <span className="font-bold text-purple-900 text-[11px] truncate max-w-[150px]" title={top.topFed.cand.nome_urna}>
                                  {top.topFed.cand.nome_urna}
                                </span>
                                <span className="text-[10px] text-purple-700 font-mono font-bold">
                                  {formatNumber(top.topFed.votos)} votos ({top.topFed.cand.partido})
                                </span>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-[11px]">—</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right text-gray-600 font-mono">{formatNumber(stats.aptos)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Controles de Paginação */}
              <div className="p-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs">
                <div className="text-gray-500 font-medium">
                  Mostrando {(secaoPage - 1) * secaoPageSize + 1} a {Math.min(secaoPage * secaoPageSize, processedSecoes.length)} de {processedSecoes.length.toLocaleString('pt-BR')} seções
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSecaoPage(p => Math.max(1, p - 1))}
                    disabled={secaoPage <= 1}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" /> Anterior
                  </button>
                  <span className="font-mono font-bold text-dark px-2">
                    {secaoPage} / {totalSecaoPages}
                  </span>
                  <button
                    onClick={() => setSecaoPage(p => Math.min(totalSecaoPages, p + 1))}
                    disabled={secaoPage >= totalSecaoPages}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                  >
                    Próxima <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

          {/* ------------------------------------------------------------------- */}
          {/* ABA 6: CADASTRO DE CANDIDATOS (58) */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === 'candidatos' && (
            <div className="space-y-4">
              <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-200 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <h3 className="font-black uppercase text-dark text-sm">
                      Cadastro Completo das 58 Candidaturas da Causa Animal
                    </h3>
                    <p className="text-gray-500 mt-0.5">
                      Critérios rigorosamente separados: Atuação/Campanha Documentada, Adesão Pública à Pauta e Nome de Urna.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 font-bold border border-emerald-200 text-[11px]">
                      25 Atuação Documentada
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-800 font-bold border border-indigo-200 text-[11px]">
                      24 Adesão Pública
                    </span>
                    <span className="px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200 text-[11px]">
                      9 Nome na Urna
                    </span>
                  </div>
                </div>

                {/* Filtros da Lista de Candidatos */}
                <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className="text-gray-400 font-bold mr-1">Filtrar Critério:</span>
                    <button
                      onClick={() => setCandidateCriterionFilter('todos')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                        candidateCriterionFilter === 'todos'
                          ? 'bg-dark text-white shadow-xs'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Todos (58)
                    </button>
                    <button
                      onClick={() => setCandidateCriterionFilter('atuacao')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        candidateCriterionFilter === 'atuacao'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
                      }`}
                    >
                      Atuação Documentada (25)
                    </button>
                    <button
                      onClick={() => setCandidateCriterionFilter('adesao')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        candidateCriterionFilter === 'adesao'
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border border-indigo-200'
                      }`}
                    >
                      Adesão Pública à Pauta (24)
                    </button>
                    <button
                      onClick={() => setCandidateCriterionFilter('urna')}
                      className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center gap-1 ${
                        candidateCriterionFilter === 'urna'
                          ? 'bg-amber-600 text-white shadow-xs'
                          : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
                      }`}
                    >
                      Nome de Urna (9)
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={candidateCargoFilter}
                      onChange={(e) => setCandidateCargoFilter(e.target.value as any)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-bold text-gray-700 outline-none"
                    >
                      <option value="todos">Todos os Cargos</option>
                      <option value="deputado_estadual">Deputado Estadual (28)</option>
                      <option value="deputado_federal">Deputado Federal (30)</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Buscar por nome, número, partido..."
                      value={candidateSearchTerm}
                      onChange={(e) => setCandidateSearchTerm(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-gray-200 rounded-lg text-xs font-medium text-dark placeholder-gray-400 outline-none w-48 sm:w-56"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredCandidatesList.map((cand) => {
                  const isRafael = cand.cargo === 'deputado_estadual' && cand.id === rafaelCandidate?.id;
                  const isNina = cand.cargo === 'deputado_federal' && cand.id === ninaCandidate?.id;
                  const critType = getCandidateCriterion(cand);
                  const critLabel = getCandidateCriterionLabel(cand);
                  return (
                    <div
                      key={cand.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isRafael
                          ? 'bg-amber-50/60 border-amber-300 ring-2 ring-amber-400/20'
                          : isNina
                          ? 'bg-purple-50/60 border-purple-300 ring-2 ring-purple-400/20'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            cand.cargo === 'deputado_estadual'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}>
                            {cand.cargo === 'deputado_estadual' ? 'Deputado Estadual' : 'Deputado Federal'}
                          </span>
                          <h4 className="font-black text-dark text-sm mt-1.5 leading-tight">
                            {cand.nome_urna}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium">{cand.nome || cand.nome_civil}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black font-mono text-dark">{cand.numero}</span>
                          <div className="text-[10px] font-bold text-gray-500">{cand.partido}</div>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5 text-[11px]">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">Critério de Inclusão:</span>
                          <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                            critType === 'adesao'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : critType === 'urna'
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}>
                            {critLabel}
                          </span>
                        </div>

                        <div className="flex items-center justify-between text-gray-400">
                          <span>Universos:</span>
                          <div className="flex items-center gap-1">
                            {cand.universo_A || cand.universo_a ? (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-700">A</span>
                            ) : null}
                            {cand.universo_B || cand.universo_b ? (
                              <span className="px-1.5 py-0.5 bg-gray-100 rounded text-[9px] font-bold text-gray-700">B</span>
                            ) : null}
                            {cand.recorte_anterior && (
                              <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                Recorte Anterior
                              </span>
                            )}
                          </div>
                        </div>

                        {cand.fonte_inclusao && (
                          <div className="flex items-center justify-between text-gray-400 text-[10px]">
                            <span>Fonte de Validação:</span>
                            <a
                              href={cand.fonte_inclusao}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-primary hover:underline truncate max-w-[190px]"
                              title={cand.fonte_inclusao}
                            >
                              {cand.fonte_inclusao}
                            </a>
                          </div>
                        )}

                        {cand.notas && (
                          <div className="mt-2 p-2 bg-gray-50 rounded-lg text-[10px] text-gray-600 leading-relaxed font-mono">
                            {cand.notas}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* ABA: CRUZAMENTO FEDERAL X ESTADUAL (Dobradinhas, Co-votação e Equivalência) */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === 'cruzamentos' && (
            <div className="space-y-6">
              
              {/* Header da Aba de Cruzamentos */}
              <div className="bg-white p-5 sm:p-6 rounded-2xl border border-gray-200 shadow-sm space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-900 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5 text-purple-700" />
                    Análise Cruzada entre Cargos
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-black bg-blue-50 text-blue-800 border border-blue-200">
                    Eleições Gerais SP 2026 (1º Turno)
                  </span>
                </div>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-dark">
                  Cruzamento Federal x Estadual: Dobradinhas, Co-votação e Equivalência
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 max-w-4xl leading-relaxed">
                  Compare os votos recebidos por candidaturas estaduais e federais nas mesmas urnas e municípios. Consulte equivalência estatística de votos, combinações de dobradinhas eleitorais e em quem os eleitores de um candidato votaram no outro cargo.
                </p>
              </div>

              {/* CARDS COM RESPOSTAS RÁPIDAS ÀS PERGUNTAS DO USUÁRIO */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                
                {/* PERGUNTA 1: BECARI X PAIOL (EQUIVALÊNCIA) */}
                <div
                  onClick={() => {
                    setCrossPreset('becari_paiol');
                    setCrossEstadualIds(['250002545145']); // Dr. Edson da Paiol
                    setCrossFederalIds(['250002544326']); // Felipe Becari
                    setCrossViewMode('tabela_territorial');
                    setCrossFilterMode('equivalentes');
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    crossPreset === 'becari_paiol'
                      ? 'bg-blue-50/70 border-blue-400 ring-2 ring-blue-500/20 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-900">
                        Pergunta 1 • Equivalência
                      </span>
                      {crossPreset === 'becari_paiol' && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-blue-700">
                          <Check className="w-3.5 h-3.5" /> Ativo
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-dark text-sm leading-snug">
                      Votos Becari (Federal) x Paiol (Estadual)
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Em quantas cidades e seções eleitorais os votos de <strong>Felipe Becari (2007)</strong> e <strong>Dr. Edson da Paiol (20007)</strong> foram equivalentes?
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/70 space-y-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold">Cidades com votos iguais:</span>
                        <span className="font-mono font-black text-blue-900 text-sm">20 municípios</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Equivalência com tolerância (±15%):</span>
                        <span className="font-mono font-bold text-dark">72 municípios</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Ambos com votação simultânea:</span>
                        <span className="font-mono font-bold text-dark">602 de 645 (93,3%)</span>
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold">Seções Capital com votos iguais:</span>
                        <span className="font-mono font-black text-purple-900 text-sm">5.635 seções</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Diferença de até 1 voto:</span>
                        <span className="font-mono font-bold text-dark">10.240 seções</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Ambos com votos na mesma seção:</span>
                        <span className="font-mono font-bold text-dark">18.827 de 26.683 (70,6%)</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* PERGUNTA 2: RAFAEL SARAIVA + FELIPE BECARI (DOBRADINHA) */}
                <div
                  onClick={() => {
                    setCrossPreset('rafael_becari');
                    setCrossEstadualIds(['250002533758']); // Rafael Saraiva
                    setCrossFederalIds(['250002544326']); // Felipe Becari
                    setCrossViewMode('tabela_territorial');
                    setCrossFilterMode('ambos_positivos');
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    crossPreset === 'rafael_becari'
                      ? 'bg-amber-50/70 border-amber-400 ring-2 ring-amber-500/20 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900">
                        Pergunta 2 • Combinação / Dobradinha
                      </span>
                      {crossPreset === 'rafael_becari' && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-amber-700">
                          <Check className="w-3.5 h-3.5" /> Ativo
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-dark text-sm leading-snug">
                      Combinação Rafael Saraiva + Felipe Becari
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Em quais cidades e seções eleitorais os eleitores fizeram a combinação de voto <strong>Rafael Saraiva (44077) + Felipe Becari (2007)</strong>?
                    </p>
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/70 space-y-2 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold">Cidades com a combinação:</span>
                        <span className="font-mono font-black text-amber-950 text-sm">621 de 645 (96,3%)</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>Votos somados da dupla no Estado:</span>
                        <span className="font-mono font-bold text-dark">268.026 votos</span>
                      </div>
                      <div className="text-[10px] text-amber-800 font-bold truncate">
                        Top Cidades: São Paulo (87k), Guarulhos (9,4k), Campinas (7,1k), Santo André (5,9k)
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-gray-500 font-bold">Seções Capital com a dupla:</span>
                        <span className="font-mono font-black text-amber-950 text-sm">15.042 seções</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>% das seções da Capital:</span>
                        <span className="font-mono font-bold text-dark">56,4% de todas as 26.683 seções</span>
                      </div>
                      <div className="text-[10px] text-amber-800 font-bold truncate">
                        Zonas com maior concentração: Santo Amaro, Tatuapé, Santana, Mooca, Lapa
                      </div>
                    </div>
                  </div>
                </div>

                {/* PERGUNTA 3: QUEM VOTOU EM RAFAEL VOTOU EM QUEM PRA FEDERAL? */}
                <div
                  onClick={() => {
                    setCrossPreset('rafael_federal');
                    setCrossEstadualIds(['250002533758']); // Rafael Saraiva
                    setCrossCoSortBy(card3Scope);
                    setCrossViewMode('ranking_covotacao');
                  }}
                  className={`p-5 rounded-2xl border transition-all cursor-pointer relative overflow-hidden flex flex-col justify-between ${
                    crossPreset === 'rafael_federal'
                      ? 'bg-purple-50/70 border-purple-400 ring-2 ring-purple-500/20 shadow-md'
                      : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-900">
                        Pergunta 3 • Co-votação Real
                      </span>
                      {crossPreset === 'rafael_federal' && (
                        <span className="flex items-center gap-1 text-[10px] font-black text-purple-700">
                          <Check className="w-3.5 h-3.5" /> Ativo
                        </span>
                      )}
                    </div>
                    <h4 className="font-black text-dark text-sm leading-snug">
                      Quem votou no Rafael Saraiva votou em quem pra Federal?
                    </h4>
                    <p className="text-xs text-gray-600 leading-relaxed">
                      Ranking dos deputados federais mais votados nas mesmas urnas e municípios onde <strong>Rafael Saraiva (44077)</strong> obteve votos.
                    </p>

                    {/* Seletor de Escopo do Card (Estado vs Capital) */}
                    <div className="flex items-center gap-1 bg-purple-100/70 p-1 rounded-xl mt-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => {
                          setCard3Scope('estado');
                          setCrossCoSortBy('estado');
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          card3Scope === 'estado'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-purple-900 hover:bg-purple-200/50'
                        }`}
                      >
                        Estado SP (630 Cidades)
                      </button>
                      <button
                        onClick={() => {
                          setCard3Scope('capital');
                          setCrossCoSortBy('capital');
                        }}
                        className={`flex-1 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                          card3Scope === 'capital'
                            ? 'bg-purple-700 text-white shadow-xs'
                            : 'text-purple-900 hover:bg-purple-200/50'
                        }`}
                      >
                        Capital (16.878 Urnas)
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-200/70 space-y-1.5 text-xs">
                    {card3Scope === 'estado' ? (
                      /* DADOS ESTADO TODO DE SÃO PAULO */
                      <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1 text-[11px]">
                        <div className="text-[10px] font-black text-purple-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Estado de SP (630 Cidades com Rafael)</span>
                          <span className="text-gray-400 font-normal">105.174 votos Rafael</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>1º Profa. Luciene Cavalcante:</span>
                          <span className="font-mono font-black text-purple-950">253.457 votos</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>2º Delegado Bruno Lima:</span>
                          <span className="font-mono font-black text-emerald-800">217.814 votos</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>3º Felipe Becari:</span>
                          <span className="font-mono font-black text-purple-950">162.852 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>4º Alencar Santana:</span>
                          <span className="font-mono">160.150 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>5º Edinho Silva:</span>
                          <span className="font-mono">115.261 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>6º Nilto Tatto:</span>
                          <span className="font-mono">114.029 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-emerald-900 font-semibold text-[10px]">
                          <span>Bruno Ganem (destaque Interior):</span>
                          <span className="font-mono font-bold">64.181 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-gray-100 text-[10px]">
                          <span>Nina Passadore (mesmo partido 4407):</span>
                          <span className="font-mono font-bold text-dark">26.288 votos</span>
                        </div>
                      </div>
                    ) : (
                      /* DADOS CAPITAL DE SÃO PAULO */
                      <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1 text-[11px]">
                        <div className="text-[10px] font-black text-purple-900 uppercase tracking-wider mb-1 flex items-center justify-between">
                          <span>Capital (16.878 Seções com Rafael)</span>
                          <span className="text-gray-400 font-normal">32.407 votos Rafael</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>1º Profa. Luciene Cavalcante:</span>
                          <span className="font-mono font-black text-purple-950">53.542 votos</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>2º Delegado Bruno Lima:</span>
                          <span className="font-mono font-black text-purple-950">49.609 votos</span>
                        </div>
                        <div className="flex items-center justify-between font-bold text-dark">
                          <span>3º Felipe Becari:</span>
                          <span className="font-mono font-black text-purple-950">42.053 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>4º Nilto Tatto:</span>
                          <span className="font-mono">32.089 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-600">
                          <span>5º Nabil Bonduki:</span>
                          <span className="font-mono">22.713 votos</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-gray-100 text-[10px]">
                          <span>Nina Passadore (mesmo partido 4407):</span>
                          <span className="font-mono font-bold text-dark">6.564 votos</span>
                        </div>
                      </div>
                    )}
                    <div className="text-[10px] text-purple-700 font-bold text-center pt-1">
                      🔍 Clique para ver a tabela completa de 30 federais e o guia explicativo
                    </div>
                  </div>
                </div>

              </div>

              {/* PAINEL DE CONTROLE DO COMPARADOR LIVRE */}
              <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 text-xs">
                  <div className="flex items-center gap-2">
                    <GitCompare className="w-4 h-4 text-primary" />
                    <span className="font-black uppercase tracking-wider text-dark">Configuração do Cruzamento</span>
                  </div>
                  
                  {/* Alternador de Modo de Visualização */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl">
                    <button
                      onClick={() => setCrossViewMode('tabela_territorial')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        crossViewMode === 'tabela_territorial'
                          ? 'bg-primary text-white shadow-xs'
                          : 'text-gray-600 hover:text-dark'
                      }`}
                    >
                      Comparação Territorial (Cidades/Seções)
                    </button>
                    <button
                      onClick={() => setCrossViewMode('ranking_covotacao')}
                      className={`px-3 py-1.5 rounded-lg font-bold text-xs transition-all cursor-pointer ${
                        crossViewMode === 'ranking_covotacao'
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-gray-600 hover:text-dark'
                      }`}
                    >
                      Ranking de Co-votação Federal
                    </button>
                  </div>
                </div>

                {/* Seletores de Candidatos (Suporte a Seleção Múltipla) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {/* Seletor Múltiplo Estadual */}
                  <div className="relative">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                        <Vote className="w-3.5 h-3.5 text-blue-600" />
                        Candidato(a) Estadual ({crossEstadualIds.length})
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsEstadualPickerOpen(!isEstadualPickerOpen)}
                        className="text-[10px] font-bold text-blue-700 hover:text-blue-900 underline cursor-pointer"
                      >
                        {isEstadualPickerOpen ? 'Fechar' : 'Alterar Seleção'}
                      </button>
                    </div>

                    {/* Badges Bar */}
                    <div
                      onClick={() => setIsEstadualPickerOpen(!isEstadualPickerOpen)}
                      className="p-2 bg-white border border-gray-200 rounded-xl font-bold text-dark cursor-pointer flex flex-wrap items-center gap-1.5 min-h-[42px] hover:border-blue-400 transition-colors"
                    >
                      {crossEstadualCands.map(c => (
                        <span
                          key={c.id}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 border border-blue-200 text-blue-900 rounded-lg text-xs font-bold"
                        >
                          <span>{c.numero} - {c.nome_urna}</span>
                          {crossEstadualIds.length > 1 && (
                            <span
                              onClick={(e) => {
                                e.stopPropagation();
                                setCrossEstadualIds(prev => prev.filter(x => x !== String(c.id)));
                                setCrossPreset('custom');
                                setCrossPage(1);
                              }}
                              className="hover:text-red-600 font-extrabold cursor-pointer ml-0.5"
                              title="Remover candidato"
                            >
                              ✕
                            </span>
                          )}
                        </span>
                      ))}
                      <span className="text-[11px] font-semibold text-gray-400 ml-auto flex items-center gap-1">
                        + Selecionar
                      </span>
                    </div>

                    {/* Multi-select Dropdown Popover */}
                    {isEstadualPickerOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-3 space-y-2 max-h-80 overflow-y-auto">
                        <div className="flex items-center justify-between gap-2">
                          <input
                            type="text"
                            placeholder="Buscar candidato estadual..."
                            value={estadualSearch}
                            onChange={(e) => setEstadualSearch(e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setCrossEstadualIds(candidatosEstaduais.map(c => String(c.id)));
                              setCrossPreset('custom');
                              setCrossPage(1);
                            }}
                            className="text-[10px] font-bold text-blue-600 whitespace-nowrap hover:underline"
                          >
                            Todos
                          </button>
                        </div>
                        <div className="space-y-1">
                          {candidatosEstaduais
                            .filter(c => !estadualSearch || `${c.numero} ${c.nome_urna} ${c.partido}`.toLowerCase().includes(estadualSearch.toLowerCase()))
                            .map(c => {
                              const isChecked = crossEstadualIds.includes(String(c.id));
                              return (
                                <label
                                  key={c.id}
                                  className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                    isChecked ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50 text-gray-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isChecked}
                                    onChange={() => {
                                      setCrossEstadualIds(prev => {
                                        if (prev.includes(String(c.id))) {
                                          if (prev.length === 1) return prev;
                                          return prev.filter(x => x !== String(c.id));
                                        }
                                        return [...prev, String(c.id)];
                                      });
                                      setCrossPreset('custom');
                                      setCrossPage(1);
                                    }}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  />
                                  <span className="flex-1 truncate">
                                    {c.numero} - {c.nome_urna} ({c.partido})
                                  </span>
                                  <span className="text-[10px] font-mono text-gray-400">
                                    {formatNumber(c.votos_validos_SP || 0)} votos
                                  </span>
                                </label>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Seletor Múltiplo Federal */}
                  {crossViewMode === 'tabela_territorial' && (
                    <div className="relative">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                          <Vote className="w-3.5 h-3.5 text-purple-600" />
                          Candidato(a) Federal ({crossFederalIds.length})
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsFederalPickerOpen(!isFederalPickerOpen)}
                          className="text-[10px] font-bold text-purple-700 hover:text-purple-900 underline cursor-pointer"
                        >
                          {isFederalPickerOpen ? 'Fechar' : 'Alterar Seleção'}
                        </button>
                      </div>

                      {/* Badges Bar */}
                      <div
                        onClick={() => setIsFederalPickerOpen(!isFederalPickerOpen)}
                        className="p-2 bg-white border border-gray-200 rounded-xl font-bold text-dark cursor-pointer flex flex-wrap items-center gap-1.5 min-h-[42px] hover:border-purple-400 transition-colors"
                      >
                        {crossFederalCands.map(c => (
                          <span
                            key={c.id}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-purple-50 border border-purple-200 text-purple-900 rounded-lg text-xs font-bold"
                          >
                            <span>{c.numero} - {c.nome_urna}</span>
                            {crossFederalIds.length > 1 && (
                              <span
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCrossFederalIds(prev => prev.filter(x => x !== String(c.id)));
                                  setCrossPreset('custom');
                                  setCrossPage(1);
                                }}
                                className="hover:text-red-600 font-extrabold cursor-pointer ml-0.5"
                                title="Remover candidato"
                              >
                                ✕
                              </span>
                            )}
                          </span>
                        ))}
                        <span className="text-[11px] font-semibold text-gray-400 ml-auto flex items-center gap-1">
                          + Selecionar
                        </span>
                      </div>

                      {/* Multi-select Dropdown Popover */}
                      {isFederalPickerOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-gray-200 rounded-2xl shadow-xl z-30 p-3 space-y-2 max-h-80 overflow-y-auto">
                          <div className="flex items-center justify-between gap-2">
                            <input
                              type="text"
                              placeholder="Buscar candidato federal..."
                              value={federalSearch}
                              onChange={(e) => setFederalSearch(e.target.value)}
                              className="w-full px-2.5 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:bg-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setCrossFederalIds(candidatosFederais.map(c => String(c.id)));
                                setCrossPreset('custom');
                                setCrossPage(1);
                              }}
                              className="text-[10px] font-bold text-purple-600 whitespace-nowrap hover:underline"
                            >
                              Todos
                            </button>
                          </div>
                          <div className="space-y-1">
                            {candidatosFederais
                              .filter(c => !federalSearch || `${c.numero} ${c.nome_urna} ${c.partido}`.toLowerCase().includes(federalSearch.toLowerCase()))
                              .map(c => {
                                const isChecked = crossFederalIds.includes(String(c.id));
                                return (
                                  <label
                                    key={c.id}
                                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${
                                      isChecked ? 'bg-purple-50 text-purple-900' : 'hover:bg-gray-50 text-gray-700'
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() => {
                                        setCrossFederalIds(prev => {
                                          if (prev.includes(String(c.id))) {
                                            if (prev.length === 1) return prev;
                                            return prev.filter(x => x !== String(c.id));
                                          }
                                          return [...prev, String(c.id)];
                                        });
                                        setCrossPreset('custom');
                                        setCrossPage(1);
                                      }}
                                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                    />
                                    <span className="flex-1 truncate">
                                      {c.numero} - {c.nome_urna} ({c.partido})
                                    </span>
                                    <span className="text-[10px] font-mono text-gray-400">
                                      {formatNumber(c.votos_validos_SP || 0)} votos
                                    </span>
                                  </label>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {crossViewMode === 'tabela_territorial' && (
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-gray-500 mb-1">
                        Nível Territorial e Filtro
                      </label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <select
                          value={crossLevel}
                          onChange={(e) => { setCrossLevel(e.target.value as any); setCrossPage(1); }}
                          className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-dark outline-none h-[42px]"
                        >
                          <option value="municipios">Municípios (645)</option>
                          <option value="secoes">Seções Capital (26.683)</option>
                        </select>
                        <select
                          value={crossFilterMode}
                          onChange={(e) => { setCrossFilterMode(e.target.value as any); setCrossPage(1); }}
                          className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-dark outline-none text-[11px] h-[42px]"
                        >
                          <option value="todos">Todos</option>
                          <option value="equivalentes">Exatamente Iguais</option>
                          <option value="proximos">Equivalentes Próximos</option>
                          <option value="ambos_positivos">Ambos com Votos</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                {crossViewMode === 'tabela_territorial' && (
                  <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-500">
                        Votos Totais: <strong className="text-blue-900">
                          {crossEstadualCands.map(c => c.nome_urna).join(' + ') || 'Estadual'}: {formatNumber(crossComparisonStats.totalEstadual)}
                        </strong> x <strong className="text-purple-900">
                          {crossFederalCands.map(c => c.nome_urna).join(' + ') || 'Federal'}: {formatNumber(crossComparisonStats.totalFederal)}
                        </strong>
                      </span>
                    </div>
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Buscar cidade, seção ou escola..."
                        value={crossSearchTerm}
                        onChange={(e) => { setCrossSearchTerm(e.target.value); setCrossPage(1); }}
                        className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium outline-none w-64"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* MODO 1: TABELA TERRITORIAL CRUZADA (CIDADES OU SEÇÕES) */}
              {crossViewMode === 'tabela_territorial' && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="p-4 bg-slate-50 border-b border-gray-200 flex items-center justify-between text-xs">
                    <div className="font-bold text-dark">
                      Comparação entre {crossEstadualCand?.nome_urna} (Estadual) e {crossFederalCand?.nome_urna} (Federal) por {crossLevel === 'municipios' ? 'Município' : 'Seção Eleitoral da Capital'}
                    </div>
                    <div className="text-gray-500 text-[11px] font-mono">
                      {crossLevel === 'municipios' ? (
                        <span>Iguais: <strong>{crossComparisonStats.munExact}</strong> | Próximos: <strong>{crossComparisonStats.munClose}</strong> | Ambos: <strong>{crossComparisonStats.munBoth} de 645</strong></span>
                      ) : (
                        <span>Iguais: <strong>{crossComparisonStats.secExact}</strong> | Ambos: <strong>{crossComparisonStats.secBoth} de 26.683</strong></span>
                      )}
                    </div>
                  </div>

                  <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50 sticky top-0 z-10 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3 w-14">#</th>
                          <th className="py-3 px-4">{crossLevel === 'municipios' ? 'Município' : 'Seção / Zona'}</th>
                          {crossLevel === 'secoes' && <th className="py-3 px-4">Local / Escola</th>}
                          <th className="py-3 px-4 text-right text-blue-900 font-black">{crossEstadualCand?.nome_urna} (Estadual)</th>
                          <th className="py-3 px-4 text-right text-purple-900 font-black">{crossFederalCand?.nome_urna} (Federal)</th>
                          <th className="py-3 px-4 text-right">Diferença (Delta)</th>
                          <th className="py-3 px-4 text-right">Soma Combinada</th>
                          <th className="py-3 px-4 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {(() => {
                          const rawList = crossLevel === 'municipios' ? crossComparisonStats.munRows : crossComparisonStats.secRows;
                          const filtered = rawList.filter(row => {
                            if (crossFilterMode === 'equivalentes' && !row.isExact) return false;
                            if (crossFilterMode === 'proximos' && !row.isClose) return false;
                            if (crossFilterMode === 'ambos_positivos' && !row.isBoth) return false;
                            if (crossSearchTerm.trim()) {
                              if (crossLevel === 'municipios') {
                                const mRow = row as any;
                                if (!matchesSearchTerm([mRow.nome, mRow.codigo], crossSearchTerm)) return false;
                              } else {
                                const sRow = row as any;
                                if (!matchesSearchTerm([sRow.secao, sRow.zona, sRow.localNome], crossSearchTerm)) return false;
                              }
                            }
                            return true;
                          });

                          const totalPages = Math.ceil(filtered.length / crossPageSize) || 1;
                          const paginated = filtered.slice((crossPage - 1) * crossPageSize, crossPage * crossPageSize);

                          if (paginated.length === 0) {
                            return (
                              <tr>
                                <td colSpan={8} className="py-8 text-center text-gray-400">
                                  Nenhum registro encontrado para este filtro de comparação.
                                </td>
                              </tr>
                            );
                          }

                          return paginated.map((r: any, idx: number) => {
                            const globalIdx = (crossPage - 1) * crossPageSize + idx + 1;
                            return (
                              <tr
                                key={r.codigo || r.secao_id || idx}
                                className={`hover:bg-blue-50/40 transition-colors ${
                                  r.isExact ? 'bg-emerald-50/30' : r.isClose ? 'bg-blue-50/20' : ''
                                }`}
                              >
                                <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{globalIdx}</td>
                                <td className="py-3 px-4 font-bold text-dark">
                                  {crossLevel === 'municipios' ? (
                                    <span>{r.nome}</span>
                                  ) : (
                                    <span>Seção {r.secao} (Zona {r.zona})</span>
                                  )}
                                </td>
                                {crossLevel === 'secoes' && (
                                  <td className="py-3 px-4 text-gray-600 truncate max-w-xs" title={r.localNome}>
                                    {r.localNome} {r.localBairro ? `(${r.localBairro})` : ''}
                                  </td>
                                )}
                                <td className="py-3 px-4 text-right font-black font-mono text-blue-900 text-sm">
                                  {formatNumber(r.vEst)}
                                </td>
                                <td className="py-3 px-4 text-right font-black font-mono text-purple-900 text-sm">
                                  {formatNumber(r.vFed)}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-bold text-gray-700">
                                  {r.diff === 0 ? (
                                    <span className="text-emerald-600 font-black">0 (Exato)</span>
                                  ) : (
                                    <span>±{formatNumber(r.diff)}</span>
                                  )}
                                </td>
                                <td className="py-3 px-4 text-right font-mono font-black text-dark">
                                  {formatNumber(r.sum)}
                                </td>
                                <td className="py-3 px-4 text-center">
                                  {r.isExact ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                                      Equivalentes (Iguais)
                                    </span>
                                  ) : r.isClose ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                                      Próximos
                                    </span>
                                  ) : r.isBoth ? (
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                      Ambos Votados
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 text-[10px]">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Paginação da Tabela de Cruzamento */}
                  <div className="p-4 bg-slate-50 border-t border-gray-200 flex items-center justify-between text-xs">
                    <div className="text-gray-500 font-medium">
                      Página {crossPage}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCrossPage(p => Math.max(1, p - 1))}
                        disabled={crossPage <= 1}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 disabled:opacity-40 cursor-pointer flex items-center gap-1"
                      >
                        <ChevronLeft className="w-4 h-4" /> Anterior
                      </button>
                      <button
                        onClick={() => setCrossPage(p => p + 1)}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white font-bold text-gray-700 hover:bg-gray-50 cursor-pointer flex items-center gap-1"
                      >
                        Próxima <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* MODO 2: RANKING DE CO-VOTAÇÃO FEDERAL */}
              {crossViewMode === 'ranking_covotacao' && (
                <div className="space-y-6">
                  <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-5 p-5 sm:p-6">
                    
                    {/* Header do Ranking */}
                    <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-black uppercase tracking-wider bg-purple-100 text-purple-900">
                            Co-ocorrência Eleitoral
                          </span>
                          <span className="text-xs text-gray-400 font-bold">•</span>
                          <span className="text-xs font-bold text-gray-500">Eleições Gerais SP 2026</span>
                        </div>
                        <h4 className="font-black text-dark text-lg sm:text-xl uppercase tracking-tight">
                          Quem votou em {crossEstadualCand?.nome_urna} ({crossEstadualCand?.numero} - {crossEstadualCand?.partido}) votou em quem para Federal?
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-500 mt-1 max-w-3xl leading-relaxed">
                          Apuração oficial dos deputados federais mais votados nos mesmos colégios eleitorais onde o candidato estadual pontuou.
                        </p>
                      </div>

                      {/* Alternador de Ordenação / Escopo Principal */}
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                          <button
                            onClick={() => setCrossCoSortBy('estado')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              crossCoSortBy === 'estado'
                                ? 'bg-purple-700 text-white shadow-xs'
                                : 'text-gray-600 hover:text-dark'
                            }`}
                          >
                            <Building2 className="w-3.5 h-3.5" />
                            <span>Estado Todo de SP (630 Cidades)</span>
                          </button>
                          <button
                            onClick={() => setCrossCoSortBy('capital')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                              crossCoSortBy === 'capital'
                                ? 'bg-purple-700 text-white shadow-xs'
                                : 'text-gray-600 hover:text-dark'
                            }`}
                          >
                            <MapPin className="w-3.5 h-3.5" />
                            <span>Capital (16.878 Urnas)</span>
                          </button>
                        </div>

                        {/* Filtro de Critério */}
                        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl">
                          <button
                            onClick={() => setCrossCoCriterion('todos')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              crossCoCriterion === 'todos'
                                ? 'bg-white text-dark shadow-xs'
                                : 'text-gray-500 hover:text-dark'
                            }`}
                          >
                            Todos (30)
                          </button>
                          <button
                            onClick={() => setCrossCoCriterion('atuacao')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              crossCoCriterion === 'atuacao'
                                ? 'bg-emerald-700 text-white shadow-xs'
                                : 'text-gray-500 hover:text-dark'
                            }`}
                          >
                            Atuação Direta (11)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Cards de Resumo Territorial do Candidato Estadual */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-purple-700">Votação Estadual do Candidato</span>
                        <div className="text-lg font-black font-mono text-purple-950">
                          {formatNumber(coVotingSummary.totalEstadualVotosEstado)} votos
                        </div>
                        <div className="text-[11px] text-purple-800">
                          Em <strong>{coVotingSummary.munCountWithEstadual}</strong> dos 645 municípios paulistas (97,7%)
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">Votação na Capital do Candidato</span>
                        <div className="text-lg font-black font-mono text-blue-950">
                          {formatNumber(coVotingSummary.totalEstadualVotosCapital)} votos
                        </div>
                        <div className="text-[11px] text-blue-800">
                          Em <strong>{coVotingSummary.secoesCountWithEstadual.toLocaleString('pt-BR')}</strong> de 26.683 urnas (63,3%)
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">Líder Causa Animal no Estado</span>
                        <div className="text-lg font-black text-emerald-950 truncate">
                          Delegado Bruno Lima
                        </div>
                        <div className="text-[11px] text-emerald-800 font-mono font-bold">
                          217.814 votos nos municípios de Rafael
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200/80 space-y-1">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">Dobrada Mesmo Partido (União 4407)</span>
                        <div className="text-lg font-black text-amber-950 truncate">
                          Nina Passadore
                        </div>
                        <div className="text-[11px] text-amber-800">
                          <strong>26.288</strong> Estado • <strong>6.564</strong> Capital
                        </div>
                      </div>
                    </div>

                    {/* Tabela do Ranking de Co-votação */}
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                          <tr>
                            <th className="py-3 px-3 w-12 text-center">#</th>
                            <th className="py-3 px-4">Candidato(a) Federal</th>
                            <th className="py-3 px-3">Número</th>
                            <th className="py-3 px-3">Partido</th>
                            <th className={`py-3 px-4 text-right cursor-pointer transition-colors ${crossCoSortBy === 'estado' ? 'bg-purple-100/70 text-purple-950 font-black' : 'text-gray-600 hover:text-dark'}`}
                              onClick={() => setCrossCoSortBy('estado')}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Votos no Estado Todo (630 Cidades)</span>
                                {crossCoSortBy === 'estado' && <span className="text-[10px]">▼</span>}
                              </div>
                            </th>
                            <th className={`py-3 px-4 text-right cursor-pointer transition-colors ${crossCoSortBy === 'capital' ? 'bg-purple-100/70 text-purple-950 font-black' : 'text-gray-600 hover:text-dark'}`}
                              onClick={() => setCrossCoSortBy('capital')}
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Votos na Capital (16.878 Urnas)</span>
                                {crossCoSortBy === 'capital' && <span className="text-[10px]">▼</span>}
                              </div>
                            </th>
                            <th className="py-3 px-4">Critério da Causa Animal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 font-medium">
                          {coVotingStats.map((item, idx) => {
                            const critLabel = getCandidateCriterionLabel(item.candidato);
                            const critType = getCandidateCriterion(item.candidato);
                            const isBecari = item.candidato.id === '250002544326';
                            const isBrunoLima = item.candidato.numero === '2011';
                            const isNina = item.candidato.numero === '4407';

                            return (
                              <tr
                                key={item.candidato.id}
                                className={`hover:bg-purple-50/30 transition-colors ${
                                  idx === 0 ? 'bg-amber-50/40 font-bold' : idx < 3 ? 'bg-purple-50/20' : ''
                                } ${isNina ? 'bg-blue-50/30' : ''}`}
                              >
                                <td className="py-3 px-3 text-center text-gray-400 font-mono text-[11px] font-bold">
                                  {idx + 1}º
                                </td>
                                <td className="py-3 px-4 font-black text-dark">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <span>{item.candidato.nome_urna}</span>
                                    {idx === 0 && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">
                                        1º GERAL
                                      </span>
                                    )}
                                    {isBrunoLima && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-600 text-white font-black">
                                        1º CAUSA ANIMAL SP
                                      </span>
                                    )}
                                    {isBecari && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-600 text-white font-black">
                                        BECARI
                                      </span>
                                    )}
                                    {isNina && (
                                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-blue-600 text-white font-black">
                                        DOBRADA 4407
                                      </span>
                                    )}
                                  </div>
                                </td>
                                <td className="py-3 px-3 font-mono font-bold text-gray-700">{item.candidato.numero}</td>
                                <td className="py-3 px-3 font-bold text-gray-500">{item.candidato.partido}</td>
                                
                                {/* Coluna Votos Estado */}
                                <td className={`py-3 px-4 text-right font-black font-mono text-sm ${crossCoSortBy === 'estado' ? 'bg-purple-50/60 text-purple-950' : 'text-gray-900'}`}>
                                  {formatNumber(item.votosEstadoNasCidadesDoEstadual)}
                                </td>

                                {/* Coluna Votos Capital */}
                                <td className={`py-3 px-4 text-right font-black font-mono text-sm ${crossCoSortBy === 'capital' ? 'bg-purple-50/60 text-purple-950' : 'text-gray-700'}`}>
                                  {formatNumber(item.votosCapitalNasUrnasDoEstadual)}
                                </td>

                                <td className="py-3 px-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold inline-block ${
                                    critType === 'adesao'
                                      ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                      : critType === 'urna'
                                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  }`}>
                                    {critLabel}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* BLOCO DIDÁTICO EXPLICATIVO: COMO INTERPRETAR CORRETAMENTE ESTA RELAÇÃO */}
                  <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
                    <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                      <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-300 flex items-center justify-center font-bold">
                        <FileText className="w-5 h-5 text-purple-300" />
                      </div>
                      <div>
                        <h4 className="text-base sm:text-lg font-black uppercase tracking-tight text-white">
                          Guia Didático e Regras Técnicas do TSE: Como Interpretar Esta Relação
                        </h4>
                        <p className="text-xs text-purple-200/80">
                          Entenda por que esses números se comportam dessa forma e o que a legislação eleitoral brasileira permite afirmar com rigor científico.
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs leading-relaxed">
                      
                      {/* TÓPICO 1: POR QUE A SOMA SUPERA OS VOTOS DE RAFAEL */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-amber-300 font-black text-xs uppercase tracking-wide">
                          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                          <span>1. Por que a soma dá mais votos do que o Rafael teve?</span>
                        </div>
                        <p className="text-gray-300">
                          A urna eletrônica brasileira é <strong>100% sigilosa por determinação constitucional (Art. 14 da CF/88)</strong>. O TSE não vincula o comprovante individual de voto para Deputado Estadual com o voto para Deputado Federal emitido pelo mesmo cidadão.
                        </p>
                        <p className="text-gray-300">
                          Em cada urna da Capital votam de 300 a 400 eleitores, e em cada município votam dezenas ou centenas de milhares. Quando selecionamos as <strong>16.878 urnas da Capital</strong> ou os <strong>630 municípios de SP</strong> onde Rafael teve votos, contabilizamos <strong>TODOS os votos que os federais receberam nessas urnas/cidades inteiras</strong>. Por isso, a soma dos federais ultrapassa com folga a votação isolada de Rafael.
                        </p>
                      </div>

                      {/* TÓPICO 2: O QUE É O MAIS CORRETO AFIRMAR */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-300 font-black text-xs uppercase tracking-wide">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>2. O que é o mais correto afirmar cientificamente?</span>
                        </div>
                        <div className="p-2.5 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-200 font-semibold">
                          &quot;Ranking dos deputados federais mais votados nos mesmos colégios eleitorais (urnas na Capital e municípios no Estado) onde Rafael Saraiva obteve votos.&quot;
                        </div>
                        <p className="text-gray-300">
                          Trata-se de uma análise de <strong>co-presença territorial e afinidade geográfica</strong>: mostra em quais regiões, zonas e colégios eleitorais o eleitorado de Rafael Saraiva conviveu e dividiu o espaço de votação com as grandes candidaturas federais.
                        </p>
                      </div>

                      {/* TÓPICO 3: CAPITAL X ESTADO TODO */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-blue-300 font-black text-xs uppercase tracking-wide">
                          <Building2 className="w-4 h-4 flex-shrink-0" />
                          <span>3. Diferença entre a Capital e o Estado Todo de SP</span>
                        </div>
                        <p className="text-gray-300">
                          Na <strong>Capital</strong> (16.878 urnas), a disputa na causa animal foi muito parelha: Bruno Lima (49.609) e Felipe Becari (42.053).
                        </p>
                        <p className="text-gray-300">
                          No <strong>Estado Todo</strong> (630 municípios), <strong>Delegado Bruno Lima assume ampla liderança</strong> com <strong>217.814 votos</strong> (55 mil votos de vantagem sobre Becari, com 162.852 votos), impulsionado pela Grande SP e Interior. Além disso, <strong>Bruno Ganem</strong> salta para <strong>64.181 votos</strong> impulsionado pelo Interior (especialmente Indaiatuba e região de Campinas).
                        </p>
                      </div>

                      {/* TÓPICO 4: CRITÉRIOS DE INCLUSÃO (ATUAÇÃO X ADESÃO) */}
                      <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center gap-2 text-purple-300 font-black text-xs uppercase tracking-wide">
                          <Users className="w-4 h-4 flex-shrink-0" />
                          <span>4. Por que Profa. Luciene, Alencar e Nilto lideram o geral?</span>
                        </div>
                        <p className="text-gray-300">
                          Parlamentares de grandes legendas de massa (PSOL, PT) possuem forte voto partidário orgânico e assinaram formalmente a <em>Pauta Animalista 2026</em>.
                        </p>
                        <p className="text-gray-300">
                          Já nomes como Delegado Bruno Lima, Felipe Becari, Bruno Ganem, Richard Selvagem e Nina Passadore têm como bandeira principal a <strong>Atuação/Campanha Animal Documentada</strong>. Use o botão de filtro <em>&quot;Atuação Direta (11)&quot;</em> no topo para analisar exclusivamente o nicho focado na causa.
                        </p>
                      </div>

                    </div>

                    {/* DOBRADA DE PARTIDO: NINA PASSADORE (4407) */}
                    <div className="p-4 rounded-2xl bg-blue-950/40 border border-blue-500/30 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-300">Dobradinha Partidária (União Brasil 44077 + 4407)</span>
                        <div className="font-bold text-white">
                          Nina Passadore obteve 6.564 votos na Capital e 26.288 votos no Estado nos mesmos colégios de Rafael Saraiva.
                        </div>
                        <p className="text-blue-200/70 text-[11px]">
                          Representa o eleitorado que votou na dobrada oficial de chapa pura partidária do União Brasil.
                        </p>
                      </div>
                      <div className="px-3 py-1.5 rounded-xl bg-blue-600 text-white font-mono font-black text-sm whitespace-nowrap">
                        26.288 votos SP
                      </div>
                    </div>

                  </div>
                </div>
              )}

            </div>
          )}

          {/* ------------------------------------------------------------------- */}
          {/* ABA: SUGESTÃO ESTRATÉGICA & PLANO DE EXPANSÃO TERRITORIAL */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === 'estrategia' && (
            <div className="space-y-6">
              {/* Header do Painel Estratégico */}
              <div className="bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4 border border-blue-500/20 relative overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-blue-500/30 text-blue-200 border border-blue-400/30 flex items-center gap-1.5">
                        <Target className="w-3.5 h-3.5 text-blue-300" />
                        Sugestão Estratégica & Inteligência Geográfica
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Rafael Saraiva (44077) • Causa Animal SP
                      </span>
                      {stratExcludeRegina && (
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-rose-500/20 text-rose-200 border border-rose-500/30 flex items-center gap-1">
                          🚫 Regina Nunes Excluída das Análises
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white mt-1">
                      Análise de Territórios & Plano de Expansão
                    </h3>
                  </div>

                  {/* Botão para copiar relatório */}
                  <button
                    onClick={() => {
                      const topCitiesText = filteredStrategicCities.slice(0, 8).map(c => 
                        `• ${c.municipio}: ${formatNumber(c.vTotalCausa)} votos causa animal (Rafael: ${formatNumber(c.vRafael)} / ${formatPct(c.pctRafael)}). Potencial: +${formatNumber(c.potencialNew)} votos. Justificativa: ${c.justificativa}`
                      ).join('\n');

                      const reportText = `=== SUGESTÃO ESTRATÉGICA & EXPANSÃO DE VOTOS (CAUSA ANIMAL SP 2026) ===\n\n` +
                        `Filtro Ativo: ${stratExcludeRegina ? 'Regina Nunes EXCLUÍDA' : 'Todas as candidaturas incluídas'}\n` +
                        `Votação Atual Rafael Saraiva: 105.174 votos (630 municípios / 97,7% de cobertura)\n` +
                        `Teto Animalista Estimado (Sem Regina): ~450.000 a 690.000 votos no Estado\n\n` +
                        `--- TOP CIDADES PARA AVANÇAR E CONQUISTAR NOVOS VOTOS ---\n` +
                        `${topCitiesText}\n\n` +
                        `--- RECOMENDAÇÕES TÁTICAS DE CAMPO ---\n` +
                        `1. RMC & Campinas: Envio de Castramóvel + Insumos de ração para ONGs parceiras.\n` +
                        `2. Grande SP & ABC: Dobradinhas com lideranças locais e panfletagem nos bairros.\n` +
                        `3. Litoral: Mutirões de Castração de Verão e apoio a protetores em Santos e Praia Grande.\n` +
                        `4. Vale do Paraíba & Noroeste: Emendas parlamentares diretas em ração e medicamentos.\n`;

                      navigator.clipboard.writeText(reportText);
                      setStratReportCopied(true);
                      setTimeout(() => setStratReportCopied(false), 3000);
                    }}
                    className="px-4 py-2.5 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black text-xs transition-all shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {stratReportCopied ? <Check className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                    <span>{stratReportCopied ? 'Relatório Copiado!' : 'Copiar Relatório Estratégico'}</span>
                  </button>
                </div>

                <p className="text-xs sm:text-sm text-blue-100/90 max-w-4xl leading-relaxed relative z-10">
                  Cruzamento dos dados eleitorais dos 645 municípios paulistas. Identificação das cidades onde a pauta animalista é mais forte, medição da penetração de Rafael Saraiva e direcionamento das melhores oportunidades de conversão e conquista de novos votos.
                </p>

                {/* NOTA DE ESCLARECIMENTO - SOMENTE CANDIDATOS DA CAUSA */}
                <div className="p-3 bg-blue-500/20 border border-blue-400/30 rounded-2xl text-xs text-blue-100 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-300 flex-shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <span className="font-black text-white uppercase tracking-wider block text-[11px]">
                      🎯 Mapeamento Restrito aos Candidatos Monitorados da Causa Animal
                    </span>
                    <p className="text-[11px] text-blue-100/90 leading-snug">
                      Esta análise considera <strong>exclusivamente a soma dos votos dos candidatos cadastrados da causa animal</strong> (ex: Bruno Lima, Becari, Ganem, Rafael Saraiva, Dr. Edson da Paiol, Richard Selvagem, Nina Passadore, etc.), e <strong>NÃO o total geral de votos da cidade ou estado</strong>. Ao ativar a exclusão da Regina Nunes, os votos dela são retirados especificamente deste grupo da causa.
                    </p>
                  </div>
                </div>

                {/* PAINEL DE CONTROLE DE FILTROS E ESCOPO DE CANDIDATOS */}
                <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="flex items-center gap-2 bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-xl border border-white/20 cursor-pointer font-bold text-white transition-all">
                      <input
                        type="checkbox"
                        checked={stratExcludeRegina}
                        onChange={(e) => setStratExcludeRegina(e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <span>Excluir Regina Nunes</span>
                    </label>

                    <div className="flex flex-wrap items-center gap-1 bg-black/20 p-1 rounded-xl border border-white/10">
                      <span className="text-[10px] font-black uppercase text-blue-200 px-2">Escopo da Causa:</span>
                      <button
                        onClick={() => {
                          setStratCandidateScope('atuacao_sem_regina');
                          setStratExcludeRegina(true);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${stratCandidateScope === 'atuacao_sem_regina' && stratExcludeRegina ? 'bg-blue-500 text-white shadow-xs font-black' : 'text-blue-200 hover:text-white'}`}
                      >
                        🎯 Atuação Direta (Sem Regina)
                      </button>
                      <button
                        onClick={() => {
                          setStratCandidateScope('atuacao_e_adesao');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${stratCandidateScope === 'atuacao_e_adesao' ? 'bg-purple-500 text-white shadow-xs font-black' : 'text-blue-200 hover:text-white'}`}
                      >
                        📜 Atuação + Adesão
                      </button>
                      <button
                        onClick={() => {
                          setStratCandidateScope('todos_da_causa');
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${stratCandidateScope === 'todos_da_causa' ? 'bg-indigo-500 text-white shadow-xs font-black' : 'text-blue-200 hover:text-white'}`}
                      >
                        📊 Todos os 58 da Causa
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-1 max-w-xs">
                    <div className="relative w-full">
                      <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={stratSearchCity}
                        onChange={(e) => setStratSearchCity(e.target.value)}
                        placeholder="Filtrar município..."
                        className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white/10 text-white placeholder-blue-200/60 border border-white/20 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-400"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* KPIS DE POTENCIAL DE CRESCIMENTO */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-800">Votação Atual Rafael Saraiva</span>
                  <div className="text-2xl font-black font-mono text-dark">105.174 <span className="text-xs text-gray-500 font-normal">votos</span></div>
                  <p className="text-[11px] text-gray-500 font-medium">32.407 Capital • 72.767 Interior/Litoral</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">Penetração em Municípios</span>
                  <div className="text-2xl font-black font-mono text-emerald-950">630 / 645 <span className="text-xs text-gray-500 font-normal">cidades</span></div>
                  <p className="text-[11px] text-emerald-700 font-bold">97,7% de presença territorial no Estado</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-800">Força da Causa (Sem Regina)</span>
                  <div className="text-2xl font-black font-mono text-purple-950">~450.000+ <span className="text-xs text-gray-500 font-normal">votos</span></div>
                  <p className="text-[11px] text-purple-700 font-medium">Potencial real de eleitores focado na causa</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-xs space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-800">Meta de Expansão Estimada</span>
                  <div className="text-2xl font-black font-mono text-amber-950">+60.000 <span className="text-xs text-gray-500 font-normal">votos</span></div>
                  <p className="text-[11px] text-amber-700 font-bold">Projeção com avanço nas cidades-polo</p>
                </div>
              </div>

              {/* GRÁFICOS VISUAIS E BARRAS DE DISTRIBUIÇÃO REGIONAL */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* GRÁFICO 1: TOP CIDADES ONDE A CAUSA ANIMAL É MAIS FORTE (RANKING SEM REGINA NUNES) */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-gray-100 pb-3">
                    <div>
                      <h4 className="font-black text-dark text-base uppercase tracking-tight flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600" />
                        Top Cidades: Força da Causa Animal
                      </h4>
                      <p className="text-xs text-gray-500">
                        Cidades com maior volume total de votos na pauta {stratExcludeRegina ? '(excluindo Regina Nunes)' : '(todas as candidaturas)'}
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-black text-[10px] uppercase border border-blue-200">
                      Total Causa x Rafael Saraiva
                    </span>
                  </div>

                  <div className="space-y-3 text-xs">
                    {filteredStrategicCities.slice(0, 8).map((city, idx) => {
                      const maxVal = Math.max(...filteredStrategicCities.map(c => c.vTotalCausa), 1);
                      const pctCausaWidth = Math.min(100, Math.round((city.vTotalCausa / maxVal) * 100));
                      const pctRafaelWidth = Math.min(100, Math.round((city.vRafael / city.vTotalCausa) * 100));

                      return (
                        <div key={city.municipio} className="space-y-1 p-2.5 rounded-xl hover:bg-gray-50 transition-all border border-gray-100">
                          <div className="flex items-center justify-between font-bold text-dark">
                            <span className="flex items-center gap-1.5 font-black text-slate-900">
                              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-900 font-mono text-[10px] flex items-center justify-center font-black">
                                {idx + 1}
                              </span>
                              {city.municipio}
                            </span>
                            <div className="flex items-center gap-2 font-mono text-[11px]">
                              <span className="text-blue-900 font-black" title="Total Causa Animal">
                                {formatNumber(city.vTotalCausa)} votos
                              </span>
                              <span className="text-emerald-700 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200" title="Votos Rafael Saraiva">
                                Rafael: {formatNumber(city.vRafael)} ({formatPct(city.pctRafael)})
                              </span>
                            </div>
                          </div>

                          {/* Barra Visual Composta */}
                          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden flex relative">
                            {/* Barra Votos Rafael Saraiva */}
                            <div
                              className="bg-emerald-500 h-full transition-all"
                              style={{ width: `${pctCausaWidth * (city.pctRafael || 0)}%` }}
                              title={`Rafael Saraiva: ${formatNumber(city.vRafael)} votos`}
                            ></div>
                            {/* Barra Outros Candidatos Causa Animal */}
                            <div
                              className="bg-blue-300 h-full transition-all"
                              style={{ width: `${pctCausaWidth * (1 - (city.pctRafael || 0))}%` }}
                              title={`Outros Candidatos da Causa: ${formatNumber(city.potencialNew)} votos`}
                            ></div>
                          </div>

                          <div className="flex justify-between text-[10px] text-gray-500 pt-0.5">
                            <span>Espaço de Conquista: <strong className="text-amber-800 font-mono">+{formatNumber(city.potencialNew)} votos</strong></span>
                            <span className="text-gray-400 capitalize">{city.regiao}</span>
                          </div>
                        </div>
                      );
                    })}

                    <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 font-bold border-t border-gray-100">
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Votos Rafael Saraiva</span>
                      <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded bg-blue-300 inline-block"></span> Potencial de Novos Votos</span>
                    </div>
                  </div>
                </div>

                {/* GRÁFICO 2: PILARES TÁTICOS DE CONVERSÃO E AVANÇO REGIONAL */}
                <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                      <div>
                        <h4 className="font-black text-dark text-base uppercase tracking-tight flex items-center gap-2">
                          <Compass className="w-4 h-4 text-purple-600" />
                          Plano Tático de Avanço Territorial
                        </h4>
                        <p className="text-xs text-gray-500">
                          Priorização das macro-regiões do Estado por potencial de conversão
                        </p>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-purple-50 text-purple-900 font-black text-[10px] uppercase border border-purple-200">
                        Metodologia 2026
                      </span>
                    </div>

                    <div className="space-y-3 mt-3 text-xs">
                      {/* RMC & Campinas */}
                      <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200 space-y-1.5">
                        <div className="flex items-center justify-between font-black text-emerald-950">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                            1. Região de Campinas & RMC (Campinas, Piracicaba, Limeira, Indaiatuba)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-emerald-200 text-emerald-900 font-mono font-bold text-[10px]">
                            Meta: +15.000 votos
                          </span>
                        </div>
                        <p className="text-emerald-900/80 text-[11px] leading-relaxed">
                          <strong>Bastião tradicional do movimento animalista.</strong> Rafael já lidera em Indaiatuba, mas Campinas, Piracicaba e Limeira somam mais de 70.000 votos animalistas com espaço direto de expansão.
                        </p>
                      </div>

                      {/* Grande SP & ABC */}
                      <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200 space-y-1.5">
                        <div className="flex items-center justify-between font-black text-blue-950">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                            2. Grande SP & ABC (Guarulhos, Osasco, Santo André, S. Bernardo)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-blue-200 text-blue-900 font-mono font-bold text-[10px]">
                            Meta: +20.000 votos
                          </span>
                        </div>
                        <p className="text-blue-900/80 text-[11px] leading-relaxed">
                          <strong>Alta densidade demográfica.</strong> Cidades com forte presença de ONGs e protetores independentes urbanos. Oportunidade de aumentar a média por seção na dobrada federal.
                        </p>
                      </div>

                      {/* Litoral Paulista */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200 space-y-1.5">
                        <div className="flex items-center justify-between font-black text-amber-950">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                            3. Litoral Paulista (Santos, Praia Grande, S. Vicente, Itanhaém)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-amber-200 text-amber-900 font-mono font-bold text-[10px]">
                            Meta: +10.000 votos
                          </span>
                        </div>
                        <p className="text-amber-900/80 text-[11px] leading-relaxed">
                          <strong>Demanda reprimida por saúde animal.</strong> Altas taxas de abandono na baixa temporada criam apelo imediato para mutirões de castração e clínicas veterinárias populares.
                        </p>
                      </div>

                      {/* Vale do Paraíba & Noroeste */}
                      <div className="p-3 bg-purple-50/70 rounded-xl border border-purple-200 space-y-1.5">
                        <div className="flex items-center justify-between font-black text-purple-950">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                            4. Vale do Paraíba & Noroeste (S. J. Campos, Ribeirão Preto, Franca)
                          </span>
                          <span className="px-2 py-0.5 rounded bg-purple-200 text-purple-900 font-mono font-bold text-[10px]">
                            Meta: +15.000 votos
                          </span>
                        </div>
                        <p className="text-purple-900/80 text-[11px] leading-relaxed">
                          <strong>Polos urbanos do Interior.</strong> Eleitorado exigente que responde bem a emendas parlamentares diretas em ração, medicamentos e apoio a abrigos.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-[11px] text-amber-900 font-bold flex items-center gap-2">
                    <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    <span>Em todas as 645 cidades Rafael Saraiva tem votos fixados. O objetivo é elevar a média por município de 115 para 250+ votos.</span>
                  </div>
                </div>

              </div>

              {/* TABELA DE MUNICÍPIOS E JUSTIFICATIVAS ESTRATÉGICAS */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-100 pb-3">
                  <div>
                    <h4 className="font-black text-dark text-lg uppercase tracking-tight flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-blue-600" />
                      Mapeamento Detalhado: Onde e Por Que Avançar
                    </h4>
                    <p className="text-xs text-gray-500">
                      Análise por município com contagem oficial, teto da causa animal e plano tático recomendado
                    </p>
                  </div>

                  {/* Filtro por Macro-Região */}
                  <div className="flex flex-wrap items-center gap-1.5 bg-gray-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      onClick={() => setStratRegionFilter('todas')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'todas' ? 'bg-white text-dark shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      Todas ({strategicCitiesAnalysis.length})
                    </button>
                    <button
                      onClick={() => setStratRegionFilter('rmc')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'rmc' ? 'bg-emerald-600 text-white shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      RMC / Campinas
                    </button>
                    <button
                      onClick={() => setStratRegionFilter('grande_sp')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'grande_sp' ? 'bg-blue-600 text-white shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      Grande SP & ABC
                    </button>
                    <button
                      onClick={() => setStratRegionFilter('litoral')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'litoral' ? 'bg-amber-600 text-white shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      Litoral
                    </button>
                    <button
                      onClick={() => setStratRegionFilter('vale')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'vale' ? 'bg-purple-600 text-white shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      Vale do Paraíba
                    </button>
                    <button
                      onClick={() => setStratRegionFilter('noroeste')}
                      className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${stratRegionFilter === 'noroeste' ? 'bg-indigo-600 text-white shadow-xs font-black' : 'text-gray-500 hover:text-dark'}`}
                    >
                      Noroeste
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto border border-gray-200 rounded-xl">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Município / Região</th>
                        <th className="py-3 px-3 text-right">Votos Rafael</th>
                        <th className="py-3 px-3 text-right">Causa Animal {stratExcludeRegina ? '(Sem Regina)' : ''}</th>
                        <th className="py-3 px-3 text-right">% Share Rafael</th>
                        <th className="py-3 px-3 text-right">Potencial Conquista</th>
                        <th className="py-3 px-4 bg-purple-50 text-purple-950 font-black">Candidato Alvo a Atrair Votos (Líder da Causa)</th>
                        <th className="py-3 px-4">Estratégia de Captação & Ação Tática</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 font-medium text-dark">
                      {filteredStrategicCities.map((c) => (
                        <tr key={c.municipio} className="hover:bg-blue-50/30 transition-all">
                          <td className="py-3.5 px-4 font-black text-slate-900">
                            <div>{c.municipio}</div>
                            <span className="text-[10px] text-gray-400 font-normal uppercase">{c.regiao}</span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-emerald-800 text-right">
                            {formatNumber(c.vRafael)}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-blue-900 text-right">
                            {formatNumber(c.vTotalCausa)}
                          </td>
                          <td className="py-3.5 px-3 font-mono font-bold text-gray-700 text-right">
                            <span className={`px-2 py-0.5 rounded text-[11px] ${c.pctRafael > 0.3 ? 'bg-emerald-100 text-emerald-900 font-black' : 'bg-gray-100 text-gray-700'}`}>
                              {formatPct(c.pctRafael)}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 font-mono font-black text-amber-900 text-right">
                            +{formatNumber(c.potencialNew)}
                          </td>
                          <td className="py-3.5 px-4 bg-purple-50/40 border-l border-r border-purple-100">
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5 font-black text-purple-950 text-xs">
                                <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0"></span>
                                <span>{c.candidatoAlvo.nome}</span>
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-purple-200 text-purple-900 font-bold">
                                  {formatNumber(c.candidatoAlvo.votos)} v ({c.candidatoAlvo.cargo === 'deputado_federal' ? 'Federal' : 'Estadual'})
                                </span>
                              </div>
                              <p className="text-[11px] text-purple-900/80 leading-snug">
                                {c.candidatoAlvo.estrategiaCapitacao}
                              </p>
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 font-bold text-[11px] border border-blue-200 inline-block">
                              {c.acao}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}



          {/* ------------------------------------------------------------------- */}
          {/* ABA 7: METODOLOGIA & REGRAS OFICIAIS DE LEITURA */}
          {/* ------------------------------------------------------------------- */}
          {activeTab === 'metodologia' && (
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-200 shadow-sm space-y-6 max-w-4xl mx-auto">
              <div>
                <span className="px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-primary/10 text-primary">
                  Documentação Metodológica Oficial
                </span>
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-dark mt-2">
                  Metodologia e Regras de Leitura dos Resultados Eleitorais 2026
                </h3>
                <p className="text-xs sm:text-sm text-gray-500 mt-1">
                  Diretrizes analíticas de leitura estatística dos votos da causa animal em São Paulo (1º Turno).
                </p>
              </div>

              {/* CRITÉRIOS DE INCLUSÃO RIGOROSAMENTE SEPARADOS */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* CRITÉRIO 1: ATUAÇÃO */}
                  <div className="p-4 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-emerald-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Award className="w-4 h-4 text-emerald-600" />
                        Critério 1: Atuação Documentada
                      </h4>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                        25 Candidaturas
                      </span>
                    </div>
                    <p className="text-xs text-emerald-950 leading-relaxed font-medium">
                      <strong>Atuação/Campanha Animal Documentada:</strong> Candidatos com histórico verificável de resgates, criação de abrigos, ativismo anti-maus-tratos, frentes parlamentares ou projetos de lei específicos voltados ao bem-estar animal.
                    </p>
                    <div className="pt-2 border-t border-emerald-200/60 text-[11px] text-emerald-900 font-mono space-y-0.5">
                      <div>• 14 Estaduais (532.110 votos no Estado)</div>
                      <div>• 11 Federais (543.284 votos no Estado)</div>
                      <div className="text-[10px] text-emerald-700 mt-1 italic">
                        * Critério isolado e autônomo, sem mistura com compromissos de adesão.
                      </div>
                    </div>
                  </div>

                  {/* CRITÉRIO 2: ADESÃO PÚBLICA */}
                  <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                        Critério 2: Adesão Pública à Pauta
                      </h4>
                      <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-[10px] font-bold">
                        24 Candidaturas
                      </span>
                    </div>
                    <p className="text-xs text-indigo-950 leading-relaxed font-medium">
                      <strong>Adesão Pública à Pauta Animalista 2026:</strong> Candidaturas que assinaram ou subscreveram compromissos explícitos com metas de castração, vacinação em massa e hospital veterinário público (compromisso formal/programático).
                    </p>
                    <div className="pt-2 border-t border-indigo-200/60 text-[11px] text-indigo-900 font-mono space-y-0.5">
                      <div>• 9 Estaduais (695.626 votos no Estado)</div>
                      <div>• 15 Federais (870.228 votos no Estado)</div>
                      <div className="text-[10px] text-indigo-700 mt-1 italic">
                        * Não inferir histórico prático prévio; critério estritamente separado.
                      </div>
                    </div>
                  </div>

                  {/* CRITÉRIO 3: NOME DE URNA */}
                  <div className="p-4 bg-amber-50/60 rounded-2xl border border-amber-200 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-black text-amber-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <Users className="w-4 h-4 text-amber-600" />
                        Critério 3: Referência no Nome de Urna
                      </h4>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold">
                        9 Candidaturas
                      </span>
                    </div>
                    <p className="text-xs text-amber-950 leading-relaxed font-medium">
                      <strong>Referência Explícita no Nome de Urna:</strong> Termos explícitos no nome eleitoral registrado (ex: "Protetor", "Pet", "Veterinário") sem inferir histórico prévio de proteção animal.
                    </p>
                    <div className="pt-2 border-t border-amber-200/60 text-[11px] text-amber-900 font-mono space-y-0.5">
                      <div>• 5 Estaduais (15.527 votos no Estado)</div>
                      <div>• 4 Federais (5.284 votos no Estado)</div>
                      <div className="text-[10px] text-amber-700 mt-1 italic">
                        * Somente acrescido no Universo B.
                      </div>
                    </div>
                  </div>
                </div>

                {/* DEFINIÇÃO DOS UNIVERSOS CONSOLIDADOS */}
                <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-2">
                  <h4 className="font-black text-dark text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-primary" /> Universos Analíticos e Séries Históricas
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs text-gray-600">
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                      <span className="font-black text-dark block">Universo A (Consolidado: 49 cands)</span>
                      <p className="text-[11px] leading-relaxed">
                        União agregada das candidaturas com <strong>Atuação Documentada</strong> OU <strong>Adesão Pública</strong> (1.227.736 estaduais / 1.413.512 federais).
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                      <span className="font-black text-dark block">Universo B (Consolidado Geral: 58 cands)</span>
                      <p className="text-[11px] leading-relaxed">
                        Contém todo o Universo A e acrescenta as referências no nome de urna oficial (1.243.263 estaduais / 1.418.796 federais).
                      </p>
                    </div>
                    <div className="p-3 bg-white rounded-xl border border-gray-200 space-y-1">
                      <span className="font-black text-dark block">Recorte Anterior (25 cands)</span>
                      <p className="text-[11px] leading-relaxed">
                        Lista histórica dos 25 nomes analisados em eleições anteriores: 14 estaduais (532.110 votos) e 11 federais (543.284 votos).
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Regras de Leitura Obrigatórias */}
              <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3">
                <h4 className="font-black text-amber-950 text-xs uppercase tracking-wider flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  Regras Oficiais de Interpretação dos Dados
                </h4>
                <ul className="text-xs text-amber-950 space-y-2 list-disc pl-5 leading-relaxed">
                  <li className="text-emerald-950 font-bold bg-white/70 p-2 rounded-lg border border-emerald-300">
                    <strong>Separação Estrita dos Critérios:</strong> A adesão pública à pauta não é agrupada nem confundida com a atuação/campanha animal documentada. Cada critério possui natureza analítica distinta e pode ser consultado individualmente através do seletor analítico no topo da página.
                  </li>
                  <li>
                    <strong>Estes dados representam votos em candidaturas associadas à pauta animal:</strong> Não comprovam a motivação individual dos votos nem o número total de eleitores pró-causa animal no Estado.
                  </li>
                  <li>
                    <strong>Não somar Estadual e Federal como pessoas únicas:</strong> Cada eleitor vota em ambos os cargos. A soma de votos estaduais e federais duplicaria cidadãos.
                  </li>
                  <li>
                    <strong>Não somar Universo A + Universo B:</strong> O Universo B é um superconjunto que já contém todos os votos do Universo A.
                  </li>
                  <li>
                    <strong>Não somar Município, Zona, Bairro, Local e Seção:</strong> São representações agregadas em diferentes escalas espaciais dos mesmos votos. A Capital já integra o total dos 645 municípios.
                  </li>
                  <li>
                    <strong>Bairros correspondem ao local da escola de votação:</strong> Não refletem necessariamente o bairro de moradia do eleitor.
                  </li>
                  <li>
                    <strong>Cálculo de Percentuais Agregados:</strong> Sempre calculado pela divisão entre a soma de numeradores e a soma de denominadores (nunca média aritmética de percentuais).
                  </li>
                  <li>
                    <strong>Natureza Descritiva dos Rankings:</strong> Todas as tabelas e métricas possuem finalidade estritamente descritiva. Não constituem recomendação de targeting político ou persuasão eleitoral.
                  </li>
                </ul>
              </div>

              {/* Fontes Oficiais */}
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-600 space-y-1">
                <span className="font-bold text-dark">Fontes e Validação:</span>
                <p>
                  Tribunal Superior Eleitoral (TSE) - Eleições Gerais 2026 (1º Turno). Arquivos de votação por seção eleitoral e cadastro de locais de votação oficiais.
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DE STATUS E RECIBO DE IMPORTAÇÃO */}
      {/* ------------------------------------------------------------- */}
      {importStatusModal?.show && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                  importStatusModal.type === 'success'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {importStatusModal.type === 'success' ? (
                    <CheckCircle2 className="w-7 h-7" />
                  ) : (
                    <XCircle className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-black uppercase text-dark">{importStatusModal.title}</h3>
                  <p className="text-xs text-gray-500">{importStatusModal.message}</p>
                </div>
              </div>
              <button
                onClick={() => setImportStatusModal(null)}
                className="text-gray-400 hover:text-dark p-2 rounded-xl text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Lista de Erros (se houver) */}
            {importStatusModal.errors && importStatusModal.errors.length > 0 && (
              <div className="p-4 bg-red-50 rounded-2xl border border-red-200 space-y-2">
                <div className="text-xs font-black uppercase text-red-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Motivos do Bloqueio:
                </div>
                <ul className="text-xs text-red-700 space-y-1 list-disc pl-5 font-mono">
                  {importStatusModal.errors.map((err, i) => (
                    <li key={i}>{err}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recibo Rápido */}
            {importStatusModal.receipt && (
              <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 space-y-3 font-mono text-xs">
                <div className="font-bold text-dark uppercase flex items-center gap-2">
                  <FileCheck2 className="w-4 h-4 text-primary" /> Recibo de Conferência Oficial
                </div>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div>SHA-256: <span className="font-bold text-dark">{importStatusModal.receipt.checksum_sha256.slice(0, 16)}...</span></div>
                  <div>Eleitorado SP: <span className="font-bold text-dark">{formatNumber(importStatusModal.receipt.resumo.eleitorado_total_sp)}</span></div>
                  <div>Municípios: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_municipios} / 645</span></div>
                  <div>Zonas: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_zonas} / 57</span></div>
                  <div>Locais: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_locais} / 2.057</span></div>
                  <div>Bairros: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_bairros} / 899</span></div>
                  <div>Seções: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_secoes} / 26.683</span></div>
                  <div>Candidatos: <span className="font-bold text-dark">{importStatusModal.receipt.resumo.total_candidatos} / 58</span></div>
                  <div>Rafael Saraiva (SP): <span className="font-bold text-dark">{formatNumber(importStatusModal.receipt.resumo.rafael_saraiva_sp)}</span></div>
                  <div>Rafael Saraiva (Cap): <span className="font-bold text-dark">{formatNumber(importStatusModal.receipt.resumo.rafael_saraiva_capital)}</span></div>
                  <div>Nina Passadore (SP): <span className="font-bold text-dark">{formatNumber(importStatusModal.receipt.resumo.nina_passadore_sp)}</span></div>
                  <div>Nina Passadore (Cap): <span className="font-bold text-dark">{formatNumber(importStatusModal.receipt.resumo.nina_passadore_capital)}</span></div>
                </div>
              </div>
            )}

            <button
              onClick={() => setImportStatusModal(null)}
              className="w-full py-3 bg-dark hover:bg-slate-800 text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- */}
      {/* MODAL DO RECIBO OFICIAL COMPLETO */}
      {/* ------------------------------------------------------------- */}
      {showReceiptModal && receipt && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-100 text-green-800 flex items-center gap-1 w-max">
                  <ShieldCheck className="w-3.5 h-3.5" /> Recibo de Autenticidade & Reconciliação
                </span>
                <h3 className="text-xl font-black uppercase tracking-tight text-dark mt-2">
                  Recibo Oficial da Causa Animal SP 2026 (v2)
                </h3>
                <p className="text-xs text-gray-500">
                  Data de conferência: {new Date(receipt.data_importacao).toLocaleString('pt-BR')}
                </p>
              </div>
              <button
                onClick={() => setShowReceiptModal(false)}
                className="text-gray-400 hover:text-dark p-2 rounded-xl text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Checksum SHA-256 */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-gray-200 font-mono text-xs space-y-1">
              <span className="text-[10px] uppercase font-bold text-gray-400">Checksum Criptográfico SHA-256:</span>
              <div className="text-dark font-black break-all text-xs select-all">
                {receipt.checksum_sha256 || 'Calculado na importação'}
              </div>
            </div>

            {/* Tabela de Conferências */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-dark">
                Resultados das Conferências Oficiais (15 Verificações)
              </h4>
              <div className="border border-gray-200 rounded-2xl overflow-hidden divide-y divide-gray-100 text-xs">
                {receipt.conferencias.map(conf => (
                  <div key={conf.id} className="p-3 flex items-center justify-between gap-3 hover:bg-gray-50/50">
                    <div className="space-y-0.5">
                      <div className="font-bold text-dark flex items-center gap-1.5">
                        {conf.passou ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                        )}
                        <span>{conf.titulo}</span>
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono pl-5.5">
                        Esperado: {String(conf.esperado)} | Obtido: {String(conf.obtido)}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                      conf.passou ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {conf.passou ? 'Conferido' : 'Divergente'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <button
              onClick={() => setShowReceiptModal(false)}
              className="w-full py-3 bg-dark hover:bg-slate-800 text-white font-bold rounded-xl uppercase tracking-wider text-xs transition-all cursor-pointer"
            >
              Fechar Recibo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
