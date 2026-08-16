const fs = require('fs');

let code = fs.readFileSync('src/components/PrivacyPolicy.tsx', 'utf-8');

if (!code.includes("import { Helmet }")) {
  code = code.replace("import { Footer } from './Footer';", "import { Footer } from './Footer';\nimport { Helmet } from 'react-helmet-async';");
}

code = code.replace(
  '  return (\n    <div className="min-h-screen',
  `  return (
    <>
      <Helmet>
        <title>Política de Privacidade | Deputado Rafael Saraiva</title>
        <meta name="title" content="Política de Privacidade | Deputado Rafael Saraiva" />
        <meta name="description" content="Conheça nossa Política de Privacidade e como o Deputado Rafael Saraiva protege seus dados de acordo com a LGPD." />
        <meta name="keywords" content="Política de Privacidade, LGPD, Proteção de Dados, Rafael Saraiva" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/politica-de-privacidade" />
        <meta property="og:title" content="Política de Privacidade | Deputado Rafael Saraiva" />
        <meta property="og:description" content="Conheça nossa Política de Privacidade e como o Deputado Rafael Saraiva protege seus dados de acordo com a LGPD." />
        <meta property="og:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/politica-de-privacidade" />
        <meta property="twitter:title" content="Política de Privacidade | Deputado Rafael Saraiva" />
        <meta property="twitter:description" content="Conheça nossa Política de Privacidade e como o Deputado Rafael Saraiva protege seus dados de acordo com a LGPD." />
        <meta property="twitter:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
      </Helmet>
    <div className="min-h-screen`
);

code = code.replace(
  '      <Footer />\n    </div>\n  );\n};',
  '      <Footer />\n    </div>\n    </>\n  );\n};'
);

fs.writeFileSync('src/components/PrivacyPolicy.tsx', code);
