const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');
code = code.replace(/  ShieldCheck,   ShieldCheck,/g, "");
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
