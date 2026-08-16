import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, MapPin, Building2, CheckCircle2, ChevronRight, Download, Send, AlertCircle, FileText, Users, Share2, Info, Book, Gavel, HeartHandshake, Eye, Shield, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Footer } from './Footer';
import { trackEvent } from '../analytics';
import { WHATSAPP_NUMBER } from '../constants';

const downloadPDF = () => {
  fetch('/Deputado-Rafael-Saraiva_Codigo-Municipal-Animal.pdf')
    .then(response => response.blob())
    .then(blob => {
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = 'Deputado-Rafael-Saraiva_Codigo-Municipal-Animal.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    })
    .catch((err) => console.error("Error downloading PDF", err));
};

const formatPhone = (value: string) => {
  const v = value.replace(/\D/g, '');
  if (v.length <= 10) {
    return v.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  } else {
    return v.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '');
  }
};

export const CodigoAnimal = () => {
  const [activeTab, setActiveTab] = useState<'cidadao' | 'vereador'>('cidadao');
  
  const citizenFormRef = useRef<HTMLDivElement>(null);
  const petitionFormRef = useRef<HTMLDivElement>(null);
  const vereadorFormRef = useRef<HTMLDivElement>(null);
  
  // Citizen Form state
  const [citizenFormData, setCitizenFormData] = useState({
    nome: '', whatsapp: '', email: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '', enviarPara: 'vereador'
  });
  const [isCitizenFormSubmitted, setIsCitizenFormSubmitted] = useState(false);

  // Petition Form state
  const [petitionFormData, setPetitionFormData] = useState({
    nome: '', whatsapp: '', email: '', cep: '', endereco: '', numero: '', complemento: '', bairro: '', cidade: '', estado: ''
  });
  const [isPetitionSubmitted, setIsPetitionSubmitted] = useState(false);

  // Cities
  const [cities, setCities] = useState<string[]>([]);
  const [loadingCities, setLoadingCities] = useState(true);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios')
      .then(res => res.json())
      .then(data => {
        setCities(data.map((c: any) => c.nome).sort());
        setLoadingCities(false);
      })
      .catch(err => {
        console.warn("API request failed:", err);
        setLoadingCities(false);
      });
  }, []);

  // States for city search
  const [searchCity, setSearchCity] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Form states for vereadores
  const [formData, setFormData] = useState({
    nome: '', cargo: '', municipio: '', estado: 'SP', whatsapp: '', email: '',
    jaProtocolou: 'nao', numeroPL: '', dataProtocolo: '', linkProtocolo: ''
  });
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleCitizenSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('Lead');
    trackEvent('Lead_Citizen_Form');
    try {
      await fetch('/api/citizens', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(citizenFormData)
      });
    } catch (err) {
      console.warn("API request failed:", err);
    }
    setIsCitizenFormSubmitted(true);
    
    // Automatic download
    downloadPDF();
    
    setTimeout(() => {
      citizenFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handlePetitionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('Lead');
    trackEvent('Lead_Petition_Form');
    try {
      await fetch('/api/petitions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(petitionFormData)
      });
    } catch (err) {
      console.warn("API request failed:", err);
    }
    setIsPetitionSubmitted(true);
    setTimeout(() => {
      petitionFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
  };

  const handlePetitionCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setPetitionFormData({ ...petitionFormData, cep: e.target.value });
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setPetitionFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (err) {
        console.warn("API request failed:", err);
      }
    }
  };

  const handleCepChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const cep = e.target.value.replace(/\D/g, '');
    setCitizenFormData({ ...citizenFormData, cep: e.target.value });
    if (cep.length === 8) {
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setCitizenFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || ''
          }));
        }
      } catch (err) {
        console.warn("API request failed:", err);
      }
    }
  };

  const handleSearch = async (e?: React.FormEvent, cityOverride?: string) => {
    if (e) e.preventDefault();
    const city = cityOverride || searchCity;
    if (!city.trim()) return;
    
    setIsSearching(true);
    try {
      const response = await fetch(`/api/cities/${encodeURIComponent(city.trim())}`);
      const data = await response.json();
      setSearchResult(data);
      setTimeout(() => {
        const resultEl = document.getElementById('search-result-block');
        if (resultEl) {
          resultEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } catch (error) {
      console.warn("API request failed:", error);
    }
    setIsSearching(false);
  };

  const handleVereadorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    trackEvent('Lead');
    trackEvent('Lead_Vereador_Form');
    try {
      const payload = {
        name: formData.municipio,
        state: formData.estado,
        councillorName: formData.nome,
        role: formData.cargo,
        email: formData.email,
        whatsapp: formData.whatsapp,
        protocolNumber: formData.numeroPL,
        date: formData.dataProtocolo,
        link: formData.linkProtocolo,
        jaProtocolou: formData.jaProtocolou
      };
      
      await fetch('/api/protocols', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      setSubmitSuccess(true);
      setTimeout(() => {
        vereadorFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100);
      
      if (formData.jaProtocolou === 'nao') {
        downloadPDF();
      }
    } catch (err) {
      console.warn("API request failed:", err);
    }
  };

  const msgCidadao = `Olá, vereador(a).\n\nSou morador(a) de ${searchResult?.name || '[cidade]'} e gostaria de pedir que o senhor(a) protocole o Código Municipal de Proteção Animal.\n\nA proposta busca criar regras mais claras para a proteção dos animais, fortalecer políticas públicas locais e dar ao município instrumentos próprios para atuar nessa pauta.\n\nO Estado de São Paulo já avançou na discussão sobre o Código Estadual. Agora, é importante que cada cidade também tenha sua legislação municipal.\n\nConto com seu apoio.`;

  return (
    <div className="bg-gray-50 min-h-screen flex flex-col text-gray-900">
      <Helmet>
        <title>Código Animal Municipal | Rafael Saraiva 44077</title>
        <meta name="title" content="Código Animal Municipal | Rafael Saraiva 44077" />
        <meta name="description" content="Iniciativa para a implementação do Código Municipal de Proteção Animal nas cidades. Ajude a proteger os animais no seu município." />
        <meta name="keywords" content="Código Animal, Proteção Animal, Lei Animal, Rafael Saraiva 44077, Rafael Saraiva, Código Municipal de Proteção Animal" />
        
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/codigoanimal" />
        <meta property="og:title" content="Código Animal Municipal | Rafael Saraiva 44077" />
        <meta property="og:description" content="Iniciativa para a implementação do Código Municipal de Proteção Animal nas cidades. Ajude a proteger os animais no seu município." />
        <meta property="og:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />

        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/codigoanimal" />
        <meta property="twitter:title" content="Código Animal Municipal | Rafael Saraiva 44077" />
        <meta property="twitter:description" content="Iniciativa para a implementação do Código Municipal de Proteção Animal nas cidades. Ajude a proteger os animais no seu município." />
        <meta property="twitter:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
      </Helmet>
      <div className="flex-1 pt-28 md:pt-36 pb-10 md:pb-14">
        <div className="max-w-6xl mx-auto px-6">
          
          {/* HERO SECTION */}
          <div className="bg-gradient-to-br from-dark to-primary text-white rounded-3xl p-6 sm:p-8 md:p-12 lg:p-16 shadow-xl mb-16 relative overflow-hidden flex flex-col lg:flex-row justify-between items-center gap-10 lg:gap-12">
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/20 blur-3xl rounded-full mix-blend-screen pointer-events-none"></div>
            
            <div className="relative z-10 w-full lg:w-1/2 order-2 lg:order-1 flex items-center justify-center">
              <img 
                src="https://lh3.googleusercontent.com/d/151YGYPfFPThcLuX0sZ7dkCRmbuntBdzq" 
                alt="Deputado Rafael Saraiva" 
                className="w-full max-w-sm lg:max-w-md rounded-2xl shadow-2xl object-cover border-4 border-white/10 rotate-1 hover:rotate-0 transition-transform duration-500"
                referrerPolicy="no-referrer"
              />
            </div>
            
            <div className="relative z-10 w-full lg:w-[55%] order-1 lg:order-2 text-center lg:text-left">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black uppercase tracking-tight mb-6 lg:mb-8 font-display leading-[1.15]">
                Sua cidade já tem <span className="text-accent">Código Animal</span>?
              </h1>
              <div className="space-y-4 lg:space-y-5 text-base sm:text-lg font-medium text-blue-50 leading-relaxed mb-8 lg:mb-10 text-left">
                <p>
                  Depois de liderar a discussão pela modernização do Código Estadual de Bem-Estar Animal em São Paulo, o deputado Rafael Saraiva quer ajudar os municípios a avançarem também.
                </p>
                <p>
                  A partir de audiências públicas, reuniões e escuta da sociedade civil, ficou claro que cada cidade precisa ter regras próprias para proteger os animais, fortalecer a fiscalização, orientar a população e ampliar políticas públicas como castração, resgate e cuidado.
                </p>
                <p>
                  Por isso, Rafael está disponibilizando uma <strong className="text-white">minuta de Código Municipal de Proteção Animal</strong> para que vereadores ou prefeitos possam protocolar o projeto em suas cidades.
                </p>
                <p className="font-bold text-white text-[1.1rem] sm:text-lg lg:text-xl pt-2">
                  Consulte sua cidade e veja se ela já faz parte dessa corrente pela proteção animal.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-4 sm:gap-3 lg:gap-4 justify-center lg:justify-start w-full">
                <button 
                  onClick={() => { setActiveTab('cidadao'); document.getElementById('formularios')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="w-full sm:w-1/2 bg-[#FF3B30] text-white font-black px-4 sm:px-6 py-4 rounded-xl uppercase hover:bg-[#E6352B] transition-all shadow-[0_0_20px_rgba(255,59,48,0.6)] hover:shadow-[0_0_30px_rgba(255,59,48,0.8)] hover:scale-105 text-center text-sm lg:text-base leading-snug"
                >
                  Minha cidade protege os animais?
                </button>
                <button 
                  onClick={() => { setActiveTab('vereador'); document.getElementById('formularios')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}
                  className="w-full sm:w-1/2 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 text-white font-bold px-4 sm:px-6 py-4 rounded-xl uppercase transition-colors text-center text-sm lg:text-base leading-snug"
                >
                  Sou vereador ou prefeito
                </button>
              </div>
            </div>
          </div>

        {/* TABS */}
        <div id="formularios" className="flex justify-center mb-8 scroll-mt-24">
          <div className="bg-white p-1 rounded-2xl shadow-sm border border-gray-100 inline-flex">
            <button 
              onClick={() => setActiveTab('cidadao')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'cidadao' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-dark hover:bg-gray-50'}`}
            >
              Sou Cidadão
            </button>
            <button 
              onClick={() => setActiveTab('vereador')}
              className={`px-6 py-3 rounded-xl font-bold transition-all ${activeTab === 'vereador' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-dark hover:bg-gray-50'}`}
            >
              Sou Vereador ou Prefeito
            </button>
          </div>
        </div>

        {/* TAB CONTENTS */}
        <AnimatePresence mode="wait">
          {activeTab === 'cidadao' && (
            <motion.div 
              key="cidadao"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
                <h2 className="text-2xl font-black uppercase text-dark mb-6 flex items-center gap-2">
                  <Search className="w-6 h-6 text-secondary" /> Consulte sua Cidade
                </h2>
                <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    <select 
                      value={searchCity}
                      onChange={(e) => {
                        setSearchCity(e.target.value);
                        handleSearch(undefined, e.target.value);
                      }}
                      className="w-full pl-12 pr-4 py-4 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all font-medium appearance-none bg-white"
                      disabled={loadingCities}
                    >
                      <option value="" disabled>
                        {loadingCities ? 'Carregando cidades...' : 'Selecione a sua cidade...'}
                      </option>
                      {cities.map((city) => (
                        <option key={city} value={city}>{city}</option>
                      ))}
                    </select>
                  </div>
                  <button 
                    disabled={isSearching}
                    className="w-full sm:w-auto bg-dark hover:bg-black text-white font-bold px-8 py-4 rounded-xl uppercase tracking-wider transition-colors disabled:opacity-50"
                  >
                    {isSearching ? 'Buscando...' : 'Consultar'}
                  </button>
                </form>

                {searchResult && (
                  <motion.div 
                    id="search-result-block"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="mt-8 pt-8 border-t border-gray-100"
                  >
                    {searchResult.status === 'nao-protocolado' ? (
                      <div ref={citizenFormRef} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mt-8">
                        <div className="flex items-start gap-4 mb-6">
                          <AlertCircle className="w-8 h-8 text-red-500 shrink-0 mt-1" />
                          <div>
                            <h3 className="text-xl font-bold text-dark mb-2">
                              Ainda não identificamos um projeto em {searchResult.name}!
                            </h3>
                            <p className="text-gray-600 font-medium">
                              Preencha os dados abaixo para baixar a minuta e enviá-la para as autoridades da sua cidade.
                            </p>
                          </div>
                        </div>

                        {isCitizenFormSubmitted ? (
                          <div className="bg-green-50 p-6 rounded-xl border border-green-200 text-center font-bold text-green-800">
                            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                            <p className="mb-4">Cadastro realizado com sucesso!</p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4">
                              <button onClick={(e) => {
                                e.preventDefault();
                                downloadPDF();
                              }} className="bg-white border text-center border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                                <Download className="w-4 h-4" /> Baixar Minuta
                              </button>
                            </div>
                          </div>
                        ) : (
                          <form onSubmit={handleCitizenSubmit} className="space-y-4">
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-1">Nome Completo*</label>
                              <input required type="text" value={citizenFormData.nome} onChange={e => setCitizenFormData({...citizenFormData, nome: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Whatsapp*</label>
                                <input required type="tel" value={citizenFormData.whatsapp} onChange={e => setCitizenFormData({...citizenFormData, whatsapp: formatPhone(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">E-mail*</label>
                                <input required type="email" value={citizenFormData.email} onChange={e => setCitizenFormData({...citizenFormData, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">CEP*</label>
                                <input required type="text" maxLength={8} value={citizenFormData.cep} onChange={handleCepChange} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div className="md:col-span-3">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Endereço*</label>
                                <input required type="text" value={citizenFormData.endereco} onChange={e => setCitizenFormData({...citizenFormData, endereco: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="Rua, Avenida..." />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                              <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Número*</label>
                                <input required type="text" value={citizenFormData.numero} onChange={e => setCitizenFormData({...citizenFormData, numero: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div className="md:col-span-1">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Complemento</label>
                                <input type="text" value={citizenFormData.complemento} onChange={e => setCitizenFormData({...citizenFormData, complemento: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-bold text-gray-700 mb-1">Bairro*</label>
                                <input required type="text" value={citizenFormData.bairro} onChange={e => setCitizenFormData({...citizenFormData, bairro: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Cidade*</label>
                                <input required type="text" value={citizenFormData.cidade} onChange={e => setCitizenFormData({...citizenFormData, cidade: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                              </div>
                              <div>
                                <label className="block text-sm font-bold text-gray-700 mb-1">Estado*</label>
                                <input required type="text" maxLength={2} value={citizenFormData.estado} onChange={e => setCitizenFormData({...citizenFormData, estado: e.target.value.toUpperCase()})} className="w-full px-4 py-2 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" placeholder="UF" />
                              </div>
                            </div>
                            <div className="pt-2">
                              <label className="block text-sm font-bold text-gray-700 mb-2">Deseja enviar a minuta para:</label>
                              <div className="flex gap-4">
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="enviarPara" value="vereador" checked={citizenFormData.enviarPara === 'vereador'} onChange={e => setCitizenFormData({...citizenFormData, enviarPara: e.target.value})} className="w-4 h-4 text-primary focus:ring-primary" />
                                  <span className="font-medium text-gray-700">Vereador</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                  <input type="radio" name="enviarPara" value="prefeito" checked={citizenFormData.enviarPara === 'prefeito'} onChange={e => setCitizenFormData({...citizenFormData, enviarPara: e.target.value})} className="w-4 h-4 text-primary focus:ring-primary" />
                                  <span className="font-medium text-gray-700">Prefeito</span>
                                </label>
                              </div>
                            </div>
                            <div className="pt-4">
                              <button type="submit" className="w-full bg-dark hover:bg-black text-white font-bold px-6 py-3 rounded-xl uppercase tracking-wider transition-colors">
                                Cadastrar e Baixar Minuta
                              </button>
                              <label className="flex items-start gap-2 mt-4 cursor-pointer">
                                <input required type="checkbox" className="mt-0.5 flex-shrink-0 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                                <span className="text-xs text-gray-500 leading-relaxed text-left">
                                  Li e concordo com a <Link to="/politica-de-privacidade" className="underline hover:text-gray-700" >Política de Privacidade e Proteção de Dados</Link> e com o tratamento de meus dados, em conformidade com a LGPD.
                                </span>
                              </label>
                            </div>
                          </form>
                        )}
                      </div>
                    ) : (
                      <div className="bg-green-50 border border-green-100 rounded-2xl p-6">
                        <div className="flex items-start gap-4">
                          <CheckCircle2 className="w-8 h-8 text-green-600 shrink-0 mt-1" />
                          <div className="w-full">
                            <h3 className="text-xl font-bold text-green-900 mb-2">
                              Boa notícia! {searchResult.name} já tem o projeto.
                            </h3>
                            <div className="bg-white rounded-xl p-5 border border-green-100 mt-4 mb-4">
                              <div className="grid grid-cols-2 gap-4 text-sm font-medium">
                                <div><span className="text-gray-500 block mb-1">Município</span>{searchResult.name} - {searchResult.state}</div>
                                <div><span className="text-gray-500 block mb-1">Autor</span>{searchResult.councillorName || 'N/A'}</div>
                                <div><span className="text-gray-500 block mb-1">Status</span><span className="bg-green-100 text-green-800 px-2 py-1 rounded-md text-xs uppercase font-black">{searchResult.status}</span></div>
                                <div><span className="text-gray-500 block mb-1">Nº do Projeto</span>{searchResult.protocolNumber || 'N/A'}</div>
                              </div>
                            </div>
                            <div ref={petitionFormRef} className="mt-8 border-t border-green-200 pt-6">
                              <h4 className="text-lg font-bold text-green-900 mb-2">Apoie a aprovação do projeto!</h4>
                              <p className="text-green-800 text-sm font-medium mb-6">Preencha o abaixo-assinado para mostrar às autoridades que a população de {searchResult.name} quer o Código Animal aprovado.</p>
                              
                              {isPetitionSubmitted ? (
                                <div className="bg-white p-4 rounded-xl border border-green-200 text-center font-bold text-green-800">
                                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                                  Obrigado por apoiar a causa animal em {searchResult.name}!
                                </div>
                              ) : (
                                <form onSubmit={handlePetitionSubmit} className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="block text-sm font-bold text-green-900 mb-1">Nome Completo*</label>
                                      <input required type="text" value={petitionFormData.nome} onChange={e => setPetitionFormData({...petitionFormData, nome: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-bold text-green-900 mb-1">Whatsapp*</label>
                                      <input required type="tel" value={petitionFormData.whatsapp} onChange={e => setPetitionFormData({...petitionFormData, whatsapp: formatPhone(e.target.value)})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-bold text-green-900 mb-1">E-mail*</label>
                                      <input required type="email" value={petitionFormData.email} onChange={e => setPetitionFormData({...petitionFormData, email: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                    <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-green-900 mb-1">CEP*</label>
                                      <input required type="text" maxLength={8} value={petitionFormData.cep} onChange={handlePetitionCepChange} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div className="md:col-span-3">
                                      <label className="block text-sm font-bold text-green-900 mb-1">Endereço*</label>
                                      <input required type="text" value={petitionFormData.endereco} onChange={e => setPetitionFormData({...petitionFormData, endereco: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="Rua, Avenida..." />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
                                    <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-green-900 mb-1">Número*</label>
                                      <input required type="text" value={petitionFormData.numero} onChange={e => setPetitionFormData({...petitionFormData, numero: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div className="md:col-span-1">
                                      <label className="block text-sm font-bold text-green-900 mb-1">Complemento</label>
                                      <input type="text" value={petitionFormData.complemento} onChange={e => setPetitionFormData({...petitionFormData, complemento: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div className="md:col-span-2">
                                      <label className="block text-sm font-bold text-green-900 mb-1">Bairro*</label>
                                      <input required type="text" value={petitionFormData.bairro} onChange={e => setPetitionFormData({...petitionFormData, bairro: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                                    <div>
                                      <label className="block text-sm font-bold text-green-900 mb-1">Cidade*</label>
                                      <input required type="text" value={petitionFormData.cidade} onChange={e => setPetitionFormData({...petitionFormData, cidade: e.target.value})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" />
                                    </div>
                                    <div>
                                      <label className="block text-sm font-bold text-green-900 mb-1">Estado*</label>
                                      <input required type="text" maxLength={2} value={petitionFormData.estado} onChange={e => setPetitionFormData({...petitionFormData, estado: e.target.value.toUpperCase()})} className="w-full px-4 py-2 rounded-xl border border-green-200 focus:border-green-500 focus:ring-2 focus:ring-green-500/20 outline-none" placeholder="UF" />
                                    </div>
                                  </div>
                                  <div className="pt-2">
                                    <button type="submit" className="w-full bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-xl tracking-wider transition-colors">
                                      Assinar Abaixo-Assinado
                                    </button>
                                    <label className="flex items-start gap-2 mt-4 cursor-pointer">
                                      <input required type="checkbox" className="mt-0.5 flex-shrink-0 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                                      <span className="text-xs text-gray-500 leading-relaxed text-left">
                                        Li e concordo com a <Link to="/politica-de-privacidade" className="underline hover:text-gray-700" >Política de Privacidade e Proteção de Dados</Link> e com o tratamento de meus dados, em conformidade com a LGPD.
                                      </span>
                                    </label>
                                  </div>
                                </form>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {activeTab === 'vereador' && (
            <motion.div 
              key="vereador"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="max-w-4xl mx-auto"
            >
              <div ref={vereadorFormRef} className="bg-white rounded-3xl p-8 shadow-sm border border-gray-100 mb-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-black uppercase text-dark mb-4 flex items-center gap-2">
                    <Building2 className="w-6 h-6 text-secondary" /> Sou Vereador(a) ou Prefeito(a)
                  </h2>
                  <p className="text-gray-600 leading-relaxed font-medium">
                    A minuta foi criada a partir de uma ampla discussão estadual, disponibilizada para que os municípios adaptem à realidade local. Preencha o formulário abaixo para registrar o protocolo na sua cidade.
                  </p>
                </div>

                {submitSuccess ? (
                  <div className="bg-green-50 text-green-800 p-6 rounded-xl border border-green-200 text-center font-bold items-center flex flex-col justify-center">
                    <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    {formData.jaProtocolou === 'nao' ? (
                      <>
                        <p className="mb-6">Obrigado pelo seu interesse! Assim que protocolar nos informe.</p>
                        <button onClick={(e) => {
                          e.preventDefault();
                          downloadPDF();
                        }} className="bg-white border text-center border-gray-200 hover:bg-gray-50 text-gray-700 font-bold px-5 py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors">
                          <Download className="w-4 h-4" /> Baixar Minuta
                        </button>
                      </>
                    ) : (
                      <p>Muito obrigado! Seu protocolo foi registrado na nossa base de dados.</p>
                    )}
                  </div>
                ) : (
                  <form onSubmit={handleVereadorSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Nome Completo*</label>
                        <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Cargo*</label>
                        <select required value={formData.cargo} onChange={e => setFormData({...formData, cargo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none bg-white">
                          <option value="" disabled>Selecione seu cargo...</option>
                          <option value="Vereador">Vereador(a)</option>
                          <option value="Prefeito">Prefeito(a)</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Município*</label>
                        <select 
                          required 
                          value={formData.municipio} 
                          onChange={e => setFormData({...formData, municipio: e.target.value})} 
                          className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none appearance-none bg-white"
                          disabled={loadingCities}
                        >
                          <option value="" disabled>
                            {loadingCities ? 'Carregando cidades...' : 'Selecione...'}
                          </option>
                          {cities.map((city) => (
                            <option key={city} value={city}>{city}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">Email*</label>
                        <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2">WhatsApp*</label>
                        <input required type="tel" value={formData.whatsapp} onChange={e => setFormData({...formData, whatsapp: formatPhone(e.target.value)})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none" />
                      </div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border border-gray-100">
                      <label className="block text-sm font-bold text-gray-700 mb-4">Já protocolou o projeto?</label>
                      <div className="flex gap-6 mb-6">
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input type="radio" value="sim" checked={formData.jaProtocolou === 'sim'} onChange={() => setFormData({...formData, jaProtocolou: 'sim'})} className="text-primary focus:ring-primary w-5 h-5" />
                          Sim, já protocolei
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer font-medium">
                          <input type="radio" value="nao" checked={formData.jaProtocolou === 'nao'} onChange={() => setFormData({...formData, jaProtocolou: 'nao'})} className="text-primary focus:ring-primary w-5 h-5" />
                          Ainda não
                        </label>
                      </div>

                      {formData.jaProtocolou === 'sim' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Número do PL</label>
                            <input type="text" value={formData.numeroPL} onChange={e => setFormData({...formData, numeroPL: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                          </div>
                          <div>
                            <label className="block text-sm font-bold text-gray-700 mb-2">Data do Protocolo</label>
                            <input type="date" value={formData.dataProtocolo} onChange={e => setFormData({...formData, dataProtocolo: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none" />
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col sm:flex-row justify-end gap-4 mt-6">
                      {formData.jaProtocolou === 'nao' ? (
                        <button type="submit" className="w-full sm:w-auto bg-gray-900 hover:bg-black text-white font-bold px-8 py-3 rounded-xl transition-colors text-center uppercase tracking-wider flex items-center justify-center gap-2">
                          <Download className="w-5 h-5" /> Baixar Minuta
                        </button>
                      ) : (
                        <button type="submit" className="w-full sm:w-auto bg-primary hover:bg-blue-600 text-white font-bold px-8 py-3 rounded-xl uppercase tracking-wider transition-colors text-center">
                          Informar Protocolo
                        </button>
                      )}
                    </div>
                    <label className="flex items-start gap-2 mt-4 cursor-pointer max-w-xl mx-auto">
                      <input required type="checkbox" className="mt-0.5 flex-shrink-0 w-4 h-4 text-primary rounded border-gray-300 focus:ring-primary" />
                      <span className="text-xs text-gray-500 leading-relaxed text-left">
                        Li e concordo com a <Link to="/politica-de-privacidade" className="underline hover:text-gray-700" >Política de Privacidade e Proteção de Dados</Link> e com o tratamento de meus dados, em conformidade com a LGPD.
                      </span>
                    </label>
                  </form>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* INFORMATIVE SECTION */}
        <div className="max-w-6xl mx-auto mt-20">
          <div className="text-center mb-12">
            <h3 className="text-3xl md:text-4xl font-black uppercase text-dark mb-6">
              O que isso significa na prática?
            </h3>
            <p className="text-lg text-gray-600 font-medium max-w-3xl mx-auto">
              Com um Código Animal próprio, o município passa a ter regras mais claras para proteger os animais no dia a dia da cidade.<br/>
              Na prática, a lei municipal pode ajudar a:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-blue-50 text-primary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Book className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-dark mb-4">Definir o que pode e o que não pode ser feito com os animais</h4>
              <p className="text-gray-600 font-medium">A cidade passa a ter um código de conduta local, com regras adaptadas à sua realidade.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Gavel className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-dark mb-4">Criar infrações e multas municipais</h4>
              <p className="text-gray-600 font-medium">Além das punições previstas em outras leis, o município pode aplicar sanções administrativas para quem maltrata, abandona ou descumpre as regras de proteção animal.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-green-50 text-green-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <HeartHandshake className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-dark mb-4">Fortalecer políticas públicas locais</h4>
              <p className="text-gray-600 font-medium">Os valores arrecadados com multas podem ajudar a custear ações como castração, resgate, fiscalização, acolhimento e cuidado com os animais.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group">
              <div className="w-14 h-14 bg-yellow-50 text-secondary rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Eye className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-dark mb-4">Dar mais força para a fiscalização</h4>
              <p className="text-gray-600 font-medium">Com uma legislação municipal, a cidade ganha instrumentos próprios para orientar a população e responsabilizar infratores.</p>
            </motion.div>

            <motion.div whileHover={{ y: -5 }} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 hover:shadow-lg transition-all group md:col-span-2 lg:col-span-1">
              <div className="w-14 h-14 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Shield className="w-7 h-7" />
              </div>
              <h4 className="text-xl font-black text-dark mb-4">Proteger os animais e também a sociedade</h4>
              <p className="text-gray-600 font-medium">A proteção animal também envolve saúde pública, educação, segurança e responsabilidade coletiva.</p>
            </motion.div>
          </div>

          <div className="bg-blue-50 border border-blue-100 p-8 rounded-3xl text-center max-w-4xl mx-auto md:mb-8">
            <p className="text-lg md:text-xl text-primary font-bold">
              Quando a cidade tem uma lei própria, a proteção animal deixa de depender apenas de boas intenções e passa a contar com regras, responsabilidades e instrumentos concretos para funcionar.
            </p>
          </div>
        </div>

        </div>

      </div>
      <Footer />
      {(submitSuccess || isCitizenFormSubmitted) && (
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Não localizei o arquivo da minuta do Código. Pode enviar por aqui para mim?")}`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-50 flex items-end gap-2 group"
          onClick={() => {
            if (typeof window !== 'undefined' && window.gtag) {
              window.gtag('event', 'click_whatsapp_help', { event_category: 'engagement', event_label: 'WhatsApp Help Button' });
            }
          }}
        >
          <div className="bg-white rounded-lg shadow-lg p-3 text-sm font-bold text-gray-800 max-w-[250px] border border-gray-100 mb-2 opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0 md:opacity-100 md:translate-y-0">
            Está com alguma dificuldade para baixar ou encontrar o download da minuta? Clique aqui.
          </div>
          <div className="bg-[#25D366] w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:bg-[#128C7E] transition-colors shrink-0">
            <MessageCircle className="w-8 h-8 text-white" />
          </div>
        </a>
      )}
    </div>
  );
};
