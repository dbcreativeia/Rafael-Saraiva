import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, FileSignature, CheckCircle2, AlertCircle, Lock, LayoutDashboard, Download, Trash2, Link as LinkIcon, Facebook, Twitter, MessageCircle, PawPrint } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import * as XLSX from 'xlsx';
import { useLocation } from 'react-router-dom';
import { Footer } from './Footer';
import { WHATSAPP_NUMBER } from '../constants';

const generateId = () => Math.random().toString(36).substr(2, 9);

export const ContraMausTratos = () => {
  const location = useLocation();
  const isAdmin = location.hash === '#admin';

  if (isAdmin) {
    return <AdminView />;
  }

  return <PublicView />;
};

const ESTADOS = [
  { sigla: 'AC', nome: 'Acre' }, { sigla: 'AL', nome: 'Alagoas' }, { sigla: 'AP', nome: 'Amapá' },
  { sigla: 'AM', nome: 'Amazonas' }, { sigla: 'BA', nome: 'Bahia' }, { sigla: 'CE', nome: 'Ceará' },
  { sigla: 'DF', nome: 'Distrito Federal' }, { sigla: 'ES', nome: 'Espírito Santo' }, { sigla: 'GO', nome: 'Goiás' },
  { sigla: 'MA', nome: 'Maranhão' }, { sigla: 'MT', nome: 'Mato Grosso' }, { sigla: 'MS', nome: 'Mato Grosso do Sul' },
  { sigla: 'MG', nome: 'Minas Gerais' }, { sigla: 'PA', nome: 'Pará' }, { sigla: 'PB', nome: 'Paraíba' },
  { sigla: 'PR', nome: 'Paraná' }, { sigla: 'PE', nome: 'Pernambuco' }, { sigla: 'PI', nome: 'Piauí' },
  { sigla: 'RJ', nome: 'Rio de Janeiro' }, { sigla: 'RN', nome: 'Rio Grande do Norte' }, { sigla: 'RS', nome: 'Rio Grande do Sul' },
  { sigla: 'RO', nome: 'Rondônia' }, { sigla: 'RR', nome: 'Roraima' }, { sigla: 'SC', nome: 'Santa Catarina' },
  { sigla: 'SP', nome: 'São Paulo' }, { sigla: 'SE', nome: 'Sergipe' }, { sigla: 'TO', nome: 'Tocantins' }
];

const FAKE_NAMES = ['Maria S.', 'João P.', 'Ana C.', 'Pedro H.', 'Julia M.', 'Lucas F.', 'Carla T.', 'Marcos A.', 'Fernanda L.'];
const FAKE_NEIGHBORHOODS = ['Centro', 'Jardins', 'Pinheiros', 'Mooca', 'Vila Mariana', 'Santana', 'Lapa', 'Tatuapé', 'Itaim Bibi'];

