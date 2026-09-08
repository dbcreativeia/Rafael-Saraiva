const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// Fix wrong lucide import injection
code = code.replace(/import \{\n  ShieldCheck, MapContainer/g, "import { MapContainer");
if (!code.includes("ShieldCheck")) {
  code = code.replace(/import \{/, "import {\n  ShieldCheck,");
}

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
