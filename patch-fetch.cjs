const fs = require('fs');
let code = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

code = code.replace(/const text = await res\.text\(\);\n\s*try \{\n\s*const data = JSON\.parse\(text\);\n\s*setImportedBases\(data\);\n\s*\} catch \(parseErr\) \{\n\s*console\.error\('Invalid JSON response from \/api\/imported-leads\/campaigns:', text\.substring\(0, 50\)\);\n\s*\}/g, `const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await res.json();
          setImportedBases(data);
        }`);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', code);
console.log('patched');
