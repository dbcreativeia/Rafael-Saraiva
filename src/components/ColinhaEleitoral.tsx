import React, { useState, useEffect, useRef } from 'react';
import { Download, Check, MessageCircle, Instagram, Facebook, Loader2 } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toPng, toBlob } from 'html-to-image';
import { trackEvent } from '../analytics';

interface ColinhaState {
  senador1Nome: string;
  senador1Num: string;
  senador2Nome: string;
  senador2Num: string;
  governadorNome: string;
  governadorNum: string;
  presidenteNome: string;
  presidenteNum: string;
}

const DEFAULT_STATE: ColinhaState = {
  senador1Nome: '',
  senador1Num: '',
  senador2Nome: '',
  senador2Num: '',
  governadorNome: '',
  governadorNum: '',
  presidenteNome: '',
  presidenteNum: ''
};

const NINA_PHOTO = "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002532358.jpg?w=161&h=225&crop=0&quality=100";
const RAFAEL_PHOTO = "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002533758.jpg?w=161&h=225&crop=0&quality=100";

export const ColinhaEleitoral: React.FC = () => {
  const [data, setData] = useState<ColinhaState>(() => {
    try {
      const saved = localStorage.getItem('colinha_custom_data_v4');
      if (saved) {
        return { ...DEFAULT_STATE, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('Erro ao restaurar colinha:', e);
    }
    return DEFAULT_STATE;
  });

  const [isExporting, setIsExporting] = useState(false);
  const [loadingText, setLoadingText] = useState('Gerando Colinha...');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const printableCardRef = useRef<HTMLDivElement>(null);
  const storiesCardRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 5000);
  };

  useEffect(() => {
    trackEvent('PageView_Colinha');
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('colinha_custom_data_v4', JSON.stringify(data));
    } catch (e) {
      console.warn('Erro ao salvar colinha localmente:', e);
    }
  }, [data]);

  const updateNumber = (field: keyof ColinhaState, value: string, maxLen: number) => {
    const clean = value.replace(/\D/g, '').slice(0, maxLen);
    setData(prev => ({ ...prev, [field]: clean }));
  };

  const updateName = (field: keyof ColinhaState, value: string) => {
    setData(prev => ({ ...prev, [field]: value.slice(0, 30) }));
  };

  const handleDownload = async () => {
    if (!printableCardRef.current || isExporting) return;
    setLoadingText('Baixando imagem da colinha...');
    setIsExporting(true);
    trackEvent('Download_Colinha_Image');

    try {
      const dataUrl = await toPng(printableCardRef.current, {
        quality: 0.98,
        pixelRatio: 3,
        cacheBust: true,
        skipFonts: true,
        style: {
          transform: 'none',
          boxShadow: 'none'
        }
      });

      const a = document.createElement('a');
      a.download = `minha-colinha.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Imagem salva com sucesso na sua galeria!');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível salvar a imagem automaticamente. Você pode tirar um print da tela no seu celular!');
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar no WhatsApp a imagem da colinha pronta anexada junto com a mensagem
  const handleShareWhatsApp = async () => {
    if (!printableCardRef.current || isExporting) return;
    setLoadingText('Preparando para o WhatsApp...');
    setIsExporting(true);
    trackEvent('Share_Colinha_WhatsApp');

    let msg = `🗳️ *MINHA COLINHA ELEITORAL*\n\n` +
      `🐾 *Deputada Federal:* NINA PASSADORE - *4407*\n` +
      `🐾 *Deputado Estadual:* RAFAEL SARAIVA - *44077*\n`;

    if (data.senador1Num || data.senador1Nome) {
      msg += `▪️ *1º Senador:* ${data.senador1Nome ? data.senador1Nome + ' - ' : ''}*${data.senador1Num || '---'}*\n`;
    }
    if (data.senador2Num || data.senador2Nome) {
      msg += `▪️ *2º Senador:* ${data.senador2Nome ? data.senador2Nome + ' - ' : ''}*${data.senador2Num || '---'}*\n`;
    }
    if (data.governadorNum || data.governadorNome) {
      msg += `▪️ *Governador:* ${data.governadorNome ? data.governadorNome + ' - ' : ''}*${data.governadorNum || '--'}*\n`;
    }
    if (data.presidenteNum || data.presidenteNome) {
      msg += `▪️ *Presidente:* ${data.presidenteNome ? data.presidenteNome + ' - ' : ''}*${data.presidenteNum || '--'}*\n`;
    }

    msg += `\nMonte a sua colinha também em:\nwww.rafaelsaraivasp.com/colinha`;

    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`;

    try {
      const blob = await toBlob(printableCardRef.current, {
        quality: 0.95,
        pixelRatio: 2.5,
        skipFonts: true
      });

      if (blob) {
        const file = new File([blob], 'minha-colinha.png', { type: 'image/png' });

        // No celular: compartilha a imagem anexada E o texto juntos no WhatsApp
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Minha Colinha Eleitoral',
            text: msg,
            files: [file]
          });
          return;
        }
      }

      // Fallback sem popup blocker (redireciona na mesma aba para abrir o app do WhatsApp no celular)
      window.location.href = whatsappUrl;
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Share WhatsApp fallback:', e);
        window.location.href = whatsappUrl;
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar nos Stories do Instagram com imagem 9:16 que encaixa perfeitamente na tela
  const handleShareInstagramStories = async () => {
    const targetEl = storiesCardRef.current || printableCardRef.current;
    if (!targetEl || isExporting) return;
    setLoadingText('Preparando Stories do Instagram...');
    setIsExporting(true);
    trackEvent('Share_Colinha_Instagram_Stories');

    try {
      const blob = await toBlob(targetEl, {
        quality: 0.95,
        pixelRatio: 2.5,
        skipFonts: true
      });

      if (blob) {
        const file = new File([blob], 'minha-colinha-stories.png', { type: 'image/png' });

        // No mobile, abre a bandeja nativa com a imagem 9:16 carregada para ir direto aos Stories do Instagram
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Minha Colinha',
            files: [file]
          });
          return;
        }
      }

      // Fallback: Faz download da imagem 9:16 e abre o app do Instagram
      const dataUrl = await toPng(targetEl, {
        quality: 0.95,
        pixelRatio: 2.5,
        skipFonts: true
      });
      const a = document.createElement('a');
      a.download = `minha-colinha-stories.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Imagem salva! Abrindo o Instagram para você postar nos Stories.');
      
      setTimeout(() => {
        window.location.href = 'instagram://camera';
        setTimeout(() => {
          window.location.href = 'https://www.instagram.com/';
        }, 1200);
      }, 300);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Share Instagram fallthrough:', e);
        window.location.href = 'instagram://app';
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar nos Stories do Facebook com imagem 9:16 que encaixa perfeitamente na tela
  const handleShareFacebookStories = async () => {
    const targetEl = storiesCardRef.current || printableCardRef.current;
    if (!targetEl || isExporting) return;
    setLoadingText('Preparando Stories do Facebook...');
    setIsExporting(true);
    trackEvent('Share_Colinha_Facebook_Stories');

    try {
      const blob = await toBlob(targetEl, {
        quality: 0.95,
        pixelRatio: 2.5,
        skipFonts: true
      });

      if (blob) {
        const file = new File([blob], 'minha-colinha-stories.png', { type: 'image/png' });

        // No mobile, abre a bandeja nativa com a imagem 9:16 carregada para ir direto aos Stories do Facebook
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'Minha Colinha Eleitoral',
            text: 'Minha Colinha Eleitoral 🐾 www.rafaelsaraivasp.com/colinha',
            files: [file]
          });
          return;
        }
      }

      // Fallback: Faz download da imagem 9:16 e abre o app do Facebook
      const dataUrl = await toPng(targetEl, {
        quality: 0.95,
        pixelRatio: 2.5,
        skipFonts: true
      });
      const a = document.createElement('a');
      a.download = `minha-colinha-stories.png`;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      showToast('Imagem salva! Abrindo o Facebook para você postar nos Stories.');

      setTimeout(() => {
        window.location.href = 'fb://';
        setTimeout(() => {
          window.location.href = 'https://www.facebook.com/';
        }, 1200);
      }, 300);
    } catch (e: any) {
      if (e?.name !== 'AbortError') {
        console.warn('Share Facebook fallthrough:', e);
        window.location.href = 'fb://';
      }
    } finally {
      setIsExporting(false);
    }
  };

  // Botão CONFIRMA verde da urna eletrônica
  const renderConfirmaButton = () => (
    <div className="h-11 sm:h-12 px-3.5 sm:px-4 bg-[#00823c] text-white font-sans font-bold text-xs sm:text-sm rounded-md border-b-2 border-[#005a29] shadow-xs flex items-center justify-center tracking-wider select-none shrink-0 uppercase">
      CONFIRMA
    </div>
  );

  // Fixed visual digit boxes for Nina & Rafael
  const renderFixedNumberBoxes = (numberStr: string) => {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5">
        {numberStr.split('').map((digit, i) => (
          <div
            key={i}
            className="w-8.5 h-11 sm:w-10 sm:h-12 bg-white text-black border-2 border-black rounded-md flex items-center justify-center font-sans font-bold text-xl sm:text-2xl shadow-xs"
          >
            {digit}
          </div>
        ))}
      </div>
    );
  };

  // Interactive digit boxes for user input
  const renderInputNumberBoxes = (
    numField: keyof ColinhaState,
    currentValue: string,
    totalDigits: number
  ) => {
    return (
      <div className="flex items-center gap-1 sm:gap-1.5">
        {Array.from({ length: totalDigits }).map((_, i) => {
          const char = currentValue[i] || '';
          return (
            <input
              key={i}
              id={`${numField}_digit_${i}`}
              type="tel"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={char}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '');
                const chars = currentValue.split('');
                while (chars.length < totalDigits) chars.push('');
                if (val) {
                  chars[i] = val[val.length - 1];
                  const newNumber = chars.join('').slice(0, totalDigits);
                  updateNumber(numField, newNumber, totalDigits);
                  if (i < totalDigits - 1) {
                    const nextEl = document.getElementById(`${numField}_digit_${i + 1}`);
                    nextEl?.focus();
                  }
                } else {
                  chars[i] = '';
                  updateNumber(numField, chars.join(''), totalDigits);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Backspace' && !char && i > 0) {
                  const prevEl = document.getElementById(`${numField}_digit_${i - 1}`);
                  prevEl?.focus();
                }
              }}
              placeholder="_"
              className={`w-8.5 h-11 sm:w-10 sm:h-12 rounded-md text-center font-sans font-bold text-xl sm:text-2xl outline-none transition-all ${
                char
                  ? 'bg-white text-black border-2 border-black shadow-xs focus:ring-2 focus:ring-black'
                  : 'bg-white text-gray-400 border-2 border-dashed border-gray-400 focus:border-black focus:ring-2 focus:ring-black focus:bg-white placeholder:text-gray-300'
              }`}
            />
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Helmet>
        <title>Minha Colinha | Salve e Leve para a Urna</title>
        <meta name="title" content="Minha Colinha | Salve e Leve para a Urna" />
        <meta name="description" content="Monte e baixe sua colinha para o dia da votação. Preencha seus candidatos e baixe a imagem no celular." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      {/* Main page container */}
      <div className="min-h-screen bg-gray-100 text-black flex flex-col items-center justify-start px-3 py-6 sm:py-8 font-sans">
        
        <div className="w-full max-w-[460px] flex flex-col gap-4">
          
          {/* ========================================================= */}
          {/* PRINTABLE / EXPORTABLE COLINHA CARD */}
          {/* ========================================================= */}
          <div
            ref={printableCardRef}
            className="w-full bg-white text-black rounded-2xl overflow-hidden border-2 border-black shadow-md flex flex-col font-sans"
          >
            {/* Header da Cédula */}
            <div className="bg-black text-white px-4 py-3 text-center border-b-2 border-black">
              <h2 className="text-xl sm:text-2xl font-bold uppercase tracking-wider text-white leading-tight">
                MINHA COLINHA
              </h2>
            </div>

            {/* Lista dos Candidatos */}
            <div className="p-4 sm:p-5 flex flex-col gap-5 bg-white divide-y divide-gray-100">

              {/* 1. DEPUTADA FEDERAL - NINA PASSADORE (4407) */}
              <div className="flex flex-col gap-2 pt-0 first:pt-0">
                <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider block">
                  1. DEPUTADA FEDERAL
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    <img
                      src={NINA_PHOTO}
                      alt="Nina Passadore"
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-lg sm:text-xl font-bold text-black block leading-tight">
                      NINA PASSADORE
                    </span>
                  </div>
                </div>

                {/* Número e Botão Confirma Verde */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderFixedNumberBoxes("4407")}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 2. DEPUTADO ESTADUAL - RAFAEL SARAIVA (44077) */}
              <div className="flex flex-col gap-2 pt-4">
                <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider block">
                  2. DEPUTADO ESTADUAL
                </span>

                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    <img
                      src={RAFAEL_PHOTO}
                      alt="RAFAEL SARAIVA"
                      className="w-full h-full object-cover object-top"
                      referrerPolicy="no-referrer"
                      crossOrigin="anonymous"
                    />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <span className="text-lg sm:text-xl font-bold text-black block leading-tight">
                      RAFAEL SARAIVA
                    </span>
                  </div>
                </div>

                {/* Número e Botão Confirma Verde */}
                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderFixedNumberBoxes("44077")}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 3. SENADOR 1 */}
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    3. 1º SENADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    3 dígitos
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={data.senador1Nome}
                    onChange={(e) => updateName('senador1Nome', e.target.value)}
                    placeholder="Nome do(a) Senador(a)"
                    className="w-full text-sm sm:text-base font-semibold text-black bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:border-black outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('senador1Num', data.senador1Num, 3)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 4. SENADOR 2 */}
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    4. 2º SENADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    3 dígitos
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={data.senador2Nome}
                    onChange={(e) => updateName('senador2Nome', e.target.value)}
                    placeholder="Nome do(a) Senador(a)"
                    className="w-full text-sm sm:text-base font-semibold text-black bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:border-black outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('senador2Num', data.senador2Num, 3)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 5. GOVERNADOR */}
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    5. GOVERNADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    2 dígitos
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={data.governadorNome}
                    onChange={(e) => updateName('governadorNome', e.target.value)}
                    placeholder="Nome do(a) Governador(a)"
                    className="w-full text-sm sm:text-base font-semibold text-black bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:border-black outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('governadorNum', data.governadorNum, 2)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 6. PRESIDENTE */}
              <div className="flex flex-col gap-2 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    6. PRESIDENTE
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    2 dígitos
                  </span>
                </div>

                <div>
                  <input
                    type="text"
                    value={data.presidenteNome}
                    onChange={(e) => updateName('presidenteNome', e.target.value)}
                    placeholder="Nome do(a) Presidente"
                    className="w-full text-sm sm:text-base font-semibold text-black bg-white px-3 py-1.5 rounded-lg border border-gray-300 focus:border-black outline-none placeholder:text-gray-400 placeholder:font-normal"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('presidenteNum', data.presidenteNum, 2)}
                  {renderConfirmaButton()}
                </div>
              </div>

            </div>

            {/* Rodapé Legal da Cédula (CNPJs de Campanha - Incluso na Imagem) */}
            <div className="bg-gray-100 border-t border-gray-200 px-3 py-2 text-center text-[9px] sm:text-[10px] text-gray-600 font-semibold uppercase tracking-tight leading-tight">
              PROPAGANDA ELEITORAL - RAFAEL SARAIVA GAIA 68.283.115/0001-74 | MARINA PASSADORE 68.237.505/0001-08
            </div>
          </div>

          {/* Botões de Ação de Compartilhamento Social */}
          <div className="flex flex-col gap-2.5 mt-2">
            {/* Botão Principal: Baixar Imagem da Colinha (Maior e Primeiro) */}
            <button
              id="btn-download-colinha-final"
              type="button"
              onClick={handleDownload}
              disabled={isExporting}
              className="w-full py-4 sm:py-4.5 px-6 bg-black hover:bg-neutral-800 active:scale-[0.98] text-white font-sans font-black text-base sm:text-lg uppercase tracking-wider rounded-xl shadow-lg transition-all flex items-center justify-center gap-3 disabled:opacity-60 cursor-pointer border-2 border-black"
            >
              <Download className="w-6 h-6 text-yellow-400 shrink-0" />
              <span>{isExporting ? 'GERANDO IMAGEM...' : 'BAIXAR IMAGEM DA COLINHA'}</span>
            </button>

            {/* Botão Enviar no WhatsApp com Imagem + Mensagem Personalizada */}
            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="w-full py-3.5 px-5 bg-[#25D366] hover:bg-[#20bd5a] active:scale-[0.98] text-white font-sans font-bold text-sm sm:text-base uppercase tracking-wider rounded-xl shadow-md transition-all flex items-center justify-center gap-2.5 cursor-pointer"
            >
              <MessageCircle className="w-5 h-5 text-white fill-white shrink-0" />
              <span>COMPARTILHAR NO WHATSAPP</span>
            </button>

            {/* Botão Stories Instagram (Compartilhar Imagem Já Pronta) */}
            <button
              type="button"
              onClick={handleShareInstagramStories}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] hover:opacity-95 active:scale-[0.98] text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Instagram className="w-4.5 h-4.5 text-white shrink-0" />
              <span>POSTAR NOS STORIES DO INSTAGRAM</span>
            </button>

            {/* Botão Stories Facebook (Compartilhar Imagem Já Pronta) */}
            <button
              type="button"
              onClick={handleShareFacebookStories}
              disabled={isExporting}
              className="w-full py-3 px-4 bg-[#1877F2] hover:bg-[#166fe5] active:scale-[0.98] text-white font-sans font-bold text-xs sm:text-sm uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              <Facebook className="w-4.5 h-4.5 text-white fill-white shrink-0" />
              <span>POSTAR NOS STORIES DO FACEBOOK</span>
            </button>
          </div>

          {/* Notificação de Sucesso */}
          {toastMessage && (
            <div className="p-3 bg-green-50 border border-green-600 rounded-xl text-green-900 text-xs font-semibold flex items-center gap-2 justify-center text-center">
              <Check className="w-4 h-4 text-green-600 shrink-0" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Informação */}
          <p className="text-xs text-gray-500 text-center leading-relaxed px-2 font-normal">
            💡 Salve a imagem no seu celular para conferir antes de votar ou compartilhe com amigos e familiares.
          </p>

        </div>
      </div>

      {/* ========================================================= */}
      {/* LOADING OVERLAY VISÍVEL NA TELA NO 1º CLIQUE */}
      {/* ========================================================= */}
      {isExporting && (
        <div className="fixed inset-0 z-[9999] bg-black/65 backdrop-blur-xs flex flex-col items-center justify-center p-4 select-none">
          <div className="bg-white rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3 text-center max-w-[290px] border border-gray-100">
            <Loader2 className="w-10 h-10 text-[#00823c] animate-spin" />
            <span className="text-sm font-bold text-black uppercase tracking-wider">
              {loadingText}
            </span>
            <span className="text-xs text-gray-500">
              Gerando imagem em alta resolução para seu celular...
            </span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* 9:16 STORIES TEMPLATE (ENCAIXE 100% PERFEITO NOS STORIES) */}
      {/* ========================================================= */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 select-none overflow-hidden">
        <div
          ref={storiesCardRef}
          className="w-[420px] h-[746px] bg-white text-black flex flex-col justify-between p-4 font-sans border-2 border-black"
          style={{ width: '420px', height: '746px' }}
        >
          {/* Header Stories */}
          <div className="bg-black text-white px-4 py-2.5 text-center rounded-xl">
            <h2 className="text-xl font-bold uppercase tracking-wider text-white">
              MINHA COLINHA
            </h2>
          </div>

          {/* Candidatos Formatados */}
          <div className="flex flex-col gap-3.5 my-auto divide-y divide-gray-100">
            {/* 1. DEPUTADA FEDERAL */}
            <div className="flex flex-col gap-1.5 pt-0 first:pt-0">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                1. DEPUTADA FEDERAL
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                  <img
                    src={NINA_PHOTO}
                    alt="NINA PASSADORE"
                    className="w-full h-full object-cover object-top"
                    crossOrigin="anonymous"
                  />
                </div>
                <span className="text-base font-bold text-black flex-1">
                  NINA PASSADORE
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes("4407")}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 2. DEPUTADO ESTADUAL */}
            <div className="flex flex-col gap-1.5 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                2. DEPUTADO ESTADUAL
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                  <img
                    src={RAFAEL_PHOTO}
                    alt="RAFAEL SARAIVA"
                    className="w-full h-full object-cover object-top"
                    crossOrigin="anonymous"
                  />
                </div>
                <span className="text-base font-bold text-black flex-1">
                  RAFAEL SARAIVA
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes("44077")}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 3. 1º SENADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                  3. 1º SENADOR
                </span>
                <span className="text-xs font-bold text-black truncate max-w-[200px]">
                  {data.senador1Nome || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.senador1Num ? data.senador1Num.padEnd(3, ' ') : '   ')}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 4. 2º SENADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                  4. 2º SENADOR
                </span>
                <span className="text-xs font-bold text-black truncate max-w-[200px]">
                  {data.senador2Nome || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.senador2Num ? data.senador2Num.padEnd(3, ' ') : '   ')}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 5. GOVERNADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                  5. GOVERNADOR
                </span>
                <span className="text-xs font-bold text-black truncate max-w-[200px]">
                  {data.governadorNome || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.governadorNum ? data.governadorNum.padEnd(2, ' ') : '  ')}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 6. PRESIDENTE */}
            <div className="flex flex-col gap-1.5 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                  6. PRESIDENTE
                </span>
                <span className="text-xs font-bold text-black truncate max-w-[200px]">
                  {data.presidenteNome || '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.presidenteNum ? data.presidenteNum.padEnd(2, ' ') : '  ')}
                {renderConfirmaButton()}
              </div>
            </div>
          </div>

          {/* Footer Stories com CNPJ e Link */}
          <div className="bg-gray-100 rounded-lg p-2 text-center text-[9px] text-gray-600 font-semibold uppercase tracking-tight leading-tight">
            <div>PROPAGANDA ELEITORAL - RAFAEL SARAIVA GAIA 68.283.115/0001-74 | MARINA PASSADORE 68.237.505/0001-08</div>
            <div className="text-black font-bold mt-0.5">www.rafaelsaraivasp.com/colinha</div>
          </div>
        </div>
      </div>
    </>
  );
};
