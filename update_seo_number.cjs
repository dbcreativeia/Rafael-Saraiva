const fs = require('fs');

function updateFile(filePath, replacements) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf-8');
  for (const [search, replace] of replacements) {
    // using split and join for global replacement of exact strings
    content = content.split(search).join(replace);
  }
  fs.writeFileSync(filePath, content);
}

// 1. index.html
updateFile('index.html', [
  ['Deputado Rafael Saraiva | Defesa', 'Deputado Rafael Saraiva 44077 | Defesa'],
  ['Deputado Estadual Rafael Saraiva e', 'Deputado Estadual Rafael Saraiva 44077 e'],
  ['Rafael Saraiva, Deputado', 'Rafael Saraiva 44077, Rafael Saraiva, Deputado']
]);

// 2. src/App.tsx
updateFile('src/App.tsx', [
  ['Deputado Rafael Saraiva | Defesa', 'Deputado Rafael Saraiva 44077 | Defesa'],
  ['Deputado Estadual Rafael Saraiva e', 'Deputado Estadual Rafael Saraiva 44077 e'],
  ['Rafael Saraiva, Deputado', 'Rafael Saraiva 44077, Rafael Saraiva, Deputado']
]);

// 3. src/components/MaterialCampanha.tsx
updateFile('src/components/MaterialCampanha.tsx', [
  ['Material de Campanha | Deputado Rafael Saraiva', 'Material de Campanha | Rafael Saraiva 44077'],
  ['Deputado Rafael Saraiva. Ajude', 'Rafael Saraiva 44077. Ajude'],
  ['Deputado Rafael Saraiva."', 'Rafael Saraiva 44077."'],
  ['Material de Campanha, Rafael Saraiva', 'Material de Campanha, Rafael Saraiva 44077, Rafael Saraiva']
]);

// 4. src/components/CodigoAnimal.tsx
updateFile('src/components/CodigoAnimal.tsx', [
  ['Código Animal Municipal | Deputado Rafael Saraiva', 'Código Animal Municipal | Rafael Saraiva 44077'],
  ['Código Animal, Proteção Animal, Lei Animal, Rafael Saraiva', 'Código Animal, Proteção Animal, Lei Animal, Rafael Saraiva 44077, Rafael Saraiva']
]);

// 5. src/components/ContraMausTratos.tsx
updateFile('src/components/ContraMausTratos.tsx', [
  ['Abaixo-assinado Contra Maus-Tratos | Deputado Rafael Saraiva', 'Abaixo-assinado Contra Maus-Tratos | Rafael Saraiva 44077'],
  ['Abaixo-assinado Contra Maus-Tratos | Rafael Saraiva e', 'Abaixo-assinado Contra Maus-Tratos | Rafael Saraiva 44077 e'],
  ['Rafael Saraiva e Aline', 'Rafael Saraiva 44077 e Aline']
]);

// 6. src/components/Jogo.tsx
updateFile('src/components/Jogo.tsx', [
  ['Jogo do Mandato | Deputado Rafael Saraiva', 'Jogo do Mandato | Rafael Saraiva 44077'],
  ['Deputado Rafael Saraiva, resgate', 'Rafael Saraiva 44077, resgate']
]);

// 7. src/components/PrivacyPolicy.tsx
updateFile('src/components/PrivacyPolicy.tsx', [
  ['Política de Privacidade | Deputado Rafael Saraiva', 'Política de Privacidade | Rafael Saraiva 44077'],
  ['Deputado Rafael Saraiva protege', 'Rafael Saraiva 44077 protege'],
  ['Proteção de Dados, Rafael Saraiva', 'Proteção de Dados, Rafael Saraiva 44077, Rafael Saraiva']
]);

console.log("SEO updated with 44077!");
