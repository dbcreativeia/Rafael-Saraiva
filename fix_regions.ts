import { getDbConnection } from "./db.ts";
import { leadsConsolidator } from "./leadsConsolidation.ts";

function getEstadoByCepPrefix(cepStr: string): string | null {
  if (!cepStr) return null;
  let cep = cepStr.replace(/\D/g, "");
  if (cep.length < 5) return null;
  const prefix = parseInt(cep.substring(0, 5), 10);
  
  if (prefix >= 1000 && prefix <= 19999) return "SP";
  if (prefix >= 20000 && prefix <= 28999) return "RJ";
  if (prefix >= 29000 && prefix <= 29999) return "ES";
  if (prefix >= 30000 && prefix <= 39999) return "MG";
  if (prefix >= 40000 && prefix <= 48999) return "BA";
  if (prefix >= 49000 && prefix <= 49999) return "SE";
  if (prefix >= 50000 && prefix <= 56999) return "PE";
  if (prefix >= 57000 && prefix <= 57999) return "AL";
  if (prefix >= 58000 && prefix <= 58999) return "PB";
  if (prefix >= 59000 && prefix <= 59999) return "RN";
  if (prefix >= 60000 && prefix <= 63999) return "CE";
  if (prefix >= 64000 && prefix <= 64999) return "PI";
  if (prefix >= 65000 && prefix <= 65999) return "MA";
  if (prefix >= 66000 && prefix <= 68999) return "PA";
  if (prefix >= 68900 && prefix <= 68999) return "AP";
  if (prefix >= 69000 && prefix <= 69299) return "AM";
  if (prefix >= 69300 && prefix <= 69399) return "RR";
  if (prefix >= 69900 && prefix <= 69999) return "AC";
  if (prefix >= 70000 && prefix <= 73699) return "DF";
  if (prefix >= 72800 && prefix <= 72999) return "GO"; 
  if (prefix >= 73700 && prefix <= 76799) return "GO";
  if (prefix >= 77000 && prefix <= 77999) return "TO";
  if (prefix >= 78000 && prefix <= 78899) return "MT";
  if (prefix >= 78900 && prefix <= 78999) return "RO";
  if (prefix >= 79000 && prefix <= 79999) return "MS";
  if (prefix >= 80000 && prefix <= 87999) return "PR";
  if (prefix >= 88000 && prefix <= 89999) return "SC";
  if (prefix >= 90000 && prefix <= 99999) return "RS";
  return null;
}

function titleCase(str: string): string {
  if (!str) return str;
  return str.toLowerCase().split(' ').map(word => {
    if (["de", "da", "do", "das", "dos", "e"].includes(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' ');
}

(async () => {
  const db = await getDbConnection();
  if (!db) process.exit(1);

  console.log("Fetching rows to fix...");
  const [rows] = await db.query(`SELECT id, cep, cidade, estado FROM imported_leads`);
  
  const updates = [];
  for (const row of rows as any[]) {
    const correctEstado = row.cep ? getEstadoByCepPrefix(row.cep) : null;
    let newEstado = row.estado;
    let newCidade = row.cidade;
    let needsUpdate = false;

    if (correctEstado && row.estado !== correctEstado) {
      newEstado = correctEstado;
      needsUpdate = true;
    }

    if (row.cidade) {
      const titleCasedCidade = titleCase(row.cidade);
      if (titleCasedCidade !== row.cidade) {
        newCidade = titleCasedCidade;
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      updates.push({ id: row.id, estado: newEstado, cidade: newCidade });
    }
  }

  console.log(`Found ${updates.length} rows to fix.`);

  if (updates.length > 0) {
    const chunkSize = 5000;
    for (let i = 0; i < updates.length; i += chunkSize) {
      const chunk = updates.slice(i, i + chunkSize);
      
      let sql = 'UPDATE imported_leads SET estado = CASE id ';
      let sqlCidade = 'cidade = CASE id ';
      const ids = [];
      const queryParams = [];
      
      for (const u of chunk) {
        sql += `WHEN ? THEN ? `;
        sqlCidade += `WHEN ? THEN ? `;
        queryParams.push(u.id, u.estado);
        ids.push(u.id);
      }
      
      for (const u of chunk) {
        queryParams.push(u.id, u.cidade);
      }
      
      sql += `END, ${sqlCidade} END WHERE id IN (?)`;
      queryParams.push(ids);
      
      await db.query(sql, queryParams);
      console.log(`Updated chunk ${i} to ${i + chunkSize}`);
    }
  }

  console.log("Triggering leadsConsolidation refresh...");
  await leadsConsolidator.refreshFromDatabase();
  console.log("Done.");
  process.exit(0);
})();
