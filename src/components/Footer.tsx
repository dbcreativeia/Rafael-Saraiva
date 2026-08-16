import React from 'react';
import { Link } from 'react-router-dom';
import { Instagram, Facebook, PawPrint } from 'lucide-react';
import { trackEvent, generateEventId, sendCAPIEvent } from '../analytics';

export const Footer: React.FC = () => {
  const handleInstagramClick = () => {
    trackEvent('Click_Instagram');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_instagram', { event_category: 'engagement', event_label: 'Instagram Footer' });
    }
  };

  const handleFacebookClick = () => {
    trackEvent('Click_Facebook');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_facebook', { event_category: 'engagement', event_label: 'Facebook Footer' });
    }
  };

  const handleElpaClick = () => {
    const eventId = generateEventId();
    if (typeof window !== 'undefined') {
      if (window.fbq) window.fbq('trackCustom', 'Click_InstitutoELPA', {}, { eventID: eventId });
      if (window.gtag) window.gtag('event', 'click_instituto_elpa', { event_category: 'engagement', event_label: 'Instituto ELPA Footer' });
    }
    sendCAPIEvent('Click_InstitutoELPA', eventId);
  };

  return (
    <footer className="bg-dark text-white py-12 border-t border-white/10 relative z-20">
      <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-12 md:gap-8">
        
        <div className="flex flex-col items-center md:items-start gap-6 order-2 md:order-1 max-w-sm text-center md:text-left">
          <img 
            src="https://lh3.googleusercontent.com/d/1zDGUKo-qyJF4gNW-oT7vJtATZ-zaw4aO" 
            alt="Logo" 
            className="h-16 md:h-20 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
          <div className="flex flex-col items-center md:items-start gap-3">
            <p className="text-white/60 text-sm font-medium">
              &copy; 2026 Deputado Rafael Saraiva
            </p>
            <p className="text-white/40 text-[10px] uppercase tracking-wider leading-relaxed">
              PROPAGANDA ELEITORAL - CNPJ DO CANDIDATO: Eleicao 2026 Rafael Saraiva Gaia Deputado Estadual 68.237.505/0001-08
            </p>
            <Link to="/politica-de-privacidade" className="text-white/60 hover:text-white transition-colors text-sm font-medium mt-1">
              Política de Privacidade
            </Link>
          </div>
        </div>

        <div className="flex flex-col items-center md:items-end gap-6 order-1 md:order-2 w-full md:w-auto">
          <div className="flex items-center gap-4">
            <div className="h-px bg-white/20 w-12 md:hidden"></div>
            <span className="text-xs md:text-sm font-bold text-white/60 uppercase tracking-widest text-center">
              Siga nas redes sociais
            </span>
            <div className="h-px bg-white/20 w-12 md:hidden"></div>
          </div>
          
          <div className="flex gap-4">
            <a 
               href="https://instagram.com/rafaelsaraivasp" 
               target="_blank" 
               rel="noopener noreferrer"
              onClick={handleInstagramClick}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm md:text-base uppercase tracking-wider group"
            >
              <Instagram size={18} className="text-[#ee2a7b] group-hover:scale-110 transition-transform md:w-5 md:h-5" /> Instagram
            </a>
            <a 
               href="https://facebook.com/rafaelsaraivasp" 
               target="_blank" 
               rel="noopener noreferrer"
              onClick={handleFacebookClick}
              className="bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/10 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-all hover:-translate-y-1 text-sm md:text-base uppercase tracking-wider group"
            >
              <Facebook size={18} className="text-[#1877F2] group-hover:scale-110 transition-transform md:w-5 md:h-5" /> Facebook
            </a>
          </div>

          <a
            href="https://www.ielpa.org/"
            target="_blank"
            rel="noopener noreferrer"
            onClick={handleElpaClick}
            className="w-full bg-accent hover:bg-yellow-400 text-dark font-black py-3 px-6 rounded-xl flex items-center justify-center gap-2 transition-all transform hover:-translate-y-1 shadow-xl border border-white/20"
          >
            <PawPrint className="w-5 h-5" strokeWidth={2.5} />
            Conheça o Instituto ELPA
          </a>
        </div>

      </div>
    </footer>
  );
};
