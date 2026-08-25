import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, 
  RefreshCw, 
  LayoutDashboard, 
  HeartHandshake, 
  Package, 
  Sparkles, 
  Gamepad2, 
  FileText, 
  LogOut, 
  ShieldCheck,
  Users
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { ApoioTab } from './admin/ApoioTab';
import { MaterialCampanhaTab } from './admin/MaterialCampanhaTab';
import { MaterialDobradaTab } from './admin/MaterialDobradaTab';
import { JogoTab } from './admin/JogoTab';
import { ProtocolosTab } from './admin/ProtocolosTab';
import { CentralLeadsTab } from './admin/CentralLeadsTab';

export type AdminTab = 'LEADS' | 'APOIO' | 'MATERIAL' | 'MATERIAL_DOBRADA' | 'JOGO' | 'PROTOCOLOS';

export const AdminDashboard: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('LEADS');
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'castrar2026') {
      setIsAuthenticated(true);
      setError('');
    } else {
      setError('Senha incorreta. Verifique e tente novamente.');
    }
  };

  const handleManualRefresh = () => {
    setIsRefreshing(true);
    setRefreshTrigger(prev => prev + 1);
    setTimeout(() => setIsRefreshing(false), 800);
  };

  useEffect(() => {
    if (isAuthenticated) {
      // Gentle 60s background sync
      const interval = setInterval(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 flex items-center justify-center p-4 sm:p-6">
        <div className="bg-white p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-md border border-gray-100">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-primary shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
          </div>
          
          <div className="text-center mb-6">
            <h2 className="text-2xl font-black text-dark uppercase tracking-tight">Acesso Restrito</h2>
            <p className="text-xs sm:text-sm text-gray-500 mt-1">Painel Administrativo Código Animal</p>
          </div>
          
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-gray-600 mb-2">
                Senha de Acesso
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-sm font-medium transition-all"
                placeholder="Digite a senha..."
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-primary hover:bg-blue-600 active:bg-blue-700 text-white font-bold py-3.5 rounded-xl uppercase tracking-wider text-sm transition-all shadow-md cursor-pointer"
            >
              Entrar no Painel
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-wider inline-flex items-center gap-1"
            >
              ← Voltar para o site
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const tabsConfig = [
    {
      id: 'LEADS' as AdminTab,
      label: 'Central de Leads',
      subtitle: 'Visão 360º Consolidada',
      icon: Users,
      activeColor: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
      tagColor: 'bg-blue-100 text-blue-700'
    },
    {
      id: 'APOIO' as AdminTab,
      label: 'Apoio',
      subtitle: 'Pop-up São Paulo',
      icon: HeartHandshake,
      activeColor: 'bg-[#FF5500] text-white shadow-md shadow-orange-500/20',
      tagColor: 'bg-orange-100 text-[#FF5500]'
    },
    {
      id: 'MATERIAL' as AdminTab,
      label: 'Material Campanha',
      subtitle: 'Material Oficial',
      icon: Package,
      activeColor: 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20',
      tagColor: 'bg-indigo-100 text-indigo-700'
    },
    {
      id: 'MATERIAL_DOBRADA' as AdminTab,
      label: 'Material Dobrada',
      subtitle: 'Nina Passadore',
      icon: Sparkles,
      activeColor: 'bg-purple-600 text-white shadow-md shadow-purple-500/20',
      tagColor: 'bg-purple-100 text-purple-700'
    },
    {
      id: 'JOGO' as AdminTab,
      label: 'Jogo',
      subtitle: 'Missão Resgate',
      icon: Gamepad2,
      activeColor: 'bg-sky-600 text-white shadow-md shadow-sky-500/20',
      tagColor: 'bg-sky-100 text-sky-700'
    },
    {
      id: 'PROTOCOLOS' as AdminTab,
      label: 'Protocolos',
      subtitle: 'PLs & Assinaturas',
      icon: FileText,
      activeColor: 'bg-emerald-600 text-white shadow-md shadow-emerald-500/20',
      tagColor: 'bg-emerald-100 text-emerald-700'
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      
      {/* Top Header Responsivo */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-gray-200/80 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
            
            {/* Título & Badge */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <LayoutDashboard className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg sm:text-xl font-black uppercase tracking-tight text-dark">
                    Painel Administrativo
                  </h1>
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-green-50 text-green-700 border border-green-200">
                    <ShieldCheck className="w-3 h-3" /> Online
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-medium">Gestão de dados e mobilização estadual</p>
              </div>
            </div>

            {/* Botões do Header */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                title="Sincronizar dados agora"
                className="flex-1 sm:flex-initial bg-white hover:bg-gray-50 active:bg-gray-100 text-gray-700 font-bold py-2 px-3.5 rounded-xl border border-gray-200 flex items-center justify-center gap-2 text-xs sm:text-sm shadow-xs transition-all cursor-pointer min-h-[40px]"
              >
                <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-primary' : 'text-gray-500'}`} />
                <span>{isRefreshing ? 'Sincronizando...' : 'Atualizar'}</span>
              </button>

              <Link
                to="/"
                className="flex-1 sm:flex-initial bg-gray-900 hover:bg-black active:bg-slate-800 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm shadow-xs transition-all cursor-pointer min-h-[40px]"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </Link>
            </div>

          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-6">
        
        {/* Navegação de Abas - Ordem estrita: Apoio, Material Campanha, Material Dobrada, Jogo, Protocolos */}
        <div className="bg-white p-2 rounded-2xl sm:rounded-3xl border border-gray-200/80 shadow-xs">
          <div className="flex overflow-x-auto gap-1.5 sm:gap-2 pb-1 sm:pb-0 scrollbar-none">
            {tabsConfig.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-1 min-w-[140px] sm:min-w-[170px] py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl sm:rounded-2xl transition-all cursor-pointer text-left flex items-center gap-2.5 sm:gap-3 ${
                    isActive
                      ? tab.activeColor
                      : 'bg-gray-50/80 hover:bg-gray-100 text-gray-600 hover:text-dark border border-gray-100'
                  }`}
                >
                  <div className={`p-2 rounded-xl flex-shrink-0 ${
                    isActive ? 'bg-white/20 text-white' : 'bg-white text-gray-500 shadow-xs'
                  }`}>
                    <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs sm:text-sm font-black uppercase tracking-tight truncate leading-tight">
                      {tab.label}
                    </div>
                    <div className={`text-[10px] sm:text-[11px] truncate font-medium ${
                      isActive ? 'text-white/80' : 'text-gray-400'
                    }`}>
                      {tab.subtitle}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Conteúdo Dinâmico da Aba Selecionada */}
        <div className="transition-opacity duration-200">
          {activeTab === 'LEADS' && (
            <CentralLeadsTab refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'APOIO' && (
            <ApoioTab refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'MATERIAL' && (
            <MaterialCampanhaTab refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'MATERIAL_DOBRADA' && (
            <MaterialDobradaTab refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'JOGO' && (
            <JogoTab refreshTrigger={refreshTrigger} />
          )}

          {activeTab === 'PROTOCOLOS' && (
            <ProtocolosTab refreshTrigger={refreshTrigger} />
          )}
        </div>

      </main>

    </div>
  );
};
