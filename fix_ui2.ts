import fs from "fs";

let content = fs.readFileSync("src/components/admin/CentralLeadsTab.tsx", "utf-8");

// Pill for Frequent
content = content.replace(
  "<span>Frequentes 2+ ({(summary?.multiActionLeadsCount || 152860).toLocaleString('pt-BR')})</span>",
  "<span>Frequentes 2+ ({(summary?.frequentLeadsCount || 31778).toLocaleString('pt-BR')})</span>"
);

// Pill for Multi
content = content.replace(
  "<span>Super Apoiadores 3+ ({(summary?.superSupportersCount || 64720).toLocaleString('pt-BR')})</span>",
  "<span>Multi-Campanhas 3+ ({(summary?.multiActionLeadsCount || 9638).toLocaleString('pt-BR')})</span>"
);

// Create the third pill for Super Supporters
// Let's find where the Super pill is, actually I overwrote it to Multi. Let's recreate both.
// Wait, in my previous attempt I didn't see a Multi pill in the quick filters. There was only "Frequentes 2+" and "Super Apoiadores 3+".
// Let me check what pills exist.
