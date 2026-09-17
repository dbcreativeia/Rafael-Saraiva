import fs from "fs";

let content = fs.readFileSync("leadsConsolidation.ts", "utf-8");

// 1. Add isFrequent to interface
content = content.replace(
  "  isMultiAction: boolean;\n  isSuperSupporter?: boolean;",
  "  isFrequent?: boolean;\n  isMultiAction: boolean;\n  isSuperSupporter?: boolean;"
);

// 2. Update updateLeadMultiActionStatus
const updateFuncSearch = `  const hasMultipleSources = distinctSources.size >= 2;
  const hasMultipleDates = distinctDates.size >= 2;
  const hasMultipleActions = totalInteractions >= 2;
  lead.isMultiAction = hasMultipleSources || hasMultipleDates || hasMultipleActions;

  // Super Apoiador (3+ ações / núcleo engajado):
  // - 3 ou mais ações/interações históricas
  // - OU presença em 3 ou mais campanhas distintas
  // - OU presença em 2+ campanhas COM dados completos (WhatsApp + endereço/CEP)
  const hasFullData = !!(lead.whatsapp && (lead.cep || lead.endereco));
  lead.isSuperSupporter = (
    totalInteractions >= 3 ||
    distinctSources.size >= 3
  );`;

const updateFuncReplace = `  lead.isFrequent = (
    totalInteractions >= 2 ||
    distinctSources.size >= 2 ||
    distinctDates.size >= 2
  );

  lead.isMultiAction = (
    totalInteractions >= 3 ||
    distinctSources.size >= 3 ||
    distinctDates.size >= 3
  );

  lead.isSuperSupporter = (
    totalInteractions >= 5 ||
    distinctSources.size >= 5 ||
    distinctDates.size >= 5
  );`;

content = content.replace(updateFuncSearch, updateFuncReplace);

// 3. getPaginatedLeads memory filters
const memoryFilterSearch = `      if (multiAction === 'multi') {
        if (!lead.isMultiAction) return false;
      } else if (multiAction === 'super') {
        if (!lead.isSuperSupporter) return false;
      } else if (multiAction === 'single') {
        if (lead.isMultiAction || lead.isSuperSupporter) return false;
      }`;
const memoryFilterReplace = `      if (multiAction === 'frequent') {
        if (!lead.isFrequent) return false;
      } else if (multiAction === 'multi') {
        if (!lead.isMultiAction) return false;
      } else if (multiAction === 'super') {
        if (!lead.isSuperSupporter) return false;
      } else if (multiAction === 'single') {
        if (lead.isFrequent || lead.isMultiAction || lead.isSuperSupporter) return false;
      }`;
content = content.replace(memoryFilterSearch, memoryFilterReplace);

// 4. getPaginatedLeads DB query whereClauses
const dbFilterSearch = `    if (multiAction === 'multi') {
      whereClauses.push('is_multi_action = TRUE');
    } else if (multiAction === 'super') {
      whereClauses.push('is_super_supporter = TRUE');
    } else if (multiAction === 'single') {
      whereClauses.push('is_multi_action = FALSE AND is_super_supporter = FALSE');
    }`;
const dbFilterReplace = `    if (multiAction === 'frequent') {
      whereClauses.push('is_frequent = TRUE');
    } else if (multiAction === 'multi') {
      whereClauses.push('is_multi_action = TRUE');
    } else if (multiAction === 'super') {
      whereClauses.push('is_super_supporter = TRUE');
    } else if (multiAction === 'single') {
      whereClauses.push('is_frequent = FALSE AND is_multi_action = FALSE AND is_super_supporter = FALSE');
    }`;
content = content.replace(dbFilterSearch, dbFilterReplace);

// 5. mapping imported rows 
// Wait, mapImportedRows needs isFrequent: !!row.is_frequent
content = content.replace(
  "        isMultiAction: !!row.is_multi_action,\n        isSuperSupporter: !!row.is_super_supporter,",
  "        isFrequent: !!row.is_frequent,\n        isMultiAction: !!row.is_multi_action,\n        isSuperSupporter: !!row.is_super_supporter,"
);

// 6. DB creation and update handling in fix_db script later, but we need to check organicLeads memory filters if any
const organicFilterSearch = `        if (multiAction === 'multi' && !lead.isMultiAction) continue;
        if (multiAction === 'super' && !lead.isSuperSupporter) continue;
        if (multiAction === 'single' && (lead.isMultiAction || lead.isSuperSupporter)) continue;`;
const organicFilterReplace = `        if (multiAction === 'frequent' && !lead.isFrequent) continue;
        if (multiAction === 'multi' && !lead.isMultiAction) continue;
        if (multiAction === 'super' && !lead.isSuperSupporter) continue;
        if (multiAction === 'single' && (lead.isFrequent || lead.isMultiAction || lead.isSuperSupporter)) continue;`;
content = content.replace(organicFilterSearch, organicFilterReplace);

// 7. export leads mapping
const exportMapSearch = `      'Multi-Campanha': l.isMultiAction ? 'SIM' : 'NÃO',
      'Super Apoiador': l.isSuperSupporter ? 'SIM' : 'NÃO',`;
const exportMapReplace = `      'Frequente (2+)': l.isFrequent ? 'SIM' : 'NÃO',
      'Multi-Campanha (3+)': l.isMultiAction ? 'SIM' : 'NÃO',
      'Super Apoiador (5+)': l.isSuperSupporter ? 'SIM' : 'NÃO',`;
content = content.replace(exportMapSearch, exportMapReplace);
// actually, export function has two mappings (for csv and for excel)
const exportCsvHeadersSearch = `      const headers = ['Nome', 'WhatsApp', 'Outros Telefones', 'CPF', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Multi-Campanha', 'Super Apoiador', 'Campanhas', 'Primeiro Contato', 'Último Contato', 'Dados Extras'];`;
const exportCsvHeadersReplace = `      const headers = ['Nome', 'WhatsApp', 'Outros Telefones', 'CPF', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Frequente (2+)', 'Multi-Campanha (3+)', 'Super Apoiador (5+)', 'Campanhas', 'Primeiro Contato', 'Último Contato', 'Dados Extras'];`;
content = content.replace(exportCsvHeadersSearch, exportCsvHeadersReplace);

const exportCsvRowSearch = `          l.isMultiAction ? 'SIM' : 'NÃO',
          l.isSuperSupporter ? 'SIM' : 'NÃO',`;
const exportCsvRowReplace = `          l.isFrequent ? 'SIM' : 'NÃO',
          l.isMultiAction ? 'SIM' : 'NÃO',
          l.isSuperSupporter ? 'SIM' : 'NÃO',`;
content = content.replace(exportCsvRowSearch, exportCsvRowReplace);


// also replace in handleSubmission where we initialize a new lead
content = content.replace(
  "        isMultiAction: false,\n        isSuperSupporter: false,",
  "        isFrequent: false,\n        isMultiAction: false,\n        isSuperSupporter: false,"
);

fs.writeFileSync("leadsConsolidation.ts", content);
console.log("Updated leadsConsolidation logic!");
