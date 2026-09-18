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

const DIGITAL_MATERIALS: MaterialItem[] = [
  {
    name: 'Estou-fechado-com-ele.png',
    label: 'Estou Fechado com Ele',
    description: 'Arte principal de apoio para postar no Feed do Instagram, Facebook e WhatsApp.',
    format: 'PNG',
    sizeHint: 'Feed 1:1 (Alta Resolução)'
  },
  {
    name: 'A-Luta-Continua.png',
    label: 'A Luta Continua',
    description: 'Post manifesto sobre o trabalho incansável na defesa e proteção animal.',
    format: 'PNG',
    sizeHint: 'Feed (Alta Resolução)'
  },
  {
    name: 'Mais-Direitos-e-Protecao.png',
    label: 'Mais Direitos e Proteção',
    description: 'Arte informativa sobre as propostas e avanços pelos direitos dos animais.',
    format: 'PNG',
    sizeHint: 'Feed (Alta Resolução)'
  },
  {
    name: 'Colinha.png',
    label: 'Colinha Eleitoral Oficial',
    description: 'Colinha com o número 44077 para levar no dia da votação ou compartilhar.',
    format: 'PNG',
    sizeHint: 'Card Oficial 44077'
  },
  {
    name: 'Capa-Facebook.png',
    label: 'Capa para Facebook',
    description: 'Imagem dimensionada sob medida para aplicar na capa do perfil do Facebook.',
    format: 'PNG',
    sizeHint: 'Dimensão Capa Facebook'
  },
  {
    name: 'Marque-5-Amigos_Feed.png',
    label: 'Marque 5 Amigos (Feed)',
    description: 'Desafio de mobilização para engajar protetores e tutores nos comentários.',
    format: 'PNG',
    sizeHint: 'Formato Quadrado Feed'
  },
  {
    name: 'Marque-5-Amigos_Stories.png',
    label: 'Marque 5 Amigos (Stories)',
    description: 'Arte vertical com espaço para marcar amigos e repostar nos Stories.',
    format: 'PNG',
    sizeHint: 'Stories 9:16 Vertical'
  },
  {
    name: 'Santao-Rafael.jpg',
    label: 'Santão Oficial',
    description: 'Folder virtual completo com resumo do mandato, leis e compromissos.',
    format: 'JPG',
    sizeHint: 'Folder em Alta Resolução'
  }
];

