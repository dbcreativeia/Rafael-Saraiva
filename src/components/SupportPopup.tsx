import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Heart, MapPin, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { trackEvent } from '../analytics';

export const SupportPopup: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [nome, setNome] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [bairro, setBairro] = useState('');
  const [endereco, setEndereco] = useState('');
  const [cidade, setCidade] = useState('São Paulo');
  const [cepValid, setCepValid] = useState<boolean | null>(null);
  const [cepLoading, setCepLoading] = useState(false);
  const [cepError, setCepError] = useState('');
  
  const [autorizoDados, setAutorizoDados] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const location = useLocation();

  useEffect(() => {
    // Não exibir dentro do painel administrativo
    if (location.hash === '#admin') return;

    // Verificar se a pessoa já preencheu
    const hasSubmitted = localStorage.getItem('popup_apoio_submitted');
    if (hasSubmitted === 'true') {
      return;
    }

    // Exibir o popup após um breve intervalo ao entrar no site
    const timer = setTimeout(() => {
      setIsOpen(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, [location.hash, location.pathname]);

  const formatPhone = (val: string) => {
    const nums = val.replace(/\D/g, '');
    if (nums.length <= 2) return nums;
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`;
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
  };

  const formatCEP = (val: string) => {
    const nums = val.replace(/\D/g, '').slice(0, 8);
    if (nums.length <= 5) return nums;
    return `${nums.slice(0, 5)}-${nums.slice(5)}`;
  };

  const handleCEPChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const formatted = formatCEP(rawVal);
    setCep(formatted);
    setCepError('');
    setCepValid(null);
    setBairro('');
    setEndereco('');

    const clean = formatted.replace(/\D/g, '');
    if (clean.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
        const data = await res.json();
        
        if (data.erro) {
          setCepValid(false);
          setCepError('CEP não encontrado. Por favor, verifique o número informado.');
        } else {
          const uf = (data.uf || '').trim().toUpperCase();
          const localidade = (data.localidade || '').trim();

          if (uf === 'SP') {
            setCepValid(true);
            setCidade(localidade || 'São Paulo');
            setBairro(data.bairro || '');
            setEndereco(data.logradouro || '');
            setCepError('');
          } else {
            setCepValid(false);
            setCepError(`Esta iniciativa é direcionada exclusivamente a moradores do Estado de São Paulo (SP). O CEP informado pertence a ${localidade || 'outro estado'} (${uf}).`);
          }
        }
      } catch (err) {
        console.warn('Erro ao consultar CEP:', err);
        setCepError('Não foi possível validar o CEP no momento. Verifique sua conexão.');
        setCepValid(false);
      } finally {
        setCepLoading(false);
      }
    }
  };

  const validateEmail = (mail: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!nome.trim()) {
      setError('Por favor, preencha seu nome completo.');
      return;
    }

    const cleanPhone = whatsapp.replace(/\D/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 11) {
      setError('Por favor, insira um número de WhatsApp válido com DDD.');
      return;
    }

    if (!validateEmail(email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    const cleanCep = cep.replace(/\D/g, '');
    if (cleanCep.length !== 8) {
      setError('Por favor, insira um CEP válido de 8 dígitos.');
      return;
    }

    if (cepValid === false) {
      setError(cepError || 'O cadastro é exclusivo para residentes do Estado de São Paulo.');
      return;
    }

    if (!autorizoDados) {
      setError('É necessário autorizar o tratamento dos dados pessoais para continuar.');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/popup-apoio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: nome.trim(),
          whatsapp: cleanPhone,
          email: email.trim().toLowerCase(),
          cep: cleanCep,
          endereco: endereco || '',
          bairro: bairro || '',
          cidade: cidade || 'São Paulo',
          estado: 'SP'
        })
      });

      if (!response.ok) {
        throw new Error('Falha ao enviar cadastro.');
      }

      // Marcar como preenchido no localStorage para não aparecer mais
      localStorage.setItem('popup_apoio_submitted', 'true');

      // Salvar dados no perfil local para auto-completar na página de Material Impresso ou Digital
      const nameParts = nome.trim().split(/\s+/);
      const primeiroNome = nameParts[0] || '';
      const sobrenome = nameParts.slice(1).join(' ') || '';

      const userProfile = {
        nome: primeiroNome,
        sobrenome: sobrenome,
        nomeCompleto: nome.trim(),
        whatsapp: whatsapp,
        email: email.trim().toLowerCase(),
        cep: cep,
        endereco: endereco || '',
        bairro: bairro || '',
        cidade: cidade || 'São Paulo',
        estado: 'SP'
      };
      try {
        localStorage.setItem('rafael_saraiva_user_profile', JSON.stringify(userProfile));
      } catch (e) {
        console.warn('Erro ao salvar perfil localmente:', e);
      }

      trackEvent('Lead');
      trackEvent('Popup_Apoio_Submit');

      setIsSuccess(true);
      setTimeout(() => {
        setIsOpen(false);
      }, 2500);
    } catch (err) {
      console.error('Erro ao enviar:', err);
      setError('Ocorreu um erro ao salvar seus dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 pt-24 sm:pt-28 md:pt-32 pb-6 sm:pb-8 overflow-y-auto bg-dark/80 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            handleClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.92, y: 20 }}
          transition={{ duration: 0.3, ease: 'easeOut' }}
          className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-y-auto my-auto max-h-[85vh]"
        >
          {/* Header Bar com degradê Laranja */}
          <div className="bg-gradient-to-r from-[#FF5500] via-[#FF6A00] to-[#FFA000] text-white p-5 sm:p-7 relative shadow-md">
            {/* Top row: Ícone na esquerda e Botão Fechar na direita */}
            <div className="flex items-center justify-between gap-3 mb-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white text-[#FF5500] flex items-center justify-center font-black shadow-md shrink-0">
                <Heart className="w-5 h-5 fill-[#FF5500] text-[#FF5500]" />
              </div>

              {/* Botão de Fechar Claro e Destacado */}
              <button
                onClick={handleClose}
                type="button"
                className="bg-white hover:bg-gray-100 text-dark font-bold px-3 py-1.5 rounded-full shadow-lg transition-all transform hover:scale-105 active:scale-95 flex items-center gap-1.5 text-xs uppercase tracking-wider cursor-pointer border border-white/40 focus:outline-none shrink-0"
                aria-label="Fechar pop-up"
                title="Fechar janela"
              >
                <span>Fechar</span>
                <X className="w-4 h-4 text-dark stroke-[2.5]" />
              </button>
            </div>

            {/* Selo Mobilização São Paulo em linha própria */}
            <div className="mb-2.5">
              <span className="inline-block text-xs font-black uppercase tracking-wider bg-black/25 px-3 py-1 rounded-full text-white">
                Mobilização São Paulo
              </span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-white leading-tight">
              Você está com a gente?
            </h2>
            <p className="text-white/95 text-sm sm:text-base mt-2 leading-relaxed font-medium">
              Deixe seus dados abaixo para que possamos saber quem está com a gente, identificar sua região e manter contato durante a campanha.
            </p>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-7">
            {isSuccess ? (
              <div className="py-10 text-center flex flex-col items-center">
                <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4 animate-bounce">
                  <CheckCircle2 className="w-10 h-10" />
                </div>
                <h3 className="text-2xl font-black uppercase text-dark mb-2">
                  Muito obrigado!
                </h3>
                <p className="text-gray-600 max-w-md font-medium text-base">
                  Seu apoio foi registrado com sucesso. Estamos juntos pela causa animal em São Paulo!
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="bg-red-50 border-l-4 border-red-500 p-3.5 rounded-r-xl flex items-start gap-3 text-red-700 text-sm font-medium">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                {/* Nome completo */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                    Nome completo <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    placeholder="Seu nome completo"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none text-gray-800 text-sm sm:text-base transition-all bg-white"
                  />
                </div>

                {/* WhatsApp & Email Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      WhatsApp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={whatsapp}
                      onChange={(e) => setWhatsapp(formatPhone(e.target.value))}
                      placeholder="(11) 99999-9999"
                      maxLength={15}
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none text-gray-800 text-sm sm:text-base transition-all bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 mb-1.5">
                      E-mail <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seuemail@exemplo.com"
                      className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none text-gray-800 text-sm sm:text-base transition-all bg-white"
                    />
                  </div>
                </div>

                {/* CEP com validação de São Paulo */}
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-1 mb-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700">
                      CEP <span className="text-red-500">*</span>
                    </label>
                    <span className="text-[11px] text-gray-500 font-medium">
                      (Válido para todo o Estado de São Paulo)
                    </span>
                  </div>
                  
                  <div className="relative">
                    <input
                      type="text"
                      required
                      value={cep}
                      onChange={handleCEPChange}
                      placeholder="00000-000"
                      maxLength={9}
                      className={`w-full px-4 py-3 pr-10 rounded-xl border ${
                        cepValid === true
                          ? 'border-green-500 bg-green-50/30'
                          : cepValid === false
                          ? 'border-red-500 bg-red-50/30'
                          : 'border-gray-200'
                      } focus:border-[#FF5500] focus:ring-2 focus:ring-[#FF5500]/20 outline-none text-gray-800 text-sm sm:text-base transition-all font-mono`}
                    />
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center">
                      {cepLoading && <Loader2 className="w-5 h-5 text-[#FF5500] animate-spin" />}
                      {!cepLoading && cepValid === true && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                      {!cepLoading && cepValid === false && <AlertCircle className="w-5 h-5 text-red-500" />}
                    </div>
                  </div>

                  {cepError && (
                    <p className="text-xs text-red-600 mt-1.5 font-medium flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      {cepError}
                    </p>
                  )}

                  {cepValid === true && (
                    <p className="text-xs text-green-700 mt-1.5 font-medium flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 shrink-0 text-green-600" />
                      {cidade} - SP {bairro ? `• Bairro: ${bairro}` : ''}
                    </p>
                  )}
                </div>

                {/* Consentimento LGPD */}
                <div className="pt-3 border-t border-gray-100 space-y-3">
                  <label className="flex items-start gap-3 cursor-pointer group bg-gray-50/80 hover:bg-gray-50 p-3.5 rounded-xl border border-gray-100 transition-colors">
                    <input
                      type="checkbox"
                      required
                      checked={autorizoDados}
                      onChange={(e) => setAutorizoDados(e.target.checked)}
                      className="mt-1 w-4 h-4 rounded border-gray-300 text-[#FF5500] focus:ring-[#FF5500] shrink-0 cursor-pointer accent-[#FF5500]"
                    />
                    <span className="text-[11px] sm:text-xs text-gray-600 leading-relaxed font-normal">
                      Autorizo, de forma específica, expressa e destacada, o tratamento dos meus dados pessoais, inclusive de informações que possam revelar minha opinião política, para registrar minha manifestação de apoio, identificar minha região e manter contato comigo por WhatsApp e e-mail, com informações e comunicações relacionadas à campanha eleitoral de Rafael Saraiva, conforme descrito na{' '}
                      <Link
                        to="/politica-de-privacidade"
                        target="_blank"
                        className="font-semibold text-[#FF5500] underline hover:text-orange-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Política de Privacidade
                      </Link>
                      . <span className="text-red-500 font-bold">*</span>
                    </span>
                  </label>

                  <p className="text-[11px] text-gray-500 leading-relaxed pt-1">
                    Você pode retirar seu consentimento, solicitar o descadastramento ou pedir a eliminação dos seus dados a qualquer momento.
                  </p>

                  <p className="text-[11px] text-gray-500">
                    Saiba mais em nossa{' '}
                    <Link
                      to="/politica-de-privacidade"
                      target="_blank"
                      className="font-semibold text-[#FF5500] underline hover:text-orange-700"
                    >
                      Política de Privacidade e Proteção de Dados
                    </Link>
                    .
                  </p>
                </div>

                {/* Botão de Envio e Opção de Fechar */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="submit"
                    disabled={loading || (cepValid === false)}
                    className="w-full bg-gradient-to-r from-[#FF5500] via-[#FF6A00] to-[#FF8800] hover:brightness-105 active:scale-[0.99] text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl text-base sm:text-lg uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <span>ESTOU COM VOCÊS</span>
                    )}
                  </button>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-gray-400">
                      * Campo obrigatório.
                    </span>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-xs text-gray-400 hover:text-gray-700 underline font-semibold transition-colors cursor-pointer"
                    >
                      Preencher depois
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
