import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Download, Trash2, Filter, CheckCircle2, FileSignature, Users, Database, Eye, EyeOff, MapPin } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ProtocolosTabProps {
  refreshTrigger?: number;
}

export const ProtocolosTab: React.FC<ProtocolosTabProps> = ({ refreshTrigger }) => {
  const [data, setData] = useState<any[]>([]);
  const [citizensData, setCitizensData] = useState<any[]>([]);
  const [petitionsData, setPetitionsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Sub-tab selection
  const [subSection, setSubSection] = useState<'PROTOCOLADOS' | 'SOLICITACOES' | 'CIDADAOS' | 'ABAIXO_ASSINADOS'>('PROTOCOLADOS');

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [cityFilter, setCityFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unique' | 'duplicates'>('all');

  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios')
      .then(res => res.json())
      .then(d => {
        setCities(d.map((c: any) => c.nome).sort());
      })
      .catch(err => console.warn("API request failed:", err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const t = Date.now();
      const [response, citizensResponse, petitionsResponse] = await Promise.all([
        fetch(`/api/cities?_t=${t}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`/api/citizens?_t=${t}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } }),
        fetch(`/api/petitions?_t=${t}`, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } })
      ]);
      const result = await response.json();
      const citizensResult = await citizensResponse.json();
      const petitionsResult = await petitionsResponse.json();
      setData(Array.isArray(result) ? result : []);
      setCitizensData(Array.isArray(citizensResult) ? citizensResult : []);
      setPetitionsData(Array.isArray(petitionsResult) ? petitionsResult : []);
    } catch (err) {
      console.warn("API request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [refreshTrigger]);

  const toggleDisplay = async (id: string) => {
    try {
      await fetch(`/api/protocols/${id}/toggle-active`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const deleteRecord = async (type: 'protocol' | 'citizen' | 'petition', id: string) => {
    if (!window.confirm("Deseja realmente excluir este registro?")) return;
    try {
      if (type === 'protocol') await fetch(`/api/protocols/${id}`, { method: 'DELETE' });
      else if (type === 'citizen') await fetch(`/api/citizens/${id}`, { method: 'DELETE' });
      else if (type === 'petition') await fetch(`/api/petitions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const processList = (list: any[]) => {
    const seenEmails = new Set();
    const seenWhatsapps = new Set();
    return list.map(item => {
      let isDuplicate = false;
      const emailKey = item.email?.toLowerCase().trim();
      const whatsappKey = item.whatsapp?.replace(/\D/g, '');
      if ((emailKey && seenEmails.has(emailKey)) || (whatsappKey && whatsappKey.length > 8 && seenWhatsapps.has(whatsappKey))) {
        isDuplicate = true;
      } else {
        if (emailKey) seenEmails.add(emailKey);
        if (whatsappKey && whatsappKey.length > 8) seenWhatsapps.add(whatsappKey);
      }
      return { ...item, isDuplicate };
    });
  };

  const processedData = useMemo(() => processList(data), [data]);
  const processedCitizens = useMemo(() => processList(citizensData), [citizensData]);
  const processedPetitions = useMemo(() => processList(petitionsData), [petitionsData]);

  const protocoladosList = useMemo(() => {
    return processedData.filter(d => d.status === 'protocolado');
  }, [processedData]);

  const solicitacoesList = useMemo(() => {
    return processedData.filter(d => d.status === 'solicitado');
  }, [processedData]);

  // Excel Exporters
  const exportProtocolosExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = protocoladosList.map(d => ({
      "Município": d.name,
      "Estado": d.state,
      "Autor": d.councillorName,
      "Cargo": d.role,
      "Email": d.email,
      "WhatsApp": d.whatsapp,
      "Nº PL": d.protocolNumber,
      "Data do Protocolo": d.date,
      "Status": d.status,
      "Link do Protocolo": d.link,
      "Ativo no Site": d.active !== false ? 'Sim' : 'Não',
      "Data de Cadastro": d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Protocolos");
    XLSX.writeFile(wb, "protocolos_codigo_animal.xlsx");
  };

  const exportSolicitacoesExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = solicitacoesList.map(d => ({
      "Município": d.name,
      "Estado": d.state,
      "Autor": d.councillorName,
      "Cargo": d.role,
      "Email": d.email,
      "WhatsApp": d.whatsapp,
      "Status": d.status,
      "Data de Cadastro": d.createdAt ? new Date(d.createdAt).toLocaleString('pt-BR') : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Solicitações");
    XLSX.writeFile(wb, "solicitacoes_minuta_codigo_animal.xlsx");
  };

  const exportCitizensExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = processedCitizens.map(c => ({
      Nome: c.nome,
      WhatsApp: c.whatsapp,
      Email: c.email,
      CEP: c.cep,
      'Endereço': c.endereco,
      'Número': c.numero,
      Complemento: c.complemento,
      Bairro: c.bairro,
      Cidade: c.cidade,
      Estado: c.estado,
      'Enviar para': c.enviarPara === 'prefeito' ? 'Prefeito' : 'Vereador',
      'Data de Cadastro': c.createdAt ? new Date(c.createdAt).toLocaleString('pt-BR') : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Cidadãos");
    XLSX.writeFile(wb, "cidadaos_minuta_codigo_animal.xlsx");
  };

  const exportPetitionsExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = processedPetitions.map(p => ({
      Nome: p.nome,
      WhatsApp: p.whatsapp,
      Email: p.email,
      CEP: p.cep,
      'Endereço': p.endereco,
      'Número': p.numero,
      Complemento: p.complemento,
      Bairro: p.bairro,
      Cidade: p.cidade,
      Estado: p.estado,
      'Data de Assinatura': p.createdAt ? new Date(p.createdAt).toLocaleString('pt-BR') : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Abaixo-assinados");
    XLSX.writeFile(wb, "abaixo_assinados_codigo_animal.xlsx");
  };

  // Filtered Lists
  const filteredProtocolados = useMemo(() => {
    return protocoladosList.filter(d => {
      if (filterType === 'unique' && d.isDuplicate) return false;
      if (filterType === 'duplicates' && !d.isDuplicate) return false;
      if (cityFilter && d.name !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = d.councillorName?.toLowerCase().includes(q);
        const matchCity = d.name?.toLowerCase().includes(q);
        const matchNum = d.protocolNumber?.toLowerCase().includes(q);
        const matchEmail = d.email?.toLowerCase().includes(q);
        const matchPhone = d.whatsapp?.includes(q);
        return matchName || matchCity || matchNum || matchEmail || matchPhone;
      }
      return true;
    });
  }, [protocoladosList, filterType, cityFilter, searchQuery]);

  const filteredSolicitacoes = useMemo(() => {
    return solicitacoesList.filter(d => {
      if (filterType === 'unique' && d.isDuplicate) return false;
      if (filterType === 'duplicates' && !d.isDuplicate) return false;
      if (cityFilter && d.name !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = d.councillorName?.toLowerCase().includes(q);
        const matchCity = d.name?.toLowerCase().includes(q);
        const matchEmail = d.email?.toLowerCase().includes(q);
        const matchPhone = d.whatsapp?.includes(q);
        return matchName || matchCity || matchEmail || matchPhone;
      }
      return true;
    });
  }, [solicitacoesList, filterType, cityFilter, searchQuery]);

  const filteredCitizens = useMemo(() => {
    return processedCitizens.filter(c => {
      if (filterType === 'unique' && c.isDuplicate) return false;
      if (filterType === 'duplicates' && !c.isDuplicate) return false;
      if (cityFilter && c.cidade !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = c.nome?.toLowerCase().includes(q);
        const matchCity = c.cidade?.toLowerCase().includes(q);
        const matchEmail = c.email?.toLowerCase().includes(q);
        const matchPhone = c.whatsapp?.includes(q);
        return matchName || matchCity || matchEmail || matchPhone;
      }
      return true;
    });
  }, [processedCitizens, filterType, cityFilter, searchQuery]);

  const filteredPetitions = useMemo(() => {
    return processedPetitions.filter(p => {
      if (filterType === 'unique' && p.isDuplicate) return false;
      if (filterType === 'duplicates' && !p.isDuplicate) return false;
      if (cityFilter && p.cidade !== cityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = p.nome?.toLowerCase().includes(q);
        const matchCity = p.cidade?.toLowerCase().includes(q);
        const matchEmail = p.email?.toLowerCase().includes(q);
        const matchPhone = p.whatsapp?.includes(q);
        return matchName || matchCity || matchEmail || matchPhone;
      }
      return true;
    });
  }, [processedPetitions, filterType, cityFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div 
          onClick={() => setSubSection('PROTOCOLADOS')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            subSection === 'PROTOCOLADOS' ? 'bg-green-50/80 border-green-300 ring-2 ring-green-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <CheckCircle2 className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Protocolados</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-700">{protocoladosList.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">PLs em tramitação</p>
        </div>

        <div 
          onClick={() => setSubSection('SOLICITACOES')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            subSection === 'SOLICITACOES' ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 text-yellow-600 mb-1">
            <FileSignature className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Solicitações</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-yellow-700">{solicitacoesList.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Minutas solicitadas</p>
        </div>

        <div 
          onClick={() => setSubSection('CIDADAOS')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            subSection === 'CIDADAOS' ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 text-primary mb-1">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Cidadãos</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-primary">{processedCitizens.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Downloads de minuta</p>
        </div>

        <div 
          onClick={() => setSubSection('ABAIXO_ASSINADOS')}
          className={`p-4 sm:p-5 rounded-2xl border transition-all cursor-pointer shadow-sm ${
            subSection === 'ABAIXO_ASSINADOS' ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20' : 'bg-white border-gray-100 hover:border-gray-200'
          }`}
        >
          <div className="flex items-center gap-2 text-purple-600 mb-1">
            <Database className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Assinaturas</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-purple-700">{processedPetitions.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Abaixo-assinados</p>
        </div>
      </div>

      {/* Navegação de Sub-seções e Filtros */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        
        {/* Seletor de Sub-seção com estilo Segmented Controls */}
        <div className="flex bg-gray-100/90 p-1.5 rounded-2xl overflow-x-auto gap-1 mb-5">
          <button
            onClick={() => setSubSection('PROTOCOLADOS')}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              subSection === 'PROTOCOLADOS'
                ? 'bg-white text-green-700 shadow-sm'
                : 'text-gray-600 hover:text-dark hover:bg-gray-200/50'
            }`}
          >
            Protocolados ({protocoladosList.length})
          </button>
          <button
            onClick={() => setSubSection('SOLICITACOES')}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              subSection === 'SOLICITACOES'
                ? 'bg-white text-yellow-700 shadow-sm'
                : 'text-gray-600 hover:text-dark hover:bg-gray-200/50'
            }`}
          >
            Solicitações ({solicitacoesList.length})
          </button>
          <button
            onClick={() => setSubSection('CIDADAOS')}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              subSection === 'CIDADAOS'
                ? 'bg-white text-primary shadow-sm'
                : 'text-gray-600 hover:text-dark hover:bg-gray-200/50'
            }`}
          >
            Cidadãos Minuta ({processedCitizens.length})
          </button>
          <button
            onClick={() => setSubSection('ABAIXO_ASSINADOS')}
            className={`flex-1 min-w-[150px] py-2 px-3 rounded-xl font-bold text-xs sm:text-sm transition-all whitespace-nowrap cursor-pointer ${
              subSection === 'ABAIXO_ASSINADOS'
                ? 'bg-white text-purple-700 shadow-sm'
                : 'text-gray-600 hover:text-dark hover:bg-gray-200/50'
            }`}
          >
            Abaixo-assinados ({processedPetitions.length})
          </button>
        </div>

        {/* Barra de Filtros, Busca e Ações */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Filtros Tipo de Registro */}
          <div className="flex bg-gray-100/80 p-1 rounded-xl">
            <button
              onClick={() => setFilterType('all')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'all'
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('unique')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'unique'
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Únicos
            </button>
            <button
              onClick={() => setFilterType('duplicates')}
              className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                filterType === 'duplicates'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
              }`}
            >
              Duplicados
            </button>
          </div>

          {/* Lado Direito: Busca, Select de Cidade e Botões */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            
            {/* Campo de Busca */}
            <div className="relative flex-1 sm:w-56 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por autor ou cidade..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-xs sm:text-sm bg-white font-medium text-gray-800"
              />
            </div>

            {/* Select de Cidade */}
            <div className="relative flex-1 sm:flex-initial sm:w-48 min-w-[170px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Todos os municípios</option>
                {cities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchData}
                disabled={loading}
                title="Atualizar dados"
                className="flex-1 sm:flex-initial bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-primary' : 'text-gray-500'}`} />
                <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
              </button>

              {subSection === 'PROTOCOLADOS' && (
                <button
                  onClick={exportProtocolosExcel}
                  className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar ({filteredProtocolados.length})</span>
                </button>
              )}

              {subSection === 'SOLICITACOES' && (
                <button
                  onClick={exportSolicitacoesExcel}
                  className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar ({filteredSolicitacoes.length})</span>
                </button>
              )}

              {subSection === 'CIDADAOS' && (
                <button
                  onClick={exportCitizensExcel}
                  className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar ({filteredCitizens.length})</span>
                </button>
              )}

              {subSection === 'ABAIXO_ASSINADOS' && (
                <button
                  onClick={exportPetitionsExcel}
                  className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar ({filteredPetitions.length})</span>
                </button>
              )}
            </div>

          </div>

        </div>
      </div>

      {/* Tabelas de Conteúdo conforme Sub-seção ativa */}

      {/* SUB-SEÇÃO 1: PROTOCOLADOS */}
      {subSection === 'PROTOCOLADOS' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-dark">Protocolos Registrados por Políticos</h3>
              <p className="text-xs text-gray-500">Exibindo {filteredProtocolados.length} de {protocoladosList.length} PLs cadastrados</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Município</th>
                  <th className="py-3.5 px-4">Autor / Cargo</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Nº PL / Data</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                {filteredProtocolados.map((item, i) => (
                  <tr key={item.id || i} className={`hover:bg-gray-50/60 transition-colors ${item.active === false ? 'opacity-50' : ''}`}>
                    <td className="py-3.5 px-4 font-bold text-dark">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.name} - {item.state}</span>
                      </div>
                      {item.isDuplicate && (
                        <span className="mt-1 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      <div className="font-bold text-gray-800">{item.councillorName || '-'}</div>
                      <div className="text-[11px] text-gray-400">{item.role || 'Vereador(a)'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-mono text-xs text-gray-800 font-bold">{item.whatsapp || '-'}</div>
                      <div className="text-[11px] text-gray-400">{item.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-bold text-gray-800">{item.protocolNumber || 'N/A'}</div>
                      <div className="text-[11px] text-gray-400">{item.date || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="bg-green-100 text-green-800 px-2.5 py-1 rounded-lg text-xs font-black uppercase">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => toggleDisplay(item.id)}
                          className={`p-2 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer ${
                            item.active !== false
                              ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                              : 'bg-green-50 text-green-700 hover:bg-green-100'
                          }`}
                          title={item.active !== false ? 'Ocultar do site' : 'Exibir no site'}
                        >
                          {item.active !== false ? (
                            <><EyeOff className="w-4 h-4" /> Desativar</>
                          ) : (
                            <><Eye className="w-4 h-4" /> Ativar</>
                          )}
                        </button>
                        <button
                          onClick={() => deleteRecord('protocol', item.id)}
                          className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                          title="Excluir protocolo"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredProtocolados.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-gray-400 font-medium">
                      {loading ? 'Carregando dados...' : 'Nenhum protocolo encontrado com os filtros selecionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-SEÇÃO 2: SOLICITAÇÕES DE MINUTA */}
      {subSection === 'SOLICITACOES' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-dark">Solicitações de Minuta por Políticos</h3>
              <p className="text-xs text-gray-500">Exibindo {filteredSolicitacoes.length} de {solicitacoesList.length} pedidos</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Município</th>
                  <th className="py-3.5 px-4">Autor / Cargo</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Data do Pedido</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                {filteredSolicitacoes.map((item, i) => (
                  <tr key={item.id || i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-dark">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-gray-400" />
                        <span>{item.name} - {item.state}</span>
                      </div>
                      {item.isDuplicate && (
                        <span className="mt-1 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-700">
                      <div className="font-bold text-gray-800">{item.councillorName || '-'}</div>
                      <div className="text-[11px] text-gray-400">{item.role || 'Vereador(a)'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-mono text-xs text-gray-800 font-bold">{item.whatsapp || '-'}</div>
                      <div className="text-[11px] text-gray-400">{item.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs">
                      {item.createdAt ? new Date(item.createdAt).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="bg-yellow-100 text-yellow-800 px-2.5 py-1 rounded-lg text-xs font-black uppercase">
                        {item.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => deleteRecord('protocol', item.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Excluir solicitação"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredSolicitacoes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-gray-400 font-medium">
                      {loading ? 'Carregando dados...' : 'Nenhuma solicitação encontrada com os filtros selecionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-SEÇÃO 3: CIDADÃOS QUE BAIXARAM MINUTA */}
      {subSection === 'CIDADAOS' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-dark">Cidadãos Que Baixaram a Minuta do Código Animal</h3>
              <p className="text-xs text-gray-500">Exibindo {filteredCitizens.length} de {processedCitizens.length} cidadãos</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Nome Completo</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Endereço Completo</th>
                  <th className="py-3.5 px-4">Enviar Para</th>
                  <th className="py-3.5 px-4">Data</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                {filteredCitizens.map((cit, i) => (
                  <tr key={cit.id || i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-dark">
                      <div>{cit.nome}</div>
                      {cit.isDuplicate && (
                        <span className="mt-1 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-mono text-xs text-gray-800 font-bold">{cit.whatsapp || '-'}</div>
                      <div className="text-[11px] text-gray-400">{cit.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-medium text-gray-800">{cit.endereco}{cit.numero ? `, ${cit.numero}` : ''}{cit.complemento ? ` (${cit.complemento})` : ''}</div>
                      <div className="text-[11px] text-gray-400">{cit.bairro}, {cit.cidade}/{cit.estado} - CEP: {cit.cep}</div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 rounded-lg text-xs font-bold ${
                        cit.enviarPara === 'prefeito'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {cit.enviarPara === 'prefeito' ? 'Prefeito' : 'Vereador'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {cit.createdAt ? new Date(cit.createdAt).toLocaleDateString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => deleteRecord('citizen', cit.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Excluir cadastro"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredCitizens.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-12 px-4 text-center text-gray-400 font-medium">
                      {loading ? 'Carregando dados...' : 'Nenhum cidadão encontrado com os filtros selecionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* SUB-SEÇÃO 4: ABAIXO-ASSINADOS */}
      {subSection === 'ABAIXO_ASSINADOS' && (
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
            <div>
              <h3 className="text-base sm:text-lg font-black uppercase text-dark">Assinaturas do Abaixo-assinado</h3>
              <p className="text-xs text-gray-500">Exibindo {filteredPetitions.length} de {processedPetitions.length} assinaturas</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                  <th className="py-3.5 px-4">Nome Completo</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Endereço Completo</th>
                  <th className="py-3.5 px-4">Data da Assinatura</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
                {filteredPetitions.map((cit, i) => (
                  <tr key={cit.id || i} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-dark">
                      <div>{cit.nome}</div>
                      {cit.isDuplicate && (
                        <span className="mt-1 inline-block text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-mono text-xs text-gray-800 font-bold">{cit.whatsapp || '-'}</div>
                      <div className="text-[11px] text-gray-400">{cit.email || '-'}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">
                      <div className="font-medium text-gray-800">{cit.endereco}{cit.numero ? `, ${cit.numero}` : ''}{cit.complemento ? ` (${cit.complemento})` : ''}</div>
                      <div className="text-[11px] text-gray-400">{cit.bairro}, {cit.cidade}/{cit.estado} - CEP: {cit.cep}</div>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500 text-xs whitespace-nowrap">
                      {cit.createdAt ? new Date(cit.createdAt).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => deleteRecord('petition', cit.id)}
                        className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                        title="Excluir assinatura"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredPetitions.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-12 px-4 text-center text-gray-400 font-medium">
                      {loading ? 'Carregando dados...' : 'Nenhuma assinatura encontrada com os filtros selecionados.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
