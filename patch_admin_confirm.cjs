const fs = require('fs');
let content = fs.readFileSync('src/components/AdminDashboard.tsx', 'utf-8');

content = content.replace(
  'if (!window.confirm("Tem certeza que deseja remover este cadastro?")) return;',
  ''
);

content = content.replace(
  'if (!window.confirm("Tem certeza que deseja apagar este registro?")) return;',
  ''
);

fs.writeFileSync('src/components/AdminDashboard.tsx', content);
