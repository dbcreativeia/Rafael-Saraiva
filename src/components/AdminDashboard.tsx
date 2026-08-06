import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'motion/react';
import { Lock, Search, RefreshCw, LayoutDashboard, Database, CheckCircle2, AlertCircle, Eye, EyeOff, Download, Users, FileSignature, Trash2, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import * as XLSX from 'xlsx';

export const AdminDashboard = () => {
  const [password, setPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [data, setData] = useState<any[]>([]);
  const [citizensData, setCitizensData] = useState<any[]>([]);
  const [petitionsData, setPetitionsData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchQuerySolicitacoes, setSearchQuerySolicitacoes] = useState('');
  const [cityFilterProtocolos, setCityFilterProtocolos] = useState('');
  const [cityFilterSolicitacoes, setCityFilterSolicitacoes] = useState('');
  const [cityFilterCitizens, setCityFilterCitizens] = useState('');
  const [cityFilterPetitions, setCityFilterPetitions] = useState('');
  const [activeTab, setActiveTab] = useState<'PROTOCOLOS' | 'JOGO'>('PROTOCOLOS');
  const [jogoUsersData, setJogoUsersData] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'all' | 'unique' | 'duplicates'>('all');

  // Optional cities tracking (now unused in AdminDashboard since we removed form, but kept if needed)
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios')
      .then(res => res.json())
      .then(d => {
        setCities(d.map((c: any) => c.nome).sort());
        setLoadingCities(false);
      })
      .catch(err => {
        console.error(err);
        setLoadingCities(false);
      });
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'castrar2026') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      setError('Senha incorreta');
    }
  };

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const [response, citizensResponse, petitionsResponse, jogoUsersResponse] = await Promise.all([
        fetch('/api/cities'),
        fetch('/api/citizens'),
        fetch('/api/petitions'),
        fetch('/api/jogo/users')
      ]);
      const result = await response.json();
      const citizensResult = await citizensResponse.json();
      const petitionsResult = await petitionsResponse.json();
      const jogoUsersResult = await jogoUsersResponse.json();
      setData(Array.isArray(result) ? result : []);
      setCitizensData(Array.isArray(citizensResult) ? citizensResult : []);
      setPetitionsData(Array.isArray(petitionsResult) ? petitionsResult : []);
      setJogoUsersData(Array.isArray(jogoUsersResult) ? jogoUsersResult : []);
    } catch (err) {
      console.error(err);
    }
    if (!quiet) setLoading(false);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchData(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const toggleDisplay = async (id: string) => {
    try {
      await fetch(`/api/protocols/${id}/toggle-active`, { method: 'PUT' });
      fetchData();
    } catch (err) {
      console.error(err);
    }
  };

  const deleteRecord = async (type: 'protocol' | 'citizen' | 'petition', id: string) => {
    
    try {
      if (type === 'protocol') await fetch(`/api/protocols/${id}`, { method: 'DELETE' });
      else if (type === 'citizen') await fetch(`/api/citizens/${id}`, { method: 'DELETE' });
      else if (type === 'petition') await fetch(`/api/petitions/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (err) {
      console.error(err);
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

  const applyFilter = (list: any[]) => {
    if (filterType === 'unique') return list.filter(item => !item.isDuplicate);
    if (filterType === 'duplicates') return list.filter(item => item.isDuplicate);
    return list;
  };

  const exportDataExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = data.filter(d => d.status === 'protocolado').map(d => ({
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
      "Data de Cadastro": d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Protocolos");
    XLSX.writeFile(wb, "protocolos_codigo_animal.xlsx");
  };

  const exportSolicitacoesExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = data.filter(d => d.status === 'solicitado').map(d => ({
      "Município": d.name,
      "Estado": d.state,
      "Autor": d.councillorName,
      "Cargo": d.role,
      "Email": d.email,
      "WhatsApp": d.whatsapp,
      "Status": d.status,
      "Data de Cadastro": d.createdAt ? new Date(d.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Solicitações");
    XLSX.writeFile(wb, "solicitacoes_minuta.xlsx");
  };

  const exportCitizensExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = citizensData.map(c => ({
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
      'Data de Cadastro': c.createdAt ? new Date(c.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Cidadãos");
    XLSX.writeFile(wb, "cidadaos_sem_projeto_codigo_animal.xlsx");
  };

  const exportPetitionsExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = petitionsData.map(p => ({
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
      'Data de Assinatura': p.createdAt ? new Date(p.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Abaixo-assinados");
    XLSX.writeFile(wb, "abaixo_assinados_codigo_animal.xlsx");
  };


  const exportJogoUsersExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = jogoUsersData.map(u => ({
      Nome: u.nomeCompleto,
      Usuario: u.usuario,
      WhatsApp: u.whatsapp,
      Email: u.email,
      CEP: u.cep,
      Cidade: u.cidade,
      Estado: u.estado,
      'Data de Cadastro': u.createdAt ? new Date(u.createdAt).toLocaleString() : ''
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, sheet, "Jogo Users");
    XLSX.writeFile(wb, "jogo_users.xlsx");
  };

  const deleteJogoUser = async (id: string) => {
    
    try {
      await fetch(`/api/jogo/users/${id}`, { method: 'DELETE' });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white p-8 rounded-3xl shadow-xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-primary">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center text-dark mb-6 uppercase">Acesso Restrito</h2>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">Senha de Acesso</label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
                placeholder="******"
              />
            </div>
            {error && <p className="text-red-500 text-sm font-bold">{error}</p>}
            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-600 text-white font-bold py-3 rounded-xl uppercase transition-colors"
            >
              Entrar
            </button>
          </form>
          <div className="mt-6 text-center">
             <Link to="/" className="text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors">Voltar para o site</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pt-10 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-dark flex items-center gap-3">
              <LayoutDashboard className="w-8 h-8 text-primary" />
              Painel Administrativo
            </h1>
            <p className="text-gray-500 font-medium mt-1">Gerenciamento de protocolos do Código Animal</p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <button
              onClick={fetchData}
              className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors shadow-sm w-full md:w-auto"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
            </button>
            <Link to="/" className="bg-dark hover:bg-black text-white font-bold px-4 py-2 rounded-xl transition-colors shadow-sm text-center w-full md:w-auto">
              Sair
            </Link>
          </div>
        </div>


        <div className="flex gap-4 mb-8 border-b border-gray-200">
          <button
            onClick={() => setActiveTab('PROTOCOLOS')}
            className={`pb-4 font-bold uppercase tracking-wider transition-colors ${activeTab === 'PROTOCOLOS' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Protocolos e Abaixo-assinados
          </button>
          <button
            onClick={() => setActiveTab('JOGO')}
            className={`pb-4 font-bold uppercase tracking-wider transition-colors ${activeTab === 'JOGO' ? 'border-b-4 border-primary text-primary' : 'text-gray-400 hover:text-gray-600'}`}
          >
            Jogo - Missão Resgate
          </button>
        </div>

        {activeTab === 'PROTOCOLOS' && (
          <div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">Políticos Protocolados</p>
              <p className="text-2xl font-black">{processedData.filter(d => d.status === 'protocolado' && !d.isDuplicate).length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-50 text-yellow-600 rounded-xl flex items-center justify-center shrink-0">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">Solicitações de Minuta</p>
              <p className="text-2xl font-black">{processedData.filter(d => d.status === 'solicitado' && !d.isDuplicate).length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">Cidadãos Mobilizados</p>
              <p className="text-2xl font-black">{processedCitizens.filter(c => !c.isDuplicate).length}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">Abaixo-assinados</p>
              <p className="text-2xl font-black">{processedPetitions.filter(p => !p.isDuplicate).length}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por autor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="relative flex-1 max-w-xs">
            <select
              value={cityFilterProtocolos}
              onChange={(e) => setCityFilterProtocolos(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700"
            >
              <option value="">Todos os municípios</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="flex bg-white rounded-xl border border-gray-200 p-1">
            <button 
              onClick={() => setFilterType('all')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'all' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Todos
            </button>
            <button 
              onClick={() => setFilterType('unique')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'unique' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Únicos
            </button>
            <button 
              onClick={() => setFilterType('duplicates')}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'duplicates' ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Duplicados
            </button>
          </div>
        </div>

        {/* Políticos - Protocolados */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black uppercase text-dark">Protocolos Registrados</h2>
            <button onClick={exportDataExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                  <th className="p-4 font-black">Município</th>
                  <th className="p-4 font-black">Autor</th>
                  <th className="p-4 font-black">Email / Whatsapp</th>
                  <th className="p-4 font-black">Nº PL</th>
                  <th className="p-4 font-black">Data</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applyFilter(processedData).filter(d => d.status === 'protocolado' && (cityFilterProtocolos === '' || d.name === cityFilterProtocolos) && (d.councillorName && d.councillorName.toLowerCase().includes(searchQuery.toLowerCase()))).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-gray-500 font-medium">Nenhum protocolo encontrado.</td>
                  </tr>
                ) : (
                  applyFilter(processedData).filter(d => d.status === 'protocolado' && (cityFilterProtocolos === '' || d.name === cityFilterProtocolos) && (d.councillorName && d.councillorName.toLowerCase().includes(searchQuery.toLowerCase()))).map((item, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${item.active === false ? 'opacity-50' : ''} ${item.isDuplicate ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-dark">
                        {item.name} - {item.state}
                        {item.isDuplicate && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Duplicado</span>}
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{item.councillorName || '-'} {item.role ? `(${item.role})` : ''}</td>
                      <td className="p-4 text-gray-600">
                        <div>{item.email || '-'}</div>
                        <div className="text-xs text-gray-500">{item.whatsapp || '-'}</div>
                      </td>
                      <td className="p-4 text-gray-600">{item.protocolNumber || '-'}</td>
                      <td className="p-4 text-gray-600">{item.date || '-'}</td>
                      <td className="p-4">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-md text-xs uppercase font-black">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => toggleDisplay(item.id)}
                          className={`p-2 rounded-lg font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors ${item.active !== false ? 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100' : 'bg-green-50 text-green-600 hover:bg-green-100'}`}
                        >
                          {item.active !== false ? (
                            <><EyeOff className="w-4 h-4" /> Desativar</>
                          ) : (
                            <><Eye className="w-4 h-4" /> Ativar</>
                          )}
                        </button>
                        <button
                          onClick={() => deleteRecord('protocol', item.id)}
                          className="p-2 rounded-lg font-bold text-xs tracking-wider flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                          title="Apagar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search bar para Solicitações */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por autor nas solicitações..."
              value={searchQuerySolicitacoes}
              onChange={(e) => setSearchQuerySolicitacoes(e.target.value)}
              className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
            />
          </div>
          <div className="relative flex-1 max-w-xs">
            <select
              value={cityFilterSolicitacoes}
              onChange={(e) => setCityFilterSolicitacoes(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700"
            >
              <option value="">Todos os municípios</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Políticos - Solicitações */}
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-12">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <h2 className="text-xl font-black uppercase text-dark">Solicitações de Minuta</h2>
            <button onClick={exportSolicitacoesExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm">
              <Download className="w-4 h-4" /> Exportar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                  <th className="p-4 font-black">Município</th>
                  <th className="p-4 font-black">Autor</th>
                  <th className="p-4 font-black">Email / Whatsapp</th>
                  <th className="p-4 font-black">Data de Cadastro</th>
                  <th className="p-4 font-black">Status</th>
                  <th className="p-4 font-black text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applyFilter(processedData).filter(d => d.status === 'solicitado' && (cityFilterSolicitacoes === '' || d.name === cityFilterSolicitacoes) && (d.councillorName && d.councillorName.toLowerCase().includes(searchQuerySolicitacoes.toLowerCase()))).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">Nenhuma solicitação encontrada.</td>
                  </tr>
                ) : (
                  applyFilter(processedData).filter(d => d.status === 'solicitado' && (cityFilterSolicitacoes === '' || d.name === cityFilterSolicitacoes) && (d.councillorName && d.councillorName.toLowerCase().includes(searchQuerySolicitacoes.toLowerCase()))).map((item, i) => (
                    <tr key={i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${item.isDuplicate ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-dark">
                        {item.name} - {item.state}
                        {item.isDuplicate && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Duplicado</span>}
                      </td>
                      <td className="p-4 text-gray-600 font-medium">{item.councillorName || '-'} {item.role ? `(${item.role})` : ''}</td>
                      <td className="p-4 text-gray-600">
                        <div>{item.email || '-'}</div>
                        <div className="text-xs text-gray-500">{item.whatsapp || '-'}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4">
                        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-xs uppercase font-black">
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteRecord('protocol', item.id)}
                          className="p-2 rounded-lg font-bold text-xs tracking-wider flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                          title="Apagar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
            <h2 className="text-xl font-black uppercase text-dark">Cidadãos Que Baixaram a Minuta</h2>
            <div className="flex gap-4 w-full md:w-auto">
              <select
                value={cityFilterCitizens}
                onChange={(e) => setCityFilterCitizens(e.target.value)}
                className="w-full md:w-64 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-sm"
              >
                <option value="">Todos os municípios</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={exportCitizensExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm whitespace-nowrap">
                <Download className="w-4 h-4" /> Exportar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                  <th className="p-4 font-black">Nome</th>
                  <th className="p-4 font-black">Email / Whatsapp</th>
                  <th className="p-4 font-black">Endereço</th>
                  <th className="p-4 font-black">Enviar Para</th>
                  <th className="p-4 font-black">Data</th>
                  <th className="p-4 font-black text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applyFilter(processedCitizens).filter(cit => cityFilterCitizens === '' || cit.cidade === cityFilterCitizens).length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500 font-medium">Nenhum cidadão cadastrado ainda.</td>
                  </tr>
                ) : (
                  applyFilter(processedCitizens).filter(cit => cityFilterCitizens === '' || cit.cidade === cityFilterCitizens).map((cit, i) => (
                    <tr key={cit.id || i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${cit.isDuplicate ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-dark">
                        {cit.nome}
                        {cit.isDuplicate && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Duplicado</span>}
                      </td>
                      <td className="p-4 text-gray-600">
                        <div>{cit.email}</div>
                        <div className="text-xs text-gray-500">{cit.whatsapp}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {cit.endereco}, {cit.numero} {cit.complemento ? `(${cit.complemento})` : ''} - {cit.bairro}<br />
                        {cit.cidade}/{cit.estado} - {cit.cep}
                      </td>
                      <td className="p-4 text-gray-600 font-medium">
                        {cit.enviarPara === 'prefeito' ? 'Prefeito' : 'Vereador'}
                      </td>
                      <td className="p-4 text-gray-600">
                        {cit.createdAt ? new Date(cit.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteRecord('citizen', cit.id)}
                          className="p-2 rounded-lg font-bold text-xs tracking-wider flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                          title="Apagar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-12 bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gray-50/50">
            <h2 className="text-xl font-black uppercase text-dark">Abaixo-assinado de Projetos Registrados</h2>
            <div className="flex gap-4 w-full md:w-auto">
              <select
                value={cityFilterPetitions}
                onChange={(e) => setCityFilterPetitions(e.target.value)}
                className="w-full md:w-64 px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white font-medium text-gray-700 text-sm"
              >
                <option value="">Todos os municípios</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <button onClick={exportPetitionsExcel} className="bg-green-600 hover:bg-green-700 text-white font-bold px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm shadow-sm whitespace-nowrap">
                <Download className="w-4 h-4" /> Exportar
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-sm uppercase text-gray-500 tracking-wider">
                  <th className="p-4 font-black">Nome</th>
                  <th className="p-4 font-black">Email / Whatsapp</th>
                  <th className="p-4 font-black">Endereço</th>
                  <th className="p-4 font-black">Data</th>
                  <th className="p-4 font-black text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {applyFilter(processedPetitions).filter(cit => cityFilterPetitions === '' || cit.cidade === cityFilterPetitions).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Nenhuma assinatura ainda.</td>
                  </tr>
                ) : (
                  applyFilter(processedPetitions).filter(cit => cityFilterPetitions === '' || cit.cidade === cityFilterPetitions).map((cit, i) => (
                    <tr key={cit.id || i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${cit.isDuplicate ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-dark">
                        {cit.nome}
                        {cit.isDuplicate && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Duplicado</span>}
                      </td>
                      <td className="p-4 text-gray-600">
                        <div>{cit.email}</div>
                        <div className="text-xs text-gray-500">{cit.whatsapp}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {cit.endereco}, {cit.numero} {cit.complemento ? `(${cit.complemento})` : ''} - {cit.bairro}<br />
                        {cit.cidade}/{cit.estado} - {cit.cep}
                      </td>
                      <td className="p-4 text-gray-600">
                        {cit.createdAt ? new Date(cit.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteRecord('petition', cit.id)}
                          className="p-2 rounded-lg font-bold text-xs tracking-wider flex items-center justify-center gap-2 bg-red-50 text-red-600 hover:bg-red-100 transition-colors ml-auto"
                          title="Apagar Registro"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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

        {activeTab === 'JOGO' && (
          <div>
            <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden mb-8">
              <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <h2 className="text-xl font-black uppercase text-dark">Usuários do Jogo</h2>
                  <div className="text-sm font-bold bg-blue-50 text-blue-600 py-1 px-3 rounded-lg">
                    {jogoUsersData.length} Cadastros
                  </div>
                </div>
                <button
                  onClick={exportJogoUsersExcel}
                  className="bg-green-50 hover:bg-green-100 text-green-700 font-bold px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm"
                >
                  <Download className="w-4 h-4" /> Exportar Dados
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Data</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Nome Completo</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Usuário</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Contato</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs">Localidade</th>
                      <th className="p-4 font-bold text-gray-500 uppercase text-xs text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jogoUsersData.length === 0 ? (
                      <tr><td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Nenhum cadastro encontrado.</td></tr>
                    ) : (
                      jogoUsersData.map((user, idx) => (
                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="p-4 text-sm font-medium text-gray-600">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                          <td className="p-4 font-bold text-dark">{user.nomeCompleto}</td>
                          <td className="p-4 text-sm font-bold text-primary">{user.usuario}</td>
                          <td className="p-4 text-sm font-medium text-gray-600">
                            <div>{user.email}</div>
                            <div className="text-xs text-gray-400">{user.whatsapp}</div>
                          </td>
                          <td className="p-4 text-sm font-medium text-gray-600">
                            <div>{user.cidade} - {user.estado || 'SP'}</div>
                            <div className="text-xs text-gray-400">CEP: {user.cep}</div>
                          </td>
                          <td className="p-4 text-right">
                            <button
                              onClick={() => deleteJogoUser(user.id)}
                              className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                              title="Remover Cadastro"
                            >
                              <Trash2 className="w-5 h-5" />
                            </button>
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

      </div>
    </div>
  );
};
