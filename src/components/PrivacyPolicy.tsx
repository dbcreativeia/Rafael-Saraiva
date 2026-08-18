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
              Última atualização: 18/08/2026
            </div>

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">1. Introdução</h2>
              <p>Esta Política de Privacidade e Proteção de Dados explica como a campanha <strong>ELEIÇÃO 2026 RAFAEL SARAIVA GAIA DEPUTADO ESTADUAL</strong>, relativa à candidatura de Rafael Saraiva ao cargo de Deputado Estadual pelo Estado de São Paulo, trata dados pessoais coletados por meio do site <strong><a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></strong>, de suas landing pages, formulários e demais canais digitais oficiais da campanha.</p>
              <p className="mt-4">A campanha realiza o tratamento de dados pessoais de acordo com a Lei nº 13.709/2018 — Lei Geral de Proteção de Dados Pessoais (LGPD), com a legislação eleitoral e com as normas aplicáveis às Eleições 2026.</p>
              <p className="mt-4">Esta política se aplica, entre outras situações, às pessoas que:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>acessam o site ou páginas da campanha;</li>
                <li>preenchem formulários;</li>
                <li>utilizam o formulário “Você está com a gente?”;</li>
                <li>solicitam materiais de campanha;</li>
                <li>autorizam o recebimento de comunicações;</li>
                <li>entram em contato com a campanha;</li>
                <li>interagem com funcionalidades do site;</li>
                <li>utilizam páginas nas quais estejam instaladas tecnologias de cookies, analytics ou mensuração, conforme as preferências aplicáveis.</li>
              </ul>
              <p className="mt-4">A mera navegação no site ou leitura desta Política de Privacidade <strong>não equivale a consentimento</strong> para tratamentos que dependam de autorização do titular.</p>
              <p className="mt-4">Quando o consentimento for necessário, ele será solicitado de maneira própria, específica e compatível com a finalidade do tratamento.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">2. Controlador dos dados e canal de privacidade</h2>
              <p>O controlador dos dados pessoais tratados no contexto desta campanha é:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li><strong>Controlador:</strong> ELEIÇÃO 2026 RAFAEL SARAIVA GAIA DEPUTADO ESTADUAL</li>
                <li><strong>Candidato:</strong> Rafael Saraiva Gaia</li>
                <li><strong>Cargo:</strong> Deputado Estadual</li>
                <li><strong>Estado:</strong> São Paulo</li>
                <li><strong>CNPJ eleitoral:</strong> 68.283.115/0001-74</li>
                <li><strong>Site:</strong> <a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></li>
                <li><strong>Canal de privacidade e proteção de dados:</strong> <a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></li>
                <li><strong>Responsável pelo atendimento:</strong> Equipe Rafael Saraiva</li>
                <li><strong>Encarregado pelo tratamento de dados:</strong> Diogo Santos Barbosa</li>
              </ul>
              <p className="mt-4">O canal de privacidade poderá ser utilizado para dúvidas sobre tratamento de dados pessoais e para solicitações de confirmação de tratamento, acesso, correção, eliminação, revogação de consentimento, descadastramento de comunicações e exercício dos demais direitos previstos na legislação aplicável.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">3. Dados pessoais que podem ser tratados</h2>
              <p>Os dados tratados variam de acordo com a interação da pessoa com o site e com os canais da campanha.</p>
              <p className="mt-4">Podemos tratar:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>nome;</li>
                <li>WhatsApp ou número de telefone;</li>
                <li>e-mail;</li>
                <li>CEP;</li>
                <li>cidade, bairro ou região obtidos ou informados a partir do CEP;</li>
                <li>endereço, quando necessário para entrega solicitada de material;</li>
                <li>mensagens enviadas voluntariamente;</li>
                <li>preferências e autorizações de contato;</li>
                <li>solicitações de material de campanha;</li>
                <li>respostas e manifestações realizadas em formulários da campanha;</li>
                <li>data e horário da interação;</li>
                <li>registros de consentimento;</li>
                <li>versão do texto de consentimento apresentado;</li>
                <li>página ou formulário de origem;</li>
                <li>endereço IP, quando tecnicamente registrado;</li>
                <li>tipo de navegador;</li>
                <li>sistema operacional;</li>
                <li>identificadores técnicos de dispositivo;</li>
                <li>páginas acessadas;</li>
                <li>origem do tráfego;</li>
                <li>eventos de navegação ou conversão;</li>
                <li>preferências de cookies;</li>
                <li>dados técnicos gerados pelas ferramentas efetivamente utilizadas no site.</li>
              </ul>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Dados capazes de revelar opinião política</h3>
              <p>Em determinados formulários ou interações, a informação fornecida pelo próprio titular poderá revelar ou permitir inferir sua opinião, preferência, apoio ou engajamento político.</p>
              <p className="mt-4">Isso ocorre, especialmente, quando uma pessoa responde ou envia seus dados por meio de formulários com chamadas como <strong>“Você está com a gente?”</strong> ou outras manifestações semelhantes relacionadas diretamente à candidatura.</p>
              <p className="mt-4">A opinião política é considerada dado pessoal sensível.</p>
              <p className="mt-4">Por essa razão, quando o tratamento realizado pela campanha envolver dado pessoal sensível ou informação capaz de revelar dado pessoal sensível, serão adotadas salvaguardas reforçadas e, nas hipóteses aplicáveis à propaganda eleitoral, será solicitado <strong>consentimento específico, expresso e destacado</strong> para as finalidades previamente informadas.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">4. Formulário “Você está com a gente?”</h2>
              <p>No formulário denominado <strong>“Você está com a gente?”</strong>, poderão ser coletados os seguintes dados:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>nome completo;</li>
                <li>WhatsApp;</li>
                <li>e-mail;</li>
                <li>CEP;</li>
                <li>manifestação realizada por meio do envio do formulário;</li>
                <li>registros relacionados ao consentimento fornecido.</li>
              </ul>
              <p className="mt-4">Os campos de <strong>nome, WhatsApp, e-mail e CEP são obrigatórios para o envio desse formulário</strong>.</p>
              <p className="mt-4">Esses dados serão utilizados para as finalidades informadas no próprio formulário e nesta Política, incluindo:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>registrar a manifestação realizada pelo titular;</li>
                <li>identificar a região aproximada da pessoa cadastrada;</li>
                <li>organizar informações da campanha por região;</li>
                <li>administrar o cadastro realizado voluntariamente;</li>
                <li>manter contato com o titular, quando autorizado e para as finalidades informadas;</li>
                <li>registrar e comprovar as autorizações concedidas;</li>
                <li>atender pedidos de revogação, eliminação ou descadastramento;</li>
                <li>cumprir obrigações legais e eleitorais relacionadas ao tratamento de dados.</li>
              </ul>
              <p className="mt-4">O CEP poderá ser utilizado para identificar cidade, bairro ou região aproximada, conforme os recursos técnicos utilizados pela campanha.</p>
              <p className="mt-4">O envio do formulário dependerá da manifestação específica e destacada do titular quanto ao tratamento de informações que possam revelar opinião política.</p>
              <p className="mt-4">A campanha manterá registro da manifestação de consentimento, incluindo, quando tecnicamente disponível, data, horário, formulário ou página de origem e versão do texto apresentado ao titular.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">5. Finalidades do tratamento</h2>
              <p>Dependendo da interação realizada, os dados poderão ser tratados para:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>administrar cadastros realizados voluntariamente;</li>
                <li>registrar manifestações feitas em formulários da campanha;</li>
                <li>identificar a região das pessoas cadastradas;</li>
                <li>responder dúvidas, mensagens e solicitações;</li>
                <li>atender pedidos de materiais de campanha;</li>
                <li>organizar entrega ou disponibilização de materiais solicitados;</li>
                <li>realizar contatos relacionados às finalidades informadas;</li>
                <li>enviar comunicações eleitorais quando houver autorização aplicável;</li>
                <li>registrar consentimentos e preferências;</li>
                <li>atender pedidos de descadastramento, revogação ou eliminação;</li>
                <li>prestar informações e atender direitos dos titulares;</li>
                <li>manter registros necessários para demonstrar conformidade;</li>
                <li>garantir segurança do site e dos formulários;</li>
                <li>prevenir spam, fraude, abuso e acesso indevido;</li>
                <li>analisar tecnicamente o funcionamento do site;</li>
                <li>mensurar audiência ou desempenho quando permitido e de acordo com as preferências de cookies;</li>
                <li>cumprir obrigações legais, regulatórias e eleitorais;</li>
                <li>atender determinações da Justiça Eleitoral, da Autoridade Nacional de Proteção de Dados ou de outra autoridade competente;</li>
                <li>exercer ou resguardar direitos em processos judiciais, administrativos ou eleitorais.</li>
              </ul>
              <p className="mt-4">Os dados não serão utilizados para finalidade incompatível com aquela informada ao titular sem que sejam observadas as exigências legais aplicáveis à nova finalidade.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">6. Bases legais utilizadas</h2>
              <p>O fundamento jurídico utilizado dependerá do tipo de dado e da finalidade do tratamento.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.1. Consentimento específico para dados capazes de revelar opinião política</h3>
              <p>Quando uma interação ou formulário puder revelar opinião política, apoio, preferência ou engajamento político, a campanha utilizará, quando exigido pela regulamentação eleitoral, <strong>consentimento específico, expresso e destacado do titular</strong>.</p>
              <p className="mt-2">Esse consentimento deverá estar relacionado a finalidades determinadas e será registrado de maneira que permita demonstrar a manifestação do titular.</p>
              <p className="mt-2">O consentimento poderá ser revogado, sem prejuízo dos tratamentos realizados legitimamente antes da revogação e das hipóteses em que a legislação permita ou exija a conservação de determinados registros.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.2. Consentimento para comunicações</h3>
              <p>Quando aplicável, o recebimento de comunicações por WhatsApp, e-mail ou outro canal será informado ao titular no momento da coleta.</p>
              <p className="mt-2">A campanha utilizará os dados de contato de acordo com a autorização e as finalidades apresentadas ao titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.3. Consentimento para cookies e tecnologias não essenciais</h3>
              <p>Cookies ou tecnologias analíticas, publicitárias ou de rastreamento que dependam de consentimento somente deverão ser ativados após a escolha do titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.4. Legítimo interesse</h3>
              <p>O legítimo interesse poderá ser utilizado, quando juridicamente cabível, para tratamentos de dados pessoais não sensíveis relacionados, por exemplo, à segurança do site, prevenção de abuso, funcionamento técnico e proteção de direitos, após análise da necessidade e dos direitos e expectativas do titular.</p>
              <p className="mt-2 font-bold">O legítimo interesse não será utilizado como fundamento para tratar opinião política ou outros dados pessoais sensíveis.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.5. Cumprimento de obrigação legal ou regulatória</h3>
              <p>Dados poderão ser conservados ou tratados quando necessários para o cumprimento de obrigações legais, eleitorais ou regulatórias.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">6.6. Exercício regular de direitos</h3>
              <p>Dados poderão ser tratados ou conservados quando necessários à formulação, ao exercício ou à defesa de direitos em processos judiciais, administrativos ou eleitorais.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">7. Comunicações por WhatsApp, e-mail e outros canais</h2>
              <p>Quando autorizado e observadas as regras aplicáveis, a campanha poderá enviar comunicações relacionadas à candidatura por WhatsApp, e-mail ou outros canais informados ao titular.</p>
              <p className="mt-4">As comunicações poderão envolver:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>informações sobre a campanha;</li>
                <li>avisos;</li>
                <li>materiais;</li>
                <li>conteúdos;</li>
                <li>convites;</li>
                <li>agenda e atividades;</li>
                <li>informações relacionadas à candidatura.</li>
              </ul>
              <p className="mt-4">A campanha buscará limitar as comunicações às finalidades informadas no momento do cadastro.</p>
              <p className="mt-4">As mensagens eleitorais deverão permitir a identificação do remetente e disponibilizar forma para solicitação de descadastramento e eliminação dos dados pessoais.</p>
              <p className="mt-4">O pedido poderá ser realizado pelo próprio canal utilizado, quando disponível, ou pelo e-mail:</p>
              <p className="mt-2 font-bold"><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></p>
              <p className="mt-4">Pedidos de descadastramento e eliminação relacionados às mensagens eleitorais serão tratados dentro do prazo previsto na regulamentação eleitoral aplicável.</p>
              <p className="mt-4">A campanha não realizará telemarketing eleitoral vedado nem contratará disparo em massa irregular de mensagens.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">8. Revogação de consentimento e descadastramento</h2>
              <p>Quando o tratamento depender de consentimento, o titular poderá solicitar sua revogação por procedimento gratuito e facilitado.</p>
              <p className="mt-4">Também poderá solicitar o descadastramento do recebimento de comunicações.</p>
              <p className="mt-4">A solicitação poderá ser realizada:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>pelo próprio meio disponibilizado na comunicação; ou</li>
                <li>pelo e-mail <strong><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></strong>.</li>
              </ul>
              <p className="mt-4">A revogação do consentimento não torna ilícitos os tratamentos realizados legitimamente antes da solicitação.</p>
              <p className="mt-4">Após a revogação, os dados deixarão de ser utilizados para a finalidade baseada naquele consentimento, ressalvadas as hipóteses legais de conservação necessárias para cumprimento de obrigação legal, exercício regular de direitos, comprovação do próprio pedido de descadastramento ou outras situações permitidas pela legislação.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">9. Cookies e tecnologias semelhantes</h2>
              <p>O site poderá utilizar cookies e tecnologias semelhantes para funcionalidades técnicas, segurança, análise de funcionamento e, quando autorizado, mensuração de campanhas e publicidade digital.</p>
              <p className="mt-4">A existência e a utilização efetiva de cada ferramenta dependerão das tecnologias instaladas no site no momento da navegação.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies necessários</h3>
              <p>São aqueles indispensáveis ao funcionamento técnico, segurança, prevenção de fraude, manutenção de preferências essenciais ou prestação de funcionalidades solicitadas pelo usuário.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies analíticos</h3>
              <p>Podem ser utilizados para compreender, de forma agregada ou individualizada conforme a ferramenta, como as pessoas acessam e utilizam o site.</p>
              <p className="mt-2">Quando o uso desses cookies depender de consentimento, eles permanecerão desativados até a manifestação do titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Cookies de marketing e publicidade</h3>
              <p>Podem ser utilizados, quando legalmente permitido e autorizado, para mensuração de publicidade, eventos de conversão e outras funcionalidades publicitárias compatíveis com a legislação eleitoral e com as políticas da plataforma utilizada.</p>
              <p className="mt-2">Quando dependerem de consentimento, permanecerão desativados até a autorização do titular.</p>

              <h3 className="text-lg font-bold text-dark mt-6 mb-2">Preferências</h3>
              <p>O site deverá oferecer mecanismo que permita:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>aceitar cookies não essenciais;</li>
                <li>rejeitar cookies não essenciais;</li>
                <li>gerenciar preferências, quando houver mais de uma categoria;</li>
                <li>alterar posteriormente as escolhas realizadas.</li>
              </ul>
              <p className="mt-4">A rejeição de cookies não essenciais não deverá impedir o acesso às funcionalidades básicas do site.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">10. Analytics, pixels, tags e publicidade digital</h2>
              <p>A campanha poderá utilizar ferramentas técnicas de analytics, gerenciamento de tags, mensuração e publicidade digital que sejam efetivamente necessárias às suas atividades e permitidas pela legislação e pelas políticas das plataformas utilizadas.</p>
              <p className="mt-4">Entre as ferramentas que poderão ser utilizadas, conforme a configuração efetiva do site, estão serviços de:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>analytics;</li>
                <li>gerenciamento de tags;</li>
                <li>mensuração de conversões;</li>
                <li>publicidade digital;</li>
                <li>CRM;</li>
                <li>formulários;</li>
                <li>comunicação;</li>
                <li>hospedagem e segurança.</li>
              </ul>
              <p className="mt-4">A menção a uma categoria de tecnologia nesta Política não significa, por si só, que todas as ferramentas possíveis dessa categoria estejam instaladas ou ativas no site.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">11. Remarketing, públicos personalizados e perfilamento</h2>
              <p>O preenchimento do formulário <strong>“Você está com a gente?” não autoriza automaticamente</strong> a campanha a utilizar nome, WhatsApp, e-mail, CEP ou a manifestação política do titular para criação de públicos personalizados, Custom Audiences, listas de remarketing, públicos semelhantes ou compartilhamento dessas informações com plataformas de publicidade.</p>
              <p className="mt-4">Caso a campanha pretenda realizar operação desse tipo utilizando dados identificáveis fornecidos diretamente pelo titular, deverá verificar previamente:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>a finalidade específica;</li>
                <li>a base legal aplicável;</li>
                <li>a necessidade de consentimento específico;</li>
                <li>a transparência oferecida ao titular;</li>
                <li>o compartilhamento de dados envolvido;</li>
                <li>a possibilidade de exercício dos direitos do titular;</li>
                <li>a política vigente da plataforma utilizada;</li>
                <li>as regras eleitorais aplicáveis.</li>
              </ul>
              <p className="mt-4">Quando houver perfilamento ou microdirecionamento de propaganda eleitoral, serão disponibilizadas informações adequadas sobre o tratamento realizado, nos termos da legislação aplicável.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">12. Fornecedores e operadores</h2>
              <p>Para operar seus canais digitais, a campanha poderá utilizar fornecedores de tecnologia.</p>
              <p className="mt-4">Conforme a configuração efetivamente utilizada, poderão estar envolvidos serviços como:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li><strong>Hostinger</strong>, para hospedagem e infraestrutura;</li>
                <li><strong>RD Station</strong>, para CRM, formulários, automações e gestão de contatos;</li>
                <li>ferramentas de analytics;</li>
                <li>gerenciadores de tags;</li>
                <li>plataformas de mídia;</li>
                <li>ferramentas de comunicação;</li>
                <li>serviços de e-mail;</li>
                <li>ferramentas de segurança, anti-spam e prevenção de abuso.</li>
              </ul>
              <p className="mt-4">Esses fornecedores poderão atuar como operadores de dados em nome da campanha ou, em determinadas situações, como controladores independentes, de acordo com a natureza de suas atividades.</p>
              <p className="mt-4">O acesso de fornecedores aos dados deverá ser limitado ao necessário para a prestação dos serviços contratados.</p>
              <p className="mt-4">A campanha não vende dados pessoais.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">13. Compartilhamento de dados</h2>
              <p>Os dados poderão ser compartilhados somente quando necessário e compatível com as finalidades informadas, inclusive:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>com fornecedores que operam site, hospedagem, CRM, formulários e segurança;</li>
                <li>com fornecedores responsáveis por ferramentas de comunicação autorizadas;</li>
                <li>com prestadores de serviços técnicos que necessitem de acesso para executar atividades da campanha;</li>
                <li>com autoridades públicas, Justiça Eleitoral, ANPD ou outros órgãos competentes, quando houver obrigação ou determinação válida;</li>
                <li>para exercício regular de direitos.</li>
              </ul>
              <p className="mt-4">O compartilhamento de dados pessoais sensíveis ou de dados capazes de revelar opinião política receberá tratamento reforçado.</p>
              <p className="mt-4">Quando a operação depender de consentimento específico para compartilhamento com terceiro ou plataforma, esse consentimento deverá ser obtido antes da operação.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">14. Separação entre campanha, mandato, projetos e outras bases</h2>
              <p>Dados coletados no contexto desta campanha eleitoral serão tratados de acordo com as finalidades informadas nesta Política e no momento da coleta.</p>
              <p className="mt-4">O fato de uma pessoa ter fornecido dados anteriormente em outro contexto — por exemplo, mandato, projeto social, associação, evento, ação temática, prestação de serviço ou cadastro de natureza diferente — <strong>não significa automaticamente que esses dados possam ser incorporados à base eleitoral da campanha</strong>.</p>
              <p className="mt-4">Da mesma forma, os dados coletados por esta campanha não serão automaticamente transferidos, ao término da eleição, para eventual mandato, organização, empresa, associação ou outro projeto para finalidade diferente.</p>
              <p className="mt-4">Qualquer reutilização para nova finalidade deverá observar a compatibilidade da finalidade original, a base legal aplicável, os deveres de transparência e, quando exigido, novo consentimento.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">15. Transferência internacional de dados</h2>
              <p>Alguns fornecedores tecnológicos utilizados pela campanha poderão realizar armazenamento ou processamento de dados fora do Brasil.</p>
              <p className="mt-4">Quando houver transferência internacional, serão observadas as exigências da LGPD e as regras aplicáveis à transferência internacional de dados pessoais.</p>
              <p className="mt-4">A campanha buscará utilizar fornecedores que ofereçam mecanismos de proteção compatíveis com a legislação aplicável.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">16. Retenção e eliminação dos dados</h2>
              <p>Os dados serão mantidos apenas pelo período necessário para cumprir as finalidades informadas e as obrigações legais aplicáveis.</p>
              <p className="mt-4">Os dados utilizados para manifestação de apoio e comunicação eleitoral serão revisados ao término da campanha, considerando:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>o encerramento da finalidade eleitoral;</li>
                <li>eventual revogação de consentimento;</li>
                <li>pedidos de eliminação;</li>
                <li>necessidade de manutenção de registros de conformidade;</li>
                <li>obrigações legais ou eleitorais;</li>
                <li>exercício regular de direitos;</li>
                <li>processos administrativos, judiciais ou eleitorais em andamento.</li>
              </ul>
              <p className="mt-4">Dados que não possuam mais finalidade ou fundamento para conservação serão eliminados ou anonimizados, conforme aplicável.</p>
              <p className="mt-4">Registros mínimos relacionados a consentimento, revogação, descadastramento ou operações de tratamento poderão ser conservados quando necessários para cumprimento de obrigação legal ou demonstração de conformidade.</p>
              <p className="mt-4">A campanha manterá o registro das operações de tratamento pelo período exigido pela regulamentação eleitoral aplicável às Eleições 2026.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">17. Segurança da informação</h2>
              <p>A campanha adotará medidas técnicas e administrativas compatíveis com os riscos envolvidos no tratamento realizado.</p>
              <p className="mt-4">Essas medidas poderão incluir:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>utilização de HTTPS;</li>
                <li>controle individualizado de acessos;</li>
                <li>restrição de acesso às pessoas que necessitem tratar os dados;</li>
                <li>senhas fortes;</li>
                <li>autenticação adicional quando disponível;</li>
                <li>revisão periódica de usuários e permissões;</li>
                <li>procedimentos de backup;</li>
                <li>medidas contra spam e abuso de formulários;</li>
                <li>proteção dos sistemas de CRM;</li>
                <li>cuidado com exportações de bases;</li>
                <li>restrição de compartilhamento de arquivos contendo dados pessoais;</li>
                <li>orientações à equipe sobre proteção de dados;</li>
                <li>monitoramento e resposta a incidentes.</li>
              </ul>
              <p className="mt-4">Nenhum sistema tecnológico é totalmente imune a incidentes.</p>
              <p className="mt-4">Caso ocorra incidente de segurança capaz de gerar risco ou dano relevante, a campanha adotará as providências exigidas pela legislação, incluindo avaliação e eventual comunicação às autoridades competentes e aos titulares afetados.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">18. Direitos dos titulares</h2>
              <p>O titular poderá exercer os direitos previstos na LGPD, conforme aplicável, incluindo:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>confirmação da existência de tratamento;</li>
                <li>acesso aos dados;</li>
                <li>correção de dados incompletos, inexatos ou desatualizados;</li>
                <li>anonimização, bloqueio ou eliminação de dados desnecessários, excessivos ou tratados em desconformidade;</li>
                <li>eliminação de dados tratados com base em consentimento, ressalvadas as hipóteses legais de conservação;</li>
                <li>informação sobre compartilhamento;</li>
                <li>informação sobre a possibilidade de não fornecer consentimento e suas consequências;</li>
                <li>revogação do consentimento;</li>
                <li>oposição ao tratamento, quando cabível;</li>
                <li>portabilidade, quando aplicável;</li>
                <li>revisão de decisões tomadas unicamente com base em tratamento automatizado, quando aplicável.</li>
              </ul>
              <p className="mt-4">As solicitações poderão ser encaminhadas para:</p>
              <p className="mt-2 font-bold"><a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></p>
              <p className="mt-4">Para proteger os próprios dados do titular, a campanha poderá solicitar informações mínimas necessárias para confirmar a identidade da pessoa que realiza o pedido.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">19. Registro das operações de tratamento</h2>
              <p>A campanha manterá registro das operações de tratamento de dados pessoais conforme exigido pela regulamentação eleitoral.</p>
              <p className="mt-4">O registro deverá contemplar, conforme aplicável:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>tipos e origem dos dados;</li>
                <li>categorias de titulares;</li>
                <li>processos e finalidades;</li>
                <li>fundamentos jurídicos utilizados;</li>
                <li>duração prevista do tratamento;</li>
                <li>período de armazenamento;</li>
                <li>fluxos de compartilhamento;</li>
                <li>fornecedores envolvidos;</li>
                <li>atribuições de controladores e operadores;</li>
                <li>medidas de segurança utilizadas.</li>
              </ul>
              <p className="mt-4">Os registros serão mantidos pelo período determinado pela regulamentação eleitoral e por período adicional quando sua conservação for necessária em razão de processo ou obrigação legal.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">20. Crianças e adolescentes</h2>
              <p>Os formulários destinados à manifestação de apoio e relacionamento eleitoral não têm como objetivo a coleta de dados pessoais de crianças.</p>
              <p className="mt-4">Caso a campanha identifique tratamento de dados de criança ou adolescente, serão avaliadas as circunstâncias concretas e adotadas as medidas de proteção exigidas pela legislação, considerando o melhor interesse e as normas específicas aplicáveis.</p>
              <p className="mt-4">A campanha poderá remover cadastros ou limitar o tratamento quando não for possível assegurar a conformidade necessária.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">21. Pesquisas, doações, voluntariado e novas funcionalidades</h2>
              <p>O formulário <strong>“Você está com a gente?”</strong> não constitui pesquisa eleitoral formal de intenção de voto.</p>
              <p className="mt-4">Caso o site venha a oferecer, futuramente, funcionalidades diferentes das atualmente descritas — como doações eleitorais, pesquisas, inscrições específicas de voluntariado, atendimento automatizado, eventos ou outros serviços — as informações de privacidade e os mecanismos de coleta deverão ser revisados antes do início do novo tratamento.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">22. Alterações desta Política</h2>
              <p>Esta Política poderá ser atualizada em razão de:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li>mudanças nas funcionalidades do site;</li>
                <li>inclusão ou remoção de formulários;</li>
                <li>alteração de fornecedores;</li>
                <li>mudanças nas finalidades de tratamento;</li>
                <li>alteração das tecnologias utilizadas;</li>
                <li>mudanças na legislação eleitoral ou de proteção de dados;</li>
                <li>orientações ou determinações de autoridades competentes.</li>
              </ul>
              <p className="mt-4">A versão atualizada permanecerá disponível em <strong><a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></strong>, acompanhada da data da última atualização.</p>
              <p className="mt-4">Quando uma mudança envolver finalidade que dependa de novo consentimento, a mera atualização desta Política não substituirá a obtenção da autorização necessária.</p>
            </section>

            <hr className="border-gray-200" />

            <section>
              <h2 className="text-xl font-black text-dark mb-4 uppercase tracking-wide">23. Contato</h2>
              <p>Para dúvidas sobre esta Política, solicitações de titulares, revogação de consentimento, descadastramento ou pedidos relacionados ao tratamento de dados pessoais:</p>
              <ul className="list-disc pl-6 space-y-2 mt-4 text-gray-600">
                <li><strong>Campanha:</strong> ELEIÇÃO 2026 RAFAEL SARAIVA GAIA DEPUTADO ESTADUAL</li>
                <li><strong>CNPJ eleitoral:</strong> 68.283.115/0001-74</li>
                <li><strong>E-mail:</strong> <a href="mailto:marketing@rafaelsaraivasp.com.br">marketing@rafaelsaraivasp.com.br</a></li>
                <li><strong>Responsável pelo atendimento:</strong> Equipe Rafael Saraiva</li>
                <li><strong>Encarregado pelo tratamento de dados:</strong> Diogo Santos Barbosa</li>
                <li><strong>Site:</strong> <a href="http://www.rafaelsaraivasp.com.br" target="_blank" rel="noopener noreferrer">www.rafaelsaraivasp.com.br</a></li>
              </ul>
              <p className="mt-4">O titular poderá utilizar esse canal para exercer os direitos previstos na legislação aplicável.</p>
            </section>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
    </>
  );
};
