import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, X } from 'lucide-react';

export const initializeTracking = () => {
  // Initialize Google Analytics
  const gtagScript = document.createElement('script');
  gtagScript.async = true;
  gtagScript.src = 'https://www.googletagmanager.com/gtag/js?id=G-TDZLDEB5ZG';
  document.head.appendChild(gtagScript);

  window.dataLayer = window.dataLayer || [];
  function gtag(...args: any[]){window.dataLayer.push(arguments);}
  // @ts-ignore
  window.gtag = gtag;
  // @ts-ignore
  window.gtag('js', new Date());
  // @ts-ignore
  window.gtag('config', 'G-TDZLDEB5ZG');

  // Initialize Meta Pixel
  ;(function(f: any,b: any,e: any,v: any,n?: any,t?: any,s?: any)
  // @ts-ignore
  {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
  // @ts-ignore
  n.callMethod.apply(n,arguments):n.queue.push(arguments)};
  // @ts-ignore
  if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
  // @ts-ignore
  n.queue=[];t=b.createElement(e);t.async=!0;
  // @ts-ignore
  t.src=v;s=b.getElementsByTagName(e)[0];
  // @ts-ignore
  s.parentNode.insertBefore(t,s)})(window, document,'script',
  'https://connect.facebook.net/en_US/fbevents.js');
  // @ts-ignore
  if (window.fbq) {
    // @ts-ignore
    window.fbq('init', '909578061696893');
    // @ts-ignore
    window.fbq('track', 'PageView');
  }
};

export const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted') {
      initializeTracking();
    } else if (consent === null) {
      // Small delay before showing banner for better UX
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('cookieConsent', 'accepted');
    setIsVisible(false);
    initializeTracking();
  };

  const handleDecline = () => {
    localStorage.setItem('cookieConsent', 'declined');
    setIsVisible(false);
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ y: 150, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 150, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-0 left-0 right-0 z-[100] p-4 pointer-events-none"
        >
          <div className="mx-auto max-w-4xl bg-white rounded-2xl shadow-2xl p-5 md:p-6 border border-gray-100 flex flex-col md:flex-row items-center gap-4 md:gap-6 pointer-events-auto relative overflow-hidden">
            {/* Edge accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl"></div>
            
            <div className="flex-shrink-0 bg-blue-50 p-3 rounded-full hidden md:block">
              <ShieldAlert className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="flex-1 flex flex-col gap-2">
              <h4 className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                <ShieldAlert className="w-5 h-5 text-blue-600 md:hidden" />
                Sua privacidade é importante
              </h4>
              <p className="text-sm text-gray-600 leading-relaxed">
                Utilizamos cookies e tecnologias similares para melhorar sua experiência, analisar o tráfego do site e direcionar campanhas. Ao continuar navegando, você concorda com o uso destas tecnologias em conformidade com a <a href="https://rafaelsaraivasp.com.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">LGPD e nossa Política de Privacidade</a>.
              </p>
            </div>
            
            <div className="flex flex-row md:flex-col lg:flex-row w-full md:w-auto gap-3 shrink-0">
              <button
                onClick={handleDecline}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Recusar
              </button>
              <button
                onClick={handleAccept}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-transform active:scale-95 shadow-lg shadow-blue-200 text-sm"
              >
                <Check className="w-4 h-4" />
                Aceitar Cookies
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
