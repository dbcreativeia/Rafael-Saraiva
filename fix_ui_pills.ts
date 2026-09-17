import fs from "fs";

let content = fs.readFileSync("src/components/admin/CentralLeadsTab.tsx", "utf-8");

// Fix Frequentes button
const button1Search = `              <button
                onClick={() => setMultiActionFilter(multiActionFilter === 'multi' ? 'all' : 'multi')}
                className={\`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
                  multiActionFilter === 'multi'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }\`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Frequentes 2+ ({(summary?.multiActionLeadsCount || 152860).toLocaleString('pt-BR')})</span>
              </button>`;
const button1Replace = `              <button
                onClick={() => setMultiActionFilter(multiActionFilter === 'frequent' ? 'all' : 'frequent')}
                className={\`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
                  multiActionFilter === 'frequent'
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                }\`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Frequentes 2+ ({(summary?.frequentLeadsCount || 31778).toLocaleString('pt-BR')})</span>
              </button>

              <button
                onClick={() => setMultiActionFilter(multiActionFilter === 'multi' ? 'all' : 'multi')}
                className={\`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
                  multiActionFilter === 'multi'
                    ? 'bg-red-500 text-white shadow-xs'
                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                }\`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Multi-Campanhas 3+ ({(summary?.multiActionLeadsCount || 9638).toLocaleString('pt-BR')})</span>
              </button>`;

if (content.includes(button1Search)) {
  content = content.replace(button1Search, button1Replace);
}

// Fix Super button
const button2Search = `              <button
                onClick={() => setMultiActionFilter(multiActionFilter === 'super' ? 'all' : 'super')}
                className={\`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
                  multiActionFilter === 'super'
                    ? 'bg-yellow-500 text-white shadow-xs'
                    : 'bg-yellow-50 text-yellow-800 hover:bg-yellow-100 border border-yellow-200'
                }\`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Super Apoiadores 3+ ({(summary?.superSupportersCount || 38879).toLocaleString('pt-BR')})</span>
              </button>`;
const button2Replace = `              <button
                onClick={() => setMultiActionFilter(multiActionFilter === 'super' ? 'all' : 'super')}
                className={\`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 \${
                  multiActionFilter === 'super'
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200'
                }\`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Super Apoiadores 5+ ({(summary?.superSupportersCount || 4825).toLocaleString('pt-BR')})</span>
              </button>`;

if (content.includes(button2Search)) {
  content = content.replace(button2Search, button2Replace);
}

// We need to add Zap to lucide-react imports if it's not there
if (content.includes("import { ") && !content.includes(" Zap,")) {
  content = content.replace("import { ", "import { Zap, ");
}

// Fix badges
const badgeSearch = `                              {lead.isSuperSupporter ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  Super Apoiador ({lead.totalActions || 1})
                                </span>
                              ) : lead.isMultiAction ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  <Flame className="w-3 h-3 text-amber-600" />
                                  Multi ({lead.totalActions || 1})
                                </span>
                              ) : null}`;
const badgeReplace = `                              {lead.isSuperSupporter ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 border border-purple-200">
                                  <Sparkles className="w-3 h-3 text-purple-600" />
                                  Super Apoiador ({lead.totalActions || 1})
                                </span>
                              ) : lead.isMultiAction ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                                  <Flame className="w-3 h-3 text-red-600" />
                                  Multi ({lead.totalActions || 1})
                                </span>
                              ) : lead.isFrequent ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                                  <Zap className="w-3 h-3 text-amber-600" />
                                  Frequente ({lead.totalActions || 1})
                                </span>
                              ) : null}`;

if (content.includes(badgeSearch)) {
  content = content.replace(badgeSearch, badgeReplace);
}

// Fix another badge if it exists inside the Lead Detail drawer (there is one there too!)
const badgeDetailSearch = `                ) : selectedLead.isMultiAction ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <Flame className="w-4 h-4 text-amber-600" />
                    Multi-Campanhas ({selectedLead.totalActions || 1})
                  </span>
                ) : (`;
const badgeDetailReplace = `                ) : selectedLead.isMultiAction ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-red-100 text-red-800 border border-red-200">
                    <Flame className="w-4 h-4 text-red-600" />
                    Multi-Campanhas ({selectedLead.totalActions || 1})
                  </span>
                ) : selectedLead.isFrequent ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                    <Zap className="w-4 h-4 text-amber-600" />
                    Apoiador Frequente ({selectedLead.totalActions || 1})
                  </span>
                ) : (`;
if (content.includes(badgeDetailSearch)) {
  content = content.replace(badgeDetailSearch, badgeDetailReplace);
}

// Fix Top Dashboard Card title
const dashboardCardSearch = `                  <Flame className="w-4 h-4 text-amber-400" />
                  <span>Apoiadores Frequentes</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 whitespace-nowrap">
                  2+ Ações
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{(summary?.multiActionLeadsCount || 152860).toLocaleString('pt-BR')}</span>`;
const dashboardCardReplace = `                  <Zap className="w-4 h-4 text-amber-400" />
                  <span>Apoiadores Frequentes</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-200 border border-amber-400/30 whitespace-nowrap">
                  2+ Ações
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-black text-white">{(summary?.frequentLeadsCount || 31778).toLocaleString('pt-BR')}</span>`;
if (content.includes(dashboardCardSearch)) {
  content = content.replace(dashboardCardSearch, dashboardCardReplace);
}

// Need to also change the Super Apoiadores dashboard card to 5+
const dashboardSuperSearch = `                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>Super Apoiadores</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-400/30 whitespace-nowrap">
                  3+ Ações`;
const dashboardSuperReplace = `                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Super Apoiadores</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-200 border border-purple-400/30 whitespace-nowrap">
                  5+ Ações`;
if (content.includes(dashboardSuperSearch)) {
  content = content.replace(dashboardSuperSearch, dashboardSuperReplace);
}

fs.writeFileSync("src/components/admin/CentralLeadsTab.tsx", content);
console.log("Updated UI!");
