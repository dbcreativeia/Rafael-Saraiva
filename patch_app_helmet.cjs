const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf-8');

if (!code.includes("import { Helmet }")) {
  code = code.replace("import { motion }", "import { motion } from 'motion/react';\nimport { Helmet } from 'react-helmet-async';");
}

code = code.replace(
  '  return (\n    <main className="overflow-x-hidden',
  `  return (
    <>
      <Helmet>
        <title>Deputado Rafael Saraiva | Defesa da Causa Animal em SP</title>
        <meta name="title" content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP" />
        <meta name="description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e o Instituto ELPA." />
        <meta name="keywords" content="Rafael Saraiva, Deputado Estadual SP, Causa Animal, Proteção Animal, Instituto ELPA, Política São Paulo, Animais, São Paulo" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://rafaelsaraiva.com.br/" />
        <meta property="og:title" content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP" />
        <meta property="og:description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo." />
        <meta property="og:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content="https://rafaelsaraiva.com.br/" />
        <meta property="twitter:title" content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP" />
        <meta property="twitter:description" content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo." />
        <meta property="twitter:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
      </Helmet>
    <main className="overflow-x-hidden`
);

code = code.replace(
  '      <Footer />\n    </main>\n  );\n}',
  '      <Footer />\n    </main>\n    </>\n  );\n}'
);

fs.writeFileSync('src/App.tsx', code);
