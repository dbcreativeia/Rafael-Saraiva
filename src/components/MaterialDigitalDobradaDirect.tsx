import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Download, CheckCircle2, FileArchive, Sparkles, Layers, Image as ImageIcon, ArrowDown, ImagePlus } from 'lucide-react';
import { Helmet } from 'react-helmet-async';
import { Footer } from './Footer';
import { trackEvent } from '../analytics';
import { ProfilePhotoMaker } from './ProfilePhotoMaker';

interface MaterialItem {
  name: string;
  label: string;
  description: string;
  format: 'PNG' | 'JPG';
  sizeHint: string;
}

const DOBRADA_MATERIALS: MaterialItem[] = [
  {
    name: 'Fechado-Com-Eles.png',
    label: 'Fechado com Eles',
    description: 'Arte oficial da dobrada Rafael Saraiva e Nina Passadore para Feed do Instagram, Facebook e WhatsApp.',
    format: 'PNG',
    sizeHint: 'Feed (Alta Resolução)'
  },
  {
    name: 'Santao-Dobrada.jpg',
    label: 'Santão Dobrada',
    description: 'Folder virtual completo com as propostas, leis e o histórico de luta da dobrada pelos animais.',
    format: 'JPG',
    sizeHint: 'Folder em Alta Resolução'
  },
  {
    name: 'Colinha_Dobrada.jpeg',
    label: 'Colinha Eleitoral Dobrada',
    description: 'Colinha oficial com os números dos candidatos para compartilhar ou levar no dia da votação.',
    format: 'JPG',
    sizeHint: 'Card Oficial da Dobrada'
  },
  {
    name: 'StoriesDobrada.jpeg',
    label: 'Stories Dobrada',
    description: 'Arte em formato vertical para Stories do Instagram, Status do WhatsApp e Facebook da dobrada.',
    format: 'JPG',
    sizeHint: 'Stories / Status (Vertical)'
  }
];

