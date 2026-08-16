import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Check, X, Settings, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

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
  const [showPreferences, setShowPreferences] = useState(false);
  
  const [prefs, setPrefs] = useState({
    necessary: true,
    analytics: false,
    marketing: false
  });

  useEffect(() => {
    const consent = localStorage.getItem('cookieConsent');
    if (consent === 'accepted' || consent === 'custom') {
      const storedPrefs = localStorage.getItem('cookiePrefs');
      if (storedPrefs) {
        const parsed = JSON.parse(storedPrefs);
        if (parsed.analytics || parsed.marketing) {
          initializeTracking();
        }
      } else {
        initializeTracking();
      }
    } else if (consent === null) {
      const timer = setTimeout(() => setIsVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcceptAll = () => {
    const allOn = { necessary: true, analytics: false, marketing: false };
    localStorage.setItem('cookieConsent', 'accepted');
    localStorage.setItem('cookiePrefs', JSON.stringify(allOn));
    setIsVisible(false);
    initializeTracking();
  };

  const handleRejectAll = () => {
    const allOff = { necessary: true, analytics: false, marketing: false };
    localStorage.setItem('cookieConsent', 'declined');
    localStorage.setItem('cookiePrefs', JSON.stringify(allOff));
    setIsVisible(false);
  };

  const handleSavePreferences = () => {
    localStorage.setItem('cookieConsent', 'custom');
    localStorage.setItem('cookiePrefs', JSON.stringify(prefs));
    setIsVisible(false);
    if (prefs.analytics || prefs.marketing) {
      initializeTracking();
    }
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
          <div className="mx-auto max-w-5xl bg-white rounded-2xl shadow-2xl p-5 md:p-6 border border-gray-100 flex flex-col pointer-events-auto relative overflow-hidden">
            {/* Edge accent */}
            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-blue-600 rounded-l-2xl"></div>
            
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
              <div className="flex-shrink-0 bg-blue-50 p-3 rounded-full hidden md:block">
                <ShieldAlert className="w-6 h-6 text-blue-600" />
              </div>
              
              <div className="flex-1 flex flex-col gap-2">
                <h4 className="flex items-center gap-2 font-bold text-gray-900 text-lg">
                  <ShieldAlert className="w-5 h-5 text-blue-600 md:hidden" />
                  Sua privacidade é importante
                </h4>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Utilizamos cookies essenciais para o funcionamento do site e cookies não essenciais para medir audiência e direcionar campanhas. Ao clicar em "Aceitar", você concorda com o uso de todos os cookies em conformidade com a nossa <Link to="/politica-de-privacidade" className="text-blue-600 hover:underline font-semibold">Política de Privacidade e Proteção de Dados (LGPD)</Link>.
                </p>
              </div>
              
              <div className="flex flex-col gap-2 w-full md:w-auto shrink-0">
                <button
                  onClick={handleAcceptAll}
                  className="flex items-center justify-center gap-1.5 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-transform active:scale-95 shadow-lg shadow-blue-200 text-sm"
                >
                  <Check className="w-4 h-4" />
                  Aceitar todos
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={handleRejectAll}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 font-semibold transition-colors text-xs"
                  >
                    <X className="w-4 h-4" />
                    Rejeitar não essenciais
                  </button>
                  <button
                    onClick={() => setShowPreferences(!showPreferences)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 hover:bg-gray-200 font-semibold transition-colors text-xs"
                  >
                    <Settings className="w-4 h-4" />
                    Preferências
                  </button>
                </div>
              </div>
            </div>

            <AnimatePresence>
              {showPreferences && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="mt-6 pt-6 border-t border-gray-100"
                >
                  <h5 className="font-bold text-gray-900 mb-4 text-sm uppercase tracking-wider">Gerenciar preferências por categoria</h5>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-800">Necessários</span>
                        <input type="checkbox" checked disabled className="w-4 h-4 text-blue-600 rounded" />
                      </div>
                      <p className="text-xs text-gray-500">Essenciais para o funcionamento básico e segurança do site. Não podem ser desativados.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-800">Analíticos</span>
                        <input type="checkbox" checked={prefs.analytics} onChange={(e) => setPrefs({...prefs, analytics: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                      </div>
                      <p className="text-xs text-gray-500">Ajudam a entender como os visitantes interagem com o site, métricas de tráfego e uso.</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 flex flex-col gap-2">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm text-gray-800">Marketing</span>
                        <input type="checkbox" checked={prefs.marketing} onChange={(e) => setPrefs({...prefs, marketing: e.target.checked})} className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 cursor-pointer" />
                      </div>
                      <p className="text-xs text-gray-500">Utilizados para mensurar campanhas e direcionar publicidade relevante.</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleSavePreferences}
                      className="px-6 py-2 rounded-xl bg-gray-900 hover:bg-black text-white font-bold text-sm transition-colors"
                    >
                      Salvar Minhas Preferências
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
