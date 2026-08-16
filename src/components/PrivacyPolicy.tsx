import React, { useEffect } from 'react';
import { Shield, ArrowLeft } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Footer } from './Footer';
import { Helmet } from 'react-helmet-async';
import { trackEvent } from '../analytics';

export const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent('PageView_PrivacyPolicy');
  }, []);

  return (
    <>
      <Helmet>
        <title>Política de Privacidade | Rafael Saraiva 44077</title>
        <meta name="title" content="Política de Privacidade | Rafael Saraiva 44077" />
        <meta name="description" content="Conheça nossa Política de Privacidade e como o Rafael Saraiva 44077 protege seus dados de acordo com a LGPD." />
        <meta name="keywords" content="Política de Privacidade, LGPD, Proteção de Dados, Rafael Saraiva 44077, Rafael Saraiva" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/politica-de-privacidade" />
        <meta property="og:title" content="Política de Privacidade | Rafael Saraiva 44077" />
        <meta property="og:description" content="Conheça nossa Política de Privacidade e como o Rafael Saraiva 44077 protege seus dados de acordo com a LGPD." />
        <meta property="og:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/politica-de-privacidade" />
        <meta property="twitter:title" content="Política de Privacidade | Rafael Saraiva 44077" />
        <meta property="twitter:description" content="Conheça nossa Política de Privacidade e como o Rafael Saraiva 44077 protege seus dados de acordo com a LGPD." />
        <meta property="twitter:image" content="https://rafaelsaraiva.com.br/Estou-fechado-com-ele.png" />
      </Helmet>
    <div className="min-h-screen bg-gradient-to-br from-dark via-secondary to-primary flex flex-col font-sans relative">
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none overflow-hidden mix-blend-overlay">
        <img 
          src="https://lh3.googleusercontent.com/d/1nuBTcNr3uRbjStHMKJgLX0KCrgtjDwj7" 
          alt="Texture" 
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>

      

      <main className="flex-1 max-w-4xl mx-auto px-6 pt-32 pb-12 md:pt-40 md:pb-16 w-full relative z-10">
        <div className="mb-6">
          <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-white/80 hover:text-white transition-colors font-bold text-sm tracking-wide uppercase">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </div>
        <div className="bg-white rounded-[2rem] shadow-2xl border border-white/20 p-8 md:p-12">
          <div className="flex items-center gap-4 mb-8 text-primary">
            <div className="bg-primary/10 p-3 rounded-2xl">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-dark font-display uppercase">
              Política de Privacidade e Proteção de Dados
            </h1>
          </div>

          <div className="prose prose-blue max-w-none text-gray-700 leading-relaxed space-y-8 font-medium">
            <div className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-8">
              Última atualização: 13/08/2026
            </div>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">1. Introdução</h2>
              <p>A presente Política de Privacidade explica como a campanha <strong>ELEICAO 2026 RAFAEL SARAIVA GAIA DEPUTADO ESTADUAL</strong>, vinculada ao <strong>União Brasil</strong>, trata dados pessoais coletados por meio do site <strong><a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></strong>, landing pages, formulários, cookies, ferramentas de analytics, plataformas de mídia e demais canais digitais relacionados à campanha eleitoral de Rafael Saraiva para Deputado Estadual em São Paulo/SP.</p>
              <p className="mt-4">A proteção dos dados pessoais é importante para a campanha. O tratamento das informações será realizado de forma transparente, limitada às finalidades informadas, com medidas de segurança adequadas e em conformidade com a Lei Geral de Proteção de Dados Pessoais — LGPD, Lei nº 13.709/2018, e com as regras eleitorais aplicáveis.</p>
              <p className="mt-4">Esta política se aplica a visitantes do site, pessoas que preenchem formulários, solicitam materiais de campanha, autorizam o recebimento de comunicações, interagem com anúncios, conteúdos digitais, páginas, botões, links ou demais canais oficiais da campanha.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">2. Controlador dos dados</h2>
              <p>O controlador dos dados pessoais tratados neste site é:</p>
              <ul className="list-none space-y-2 mt-4 text-gray-600">
                <li><strong>ELEICAO 2026 RAFAEL SARAIVA GAIA DEPUTADO ESTADUAL</strong></li>
                <li><strong>Cargo:</strong> Deputado Estadual</li>
                <li><strong>Partido:</strong> União Brasil</li>
                <li><strong>Localidade:</strong> São Paulo/SP</li>
                <li><strong>Site:</strong> <a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></li>
                <li><strong>Canal de privacidade/LGPD:</strong> <a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></li>
                <li><strong>Responsável pelo atendimento:</strong> Equipe de Campanha</li>
              </ul>
              <p className="mt-4">O canal acima pode ser utilizado para dúvidas, solicitações de titulares de dados, pedidos de acesso, correção, exclusão, revogação de consentimento, descadastro de comunicações ou informações sobre o tratamento de dados pessoais.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">3. Dados pessoais que podemos coletar</h2>
              <p>Podemos coletar os seguintes dados pessoais, conforme a interação do titular com o site ou com os canais digitais da campanha:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Nome;</li>
                <li>E-mail;</li>
                <li>Telefone;</li>
                <li>Cidade;</li>
                <li>Bairro;</li>
                <li>Endereço completo, quando necessário para envio, entrega ou organização de material de campanha;</li>
                <li>Mensagem ou informações preenchidas voluntariamente em formulários;</li>
                <li>Preferências de contato;</li>
                <li>Solicitação de recebimento de material de campanha;</li>
                <li>Autorização para recebimento de comunicações;</li>
                <li>Endereço IP;</li>
                <li>Tipo de navegador;</li>
                <li>Sistema operacional;</li>
                <li>Identificadores de dispositivo;</li>
                <li>Páginas acessadas;</li>
                <li>Data e horário de acesso;</li>
                <li>Origem do tráfego;</li>
                <li>Eventos de conversão;</li>
                <li>Dados de navegação coletados por cookies, pixels, tags e tecnologias similares.</li>
              </ul>
              <p className="mt-4">A campanha não solicita CPF, título de eleitor, data de nascimento, dados de doação, dados de saúde, religião, sindicato, intenção de voto ou outros dados sensíveis por meio dos formulários informados para este site.</p>
              <p className="mt-4">No entanto, em razão do contexto político-eleitoral da página, determinados dados fornecidos voluntariamente, como nome, e-mail, telefone, endereço, solicitação de material, interação com conteúdos da campanha ou autorização para receber comunicações, podem revelar ou permitir inferir opinião política, apoio, preferência ou engajamento.</p>
              <p className="mt-4">Nesses casos, os dados serão tratados com cautela reforçada, observando as hipóteses legais aplicáveis, a finalidade informada, a necessidade, a transparência, a segurança e os direitos dos titulares.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">4. Como os dados são coletados</h2>
              <p>Os dados pessoais podem ser coletados quando o titular:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Acessa o site ou landing pages da campanha;</li>
                <li>Preenche formulários;</li>
                <li>Solicita material de campanha;</li>
                <li>Autoriza o recebimento de comunicações por e-mail, WhatsApp, SMS, telefone ou outros canais;</li>
                <li>Interage com anúncios, publicações, botões, páginas ou links da campanha;</li>
                <li>Aceita cookies analíticos ou de marketing;</li>
                <li>Entra em contato com os canais oficiais da campanha.</li>
              </ul>
              <p className="mt-4">Também podemos coletar dados técnicos de navegação por meio de cookies, pixels, tags, ferramentas de analytics e tecnologias similares, sempre observadas as preferências de consentimento aplicáveis.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">5. Finalidades do tratamento</h2>
              <p>Os dados pessoais poderão ser tratados para as seguintes finalidades:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Responder contatos, dúvidas, comentários, solicitações ou mensagens enviadas pelo titular;</li>
                <li>Atender pedidos de materiais de campanha;</li>
                <li>Organizar o envio, entrega ou disponibilização de materiais de campanha;</li>
                <li>Registrar autorizações para recebimento de comunicações;</li>
                <li>Enviar comunicações da campanha por e-mail, WhatsApp, SMS, telefone, newsletter ou lista de transmissão, quando houver autorização do titular;</li>
                <li>Realizar contato individual com pessoas cadastradas voluntariamente;</li>
                <li>Permitir o descadastro e a revogação de consentimento;</li>
                <li>Mensurar o desempenho do site, das páginas, formulários, anúncios e campanhas digitais;</li>
                <li>Analisar tráfego, audiência, origem de acessos, interações e eventos de conversão;</li>
                <li>Realizar campanhas de mídia, segmentação, remarketing, públicos personalizados ou semelhantes, quando autorizado;</li>
                <li>Melhorar a experiência de navegação e o funcionamento do site;</li>
                <li>Prevenir spam, fraudes, abusos, acessos indevidos e incidentes de segurança;</li>
                <li>Cumprir obrigações legais, regulatórias ou eleitorais, quando aplicável;</li>
                <li>Resguardar direitos da campanha, do candidato ou de terceiros em processos administrativos, judiciais ou perante autoridades competentes;</li>
                <li>Demonstrar conformidade com a LGPD, inclusive por meio de registros de consentimento, versões de política e preferências de cookies.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">6. Bases legais utilizadas</h2>
              <p>O tratamento dos dados pessoais será realizado com base nas hipóteses legais previstas na LGPD, conforme a finalidade específica.</p>
              <p className="mt-4">De forma geral, poderão ser utilizadas as seguintes bases legais:</p>
              
              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Consentimento</h3>
              <p>Utilizado para:</p>
              <ul className="list-disc pl-6 space-y-2 mt-2 text-gray-600">
                <li>Envio de comunicações por e-mail, WhatsApp, SMS, telefone, newsletter ou lista de transmissão;</li>
                <li>Uso de cookies analíticos não essenciais;</li>
                <li>Uso de cookies de marketing;</li>
                <li>Uso de pixels, tags de publicidade, remarketing e mensuração de campanhas;</li>
                <li>Criação de públicos personalizados ou semelhantes em plataformas de mídia;</li>
                <li>Tratamento de dados que, no contexto político-eleitoral, possam revelar ou permitir inferir opinião política, apoio, preferência ou engajamento, quando aplicável.</li>
              </ul>
              <p className="mt-2">O consentimento poderá ser revogado a qualquer momento pelo titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Procedimentos solicitados pelo titular</h3>
              <p>Utilizado para responder contatos, processar solicitações enviadas voluntariamente e atender pedidos de materiais de campanha solicitados pelo próprio titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Legítimo interesse</h3>
              <p>Utilizado para atividades necessárias à segurança do site, prevenção de abuso, proteção contra spam, funcionamento técnico, controle de acessos, melhoria limitada dos serviços e resguardo de direitos, sempre respeitados os direitos e liberdades fundamentais do titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cumprimento de obrigação legal ou regulatória</h3>
              <p>Utilizado quando o tratamento for necessário para cumprir obrigações previstas em lei, normas eleitorais, determinações de autoridades públicas, ordens judiciais ou exigências regulatórias aplicáveis.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Exercício regular de direitos</h3>
              <p>Utilizado para resguardar direitos da campanha, do candidato ou de terceiros em processos judiciais, administrativos, eleitorais ou perante autoridades competentes.</p>
              
              <p className="mt-4">A base legal aplicável poderá variar conforme o tipo de dado, a finalidade e o contexto do tratamento.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">7. Comunicações por e-mail, WhatsApp, SMS, telefone e newsletter</h2>
              <p>A campanha poderá enviar comunicações por e-mail, WhatsApp, SMS, telefone, newsletter ou lista de transmissão apenas quando houver autorização do titular ou outra base legal aplicável.</p>
              <p className="mt-4">As comunicações poderão incluir informações sobre a campanha, materiais, conteúdos informativos, avisos, convites, notícias, atualizações e mensagens relacionadas à candidatura.</p>
              <p className="mt-4">Ao autorizar o recebimento de comunicações, o titular declara estar ciente de que poderá solicitar o descadastro ou revogar sua autorização a qualquer momento.</p>
              <p className="mt-4">O descadastro poderá ser solicitado pelo próprio canal de comunicação utilizado, quando disponível, ou pelo e-mail: <br/><strong><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></strong></p>
              <p className="mt-4">A campanha não deve realizar propaganda eleitoral por telemarketing nem disparo em massa irregular de mensagens. O envio de mensagens deverá observar a legislação eleitoral, a LGPD, as regras das plataformas utilizadas e a existência de consentimento ou cadastro voluntário do titular, quando exigido.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">8. Cookies e tecnologias de rastreamento</h2>
              <p>Este site pode utilizar cookies, pixels, tags e tecnologias similares para permitir o funcionamento da página, melhorar a experiência do usuário, medir audiência, analisar desempenho de campanhas e exibir anúncios relacionados à campanha.</p>
              <p className="mt-4">As ferramentas utilizadas podem incluir, entre outras:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Google Analytics;</li>
                <li>Google Tag Manager;</li>
                <li>Google Ads;</li>
                <li>Meta Ads;</li>
                <li>Meta Pixel ou tecnologias similares;</li>
                <li>Ferramentas de rastreamento, mensuração, conversão, remarketing e mídia paga.</li>
              </ul>
              
              <p className="mt-4">Os cookies podem ser classificados nas seguintes categorias:</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies necessários</h3>
              <p>São essenciais para o funcionamento básico do site, segurança, carregamento de páginas, prevenção de spam, manutenção de preferências técnicas e funcionamento adequado dos recursos essenciais.</p>
              <p className="mt-2">Esses cookies podem ser utilizados independentemente de consentimento, quando forem estritamente necessários.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies analíticos</h3>
              <p>São utilizados para entender como os visitantes acessam e utilizam o site, quais páginas são visitadas, origem do tráfego, tempo de navegação, interações e eventos de conversão.</p>
              <p className="mt-2">Esses cookies ajudam a melhorar a experiência do usuário e a mensurar o desempenho das páginas e campanhas.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies de marketing</h3>
              <p>São utilizados para mensurar campanhas, acompanhar conversões, criar públicos personalizados ou semelhantes, realizar remarketing e melhorar a entrega de anúncios em plataformas de mídia, como Google, Meta e ferramentas similares.</p>
              
              <p className="mt-4">Cookies analíticos e de marketing não essenciais somente serão ativados após o consentimento do titular, quando aplicável.</p>
              <p className="mt-4">O site disponibilizará banner de cookies com opções para:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Aceitar cookies não essenciais;</li>
                <li>Rejeitar cookies não essenciais;</li>
                <li>Gerenciar preferências por categoria.</li>
              </ul>
              <p className="mt-4">As tags de analytics, marketing, mídia paga, remarketing e rastreamento não essenciais deverão permanecer bloqueadas até que o titular manifeste seu consentimento.</p>
              <p className="mt-4">O titular também pode configurar seu navegador para bloquear ou excluir cookies. No entanto, algumas funcionalidades do site podem não funcionar corretamente sem determinados cookies necessários.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">9. Remarketing e públicos personalizados</h2>
              <p>Mediante consentimento, a campanha poderá utilizar dados de navegação, eventos de conversão, interações com o site e identificadores online para mensuração de campanhas, remarketing, criação de públicos personalizados ou semelhantes e exibição de anúncios relacionados à campanha.</p>
              <p className="mt-4">Essas atividades podem envolver plataformas de mídia e publicidade digital, como Google, Meta e ferramentas similares.</p>
              <p className="mt-4">O titular poderá rejeitar cookies de marketing no banner de cookies, gerenciar suas preferências ou revogar consentimentos concedidos anteriormente.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">10. Ferramentas e fornecedores</h2>
              <p>Para operar o site, os formulários e as ações digitais da campanha, poderão ser utilizados fornecedores e plataformas de tecnologia, incluindo:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li><strong>Hostinger</strong>, para hospedagem e infraestrutura;</li>
                <li><strong>RD Station</strong>, para CRM, gestão de contatos, automações e relacionamento;</li>
                <li>Plataformas de analytics;</li>
                <li>Plataformas de mídia paga;</li>
                <li>Gerenciadores de tags;</li>
                <li>Ferramentas de formulários;</li>
                <li>Ferramentas de e-mail marketing;</li>
                <li>Ferramentas de comunicação, quando aplicável;</li>
                <li>Ferramentas de segurança, anti-spam e prevenção de fraudes.</li>
              </ul>
              <p className="mt-4">Esses fornecedores poderão tratar dados pessoais em nome da campanha ou como controladores independentes, conforme o caso, suas funções e suas próprias políticas de privacidade.</p>
              <p className="mt-4">A campanha informa que terceiros externos à equipe não terão acesso direto aos leads, salvo fornecedores técnicos necessários para operação das ferramentas, hospedagem, CRM, segurança, mídia, comunicação ou cumprimento de obrigação legal.</p>
              <p className="mt-4">Não vendemos dados pessoais.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">11. Compartilhamento de dados</h2>
              <p>Os dados pessoais poderão ser compartilhados nas seguintes situações:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Com fornecedores necessários para funcionamento do site, hospedagem, CRM, formulários, segurança e operação da campanha;</li>
                <li>Com plataformas de analytics, mídia e publicidade digital, quando autorizado;</li>
                <li>Com ferramentas de comunicação, e-mail, WhatsApp, SMS ou relacionamento, quando aplicável;</li>
                <li>Com prestadores de serviços técnicos que atuem sob orientação da campanha;</li>
                <li>Com autoridades públicas, Justiça Eleitoral ou órgãos competentes, quando houver obrigação legal, regulatória ou determinação válida;</li>
                <li>Para exercício regular de direitos em processos judiciais, administrativos ou eleitorais;</li>
                <li>Em situações necessárias para prevenir fraudes, incidentes de segurança, acessos indevidos ou uso irregular do site.</li>
              </ul>
              <p className="mt-4">O compartilhamento será limitado ao necessário para cumprir as finalidades informadas e observará medidas adequadas de segurança e confidencialidade.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">12. Transferência internacional de dados</h2>
              <p>Alguns fornecedores utilizados pela campanha podem armazenar ou processar dados em servidores localizados fora do Brasil, especialmente plataformas globais de tecnologia, analytics, mídia, hospedagem, CRM ou comunicação.</p>
              <p className="mt-4">Quando houver transferência internacional de dados, a campanha adotará medidas razoáveis para que o tratamento observe a LGPD e mecanismos adequados de proteção, conforme aplicável.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">13. Retenção dos dados</h2>
              <p>Os dados pessoais serão mantidos pelo tempo necessário para cumprir as finalidades descritas nesta política, incluindo atendimento de solicitações, envio de comunicações autorizadas, organização de materiais de campanha, mensuração de campanhas, cumprimento de obrigações legais ou eleitorais, prestação de contas, segurança, prevenção de fraudes, exercício regular de direitos e demonstração de conformidade com a LGPD.</p>
              <p className="mt-4">Os dados usados para envio de comunicações poderão ser mantidos enquanto houver consentimento válido ou enquanto o titular não solicitar o descadastro, sem prejuízo da conservação de registros mínimos necessários para comprovar a revogação, evitar novos contatos indevidos ou cumprir obrigações legais.</p>
              <p className="mt-4">Dados tratados com base no consentimento poderão ser eliminados após a revogação, salvo quando a conservação for necessária para cumprimento de obrigação legal, prestação de contas, prevenção de fraudes, segurança, exercício regular de direitos ou outra hipótese permitida pela LGPD.</p>
              <p className="mt-4">Após o término da finalidade ou do prazo necessário de retenção, os dados serão eliminados, anonimizados ou mantidos somente nas hipóteses legalmente permitidas.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">14. Segurança dos dados</h2>
              <p>A campanha adota medidas técnicas e administrativas razoáveis para proteger os dados pessoais contra acessos não autorizados, perda, alteração, divulgação indevida, destruição acidental ou ilícita e outras situações inadequadas.</p>
              <p className="mt-4">Entre as medidas adotadas ou recomendadas, conforme aplicável, estão:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Uso de HTTPS no site;</li>
                <li>Controle de acesso às ferramentas utilizadas;</li>
                <li>Restrição de acesso aos dados pela Equipe de Campanha;</li>
                <li>Senhas fortes;</li>
                <li>Backup dos dados;</li>
                <li>Proteção contra spam e abusos em formulários;</li>
                <li>Revisão de permissões em plataformas de hospedagem, CRM, mídia e comunicação;</li>
                <li>Limitação do acesso aos leads somente a pessoas autorizadas;</li>
                <li>Não exportação ou download rotineiro dos dados para computadores pessoais;</li>
                <li>Monitoramento básico de segurança e funcionamento das ferramentas.</li>
              </ul>
              <p className="mt-4">Apesar das medidas adotadas, nenhum sistema é totalmente imune a riscos. Caso ocorra incidente de segurança que possa gerar risco ou dano relevante aos titulares, serão adotadas as providências cabíveis, incluindo comunicação às autoridades competentes e aos titulares, quando exigido pela LGPD.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">15. Direitos dos titulares</h2>
              <p>O titular pode exercer, a qualquer momento e nos termos da LGPD, os seguintes direitos:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>Confirmação da existência de tratamento de dados;</li>
                <li>Acesso aos dados pessoais tratados;</li>
                <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>Anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade com a LGPD;</li>
                <li>Portabilidade dos dados, quando aplicável;</li>
                <li>Informação sobre compartilhamento de dados;</li>
                <li>Informação sobre a possibilidade de não fornecer consentimento e sobre as consequências da negativa;</li>
                <li>Revogação do consentimento;</li>
                <li>Eliminação dos dados tratados com base no consentimento, quando aplicável;</li>
                <li>Oposição ao tratamento realizado em desconformidade com a LGPD;</li>
                <li>Revisão de decisões tomadas unicamente com base em tratamento automatizado de dados pessoais, quando aplicável.</li>
              </ul>
              <p className="mt-4">Para exercer seus direitos, o titular deve entrar em contato pelo e-mail: <br/><strong><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></strong></p>
              <p className="mt-4">A solicitação poderá exigir validação mínima da identidade do titular, para evitar acesso indevido por terceiros.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">16. Descadastro e revogação de consentimento</h2>
              <p>Quando o tratamento depender de consentimento, o titular poderá revogá-lo a qualquer momento, de forma gratuita e facilitada.</p>
              <p className="mt-4">O descadastro de comunicações poderá ser solicitado pelo próprio canal utilizado, quando disponível, ou pelo e-mail: <br/><strong><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></strong></p>
              <p className="mt-4">A revogação do consentimento não afeta a validade dos tratamentos realizados anteriormente com base no consentimento então vigente, nem impede a conservação de dados quando houver outra base legal aplicável, como cumprimento de obrigação legal, prestação de contas, prevenção de fraudes, segurança ou exercício regular de direitos.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">17. Dados de crianças e adolescentes</h2>
              <p>Este site e os formulários da campanha não são direcionados a crianças ou adolescentes.</p>
              <p className="mt-4">A campanha não solicita, de forma intencional, dados pessoais de crianças ou adolescentes por meio deste site.</p>
              <p className="mt-4">Caso seja identificado tratamento de dados de crianças ou adolescentes, serão adotadas medidas específicas de proteção, observando o melhor interesse do menor e, quando necessário, o consentimento de pelo menos um dos pais ou responsável legal.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">18. Pesquisas, intenção de voto, eventos e doações</h2>
              <p>Este site não coleta dados de doadores, não realiza inscrição em eventos presenciais, não é direcionado a crianças ou adolescentes e não realiza pesquisa de intenção de voto por meio dos formulários informados.</p>
              <p className="mt-4">Caso novas funcionalidades sejam adicionadas no futuro, como inscrição em eventos, coleta de doações, pesquisas, formulários de voluntariado, atendimento automatizado ou outras interações, esta política deverá ser atualizada antes do início da nova coleta.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">19. Decisões automatizadas, segmentação e publicidade digital</h2>
              <p>A campanha poderá utilizar ferramentas de mídia, analytics e marketing para mensurar desempenho, segmentar públicos, acompanhar eventos de conversão e exibir anúncios relacionados à campanha, sempre conforme as preferências de consentimento aplicáveis.</p>
              <p className="mt-4">A campanha não utiliza decisões automatizadas para produzir efeitos jurídicos ou afetar significativamente os interesses do titular sem a devida transparência e possibilidade de exercício de direitos.</p>
              <p className="mt-4">Caso o titular deseje informações sobre critérios utilizados em eventual tratamento automatizado, segmentação ou publicidade personalizada, poderá entrar em contato pelo canal de privacidade indicado nesta política.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">20. Alterações nesta política</h2>
              <p>Esta Política de Privacidade poderá ser atualizada periodicamente para refletir mudanças no site, nas ferramentas utilizadas, nas finalidades de tratamento, nos fornecedores, nas exigências legais, nas normas eleitorais ou nas práticas da campanha.</p>
              <p className="mt-4">A versão mais recente estará sempre disponível no site <strong><a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></strong>, com indicação da data da última atualização.</p>
            </section>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">21. Contato</h2>
              <p>Para dúvidas, solicitações, exercício de direitos, revogação de consentimento ou descadastro de comunicações relacionadas à proteção de dados pessoais, entre em contato pelo canal:</p>
              <ul className="list-none space-y-2 mt-4 text-gray-600">
                <li><strong>E-mail:</strong> <a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></li>
                <li><strong>Responsável pelo atendimento:</strong> Equipe de Campanha</li>
                <li><strong>Site:</strong> <a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></li>
              </ul>
            </section>

            <p className="mt-12 text-sm text-gray-500 italic">
              Ao utilizar este site, preencher formulários, aceitar cookies ou interagir com os canais digitais da campanha, o titular declara estar ciente das condições desta Política de Privacidade.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
    </>
  );
};
