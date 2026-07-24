import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import {
  Target,
  HeartHandshake,
  BookOpen,
  Stethoscope,
  Scale,
  Building2,
  Trophy,
  AlertTriangle,
  Dog,
  Syringe,
  Vote,
  X,
  ChevronLeft,
  ChevronRight,
  Menu,
  ChevronDown
} from "lucide-react";

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-100px" },
  transition: { duration: 0.6 },
};

export const MandatoInfo = () => {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const galleryImages = [
    "https://lh3.googleusercontent.com/d/1Jrm2xdJ3aWMxiZ6QJ0SovA-sdyE408Ys",
    "https://lh3.googleusercontent.com/d/1rNrkkTnfyvHtw5eaRngmjdwOy4KKTpPP",
    "https://lh3.googleusercontent.com/d/1zIjLuDZLJBhnt1_RHNqgNuO_VxTsgF-Q",
    "https://lh3.googleusercontent.com/d/1oduVCs8bReYk_U4i8p7hf1TxLO68elzD",
    "https://lh3.googleusercontent.com/d/1Tx2rfmJahoxxMhijv5uCv4OSu68l9mio",
    "https://lh3.googleusercontent.com/d/1yoP0K3En1nxuqpfjB5hUlTedV8qKFqDn",
    "https://lh3.googleusercontent.com/d/1sf07LUTovi6GdfalKy474iC8UQKIWJ9_",
    "https://lh3.googleusercontent.com/d/1_msMhhNigpnyqChcnV1-KNbtpcivVyDS",
    "https://lh3.googleusercontent.com/d/1QVpws9rNLEWold6sfbaJvUYavpOq3ekh",
    "https://lh3.googleusercontent.com/d/1dmC-ip5acBWFAfdDKXZLFOL7TC3akuGT",
    "https://lh3.googleusercontent.com/d/1wr_zg-qLavc-ehUU6vB5_14EIUvpRw9Y",
    "https://lh3.googleusercontent.com/d/1nvi3Tr280sfJSc3UQ8i5qVOUUQ-_LSjW",
    "https://lh3.googleusercontent.com/d/1iQf_cSBkc53jMEEJgWgZlhJmzNMovE1p",
    "https://lh3.googleusercontent.com/d/1q0rxU2mN8xs27BtjoKnRG2-fEx3q6UHD",
    "https://lh3.googleusercontent.com/d/1WRrBm1hTCaR81ZY8L075At55tDCrdGHC",
    "https://lh3.googleusercontent.com/d/1soXrR6EwvsrRB9_7SKOlc7NqWOR68vQ9",
  ];

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === galleryImages.length - 1 ? 0 : prev + 1,
    );
  };

  const prevImage = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCurrentImageIndex((prev) =>
      prev === 0 ? galleryImages.length - 1 : prev - 1,
    );
  };

  const scrollTo = (id: string, offset: number = 100) => {
    const el = document.getElementById(id);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  const handleMobileNavClick = (id: string) => {
    setIsMobileMenuOpen(false);
    setTimeout(() => {
      scrollTo(id, 100);
    }, 400); // Wait for AnimatePresence transition to finish
  };

  return (
    <div className="bg-white text-gray-900 w-full z-20 relative pt-20 pb-24">
      {/* Container */}
      <div className="max-w-7xl mx-auto px-6">
        {/* Title */}
        <motion.div {...fadeIn} className="text-center mb-10">
          <h2 className="text-4xl md:text-5xl font-black uppercase tracking-tight text-dark font-display">
            Levantamento do mandato
          </h2>
          <div className="w-24 h-1.5 bg-accent mx-auto mt-6 rounded-full"></div>
        </motion.div>

        {/* MENU DE NAVEGAÇÃO RÁPIDA */}
        <div className="sticky top-4 z-40 bg-white/95 backdrop-blur-md rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] border border-gray-100 p-2 mb-16 mx-auto w-full max-w-full">
          {/* Desktop Menu */}
          <div className="hidden md:flex justify-center flex-wrap gap-2">
            <button onClick={() => scrollTo('posicionamento')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Posicionamento</button>
            <button onClick={() => scrollTo('edital-animal')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Edital Animal</button>
            <button onClick={() => scrollTo('castracao')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Castração</button>
            <button onClick={() => scrollTo('codigo-animal')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Código Animal</button>
            <button onClick={() => scrollTo('hospitais')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Hospitais</button>
            <button onClick={() => scrollTo('legislativo')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Trabalho Legislativo</button>
            <button onClick={() => scrollTo('marcos')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Marcos</button>
            <button onClick={() => scrollTo('orelha')} className="whitespace-nowrap px-4 py-2 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-xs sm:text-sm font-bold text-gray-600 hover:shadow-sm transition-all focus:outline-none">Caso Orelha</button>
          </div>

          {/* Mobile Menu */}
          <div className="md:hidden flex flex-col">
            <button 
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} 
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-gray-50 text-dark font-bold focus:outline-none cursor-pointer"
            >
              <span className="flex items-center gap-2"><Menu className="w-5 h-5"/> Navegação Rápida</span>
              <ChevronDown className={`w-5 h-5 transition-transform ${isMobileMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            
            <AnimatePresence>
              {isMobileMenuOpen && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col gap-1 mt-2 overflow-hidden"
                >
                  <button onClick={() => handleMobileNavClick('posicionamento')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Posicionamento</button>
                  <button onClick={() => handleMobileNavClick('edital-animal')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Edital Animal</button>
                  <button onClick={() => handleMobileNavClick('castracao')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Castração</button>
                  <button onClick={() => handleMobileNavClick('codigo-animal')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Código Animal</button>
                  <button onClick={() => handleMobileNavClick('hospitais')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Hospitais</button>
                  <button onClick={() => handleMobileNavClick('legislativo')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Trabalho Legislativo</button>
                  <button onClick={() => handleMobileNavClick('marcos')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Marcos</button>
                  <button onClick={() => handleMobileNavClick('orelha')} className="text-left px-4 py-3 rounded-xl bg-gray-50 hover:bg-primary hover:text-white text-sm font-bold text-gray-600 focus:outline-none">Caso Orelha</button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* BIO: Trajetória e Compromisso */}
        <motion.div {...fadeIn} className="mb-24 flex flex-col items-center">
          <div className="bg-gradient-to-br from-dark to-secondary text-white p-8 md:p-12 rounded-[2rem] shadow-xl max-w-6xl mx-auto border border-blue-800 relative overflow-hidden flex flex-col lg:flex-row items-center gap-10">
            <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
              <img
                src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7"
                alt="Texture"
                className="w-full h-full object-cover"
              />
            </div>

            <div className="relative z-10 lg:w-3/5 lg:pr-6">
              <h3 className="text-2xl md:text-3xl font-black uppercase text-accent mb-2 tracking-wide font-display">
                Trajetória e Compromisso
              </h3>
              <h4 className="text-5xl md:text-7xl font-black uppercase tracking-tight font-display mb-8 drop-shadow-sm">
                Rafael Saraiva
              </h4>
              <div className="space-y-6 text-lg md:text-xl text-white/90 leading-relaxed font-medium">
                <p>
                  Deputado Estadual por São Paulo, advogado e um dos mais
                  expressivos ativistas na defesa e proteção dos animais no
                  Brasil. Eleito em 2022 com <strong>98.070 votos</strong>,
                  Rafael transformou seu mandato em uma trincheira contra os
                  maus-tratos.
                </p>
                <p>
                  Sua atuação é marcada pela criação de políticas públicas
                  inovadoras e pela defesa intransigente de uma convivência
                  justa entre pessoas e animais. Além da causa animal, Rafael
                  lidera pautas fundamentais de segurança, cidadania e bem-estar
                  social, sempre buscando fortalecer a legislação e ampliar a
                  conscientização sobre o respeito à vida em todas as suas
                  formas.
                </p>
              </div>
            </div>

            <div className="relative z-10 w-full md:w-3/4 lg:w-2/5">
              <div className="relative rounded-3xl overflow-hidden aspect-square shadow-2xl border-4 border-white/10 group">
                <div className="absolute inset-0 bg-blue-900/20 group-hover:bg-transparent transition-colors duration-500 z-10"></div>
                <img
                  src="https://lh3.googleusercontent.com/d/1_jNkZVR-6vfczpyAwbyU4LmH-n-6fdZh"
                  alt="Rafael Saraiva"
                  className="w-full h-full object-cover object-top transform group-hover:scale-105 transition-transform duration-700"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* 1. POSICIONAMENTO DO MANDATO */}
        <motion.div {...fadeIn} id="posicionamento" className="mb-24 max-w-4xl mx-auto text-center">
          <div className="bg-blue-50 p-8 md:p-12 rounded-[2rem] shadow-sm border border-blue-100">
            <Target className="w-12 h-12 text-primary mx-auto mb-6" />
            <h4 className="text-2xl font-black text-dark mb-6 uppercase tracking-wide">
              Posicionamento do Mandato
            </h4>
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium">
              Deputado da causa animal, Rafael Saraiva construiu um mandato que
              sente, escuta e age. Atua diretamente ao lado de ONGs e
              protetores, fortalecendo quem está na linha de frente por meio da
              destinação de recursos públicos, definidos com a participação da
              população.
            </p>
            <p className="text-lg md:text-xl text-gray-700 leading-relaxed font-medium mt-4 mb-8">
              Ao mesmo tempo, leva políticas públicas para todo o estado, como a
              maior e melhor campanha de castração de São Paulo, garantindo
              saúde e dignidade aos animais. No legislativo, transforma essa
              vivência em leis que combatem os maus-tratos e garantem direitos.
            </p>
            <div className="w-full rounded-2xl overflow-hidden shadow-lg border border-blue-100/50 relative">
              <img
                src="https://lh3.googleusercontent.com/d/1EK3eUfxay2ynqwU_ZMaf7fd8s1wKoGpZ"
                alt="Equipe do Mandato atuando"
                className="w-full h-auto block"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </motion.div>

        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-dark font-display inline-flex items-center gap-4">
            <HeartHandshake className="w-8 h-8 text-secondary" />
            Atuação Direta na Causa
          </h2>
        </div>

        {/* 2. EDITAL ANIMAL */}
        <motion.div
          {...fadeIn}
          id="edital-animal"
          className="mb-20 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          <div className="lg:col-span-5 order-2 lg:order-1 rounded-[2rem] overflow-hidden shadow-lg border border-blue-100/50">
            <img
              src="https://lh3.googleusercontent.com/d/1vZ0xElWX43g5sjjeNVu83Ht8WCQHK77Q"
              alt="Edital Animal em ação"
              className="w-full h-auto block"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col justify-center">
            <div>
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 text-secondary mb-6">
                <Vote className="w-7 h-7" />
              </div>
              <h4 className="text-3xl font-black text-dark mb-4 uppercase tracking-wide font-display">
                Edital Animal
              </h4>
              <p className="text-lg text-gray-700 leading-relaxed mb-8">
                Criação de um modelo inédito de destinação de emendas
                parlamentares, no qual a população do estado de São Paulo vota e
                decide quais ONGs receberão os recursos públicos, com base nos
                projetos apresentados.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 lg:gap-6 mt-2">
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-2xl lg:rounded-[2rem] text-center shadow-sm flex flex-col justify-center items-center">
                <p className="text-4xl lg:text-5xl font-black text-dark font-display mb-2">
                  3
                </p>
                <p className="text-xs lg:text-sm font-bold text-gray-600 uppercase tracking-widest leading-tight">
                  Edições
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 rounded-2xl lg:rounded-[2rem] text-center shadow-sm flex flex-col justify-center items-center">
                <p className="text-4xl lg:text-5xl font-black text-secondary font-display mb-2">
                  +250
                </p>
                <p className="text-xs lg:text-sm font-bold text-gray-600 uppercase tracking-widest leading-tight">
                  ONGs
                  <br />
                  Contempladas
                </p>
              </div>
              <div className="bg-gradient-to-br from-dark to-primary border border-transparent p-6 rounded-2xl lg:rounded-[2rem] text-center shadow-xl text-white flex flex-col justify-center items-center">
                <p className="text-4xl lg:text-5xl font-black text-accent font-display mb-2">
                  +40k
                </p>
                <p className="text-xs lg:text-sm font-bold text-white/90 uppercase tracking-widest leading-tight">
                  Animais
                  <br />
                  Impactados
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* 3. CAMPANHAS DE CASTRAÇÃO */}
        <motion.div
          {...fadeIn}
          id="castracao"
          className="mb-24 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center"
        >
          <div className="lg:col-span-7 order-1 flex flex-col justify-center">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-secondary/10 text-secondary mb-6">
              <Syringe className="w-7 h-7" />
            </div>
            <h4 className="text-3xl font-black text-dark mb-4 uppercase tracking-wide font-display">
              Campanhas de Castração
            </h4>
            <p className="text-lg text-gray-700 leading-relaxed mb-6">
              As campanhas de castração do mandato são estruturadas em três
              frentes complementares que ampliam o alcance e o impacto da
              política pública:
            </p>
            <ul className="space-y-4 text-gray-700 mb-8">
              <li className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                <p>
                  A frente realizada por meio das{" "}
                  <strong>emendas parlamentares</strong> do deputado, que
                  viabilizam diretamente os mutirões.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                <p>
                  A atuação através do{" "}
                  <strong>Instituto Eu Luto Pelos Animais (ELPA)</strong>, que
                  executa as ações com equipe técnica especializada e
                  proximidade com a causa.
                </p>
              </li>
              <li className="flex items-start gap-3">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0"></div>
                <p>
                  O programa estadual <strong>Pro Pet</strong>, que amplia a
                  escala das castrações em parceria com o Governo do Estado.
                </p>
              </li>
            </ul>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-dark to-secondary border border-transparent p-6 sm:p-8 rounded-2xl lg:rounded-[2rem] text-center shadow-lg text-white flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10">
                  <Syringe className="w-16 h-16" />
                </div>
                <p className="text-4xl lg:text-5xl font-black text-accent font-display mb-1">
                  +120 mil
                </p>
                <p className="text-sm font-medium text-white/90 leading-tight uppercase tracking-wide">
                  Castrações
                </p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-6 sm:p-8 rounded-2xl lg:rounded-[2rem] text-center shadow-sm flex flex-col justify-center">
                <p className="text-4xl lg:text-5xl font-black text-primary font-display mb-1">
                  +250
                </p>
                <p className="text-sm font-bold text-gray-600 uppercase tracking-widest leading-tight">
                  Municípios
                  <br />
                  Contemplados
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 order-2 rounded-[2rem] overflow-hidden shadow-lg border border-blue-100/50">
            <img
              src="https://lh3.googleusercontent.com/d/1kzvJabF6j7xuTcJqGcNUQwISDW3K0YFD"
              alt="Campanhas de Castração em ação"
              className="w-full h-auto block"
              referrerPolicy="no-referrer"
            />
          </div>
        </motion.div>

        {/* Two columns for Novo Código Animal & Hospitais */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-24 items-start">
          {/* 4. NOVO CÓDIGO ANIMAL */}
          <motion.div
            {...fadeIn}
            id="codigo-animal"
            className="bg-gray-50 rounded-[2rem] p-6 lg:p-10 border border-gray-100 flex flex-col shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
              <BookOpen className="w-6 h-6" />
            </div>
            <h4 className="text-2xl font-black text-dark mb-4 uppercase tracking-wide font-display">
              Novo Código Animal
            </h4>
            <p className="text-gray-700 leading-relaxed mb-8">
              Atualização da legislação estadual de proteção animal,
              modernizando o código de 2005 para refletir a importância atual
              dos animais na sociedade e garantir mais direitos, proteção e
              bem-estar. Construído com participação popular, o Novo Código
              Animal nasce da escuta ativa de quem vive a causa na prática.
            </p>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <h5 className="font-bold text-sm uppercase text-gray-500 mb-4 tracking-wider">
                Números
              </h5>
              <ul className="space-y-4">
                <li className="flex items-start gap-3 text-sm text-gray-800 font-medium">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                  <p>
                    <strong>12 audiências públicas realizadas</strong> (São
                    Paulo, Guaratinguetá, Limeira, Penápolis, Pereira Barreto,
                    Itapetininga, Brodowski, Barretos, Praia Grande, Presidente
                    Venceslau, Jales e Olímpia)
                  </p>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-800 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                  <p>
                    <strong>+4.400 sugestões</strong> da população
                  </p>
                </li>
                <li className="flex items-center gap-3 text-sm text-gray-800 font-medium">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0"></div>
                  <p>
                    <strong>90% dos municípios</strong> atuantes
                  </p>
                </li>
              </ul>

              <div className="mt-8">
                <Link
                  to="/codigoanimal"
                  className="w-full bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary text-white font-black py-4 px-6 rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/30 text-sm md:text-base uppercase tracking-wider group"
                >
                  <BookOpen className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  Minha cidade protege os animais?
                </Link>
              </div>
            </div>

            <div className="mt-auto grid grid-cols-2 gap-4 pt-8 items-start">
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group col-span-2"
                onClick={() => openLightbox(0)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    Ampliar imagem
                  </p>
                </div>
                <img
                  src={galleryImages[0]}
                  alt="Novo Código Animal - GIF"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(1)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs sm:text-sm font-medium bg-dark/50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[1]}
                  alt="Novo Código Animal - Foto 1"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(2)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs sm:text-sm font-medium bg-dark/50 px-2 sm:px-4 py-1.5 sm:py-2 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[2]}
                  alt="Novo Código Animal - Foto 2"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>

          {/* 5. HOSPITAIS PÚBLICOS VETERINÁRIOS */}
          <motion.div
            {...fadeIn}
            id="hospitais"
            className="bg-gray-50 rounded-[2rem] p-6 lg:p-10 border border-gray-100 flex flex-col shadow-sm"
          >
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-6">
              <Stethoscope className="w-6 h-6" />
            </div>
            <h4 className="text-2xl font-black text-dark mb-4 uppercase tracking-wide font-display">
              Hospitais Públicos Veterinários
            </h4>
            <p className="text-gray-700 leading-relaxed mb-8">
              Destinação de recursos para a construção de hospitais veterinários
              públicos em diversas regiões do estado de São Paulo, garantindo
              atendimento veterinário gratuito e acessível para a população que
              mais precisa.
            </p>

            <div className="bg-white p-6 rounded-t-2xl shadow-sm border border-gray-100 border-b-0">
              <h5 className="font-bold text-sm uppercase text-gray-500 mb-4 tracking-wider">
                Números
              </h5>
              <div className="grid grid-cols-2 gap-4 gap-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-800 col-span-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>
                  <p>
                    <strong>R$ 20,15 milhões</strong> destinados
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-800 col-span-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>
                  <p>
                    <strong>6 municípios</strong> contemplados
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-800 col-span-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>
                  <p>
                    <strong>1 hospital inaugurado</strong> - Guaratinguetá
                  </p>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-800 col-span-2">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>
                  <p>
                    <strong>1 em fase de conclusão</strong> - Itapevi
                  </p>
                </div>
                <div className="flex items-start gap-2 text-sm text-gray-800 col-span-2">
                  <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></div>
                  <p>
                    <strong>3 unidades em implantação</strong> - Itapetininga,
                    Itapecerica, Guarujá
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-5 rounded-b-2xl border border-blue-100">
              <h5 className="font-black text-xs uppercase text-dark mb-2 flex items-center gap-2">
                <Target className="w-4 h-4" /> Destaque Estratégico
              </h5>
              <p className="text-sm font-medium text-gray-700 leading-relaxed mb-4">
                O Hospital Público Veterinário da Zona Sul de São Paulo passou a
                funcionar 24 horas por dia, incluindo finais de semana e
                feriados, ampliando o acesso ao atendimento gratuito graças à
                atuação e luta do deputado.
              </p>

              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group w-full"
                onClick={() => openLightbox(3)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                    Ampliar imagem
                  </p>
                </div>
                <img
                  src={galleryImages[3]}
                  alt="Hospital Público Veterinário"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Section Title */}
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-dark font-display inline-flex items-center gap-4">
            <Scale className="w-8 h-8 text-secondary" />
            Trabalho Legislativo
          </h2>
        </div>

        {/* 6. TRABALHO LEGISLATIVO */}
        <motion.div
          {...fadeIn}
          id="legislativo"
          className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-24 items-start"
        >
          <div className="bg-white border-2 border-gray-100 hover:border-accent/40 rounded-3xl p-6 md:p-8 transition-colors flex flex-col">
            <div>
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full inline-block mb-4">
                Lei nº 18.389/2026
              </span>
            </div>
            <h4 className="text-2xl font-black text-dark mb-3 uppercase tracking-wide font-display">
              Lei do Caramelo
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-6">
              Reconhece o vira-lata caramelo como patrimônio imaterial do estado
              de São Paulo, valorizando os animais sem raça definida e
              promovendo políticas públicas de proteção, cuidado, adoção e
              conscientização.
            </p>
            <div
              className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group w-full"
              onClick={() => openLightbox(4)}
            >
              <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  Ampliar imagem
                </p>
              </div>
              <img
                src={galleryImages[4]}
                alt="Lei do Caramelo"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 hover:border-secondary/40 rounded-3xl p-6 md:p-8 transition-colors flex flex-col">
            <div>
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-blue-100 text-blue-800 rounded-full inline-block mb-4">
                Lei nº 18.184/2025
              </span>
            </div>
            <h4 className="text-2xl font-black text-dark mb-3 uppercase tracking-wide font-display">
              Lei das Correntes
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-4">
              Proíbe manter cães e gatos permanentemente acorrentados,
              estabelecendo regras que garantem bem-estar, liberdade e dignidade
              aos animais.
            </p>
            <div className="bg-blue-50 text-blue-900 border border-blue-100 p-4 rounded-xl text-sm font-medium mb-6">
              <strong>Observação estratégica:</strong> Após a sanção da lei,
              houve um aumento de 105% no número de prisões relacionadas a
              maus-tratos por acorrentamento, fortalecendo o combate à
              impunidade.
            </div>
            <div
              className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group w-full"
              onClick={() => openLightbox(5)}
            >
              <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  Ampliar imagem
                </p>
              </div>
              <img
                src={galleryImages[5]}
                alt="Lei das Correntes"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 hover:border-primary/40 rounded-3xl p-6 md:p-8 transition-colors flex flex-col">
            <div>
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full inline-block mb-4">
                Lei nº 17.972/2024
              </span>
            </div>
            <h4 className="text-2xl font-black text-dark mb-3 uppercase tracking-wide font-display">
              Lei dos Pet Shops
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-6">
              Regulamenta a comercialização de animais, proibindo a exposição em
              vitrines fechadas e garantindo condições adequadas de bem-estar,
              como idade mínima, vacinação, castração e acompanhamento
              veterinário.
            </p>

            <div className="columns-2 lg:columns-3 gap-3">
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group break-inside-avoid mb-3"
                onClick={() => openLightbox(6)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[6]}
                  alt="Lei dos Pet Shops - Foto 1"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group break-inside-avoid mb-3"
                onClick={() => openLightbox(7)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[7]}
                  alt="Lei dos Pet Shops - Foto 2"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group break-inside-avoid mb-3"
                onClick={() => openLightbox(8)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[8]}
                  alt="Lei dos Pet Shops - Foto 3"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>

          <div className="bg-white border-2 border-gray-100 hover:border-red-500/40 rounded-3xl p-6 md:p-8 transition-colors flex flex-col">
            <div>
              <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-red-100 text-red-800 rounded-full inline-block mb-4">
                Lei nº 18.441/2026
              </span>
            </div>
            <h4 className="text-2xl font-black text-dark mb-3 uppercase tracking-wide font-display">
              Lei Joca
            </h4>
            <p className="text-gray-700 leading-relaxed text-sm md:text-base mb-6">
              Lei criada para reforçar a proteção contra maus-tratos, ampliando
              mecanismos de responsabilização e garantindo mais segurança e
              dignidade aos animais vítimas de violência.
            </p>
            <div
              className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group w-full"
              onClick={() => openLightbox(9)}
            >
              <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  Ampliar imagem
                </p>
              </div>
              <img
                src={galleryImages[9]}
                alt="Lei Joca"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>
          </div>
        </motion.div>

        {/* 7 & 8 Mixed Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
          {/* GRANDES MARCOS (Span 2) */}
          <motion.div {...fadeIn} id="marcos" className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-8">
              <Trophy className="w-8 h-8 text-secondary" />
              <h2 className="text-3xl font-black uppercase tracking-tight text-dark font-display">
                Grandes Marcos
              </h2>
            </div>

            <div className="space-y-6">
              <div className="bg-gray-50 rounded-3xl p-6 md:p-8 border border-gray-100">
                <h4 className="text-xl font-bold text-dark mb-3 uppercase tracking-wide flex items-center gap-2">
                  <Dog className="w-5 h-5 text-accent" /> Resgates e Adoções
                </h4>
                <p className="text-gray-700 mb-6 text-sm md:text-base">
                  Atuação direta no resgate de animais em situação de
                  maus-tratos, abandono e risco, garantindo cuidado, recuperação
                  e encaminhamento para novos lares.
                </p>

                <div
                  className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group mb-6 w-full"
                  onClick={() => openLightbox(10)}
                >
                  <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                    <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                      Ampliar imagem
                    </p>
                  </div>
                  <img
                    src={galleryImages[10]}
                    alt="Resgates e Adoções"
                    className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                    referrerPolicy="no-referrer"
                  />
                </div>

                <div className="flex flex-wrap gap-4">
                  <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 font-bold text-secondary flex items-center gap-2">
                    <span className="text-xl font-black">+1.000</span> animais
                    resgatados
                  </div>
                  <div className="bg-white px-5 py-3 rounded-xl shadow-sm border border-gray-100 font-bold text-primary flex items-center gap-2">
                    <span className="text-xl font-black">800</span> adoções
                    realizadas
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ATUAÇÃO INSTITUCIONAL E SOCIAL (Span 1) */}
          <motion.div {...fadeIn} className="lg:col-span-1">
            <div className="flex items-center gap-3 mb-8">
              <Building2 className="w-8 h-8 text-secondary" />
              <h2 className="text-2xl font-black uppercase tracking-tight text-dark font-display leading-tight">
                Atuação
                <br />
                Institucional
              </h2>
            </div>

            <div className="bg-dark text-white rounded-3xl p-6 md:p-8 overflow-hidden relative">
              {/* Texture in background */}
              <div className="absolute inset-0 opacity-10 pointer-events-none mix-blend-overlay">
                <img
                  src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7"
                  alt="Texture"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="relative z-10">
                <h4 className="text-lg font-bold text-accent mb-4 uppercase tracking-wide">
                  Presidente da Comissão de Habitação
                </h4>
                <p className="text-white/80 leading-relaxed text-sm mb-6">
                  À frente da Comissão de Habitação, o mandato atuou na
                  articulação, com a maior destinação de recursos e
                  acompanhamento de projetos habitacionais, garantindo moradia
                  digna para famílias em situação de vulnerabilidade.
                </p>

                <div className="bg-white/10 border border-white/20 p-5 rounded-2xl mb-8 shadow-xl backdrop-blur-sm text-center transform hover:scale-105 transition-transform duration-300">
                  <p className="text-3xl md:text-4xl font-black text-accent font-display leading-tight mb-1">
                    +250.000
                  </p>
                  <p className="text-sm font-bold text-white uppercase tracking-widest">
                    Moradias Entregues
                  </p>
                </div>

                <h5 className="text-xs uppercase tracking-widest text-white/50 mb-4 font-bold border-b border-white/10 pb-2">
                  Cargos e Participações
                </h5>
                <ul className="space-y-4 text-sm font-medium">
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                    <p>Presidente da Comissão de Habitação</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                    <p>Vice-presidente da Comissão de Meio Ambiente</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                    <p>Membro da Comissão de Constituição, Justiça e Redação</p>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0"></div>
                    <p>Membro do Conselho de Ética</p>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>

        {/* CASO ORELHA E ATUAÇÃO EM DESASTRES (CENTRALIZADOS E ALINHADOS À ESQUERDA) */}
        <div className="max-w-4xl mx-auto space-y-6 mt-8">
          <motion.div
            {...fadeIn}
            id="orelha"
            className="bg-gray-50 rounded-3xl p-6 md:p-8 border border-gray-100 flex flex-col"
          >
            <h4 className="text-xl font-bold text-dark mb-3 uppercase tracking-wide flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" /> Caso
              Orelha – Mobilização por Justiça
            </h4>
            <p className="text-gray-700 mb-4 text-sm md:text-base">
              Atuação firme na cobrança por justiça em um dos casos de
              maus-tratos mais emblemáticos, mobilizando a população e
              pressionando por respostas.
            </p>
            <ul className="text-sm text-gray-700 font-medium space-y-2 mb-6">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-dark shrink-0"></div>
                <span>
                  Presença em mais de 3 manifestações na Avenida Paulista
                </span>
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-dark shrink-0"></div>
                <span>
                  Organização de manifestação em SC, reunindo mais de 500
                  pessoas
                </span>
              </li>
            </ul>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(11)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[11]}
                  alt="Caso Orelha 1"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(12)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[12]}
                  alt="Caso Orelha 2"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(13)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[13]}
                  alt="Caso Orelha 3"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div
                className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group"
                onClick={() => openLightbox(14)}
              >
                <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                  <p className="text-white text-xs font-medium bg-dark/50 px-2 py-1 rounded-full backdrop-blur-sm">
                    Ampliar
                  </p>
                </div>
                <img
                  src={galleryImages[14]}
                  alt="Caso Orelha 4"
                  className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            {...fadeIn}
            className="bg-gray-50 rounded-3xl p-6 md:p-8 border border-gray-100"
          >
            <h4 className="text-xl font-bold text-dark mb-3 uppercase tracking-wide flex items-center gap-2">
              <HeartHandshake className="w-5 h-5 text-secondary" /> Atuação em
              Desastres
            </h4>
            <p className="text-gray-700 mb-6 text-sm md:text-base">
              Resposta emergencial em situações de crise, com atuação directa no
              resgate e apoio a animais afetados por desastres naturais.
            </p>

            <div
              className="rounded-xl overflow-hidden shadow-sm border border-gray-200 cursor-pointer relative group mb-6 w-full"
              onClick={() => openLightbox(15)}
            >
              <div className="absolute inset-0 bg-dark/20 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center justify-center">
                <p className="text-white text-sm font-medium bg-dark/50 px-4 py-2 rounded-full backdrop-blur-sm">
                  Ampliar imagem
                </p>
              </div>
              <img
                src={galleryImages[15]}
                alt="Atuação em Desastres"
                className="w-full h-auto block transition-transform duration-500 group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            </div>

            <div className="flex flex-wrap gap-2 font-bold text-xs uppercase tracking-wider text-gray-500">
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
                Rio Grande do Sul
              </span>
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
                São Sebastião (SP)
              </span>
              <span className="bg-white border border-gray-200 px-3 py-1.5 rounded-lg">
                Peruíbe (SP)
              </span>
            </div>
          </motion.div>
        </div>
      </div>

      <AnimatePresence>
        {lightboxOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm p-4"
            onClick={closeLightbox}
          >
            <button
              className="absolute top-4 right-4 md:top-8 md:right-8 p-2 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-50"
              onClick={closeLightbox}
            >
              <X className="w-8 h-8" />
            </button>
            <div
              className="relative w-full max-w-5xl aspect-video flex items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="absolute left-2 md:-left-16 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-50 flex"
                onClick={prevImage}
              >
                <ChevronLeft className="w-8 h-8" />
              </button>

              <img
                key={currentImageIndex}
                src={galleryImages[currentImageIndex]}
                alt={`Ampliada ${currentImageIndex + 1}`}
                className="max-w-full max-h-[85vh] object-contain rounded-lg lg:rounded-2xl shadow-2xl"
              />

              <button
                className="absolute right-2 md:-right-16 p-3 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full transition-colors z-50 flex"
                onClick={nextImage}
              >
                <ChevronRight className="w-8 h-8" />
              </button>
            </div>

            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
              {galleryImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => {
                    e.stopPropagation();
                    setCurrentImageIndex(idx);
                  }}
                  className={`w-2.5 h-2.5 rounded-full transition-all ${
                    idx === currentImageIndex
                      ? "bg-white scale-125"
                      : "bg-white/30 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
