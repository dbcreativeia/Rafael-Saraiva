import fs from 'fs';
let content = fs.readFileSync('crmService.ts', 'utf-8');

content = content.replace(
  "} else if (multiAction === 'multi') {\n    whereClauses.push('l.campaign_count >= 2');",
  "} else if (multiAction === 'multi') {\n    whereClauses.push('l.campaign_count >= 3');"
);

fs.writeFileSync('crmService.ts', content, 'utf-8');
console.log("fixed filter mapping in backend multi = 3");
