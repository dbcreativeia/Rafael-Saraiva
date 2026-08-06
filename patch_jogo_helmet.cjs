const fs = require('fs');

let content = fs.readFileSync('src/components/Jogo.tsx', 'utf-8');

// Add import
const importTarget = `import { Trophy, ArrowLeft, Play, ArrowRight, RotateCcw, Eye, EyeOff, User, Lock, Mail, Phone, MapPin, Building } from 'lucide-react';`;
const importReplacement = `import { Trophy, ArrowLeft, Play, ArrowRight, RotateCcw, Eye, EyeOff, User, Lock, Mail, Phone, MapPin, Building } from 'lucide-react';
import { Helmet } from 'react-helmet-async';`;

content = content.replace(importTarget, importReplacement);

// Add Helmet inside return
const returnTarget = `  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-0 font-sans overflow-hidden">`;

const returnReplacement = `  return (
    <>
      <Helmet>
        <title>Jogo do Mandato | Deputado Rafael Saraiva</title>
        <meta name="title" content="Jogo do Mandato | Deputado Rafael Saraiva" />
        <meta name="description" content="Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Jogo do Mandato | Deputado Rafael Saraiva" />
        <meta property="og:description" content="Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="og:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:title" content="Jogo do Mandato | Deputado Rafael Saraiva" />
        <meta property="twitter:description" content="Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!" />
        <meta property="twitter:image" content="https://lh3.googleusercontent.com/d/1LTl540agD9Vz8CK3qckzHvifJrY2bYcG" />
      </Helmet>
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center p-0 font-sans overflow-hidden">`;

content = content.replace(returnTarget, returnReplacement);

const returnEndTarget = `      </AnimatePresence>
    </div>
  );
};`;
const returnEndReplacement = `      </AnimatePresence>
    </div>
    </>
  );
};`;

content = content.replace(returnEndTarget, returnEndReplacement);

fs.writeFileSync('src/components/Jogo.tsx', content);
