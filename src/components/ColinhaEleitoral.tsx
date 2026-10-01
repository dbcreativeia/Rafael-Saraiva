import React, { useState, useEffect, useRef } from 'react';
import { Download, Check, MessageCircle, Instagram, Facebook, Loader2, X } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { toPng, toBlob } from 'html-to-image';
import { trackEvent } from '../analytics';
import {
  CANDIDATOS_GOVERNADOR,
  CANDIDATOS_SENADOR,
  CANDIDATOS_PRESIDENTE,
  Candidato
} from '../data/candidatos';

interface ColinhaState {
  senador1Nome: string;
  senador1Num: string;
  senador1Foto?: string;
  senador2Nome: string;
  senador2Num: string;
  senador2Foto?: string;
  governadorNome: string;
  governadorNum: string;
  governadorFoto?: string;
  presidenteNome: string;
  presidenteNum: string;
  presidenteFoto?: string;
}

const DEFAULT_STATE: ColinhaState = {
  senador1Nome: '',
  senador1Num: '',
  senador1Foto: '',
  senador2Nome: '',
  senador2Num: '',
  senador2Foto: '',
  governadorNome: '',
  governadorNum: '',
  governadorFoto: '',
  presidenteNome: '',
  presidenteNum: '',
  presidenteFoto: ''
};

const NINA_PHOTO = "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002532358.jpg?w=161&h=225&crop=0&quality=100";
const RAFAEL_PHOTO = "https://admin.cnnbrasil.com.br/wp-content/uploads/sites/12/candidates/2026/250002533758.jpg?w=161&h=225&crop=0&quality=100";

const populatePhotosIfMissing = (state: ColinhaState): ColinhaState => {
  const next = { ...state };
  if (next.senador1Num && !next.senador1Foto) {
    const c = CANDIDATOS_SENADOR.find(x => x.numero === next.senador1Num);
    if (c) next.senador1Foto = c.fotoUrl;
  }
  if (next.senador2Num && !next.senador2Foto) {
    const c = CANDIDATOS_SENADOR.find(x => x.numero === next.senador2Num);
    if (c) next.senador2Foto = c.fotoUrl;
  }
  if (next.governadorNum && !next.governadorFoto) {
    const c = CANDIDATOS_GOVERNADOR.find(x => x.numero === next.governadorNum);
    if (c) next.governadorFoto = c.fotoUrl;
  }
  if (next.presidenteNum && !next.presidenteFoto) {
    const c = CANDIDATOS_PRESIDENTE.find(x => x.numero === next.presidenteNum);
    if (c) next.presidenteFoto = c.fotoUrl;
  }
  return next;
};

