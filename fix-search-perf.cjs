const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');

// 1. Add useDeferredValue to import
content = content.replace(
  "import React, { useState, useEffect, useMemo, useRef } from 'react';",
  "import React, { useState, useEffect, useMemo, useRef, useDeferredValue } from 'react';"
);

// 2. Add deferredSearch hook
content = content.replace(
  "  const [search, setSearch] = useState('');",
  "  const [search, setSearch] = useState('');\n  const deferredSearch = useDeferredValue(search);"
);

// 3. Update filteredLeads useMemo dependencies
content = content.replace(
  "  }, [consolidatedLeads, search, estadoFilter, cidadeFilter, multiActionFilter, campaignFilter, sortField, sortOrder]);",
  "  }, [consolidatedLeads, deferredSearch, estadoFilter, cidadeFilter, multiActionFilter, campaignFilter, sortField, sortOrder]);"
);

// 4. Optimize the filter function
content = content.replace(
  "  const filteredLeads = useMemo(() => {",
  "  const filteredLeads = useMemo(() => {\n    const q = deferredSearch.toLowerCase().trim();\n"
);

content = content.replace(
  "      // 1. Search filter (Name, WhatsApp, Email, City, Address, CEP)\n      if (search.trim()) {\n        const q = search.toLowerCase().trim();\n        const matchNome = lead.nome.toLowerCase().includes(q);\n        const matchPhone = lead.whatsapp.toLowerCase().includes(q);\n        const matchEmail = lead.email.toLowerCase().includes(q);\n        const matchCidade = lead.cidade.toLowerCase().includes(q);\n        const matchBairro = lead.bairro.toLowerCase().includes(q);\n        const matchCep = lead.cep.toLowerCase().includes(q);\n        const matchCampaign = lead.distinctCampaigns.some(c => c.toLowerCase().includes(q));\n        if (!matchNome && !matchPhone && !matchEmail && !matchCidade && !matchBairro && !matchCep && !matchCampaign) {\n          return false;\n        }\n      }",
  "      // 1. Search filter (Name, WhatsApp, Email, City, Address, CEP)\n      if (q) {\n        const matchNome = lead.nome.toLowerCase().includes(q);\n        const matchPhone = lead.whatsapp.toLowerCase().includes(q);\n        const matchEmail = lead.email.toLowerCase().includes(q);\n        const matchCidade = (lead.cidade || '').toLowerCase().includes(q);\n        const matchBairro = (lead.bairro || '').toLowerCase().includes(q);\n        const matchCep = (lead.cep || '').toLowerCase().includes(q);\n        const matchCampaign = lead.distinctCampaigns.some(c => c.toLowerCase().includes(q));\n        if (!matchNome && !matchPhone && !matchEmail && !matchCidade && !matchBairro && !matchCep && !matchCampaign) {\n          return false;\n        }\n      }"
);

// Add the "export by complete address" button and function
const exportMailMergeExcel = `  const exportMailMergeExcel = () => {
    const listToExport = filteredLeads.length > 0 ? filteredLeads : consolidatedLeads;
    
    // Filtra apenas leads que tem endereço consideravelmente completo
    const completeAddresses = listToExport.filter(lead => {
      return lead.endereco && lead.endereco.trim().length > 3 && 
             lead.numero && lead.numero.trim().length > 0 &&
             lead.cidade && lead.cidade.trim().length > 2 &&
             lead.estado && lead.estado.trim().length > 1 &&
             lead.cep && lead.cep.trim().length >= 8;
    });
    
    if (completeAddresses.length === 0) {
      alert("Nenhum lead com endereço completo encontrado.");
      return;
    }

    const data = completeAddresses.map(lead => {
      return {
        'Nome Completo': lead.nome,
        'WhatsApp / Telefone': lead.whatsapp || 'Não informado',
        'Endereço': lead.endereco ? \`\${lead.endereco}, \${lead.numero || 'S/N'} \${lead.complemento ? \`(\${lead.complemento})\` : ''}\`.trim() : '',
        'Bairro': lead.bairro || '',
        'Cidade': lead.cidade || 'São Paulo',
        'Estado': lead.estado || 'SP',
        'CEP': lead.cep || ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Endereços Postais');
    
    const count = completeAddresses.length;
    XLSX.writeFile(workbook, \`Enderecos_Correios_N\${count}_\${new Date().toISOString().split('T')[0]}.xlsx\`);
  };

  // Export Unified List to Excel (.xlsx)`;

content = content.replace("  // Export Unified List to Excel (.xlsx)", exportMailMergeExcel);

// Now find where to put the button in the UI. We need to look for `exportConsolidatedExcel` in the JSX.
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
