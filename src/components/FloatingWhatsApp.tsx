import React from 'react';
import { MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { WHATSAPP_NUMBER, WHATSAPP_MESSAGE } from '../constants';
import { trackEvent } from '../analytics';

export function FloatingWhatsApp() {
  const location = useLocation();

  if (location.pathname === '/jogo' || location.pathname === '/admin' || location.hash === '#admin') {
    return null;
  }

  const handleWhatsAppClick = () => {
    trackEvent('Contact');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_whatsapp', { event_category: 'engagement', event_label: 'Floating WhatsApp' });
    }
    
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(WHATSAPP_MESSAGE)}`;
    window.open(url, '_blank');
  };

  return (
    <button
      onClick={handleWhatsAppClick}
      className="fixed bottom-6 right-6 z-50 bg-[#25D366] hover:bg-[#20bd5a] text-white p-4 rounded-full shadow-2xl transition-transform hover:scale-110 flex items-center justify-center group"
      aria-label="Falar no WhatsApp"
    >
      <MessageCircle className="w-8 h-8 fill-current" />
      <span className="absolute right-full mr-4 bg-white text-gray-900 text-sm font-bold px-3 py-1 rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        Fale conosco!
      </span>
    </button>
  );
}
