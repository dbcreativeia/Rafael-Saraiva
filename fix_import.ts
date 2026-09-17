import fs from 'fs';
let content = fs.readFileSync('server.ts', 'utf-8');
content = 'import { getCrmSummary, getCrmPaginated } from "./crmService.ts";\n' + content;
fs.writeFileSync('server.ts', content, 'utf-8');
