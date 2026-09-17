import fs from "fs";

let content = fs.readFileSync("src/components/admin/CentralLeadsTab.tsx", "utf-8");

content = content.replace(
  /\{\(summary\?\.multiActionLeadsCount \|\| 152860\)\.toLocaleString\('pt-BR'\)\}/,
  "{(summary?.frequentLeadsCount || 0).toLocaleString('pt-BR')}"
);

content = content.replace(
  /\{\(summary\?\.superSupportersCount \|\| 38879\)\.toLocaleString\('pt-BR'\)\}/,
  "{(summary?.superSupportersCount || 0).toLocaleString('pt-BR')}"
);

// We should also replace the hardcoded percentages.
content = content.replace(
  /<span className="truncate">~21,1% da base com múltiplas ações<\/span>/,
  '<span className="truncate">{summary ? ((summary.frequentLeadsCount / summary.totalUniqueLeads) * 100).toFixed(1) : "0"}% da base com múltiplas ações</span>'
);

content = content.replace(
  /<span className="truncate">~5,4% núcleo ativo e mobilizadores<\/span>/,
  '<span className="truncate">{summary ? ((summary.superSupportersCount / summary.totalUniqueLeads) * 100).toFixed(3) : "0"}% núcleo ativo e mobilizadores</span>'
);

fs.writeFileSync("src/components/admin/CentralLeadsTab.tsx", content);
console.log("Fixed UI bindings");