export const ColinhaEleitoral: React.FC = () => {
  const [data, setData] = useState<ColinhaState>(() => {
    try {
      const saved = localStorage.getItem('colinha_custom_data_v4');
      if (saved) {
        return populatePhotosIfMissing({ ...DEFAULT_STATE, ...JSON.parse(saved) });
      }
    } catch (e) {
      console.warn('Erro ao restaurar colinha:', e);
    }
    return DEFAULT_STATE;
  });

  const [isExporting, setIsExporting] = useState(false);
  const [loadingText, setLoadingText] = useState('Gerando Colinha...');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [fullScreenImage, setFullScreenImage] = useState<string | null>(null);
  const printableCardRef = useRef<HTMLDivElement>(null);
  const exportCardRef = useRef<HTMLDivElement>(null);
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

  const handleSelectCandidate = (
    cargo: 'senador1' | 'senador2' | 'governador' | 'presidente',
    candidatoNum: string
  ) => {
    let list: Candidato[] = [];
    if (cargo === 'governador') list = CANDIDATOS_GOVERNADOR;
    else if (cargo === 'presidente') list = CANDIDATOS_PRESIDENTE;
    else list = CANDIDATOS_SENADOR;

    if (!candidatoNum) {
      setData(prev => ({
        ...prev,
        [`${cargo}Nome`]: '',
        [`${cargo}Num`]: '',
        [`${cargo}Foto`]: ''
      }));
      return;
    }

    const cand = list.find(c => c.numero === candidatoNum);
    if (cand) {
      setData(prev => {
        const next = {
          ...prev,
          [`${cargo}Nome`]: cand.nomeUrna.toUpperCase(),
          [`${cargo}Num`]: cand.numero,
          [`${cargo}Foto`]: cand.fotoUrl
        };
        // Não pode votar 2x no mesmo senador: se escolher um, elimina o outro
        if (cargo === 'senador1' && cand.numero === prev.senador2Num) {
          next.senador2Nome = '';
          next.senador2Num = '';
          next.senador2Foto = '';
        } else if (cargo === 'senador2' && cand.numero === prev.senador1Num) {
          next.senador1Nome = '';
          next.senador1Num = '';
          next.senador1Foto = '';
        }
        return next;
      });
    }
  };

  const updateNumber = (field: keyof ColinhaState, value: string, maxLen: number) => {
    const clean = value.replace(/\D/g, '').slice(0, maxLen);
    const prefix = field.replace('Num', '') as 'senador1' | 'senador2' | 'governador' | 'presidente';
    
    let autoNome = '';
    let autoFoto = '';
    let clearOtherSenador: 'senador1' | 'senador2' | null = null;

    if (prefix === 'governador') {
      const c = CANDIDATOS_GOVERNADOR.find(x => x.numero === clean);
      if (c) { autoNome = c.nomeUrna.toUpperCase(); autoFoto = c.fotoUrl; }
    } else if (prefix === 'presidente') {
      const c = CANDIDATOS_PRESIDENTE.find(x => x.numero === clean);
      if (c) { autoNome = c.nomeUrna.toUpperCase(); autoFoto = c.fotoUrl; }
    } else if (prefix === 'senador1') {
      const c = CANDIDATOS_SENADOR.find(x => x.numero === clean);
      if (c) {
        autoNome = c.nomeUrna.toUpperCase();
        autoFoto = c.fotoUrl;
        if (clean === data.senador2Num) clearOtherSenador = 'senador2';
      }
    } else if (prefix === 'senador2') {
      const c = CANDIDATOS_SENADOR.find(x => x.numero === clean);
      if (c) {
        autoNome = c.nomeUrna.toUpperCase();
        autoFoto = c.fotoUrl;
        if (clean === data.senador1Num) clearOtherSenador = 'senador1';
      }
    }

    setData(prev => ({
      ...prev,
      [field]: clean,
      ...(autoNome ? { [`${prefix}Nome`]: autoNome } : {}),
      ...(autoFoto ? { [`${prefix}Foto`]: autoFoto } : (clean.length === 0 ? { [`${prefix}Foto`]: '' } : {})),
      ...(clearOtherSenador ? {
        [`${clearOtherSenador}Nome`]: '',
        [`${clearOtherSenador}Num`]: '',
        [`${clearOtherSenador}Foto`]: ''
      } : {})
    }));
  };

  const updateName = (field: keyof ColinhaState, value: string) => {
    setData(prev => ({ ...prev, [field]: value.slice(0, 30) }));
  };

  const handleDownload = async () => {
    const targetEl = exportCardRef.current || printableCardRef.current;
    if (!targetEl || isExporting) return;
    setLoadingText('Baixando imagem da colinha...');
    setIsExporting(true);
    trackEvent('Download_Colinha_Image');

    try {
      const dataUrl = await toPng(targetEl, {
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

      // Abre a imagem cheia na tela para visualização no celular
      setFullScreenImage(dataUrl);
      showToast('Imagem salva! Visualização aberta na tela.');
    } catch (err) {
      console.error('Erro ao gerar imagem:', err);
      alert('Não foi possível salvar a imagem automaticamente. Você pode tirar um print da tela no seu celular!');
    } finally {
      setIsExporting(false);
    }
  };

  // Compartilhar no WhatsApp a imagem da colinha pronta anexada junto com a mensagem
  const handleShareWhatsApp = async () => {
    const targetEl = exportCardRef.current || printableCardRef.current;
    if (!targetEl || isExporting) return;
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
      const blob = await toBlob(targetEl, {
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

  // Fixed visual digit boxes
  const renderFixedNumberBoxes = (numberStr: string, totalDigits?: number) => {
    const safeStr = numberStr || '';
    const digits = totalDigits ? safeStr.padEnd(totalDigits, ' ').slice(0, totalDigits) : safeStr;
    return (
      <div className="flex items-center gap-1 sm:gap-1.5">
        {digits.split('').map((digit, i) => (
          <div
            key={i}
            className="w-8.5 h-11 sm:w-10 sm:h-12 bg-white text-black border-2 border-black rounded-md flex items-center justify-center font-sans font-bold text-xl sm:text-2xl shadow-xs"
          >
            {digit.trim()}
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
              <div className="flex flex-col gap-2.5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    3. 1º SENADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    3 dígitos
                  </span>
                </div>

                {/* Dropdown com candidatos aptos para votar */}
                <div>
                  <select
                    value={data.senador1Num}
                    onChange={(e) => handleSelectCandidate('senador1', e.target.value)}
                    className="w-full text-xs sm:text-sm font-bold text-black bg-white px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-black outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- SELECIONE O(A) SENADOR(A) --</option>
                    {CANDIDATOS_SENADOR.filter((c) => c.numero !== data.senador2Num).map((c) => (
                      <option key={c.numero} value={c.numero}>
                        {c.numero} - {c.nomeUrna} ({c.partido})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Foto e Nome do Candidato */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    {data.senador1Foto ? (
                      <img
                        src={data.senador1Foto}
                        alt={data.senador1Nome || "1º Senador"}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">FOTO</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={data.senador1Nome}
                      onChange={(e) => updateName('senador1Nome', e.target.value)}
                      placeholder="Nome do(a) Senador(a)"
                      className="w-full text-base sm:text-lg font-bold text-black bg-white px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-black outline-none placeholder:text-gray-400 uppercase block"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('senador1Num', data.senador1Num, 3)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 4. SENADOR 2 */}
              <div className="flex flex-col gap-2.5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    4. 2º SENADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    3 dígitos
                  </span>
                </div>

                {/* Dropdown com candidatos aptos para votar */}
                <div>
                  <select
                    value={data.senador2Num}
                    onChange={(e) => handleSelectCandidate('senador2', e.target.value)}
                    className="w-full text-xs sm:text-sm font-bold text-black bg-white px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-black outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- SELECIONE O(A) 2º SENADOR(A) --</option>
                    {CANDIDATOS_SENADOR.filter((c) => c.numero !== data.senador1Num).map((c) => (
                      <option key={c.numero} value={c.numero}>
                        {c.numero} - {c.nomeUrna} ({c.partido})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Foto e Nome do Candidato */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    {data.senador2Foto ? (
                      <img
                        src={data.senador2Foto}
                        alt={data.senador2Nome || "2º Senador"}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">FOTO</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={data.senador2Nome}
                      onChange={(e) => updateName('senador2Nome', e.target.value)}
                      placeholder="Nome do(a) Senador(a)"
                      className="w-full text-base sm:text-lg font-bold text-black bg-white px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-black outline-none placeholder:text-gray-400 uppercase block"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('senador2Num', data.senador2Num, 3)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 5. GOVERNADOR */}
              <div className="flex flex-col gap-2.5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    5. GOVERNADOR
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    2 dígitos
                  </span>
                </div>

                {/* Dropdown com candidatos aptos para votar */}
                <div>
                  <select
                    value={data.governadorNum}
                    onChange={(e) => handleSelectCandidate('governador', e.target.value)}
                    className="w-full text-xs sm:text-sm font-bold text-black bg-white px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-black outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- SELECIONE O(A) GOVERNADOR(A) --</option>
                    {CANDIDATOS_GOVERNADOR.map((c) => (
                      <option key={c.numero} value={c.numero}>
                        {c.numero} - {c.nomeUrna} ({c.partido})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Foto e Nome do Candidato */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    {data.governadorFoto ? (
                      <img
                        src={data.governadorFoto}
                        alt={data.governadorNome || "Governador"}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">FOTO</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={data.governadorNome}
                      onChange={(e) => updateName('governadorNome', e.target.value)}
                      placeholder="Nome do(a) Governador(a)"
                      className="w-full text-base sm:text-lg font-bold text-black bg-white px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-black outline-none placeholder:text-gray-400 uppercase block"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1">
                  {renderInputNumberBoxes('governadorNum', data.governadorNum, 2)}
                  {renderConfirmaButton()}
                </div>
              </div>

              {/* 6. PRESIDENTE */}
              <div className="flex flex-col gap-2.5 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-bold uppercase text-gray-700 tracking-wider">
                    6. PRESIDENTE
                  </span>
                  <span className="text-[11px] font-semibold text-gray-400 uppercase">
                    2 dígitos
                  </span>
                </div>

                {/* Dropdown com candidatos aptos para votar */}
                <div>
                  <select
                    value={data.presidenteNum}
                    onChange={(e) => handleSelectCandidate('presidente', e.target.value)}
                    className="w-full text-xs sm:text-sm font-bold text-black bg-white px-3 py-2.5 rounded-lg border-2 border-gray-300 focus:border-black outline-none uppercase cursor-pointer"
                  >
                    <option value="">-- SELECIONE O(A) PRESIDENTE --</option>
                    {CANDIDATOS_PRESIDENTE.map((c) => (
                      <option key={c.numero} value={c.numero}>
                        {c.numero} - {c.nomeUrna} ({c.partido})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Foto e Nome do Candidato */}
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center shadow-2xs">
                    {data.presidenteFoto ? (
                      <img
                        src={data.presidenteFoto}
                        alt={data.presidenteNome || "Presidente"}
                        className="w-full h-full object-cover object-top"
                        referrerPolicy="no-referrer"
                        crossOrigin="anonymous"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <span className="text-[10px] font-bold text-gray-400 uppercase">FOTO</span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <input
                      type="text"
                      value={data.presidenteNome}
                      onChange={(e) => updateName('presidenteNome', e.target.value)}
                      placeholder="Nome do(a) Presidente"
                      className="w-full text-base sm:text-lg font-bold text-black bg-white px-3 py-2 rounded-lg border-2 border-gray-200 focus:border-black outline-none placeholder:text-gray-400 uppercase block"
                    />
                  </div>
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
      {/* MODAL DE VISUALIZAÇÃO EM TELA CHEIA (FULL-SCREEN VIEWER) */}
      {/* ========================================================= */}
      {fullScreenImage && (
        <div
          className="fixed inset-0 z-[100000] bg-black flex flex-col items-center justify-center p-0 m-0 select-none animate-in fade-in duration-200"
          onClick={() => setFullScreenImage(null)}
        >
          {/* Botão Fechar discreto */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setFullScreenImage(null);
            }}
            className="absolute top-4 right-4 z-30 p-2.5 bg-black/60 hover:bg-black/80 text-white rounded-full transition-all cursor-pointer"
            aria-label="Fechar visualização"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Imagem ocupando a tela toda */}
          <div className="w-full h-full flex items-center justify-center p-2 sm:p-4">
            <img
              src={fullScreenImage}
              alt="Colinha Eleitoral"
              className="w-full h-full max-h-screen max-w-screen object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Aviso para salvar a imagem */}
          <div className="absolute bottom-5 inset-x-4 max-w-sm mx-auto z-30 pointer-events-none">
            <div className="bg-black/80 backdrop-blur-md border border-white/20 text-white py-2.5 px-4 rounded-xl text-center text-xs sm:text-sm font-semibold shadow-2xl">
              💡 Toque e segure na imagem para salvar nas suas fotos
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* EXPORT TEMPLATES (OFFSCREEN FOR CRYSTAL-CLEAR PNG GENERATION) */}
      {/* ========================================================= */}
      <div className="fixed -left-[9999px] -top-[9999px] pointer-events-none opacity-0 select-none overflow-hidden">
        
        {/* 1. EXPORT CARD FOR DOWNLOAD & WHATSAPP (STATIC, NATURAL HEIGHT, ZERO OVERLAPPING) */}
        <div
          ref={exportCardRef}
          className="w-[460px] bg-white text-black rounded-2xl overflow-hidden border-2 border-black font-sans flex flex-col"
          style={{ width: '460px' }}
        >
          {/* Lista dos Candidatos */}
          <div className="p-5 flex flex-col gap-4 bg-white divide-y divide-gray-200">
            {/* 1. DEPUTADA FEDERAL */}
            <div className="flex flex-col gap-2 pt-0 first:pt-0">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider block">
                1. DEPUTADA FEDERAL
              </span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                  <img
                    src={NINA_PHOTO}
                    alt="NINA PASSADORE"
                    className="w-full h-full object-cover object-top"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    NINA PASSADORE
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes("4407")}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 2. DEPUTADO ESTADUAL */}
            <div className="flex flex-col gap-2 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider block">
                2. DEPUTADO ESTADUAL
              </span>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                  <img
                    src={RAFAEL_PHOTO}
                    alt="RAFAEL SARAIVA"
                    className="w-full h-full object-cover object-top"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    RAFAEL SARAIVA
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes("44077")}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 3. 1º SENADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                3. 1º SENADOR
              </span>
              <div className="flex items-center gap-3">
                {data.senador1Foto ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.senador1Foto}
                      alt={data.senador1Nome || "1º SENADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    {data.senador1Nome ? data.senador1Nome.toUpperCase() : '---'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes(data.senador1Num, 3)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 4. 2º SENADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                4. 2º SENADOR
              </span>
              <div className="flex items-center gap-3">
                {data.senador2Foto ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.senador2Foto}
                      alt={data.senador2Nome || "2º SENADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    {data.senador2Nome ? data.senador2Nome.toUpperCase() : '---'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes(data.senador2Num, 3)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 5. GOVERNADOR */}
            <div className="flex flex-col gap-1.5 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                5. GOVERNADOR
              </span>
              <div className="flex items-center gap-3">
                {data.governadorFoto ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.governadorFoto}
                      alt={data.governadorNome || "GOVERNADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    {data.governadorNome ? data.governadorNome.toUpperCase() : '---'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes(data.governadorNum, 2)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 6. PRESIDENTE */}
            <div className="flex flex-col gap-1.5 pt-3">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                6. PRESIDENTE
              </span>
              <div className="flex items-center gap-3">
                {data.presidenteFoto ? (
                  <div className="w-14 h-14 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.presidenteFoto}
                      alt={data.presidenteNome || "PRESIDENTE"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <span className="text-lg font-bold text-black block leading-tight">
                    {data.presidenteNome ? data.presidenteNome.toUpperCase() : '---'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                {renderFixedNumberBoxes(data.presidenteNum, 2)}
                {renderConfirmaButton()}
              </div>
            </div>
          </div>
        </div>

        {/* 2. 9:16 STORIES TEMPLATE (ENCAIXE 100% PERFEITO NOS STORIES) */}
        <div
          ref={storiesCardRef}
          className="w-[450px] h-[800px] bg-white text-black flex flex-col justify-between p-4 font-sans border-2 border-black"
          style={{ width: '450px', height: '800px' }}
        >
          {/* Candidatos Formatados */}
          <div className="flex flex-col gap-2.5 my-auto divide-y divide-gray-100">
            {/* 1. DEPUTADA FEDERAL */}
            <div className="flex flex-col gap-1 pt-0 first:pt-0">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                1. DEPUTADA FEDERAL
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
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
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                2. DEPUTADO ESTADUAL
              </span>
              <div className="flex items-center gap-2.5">
                <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
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
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                3. 1º SENADOR
              </span>
              <div className="flex items-center gap-2.5">
                {data.senador1Foto ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.senador1Foto}
                      alt={data.senador1Nome || "1º SENADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <span className="text-base font-bold text-black flex-1 truncate">
                  {data.senador1Nome ? data.senador1Nome.toUpperCase() : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.senador1Num, 3)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 4. 2º SENADOR */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                4. 2º SENADOR
              </span>
              <div className="flex items-center gap-2.5">
                {data.senador2Foto ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.senador2Foto}
                      alt={data.senador2Nome || "2º SENADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <span className="text-base font-bold text-black flex-1 truncate">
                  {data.senador2Nome ? data.senador2Nome.toUpperCase() : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.senador2Num, 3)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 5. GOVERNADOR */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                5. GOVERNADOR
              </span>
              <div className="flex items-center gap-2.5">
                {data.governadorFoto ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.governadorFoto}
                      alt={data.governadorNome || "GOVERNADOR"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <span className="text-base font-bold text-black flex-1 truncate">
                  {data.governadorNome ? data.governadorNome.toUpperCase() : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.governadorNum, 2)}
                {renderConfirmaButton()}
              </div>
            </div>

            {/* 6. PRESIDENTE */}
            <div className="flex flex-col gap-1 pt-2">
              <span className="text-xs font-bold uppercase text-gray-700 tracking-wider">
                6. PRESIDENTE
              </span>
              <div className="flex items-center gap-2.5">
                {data.presidenteFoto ? (
                  <div className="w-11 h-11 rounded-full overflow-hidden border border-black shrink-0 bg-gray-100 flex items-center justify-center">
                    <img
                      src={data.presidenteFoto}
                      alt={data.presidenteNome || "PRESIDENTE"}
                      className="w-full h-full object-cover object-top"
                      crossOrigin="anonymous"
                    />
                  </div>
                ) : (
                  <div className="w-11 h-11 rounded-full border border-dashed border-gray-300 shrink-0 bg-gray-50 flex items-center justify-center text-[9px] font-bold text-gray-400 uppercase">
                    VOTO
                  </div>
                )}
                <span className="text-base font-bold text-black flex-1 truncate">
                  {data.presidenteNome ? data.presidenteNome.toUpperCase() : '---'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2 pt-0.5">
                {renderFixedNumberBoxes(data.presidenteNum, 2)}
                {renderConfirmaButton()}
              </div>
            </div>
          </div>

          {/* Footer Stories com Link */}
          <div className="text-center text-[10px] text-gray-500 font-semibold p-1">
            www.rafaelsaraivasp.com/colinha
          </div>
        </div>
      </div>
    </>
  );
};
