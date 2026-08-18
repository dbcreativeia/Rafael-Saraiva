const fs = require('fs');

let content = fs.readFileSync('src/components/NinaPassadore.tsx', 'utf8');

// I also need to adjust the top image margin to match the reference better
content = content.replace(
  'className="w-full max-w-2xl object-contain hover:scale-[1.02] transition-transform duration-300"',
  'className="w-full max-w-2xl object-contain hover:scale-[1.02] transition-transform duration-300 -mb-8 relative z-20"'
);

fs.writeFileSync('src/components/NinaPassadore.tsx', content);