export const MaterialDigitalDobradaDirect = () => {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('PageView_MaterialDigitalDobradaDirect');
  }, []);

  // Download de todos os arquivos individualmente em sequência
  const handleDownloadAllSeparately = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    setDownloadSuccess(false);
    trackEvent('Download_MaterialDigitalDobrada_AllIndividual');

    for (let i = 0; i < DOBRADA_MATERIALS.length; i++) {
      const item = DOBRADA_MATERIALS[i];
      setDownloadProgress(`Baixando ${i + 1} de ${DOBRADA_MATERIALS.length}: ${item.label}...`);
      try {
        const response = await fetch(`/${item.name}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = item.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        if (i < DOBRADA_MATERIALS.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 800));
        }
      } catch (err) {
        console.warn(`Erro ao baixar ${item.name}:`, err);
      }
    }

    setDownloadingAll(false);
    setDownloadProgress(null);
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 5000);
  };

  // Download individual de um arquivo específico
  const handleDownloadSingle = async (fileName: string, label: string) => {
    setDownloadingItem(fileName);
    trackEvent(`Download_MaterialDigitalDobrada_${fileName.replace(/\./g, '_')}`);
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
    } catch (err) {
      console.warn(`Erro ao baixar ${fileName}:`, err);
    } finally {
      setTimeout(() => setDownloadingItem(null), 500);
    }
  };

  return (
    <>
      <Helmet>
        <title>Download de Material Digital Dobrada | Rafael Saraiva & Nina Passadore</title>
        <meta name="title" content="Download de Material Digital Dobrada | Rafael Saraiva & Nina Passadore" />
        <meta name="description" content="Baixe diretamente o pacote completo de materiais digitais da dobrada Rafael Saraiva e Nina Passadore sem necessidade de cadastro." />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Download de Material Digital Dobrada | Rafael Saraiva & Nina Passadore" />
        <meta property="og:description" content="Acesso direto ao material digital da dobrada sem necessidade de cadastro." />
      </Helmet>

      <div className="min-h-screen bg-[#102b31] relative overflow-x-hidden w-full max-w-[100vw] flex flex-col pt-28">
        {/* Textura de fundo */}
        <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden mix-blend-overlay">
          <img 
            src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
            alt="Texture" 
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="flex-grow container mx-auto px-4 max-w-5xl py-8 md:py-12 relative z-10">
          {/* Banner oficial da dobrada */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8 flex flex-col items-center w-full overflow-visible"
          >
            <div className="w-full max-w-2xl flex justify-center overflow-visible">
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
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* Cabeçalho de Destaque com as cores da dobrada */}
            <div className="bg-[#ebb430] p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#102b31]/15 backdrop-blur-md text-[#102b31] text-xs font-black uppercase tracking-wider mb-4 border border-[#102b31]/20">
                <Sparkles className="w-3.5 h-3.5 text-[#102b31]" /> Acesso Direto • Sem Cadastro
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-[#102b31] uppercase tracking-tight mb-4 drop-shadow-xs">
                Material Digital da Dobrada
              </h1>
              <p className="text-base md:text-xl text-[#102b31]/90 font-medium max-w-2xl mx-auto leading-relaxed">
                Baixe imediatamente todas as artes oficiais da dobrada Rafael Saraiva e Nina Passadore em alta resolução para compartilhar nas suas redes sociais e no WhatsApp.
              </p>
            </div>

            {/* Painel Principal de Ações de Download */}
            <div className="p-6 md:p-10">
              {/* Notificação de Sucesso */}
              {downloadSuccess && (
                <div className="mb-8 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-3 animate-fadeIn">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                  <span className="font-bold text-sm md:text-base">
                    Download iniciado com sucesso! Verifique a pasta de downloads do seu dispositivo.
                  </span>
                </div>
              )}

              {/* Botão de Destaque Primário: Baixar Tudo */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border-2 border-[#ebb430]/40 rounded-3xl p-6 md:p-8 mb-10 text-center relative shadow-sm">
                <div className="max-w-2xl mx-auto flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#ebb430] text-[#102b31] flex items-center justify-center shadow-lg mb-4">
                    <FileArchive className="w-8 h-8" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-[#102b31] uppercase tracking-tight mb-2">
                    Baixar Todas as Artes da Dobrada
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 font-medium mb-6">
                    Baixe todas as 4 artes oficiais: arte de apoio "Fechado com Eles", Santão da Dobrada, Colinha Eleitoral e Stories da Dobrada em alta resolução diretamente no seu dispositivo.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    {/* Botão Baixar Todas as Imagens */}
                    <button
                      id="btn-download-dobrada-individual"
                      onClick={handleDownloadAllSeparately}
                      disabled={downloadingAll}
                      className="px-8 py-4 bg-[#ebb430] hover:bg-[#d4a22b] active:scale-95 text-[#102b31] font-black text-base md:text-lg uppercase tracking-wider rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-6 h-6" />
                      <span>{downloadingAll ? 'Baixando Imagens...' : 'Baixar Todas as Artes'}</span>
                    </button>
                  </div>

                  {downloadProgress && (
                    <div className="mt-4 text-xs font-bold text-[#102b31] bg-[#ebb430]/20 px-4 py-2 rounded-full border border-[#ebb430]/40">
                      {downloadProgress}
                    </div>
                  )}

                  <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-bold text-gray-500">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Sem formulários
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> 100% Gratuito
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Alta Resolução
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção da Galeria com Download Individual */}
              <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-[#102b31] uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-[#ebb430]" />
                    Artes da Dobrada para Baixar
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 font-medium">
                    Prefere baixar apenas uma peça específica? Clique no botão de cada arte abaixo:
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-[#102b31] text-xs font-bold">
                  {DOBRADA_MATERIALS.length} arquivos disponíveis
                </span>
              </div>

              {/* Grid das artes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {DOBRADA_MATERIALS.map((item) => {
                  const isItemDownloading = downloadingItem === item.name;

                  return (
                    <div
                      key={item.name}
                      className="bg-gray-50 rounded-2xl border border-gray-200 overflow-hidden flex flex-col hover:shadow-lg transition-all duration-200 group"
                    >
                      {/* Pré-visualização da imagem */}
                      <div 
                        className="relative aspect-square bg-gray-100 overflow-hidden cursor-pointer"
                        onClick={() => handleDownloadSingle(item.name, item.label)}
                        title={`Clique para baixar ${item.label}`}
                      >
                        <img
                          src={`/${item.name}`}
                          alt={item.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <span className="bg-white/95 text-[#102b31] text-xs font-black uppercase px-3 py-2 rounded-full flex items-center gap-1.5 shadow-md">
                            <Download className="w-3.5 h-3.5 text-[#ebb430]" /> Baixar Imagem
                          </span>
                        </div>
                        <div className="absolute top-2 right-2">
                          <span className="px-2 py-0.5 rounded-md bg-black/60 text-white text-[10px] font-black uppercase backdrop-blur-xs">
                            {item.format}
                          </span>
                        </div>
                      </div>

                      {/* Informações da arte */}
                      <div className="p-4 flex flex-col justify-between flex-grow">
                        <div className="mb-3">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-[#d4a22b] block mb-1">
                            {item.sizeHint}
                          </span>
                          <h4 className="text-sm font-black text-[#102b31] leading-tight mb-1" title={item.label}>
                            {item.label}
                          </h4>
                          <p className="text-xs text-gray-500 font-medium line-clamp-2">
                            {item.description}
                          </p>
                        </div>

                        {/* Botão de download individual */}
                        <button
                          onClick={() => handleDownloadSingle(item.name, item.label)}
                          disabled={isItemDownloading}
                          className="w-full py-2.5 px-3 bg-white hover:bg-[#ebb430] hover:text-[#102b31] text-[#102b31] text-xs font-black uppercase rounded-xl border border-gray-300 hover:border-[#ebb430] transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                        >
                          {isItemDownloading ? (
                            <span>Baixando...</span>
                          ) : (
                            <>
                              <Download className="w-3.5 h-3.5" />
                              <span>Baixar {item.format}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dica de uso */}
              <div className="mt-10 p-5 rounded-2xl bg-amber-50/70 border border-amber-200 text-[#102b31] text-xs md:text-sm font-medium flex items-start gap-3">
                <div className="p-1.5 bg-amber-100 text-amber-800 rounded-lg shrink-0 mt-0.5">
                  <ArrowDown className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-[#102b31] block mb-0.5">Dica de compartilhamento:</strong>
                  Você pode enviar essas artes para seus contatos e grupos de proteção animal no WhatsApp ou compartilhar nos seus perfis e stories. Juntos fortalecemos a voz dos animais!
                </div>
              </div>

              {/* Opção para fazer o Avatar (Foto de Perfil igual ao /ninapassadore) */}
              <div className="mt-12 pt-10 border-t-2 border-gray-200">
                <div className="max-w-md mx-auto mb-6">
                  <div className="p-6 rounded-2xl border-4 border-[#ebb430] bg-[#ebb430]/10 shadow-md text-center">
                    <ImagePlus className="w-12 h-12 mx-auto mb-3 text-[#ebb430]" />
                    <h3 className="text-xl font-black uppercase mb-2 text-[#102b31]">Foto de Perfil</h3>
                    <p className="text-[#102b31]/70 text-sm font-medium">Crie sua foto com nossa moldura para as redes sociais.</p>
                  </div>
                </div>

                <ProfilePhotoMaker molduraUrl="/moldura-foto-perfil_2.png" />
              </div>

            </div>
          </motion.div>
        </div>

        <Footer />
      </div>
    </>
  );
};
