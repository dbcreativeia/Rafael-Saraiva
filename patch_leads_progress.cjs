const fs = require('fs');
let code = fs.readFileSync('leadsConsolidation.ts', 'utf8');

// Add refreshMessage
code = code.replace(/private isRefreshing = false;/, 'private isRefreshing = false;\n  private refreshMessage = "";');

// Add updateRefreshState helper
code = code.replace(/public async refreshFromDatabase\(\): Promise<void> \{/, `private updateRefreshState(msg: string) {
    this.refreshMessage = msg;
    // console.log(msg); // Optional: keep logs clean
  }

  public async refreshFromDatabase(): Promise<void> {`);

// Modify getSummary
code = code.replace(/public getSummary\(\): LeadsSummary & \{ isReady: boolean \} \{/, 'public getSummary(): LeadsSummary & { isReady: boolean; isRefreshing: boolean; refreshMessage: string } {');
code = code.replace(/isReady: this\.isReady\n\s*\};/, 'isReady: this.isReady,\n      isRefreshing: this.isRefreshing,\n      refreshMessage: this.refreshMessage\n    };');

// Modify refreshFromDatabase progress steps
code = code.replace(/this\.isRefreshing = true;/, 'this.isRefreshing = true;\n    this.updateRefreshState("Iniciando atualização do banco de dados...");');

code = code.replace(/const \[popupApoio\] = await db.query/g, 'this.updateRefreshState("Consultando novas assinaturas e ações (1/7)...");\n      const [popupApoio] = await db.query');
code = code.replace(/const \[materialCampaign\] = await db.query/g, 'this.updateRefreshState("Consultando novos materiais (2/7)...");\n      const [materialCampaign] = await db.query');
code = code.replace(/const \[ninaCampaign\] = await db.query/g, 'this.updateRefreshState("Consultando abaixo-assinados (3/7)...");\n      const [ninaCampaign] = await db.query');
code = code.replace(/const \[citizens\] = await db.query/g, 'this.updateRefreshState("Consultando cidadãos paulistas (4/7)...");\n      const [citizens] = await db.query');
code = code.replace(/const \[petitions\] = await db.query/g, 'this.updateRefreshState("Consultando petições ativas (5/7)...");\n      const [petitions] = await db.query');
code = code.replace(/const \[contraMausTratos\] = await db.query/g, 'this.updateRefreshState("Consultando campanhas de proteção (6/7)...");\n      const [contraMausTratos] = await db.query');
code = code.replace(/const \[jogoUsers\] = await db.query/g, 'this.updateRefreshState("Consultando jogadores do Jogo do Mandato (7/7)...");\n      const [jogoUsers] = await db.query');

code = code.replace(/const leads: ConsolidatedLead\[\] = \[\];/g, 'this.updateRefreshState("Aglutinando dados e unificando contatos...");\n      const leads: ConsolidatedLead[] = [];');

code = code.replace(/let offset = 0;\n\s*const limit = 15000;/g, 'let offset = 0;\n      const limit = 15000;\n      this.updateRefreshState("Buscando bases importadas. Isso pode levar alguns minutos...");');

code = code.replace(/const chunk = importedChunk as any\[\];/g, 'const chunk = importedChunk as any[];\n          this.updateRefreshState(`Processando bases importadas... (Lote de ${offset} a ${offset + limit})`);');

code = code.replace(/leads\.forEach\(l => \{/g, 'this.updateRefreshState("Validando Super Apoiadores e métricas Multi-Campanha...");\n      leads.forEach(l => {');
code = code.replace(/this\.consolidatedLeads = leads;/g, 'this.updateRefreshState("Finalizando e atualizando painel...");\n      this.consolidatedLeads = leads;');
code = code.replace(/this\.computeSummary\(\);/g, 'this.computeSummary();\n      this.updateRefreshState("Tudo pronto!");');

fs.writeFileSync('leadsConsolidation.ts', code);
console.log('patched leadsConsolidation.ts');
