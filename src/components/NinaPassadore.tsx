import { Link } from 'react-router-dom';
import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { FileText, Download, CheckCircle2, Shield, MapPin, Phone, User, Mail, Box, ImagePlus } from 'lucide-react';
import { Footer } from './Footer';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '../analytics';
import { ProfilePhotoMaker } from './ProfilePhotoMaker';

export const NinaPassadore = () => {
  const [tipoMaterial, setTipoMaterial] = useState<'impresso' | 'digital' | 'foto' | null>(null);
  const [formData, setFormData] = useState({
    nome: '',
    sobrenome: '',
    whatsapp: '',
    email: '',
    cep: '',
    endereco: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: 'SP',
    adesivoPerfurado: false
  });
  const [lgpdAccepted, setLgpdAccepted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  
  const formRef = React.useRef<HTMLFormElement>(null);
  const successRef = React.useRef<HTMLDivElement>(null);

  const handleTipoMaterialSelect = (tipo: 'impresso' | 'digital' | 'foto') => {
    setTipoMaterial(tipo);
    setTimeout(() => {
      if (tipo === 'foto') {
        const makerEl = document.getElementById('profile-photo-maker');
        if (makerEl) {
          const yOffset = -120;
          const y = makerEl.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      } else if (formRef.current) {
        const yOffset = -120; 
        const y = formRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }
    }, 100);
  };

  useEffect(() => {
    if (isSubmitted) {
      setTimeout(() => {
        if (successRef.current) {
          const yOffset = -120;
          const y = successRef.current.getBoundingClientRect().top + window.scrollY + yOffset;
          window.scrollTo({ top: y, behavior: 'smooth' });
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 100);
    }
  }, [isSubmitted]);

  useEffect(() => {
    trackEvent('PageView_NinaPassadore');
  }, []);

  const formatWhatsApp = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3').replace(/(^\d{2})(\d)/, '($1) $2');
    }
    return value;
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/^(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const buscarCEP = async (cep: string) => {
    const cleanCEP = cep.replace(/\D/g, '');
    if (cleanCEP.length === 8) {
      try {
        const response = await fetch(`https://viacep.com.br/ws/${cleanCEP}/json/`);
        const data = await response.json();
        if (!data.erro) {
          if (data.uf !== 'SP' && tipoMaterial === 'impresso') {
            setError('Infelizmente o material impresso está disponível apenas para o estado de São Paulo (SP).');
            return;
          }
          setError('');
          setFormData(prev => ({
            ...prev,
            endereco: data.logradouro || '',
            bairro: data.bairro || '',
            cidade: data.localidade || '',
            estado: data.uf || 'SP'
          }));
        }
      } catch (err) {
        console.warn('Erro ao buscar CEP:', err);
      }
    }
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const validatePhone = (phone: string) => {
    return phone.replace(/\D/g, '').length === 11;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!tipoMaterial) {
      setError('Selecione o tipo de material que deseja receber.');
      return;
    }

    if (!formData.nome || !formData.sobrenome || !formData.whatsapp || !formData.email || !formData.cep || !formData.endereco || !formData.numero || !formData.bairro || !formData.cidade) {
      setError('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    if (formData.estado !== 'SP' && tipoMaterial === 'impresso') {
      setError('O material impresso está disponível apenas para o estado de São Paulo (SP).');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }

    if (!validatePhone(formData.whatsapp)) {
      setError('Por favor, insira um número de WhatsApp válido com DDD.');
      return;
    }

    if (!lgpdAccepted) {
      setError('Você precisa aceitar os termos da LGPD.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/ninapassadore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, tipoMaterial })
      });
      
      const data = await response.json();
      if (data.success) {
        setIsSubmitted(true);
        trackEvent('Lead');
        trackEvent('Lead_NinaPassadore');
        if (tipoMaterial === 'digital') {
          triggerDownload();
        }
      } else {
        setError('Ocorreu um erro ao processar sua solicitação. Tente novamente.');
      }
    } catch (err) {
      setError('Erro de conexão. Tente novamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const triggerDownload = async () => {
    const files = [
      'Fechado-Com-Eles.png'
    ];

    for (let i = 0; i < files.length; i++) {
      try {
        const fileName = files[i];
        const response = await fetch(`/${fileName}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
        
        // Pausa de 1 segundo entre cada download para evitar bloqueio do navegador
        if (i < files.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      } catch (error) {
        console.warn(`Erro ao baixar a imagem ${files[i]}:`, error);
      }
    }
  };

  const downloadSingleFile = async (fileName: string) => {
    try {
      const response = await fetch(`/${fileName}`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.warn(`Erro ao baixar a imagem ${fileName}:`, error);
    }
  };

  return (
    <>
      <Helmet>
        <title>Material de Campanha | Rafael Saraiva 44077</title>
        <meta name="title" content="Material de Campanha | Rafael Saraiva 44077" />
        <meta name="description" content="Crie sua Foto de Perfil personalizada para as redes sociais ou solicite o material de campanha oficial do Rafael Saraiva 44077. Ajude a espalhar a defesa da causa animal." />
        <meta name="keywords" content="Material de Campanha, Foto de Perfil, Rafael Saraiva 44077, Rafael Saraiva, Eleições, Deputado Estadual, São Paulo, Causa Animal, Panfletos, Adesivos" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/material" />
        <meta property="og:title" content="Material de Campanha | Rafael Saraiva 44077" />
        <meta property="og:description" content="Crie sua Foto de Perfil personalizada para as redes sociais ou solicite o material de campanha oficial do Rafael Saraiva 44077. Ajude a espalhar a defesa da causa animal." />
        <meta property="og:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/material" />
        <meta property="twitter:title" content="Material de Campanha | Rafael Saraiva 44077" />
        <meta property="twitter:description" content="Crie sua Foto de Perfil personalizada para as redes sociais ou solicite o material de campanha oficial do Rafael Saraiva 44077." />
        <meta property="twitter:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
      </Helmet>
    <div className="min-h-screen bg-[#102b31] relative overflow-x-hidden w-full max-w-[100vw] flex flex-col pt-28">
            <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden mix-blend-overlay">
        <img 
          src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
          alt="Texture" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="flex-grow container mx-auto px-4 max-w-4xl py-12 relative z-10">
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12 flex flex-col items-center w-full overflow-visible"
        >
          <div className="w-full max-w-3xl flex justify-center overflow-visible">
            <img 
              src="https://lh3.googleusercontent.com/d/1yViqyAWbCnW33xOkUjWCP9X1kEtSNo3D" 
              alt="Rafael Saraiva e Nina Passadore - Nós Lutamos Pelos Animais" 
              className="w-full h-auto object-contain -translate-x-[6.07%] hover:scale-[1.01] transition-transform duration-300" 
              referrerPolicy="no-referrer" 
            />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl overflow-hidden"
        >
          <div className="bg-[#ebb430] p-8 text-center">
            <h1 className="text-4xl md:text-5xl font-black text-[#102b31] uppercase tracking-tight mb-4">
              Material de Campanha
            </h1>
            <p className="text-xl text-[#102b31] font-medium">
              Escolha como deseja receber nosso material e faça parte desta corrente!
            </p>
          </div>

          {!isSubmitted ? (
            <div className="p-8">
              <div className="flex flex-col md:flex-row gap-6 mb-10">
                <button
                  type="button"
                  onClick={() => handleTipoMaterialSelect('foto')}
                  className={`flex-1 p-6 rounded-2xl border-4 transition-all ${
                    tipoMaterial === 'foto'
                      ? 'border-[#ebb430] bg-[#ebb430]/10 scale-105 shadow-lg'
                      : 'border-gray-200 hover:border-[#ebb430]/40 hover:bg-gray-50'
                  }`}
                >
                  <ImagePlus className={`w-12 h-12 mx-auto mb-4 ${tipoMaterial === 'foto' ? 'text-[#ebb430]' : 'text-[#102b31]/40'}`} />
                  <h3 className={`text-xl font-black uppercase mb-2 ${tipoMaterial === 'foto' ? 'text-[#ebb430]' : 'text-[#102b31]/80'}`}>Foto de Perfil</h3>
                  <p className="text-[#102b31]/60 text-sm font-medium">Crie sua foto com nossa moldura para as redes sociais.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoMaterialSelect('impresso')}
                  className={`flex-1 p-6 rounded-2xl border-4 transition-all ${
                    tipoMaterial === 'impresso'
                      ? 'border-[#ebb430] bg-[#ebb430]/10 scale-105 shadow-lg'
                      : 'border-gray-200 hover:border-[#ebb430]/40 hover:bg-gray-50'
                  }`}
                >
                  <Box className={`w-12 h-12 mx-auto mb-4 ${tipoMaterial === 'impresso' ? 'text-[#ebb430]' : 'text-[#102b31]/40'}`} />
                  <h3 className={`text-xl font-black uppercase mb-1 ${tipoMaterial === 'impresso' ? 'text-[#ebb430]' : 'text-[#102b31]/80'}`}>Material Impresso</h3>
                  <div className="mb-2">
                    <span className="bg-[#102b31] text-[#ebb430] text-[10px] sm:text-xs font-black px-2 py-1 rounded uppercase tracking-wider animate-pulse">
                      Receba em Casa
                    </span>
                  </div>
                  <p className="text-[#102b31]/60 text-sm font-medium">O kit campanha contém colinha, adesivo, santinho e santão. Disponível apenas para SP.</p>
                </button>

                <button
                  type="button"
                  onClick={() => handleTipoMaterialSelect('digital')}
                  className={`flex-1 p-6 rounded-2xl border-4 transition-all ${
                    tipoMaterial === 'digital'
                      ? 'border-[#ebb430] bg-[#ebb430]/10 scale-105 shadow-lg'
                      : 'border-gray-200 hover:border-[#ebb430]/40 hover:bg-gray-50'
                  }`}
                >
                  <Download className={`w-12 h-12 mx-auto mb-4 ${tipoMaterial === 'digital' ? 'text-[#ebb430]' : 'text-[#102b31]/40'}`} />
                  <h3 className={`text-xl font-black uppercase mb-2 ${tipoMaterial === 'digital' ? 'text-[#ebb430]' : 'text-[#102b31]/80'}`}>Material Digital</h3>
                  <p className="text-[#102b31]/60 text-sm font-medium">Baixe agora mesmo artes para WhatsApp, Instagram e Facebook.</p>
                </button>
              </div>

              {error && (
                <div className="mb-8 bg-red-50 text-red-700 p-4 rounded-xl flex items-center gap-3 font-medium border border-red-200">
                  <Shield className="w-6 h-6 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {tipoMaterial === 'foto' ? (
                <ProfilePhotoMaker molduraUrl="/moldura-foto-perfil_2.png" />
              ) : (
                <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Nome *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#102b31]/40 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={formData.nome}
                        onChange={e => setFormData({...formData, nome: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="Seu nome"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Sobrenome *</label>
                    <div className="relative">
                      <User className="absolute left-4 top-1/2 -translate-y-1/2 text-[#102b31]/40 w-5 h-5" />
                      <input
                        type="text"
                        required
                        value={formData.sobrenome}
                        onChange={e => setFormData({...formData, sobrenome: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="Seu sobrenome"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">WhatsApp *</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-[#102b31]/40 w-5 h-5" />
                      <input
                        type="tel"
                        required
                        value={formData.whatsapp}
                        onChange={e => setFormData({...formData, whatsapp: formatWhatsApp(e.target.value)})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="(11) 99999-9999"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">E-mail *</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-[#102b31]/40 w-5 h-5" />
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-gray-100">
                  <div className="mb-6">
                    <h3 className="text-xl font-black text-[#102b31] mb-2 uppercase flex items-center gap-2">
                      <MapPin className="text-[#ebb430]" />
                      Endereço de Envio
                    </h3>
                    {tipoMaterial === 'impresso' && (
                      <div className="bg-[#ebb430]/10 text-[#102b31] px-4 py-3 rounded-lg border border-[#ebb430]/30 inline-flex items-center gap-2">
                        <Shield className="w-5 h-5 shrink-0 text-[#ebb430]" />
                        <span className="text-sm font-medium">Envio disponível <strong>exclusivamente</strong> para o estado de São Paulo (SP).</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">CEP *</label>
                      <input
                        type="text"
                        required
                        value={formData.cep}
                        onChange={e => {
                          const val = formatCEP(e.target.value);
                          setFormData({...formData, cep: val});
                          if (val.length === 9) buscarCEP(val);
                        }}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="00000-000"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Endereço *</label>
                      <input
                        type="text"
                        required
                        value={formData.endereco}
                        onChange={e => setFormData({...formData, endereco: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="Rua, Avenida, etc"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Número *</label>
                      <input
                        type="text"
                        required
                        value={formData.numero}
                        onChange={e => setFormData({...formData, numero: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="123"
                      />
                    </div>
                    <div className="md:col-span-3">
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Complemento</label>
                      <input
                        type="text"
                        value={formData.complemento}
                        onChange={e => setFormData({...formData, complemento: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                        placeholder="Apto, Bloco, Casa 2 (Opcional)"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Bairro *</label>
                      <input
                        type="text"
                        required
                        value={formData.bairro}
                        onChange={e => setFormData({...formData, bairro: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Cidade *</label>
                      <input
                        type="text"
                        required
                        value={formData.cidade}
                        onChange={e => setFormData({...formData, cidade: e.target.value})}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#ebb430] focus:border-transparent transition-all font-medium"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[#102b31] mb-2 uppercase">Estado *</label>
                      <input
                        type="text"
                        required
                        readOnly
                        value={formData.estado}
                        className="w-full px-4 py-3 bg-gray-100 border border-gray-200 rounded-xl text-[#102b31]/60 font-bold"
                      />
                    </div>
                  </div>
                </div>

                {tipoMaterial === 'impresso' && (
                  <div className="pt-6 border-t border-gray-100">
                    <div className="flex items-start gap-4 p-4 bg-[#ebb430]/10 rounded-xl border border-orange-200">
                      <input
                        type="checkbox"
                        id="adesivoPerfurado"
                        checked={formData.adesivoPerfurado}
                        onChange={(e) => setFormData({...formData, adesivoPerfurado: e.target.checked})}
                        className="mt-1 w-5 h-5 text-[#ebb430] rounded focus:ring-[#ebb430]"
                      />
                      <label htmlFor="adesivoPerfurado" className="text-sm text-[#102b31] font-bold leading-relaxed">
                        Quero receber também o adesivo perfurado para veículo.
                      </label>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-gray-100">
                  <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <input
                      type="checkbox"
                      id="lgpd"
                      checked={lgpdAccepted}
                      onChange={(e) => setLgpdAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 text-[#ebb430] rounded focus:ring-[#ebb430]"
                    />
                    <label htmlFor="lgpd" className="text-sm text-[#102b31] font-medium leading-relaxed">
                      Estou de acordo em fornecer meus dados e aceito os termos da <Link to="/politica-de-privacidade" className="font-bold text-[#ebb430] hover:underline" >Lei Geral de Proteção de Dados (LGPD) e a Política de Privacidade</Link>.
                    </label>
                  </div>
                </div>

                <button
                  disabled={isSubmitting || !tipoMaterial}
                  type="submit"
                  className="w-full bg-[#ebb430] hover:bg-[#d4a22b] text-[#102b31] font-black uppercase tracking-widest text-xl py-5 rounded-2xl transition-all shadow-xl hover:shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:-translate-y-1"
                >
                  {isSubmitting ? (
                    <span className="animate-pulse">Processando...</span>
                  ) : (
                    <>
                      {tipoMaterial === 'digital' ? <Download className="w-6 h-6" /> : <Box className="w-6 h-6" />}
                      Solicitar Material
                    </>
                  )}
                </button>
              </form>
              )}
            </div>
          ) : (
            <motion.div
              ref={successRef}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-12 text-center flex flex-col items-center"
            >
              <div className="w-24 h-24 bg-[#ebb430]/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2 className="w-12 h-12 text-[#ebb430]" />
              </div>
              <h2 className="text-3xl font-black text-[#102b31] uppercase mb-4">Solicitação Concluída!</h2>
              <p className="text-xl text-[#102b31]/80 mb-8 max-w-lg font-medium">
                {tipoMaterial === 'impresso' 
                  ? 'Seus dados foram recebidos com sucesso. Em breve você receberá o material de campanha no endereço informado!'
                  : 'Seu material digital está pronto! O download deve iniciar automaticamente.'}
              </p>
              
              {tipoMaterial === 'digital' && (
                <div className="flex flex-col items-center w-full">
                  <button
                    onClick={triggerDownload}
                    className="bg-[#ebb430]/20 text-[#ebb430] hover:bg-[#ebb430]/30 font-bold py-3 px-6 rounded-xl flex items-center gap-2 transition-colors mb-8"
                  >
                    <Download className="w-5 h-5" />
                    Caso o download não inicie automaticamente clique aqui!
                  </button>
                  
                  <div className="w-full max-w-lg bg-gray-50 p-6 rounded-2xl border border-gray-100 text-left">
                    <h3 className="text-lg font-bold text-[#102b31] mb-4">Baixar artes separadamente:</h3>
                    <div className="flex flex-col gap-3">
                      {[
                        { name: 'Fechado-Com-Eles.png', label: 'Fechado com eles' }
                      ].map((file) => (
                        <button
                          key={file.name}
                          onClick={() => downloadSingleFile(file.name)}
                          className="flex items-center justify-between w-full p-3 bg-white border border-gray-200 rounded-xl hover:border-[#ebb430]/40 hover:shadow-sm transition-all text-left group"
                        >
                          <span className="font-medium text-[#102b31] group-hover:text-[#ebb430] transition-colors">{file.label}</span>
                          <Download className="w-5 h-5 text-[#102b31]/40 group-hover:text-[#ebb430] transition-colors" />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </motion.div>
      </div>
      <Footer />
    </div>
    </>
  );
};
