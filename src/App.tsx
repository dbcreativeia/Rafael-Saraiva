import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Phone, Instagram, Facebook, MessageCircle, PawPrint, Heart, BookOpen } from 'lucide-react';

import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from './constants';
import { MandatoInfo } from './components/MandatoInfo';
import { CookieConsent } from './components/CookieConsent';
import { Footer } from './components/Footer';
import { PrivacyPolicy } from './components/PrivacyPolicy';
import { CodigoAnimal } from './components/CodigoAnimal';
import { AdminDashboard } from './components/AdminDashboard';
import { ContraMausTratos } from './components/ContraMausTratos';

import { trackEvent, generateEventId, sendCAPIEvent } from './analytics';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

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

  if (location.hash === '#admin') {
    return <AdminDashboard />;
  }

  const handleWhatsAppClick = () => {
    trackEvent('Contact');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_whatsapp', { event_category: 'engagement', event_label: 'WhatsApp Button' });
    }
    
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
  };

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

  const handleElpaClick = () => {
    const eventId = generateEventId();
    if (typeof window !== 'undefined') {
      if (window.fbq) window.fbq('trackCustom', 'Click_InstitutoELPA', {}, { eventID: eventId });
      if (window.gtag) window.gtag('event', 'click_instituto_elpa', { event_category: 'engagement', event_label: 'Instituto ELPA Button' });
    }
    sendCAPIEvent('Click_InstitutoELPA', eventId);
  };

  return (
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
        <div className="flex-1 flex flex-col lg:flex-row items-center justify-center lg:justify-between h-full pt-12 pb-16 lg:pt-16 lg:pb-24 xl:pb-32">
          
          {/* Content Area */}
          <div className="text-center lg:text-left flex flex-col items-center lg:items-start z-30 w-full md:w-[80%] lg:w-[55%] xl:w-1/2 mt-4 lg:mt-0 lg:pl-8 xl:pl-12">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="mb-8 md:mb-10 lg:mb-12 inline-block"
            >
              <img 
                src="https://lh3.googleusercontent.com/d/1M6hf4eQkOkt7qiVd6RqR_akBOzSKs2Qd" 
                alt="Logo Rafael Saraiva" 
                className="h-24 sm:h-28 md:h-32 lg:h-40 xl:h-48 w-auto drop-shadow-xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
              className="bg-dark/20 backdrop-blur-sm border border-white/10 rounded-2xl p-4 md:p-6 mb-6 md:mb-12 max-w-md md:max-w-lg lg:max-w-xl relative shadow-lg"
            >
              <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-2/3 bg-accent rounded-r-md"></div>
              <p className="text-white text-base sm:text-lg md:text-xl lg:text-2xl font-medium leading-relaxed font-sans pl-3 text-left">
                Acompanhe nosso mandato e as ações em <strong className="text-accent font-bold">defesa da causa animal em todo o estado de São Paulo</strong>.
              </p>
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
              {/* Botão Destaque: Minha cidade protege os animais? */}
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-50 group-hover:opacity-70 transition duration-500"></div>
                <Link
                  to="/codigoanimal"
                  className="relative w-full bg-gradient-to-r from-primary to-secondary text-white font-black py-6 md:py-8 px-6 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-2xl text-xl md:text-2xl uppercase tracking-wider border border-white/20 text-center leading-tight"
                >
                  <BookOpen className="w-10 h-10 md:w-12 md:h-12 text-white mb-1 drop-shadow-md" />
                  <span>Minha cidade protege os animais?</span>
                  <span className="text-sm md:text-base font-bold text-white/90 normal-case tracking-normal drop-shadow-sm mt-1">
                    Descubra agora e faça a diferença
                  </span>
                </Link>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-[#25D366] to-[#128C7E] rounded-2xl blur opacity-40 group-hover:opacity-60 transition duration-500"></div>
                <button
                  onClick={handleWhatsAppClick}
                  className="relative w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-black py-4 md:py-5 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all transform hover:-translate-y-1 shadow-xl text-lg md:text-xl uppercase tracking-wider border border-white/20"
                >
                  <MessageCircle className="w-6 h-6 md:w-7 md:h-7 fill-current" />
                  Fale no WhatsApp
                </button>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-accent to-yellow-400 rounded-2xl blur opacity-50 group-hover:opacity-70 transition duration-500"></div>
                <a
                  href="https://www.ielpa.org/"
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={handleElpaClick}
                  className="relative w-full bg-accent hover:bg-yellow-400 text-dark font-black py-4 md:py-5 px-6 rounded-2xl flex flex-col items-center justify-center gap-1 transition-all transform hover:-translate-y-1 shadow-xl border border-white/20"
                >
                  <div className="flex items-center gap-3 text-lg md:text-xl uppercase tracking-wider">
                    <PawPrint className="w-6 h-6 md:w-7 md:h-7" strokeWidth={2.5} />
                    Conheça o Instituto ELPA
                  </div>
                </a>
              </div>

              <div className="flex flex-col gap-4 md:gap-5">
                <div className="flex items-center gap-4">
                  <div className="h-px bg-white/20 flex-1"></div>
                  <span className="text-xs md:text-sm font-bold text-white/60 uppercase tracking-widest text-center">
                    Siga nas redes sociais
                  </span>
                  <div className="h-px bg-white/20 flex-1"></div>
                </div>
                
                <div className="flex gap-4">
                  <a 
                    href="https://instagram.com/rafaelsaraivasp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={handleInstagramClick}
                    className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold py-3 md:py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm md:text-base uppercase tracking-wider group"
                  >
                    <Instagram size={18} className="text-[#ee2a7b] group-hover:scale-110 transition-transform md:w-5 md:h-5" /> Instagram
                  </a>
                  <a 
                    href="https://facebook.com/rafaelsaraivasp" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    onClick={handleFacebookClick}
                    className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold py-3 md:py-4 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm md:text-base uppercase tracking-wider group"
                  >
                    <Facebook size={18} className="text-[#1877F2] group-hover:scale-110 transition-transform md:w-5 md:h-5" /> Facebook
                  </a>
                </div>
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
  );
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <CookieConsent />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/codigoanimal" element={<CodigoAnimal />} />
        <Route path="/contramaustratos" element={<ContraMausTratos />} />
        <Route path="/politica-de-privacidade" element={<PrivacyPolicy />} />
        <Route path="*" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
