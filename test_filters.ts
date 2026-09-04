import { leadsConsolidator } from './leadsConsolidation.js';

(async () => {
  // force cache to load
  leadsConsolidator.getSummary();
  await new Promise(r => setTimeout(r, 2000));
  
  const allLeads = leadsConsolidator.getPaginatedLeads({ page: 1, pageSize: 10 }).totalFiltered;
  const multiLeads = leadsConsolidator.getPaginatedLeads({ multiAction: 'multi', page: 1, pageSize: 10 }).totalFiltered;
  const superLeads = leadsConsolidator.getPaginatedLeads({ multiAction: 'super', page: 1, pageSize: 10 }).totalFiltered;
  const campaignLeads = leadsConsolidator.getPaginatedLeads({ campaign: 'Abaixo-Assinado', page: 1, pageSize: 10 }).totalFiltered;
  
  console.log({ allLeads, multiLeads, superLeads, campaignLeads });
  process.exit(0);
})();
