import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-dark text-white py-8 border-t border-white/10 relative z-20">
      <div className="container mx-auto px-6 max-w-7xl flex flex-col md:flex-row items-center justify-between gap-4">
        <p className="text-white/60 text-sm font-medium">
          &copy; 2026 Deputado Rafael Saraiva
        </p>
        <div className="flex items-center gap-6">
          <a href="https://rafaelsaraivasp.com.br/politica-de-privacidade" target="_blank" rel="noreferrer" className="text-white/60 hover:text-white transition-colors text-sm font-medium">
            Política de Privacidade
          </a>
        </div>
      </div>
    </footer>
  );
};