export const MaterialDigitalDirect = () => {
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState(false);
  const [downloadingItem, setDownloadingItem] = useState<string | null>(null);

  useEffect(() => {
    trackEvent('PageView_MaterialDigitalDirect');
  }, []);

  // Download de todos os arquivos individualmente (imagens em alta qualidade)
  const handleDownloadAllSeparately = async () => {
    if (downloadingAll) return;
    setDownloadingAll(true);
    setDownloadSuccess(false);
    trackEvent('Download_MaterialDigital_AllIndividual');

    for (let i = 0; i < DIGITAL_MATERIALS.length; i++) {
      const item = DIGITAL_MATERIALS[i];
      setDownloadProgress(`Baixando ${i + 1} de ${DIGITAL_MATERIALS.length}: ${item.label}...`);
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

        if (i < DIGITAL_MATERIALS.length - 1) {
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
    trackEvent(`Download_MaterialDigital_${fileName.replace(/\./g, '_')}`);
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
        <title>Download de Material Digital | Rafael Saraiva 44077</title>
        <meta name="title" content="Download de Material Digital | Rafael Saraiva 44077" />
        <meta name="description" content="Baixe diretamente o pacote completo de materiais digitais da campanha do Deputado Rafael Saraiva 44077. Artes para feed, stories, capa e colinha eleitoral em alta definição." />
        <meta name="robots" content="noindex, nofollow" />
        <meta property="og:title" content="Download de Material Digital | Rafael Saraiva 44077" />
        <meta property="og:description" content="Acesso direto ao material digital de campanha sem necessidade de cadastro." />
      </Helmet>

      <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-primary relative overflow-x-hidden w-full max-w-[100vw] flex flex-col pt-28">
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
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100"
          >
            {/* Cabeçalho de Destaque */}
            <div className="bg-gradient-to-r from-orange-500 via-red-500 to-orange-600 p-8 md:p-12 text-center relative overflow-hidden">
              <div className="absolute -right-12 -bottom-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -left-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-black uppercase tracking-wider mb-4 border border-white/30">
                <Sparkles className="w-3.5 h-3.5" /> Acesso Direto • Sem Cadastro
              </div>

              <h1 className="text-3xl md:text-5xl font-black text-white uppercase tracking-tight mb-4 drop-shadow-sm">
                Material Digital de Campanha
              </h1>
              <p className="text-base md:text-xl text-white/95 font-medium max-w-2xl mx-auto leading-relaxed">
                Baixe imediatamente todas as artes oficiais do Deputado Rafael Saraiva 44077 em alta resolução para compartilhar nas suas redes sociais e no WhatsApp.
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
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-orange-200 rounded-3xl p-6 md:p-8 mb-10 text-center relative">
                <div className="max-w-2xl mx-auto flex flex-col items-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg mb-4">
                    <FileArchive className="w-8 h-8" />
                  </div>

                  <h2 className="text-2xl md:text-3xl font-black text-gray-900 uppercase tracking-tight mb-2">
                    Baixar Todas as Artes Oficiais
                  </h2>
                  <p className="text-sm md:text-base text-gray-600 font-medium mb-6">
                    Baixe todas as artes em alta qualidade prontas para uso: posts de feed, stories, capa do Facebook, santão e colinha diretamente no seu dispositivo.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
                    {/* Botão Baixar Todas as Imagens */}
                    <button
                      id="btn-download-all-individual"
                      onClick={handleDownloadAllSeparately}
                      disabled={downloadingAll}
                      className="px-8 py-4 bg-orange-500 hover:bg-orange-600 active:scale-95 text-white font-black text-base md:text-lg uppercase tracking-wider rounded-2xl shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-50 cursor-pointer"
                    >
                      <Download className="w-6 h-6" />
                      <span>{downloadingAll ? 'Baixando Imagens...' : 'Baixar Todas as Artes'}</span>
                    </button>
                  </div>

                  {downloadProgress && (
                    <div className="mt-4 text-xs font-bold text-orange-700 bg-orange-100/80 px-4 py-2 rounded-full border border-orange-200">
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
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-600" /> Formatos PNG e JPG
                    </span>
                  </div>
                </div>
              </div>

              {/* Seção da Galeria com Download Individual */}
              <div className="mb-6 flex items-center justify-between border-b border-gray-200 pb-4">
                <div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-900 uppercase tracking-tight flex items-center gap-2">
                    <ImageIcon className="w-6 h-6 text-orange-500" />
                    Artes Individuais para Baixar
                  </h3>
                  <p className="text-xs md:text-sm text-gray-500 font-medium">
                    Prefere baixar apenas uma peça específica? Clique no botão de cada arte abaixo:
                  </p>
                </div>
                <span className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold">
                  {DIGITAL_MATERIALS.length} arquivos disponíveis
                </span>
              </div>

              {/* Grid das 8 artes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {DIGITAL_MATERIALS.map((item) => {
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
                          <span className="bg-white/95 text-gray-900 text-xs font-black uppercase px-3 py-2 rounded-full flex items-center gap-1.5 shadow-md">
                            <Download className="w-3.5 h-3.5 text-orange-600" /> Baixar Imagem
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
                          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 block mb-1">
                            {item.sizeHint}
                          </span>
                          <h4 className="text-sm font-black text-gray-900 leading-tight mb-1" title={item.label}>
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
                          className="w-full py-2.5 px-3 bg-white hover:bg-orange-500 hover:text-white text-gray-700 text-xs font-black uppercase rounded-xl border border-gray-300 hover:border-orange-500 transition-all flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
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
              <div className="mt-10 p-5 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs md:text-sm font-medium flex items-start gap-3">
                <div className="p-1.5 bg-blue-100 text-blue-700 rounded-lg shrink-0 mt-0.5">
                  <ArrowDown className="w-4 h-4" />
                </div>
                <div>
                  <strong className="font-bold text-blue-950 block mb-0.5">Dica de compartilhamento:</strong>
                  Você pode enviar essas imagens para seus grupos de protetores de animais no WhatsApp, publicar no feed do Instagram ou definir como foto de capa. Juntos somos a voz dos animais!
                </div>
              </div>

              {/* Opção para fazer o Avatar (Foto de Perfil igual ao /material) */}
              <div className="mt-12 pt-10 border-t-2 border-gray-200">
                <div className="max-w-md mx-auto mb-6">
                  <div className="p-6 rounded-2xl border-4 border-orange-500 bg-orange-50/50 shadow-md text-center">
                    <ImagePlus className="w-12 h-12 mx-auto mb-3 text-orange-500" />
                    <h3 className="text-xl font-black uppercase mb-2 text-orange-600">Foto de Perfil</h3>
                    <p className="text-gray-500 text-sm font-medium">Crie sua foto com nossa moldura para as redes sociais.</p>
                  </div>
                </div>

                <ProfilePhotoMaker molduraUrl="/moldura-foto-perfil_rafael-saraiva_44077.png" />
              </div>

            </div>
          </motion.div>
        </div>

        <Footer />
      </div>
    </>
  );
};
