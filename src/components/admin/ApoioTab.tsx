import React, { useState, useEffect, useMemo } from 'react';
import { Search, RefreshCw, Download, Trash2, Filter, Users, UserCheck, Copy, MapPin, Calendar } from 'lucide-react';
import * as XLSX from 'xlsx';
import { DailyGrowthChart } from '../DailyGrowthChart';
import { CityDistributionMap } from '../CityDistributionMap';

interface ApoioTabProps {
  refreshTrigger?: number;
}

export const ApoioTab: React.FC<ApoioTabProps> = ({ refreshTrigger }) => {
  const [citizens, setCitizens] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [cidadeFilter, setCidadeFilter] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'unique' | 'duplicates'>('all');
  const [loading, setLoading] = useState(false);

  const fetchCitizens = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/popup-apoio?_t=${Date.now()}`, {
        cache: 'no-store',
        headers: { 'Cache-Control': 'no-cache' }
      });
      const data = await res.json();
      setCitizens(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn("API request failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCitizens();
  }, [refreshTrigger]);

  const deleteCitizen = async (id: string) => {
    if (!window.confirm("Deseja realmente remover este cadastro de apoio?")) return;
    try {
      await fetch('/api/popup-apoio/' + id, { method: 'DELETE' });
      fetchCitizens();
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const processedList = useMemo(() => {
    const seenEmails = new Set();
    const seenPhones = new Set();
    return citizens.map(item => {
      let isDuplicate = false;
      const emailKey = item.email?.toLowerCase().trim();
      const phoneKey = item.whatsapp?.replace(/\D/g, '');
      if ((emailKey && seenEmails.has(emailKey)) || (phoneKey && phoneKey.length > 8 && seenPhones.has(phoneKey))) {
        isDuplicate = true;
      } else {
        if (emailKey) seenEmails.add(emailKey);
        if (phoneKey && phoneKey.length > 8) seenPhones.add(phoneKey);
      }
      return { ...item, isDuplicate };
    });
  }, [citizens]);

  const uniqueCities = useMemo(() => {
    return Array.from(new Set(citizens.map(c => c.cidade || 'São Paulo'))).filter(Boolean).sort();
  }, [citizens]);

  const filteredData = useMemo(() => {
    return processedList.filter(item => {
      if (filterType === 'unique' && item.isDuplicate) return false;
      if (filterType === 'duplicates' && !item.isDuplicate) return false;
      if (cidadeFilter && (item.cidade || 'São Paulo') !== cidadeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchName = item.nome?.toLowerCase().includes(q);
        const matchPhone = item.whatsapp?.includes(q);
        const matchEmail = item.email?.toLowerCase().includes(q);
        const matchCep = item.cep?.includes(q);
        const matchBairro = item.bairro?.toLowerCase().includes(q);
        const matchCidade = item.cidade?.toLowerCase().includes(q);
        return matchName || matchPhone || matchEmail || matchCep || matchBairro || matchCidade;
      }
      return true;
    });
  }, [processedList, filterType, cidadeFilter, search]);

  const exportToExcel = () => {
    const ws = XLSX.utils.json_to_sheet(filteredData.map(c => ({
      'Data de Cadastro': c.createdAt ? new Date(c.createdAt).toLocaleString('pt-BR') : '',
      'Nome': c.nome,
      'WhatsApp': c.whatsapp,
      'E-mail': c.email,
      'CEP': c.cep,
      'Bairro': c.bairro,
      'Cidade': c.cidade || 'São Paulo',
      'Estado': c.estado || 'SP',
      'Duplicado': c.isDuplicate ? 'Sim' : 'Não'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Apoiadores Pop-up SP");
    XLSX.writeFile(wb, `apoiadores_popup_sp_${filterType}.xlsx`);
  };

  const totalCount = processedList.length;
  const uniqueCount = processedList.filter(c => !c.isDuplicate).length;
  const duplicateCount = processedList.filter(c => c.isDuplicate).length;

  return (
    <div className="space-y-6">
      {/* Cards de Métricas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-[#FF5500] mb-1">
            <Users className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Total Geral</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-dark">{totalCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Cadastros totais</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-green-600 mb-1">
            <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Únicos</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-green-600">{uniqueCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Contatos válidos</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-amber-600 mb-1">
            <Copy className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Duplicados</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-amber-600">{duplicateCount}</p>
          <p className="text-[11px] text-gray-400 font-medium">Cadastros repetidos</p>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-gray-100 shadow-sm">
          <div className="flex items-center gap-2 text-blue-600 mb-1">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5" />
            <span className="text-xs font-black uppercase tracking-wider text-gray-500">Municípios</span>
          </div>
          <p className="text-2xl sm:text-3xl font-black text-blue-600">{uniqueCities.length}</p>
          <p className="text-[11px] text-gray-400 font-medium">Cidades alcançadas</p>
        </div>
      </div>

      {/* Barra de Filtros, Busca e Ações - Totalmente Responsiva */}
      <div className="bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Lado Esquerdo: Título & Filtros de Tipo */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex bg-gray-100/80 p-1 rounded-xl">
              <button
                onClick={() => setFilterType('all')}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  filterType === 'all'
                    ? 'bg-[#FF5500] text-white shadow-sm'
                    : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
                }`}
              >
                Todos ({totalCount})
              </button>
              <button
                onClick={() => setFilterType('unique')}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  filterType === 'unique'
                    ? 'bg-green-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
                }`}
              >
                Únicos ({uniqueCount})
              </button>
              <button
                onClick={() => setFilterType('duplicates')}
                className={`flex-1 sm:flex-initial text-xs sm:text-sm font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                  filterType === 'duplicates'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-gray-600 hover:text-dark hover:bg-gray-200/60'
                }`}
              >
                Duplicados ({duplicateCount})
              </button>
            </div>
          </div>

          {/* Lado Direito: Busca, Select de Cidade e Botões */}
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2.5">
            
            {/* Campo de Busca */}
            <div className="relative flex-1 sm:w-60 min-w-[200px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nome, fone, e-mail..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none text-xs sm:text-sm bg-white font-medium text-gray-800"
              />
            </div>

            {/* Dropdown de Cidade */}
            <div className="relative flex-1 sm:flex-initial sm:w-48 min-w-[170px]">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
              <select
                value={cidadeFilter}
                onChange={(e) => setCidadeFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 rounded-xl border border-gray-200 focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none bg-white font-medium text-gray-700 text-xs sm:text-sm cursor-pointer"
              >
                <option value="">Todas as Cidades ({uniqueCities.length})</option>
                {uniqueCities.map(cidade => (
                  <option key={String(cidade)} value={String(cidade)}>{String(cidade)}</option>
                ))}
              </select>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center gap-2">
              <button
                onClick={fetchCitizens}
                disabled={loading}
                title="Atualizar lista"
                className="flex-1 sm:flex-initial bg-white border border-gray-200 hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#FF5500]' : 'text-gray-500'}`} />
                <span>{loading ? 'Atualizando...' : 'Atualizar'}</span>
              </button>

              <button
                onClick={exportToExcel}
                className="flex-1 sm:flex-initial bg-green-600 hover:bg-green-700 active:bg-green-800 text-white font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-sm transition-all cursor-pointer min-h-[42px]"
              >
                <Download className="w-4 h-4" />
                <span>Exportar ({filteredData.length})</span>
              </button>
            </div>

          </div>

        </div>
      </div>

      {/* Gráfico de Crescimento Diário */}
      <DailyGrowthChart 
        items={citizens}
        title="Histórico de Crescimento - Apoiadores (Pop-up)"
        subtitle="Evolução temporal e volume diário de preenchimentos do formulário"
        accentColor="#FF5500"
        itemNoun="Apoiadores"
      />

      {/* Mapa de Calor por Cidade */}
      <CityDistributionMap 
        items={citizens}
        title="Mapa de Calor (Apoiadores por Cidade)"
        subtitle="Apoiadores cadastrados no Estado de São Paulo"
        itemLabel="apoiador"
        accentColor="#FF5500"
      />

      {/* Tabela de Apoiadores */}
      <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-gray-50/50">
          <div>
            <h3 className="text-base sm:text-lg font-black uppercase text-dark">Lista de Apoiadores Cadastrados</h3>
            <p className="text-xs text-gray-500">Exibindo {filteredData.length} de {totalCount} registros</p>
          </div>
          {search && (
            <span className="text-xs font-bold text-[#FF5500] bg-orange-50 px-2.5 py-1 rounded-lg">
              Filtro ativo: "{search}"
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[750px]">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase text-[11px] font-black tracking-wider">
                <th className="py-3.5 px-4">Data / Hora</th>
                <th className="py-3.5 px-4">Nome Completo</th>
                <th className="py-3.5 px-4">WhatsApp</th>
                <th className="py-3.5 px-4">E-mail</th>
                <th className="py-3.5 px-4">CEP / Bairro</th>
                <th className="py-3.5 px-4">Município</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 text-xs sm:text-sm">
              {filteredData.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="py-3.5 px-4 text-xs text-gray-500 whitespace-nowrap">
                    {c.createdAt ? new Date(c.createdAt).toLocaleDateString('pt-BR') + ' ' + new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                  </td>
                  <td className="py-3.5 px-4 font-bold text-gray-800">
                    <div className="flex items-center gap-2">
                      <span>{c.nome}</span>
                      {c.isDuplicate && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black tracking-wide">
                          DUPLICADO
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700 font-mono font-medium whitespace-nowrap">
                    {c.whatsapp}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    {c.email || '-'}
                  </td>
                  <td className="py-3.5 px-4 text-gray-600">
                    <span className="font-mono text-xs">{c.cep || '-'}</span>
                    <div className="text-[11px] text-gray-400">{c.bairro || 'Sem bairro'}</div>
                  </td>
                  <td className="py-3.5 px-4 text-gray-700">
                    <span className="font-bold">{c.cidade || 'São Paulo'}</span>
                    <span className="text-gray-400 text-xs ml-1">/{c.estado || 'SP'}</span>
                  </td>
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <button
                      onClick={() => deleteCitizen(c.id)}
                      className="text-red-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors cursor-pointer"
                      title="Excluir cadastro"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filteredData.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 px-4 text-center text-gray-400 font-medium">
                    {loading ? 'Carregando dados...' : 'Nenhum apoiador encontrado com os filtros atuais.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
