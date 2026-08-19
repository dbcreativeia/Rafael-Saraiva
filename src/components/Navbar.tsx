import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, Gamepad2, BookOpen, Instagram, Facebook, Target, Package, ChevronDown } from 'lucide-react';
import { trackEvent } from '../analytics';

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleInstagramClick = () => {
    trackEvent('Click_Instagram');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_instagram', { event_category: 'engagement', event_label: 'Instagram Menu' });
    }
    closeMenu();
  };

  const handleFacebookClick = () => {
    trackEvent('Click_Facebook');
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'click_facebook', { event_category: 'engagement', event_label: 'Facebook Menu' });
    }
    closeMenu();
  };

  if (location.pathname === '/jogo' || location.pathname === '/admin' || location.hash === '#admin') return null;

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-dark/90 backdrop-blur-md border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-24 md:h-28 gap-4">
          <Link to="/" onClick={closeMenu} className="flex-shrink-0">
            <img 
              src="https://lh3.googleusercontent.com/d/1edT-5JjmJI26Erh73KvuH2BXtnYm1lD5" 
              alt="Rafael Saraiva" 
              className="h-10 md:h-12 w-auto object-contain drop-shadow-md"
              referrerPolicy="no-referrer"
            />
          </Link>
          
          <div className="hidden lg:block overflow-visible">
            <div className="flex items-center space-x-1 lg:space-x-3 xl:space-x-5">
              <Link to="/material" className="whitespace-nowrap text-white/90 hover:text-white px-2 xl:px-3 py-2 rounded-md text-[11px] xl:text-sm font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-2 transition-colors">
                <Package className="w-4 h-4" /> Material de Campanha
              </Link>
              
              <div className="relative group">
                <Link to="/#mandato" className="whitespace-nowrap text-white/90 group-hover:text-white px-2 xl:px-3 py-2 rounded-md text-[11px] xl:text-sm font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-2 transition-colors">
                  <Target className="w-4 h-4" /> O Mandato
                  <ChevronDown className="w-3 h-3 ml-0.5 opacity-70" />
                </Link>
                <div className="absolute left-0 mt-0 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 bg-dark/95 backdrop-blur-md rounded-xl shadow-xl border border-white/10 py-2 flex flex-col z-50">
                  <Link to="/#posicionamento" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Posicionamento</Link>
                  <Link to="/#edital-animal" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Edital Animal</Link>
                  <Link to="/#castracao" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Castração</Link>
                  <Link to="/#codigo-animal" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Código Animal</Link>
                  <Link to="/#hospitais" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Hospitais</Link>
                  <Link to="/#legislativo" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Trabalho Legislativo</Link>
                  <Link to="/#marcos" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Marcos</Link>
                  <Link to="/#orelha" className="px-4 py-2 text-xs xl:text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors font-bold uppercase tracking-wider">Caso Orelha</Link>
                </div>
              </div>

              <Link to="/jogo" className="whitespace-nowrap text-white/90 hover:text-white px-2 xl:px-3 py-2 rounded-md text-[11px] xl:text-sm font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-2 transition-colors">
                <Gamepad2 className="w-4 h-4" /> Jogo
              </Link>
              <Link to="/codigoanimal" className="whitespace-nowrap text-white/90 hover:text-white px-2 xl:px-3 py-2 rounded-md text-[11px] xl:text-sm font-bold uppercase tracking-wider flex items-center gap-1 xl:gap-2 transition-colors">
                <BookOpen className="w-4 h-4" /> Código Animal
              </Link>
              
              {/* Divider */}
              <div className="w-px h-6 bg-white/20 mx-2"></div>
              
              <a 
                href="https://instagram.com/rafaelsaraivasp" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleInstagramClick}
                className="text-white/90 hover:text-[#ee2a7b] transition-colors"
              >
                <Instagram className="w-5 h-5" />
              </a>
              <a 
                href="https://facebook.com/rafaelsaraivasp" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleFacebookClick}
                className="text-white/90 hover:text-[#1877F2] transition-colors"
              >
                <Facebook className="w-5 h-5" />
              </a>
            </div>
          </div>
          
          <div className="lg:hidden">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white focus:outline-none"
            >
              <span className="sr-only">Abrir menu principal</span>
              {isOpen ? <X className="block h-8 w-8" /> : <Menu className="block h-8 w-8" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="lg:hidden absolute top-24 md:top-28 left-0 w-full max-h-[calc(100vh-6rem)] overflow-y-auto bg-dark/95 backdrop-blur-md shadow-xl border-b border-white/10">
          <div className="px-4 pt-2 pb-6 flex flex-col space-y-2">
            <Link to="/material" onClick={closeMenu} className="text-white hover:bg-white/10 block px-4 py-3 rounded-md text-base font-bold uppercase tracking-wider flex items-center gap-3">
              <Package className="w-5 h-5" /> Material de Campanha
            </Link>
            
            <Link to="/#mandato" onClick={closeMenu} className="text-white hover:bg-white/10 block px-4 py-3 rounded-md text-base font-bold uppercase tracking-wider flex items-center gap-3">
              <Target className="w-5 h-5" /> O Mandato
            </Link>
            <div className="pl-14 flex flex-col space-y-2 pb-2">
              <Link to="/#posicionamento" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Posicionamento</Link>
              <Link to="/#edital-animal" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Edital Animal</Link>
              <Link to="/#castracao" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Castração</Link>
              <Link to="/#codigo-animal" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Código Animal</Link>
              <Link to="/#hospitais" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Hospitais</Link>
              <Link to="/#legislativo" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Trabalho Legislativo</Link>
              <Link to="/#marcos" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Marcos</Link>
              <Link to="/#orelha" onClick={closeMenu} className="text-white/80 hover:text-white text-sm font-bold uppercase tracking-wider block">Caso Orelha</Link>
            </div>

            <Link to="/jogo" onClick={closeMenu} className="text-white hover:bg-white/10 block px-4 py-3 rounded-md text-base font-bold uppercase tracking-wider flex items-center gap-3">
              <Gamepad2 className="w-5 h-5" /> Jogo
            </Link>
            <Link to="/codigoanimal" onClick={closeMenu} className="text-white hover:bg-white/10 block px-4 py-3 rounded-md text-base font-bold uppercase tracking-wider flex items-center gap-3">
              <BookOpen className="w-5 h-5" /> Código Animal
            </Link>
            
            <div className="h-px bg-white/20 my-4 mx-4"></div>
            
            <div className="flex items-center gap-6 px-4 py-2">
              <a 
                href="https://instagram.com/rafaelsaraivasp" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleInstagramClick}
                className="text-white hover:text-[#ee2a7b] transition-colors"
              >
                <Instagram className="w-6 h-6" />
              </a>
              <a 
                href="https://facebook.com/rafaelsaraivasp" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleFacebookClick}
                className="text-white hover:text-[#1877F2] transition-colors"
              >
                <Facebook className="w-6 h-6" />
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
