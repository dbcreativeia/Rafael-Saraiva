const fs = require('fs');
let content = fs.readFileSync('src/components/admin/CentralLeadsTab.tsx', 'utf8');
content = content.replace(
  "  // Global KPIs",
  "  useEffect(() => {\n    setCurrentPage(1);\n  }, [search, estadoFilter, cidadeFilter, multiActionFilter, campaignFilter, sortField, sortOrder]);\n\n  // Paginated Leads\n  const paginatedLeads = useMemo(() => {\n    const startIndex = (currentPage - 1) * itemsPerPage;\n    return filteredLeads.slice(startIndex, startIndex + itemsPerPage);\n  }, [filteredLeads, currentPage, itemsPerPage]);\n\n  const totalPages = Math.ceil(filteredLeads.length / itemsPerPage);\n\n  // Global KPIs"
);
content = content.replace(
  "{filteredLeads.map((lead) => {",
  "{paginatedLeads.map((lead) => {"
);
fs.writeFileSync('src/components/admin/CentralLeadsTab.tsx', content);
