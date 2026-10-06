import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  UploadCloud,
  FileCheck2,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Search,
  Download,
  Trash2,
  ExternalLink,
  Info,
  Server,
  Database,
  Building2,
  MapPin,
  Vote,
  School,
  FileText,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  HelpCircle,
  Eye,
  SlidersHorizontal,
  Flame,
  PieChart as PieChartIcon
} from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend
} from 'recharts';
import { CruzamentoLeadsVotos } from './CruzamentoLeadsVotos';

export interface ElectoralResultsJSON {
  versao?: number;
  percentuais?: string;
  bases: {
    municipios?: {
      campos?: Array<{ campo: string; cabecalho_original: string; coluna_excel?: number; unidade?: string }>;
      registros: any[];
      totais_originais?: any[];
      notas_originais?: any[];
      total_registros_arquivo_completo?: number;
    };
    zonas?: {
      campos?: Array<{ campo: string; cabecalho_original: string; coluna_excel?: number; unidade?: string }>;
      registros: any[];
      totais_originais?: any[];
      notas_originais?: any[];
      total_registros_arquivo_completo?: number;
    };
    bairros?: {
      campos?: Array<{ campo: string; cabecalho_original: string; coluna_excel?: number; unidade?: string }>;
      registros: any[];
      totais_originais?: any[];
      notas_originais?: any[];
      total_registros_arquivo_completo?: number;
    };
    locais?: {
      campos?: Array<{ campo: string; cabecalho_original: string; coluna_excel?: number; unidade?: string }>;
      registros: any[];
      totais_originais?: any[];
      notas_originais?: any[];
      total_registros_arquivo_completo?: number;
    };
  };
  fontes_e_metodo?: {
    arquivo_origem?: string;
    aba_origem?: string;
    linhas?: Array<{ linha_excel: number; celulas: any[] }>;
  };
  validacao_origem?: string;
  somente_amostra_de_estrutura?: boolean;
}

const EXPECTED_COUNTS = {
  municipios: 645,
  zonas: 57,
  bairros: 899,
  locais: 2057
};

type BaseType = 'municipios' | 'zonas' | 'bairros' | 'locais' | 'cruzamento' | 'fontes';

interface Props {
  refreshTrigger?: number;
}

