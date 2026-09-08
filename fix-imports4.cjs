const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');
code = code.replace(/^import \{\nimport/m, "import");
code = code.replace(/^import \{\nimport/m, "import");
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
