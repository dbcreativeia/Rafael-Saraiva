const fs = require('fs');

let code = fs.readFileSync('src/components/Navbar.tsx', 'utf-8');

code = code.replace(
  '  return (\n    <header',
  '  if (location.hash === \'#admin\') return null;\n\n  return (\n    <header'
);

fs.writeFileSync('src/components/Navbar.tsx', code);
