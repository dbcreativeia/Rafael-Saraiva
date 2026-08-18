import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Helmet } from 'react-helmet-async';
import { Gamepad2, BookOpen } from 'lucide-react';

import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './constants';
import { MandatoInfo } from './components/MandatoInfo';
import { CookieConsent } from './components/CookieConsent';
import { Footer } from './components/Footer';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { CodigoAnimal } from './components/CodigoAnimal';
import { AdminDashboard } from './components/AdminDashboard';
import { ContraMausTratos } from './components/ContraMausTratos';
import { MaterialCampanha } from './components/MaterialCampanha';
import { NinaPassadore } from './components/NinaPassadore';
import { Jogo } from './components/Jogo';

import { FloatingWhatsApp } from './components/FloatingWhatsApp';
import { Navbar } from './components/Navbar';
import { trackEvent, generateEventId, sendCAPIEvent } from './analytics';

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) {
      setTimeout(() => {
        const element = document.getElementById(hash.replace('#', ''));
        if (element) {
          const y = element.getBoundingClientRect().top + window.scrollY - 112; // 112px offset for the fixed navbar (h-28)
          window.scrollTo({ top: y, behavior: 'smooth' });
        }
      }, 100);
    } else {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  return null;
}

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    gtag: any;
    dataLayer: any[];
  }
}