const PublicView = () => {
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'SP'
  });
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [cidades, setCidades] = useState<{nome: string}[]>([]);
  const [recentSignature, setRecentSignature] = useState<{name: string, location: string} | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const trackPage = () => {
      const fbq = (window as any).fbq;
      const gtag = (window as any).gtag;
      if (fbq) {
        fbq('trackCustom', 'PageView_ContraMausTratos');
      }
      if (gtag) {
        gtag('event', 'PageView_ContraMausTratos');
      }
    };

    if ((window as any).fbq) {
      trackPage();
    } else {
      let attempts = 0;
      const interval = setInterval(() => {
        attempts++;
        if ((window as any).fbq) {
          trackPage();
          clearInterval(interval);
        } else if (attempts > 20) { // Give up after 10 seconds
          clearInterval(interval);
        }
      }, 500);
      return () => clearInterval(interval);
    }
  }, []);

  useEffect(() => {
    // Fake real-time signatures
    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const name = FAKE_NAMES[Math.floor(Math.random() * FAKE_NAMES.length)];
        const neighborhood = FAKE_NEIGHBORHOODS[Math.floor(Math.random() * FAKE_NEIGHBORHOODS.length)];
        setRecentSignature({ name, location: `${neighborhood}, SP` });
        
        setTimeout(() => setRecentSignature(null), 4000);
      }
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (formData.estado) {
      fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${formData.estado}/municipios`)
        .then(res => res.json())
        .then(data => setCidades(data.map((c: any) => ({ nome: c.nome }))))
        .catch(() => setCidades([]));
    }
  }, [formData.estado]);

  const buscarCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade,
            estado: data.uf
          }));
        }
      } catch (error) {
        console.error('Erro ao buscar CEP:', error);
      }
    }
  };

  const handleCEPChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 5) value = value.replace(/^(\d{5})(\d)/, '$1-$2');
    setFormData({ ...formData, cep: value });
    if (value.length === 9) buscarCEP(value);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 2) value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
    if (value.length > 10) value = `${value.slice(0, 10)}-${value.slice(10)}`;
    setFormData({ ...formData, whatsapp: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lgpdAccepted) {
      setError('Você precisa aceitar os termos da LGPD.');
      return;
    }
    setIsSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/contra-maus-tratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: generateId(),
          ...formData
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar');
      setIsSubmitted(true);
      
      // Track conversion
      if (typeof window !== 'undefined') {
        const fbq = (window as any).fbq;
        const gtag = (window as any).gtag;
        
        if (fbq) {
          fbq('track', 'Lead');
          fbq('trackCustom', 'Lead_ContraMausTratos');
        }
        if (gtag) {
          gtag('event', 'generate_lead', {
            event_category: 'ContraMausTratos'
          });
          gtag('event', 'Lead_ContraMausTratos', {
            event_category: 'ContraMausTratos'
          });
        }
        
        const whatsappMsg = "Acabei de assinar o apoio a luta de vocês contra os maus-tratos! Contem comigo!";
        const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMsg)}`;
        window.open(whatsappUrl, '_blank');
      }
    } catch (err) {
      setError('Ocorreu um erro ao enviar sua assinatura. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isSubmitted && containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [isSubmitted]);

  const shareUrl = window.location.href;
  const shareTitle = "Abaixo-assinado Contra os Maus-Tratos";

  const handleShareLink = () => {
    navigator.clipboard.writeText(shareUrl);
    alert('Link copiado para a área de transferência!');
  };

  return (
    <div className="bg-[#e5e5e5] min-h-screen text-gray-900 font-sans flex flex-col relative">
      <div className="fixed inset-0 pointer-events-none z-0 opacity-60 mix-blend-multiply" style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/concrete-wall.png")', backgroundRepeat: 'repeat' }}>
      </div>
      <Helmet>
        <title>Abaixo-assinado Contra Maus-Tratos | Deputado Rafael Saraiva</title>
        <meta name="description" content="Junte-se a Rafael Saraiva e Aline Teixeira na luta contra os maus-tratos aos animais. Assine nosso abaixo-assinado e apoie essa causa." />
        <meta property="og:title" content="Abaixo-assinado Contra Maus-Tratos | Rafael Saraiva e Aline Teixeira" />
        <meta property="og:description" content="Milhares de animais ainda sofrem abandono, maus-tratos e falta de assistência. Junte-se a nós, assine e faça parte dessa corrente." />
        <meta property="og:image" content="https://lh3.googleusercontent.com/d/1jna7BizJ3PHwWOVDBV86b_Y2KhlhN7MZ" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Abaixo-assinado Contra Maus-Tratos" />
        <meta name="twitter:description" content="Junte-se a Rafael Saraiva e Aline Teixeira na luta contra os maus-tratos aos animais. Assine nosso abaixo-assinado!" />
        <meta name="twitter:image" content="https://lh3.googleusercontent.com/d/1jna7BizJ3PHwWOVDBV86b_Y2KhlhN7MZ" />
      </Helmet>

      {/* Real-time fake signatures toast */}
      <div className="fixed bottom-6 left-6 z-[999]">
        <AnimatePresence>
          {recentSignature && (
            <motion.div
              initial={{ opacity: 0, y: 50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-4 md:p-5 flex items-center gap-4 max-w-sm"
            >
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center shrink-0">
                <FileSignature className="w-6 h-6 text-[var(--color-brand-red)]" />
              </div>
              <div className="flex flex-col">
                <p className="text-xl md:text-2xl font-impact text-[var(--color-brand-red)] uppercase tracking-wide leading-none">{recentSignature.name}</p>
                <p className="text-sm md:text-base text-gray-600 font-bold mt-1">assinou de {recentSignature.location}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Header */}
      <header className="pt-0 md:pt-2 relative overflow-hidden z-10 w-full">
        
        <div className="w-full relative z-10 text-center flex flex-col items-center">
          
          <div className="flex flex-col md:flex-row items-center md:items-end justify-between w-full relative px-0 mt-4 md:mt-6 w-full mx-auto">
            
            {/* Left Image */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex w-full md:w-[30%] lg:w-[32%] flex-col items-start md:items-start z-30 order-1 md:order-1 mt-0 relative md:-translate-y-8 lg:-translate-y-12">
              <div style={{ WebkitMaskImage: 'linear-gradient(to right, black 65%, transparent 95%)', maskImage: 'linear-gradient(to right, black 65%, transparent 95%)' }} className="w-full max-w-[320px] md:max-w-full">
                <img src="https://lh3.googleusercontent.com/d/1Bi3QNMlF546FnCEgJo_Ha6d3g8k4U7iK" alt="Rafael Saraiva" className="block w-full h-auto object-contain object-left drop-shadow-2xl" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }} />
              </div>
            </motion.div>

            {/* Space between images / Text at knee height */}
            <div className="flex flex-col w-full md:w-[40%] lg:w-[36%] md:shrink-0 order-2 md:order-2 relative z-50 justify-center pb-8 md:pb-24 lg:pb-32 px-2 mt-8 md:mt-0">
               
               {/* Logo Manifesto - at the top of the middle section */}
               <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mx-auto w-full max-w-[280px] md:max-w-[300px] lg:max-w-[380px] mb-6 md:mb-8 lg:mb-12">
                 <img src="https://lh3.googleusercontent.com/d/1jna7BizJ3PHwWOVDBV86b_Y2KhlhN7MZ" alt="Logo Manifesto" className="w-full mx-auto object-contain" />
               </motion.div>

               <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="text-black w-full flex justify-center text-center relative z-10 pointer-events-auto">
                 <h2 className="font-impact text-4xl md:text-4xl lg:text-5xl xl:text-6xl uppercase tracking-wide leading-tight drop-shadow-sm">
                   NÓS LUTAMOS<br/>
                   PELOS ANIMAIS,<br/>
                   MAS <span className="text-[var(--color-brand-red)] text-5xl md:text-5xl lg:text-6xl xl:text-7xl mt-1 inline-block">E VOCÊ?</span>
                 </h2>
               </motion.div>
            </div>

            {/* Right Image */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="hidden md:flex w-full md:w-[30%] lg:w-[32%] flex-col items-end md:items-end z-30 order-3 md:order-3 mt-0 relative md:-translate-y-8 lg:-translate-y-12">
              <img src="https://lh3.googleusercontent.com/d/1_Ycnsv5kgUiOQfWK0xSPCKXyDEBzma0P" alt="Apoiadora" className="block w-full max-w-[320px] md:max-w-full h-auto object-contain object-right drop-shadow-2xl" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }} />
            </motion.div>
          </div>
          
        </div>

        {/* Black Banner below photos */}
        <div className="w-full bg-gradient-to-b from-transparent via-black to-black pt-24 md:pt-48 pb-[380px] md:pb-32 relative z-40 -mt-24 md:-mt-48 pointer-events-none flex flex-col items-center justify-end overflow-visible">
          
          <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-8 pb-8 relative z-50 pointer-events-auto mt-8 w-full">
            {/* Left Logo */}
            <a href="https://rafaelsaraivasp.com.br/" target="_blank" rel="noreferrer" className="hidden md:block relative z-40">
              <motion.img initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} src="https://lh3.googleusercontent.com/d/1M6hf4eQkOkt7qiVd6RqR_akBOzSKs2Qd" alt="Logo Rafael Saraiva" className="w-48 object-contain filter brightness-0 invert hover:scale-105 transition-transform" />
            </a>

            {/* Center Text */}
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex flex-col items-center w-full">
              <div className="flex flex-col md:flex-row items-center justify-center gap-6 text-center md:text-left w-full">
                <div className="bg-white rounded-full p-3 shadow-lg shrink-0">
                  <FileSignature className="w-10 h-10 text-black" />
                </div>
                <div className="text-white w-full">
                  <p className="font-impact text-3xl md:text-5xl uppercase leading-none mb-1">Apoie a nossa luta.</p>
                  <p className="font-impact text-3xl md:text-5xl text-[var(--color-brand-red)] uppercase leading-none">Assine o abaixo-assinado.</p>
                  <p className="text-white/80 font-medium text-lg leading-relaxed mt-4 max-w-xl text-center md:text-left mx-auto md:mx-0">
                    Milhares de animais ainda sofrem abandono, maus-tratos e falta de assistência.<br className="hidden md:block" />
                    Junte-se ao Rafael Saraiva e Aline Teixeira nessa luta, se inscreva e faça parte dessa corrente.
                  </p>

                  {/* Mobile Logos */}
                  <div className="flex md:hidden flex-row items-center justify-center gap-6 mt-8 w-full relative z-50">
                    <a href="https://rafaelsaraivasp.com.br/" target="_blank" rel="noreferrer" className="block relative z-40">
                      <img src="https://lh3.googleusercontent.com/d/1M6hf4eQkOkt7qiVd6RqR_akBOzSKs2Qd" alt="Logo Rafael Saraiva" className="w-32 object-contain filter brightness-0 invert" />
                    </a>
                    <img src="https://lh3.googleusercontent.com/d/1hMUOo95ZLm3H66ehCUaISvWLIZ0Fp0eS" alt="Logo Aline Teixeira" className="w-32 object-contain filter brightness-0 invert" />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Right Logo */}
            <motion.img initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} src="https://lh3.googleusercontent.com/d/1hMUOo95ZLm3H66ehCUaISvWLIZ0Fp0eS" alt="Logo Aline Teixeira" className="hidden md:block w-48 object-contain filter brightness-0 invert" />
          </div>

          {/* Mobile Only Photos right above form */}
          <div className="absolute bottom-0 left-0 right-0 w-full flex md:hidden flex-row items-end justify-between px-0 z-30 pointer-events-none">
            <div className="w-1/2 flex justify-start h-full items-end" style={{ WebkitMaskImage: 'linear-gradient(to right, black 85%, transparent 100%)', maskImage: 'linear-gradient(to right, black 85%, transparent 100%)' }}>
              <img src="https://lh3.googleusercontent.com/d/1Bi3QNMlF546FnCEgJo_Ha6d3g8k4U7iK" alt="Rafael Saraiva" className="w-[110%] max-w-[220px] object-contain object-left-bottom drop-shadow-2xl translate-y-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }} />
            </div>
            <div className="w-1/2 flex justify-end h-full items-end">
              <img src="https://lh3.googleusercontent.com/d/1_Ycnsv5kgUiOQfWK0xSPCKXyDEBzma0P" alt="Apoiadora" className="w-[110%] max-w-[220px] object-contain object-right-bottom drop-shadow-2xl translate-y-0" style={{ WebkitMaskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)', maskImage: 'linear-gradient(to bottom, black 70%, transparent 100%)' }} />
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="w-full max-w-3xl mx-auto px-6 -mt-16 md:-mt-32 relative z-50 flex-1">
        <div ref={containerRef} className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8 md:p-12 mb-0">
          {isSubmitted ? (
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-12">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-12 h-12 text-black" />
              </div>
              <h2 className="text-4xl font-impact uppercase text-black mb-4 tracking-wide">Assinatura Confirmada!</h2>
              <p className="text-xl text-gray-600 font-bold mb-8">Muito obrigado por apoiar essa causa tão importante.</p>
              
              <div className="bg-gray-50 p-6 rounded-2xl mt-8 border border-gray-200">
                <h3 className="font-impact uppercase text-xl mb-4 tracking-wide text-black">Compartilhe essa causa:</h3>
                <div className="flex flex-wrap justify-center gap-4">
                  <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <MessageCircle className="w-6 h-6" />
                  </a>
                  <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <Facebook className="w-6 h-6" />
                  </a>
                  <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noreferrer" className="w-12 h-12 bg-black text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.975H5.039z"></path></svg>
                  </a>
                  <button onClick={handleShareLink} className="w-12 h-12 bg-gray-200 text-black rounded-full flex items-center justify-center hover:scale-110 transition-transform">
                    <LinkIcon className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="flex flex-col items-center gap-3 mb-8 text-center">
                <FileSignature className="w-12 h-12 text-[var(--color-brand-red)]" />
                <h2 className="text-4xl font-impact uppercase tracking-wide text-black text-center">Preencha seus dados</h2>
              </div>
              
              {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl flex items-center gap-3 font-medium">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  {error}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Nome Completo</label>
                  <input required type="text" value={formData.nome} onChange={e => setFormData({...formData, nome: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="Digite seu nome completo" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">WhatsApp</label>
                    <input required type="tel" value={formData.whatsapp} onChange={handlePhoneChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="(11) 99999-9999" />
                  </div>
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">E-mail</label>
                    <input required type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="seu@email.com" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">CEP</label>
                    <input required type="text" value={formData.cep} onChange={handleCEPChange} maxLength={9} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="00000-000" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Endereço</label>
                    <input required type="text" value={formData.endereco} onChange={e => setFormData({...formData, endereco: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="Rua, Avenida, etc" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Número</label>
                    <input required type="text" value={formData.numero} onChange={e => setFormData({...formData, numero: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="123" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Complemento</label>
                    <input type="text" value={formData.complemento} onChange={e => setFormData({...formData, complemento: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="Apto, Bloco, etc (opcional)" />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Bairro</label>
                    <input required type="text" value={formData.bairro} onChange={e => setFormData({...formData, bairro: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" placeholder="Bairro" />
                  </div>
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">UF</label>
                    <select required value={formData.estado} onChange={e => setFormData({...formData, estado: e.target.value, cidade: ''})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white">
                      <option value="">Selecione...</option>
                      {ESTADOS.map(est => (
                        <option key={est.sigla} value={est.sigla}>{est.nome}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-lg font-impact uppercase tracking-wide text-black mb-2">Cidade</label>
                    <select required value={formData.cidade} onChange={e => setFormData({...formData, cidade: e.target.value})} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[var(--color-brand-red)] focus:ring-2 focus:ring-[var(--color-brand-red)]/20 transition-all font-bold bg-gray-50 focus:bg-white" disabled={!formData.estado}>
                      <option value="">Selecione...</option>
                      {cidades.map(c => (
                        <option key={c.nome} value={c.nome}>{c.nome}</option>
                      ))}
                      {/* Caso falhe a API, permite manter a cidade buscada pelo CEP */}
                      {formData.cidade && !cidades.find(c => c.nome === formData.cidade) && (
                        <option value={formData.cidade}>{formData.cidade}</option>
                      )}
                    </select>
                  </div>
                </div>
                
                <div className="pt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    id="lgpd"
                    checked={lgpdAccepted}
                    onChange={(e) => setLgpdAccepted(e.target.checked)}
                    className="mt-1 w-5 h-5 rounded border-gray-300 text-[var(--color-brand-red)] focus:ring-[var(--color-brand-red)]"
                  />
                  <label htmlFor="lgpd" className="text-base text-gray-800 font-medium leading-relaxed">
                    Estou de acordo em fornecer meus dados para este abaixo-assinado e aceito os termos da <a href="https://rafaelsaraivasp.com.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="font-bold text-[var(--color-brand-red)] hover:underline">Lei Geral de Proteção de Dados (LGPD)</a> e a Política de Privacidade.
                  </label>
                </div>
              </div>

              <button disabled={isSubmitting} type="submit" className="w-full bg-[var(--color-brand-red)] hover:bg-red-700 text-white font-impact uppercase tracking-widest text-2xl py-4 rounded-xl transition-all shadow-lg hover:shadow-xl mt-8 flex items-center justify-center gap-2">
                {isSubmitting ? 'Enviando...' : 'Assinar Agora'}
              </button>
            </form>
          )}
        </div>
      </main>

      <div className="w-full pt-8 pb-12 flex flex-col items-center justify-center relative z-20">
        <p className="text-black font-impact uppercase tracking-widest text-2xl md:text-4xl mb-6 text-center px-4 drop-shadow-sm">
          Compartilhe essa corrente contra os maus-tratos!
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <a href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareTitle + ' ' + shareUrl)}`} target="_blank" rel="noreferrer" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl">
            <MessageCircle className="w-7 h-7" />
          </a>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noreferrer" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl">
            <Facebook className="w-7 h-7" />
          </a>
          <a href={`https://x.com/intent/tweet?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(shareTitle)}`} target="_blank" rel="noreferrer" className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl">
            <svg viewBox="0 0 24 24" aria-hidden="true" className="w-6 h-6 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.008 5.975H5.039z"></path></svg>
          </a>
          <button onClick={handleShareLink} className="w-14 h-14 bg-black text-white rounded-full flex items-center justify-center transition-transform hover:scale-110 shadow-xl">
            <LinkIcon className="w-7 h-7" />
          </button>
        </div>
      </div>

      <footer className="bg-black text-white py-8 border-t border-white/10 relative z-20">
        <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/60 text-sm font-medium">
            &copy; 2026 Deputado Rafael Saraiva
          </p>
          <div className="flex items-center gap-6">
            <a href="https://rafaelsaraivasp.com.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors text-sm font-medium">
              Política de Privacidade
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
};

const AdminView = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'unique' | 'duplicates'>('all');
  const [cityFilter, setCityFilter] = useState('');
  const [cities, setCities] = useState<string[]>([]);

  useEffect(() => {
    fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados/SP/municipios')
      .then(res => res.json())
      .then(d => {
        setCities(d.map((c: any) => c.nome).sort());
      })
      .catch(err => console.error(err));
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === 'eleicoes2026') {
      setIsAuthenticated(true);
      fetchData();
    } else {
      alert('Senha incorreta!');
    }
  };

  const fetchData = async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch('/api/contra-maus-tratos');
      const json = await response.json();
      setData(Array.isArray(json) ? json : []);
    } catch (err) {
      console.error(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const interval = setInterval(() => {
        fetchData(true);
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated]);

  const deleteRecord = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta assinatura?")) return;
    try {
      await fetch(`/api/contra-maus-tratos/${id}`, { method: 'DELETE' });
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

  const applyFilter = (list: any[]) => {
    if (filterType === 'unique') return list.filter(item => !item.isDuplicate);
    if (filterType === 'duplicates') return list.filter(item => item.isDuplicate);
    return list;
  };

  const exportDataExcel = () => {
    const wb = XLSX.utils.book_new();
    const rows = applyFilter(processedData).map(d => ({
      Nome: d.nome,
      Email: d.email,
      WhatsApp: d.whatsapp,
      CEP: d.cep,
      Cidade: d.cidade,
      Estado: d.estado,
      Data: d.createdAt ? new Date(d.createdAt).toLocaleString() : '',
      Duplicado: d.isDuplicate ? 'Sim' : 'Não'
    }));
    
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, 'Assinaturas');
    XLSX.writeFile(wb, `assinaturas_maus_tratos.xlsx`);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 max-w-sm w-full">
          <div className="flex justify-center mb-6">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
              <Lock className="w-8 h-8 text-black" />
            </div>
          </div>
          <h2 className="text-2xl font-black text-center mb-6 text-black">Acesso Restrito</h2>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 transition-all font-medium mb-4"
            placeholder="Senha de acesso"
          />
          <button type="submit" className="w-full bg-black hover:bg-gray-800 text-white font-bold py-3 rounded-xl transition-colors">
            Entrar
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 md:p-12">
      <Helmet>
        <title>Painel - Contra Maus-Tratos</title>
      </Helmet>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div className="flex items-center gap-3">
            <LayoutDashboard className="w-8 h-8 text-black" />
            <h1 className="text-3xl font-black tracking-tight text-black">Assinaturas - Contra Maus-Tratos</h1>
          </div>
          
          <div className="flex gap-4">
            <button onClick={fetchData} className="flex items-center gap-2 bg-white text-gray-700 px-4 py-2 rounded-xl font-bold border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
              Atualizar
            </button>
            <button onClick={exportDataExcel} className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-xl font-bold hover:bg-gray-800 transition-colors shadow-sm">
              <Download className="w-4 h-4" /> Exportar Planilha
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 text-black rounded-full flex items-center justify-center shrink-0">
              <FileSignature className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs md:text-sm text-gray-500 font-bold mb-1">Total Únicas</p>
              <p className="text-2xl font-black">{processedData.filter(d => !d.isDuplicate).length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <h2 className="text-xl font-bold text-black flex items-center gap-2">
              <FileSignature className="w-5 h-5 text-gray-400" /> Lista de Assinaturas
            </h2>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
              <select
                value={cityFilter}
                onChange={(e) => setCityFilter(e.target.value)}
                className="w-full sm:w-64 px-4 py-2 rounded-lg border border-gray-200 focus:border-black focus:ring-2 focus:ring-black/20 outline-none bg-white font-medium text-gray-700 text-sm"
              >
                <option value="">Todos os municípios</option>
                {cities.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <div className="flex bg-gray-50 rounded-xl border border-gray-200 p-1">
              <button 
                onClick={() => setFilterType('all')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'all' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Todos
              </button>
              <button 
                onClick={() => setFilterType('unique')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'unique' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Únicos
              </button>
              <button 
                onClick={() => setFilterType('duplicates')}
                className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${filterType === 'duplicates' ? 'bg-black text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Duplicados
              </button>
            </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 text-gray-500 text-sm uppercase tracking-wider border-b border-gray-100">
                  <th className="p-4 font-black">Nome</th>
                  <th className="p-4 font-black">Email / WhatsApp</th>
                  <th className="p-4 font-black">Local</th>
                  <th className="p-4 font-black">Data</th>
                  <th className="p-4 font-black text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Carregando...</td>
                  </tr>
                ) : applyFilter(processedData).filter(item => cityFilter === '' || item.cidade === cityFilter).length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500 font-medium">Nenhuma assinatura encontrada.</td>
                  </tr>
                ) : (
                  applyFilter(processedData).filter(item => cityFilter === '' || item.cidade === cityFilter).map((item, i) => (
                    <tr key={item.id || i} className={`border-b border-gray-50 hover:bg-gray-50/50 transition-colors ${item.isDuplicate ? 'bg-red-50/30' : ''}`}>
                      <td className="p-4 font-bold text-black">
                        {item.nome}
                        {item.isDuplicate && <span className="ml-2 bg-red-100 text-red-800 text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Duplicado</span>}
                      </td>
                      <td className="p-4 text-gray-600">
                        <div>{item.email || '-'}</div>
                        <div className="text-xs text-gray-500">{item.whatsapp || '-'}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {item.cidade}/{item.estado}
                        <div className="text-xs text-gray-500">CEP: {item.cep}</div>
                      </td>
                      <td className="p-4 text-gray-600">
                        {item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => deleteRecord(item.id)}
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
    </div>
  );
};