export const ResultadosEleitoraisTab: React.FC<Props> = ({ refreshTrigger }) => {
  const [data, setData] = useState<ElectoralResultsJSON | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isServerSynced, setIsServerSynced] = useState<boolean>(false);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [activeBase, setActiveBase] = useState<BaseType>('municipios');

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [candidateFilter, setCandidateFilter] = useState<'all' | 'rafael' | 'nina'>('all');
  const [sortBy, setSortBy] = useState<string>('rafael_votos_desc');
  const [zonaFilter, setZonaFilter] = useState<string>('');
  const [bairroFilter, setBairroFilter] = useState<string>('');
  const [showCharts, setShowCharts] = useState<boolean>(true);

  // Pagination
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Import / Validation Status Modal
  const [importStatus, setImportStatus] = useState<{
    show: boolean;
    type: 'success' | 'warning' | 'error';
    title: string;
    message: string;
    details?: string[];
    divergences?: string[];
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch from server on mount or refresh
  const fetchData = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/eleicoes/resultados?_t=${Date.now()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.hasData && json.data) {
          setData(json.data);
          setIsServerSynced(true);
          setLastUpdated(json.importedAt || null);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch election results from server:", e);
    }

    // Fallback to localStorage if offline/not persisted on server yet
    try {
      const local = localStorage.getItem('electoral_results_cache');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed?.bases) {
          setData(parsed);
          setIsServerSynced(false);
          setLastUpdated(localStorage.getItem('electoral_results_cache_date') || null);
        }
      }
    } catch (e) {
      console.error("Local parse error:", e);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData(!!data);
  }, [refreshTrigger]);

  // Handle file reading and strict validation without sending content to Gemini
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const content = e.target?.result as string;
        let parsed: any;
        try {
          parsed = JSON.parse(content);
        } catch (err: any) {
          setImportStatus({
            show: true,
            type: 'error',
            title: 'Arquivo JSON inválido',
            message: 'O arquivo selecionado não contém um JSON válido: ' + err.message
          });
          return;
        }

        // Validate structure
        if (!parsed || typeof parsed !== 'object' || !parsed.bases) {
          setImportStatus({
            show: true,
            type: 'error',
            title: 'Estrutura Inválida',
            message: 'O arquivo JSON não contém a chave principal "bases". Verifique se o arquivo segue o formato de resultados eleitorais.'
          });
          return;
        }

        const counts = {
          municipios: Array.isArray(parsed.bases?.municipios?.registros) ? parsed.bases.municipios.registros.length : 0,
          zonas: Array.isArray(parsed.bases?.zonas?.registros) ? parsed.bases.zonas.registros.length : 0,
          bairros: Array.isArray(parsed.bases?.bairros?.registros) ? parsed.bases.bairros.registros.length : 0,
          locais: Array.isArray(parsed.bases?.locais?.registros) ? parsed.bases.locais.registros.length : 0,
        };

        const divergences: string[] = [];
        if (counts.municipios !== EXPECTED_COUNTS.municipios) {
          divergences.push(`Municípios: ${counts.municipios} registros carregados (esperado: ${EXPECTED_COUNTS.municipios})`);
        }
        if (counts.zonas !== EXPECTED_COUNTS.zonas) {
          divergences.push(`Zonas Eleitorais: ${counts.zonas} registros carregados (esperado: ${EXPECTED_COUNTS.zonas})`);
        }
        if (counts.bairros !== EXPECTED_COUNTS.bairros) {
          divergences.push(`Bairros dos Locais: ${counts.bairros} registros carregados (esperado: ${EXPECTED_COUNTS.bairros})`);
        }
        if (counts.locais !== EXPECTED_COUNTS.locais) {
          divergences.push(`Locais de Votação: ${counts.locais} registros carregados (esperado: ${EXPECTED_COUNTS.locais})`);
        }

        const isSample = parsed.somente_amostra_de_estrutura === true || (counts.municipios === 1 && counts.zonas === 1);

        // Send to server to persist for all visitors
        let serverSaved = false;
        try {
          const res = await fetch('/api/eleicoes/import', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(parsed)
          });
          if (res.ok) {
            const resData = await res.json();
            serverSaved = !!resData.isPersistent;
          }
        } catch (serverErr) {
          console.warn("Could not save to backend server:", serverErr);
        }

        // Also save to localStorage as backup
        try {
          localStorage.setItem('electoral_results_cache', JSON.stringify(parsed));
          localStorage.setItem('electoral_results_cache_date', new Date().toISOString());
        } catch (e) {
          console.warn("LocalStorage quota exceeded or error:", e);
        }

        setData(parsed);
        setIsServerSynced(serverSaved);
        const importTime = new Date().toLocaleString('pt-BR');
        setLastUpdated(importTime);

        if (divergences.length > 0) {
          setImportStatus({
            show: true,
            type: 'warning',
            title: isSample ? 'Amostra de Estrutura Carregada' : 'Importação Concluída com Divergências de Contagem',
            message: isSample
              ? 'Arquivo identificado como amostra de estrutura (contém 1 registro por base para demonstração). Quando estiver com o arquivo completo com todas as 4 bases, basta importar novamente.'
              : 'Os dados foram carregados, porém as contagens de registros diferem das metas oficiais esperadas:',
            divergences,
            details: [
              `Persistência no servidor: ${serverSaved ? 'Ativa (compartilhada com todos os visitantes)' : 'Local'}`,
              `Municípios: ${counts.municipios}`,
              `Zonas: ${counts.zonas}`,
              `Bairros: ${counts.bairros}`,
              `Locais: ${counts.locais}`
            ]
          });
        } else {
          setImportStatus({
            show: true,
            type: 'success',
            title: 'Base Eleitoral Importada com Sucesso!',
            message: `Todas as 4 bases foram validadas com exatidão (${counts.municipios} municípios, ${counts.zonas} zonas, ${counts.bairros} bairros e ${counts.locais} locais).`,
            details: [
              `Persistência: ${serverSaved ? 'Salva no servidor e disponível para todos os visitantes' : 'Salva localmente'}`,
              `Horário: ${importTime}`
            ]
          });
        }
      } catch (err: any) {
        setImportStatus({
          show: true,
          type: 'error',
          title: 'Erro ao processar arquivo',
          message: err.message || 'Falha desconhecida ao ler o arquivo JSON.'
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
    if (!window.confirm("Deseja realmente remover os dados eleitorais importados do servidor e do navegador?")) {
      return;
    }
    try {
      await fetch('/api/eleicoes/clear', { method: 'DELETE' });
    } catch (e) {
      console.warn("Clear error:", e);
    }
    try {
      localStorage.removeItem('electoral_results_cache');
      localStorage.removeItem('electoral_results_cache_date');
    } catch {}
    setData(null);
    setLastUpdated(null);
    setIsServerSynced(false);
    setImportStatus({
      show: true,
      type: 'success',
      title: 'Dados Limpos',
      message: 'A base de dados eleitorais foi removida com sucesso.'
    });
  };

  // Base counts
  const currentCounts = useMemo(() => {
    if (!data?.bases) return { municipios: 0, zonas: 0, bairros: 0, locais: 0 };
    return {
      municipios: data.bases.municipios?.registros?.length || 0,
      zonas: data.bases.zonas?.registros?.length || 0,
      bairros: data.bases.bairros?.registros?.length || 0,
      locais: data.bases.locais?.registros?.length || 0,
    };
  }, [data]);

  // Formatters
  const formatNumber = (val: number | null | undefined) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return new Intl.NumberFormat('pt-BR').format(val);
  };

  const formatPercent = (val: number | null | undefined, decimals = 2) => {
    if (val === null || val === undefined || isNaN(val)) return '-';
    return (val * 100).toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: Math.max(decimals, 3)
    }) + '%';
  };

  // Get raw records for active base
  const rawRecords = useMemo(() => {
    if (!data?.bases) return [];
    if (activeBase === 'municipios') return data.bases.municipios?.registros || [];
    if (activeBase === 'zonas') return data.bases.zonas?.registros || [];
    if (activeBase === 'bairros') return data.bases.bairros?.registros || [];
    if (activeBase === 'locais') return data.bases.locais?.registros || [];
    return [];
  }, [data, activeBase]);

  // Extract unique zonas and bairros for select filters
  const availableZonas = useMemo(() => {
    if (!data?.bases) return [];
    const set = new Set<string>();
    if (data.bases.zonas?.registros) {
      data.bases.zonas.registros.forEach(r => {
        if (r.nome_da_zona_regiao) set.add(r.nome_da_zona_regiao);
      });
    }
    if (data.bases.locais?.registros) {
      data.bases.locais.registros.forEach(r => {
        if (r.nome_da_zona) set.add(r.nome_da_zona);
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const availableBairros = useMemo(() => {
    if (!data?.bases) return [];
    const set = new Set<string>();
    if (data.bases.bairros?.registros) {
      data.bases.bairros.registros.forEach(r => {
        if (r.bairro_cadastrado_do_local) set.add(r.bairro_cadastrado_do_local);
      });
    }
    if (data.bases.locais?.registros) {
      data.bases.locais.registros.forEach(r => {
        if (r.bairro_do_local) set.add(r.bairro_do_local);
      });
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  // Filtered & Sorted records
  const processedRecords = useMemo(() => {
    let list = [...rawRecords];
    const term = searchTerm.toLowerCase().trim();

    if (term) {
      list = list.filter(item => {
        if (activeBase === 'municipios') {
          return (
            (item.municipio && String(item.municipio).toLowerCase().includes(term)) ||
            (item.codigo_tse && String(item.codigo_tse).toLowerCase().includes(term))
          );
        }
        if (activeBase === 'zonas') {
          return (
            (item.nome_da_zona_regiao && String(item.nome_da_zona_regiao).toLowerCase().includes(term)) ||
            (item.zona_eleitoral && String(item.zona_eleitoral).toLowerCase().includes(term))
          );
        }
        if (activeBase === 'bairros') {
          return (
            item.bairro_cadastrado_do_local && String(item.bairro_cadastrado_do_local).toLowerCase().includes(term)
          );
        }
        if (activeBase === 'locais') {
          return (
            (item.escola_local_de_votacao && String(item.escola_local_de_votacao).toLowerCase().includes(term)) ||
            (item.bairro_do_local && String(item.bairro_do_local).toLowerCase().includes(term)) ||
            (item.endereco && String(item.endereco).toLowerCase().includes(term)) ||
            (item.nome_da_zona && String(item.nome_da_zona).toLowerCase().includes(term)) ||
            (item.codigo_do_local && String(item.codigo_do_local).toLowerCase().includes(term)) ||
            (item.zona_eleitoral && String(item.zona_eleitoral).toLowerCase().includes(term))
          );
        }
        return true;
      });
    }

    // Specific filters for bairros/locais
    if (zonaFilter && (activeBase === 'locais' || activeBase === 'zonas')) {
      list = list.filter(item => {
        if (activeBase === 'zonas') return item.nome_da_zona_regiao === zonaFilter || item.zona_eleitoral === zonaFilter;
        if (activeBase === 'locais') return item.nome_da_zona === zonaFilter || item.zona_eleitoral === zonaFilter;
        return true;
      });
    }

    if (bairroFilter && (activeBase === 'locais' || activeBase === 'bairros')) {
      list = list.filter(item => {
        if (activeBase === 'bairros') return item.bairro_cadastrado_do_local === bairroFilter;
        if (activeBase === 'locais') return item.bairro_do_local === bairroFilter;
        return true;
      });
    }

    // Sorting
    list.sort((a, b) => {
      switch (sortBy) {
        case 'rafael_votos_desc':
          return (b.rafael_votos || 0) - (a.rafael_votos || 0);
        case 'rafael_validos_desc':
          return (b.rafael_validos || 0) - (a.rafael_validos || 0);
        case 'nina_votos_desc':
          return (b.nina_votos || 0) - (a.nina_votos || 0);
        case 'nina_validos_desc':
          return (b.nina_validos || 0) - (a.nina_validos || 0);
        case 'eleitores_desc':
          return (b.eleitores_aptos || 0) - (a.eleitores_aptos || 0);
        case 'nome_asc': {
          const nameA = a.municipio || a.nome_da_zona_regiao || a.bairro_cadastrado_do_local || a.escola_local_de_votacao || '';
          const nameB = b.municipio || b.nome_da_zona_regiao || b.bairro_cadastrado_do_local || b.escola_local_de_votacao || '';
          return String(nameA).localeCompare(String(nameB));
        }
        case 'abstencao_asc':
          return (a.abstencao || 0) - (b.abstencao || 0);
        default:
          return 0;
      }
    });

    return list;
  }, [rawRecords, searchTerm, sortBy, zonaFilter, bairroFilter, activeBase]);

  // Aggregated totals of the currently filtered view
  // Rule: Percentuais agregados devem usar soma dos numeradores dividida pela soma dos denominadores
  const aggregatedTotals = useMemo(() => {
    let sumEleitores = 0;
    let sumRafaelVotos = 0;
    let sumNinaVotos = 0;
    let sumValidosEstadual = 0;
    let sumValidosFederal = 0;
    let sumComparecimento = 0;
    let sumLocaisVotacao = 0;
    let sumSecoes = 0;

    processedRecords.forEach(r => {
      sumEleitores += Number(r.eleitores_aptos || 0);
      sumRafaelVotos += Number(r.rafael_votos || 0);
      sumNinaVotos += Number(r.nina_votos || 0);
      sumValidosEstadual += Number(r.validos_estadual || 0);
      sumValidosFederal += Number(r.validos_federal || 0);
      sumComparecimento += Number(r.comparecimento || 0);
      sumLocaisVotacao += Number(r.locais_de_votacao || (activeBase === 'locais' ? 1 : 0));
      sumSecoes += Number(r.secoes_cadastradas || 0);
    });

    const pctRafaelValidos = sumValidosEstadual > 0 ? sumRafaelVotos / sumValidosEstadual : 0;
    const pctNinaValidos = sumValidosFederal > 0 ? sumNinaVotos / sumValidosFederal : 0;
    const pctAbstencao = sumEleitores > 0 && sumComparecimento > 0 ? 1 - (sumComparecimento / sumEleitores) : 0;

    return {
      count: processedRecords.length,
      sumEleitores,
      sumRafaelVotos,
      sumNinaVotos,
      sumValidosEstadual,
      sumValidosFederal,
      sumComparecimento,
      sumLocaisVotacao,
      sumSecoes,
      pctRafaelValidos,
      pctNinaValidos,
      pctAbstencao
    };
  }, [processedRecords, activeBase]);

  // Original official totals if present in base JSON
  const originalTotals = useMemo(() => {
    if (!data?.bases) return null;
    const baseObj = data.bases[activeBase as keyof typeof data.bases] as any;
    if (baseObj?.totais_originais && baseObj.totais_originais.length > 0) {
      return baseObj.totais_originais[0].valores;
    }
    return null;
  }, [data, activeBase]);

  // Chart data (Top 15 items by selected criteria)
  const chartData = useMemo(() => {
    return processedRecords.slice(0, 15).map(item => {
      let name = '';
      if (activeBase === 'municipios') name = item.municipio || '';
      else if (activeBase === 'zonas') name = item.nome_da_zona_regiao || item.zona_eleitoral || '';
      else if (activeBase === 'bairros') name = item.bairro_cadastrado_do_local || '';
      else if (activeBase === 'locais') name = (item.escola_local_de_votacao || '').slice(0, 20);

      return {
        name,
        fullName: item.municipio || item.nome_da_zona_regiao || item.bairro_cadastrado_do_local || item.escola_local_de_votacao,
        rafaelVotos: item.rafael_votos || 0,
        ninaVotos: item.nina_votos || 0,
        rafaelPct: (item.rafael_validos || 0) * 100,
        ninaPct: (item.nina_validos || 0) * 100,
        eleitores: item.eleitores_aptos || 0
      };
    });
  }, [processedRecords, activeBase]);

  // Paginated records
  const paginatedRecords = useMemo(() => {
    if (pageSize === -1) return processedRecords;
    const start = (currentPage - 1) * pageSize;
    return processedRecords.slice(start, start + pageSize);
  }, [processedRecords, currentPage, pageSize]);

  const totalPages = pageSize === -1 ? 1 : Math.ceil(processedRecords.length / pageSize);

  // Reset page when base or filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeBase, searchTerm, zonaFilter, bairroFilter, sortBy, candidateFilter]);

  // Export to Excel (XLSX)
  const handleExportXLSX = () => {
    if (processedRecords.length === 0) {
      alert("Nenhum registro para exportar.");
      return;
    }

    const exportRows = processedRecords.map(r => {
      const row: any = {};
      if (activeBase === 'municipios') {
        row['Código TSE'] = r.codigo_tse;
        row['Município'] = r.municipio;
        row['Eleitores Aptos'] = r.eleitores_aptos;
        row['% do Eleitorado'] = formatPercent(r.do_eleitorado);
        row['Rafael Saraiva (Votos)'] = r.rafael_votos;
        row['Rafael Saraiva (% Válidos Estadual)'] = formatPercent(r.rafael_validos);
        row['Nina Passadore (Votos)'] = r.nina_votos;
        row['Nina Passadore (% Válidos Federal)'] = formatPercent(r.nina_validos);
        row['Válidos Estadual'] = r.validos_estadual;
        row['Válidos Federal'] = r.validos_federal;
        row['Fonte Votos Rafael'] = r.fonte_votos_rafael;
        row['Fonte Votos Nina'] = r.fonte_votos_nina_e_eleitores;
        row['Atualização TSE'] = r.atualizacao_tse;
      } else if (activeBase === 'zonas') {
        row['Zona Eleitoral'] = r.zona_eleitoral;
        row['Nome da Zona / Região'] = r.nome_da_zona_regiao;
        row['Eleitores Aptos'] = r.eleitores_aptos;
        row['% do Eleitorado'] = formatPercent(r.do_eleitorado);
        row['Rafael Saraiva (Votos)'] = r.rafael_votos;
        row['Rafael Saraiva (% Válidos Estadual)'] = formatPercent(r.rafael_validos);
        row['Nina Passadore (Votos)'] = r.nina_votos;
        row['Nina Passadore (% Válidos Federal)'] = formatPercent(r.nina_validos);
        row['Válidos Estadual'] = r.validos_estadual;
        row['Válidos Federal'] = r.validos_federal;
      } else if (activeBase === 'bairros') {
        row['Bairro Cadastrado do Local'] = r.bairro_cadastrado_do_local;
        row['Locais de Votação'] = r.locais_de_votacao;
        row['Eleitores Aptos'] = r.eleitores_aptos;
        row['% Eleitorado Capital'] = formatPercent(r.eleitorado_capital);
        row['Comparecimento'] = r.comparecimento;
        row['% Abstenção'] = formatPercent(r.abstencao);
        row['Rafael Saraiva (Votos)'] = r.rafael_votos;
        row['Rafael Saraiva (% Válidos Estadual)'] = formatPercent(r.rafael_validos);
        row['Nina Passadore (Votos)'] = r.nina_votos;
        row['Nina Passadore (% Válidos Federal)'] = formatPercent(r.nina_validos);
        row['Válidos Estadual'] = r.validos_estadual;
        row['Válidos Federal'] = r.validos_federal;
      } else if (activeBase === 'locais') {
        row['Escola / Local de Votação'] = r.escola_local_de_votacao;
        row['Bairro do Local'] = r.bairro_do_local;
        row['Endereço'] = r.endereco;
        row['Zona Eleitoral'] = r.zona_eleitoral;
        row['Nome da Zona'] = r.nome_da_zona;
        row['Código do Local'] = r.codigo_do_local;
        row['Seções Cadastradas'] = r.secoes_cadastradas;
        row['Eleitores Aptos'] = r.eleitores_aptos;
        row['% Eleitorado Capital'] = formatPercent(r.eleitorado_capital);
        row['Comparecimento'] = r.comparecimento;
        row['% Abstenção'] = formatPercent(r.abstencao);
        row['Rafael Saraiva (Votos)'] = r.rafael_votos;
        row['Rafael Saraiva (% Válidos Estadual)'] = formatPercent(r.rafael_validos);
        row['Nina Passadore (Votos)'] = r.nina_votos;
        row['Nina Passadore (% Válidos Federal)'] = formatPercent(r.nina_validos);
        row['Válidos Estadual'] = r.validos_estadual;
        row['Válidos Federal'] = r.validos_federal;
        row['Seções Eleitorais'] = r.secoes_eleitorais;
      }
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Resultados_${activeBase}`);
    XLSX.writeFile(workbook, `Resultados_Eleitorais_2026_${activeBase}.xlsx`);
  };

  if (loading && !data) {
    return (
      <div className="bg-white rounded-3xl p-12 border border-gray-200/80 shadow-xs flex flex-col items-center justify-center min-h-[350px]">
        <RefreshCw className="w-10 h-10 text-amber-500 animate-spin mb-4" />
        <p className="text-sm font-black uppercase tracking-wider text-gray-700">Carregando dados eleitorais...</p>
        <p className="text-xs text-gray-400 mt-1">Conectando ao armazenamento persistente do servidor</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".json,application/json"
        className="hidden"
      />

      {/* Top Banner & Actions Header */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 border border-gray-200/80 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          
          {/* Main Info */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200">
                <Vote className="w-3.5 h-3.5 text-amber-600" /> Eleições 2026 • 1º Turno
              </span>

              {isServerSynced ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Server className="w-3.5 h-3.5 text-emerald-600" /> Servidor Compartilhado (Todos os Visitantes)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
                  <Database className="w-3.5 h-3.5 text-amber-600" /> Armazenamento Local do Navegador
                </span>
              )}

              {data?.somente_amostra_de_estrutura && (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                  <Info className="w-3.5 h-3.5" /> Amostra de Estrutura
                </span>
              )}
            </div>

            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-dark flex items-center gap-2">
              Resultados Eleitorais Oficiais
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 font-medium">
              Rafael Saraiva (Estadual 44077) & Nina Passadore (Federal 4407) • Base oficial apuração TSE
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black py-3 px-5 rounded-2xl flex items-center justify-center gap-2 text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-amber-600/20 transition-all cursor-pointer"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Importar Dados</span>
            </button>

            {data && (
              <>
                <button
                  onClick={handleExportXLSX}
                  title="Exportar base ativa para Excel"
                  className="bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-2xl border border-gray-200 flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-gray-500" />
                  <span className="hidden sm:inline">Exportar Excel</span>
                </button>

                <button
                  onClick={handleClearData}
                  title="Limpar dados eleitorais"
                  className="bg-red-50 hover:bg-red-100 text-red-600 font-bold py-3 px-3.5 rounded-2xl border border-red-200 flex items-center justify-center transition-all cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

        </div>

        {/* Expected vs Current Count Badges Bar */}
        <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3">
          
          {/* Municípios */}
          <div className={`p-3.5 rounded-2xl border ${
            currentCounts.municipios === EXPECTED_COUNTS.municipios 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : currentCounts.municipios > 0 
                ? 'bg-amber-50/60 border-amber-200' 
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Building2 className="w-3.5 h-3.5" /> Municípios
              </span>
              {currentCounts.municipios === EXPECTED_COUNTS.municipios ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : currentCounts.municipios > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : null}
            </div>
            <div className="text-base sm:text-lg font-black text-dark">
              {formatNumber(currentCounts.municipios)} <span className="text-xs font-medium text-gray-400">/ 645</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {currentCounts.municipios === EXPECTED_COUNTS.municipios ? 'Base estadual completa' : currentCounts.municipios > 0 ? 'Divergência de contagem' : 'Pendente de importação'}
            </div>
          </div>

          {/* Zonas Eleitorais */}
          <div className={`p-3.5 rounded-2xl border ${
            currentCounts.zonas === EXPECTED_COUNTS.zonas 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : currentCounts.zonas > 0 
                ? 'bg-amber-50/60 border-amber-200' 
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <Vote className="w-3.5 h-3.5" /> Zonas SP
              </span>
              {currentCounts.zonas === EXPECTED_COUNTS.zonas ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : currentCounts.zonas > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : null}
            </div>
            <div className="text-base sm:text-lg font-black text-dark">
              {formatNumber(currentCounts.zonas)} <span className="text-xs font-medium text-gray-400">/ 57</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {currentCounts.zonas === EXPECTED_COUNTS.zonas ? '57 zonas da capital' : currentCounts.zonas > 0 ? 'Divergência de contagem' : 'Pendente de importação'}
            </div>
          </div>

          {/* Bairros */}
          <div className={`p-3.5 rounded-2xl border ${
            currentCounts.bairros === EXPECTED_COUNTS.bairros 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : currentCounts.bairros > 0 
                ? 'bg-amber-50/60 border-amber-200' 
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <MapPin className="w-3.5 h-3.5" /> Bairros Locais
              </span>
              {currentCounts.bairros === EXPECTED_COUNTS.bairros ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : currentCounts.bairros > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : null}
            </div>
            <div className="text-base sm:text-lg font-black text-dark">
              {formatNumber(currentCounts.bairros)} <span className="text-xs font-medium text-gray-400">/ 899</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {currentCounts.bairros === EXPECTED_COUNTS.bairros ? 'Bairros dos locais de votação' : currentCounts.bairros > 0 ? 'Divergência de contagem' : 'Pendente de importação'}
            </div>
          </div>

          {/* Locais de Votação */}
          <div className={`p-3.5 rounded-2xl border ${
            currentCounts.locais === EXPECTED_COUNTS.locais 
              ? 'bg-emerald-50/60 border-emerald-200' 
              : currentCounts.locais > 0 
                ? 'bg-amber-50/60 border-amber-200' 
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-gray-500 mb-1">
              <span className="flex items-center gap-1.5 uppercase tracking-wider">
                <School className="w-3.5 h-3.5" /> Locais Votação
              </span>
              {currentCounts.locais === EXPECTED_COUNTS.locais ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              ) : currentCounts.locais > 0 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              ) : null}
            </div>
            <div className="text-base sm:text-lg font-black text-dark">
              {formatNumber(currentCounts.locais)} <span className="text-xs font-medium text-gray-400">/ 2.057</span>
            </div>
            <div className="text-[10px] text-gray-500 font-medium mt-0.5">
              {currentCounts.locais === EXPECTED_COUNTS.locais ? 'Escolas e locais cadastrados' : currentCounts.locais > 0 ? 'Divergência de contagem' : 'Pendente de importação'}
            </div>
          </div>

        </div>
      </div>

      {/* Validation / Import Status Notification Banner */}
      {importStatus?.show && (
        <div className={`p-5 rounded-3xl border ${
          importStatus.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
            : importStatus.type === 'warning' 
              ? 'bg-amber-50 border-amber-200 text-amber-900' 
              : 'bg-red-50 border-red-200 text-red-900'
        } shadow-xs relative`}>
          <button
            onClick={() => setImportStatus(null)}
            className="absolute top-4 right-4 text-xs font-bold uppercase tracking-wider opacity-60 hover:opacity-100 cursor-pointer"
          >
            ✕ Fechar
          </button>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              {importStatus.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              ) : importStatus.type === 'warning' ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
            </div>
            <div className="space-y-1.5 flex-1 pr-8">
              <h3 className="text-sm font-black uppercase tracking-tight">{importStatus.title}</h3>
              <p className="text-xs font-medium leading-relaxed">{importStatus.message}</p>
              
              {importStatus.divergences && importStatus.divergences.length > 0 && (
                <ul className="text-xs font-semibold list-disc list-inside space-y-0.5 mt-2 bg-white/60 p-3 rounded-xl border border-amber-200/60">
                  {importStatus.divergences.map((d, i) => (
                    <li key={i}>{d}</li>
                  ))}
                </ul>
              )}

              {importStatus.details && importStatus.details.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] font-bold opacity-80">
                  {importStatus.details.map((d, i) => (
                    <span key={i} className="bg-white/70 px-2.5 py-1 rounded-lg border border-black/5">
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* When no data is imported yet */}
      {!data && (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-gray-300 shadow-xs">
          <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 mx-auto mb-4 shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-black uppercase tracking-tight text-dark mb-1">
            Nenhuma Base Eleitoral Importada
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto mb-6">
            Clique no botão abaixo para selecionar o arquivo <code>.json</code> contendo os resultados eleitorais das 4 bases (municípios, zonas, bairros e locais de votação).
          </p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-amber-600 hover:bg-amber-700 active:bg-amber-800 text-white font-black py-3 px-6 rounded-2xl inline-flex items-center gap-2 text-xs sm:text-sm uppercase tracking-wider shadow-md shadow-amber-600/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Selecionar Arquivo JSON</span>
          </button>
        </div>
      )}

      {/* Main Content Area when data is loaded */}
      {data && (
        <>
          {/* Sub-Base Navigation Tabs */}
          <div className="bg-white p-2 rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs">
            <div className="flex overflow-x-auto gap-1.5 sm:gap-2 pb-1 sm:pb-0 scrollbar-none">
              
              <button
                onClick={() => setActiveBase('municipios')}
                className={`flex-1 min-w-[150px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'municipios'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Building2 className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Municípios SP</div>
                  <div className={`text-[10px] ${activeBase === 'municipios' ? 'text-amber-100' : 'text-gray-400'}`}>
                    {formatNumber(currentCounts.municipios)} cidades
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveBase('zonas')}
                className={`flex-1 min-w-[150px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'zonas'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <Vote className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Zonas Eleitorais</div>
                  <div className={`text-[10px] ${activeBase === 'zonas' ? 'text-amber-100' : 'text-gray-400'}`}>
                    {formatNumber(currentCounts.zonas)} zonas (Capital)
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveBase('bairros')}
                className={`flex-1 min-w-[150px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'bairros'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <MapPin className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Bairros Locais</div>
                  <div className={`text-[10px] ${activeBase === 'bairros' ? 'text-amber-100' : 'text-gray-400'}`}>
                    {formatNumber(currentCounts.bairros)} bairros
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveBase('locais')}
                className={`flex-1 min-w-[150px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'locais'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-500/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <School className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Escolas & Locais</div>
                  <div className={`text-[10px] ${activeBase === 'locais' ? 'text-amber-100' : 'text-gray-400'}`}>
                    {formatNumber(currentCounts.locais)} locais de votação
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveBase('cruzamento')}
                className={`flex-1 min-w-[160px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'cruzamento'
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20'
                    : 'bg-indigo-50/70 hover:bg-indigo-100 text-indigo-900 border border-indigo-200/60'
                }`}
              >
                <Flame className={`w-4 h-4 flex-shrink-0 ${activeBase === 'cruzamento' ? 'text-amber-300' : 'text-indigo-600'}`} />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Leads × Votos</div>
                  <div className={`text-[10px] ${activeBase === 'cruzamento' ? 'text-indigo-200' : 'text-indigo-600 font-semibold'}`}>
                    Eficiência & Conversão
                  </div>
                </div>
              </button>

              <button
                onClick={() => setActiveBase('fontes')}
                className={`flex-1 min-w-[140px] py-2.5 sm:py-3 px-3.5 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 ${
                  activeBase === 'fontes'
                    ? 'bg-slate-800 text-white shadow-md shadow-slate-800/20'
                    : 'bg-gray-50 hover:bg-gray-100 text-gray-600'
                }`}
              >
                <FileText className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate">Fontes & Método</div>
                  <div className={`text-[10px] ${activeBase === 'fontes' ? 'text-slate-300' : 'text-gray-400'}`}>
                    Notas oficiais TSE
                  </div>
                </div>
              </button>

            </div>
          </div>

          {/* When Cruzamento is Selected */}
          {activeBase === 'cruzamento' ? (
            <CruzamentoLeadsVotos electoralData={data} />
          ) : activeBase === 'fontes' ? (
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200/80 shadow-xs space-y-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-bold">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black uppercase tracking-tight text-dark">
                      Fontes, Metodologia e Notas Explicativas
                    </h3>
                    <p className="text-xs text-gray-500 font-medium">
                      Dados preservados conforme consolidação oficial dos boletins de urna do Tribunal Superior Eleitoral (TSE)
                    </p>
                  </div>
                </div>

                {/* Grid of Methodological Lines */}
                {data.fontes_e_metodo?.linhas && data.fontes_e_metodo.linhas.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-gray-600">
                      Definições e Parâmetros Metodológicos
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {data.fontes_e_metodo.linhas.map((l, i) => {
                        const label = l.celulas?.[0] || `Linha ${l.linha_excel}`;
                        const value = l.celulas?.[1];
                        return (
                          <div key={i} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 text-xs">
                            <div className="font-bold text-dark mb-1">{label}</div>
                            {value && (
                              <div className="text-gray-600 break-words leading-relaxed">
                                {String(value).startsWith('http') ? (
                                  <a
                                    href={String(value)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-primary hover:underline font-bold inline-flex items-center gap-1"
                                  >
                                    {String(value)} <ExternalLink className="w-3 h-3" />
                                  </a>
                                ) : (
                                  String(value)
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Base-specific notes */}
                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-600">
                    Notas Originais das 4 Bases
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Municípios notes */}
                    <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/70 text-xs space-y-2">
                      <div className="font-black text-amber-900 uppercase tracking-tight flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-600" /> Base de Municípios
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-amber-800">
                        {data.bases.municipios?.notas_originais?.map((n, i) => (
                          <li key={i}>{n.celulas?.map((c: any) => c.valor).join(' ')}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Zonas notes */}
                    <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 text-xs space-y-2">
                      <div className="font-black text-blue-900 uppercase tracking-tight flex items-center gap-1.5">
                        <Vote className="w-4 h-4 text-blue-600" /> Base de Zonas Eleitorais
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-blue-800">
                        {data.bases.zonas?.notas_originais?.map((n, i) => (
                          <li key={i}>{n.celulas?.map((c: any) => c.valor).join(' ')}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Bairros notes */}
                    <div className="p-4 rounded-2xl bg-purple-50/50 border border-purple-200/70 text-xs space-y-2">
                      <div className="font-black text-purple-900 uppercase tracking-tight flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-purple-600" /> Base de Bairros dos Locais
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-purple-800">
                        {data.bases.bairros?.notas_originais?.map((n, i) => (
                          <li key={i}>{n.celulas?.map((c: any) => c.valor).join(' ')}</li>
                        ))}
                      </ul>
                    </div>

                    {/* Locais notes */}
                    <div className="p-4 rounded-2xl bg-emerald-50/50 border border-emerald-200/70 text-xs space-y-2">
                      <div className="font-black text-emerald-900 uppercase tracking-tight flex items-center gap-1.5">
                        <School className="w-4 h-4 text-emerald-600" /> Base de Escolas e Locais
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-emerald-800">
                        {data.bases.locais?.notas_originais?.map((n, i) => (
                          <li key={i}>{n.celulas?.map((c: any) => c.valor).join(' ')}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          ) : (
            <>
              {/* Aggregated Metric Cards (Preserving numerator/denominator mathematical rules) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                
                {/* Total Rafael Saraiva */}
                <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-3xl p-4 sm:p-5 text-white shadow-md shadow-orange-500/20">
                  <div className="text-[11px] font-black uppercase tracking-wider text-orange-100 flex items-center justify-between">
                    <span>Rafael Saraiva (44077)</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Estadual</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black mt-2">
                    {formatNumber(aggregatedTotals.sumRafaelVotos)}
                  </div>
                  <div className="text-xs font-bold text-orange-100 mt-1 flex items-center gap-1">
                    <span>{formatPercent(aggregatedTotals.pctRafaelValidos)} dos votos válidos</span>
                  </div>
                  <div className="text-[10px] text-orange-200/90 mt-0.5">
                    Válidos Estadual: {formatNumber(aggregatedTotals.sumValidosEstadual)}
                  </div>
                </div>

                {/* Total Nina Passadore */}
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl p-4 sm:p-5 text-white shadow-md shadow-purple-600/20">
                  <div className="text-[11px] font-black uppercase tracking-wider text-purple-100 flex items-center justify-between">
                    <span>Nina Passadore (4407)</span>
                    <span className="bg-white/20 px-2 py-0.5 rounded-full text-[10px]">Federal</span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black mt-2">
                    {formatNumber(aggregatedTotals.sumNinaVotos)}
                  </div>
                  <div className="text-xs font-bold text-purple-100 mt-1 flex items-center gap-1">
                    <span>{formatPercent(aggregatedTotals.pctNinaValidos)} dos votos válidos</span>
                  </div>
                  <div className="text-[10px] text-purple-200/90 mt-0.5">
                    Válidos Federal: {formatNumber(aggregatedTotals.sumValidosFederal)}
                  </div>
                </div>

                {/* Total Eleitores Aptos */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
                  <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                    Eleitorado do Recorte
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-dark mt-2">
                    {formatNumber(aggregatedTotals.sumEleitores)}
                  </div>
                  <div className="text-xs font-bold text-gray-600 mt-1">
                    {formatNumber(aggregatedTotals.count)} registros filtrados
                  </div>
                  {aggregatedTotals.sumComparecimento > 0 && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Comparecimento: {formatNumber(aggregatedTotals.sumComparecimento)} ({formatPercent(aggregatedTotals.sumComparecimento / aggregatedTotals.sumEleitores)})
                    </div>
                  )}
                </div>

                {/* Válidos Totais ou Abstenção */}
                <div className="bg-white rounded-3xl p-4 sm:p-5 border border-gray-200/80 shadow-xs">
                  <div className="text-[11px] font-black uppercase tracking-wider text-gray-500">
                    {activeBase === 'bairros' || activeBase === 'locais' ? 'Abstenção Média' : 'Votos Válidos Gerais'}
                  </div>
                  <div className="text-2xl sm:text-3xl font-black text-dark mt-2">
                    {activeBase === 'bairros' || activeBase === 'locais' 
                      ? formatPercent(aggregatedTotals.pctAbstencao)
                      : formatNumber(aggregatedTotals.sumValidosEstadual)
                    }
                  </div>
                  <div className="text-xs font-bold text-gray-600 mt-1">
                    {activeBase === 'bairros' || activeBase === 'locais' 
                      ? `Comparecimento: ${formatNumber(aggregatedTotals.sumComparecimento)}`
                      : `Válidos Federal: ${formatNumber(aggregatedTotals.sumValidosFederal)}`
                    }
                  </div>
                  {activeBase === 'locais' && (
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      Seções Eleitorais: {formatNumber(aggregatedTotals.sumSecoes)}
                    </div>
                  )}
                </div>

              </div>

              {/* Filters & Visual Controls Bar */}
              <div className="bg-white rounded-3xl p-4 sm:p-6 border border-gray-200/80 shadow-xs space-y-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  
                  {/* Search Bar */}
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder={
                        activeBase === 'municipios' 
                          ? 'Buscar por município ou código TSE...' 
                          : activeBase === 'zonas'
                            ? 'Buscar por zona ou nome da região...'
                            : activeBase === 'bairros'
                              ? 'Buscar por nome do bairro...'
                              : 'Buscar por escola, bairro, endereço, zona ou código...'
                      }
                      className="w-full pl-11 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 text-xs sm:text-sm font-medium outline-none transition-all"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-600 font-bold"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  {/* Candidate Focus */}
                  <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-2xl self-start md:self-auto">
                    <button
                      onClick={() => setCandidateFilter('all')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        candidateFilter === 'all' ? 'bg-white text-dark shadow-xs' : 'text-gray-500 hover:text-dark'
                      }`}
                    >
                      Todos
                    </button>
                    <button
                      onClick={() => setCandidateFilter('rafael')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        candidateFilter === 'rafael' ? 'bg-orange-600 text-white shadow-xs' : 'text-gray-500 hover:text-dark'
                      }`}
                    >
                      Rafael (44077)
                    </button>
                    <button
                      onClick={() => setCandidateFilter('nina')}
                      className={`px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                        candidateFilter === 'nina' ? 'bg-purple-600 text-white shadow-xs' : 'text-gray-500 hover:text-dark'
                      }`}
                    >
                      Nina (4407)
                    </button>
                  </div>

                  {/* Toggle Charts */}
                  <button
                    onClick={() => setShowCharts(!showCharts)}
                    className={`px-3.5 py-2 rounded-2xl border text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer ${
                      showCharts 
                        ? 'bg-amber-50 border-amber-300 text-amber-900' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>{showCharts ? 'Ocultar Gráficos' : 'Ver Gráficos'}</span>
                  </button>

                </div>

                {/* Secondary Select Filters */}
                <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-gray-100 text-xs">
                  
                  {/* Sorting */}
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-gray-500 uppercase tracking-wider">Ordenar por:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="rafael_votos_desc">Mais Votos Rafael (44077)</option>
                      <option value="rafael_validos_desc">Maior % Válidos Rafael</option>
                      <option value="nina_votos_desc">Mais Votos Nina (4407)</option>
                      <option value="nina_validos_desc">Maior % Válidos Nina</option>
                      <option value="eleitores_desc">Maior Eleitorado</option>
                      <option value="nome_asc">Nome Alfabético (A-Z)</option>
                      {(activeBase === 'bairros' || activeBase === 'locais') && (
                        <option value="abstencao_asc">Menor Abstenção</option>
                      )}
                    </select>
                  </div>

                  {/* Zona filter for locales */}
                  {(activeBase === 'locais' || activeBase === 'zonas') && availableZonas.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-500 uppercase tracking-wider">Zona:</span>
                      <select
                        value={zonaFilter}
                        onChange={(e) => setZonaFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-amber-500 cursor-pointer max-w-[180px] truncate"
                      >
                        <option value="">Todas as zonas ({availableZonas.length})</option>
                        {availableZonas.map((z, i) => (
                          <option key={i} value={z}>{z}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Bairro filter for locales/bairros */}
                  {(activeBase === 'locais' || activeBase === 'bairros') && availableBairros.length > 0 && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-gray-500 uppercase tracking-wider">Bairro:</span>
                      <select
                        value={bairroFilter}
                        onChange={(e) => setBairroFilter(e.target.value)}
                        className="bg-gray-50 border border-gray-200 rounded-xl px-2.5 py-1.5 font-bold text-gray-700 outline-none focus:border-amber-500 cursor-pointer max-w-[180px] truncate"
                      >
                        <option value="">Todos os bairros ({availableBairros.length})</option>
                        {availableBairros.map((b, i) => (
                          <option key={i} value={b}>{b}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Clear secondary filters */}
                  {(zonaFilter || bairroFilter) && (
                    <button
                      onClick={() => { setZonaFilter(''); setBairroFilter(''); }}
                      className="text-amber-700 hover:text-amber-900 font-bold underline cursor-pointer"
                    >
                      Limpar filtros de zona/bairro
                    </button>
                  )}

                  <div className="ml-auto text-gray-400 font-medium">
                    Exibindo <strong>{processedRecords.length}</strong> de {rawRecords.length} registros
                  </div>

                </div>
              </div>

              {/* Visual Charts Section */}
              {showCharts && chartData.length > 0 && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  
                  {/* Chart 1: Votos Absolutos */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-dark">
                          Top 15 - Votação Absoluta
                        </h4>
                        <p className="text-[11px] text-gray-400 font-medium">Votos nominais apurados</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        {activeBase.toUpperCase()}
                      </span>
                    </div>

                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0} 
                            height={65} 
                            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                          <Tooltip 
                            formatter={(value: any, name: any) => [
                              formatNumber(Number(value)), 
                              name === 'rafaelVotos' ? 'Rafael Saraiva (44077)' : 'Nina Passadore (4407)'
                            ]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          />
                          <Legend 
                            verticalAlign="top"
                            align="right"
                            formatter={(value) => value === 'rafaelVotos' ? 'Rafael (44077)' : 'Nina (4407)'}
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 700 }}
                          />
                          {(candidateFilter === 'all' || candidateFilter === 'rafael') && (
                            <Bar dataKey="rafaelVotos" fill="#ea580c" radius={[6, 6, 0, 0]} name="rafaelVotos" />
                          )}
                          {(candidateFilter === 'all' || candidateFilter === 'nina') && (
                            <Bar dataKey="ninaVotos" fill="#7c3aed" radius={[6, 6, 0, 0]} name="ninaVotos" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Percentuais Válidos */}
                  <div className="bg-white rounded-3xl p-5 border border-gray-200/80 shadow-xs">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h4 className="text-sm font-black uppercase tracking-tight text-dark">
                          Top 15 - % de Votos Válidos
                        </h4>
                        <p className="text-[11px] text-gray-400 font-medium">% sobre os votos válidos do respectivo cargo</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-wider bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                        PROPORCIONAL
                      </span>
                    </div>

                    <div className="h-80 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 45 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis 
                            dataKey="name" 
                            angle={-45} 
                            textAnchor="end" 
                            interval={0} 
                            height={65} 
                            tick={{ fontSize: 9, fill: '#64748b', fontWeight: 600 }} 
                          />
                          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickFormatter={(v) => `${v}%`} />
                          <Tooltip 
                            formatter={(value: any, name: any) => [
                              `${Number(value).toFixed(2)}%`, 
                              name === 'rafaelPct' ? 'Rafael Saraiva (% Válidos Estadual)' : 'Nina Passadore (% Válidos Federal)'
                            ]}
                            labelFormatter={(label, payload) => payload?.[0]?.payload?.fullName || label}
                            contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                          />
                          <Legend 
                            verticalAlign="top"
                            align="right"
                            formatter={(value) => value === 'rafaelPct' ? '% Rafael (Estadual)' : '% Nina (Federal)'}
                            wrapperStyle={{ paddingBottom: '12px', fontSize: '11px', fontWeight: 700 }}
                          />
                          {(candidateFilter === 'all' || candidateFilter === 'rafael') && (
                            <Bar dataKey="rafaelPct" fill="#ea580c" radius={[6, 6, 0, 0]} name="rafaelPct" />
                          )}
                          {(candidateFilter === 'all' || candidateFilter === 'nina') && (
                            <Bar dataKey="ninaPct" fill="#7c3aed" radius={[6, 6, 0, 0]} name="ninaPct" />
                          )}
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                </div>
              )}

              {/* Data Table */}
              <div className="bg-white rounded-3xl border border-gray-200/80 shadow-xs overflow-hidden">
                <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-gray-50/50">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-tight text-dark">
                      Registros da Base ({activeBase.toUpperCase()})
                    </h3>
                    <p className="text-xs text-gray-400 font-medium">
                      Valores percentuais calculados exclusivamente sobre votos válidos do respectivo cargo
                    </p>
                  </div>

                  {/* Page Size Select */}
                  <div className="flex items-center gap-2 text-xs font-bold text-gray-600">
                    <span>Exibir por página:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-white border border-gray-200 rounded-xl px-2.5 py-1 font-bold outline-none cursor-pointer"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value={-1}>Todos ({processedRecords.length})</option>
                    </select>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700">
                    <thead className="bg-gray-50/80 text-[11px] font-black uppercase tracking-wider text-gray-500 border-b border-gray-200/60">
                      <tr>
                        {activeBase === 'municipios' && (
                          <>
                            <th className="px-4 py-3.5">Código TSE</th>
                            <th className="px-4 py-3.5">Município</th>
                            <th className="px-4 py-3.5 text-right">Aptos</th>
                            <th className="px-4 py-3.5 text-right">% Eleitorado</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: % Válidos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: % Válidos</th>
                            <th className="px-4 py-3.5 text-right">Válidos Estadual</th>
                            <th className="px-4 py-3.5 text-right">Válidos Federal</th>
                            <th className="px-4 py-3.5 text-center">TSE</th>
                          </>
                        )}

                        {activeBase === 'zonas' && (
                          <>
                            <th className="px-4 py-3.5">Zona</th>
                            <th className="px-4 py-3.5">Região / Nome da Zona</th>
                            <th className="px-4 py-3.5 text-right">Aptos</th>
                            <th className="px-4 py-3.5 text-right">% Eleitorado</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: % Válidos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: % Válidos</th>
                            <th className="px-4 py-3.5 text-right">Válidos Estadual</th>
                            <th className="px-4 py-3.5 text-right">Válidos Federal</th>
                            <th className="px-4 py-3.5 text-center">TSE</th>
                          </>
                        )}

                        {activeBase === 'bairros' && (
                          <>
                            <th className="px-4 py-3.5">Bairro Cadastrado do Local</th>
                            <th className="px-4 py-3.5 text-right">Locais</th>
                            <th className="px-4 py-3.5 text-right">Aptos</th>
                            <th className="px-4 py-3.5 text-right">% Eleitorado</th>
                            <th className="px-4 py-3.5 text-right">Comparecimento</th>
                            <th className="px-4 py-3.5 text-right">% Abstenção</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: % Válidos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: % Válidos</th>
                          </>
                        )}

                        {activeBase === 'locais' && (
                          <>
                            <th className="px-4 py-3.5">Escola / Local de Votação</th>
                            <th className="px-4 py-3.5">Bairro</th>
                            <th className="px-4 py-3.5">Zona</th>
                            <th className="px-4 py-3.5">Código</th>
                            <th className="px-4 py-3.5 text-right">Seções</th>
                            <th className="px-4 py-3.5 text-right">Aptos</th>
                            <th className="px-4 py-3.5 text-right">% Abstenção</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-orange-50/50 text-orange-950">Rafael: % Válidos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: Votos</th>
                            <th className="px-4 py-3.5 text-right bg-purple-50/50 text-purple-950">Nina: % Válidos</th>
                          </>
                        )}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-gray-100">
                      {paginatedRecords.map((r, idx) => (
                        <tr key={idx} className="hover:bg-amber-50/30 transition-colors font-medium">
                          {activeBase === 'municipios' && (
                            <>
                              <td className="px-4 py-3 font-mono text-gray-500 font-bold">{r.codigo_tse || '-'}</td>
                              <td className="px-4 py-3 font-black text-dark">{r.municipio || '-'}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.eleitores_aptos)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{formatPercent(r.do_eleitorado)}</td>
                              <td className="px-4 py-3 text-right font-black text-orange-600 bg-orange-50/20">{formatNumber(r.rafael_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-orange-700 bg-orange-50/20">{formatPercent(r.rafael_validos)}</td>
                              <td className="px-4 py-3 text-right font-black text-purple-600 bg-purple-50/20">{formatNumber(r.nina_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/20">{formatPercent(r.nina_validos)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.validos_estadual)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.validos_federal)}</td>
                              <td className="px-4 py-3 text-center">
                                {r.fonte_votos_rafael && (
                                  <a
                                    href={r.fonte_votos_rafael}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir arquivo oficial TSE"
                                    className="text-amber-600 hover:text-amber-800 p-1 inline-block"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </td>
                            </>
                          )}

                          {activeBase === 'zonas' && (
                            <>
                              <td className="px-4 py-3 font-mono text-gray-500 font-bold">{r.zona_eleitoral || '-'}</td>
                              <td className="px-4 py-3 font-black text-dark">{r.nome_da_zona_regiao || '-'}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.eleitores_aptos)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{formatPercent(r.do_eleitorado)}</td>
                              <td className="px-4 py-3 text-right font-black text-orange-600 bg-orange-50/20">{formatNumber(r.rafael_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-orange-700 bg-orange-50/20">{formatPercent(r.rafael_validos)}</td>
                              <td className="px-4 py-3 text-right font-black text-purple-600 bg-purple-50/20">{formatNumber(r.nina_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/20">{formatPercent(r.nina_validos)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.validos_estadual)}</td>
                              <td className="px-4 py-3 text-right text-gray-600">{formatNumber(r.validos_federal)}</td>
                              <td className="px-4 py-3 text-center">
                                {r.fonte_votos_rafael && (
                                  <a
                                    href={r.fonte_votos_rafael}
                                    target="_blank"
                                    rel="noreferrer"
                                    title="Abrir arquivo oficial TSE"
                                    className="text-amber-600 hover:text-amber-800 p-1 inline-block"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                )}
                              </td>
                            </>
                          )}

                          {activeBase === 'bairros' && (
                            <>
                              <td className="px-4 py-3 font-black text-dark">{r.bairro_cadastrado_do_local || '-'}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.locais_de_votacao)}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.eleitores_aptos)}</td>
                              <td className="px-4 py-3 text-right text-gray-500">{formatPercent(r.eleitorado_capital)}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.comparecimento)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-600">{formatPercent(r.abstencao)}</td>
                              <td className="px-4 py-3 text-right font-black text-orange-600 bg-orange-50/20">{formatNumber(r.rafael_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-orange-700 bg-orange-50/20">{formatPercent(r.rafael_validos)}</td>
                              <td className="px-4 py-3 text-right font-black text-purple-600 bg-purple-50/20">{formatNumber(r.nina_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/20">{formatPercent(r.nina_validos)}</td>
                            </>
                          )}

                          {activeBase === 'locais' && (
                            <>
                              <td className="px-4 py-3">
                                <div className="font-black text-dark">{r.escola_local_de_votacao || '-'}</div>
                                <div className="text-[10px] text-gray-400 truncate max-w-xs">{r.endereco || '-'}</div>
                              </td>
                              <td className="px-4 py-3 font-bold text-gray-600">{r.bairro_do_local || '-'}</td>
                              <td className="px-4 py-3 font-bold text-gray-600">
                                {r.nome_da_zona || `Zona ${r.zona_eleitoral}`}
                              </td>
                              <td className="px-4 py-3 font-mono text-gray-400">{r.codigo_do_local || '-'}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.secoes_cadastradas)}</td>
                              <td className="px-4 py-3 text-right">{formatNumber(r.eleitores_aptos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-gray-600">{formatPercent(r.abstencao)}</td>
                              <td className="px-4 py-3 text-right font-black text-orange-600 bg-orange-50/20">{formatNumber(r.rafael_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-orange-700 bg-orange-50/20">{formatPercent(r.rafael_validos)}</td>
                              <td className="px-4 py-3 text-right font-black text-purple-600 bg-purple-50/20">{formatNumber(r.nina_votos)}</td>
                              <td className="px-4 py-3 text-right font-bold text-purple-700 bg-purple-50/20">{formatPercent(r.nina_validos)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>

                    {/* Table Summary Footer using mathematically aggregate weighted sums */}
                    <tfoot className="bg-amber-100/60 font-black text-dark text-xs border-t-2 border-amber-300">
                      <tr>
                        {activeBase === 'municipios' && (
                          <>
                            <td className="px-4 py-3 uppercase tracking-wider" colSpan={2}>
                              Total do Filtro ({aggregatedTotals.count} cidades)
                            </td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumEleitores)}</td>
                            <td className="px-4 py-3 text-right">100%</td>
                            <td className="px-4 py-3 text-right text-orange-700">{formatNumber(aggregatedTotals.sumRafaelVotos)}</td>
                            <td className="px-4 py-3 text-right text-orange-800">{formatPercent(aggregatedTotals.pctRafaelValidos)}</td>
                            <td className="px-4 py-3 text-right text-purple-700">{formatNumber(aggregatedTotals.sumNinaVotos)}</td>
                            <td className="px-4 py-3 text-right text-purple-800">{formatPercent(aggregatedTotals.pctNinaValidos)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumValidosEstadual)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumValidosFederal)}</td>
                            <td className="px-4 py-3"></td>
                          </>
                        )}

                        {activeBase === 'zonas' && (
                          <>
                            <td className="px-4 py-3 uppercase tracking-wider" colSpan={2}>
                              Total do Filtro ({aggregatedTotals.count} zonas)
                            </td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumEleitores)}</td>
                            <td className="px-4 py-3 text-right">100%</td>
                            <td className="px-4 py-3 text-right text-orange-700">{formatNumber(aggregatedTotals.sumRafaelVotos)}</td>
                            <td className="px-4 py-3 text-right text-orange-800">{formatPercent(aggregatedTotals.pctRafaelValidos)}</td>
                            <td className="px-4 py-3 text-right text-purple-700">{formatNumber(aggregatedTotals.sumNinaVotos)}</td>
                            <td className="px-4 py-3 text-right text-purple-800">{formatPercent(aggregatedTotals.pctNinaValidos)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumValidosEstadual)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumValidosFederal)}</td>
                            <td className="px-4 py-3"></td>
                          </>
                        )}

                        {activeBase === 'bairros' && (
                          <>
                            <td className="px-4 py-3 uppercase tracking-wider">
                              Total do Filtro ({aggregatedTotals.count} bairros)
                            </td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumLocaisVotacao)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumEleitores)}</td>
                            <td className="px-4 py-3 text-right">100%</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumComparecimento)}</td>
                            <td className="px-4 py-3 text-right">{formatPercent(aggregatedTotals.pctAbstencao)}</td>
                            <td className="px-4 py-3 text-right text-orange-700">{formatNumber(aggregatedTotals.sumRafaelVotos)}</td>
                            <td className="px-4 py-3 text-right text-orange-800">{formatPercent(aggregatedTotals.pctRafaelValidos)}</td>
                            <td className="px-4 py-3 text-right text-purple-700">{formatNumber(aggregatedTotals.sumNinaVotos)}</td>
                            <td className="px-4 py-3 text-right text-purple-800">{formatPercent(aggregatedTotals.pctNinaValidos)}</td>
                          </>
                        )}

                        {activeBase === 'locais' && (
                          <>
                            <td className="px-4 py-3 uppercase tracking-wider" colSpan={4}>
                              Total do Filtro ({aggregatedTotals.count} locais de votação)
                            </td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumSecoes)}</td>
                            <td className="px-4 py-3 text-right">{formatNumber(aggregatedTotals.sumEleitores)}</td>
                            <td className="px-4 py-3 text-right">{formatPercent(aggregatedTotals.pctAbstencao)}</td>
                            <td className="px-4 py-3 text-right text-orange-700">{formatNumber(aggregatedTotals.sumRafaelVotos)}</td>
                            <td className="px-4 py-3 text-right text-orange-800">{formatPercent(aggregatedTotals.pctRafaelValidos)}</td>
                            <td className="px-4 py-3 text-right text-purple-700">{formatNumber(aggregatedTotals.sumNinaVotos)}</td>
                            <td className="px-4 py-3 text-right text-purple-800">{formatPercent(aggregatedTotals.pctNinaValidos)}</td>
                          </>
                        )}
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="p-4 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                    <div className="text-gray-500 font-medium">
                      Página <strong>{currentPage}</strong> de <strong>{totalPages}</strong> ({processedRecords.length} itens)
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed font-bold cursor-pointer"
                      >
                        Próxima
                      </button>
                    </div>
                  </div>
                )}

              </div>
            </>
          )}

        </>
      )}

    </div>
  );
};