function LandingPage() {
  const location = useLocation();

  useEffect(() => {
    trackEvent('PageView_Home');
  }, []);

  if (location.hash === '#admin') {
    return <AdminDashboard />;
  }

  const handleInstagramClick = () => {
    trackEvent('Click_Instagram');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_instagram', { event_category: 'engagement', event_label: 'Instagram Button' });
    }
  };

  const handleFacebookClick = () => {
    trackEvent('Click_Facebook');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_facebook', { event_category: 'engagement', event_label: 'Facebook Button' });
    }
  };

  return (
    <>
      <Helmet>
        <title>Deputado Rafael Saraiva 44077 | Defesa da Causa Animal em SP</title>
        <meta name="title" content="Deputado Rafael Saraiva 44077 | Defesa da Causa Animal em SP" />
        <meta name="description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva 44077 e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e projetos." />
        <meta name="keywords" content="Rafael Saraiva 44077, Rafael Saraiva, Deputado Estadual SP, Causa Animal, Proteção Animal, Política São Paulo, Animais, São Paulo" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/" />
        <meta property="og:title" content="Deputado Rafael Saraiva 44077 | Defesa da Causa Animal em SP" />
        <meta property="og:description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva 44077 e suas ações em defesa da causa animal em todo o estado de São Paulo." />
        <meta property="og:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/" />
        <meta property="twitter:title" content="Deputado Rafael Saraiva 44077 | Defesa da Causa Animal em SP" />
        <meta property="twitter:description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva 44077 e suas ações em defesa da causa animal em todo o estado de São Paulo." />
        <meta property="twitter:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
      </Helmet>
    <main className="overflow-x-hidden flex flex-col bg-gray-50 text-gray-900 w-full relative">
      <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-primary relative overflow-hidden flex flex-col selection:bg-accent selection:text-dark">
      {/* Standard Campaign Texture */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden mix-blend-overlay">
        <img 
          src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
          alt="Texture" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Subtle Glow Behind Text */}
      <div className="absolute top-0 left-0 w-full md:w-1/2 h-full bg-gradient-to-r from-dark/50 to-transparent pointer-events-none z-0" />

      <div className="flex-1 flex flex-col relative z-10 max-w-7xl mx-auto px-6 w-full h-full">
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between h-full pt-28 pb-16 lg:pt-40 lg:pb-24 xl:pt-48 xl:pb-32">
          
          {/* Content Area */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start z-30 w-full md:w-[80%] lg:w-[55%] xl:w-1/2 mt-4 lg:mt-0 lg:pl-8 xl:pl-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8 md:mb-10 lg:mb-16 xl:mb-20 inline-block"
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1T7IJ8z_2QvLKXA3nRsEt30B71oidsOQL" 
                alt="Logo Rafael Saraiva" 
                className="h-44 sm:h-48 md:h-52 lg:h-[22rem] xl:h-[26rem] 2xl:h-[28rem] w-auto drop-shadow-xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            {/* FOTO MOBILE NA PRIMEIRA DOBRA */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="lg:hidden w-full flex justify-center items-end h-[40vh] sm:h-[45vh] relative z-10 pointer-events-none -mb-8 sm:-mb-10"
            >
              <div className="absolute bottom-0 w-[80%] h-[80%] bg-primary/40 blur-[60px] rounded-full mix-blend-screen pointer-events-none"></div>
              <img 
                src="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" 
                alt="Deputado Rafael Saraiva" 
                className="h-full w-auto object-contain object-bottom relative z-10"
                style={{ 
                  WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 15%)', 
                  maskImage: 'linear-gradient(to top, transparent 0%, black 15%)' 
                }}
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
              className="flex flex-col gap-6 md:gap-8 w-full max-w-md lg:max-w-lg relative z-20"
            >
              
              {/* Botão Material Campanha */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <Link
                  to="/material"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="relative w-full bg-gradient-to-r from-orange-500 to-red-600 text-white font-black py-4 md:py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform hover:-translate-y-1 shadow-xl border border-white/20 text-center"
                >
                  <div className="flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
                    <span>Quero receber o material de campanha!</span>
                  </div>
                </Link>
              </div>

              {/* Botão Jogo */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <Link
                  to="/jogo"
                  onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                  className="relative w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-black py-4 md:py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform hover:-translate-y-1 shadow-xl border border-white/20 text-center"
                >
                  <div className="flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
                    <Gamepad2 className="w-6 h-6 md:w-7 md:h-7" />
                    <span>Jogue Agora - Missão Resgate Animal</span>
                  </div>
                </Link>
              </div>

              {/* Botão Secundário: Minha cidade protege os animais? */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <Link
                  to="/codigoanimal"
                  className="relative w-full bg-gradient-to-r from-primary to-secondary text-white font-black py-4 md:py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform hover:-translate-y-1 shadow-xl border border-white/20 text-center"
                >
                  <div className="flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
                    <BookOpen className="w-6 h-6 md:w-7 md:h-7" />
                    <span>Minha cidade protege os animais?</span>
                  </div>
                </Link>
              </div>
            </motion.div>
          </div>

          {/* Rafael Photo (Desktop) */}
          <motion.div 
            initial={{ x: 50, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="hidden lg:flex lg:absolute lg:bottom-0 lg:right-0 z-10 lg:w-[48%] xl:w-[55%] lg:h-[95vh] justify-end items-end pointer-events-none"
          >
            {/* Glow behind photo */}
            <div className="absolute bottom-0 w-[60%] h-[60%] bg-primary/40 blur-[120px] rounded-full mix-blend-screen pointer-events-none"></div>
            
            <img 
              src="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" 
              alt="Rafael Saraiva" 
              className="h-full w-auto object-contain object-right-bottom relative z-10"
              style={{ 
                WebkitMaskImage: 'linear-gradient(to top, transparent 0%, black 5%)', 
                maskImage: 'linear-gradient(to top, transparent 0%, black 5%)' 
              }}
              referrerPolicy="no-referrer"
            />
          </motion.div>
        </div>
      </div>
      
      {/* Curved divider to smoothly transition to next section */}
      <div className="absolute bottom-[-1px] left-0 w-full overflow-hidden leading-[0] z-10 pointer-events-none">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1440 80" preserveAspectRatio="none" className="relative block w-full h-[30px] md:h-[40px] lg:h-[50px]">
          <path d="M0,80 C720,0 1440,80 1440,80 Z" className="fill-gray-50"></path>
        </svg>
      </div>
    </div>
    <MandatoInfo />
    <Footer />
    </main>
    </>
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CookieConsent />
      <Navbar />
      <FloatingWhatsApp />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/codigoanimal" element={<CodigoAnimal />} />
        <Route path="/contramaustratos" element={<ContraMausTratos />} />
        <Route path="/material" element={<MaterialCampanha />} />
        <Route path="/ninapassadore" element={<NinaPassadore />} />
        <Route path="/jogo" element={<Jogo />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
