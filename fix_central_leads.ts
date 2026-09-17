import fs from 'fs';
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf-8');

// 1. Add frequentLeadsCount to summary interface
content = content.replace(
  'multiActionLeadsCount: number;',
  'frequentLeadsCount?: number;\n    multiActionLeadsCount: number;'
);

// 2. Add frequentLeadsCount to summary state default
content = content.replace(
  'multiActionLeadsCount: 0,',
  'frequentLeadsCount: 0,\n    multiActionLeadsCount: 0,'
);

// 3. Extract frequentLeadsCount
content = content.replace(
  'const multiActionLeadsCount = summary?.multiActionLeadsCount ?? 0;',
  'const frequentLeadsCount = summary?.frequentLeadsCount ?? 0;\n  const multiActionLeadsCount = summary?.multiActionLeadsCount ?? 0;'
);

// 4. Update Frequentes 2+ button
content = content.replace(
  'Frequentes 2+ ({(summary?.frequentLeadsCount || 31778).toLocaleString(\'pt-BR\')})',
  'Frequentes 2+ ({frequentLeadsCount.toLocaleString(\'pt-BR\')})'
);

// 5. Update Multi-Campanhas 3+ button
content = content.replace(
  'Multi-Campanhas 3+ ({(summary?.multiActionLeadsCount || 9638).toLocaleString(\'pt-BR\')})',
  'Multi-Campanhas 3+ ({multiActionLeadsCount.toLocaleString(\'pt-BR\')})'
);

// 6. Update Super Apoiadores 5+ button
content = content.replace(
  'Super Apoiadores 5+ ({(summary?.superSupportersCount || 4825).toLocaleString(\'pt-BR\')})',
  'Super Apoiadores 5+ ({superSupportersCount.toLocaleString(\'pt-BR\')})'
);

fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content, 'utf-8');
console.log("fixed CentralLeadsTab");
