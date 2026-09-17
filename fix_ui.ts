import fs from "fs";

let content = fs.readFileSync("src/components/admin/CentralLeadsTab.tsx", "utf-8");

const searchStr = `                  <option value="all">Todas as Ações</option>
                  <option value="multi">🔥 Multi-Campanhas (+1)</option>
                  <option value="super">⭐ Super Apoiadores (3+)</option>
                  <option value="single">Apenas 1 Ação</option>`;

const replaceStr = `                  <option value="all">Todas as Ações</option>
                  <option value="frequent">⚡ Apoiador Frequente (2+)</option>
                  <option value="multi">🔥 Multi-Campanhas (3+)</option>
                  <option value="super">⭐ Super Apoiadores (5+)</option>
                  <option value="single">Apenas 1 Ação</option>`;

if (content.includes(searchStr)) {
  content = content.replace(searchStr, replaceStr);
  fs.writeFileSync("src/components/admin/CentralLeadsTab.tsx", content);
  console.log("Updated UI options!");
} else {
  console.log("UI string not found!");
}
