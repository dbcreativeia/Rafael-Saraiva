const fs = require('fs');
const content = fs.readFileSync('src/components/NinaPassadore.tsx', 'utf8');
const lines = content.split('\n');
const start = lines.findIndex(l => l.includes('<div className="grid grid-cols-2 gap-4 md:gap-8 items-end'));
const end = lines.findIndex((l, i) => i > start && l.includes('</motion.div>'));
console.log(lines.slice(start, end).join('\n'));
