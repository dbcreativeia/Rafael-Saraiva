import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Sparkles
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

export type SubTabV2 = 'municipios' | 'zonas' | 'bairros' | 'locais' | 'secoes' | 'candidatos' | 'cruzamentos' | 'metodologia';
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

  // Estados para Cruzamento e Comparação Federal x Estadual
  const [crossPreset, setCrossPreset] = useState<'becari_paiol' | 'rafael_becari' | 'rafael_federal' | 'custom'>('becari_paiol');
  const [crossEstadualId, setCrossEstadualId] = useState<string>('250002545145'); // Dr. Edson da Paiol
  const [crossFederalId, setCrossFederalId] = useState<string>('250002544326'); // Felipe Becari
  const [crossViewMode, setCrossViewMode] = useState<'tabela_territorial' | 'ranking_covotacao'>('tabela_territorial');
  const [crossLevel, setCrossLevel] = useState<'municipios' | 'secoes'>('municipios');
  const [crossFilterMode, setCrossFilterMode] = useState<'todos' | 'equivalentes' | 'proximos' | 'ambos_positivos'>('todos');
  const [crossSearchTerm, setCrossSearchTerm] = useState<string>('');
  const [crossPage, setCrossPage] = useState<number>(1);
  const crossPageSize = 50;

  // Hierarchical navigation Capital (Zona -> Local -> Seções)
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
      const res = await fetch(`/api/causa-animal/status?_t=${Date.now()}`);
      if (res.ok) {
        const status = await res.json();
        if (status.hasData) {
          // Fetch full data from server
          const dataRes = await fetch(`/api/causa-animal/full?_t=${Date.now()}`);
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
    if (data?.bases?.locais?.registros) {
      data.bases.locais.registros.forEach(l => {
        const id = l.local_id || `${l.zona}:${l.local || l.numero_local}`;
        map.set(id, l);
      });
    }
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
        const q = candidateSearchTerm.toLowerCase();
        const match =
          cand.nome_urna?.toLowerCase().includes(q) ||
          cand.nome?.toLowerCase().includes(q) ||
          cand.nome_civil?.toLowerCase().includes(q) ||
          cand.numero?.includes(q) ||
          cand.partido?.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [data, candidateCargoFilter, candidateCriterionFilter, candidateSearchTerm]);

  // Candidatos selecionados no comparador cruzado
  const crossEstadualCand = useMemo(() => {
    return candidatosEstaduais.find(c => String(c.id) === String(crossEstadualId)) || null;
  }, [candidatosEstaduais, crossEstadualId]);

  const crossFederalCand = useMemo(() => {
    return candidatosFederais.find(c => String(c.id) === String(crossFederalId)) || null;
  }, [candidatosFederais, crossFederalId]);

  // Estatísticas comparativas Federal x Estadual
  const crossComparisonStats = useMemo(() => {
    const estIdx = mapEstadual[crossEstadualId];
    const fedIdx = mapFederal[crossFederalId];

    if (estIdx === undefined || fedIdx === undefined) {
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
      const vEst = m.cargos?.deputado_estadual?.votos_candidatos?.[estIdx] || 0;
      const vFed = m.cargos?.deputado_federal?.votos_candidatos?.[fedIdx] || 0;
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
      const vEst = s.cargos?.deputado_estadual?.votos_candidatos?.[estIdx] || 0;
      const vFed = s.cargos?.deputado_federal?.votos_candidatos?.[fedIdx] || 0;
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
  }, [data, crossEstadualId, crossFederalId, mapEstadual, mapFederal, locaisMap]);

  // Ranking de Co-votação: Quem votou no Estadual X votou em quem para Federal?
  const coVotingStats = useMemo(() => {
    const estIdx = mapEstadual[crossEstadualId];
    if (estIdx === undefined) return [];

    const fedTotalsInSecoes: Record<string, number> = {};
    const fedTotalsInMun: Record<string, number> = {};
    candidatosFederais.forEach(c => {
      fedTotalsInSecoes[c.id] = 0;
      fedTotalsInMun[c.id] = 0;
    });

    let totalEstadualVotosCapital = 0;
    let totalEstadualVotosEstado = 0;

    (data?.bases?.secoes?.registros || []).forEach(s => {
      const vEst = s.cargos?.deputado_estadual?.votos_candidatos?.[estIdx] || 0;
      if (vEst > 0) {
        totalEstadualVotosCapital += vEst;
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
      const vEst = m.cargos?.deputado_estadual?.votos_candidatos?.[estIdx] || 0;
      if (vEst > 0) {
        totalEstadualVotosEstado += vEst;
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

    return candidatosFederais.map(fed => {
      const vSec = fedTotalsInSecoes[fed.id] || 0;
      const vMun = fedTotalsInMun[fed.id] || 0;
      return {
        candidato: fed,
        votosCapitalNasUrnasDoEstadual: vSec,
        votosEstadoNasCidadesDoEstadual: vMun,
        pctSobreVotosCapitalDoEstadual: totalEstadualVotosCapital > 0 ? (vSec / totalEstadualVotosCapital) : 0,
      };
    }).sort((a, b) => b.votosCapitalNasUrnasDoEstadual - a.votosCapitalNasUrnasDoEstadual);
  }, [data, crossEstadualId, candidatosFederais, mapEstadual, mapFederal]);

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
          const res = await fetch('/api/causa-animal/import', {
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
      await fetch('/api/causa-animal/clear', { method: 'DELETE' });
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
    if (!data?.bases?.municipios?.registros) return [];
    let list = [...data.bases.municipios.registros];
    const term = searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(m => {
        const top = getTopCandidatesForRecord(m);
        return (
          (m.municipio && m.municipio.toLowerCase().includes(term)) ||
          (m.codigo_tse && String(m.codigo_tse).includes(term)) ||
          (top.topEst.cand?.nome_urna && top.topEst.cand.nome_urna.toLowerCase().includes(term)) ||
          (top.topFed.cand?.nome_urna && top.topFed.cand.nome_urna.toLowerCase().includes(term))
        );
      });
    }

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

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 2. ZONAS DA CAPITAL (57)
  const processedZonas = useMemo(() => {
    if (!data?.bases?.zonas?.registros) return [];
    let list = [...data.bases.zonas.registros];
    const term = searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(z => {
        const top = getTopCandidatesForRecord(z);
        return (
          (z.nome && z.nome.toLowerCase().includes(term)) ||
          (z.zona && String(z.zona).includes(term)) ||
          (top.topEst.cand?.nome_urna && top.topEst.cand.nome_urna.toLowerCase().includes(term)) ||
          (top.topFed.cand?.nome_urna && top.topFed.cand.nome_urna.toLowerCase().includes(term))
        );
      });
    }

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

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 3. BAIRROS DOS LOCAIS (899)
  const processedBairros = useMemo(() => {
    if (!data?.bases?.bairros?.registros) return [];
    let list = [...data.bases.bairros.registros];
    const term = searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(b => {
        const top = getTopCandidatesForRecord(b);
        return (
          (b.bairro && b.bairro.toLowerCase().includes(term)) ||
          (top.topEst.cand?.nome_urna && top.topEst.cand.nome_urna.toLowerCase().includes(term)) ||
          (top.topFed.cand?.nome_urna && top.topFed.cand.nome_urna.toLowerCase().includes(term))
        );
      });
    }

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

    return list;
  }, [data, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 4. LOCAIS DE VOTAÇÃO (2.057)
  const processedLocais = useMemo(() => {
    if (!data?.bases?.locais?.registros) return [];
    let list = [...data.bases.locais.registros];
    const term = searchTerm.toLowerCase().trim();

    if (navZona) {
      const padZ = navZona.padStart(4, '0');
      list = list.filter(l => String(l.zona).padStart(4, '0') === padZ);
    }

    if (term) {
      list = list.filter(l => {
        const top = getTopCandidatesForRecord(l);
        return (
          (l.nome && l.nome.toLowerCase().includes(term)) ||
          (l.bairro && l.bairro.toLowerCase().includes(term)) ||
          (l.endereco && l.endereco.toLowerCase().includes(term)) ||
          (l.zona && String(l.zona).includes(term)) ||
          (l.local && String(l.local).includes(term)) ||
          (top.topEst.cand?.nome_urna && top.topEst.cand.nome_urna.toLowerCase().includes(term)) ||
          (top.topFed.cand?.nome_urna && top.topFed.cand.nome_urna.toLowerCase().includes(term))
        );
      });
    }

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

    return list;
  }, [data, navZona, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId]);

  // 5. SEÇÕES ELEITORAIS (26.683) - Virtualized / Paginated
  const processedSecoes = useMemo(() => {
    if (!data?.bases?.secoes?.registros) return [];
    let list = [...data.bases.secoes.registros];
    const term = searchTerm.toLowerCase().trim();

    if (navZona) {
      const padZ = navZona.padStart(4, '0');
      list = list.filter(s => String(s.zona).padStart(4, '0') === padZ);
    }

    if (navLocalId) {
      list = list.filter(s => s.local_id === navLocalId);
    }

    if (term) {
      list = list.filter(s => {
        const local = locaisMap.get(s.local_id || `${s.zona}:${s.local}`);
        const top = getTopCandidatesForRecord(s);
        return (
          (s.secao && String(s.secao).includes(term)) ||
          (s.local_id && s.local_id.toLowerCase().includes(term)) ||
          (local?.nome && local.nome.toLowerCase().includes(term)) ||
          (local?.bairro && local.bairro.toLowerCase().includes(term)) ||
          (local?.endereco && local.endereco.toLowerCase().includes(term)) ||
          (top.topEst.cand?.nome_urna && top.topEst.cand.nome_urna.toLowerCase().includes(term)) ||
          (top.topFed.cand?.nome_urna && top.topFed.cand.nome_urna.toLowerCase().includes(term))
        );
      });
    }

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

    return list;
  }, [data, navZona, navLocalId, searchTerm, sortBy, selectedCargo, selectedUniverse, selectedCandidateId, locaisMap]);

  // Resumos de liderança calculados para cada nível territorial
  const municipiosLeadership = useMemo(() => {
    return computeLeadershipSummary(data?.bases?.municipios?.registros || []);
  }, [data, selectedUniverse, criteriaIndices]);

  const zonasLeadership = useMemo(() => {
    return computeLeadershipSummary(data?.bases?.zonas?.registros || []);
  }, [data, selectedUniverse, criteriaIndices]);

  const bairrosLeadership = useMemo(() => {
    return computeLeadershipSummary(data?.bases?.bairros?.registros || []);
  }, [data, selectedUniverse, criteriaIndices]);

  const locaisLeadership = useMemo(() => {
    return computeLeadershipSummary(data?.bases?.locais?.registros || []);
  }, [data, selectedUniverse, criteriaIndices]);

  const secoesLeadership = useMemo(() => {
    if (activeTab !== 'secoes') return { topEstLeaders: [], topFedLeaders: [], totalRecords: 0 };
    return computeLeadershipSummary(data?.bases?.secoes?.registros || []);
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
                    setCrossEstadualId('250002545145'); // Dr. Edson da Paiol
                    setCrossFederalId('250002544326'); // Felipe Becari
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
                    setCrossEstadualId('250002533758'); // Rafael Saraiva
                    setCrossFederalId('250002544326'); // Felipe Becari
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
                    setCrossEstadualId('250002533758'); // Rafael Saraiva
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
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-200/70 space-y-1.5 text-xs">
                    <div className="p-2.5 bg-white rounded-xl border border-gray-100 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between font-bold text-dark">
                        <span>1º Profa. Luciene Cavalcante:</span>
                        <span className="font-mono font-black text-purple-950">53.542 votos Capital</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-dark">
                        <span>2º Delegado Bruno Lima:</span>
                        <span className="font-mono font-black text-purple-950">49.609 votos Capital</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-dark">
                        <span>3º Felipe Becari:</span>
                        <span className="font-mono font-black text-purple-950">42.053 votos Capital</span>
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

                {/* Seletores de Candidatos */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-blue-900 mb-1 flex items-center gap-1">
                      <Vote className="w-3.5 h-3.5 text-blue-600" />
                      Candidato(a) Estadual (28)
                    </label>
                    <select
                      value={crossEstadualId}
                      onChange={(e) => {
                        setCrossEstadualId(e.target.value);
                        setCrossPreset('custom');
                        setCrossPage(1);
                      }}
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-dark outline-none focus:border-primary"
                    >
                      {candidatosEstaduais.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.numero} - {c.nome_urna} ({c.partido}) [{formatNumber(c.votos_validos_SP || 0)} votos]
                        </option>
                      ))}
                    </select>
                  </div>

                  {crossViewMode === 'tabela_territorial' && (
                    <div>
                      <label className="block text-[11px] font-black uppercase tracking-wider text-purple-900 mb-1 flex items-center gap-1">
                        <Vote className="w-3.5 h-3.5 text-purple-600" />
                        Candidato(a) Federal (30)
                      </label>
                      <select
                        value={crossFederalId}
                        onChange={(e) => {
                          setCrossFederalId(e.target.value);
                          setCrossPreset('custom');
                          setCrossPage(1);
                        }}
                        className="w-full px-3 py-2 bg-white border border-gray-200 rounded-xl font-bold text-dark outline-none focus:border-purple-600"
                      >
                        {candidatosFederais.map(c => (
                          <option key={c.id} value={c.id}>
                            {c.numero} - {c.nome_urna} ({c.partido}) [{formatNumber(c.votos_validos_SP || 0)} votos]
                          </option>
                        ))}
                      </select>
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
                          className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-dark outline-none"
                        >
                          <option value="municipios">Municípios (645)</option>
                          <option value="secoes">Seções Capital (26.683)</option>
                        </select>
                        <select
                          value={crossFilterMode}
                          onChange={(e) => { setCrossFilterMode(e.target.value as any); setCrossPage(1); }}
                          className="px-2.5 py-2 bg-gray-50 border border-gray-200 rounded-xl font-bold text-dark outline-none text-[11px]"
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
                        Votos Totais: <strong className="text-blue-900">{crossEstadualCand?.nome_urna}: {formatNumber(crossComparisonStats.totalEstadual)}</strong> x <strong className="text-purple-900">{crossFederalCand?.nome_urna}: {formatNumber(crossComparisonStats.totalFederal)}</strong>
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
                              const q = crossSearchTerm.toLowerCase();
                              if (crossLevel === 'municipios') {
                                const mRow = row as any;
                                if (!mRow.nome?.toLowerCase().includes(q) && !String(mRow.codigo).includes(q)) return false;
                              } else {
                                const sRow = row as any;
                                if (!sRow.secao?.includes(q) && !sRow.zona?.includes(q) && !sRow.localNome?.toLowerCase().includes(q)) return false;
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
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden space-y-4 p-5">
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pb-3 border-b border-gray-100 text-xs">
                    <div>
                      <h4 className="font-black text-dark text-sm uppercase">
                        Votos para Deputado Federal nas Urnas de {crossEstadualCand?.nome_urna} ({crossEstadualCand?.numero} - {crossEstadualCand?.partido})
                      </h4>
                      <p className="text-gray-500 mt-0.5">
                        Apuração da co-presença de votos nas seções eleitorais da Capital e municípios onde o candidato estadual pontuou.
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 font-black uppercase text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-3 w-14">#</th>
                          <th className="py-3 px-4">Candidato Federal</th>
                          <th className="py-3 px-3">Número</th>
                          <th className="py-3 px-3">Partido</th>
                          <th className="py-3 px-4 text-right">Votos nas Urnas da Capital</th>
                          <th className="py-3 px-4 text-right">Votos nas Cidades do Estado</th>
                          <th className="py-3 px-4">Critério da Causa Animal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 font-medium">
                        {coVotingStats.map((item, idx) => {
                          const critLabel = getCandidateCriterionLabel(item.candidato);
                          const critType = getCandidateCriterion(item.candidato);
                          const isBecari = item.candidato.id === '250002544326';
                          return (
                            <tr
                              key={item.candidato.id}
                              className={`hover:bg-purple-50/30 transition-colors ${idx < 3 ? 'bg-purple-50/20 font-bold' : ''} ${isBecari ? 'ring-1 ring-amber-300 bg-amber-50/30' : ''}`}
                            >
                              <td className="py-3 px-3 text-gray-400 font-mono text-[11px]">{idx + 1}</td>
                              <td className="py-3 px-4 font-black text-dark flex items-center gap-2">
                                <span>{item.candidato.nome_urna}</span>
                                {idx === 0 && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-400 text-slate-950 font-black">
                                    1º MAIS VOTADO
                                  </span>
                                )}
                                {isBecari && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-purple-600 text-white font-black">
                                    BECARI
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono font-bold text-gray-700">{item.candidato.numero}</td>
                              <td className="py-3 px-3 font-bold text-gray-500">{item.candidato.partido}</td>
                              <td className="py-3 px-4 text-right font-black font-mono text-purple-950 text-sm">
                                {formatNumber(item.votosCapitalNasUrnasDoEstadual)}
                              </td>
                              <td className="py-3 px-4 text-right font-black font-mono text-dark text-sm">
                                {formatNumber(item.votosEstadoNasCidadesDoEstadual)}
                              </td>
                              <td className="py-3 px-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  critType === 'adesao'
                                    ? 'bg-indigo-50 text-indigo-700'
                                    : critType === 'urna'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-emerald-50 text-emerald-700'
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
              )}

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
