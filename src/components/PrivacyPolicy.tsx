import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Footer } from './Footer';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-primary flex flex-col font-sans relative">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden mix-blend-overlay">
        <img 
          src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
          alt="Texture" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      <header className="bg-dark/50 backdrop-blur-md border-b border-white/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center">
          <Link to="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-bold text-sm tracking-wide uppercase">
            <ArrowLeft className="w-4 h-4" />
            Voltar para o Início
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-4xl mx-auto px-6 py-12 md:py-16 w-full relative z-10">
        <div className="bg-white rounded-[2rem] shadow-2xl border border-white/20 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 text-primary">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-dark font-display uppercase">
              Política de Privacidade
            </h1>
          </div>

          <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-8 font-medium">
            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">1. Introdução</h2>
              <p>
                O Deputado Rafael Saraiva leva a sua privacidade a sério. Esta Política de Privacidade explica como coletamos, usamos, divulgamos e protegemos as suas informações quando você visita nosso site, em conformidade com a Lei Geral de Proteção de Dados Pessoais (LGPD - Lei nº 13.709/2018).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">2. Coleta de Dados</h2>
              <p>
                Podemos coletar as seguintes informações sobre você:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2 text-gray-600">
                <li><strong>Dados de Navegação:</strong> Endereço IP, tipo de navegador, sistema operacional, páginas visitadas e tempo gasto no site (através de cookies e tecnologias similares, incluindo Google Analytics e Meta Pixel).</li>
                <li><strong>Informações Fornecidas Voluntariamente:</strong> Quando você entra em contato conosco ou solicita materiais (como adesivos), podemos coletar seu nome, e-mail, telefone ou outras informações que você optar por compartilhar.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">3. Uso das Informações</h2>
              <p>
                Utilizamos as informações coletadas para:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2 text-gray-600">
                <li>Melhorar e personalizar a sua experiência em nosso site.</li>
                <li>Analisar o tráfego e tendências de uso (Analytics).</li>
                <li>Mensurar o desempenho de campanhas de conscientização e ações nas redes sociais.</li>
                <li>Responder a dúvidas, comentários ou solicitações.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">4. Cookies e Tecnologias de Rastreamento</h2>
              <p>
                Solicitamos o seu consentimento explícito para o uso de cookies não essenciais antes de utilizá-los. Você pode gerenciar ou desativar os cookies nas configurações do seu navegador, embora isso possa afetar algumas funcionalidades do site.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">5. Compartilhamento de Dados</h2>
              <p>
                Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para fins comerciais. Podemos compartilhar dados anonimizados com provedores de serviços analíticos (como Google e Facebook) exclusivamente para gerar estatísticas de tráfego e performance.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">6. Seus Direitos (LGPD)</h2>
              <p>
                De acordo com a LGPD, você tem o direito de:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2 text-gray-600">
                <li>Confirmar a existência do tratamento de dados.</li>
                <li>Acessar seus dados armazenados.</li>
                <li>Solicitar a correção de dados incompletos, inexatos ou desatualizados.</li>
                <li>Solicitar a eliminação dos dados ou revogar o seu consentimento a qualquer momento.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">7. Contato</h2>
              <p>
                Se você tiver dúvidas sobre esta Política de Privacidade ou sobre como tratamos seus dados, entre em contato através dos nossos canais oficiais mencionados no site.
              </p>
            </section>

            <div className="mt-8 pt-8 border-t border-gray-200 text-sm font-bold text-gray-500 uppercase tracking-widest">
              Última atualização: {new Date().toLocaleDateString('pt-BR')}
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};
