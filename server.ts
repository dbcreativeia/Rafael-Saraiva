import express from "express";
import compression from "compression";
import path from "path";
import fs from "fs";
import { getDbConnection } from "./db.js";
import { leadsConsolidator } from "./leadsConsolidation.js";

const PIXEL_ID = "909578061696893";

async function startServer() {
  const app = express();
  app.use(compression());
  const PORT = process.env.PORT || 3000;

  // Middleware para parsear JSON no body
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Desabilitar cache para todas as rotas da API
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });

  // In-memory data store for cities and protocols (fallback)
  const protocolsData: any[] = [];
  const citizensData: any[] = [];
  const petitionsData: any[] = [];
  const contraMausTratosData: any[] = [];
  const jogoScoresData: any[] = [];
  const popupApoioData: any[] = [];

  // Persistent disk storage for imported leads to guarantee persistence
  const IMPORTED_LEADS_FILE = path.join(process.cwd(), 'imported_leads_store.json');
  let importedLeadsData: any[] = [];
  try {
    if (fs.existsSync(IMPORTED_LEADS_FILE)) {
      const content = fs.readFileSync(IMPORTED_LEADS_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        importedLeadsData = parsed;
      }
    }
  } catch (e) {
    console.error("Error reading imported_leads_store.json:", e);
  }

  function saveImportedLeadsToDisk() {
    try {
      fs.writeFileSync(IMPORTED_LEADS_FILE, JSON.stringify(importedLeadsData, null, 2), 'utf-8');
    } catch (e) {
      console.error("Error saving imported_leads_store.json:", e);
    }
  }

  let db: any = null;
  // Initialize DB in the background without blocking server startup
  getDbConnection().then(connection => {
    db = connection;
  });

  
  const materialData: any[] = [];
  const ninapassadoreData: any[] = [];

  app.get('/api/material', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM material_campaign ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(materialData);
  });

  app.post('/api/material', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    // Validação estrita de SP para material impresso (CEPs entre 01000-000 e 19999-999)
    if (data.tipoMaterial === 'impresso') {
      const cleanCep = (data.cep || '').replace(/\D/g, '');
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999 || data.estado !== 'SP') {
        return res.status(400).json({ error: "A entrega de material impresso é exclusiva para o Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    if (db) {
      try {
        await db.query(
          `INSERT INTO material_campaign (id, nome, sobrenome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, tipoMaterial, adesivoPerfurado, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.sobrenome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento || '', data.bairro, data.cidade, data.estado, data.tipoMaterial, data.adesivoPerfurado ? 1 : 0, createdAt]
        );
        return res.json({ success: true, data });
      } catch (err) {
        console.error("DB Insert error:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    materialData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/material/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM material_campaign WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = materialData.findIndex(p => p.id === id);
    if (idx !== -1) materialData.splice(idx, 1);
    res.json({ success: true });
  });

  app.post('/api/material/batch-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido" });
    }
    if (db) {
      try {
        const placeholders = ids.map(() => '?').join(',');
        await db.query(`DELETE FROM material_campaign WHERE id IN (${placeholders})`, ids);
        return res.json({ success: true, count: ids.length });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idSet = new Set(ids);
    for (let i = materialData.length - 1; i >= 0; i--) {
      if (idSet.has(materialData[i].id)) {
        materialData.splice(i, 1);
      }
    }
    res.json({ success: true, count: ids.length });
  });

  app.get('/api/ninapassadore', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM ninapassadore_campaign ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(ninapassadoreData);
  });

  app.post('/api/ninapassadore', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    // Validação estrita de SP para material impresso (CEPs entre 01000-000 e 19999-999)
    if (data.tipoMaterial === 'impresso') {
      const cleanCep = (data.cep || '').replace(/\D/g, '');
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999 || data.estado !== 'SP') {
        return res.status(400).json({ error: "A entrega de material impresso é exclusiva para o Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    if (db) {
      try {
        await db.query(
          `INSERT INTO ninapassadore_campaign (id, nome, sobrenome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, tipoMaterial, adesivoPerfurado, createdAt) 
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.sobrenome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento || '', data.bairro, data.cidade, data.estado, data.tipoMaterial, data.adesivoPerfurado ? 1 : 0, createdAt]
        );
        return res.json({ success: true, data });
      } catch (err) {
        console.error("DB Insert error:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    ninapassadoreData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/ninapassadore/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM ninapassadore_campaign WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = ninapassadoreData.findIndex(p => p.id === id);
    if (idx !== -1) ninapassadoreData.splice(idx, 1);
    res.json({ success: true });
  });

  app.post('/api/ninapassadore/batch-delete', async (req, res) => {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: "Nenhum ID fornecido" });
    }
    if (db) {
      try {
        const placeholders = ids.map(() => '?').join(',');
        await db.query(`DELETE FROM ninapassadore_campaign WHERE id IN (${placeholders})`, ids);
        return res.json({ success: true, count: ids.length });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idSet = new Set(ids);
    for (let i = ninapassadoreData.length - 1; i >= 0; i--) {
      if (idSet.has(ninapassadoreData[i].id)) {
        ninapassadoreData.splice(i, 1);
      }
    }
    res.json({ success: true, count: ids.length });
  });

  // API routing for petitions

  app.get('/api/petitions', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM petitions ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(petitionsData);
  });

  app.post('/api/petitions', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO petitions (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, data.nome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento, data.bairro, data.cidade, data.estado, createdAt]
        );
        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    petitionsData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/petitions/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM petitions WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = petitionsData.findIndex(p => p.id === id);
    if (idx !== -1) petitionsData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for contra-maus-tratos
  app.get('/api/contra-maus-tratos', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM contra_maus_tratos ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(contraMausTratosData);
  });

  app.post('/api/contra-maus-tratos', async (req, res) => {
    const data = req.body;
    if (db) {
      try {
        await db.query(
          'INSERT INTO contra_maus_tratos (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [data.id, data.nome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento, data.bairro, data.cidade, data.estado]
        );
        return res.json({ success: true, data });
      } catch (err) {
        return res.status(500).json({ error: "DB erro", details: err });
      }
    }
    contraMausTratosData.push({
      ...data,
      createdAt: new Date().toISOString()
    });
    res.json({ success: true, data });
  });

  app.delete('/api/contra-maus-tratos/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM contra_maus_tratos WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = contraMausTratosData.findIndex(p => p.id === id);
    if (idx !== -1) contraMausTratosData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for citizens
  app.get('/api/citizens', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM citizens ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(citizensData);
  });

  app.post('/api/citizens', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO citizens (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.nome,
            data.whatsapp || '',
            data.email || '',
            data.cep || '',
            data.endereco || '',
            data.numero || '',
            data.complemento || '',
            data.bairro || '',
            data.cidade || 'São Paulo',
            data.estado || 'SP',
            createdAt
          ]
        );
        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    citizensData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/citizens/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM citizens WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = citizensData.findIndex(c => c.id === id);
    if (idx !== -1) citizensData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routing for popup-apoio (Pop-up de Apoio da Capital SP)
  app.get('/api/popup-apoio', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM popup_apoio ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(popupApoioData);
  });

  app.post('/api/popup-apoio', async (req, res) => {
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const data = { ...req.body, id, createdAt };
    
    // Validação estrita: apenas CEPs do Estado de São Paulo (01000-000 a 19999-999)
    const cleanCep = (data.cep || '').replace(/\D/g, '');
    if (cleanCep) {
      const numCep = parseInt(cleanCep, 10);
      if (cleanCep.length !== 8 || isNaN(numCep) || numCep < 1000000 || numCep > 19999999) {
        return res.status(400).json({ error: "Cadastro exclusivo para residentes do Estado de São Paulo (CEPs de SP entre 01000-000 e 19999-999)." });
      }
    }

    if (db) {
      try {
        await db.query(
          `INSERT INTO popup_apoio (id, nome, whatsapp, email, cep, endereco, bairro, cidade, estado, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            data.nome,
            data.whatsapp || '',
            data.email || '',
            data.cep || '',
            data.endereco || '',
            data.bairro || '',
            data.cidade || 'São Paulo',
            data.estado || 'SP',
            createdAt
          ]
        );
        return res.json({ success: true, data });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    popupApoioData.push(data);
    res.json({ success: true, data });
  });

  app.delete('/api/popup-apoio/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM popup_apoio WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = popupApoioData.findIndex(c => c.id === id);
    if (idx !== -1) popupApoioData.splice(idx, 1);
    res.json({ success: true });
  });

  function fixMojibake(str?: string | null): string {
    if (!str) return '';
    return str
      .replace(/Ã£|ã£/g, 'ã')
      .replace(/Ã§|ã§/g, 'ç')
      .replace(/Ã¡|ã¡/g, 'á')
      .replace(/Ã©|ã©/g, 'é')
      .replace(/Ã­|ã­/g, 'í')
      .replace(/Ã³/g, 'ó')
      .replace(/ã³/g, 'ó')
      .replace(/Ãº|ãº/g, 'ú')
      .replace(/Ã¢|ã¢/g, 'â')
      .replace(/Ãª|ãª/g, 'ê')
      .replace(/Ã´|ã´/g, 'ô')
      .replace(/Ãµ|ãµ/g, 'õ')
      .replace(/Ã€|ã€/g, 'À')
      .replace(/Ã\x81/g, 'Á')
      .replace(/Ã/g, 'Á')
      .replace(/â€™/g, "'")
      .replace(/â€“/g, "-")
      .replace(/â€œ/g, '"')
      .replace(/â€/g, '"');
  }

  function sanitizeLeadFields(r: any) {
    if (!r) return r;
    return {
      ...r,
      nome: fixMojibake(r.nome),
      cidade: fixMojibake(r.cidade),
      bairro: fixMojibake(r.bairro),
      endereco: fixMojibake(r.endereco),
      complemento: fixMojibake(r.complemento)
    };
  }

  // API routing for imported-leads (Uploads de bases CSV)
  app.get('/api/imported-leads', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM imported_leads ORDER BY createdAt DESC');
        return res.json((rows as any[]).map(sanitizeLeadFields));
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(importedLeadsData.map(sanitizeLeadFields));
  });

  let importRefreshTimer: NodeJS.Timeout | null = null;

  app.post('/api/imported-leads/bulk', async (req, res) => {
    const { leads, campanha } = req.body;
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: "Nenhum lead fornecido para importação." });
    }
    if (!campanha || !campanha.trim()) {
      return res.status(400).json({ error: "O nome da campanha é obrigatório." });
    }

    if (!db) {
      db = await getDbConnection();
    }

    const campaignName = campanha.trim();
    const insertedRecords: any[] = [];

    const valuesArray = [];
    for (const item of leads) {
      const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
      const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      const record = {
        id,
        nome: (item.nome || item.name || item.nomeCompleto || 'Sem Nome').trim(),
        whatsapp: (item.whatsapp || item.telefone || item.celular || item.phone || '').trim(),
        email: (item.email || item.mail || '').trim(),
        cep: (item.cep || '').trim(),
        endereco: (item.endereco || item.logradouro || item.rua || '').trim(),
        numero: (item.numero || '').trim(),
        complemento: (item.complemento || '').trim(),
        bairro: (item.bairro || '').trim(),
        cidade: (item.cidade || item.municipio || 'São Paulo').trim(),
        estado: ((item.estado || item.uf || 'SP').toUpperCase()).trim().substring(0, 2),
        campanha: campaignName,
        origem: 'Importação CSV',
        createdAt,
        extraData: JSON.stringify({ ...(item.extraData || {}), adesivos: item.adesivos, adesivoPerfurado: item.adesivoPerfurado })
      };

      if (!db) {
        importedLeadsData.push(record);
      }
      insertedRecords.push(record);

      valuesArray.push([
        record.id,
        record.nome,
        record.whatsapp,
        record.email,
        record.cep,
        record.endereco,
        record.numero,
        record.complemento,
        record.bairro,
        record.cidade,
        record.estado,
        record.campanha,
        record.origem,
        record.createdAt,
        record.extraData
      ]);
    }

    if (db && valuesArray.length > 0) {
      try {
        const CHUNK_SIZE = 1000;
        for (let i = 0; i < valuesArray.length; i += CHUNK_SIZE) {
          const chunk = valuesArray.slice(i, i + CHUNK_SIZE);
          await db.query(
            `INSERT INTO imported_leads (id, nome, whatsapp, email, cep, endereco, numero, complemento, bairro, cidade, estado, campanha, origem, createdAt, extraData) VALUES ?`,
            [chunk]
          );
        }
      } catch (e: any) {
        console.error("Erro ao inserir leads importados em lote no MySQL:", e);
        return res.status(500).json({ error: "Erro ao gravar no banco: " + (e?.message || 'Falha no MySQL') });
      }
    } else if (!db) {
      saveImportedLeadsToDisk();
    }

    // Debounce consolidation: só executa 15 segundos após o término de todos os lotes
    if (importRefreshTimer) clearTimeout(importRefreshTimer);
    importRefreshTimer = setTimeout(() => {
      console.log('🔄 Disparando consolidação após término dos lotes de importação...');
      leadsConsolidator.refresh().catch(err => console.error("Erro ao atualizar consolidador após importação:", err));
    }, 15000);

    return res.json({
      success: true,
      count: insertedRecords.length,
      campanha: campaignName
    });
  });


  const deletingCampaigns = new Set<string>();

  app.get('/api/imported-leads/campaigns', async (req, res) => {
    if (db) {
      try {
        const [rows]: any = await db.query('SELECT campanha, COUNT(*) as count, MAX(createdAt) as lastImport FROM imported_leads GROUP BY campanha ORDER BY lastImport DESC');
        const activeRows = (rows as any[]).filter(r => !deletingCampaigns.has(r.campanha));
        return res.json(activeRows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    
    // In-memory fallback
    const campaignsMap = new Map();
    importedLeadsData.forEach(lead => {
      if (!campaignsMap.has(lead.campanha)) {
        campaignsMap.set(lead.campanha, { count: 0, lastImport: lead.createdAt });
      }
      const c = campaignsMap.get(lead.campanha);
      c.count += 1;
      if (new Date(lead.createdAt) > new Date(c.lastImport)) {
        c.lastImport = lead.createdAt;
      }
    });
    const result = Array.from(campaignsMap.entries())
      .filter(([campanha]) => !deletingCampaigns.has(campanha))
      .map(([campanha, data]) => ({
        campanha,
        count: data.count,
        lastImport: data.lastImport
      }));
    return res.json(result);
  });

  app.delete('/api/imported-leads/campaign/:campaignName', async (req, res) => {
    const campaignName = req.params.campaignName;
    if (!campaignName) {
      return res.status(400).json({ error: "Nome de campanha inválido" });
    }

    // 1. Marca imediatamente como em exclusão para não aparecer em mais nenhuma listagem
    deletingCampaigns.add(campaignName);

    // 2. Remove imediatamente do consolidado em memória e atualiza sumário
    try {
      leadsConsolidator.removeCampaign(campaignName);
    } catch (err) {
      console.error('Erro ao remover campanha da consolidação:', err);
    }

    // 3. Remove do fallback em memória
    const filtered = importedLeadsData.filter(lead => lead.campanha !== campaignName);
    importedLeadsData.length = 0;
    importedLeadsData.push(...filtered);

    // 4. Se tiver MySQL conectado, efetua a limpeza no banco em segundo plano via lotes para resposta instantânea
    if (db) {
      (async () => {
        try {
          const start = Date.now();
          let totalDeleted = 0;
          const CHUNK = 15000;
          while (true) {
            const [delResult]: any = await db.query(
              'DELETE FROM imported_leads WHERE campanha = ? LIMIT ?',
              [campaignName, CHUNK]
            );
            const affected = delResult?.affectedRows || 0;
            totalDeleted += affected;
            if (affected === 0) break;
            await new Promise(r => setTimeout(r, 40));
          }
          console.log(`🗑️ Exclusão concluída: ${totalDeleted} leads da campanha "${campaignName}" removidos do MySQL em ${Date.now() - start}ms.`);
        } catch (err) {
          console.error(`Erro ao deletar registros da campanha "${campaignName}" no MySQL:`, err);
        } finally {
          deletingCampaigns.delete(campaignName);
        }
      })();

      return res.json({ success: true, message: `Campanha "${campaignName}" excluída.` });
    }

    saveImportedLeadsToDisk();
    deletingCampaigns.delete(campaignName);
    return res.json({ success: true });
  });

  app.delete('/api/imported-leads/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM imported_leads WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = importedLeadsData.findIndex(c => c.id === id);
    if (idx !== -1) {
      importedLeadsData.splice(idx, 1);
      saveImportedLeadsToDisk();
    }
    res.json({ success: true });
  });

  // High-performance Consolidated Leads Endpoints
  app.get('/api/leads/summary', (req, res) => {
    try {
      const summary = leadsConsolidator.getSummary();
      return res.json(summary);
    } catch (err) {
      console.error("Error in /api/leads/summary:", err);
      return res.status(500).json({ error: "Erro ao obter resumo de leads" });
    }
  });

  app.get('/api/leads/paginated', (req, res) => {
    try {
      const result = leadsConsolidator.getPaginatedLeads(req.query as any);
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/leads/paginated:", err);
      return res.status(500).json({ error: "Erro ao paginar leads" });
    }
  });

  app.get('/api/leads/physical-materials', (req, res) => {
    try {
      const result = leadsConsolidator.getPhysicalMaterials((req.query.adesivoFilter as any) || 'ALL');
      return res.json(result);
    } catch (err) {
      console.error("Error in /api/leads/physical-materials:", err);
      return res.status(500).json({ error: "Erro ao buscar materiais físicos" });
    }
  });

  app.get('/api/leads/export', (req, res) => {
    try {
      const format = req.query.format === 'csv' ? 'csv' : 'xlsx';
      const filename = `leads_consolidados_${new Date().toISOString().slice(0, 10)}.${format}`;
      
      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.flushHeaders(); // Envia os cabeçalhos imediatamente para evitar timeout
        
        const params = req.query as any;
        const resData = leadsConsolidator.getPaginatedLeads({ ...params, page: 1, pageSize: 1000000 });
        
        const headers = ['Nome', 'WhatsApp', 'Email', 'Cidade', 'Estado', 'CEP', 'Endereço', 'Número', 'Complemento', 'Bairro', 'Total de Ações', 'Multi-Campanha', 'Super Apoiador', 'Campanhas', 'Primeiro Contato', 'Último Contato'];
        res.write('\uFEFF' + headers.join(',') + '\n');
        
        for (const l of resData.leads) {
          const row = [
            `"${(l.nome || '').replace(/"/g, '""')}"`,
            `"${(l.whatsapp || '').replace(/"/g, '""')}"`,
            `"${(l.email || '').replace(/"/g, '""')}"`,
            `"${(l.cidade || '').replace(/"/g, '""')}"`,
            `"${(l.estado || '').replace(/"/g, '""')}"`,
            `"${(l.cep || '').replace(/"/g, '""')}"`,
            `"${(l.endereco || '').replace(/"/g, '""')}"`,
            `"${(l.numero || '').replace(/"/g, '""')}"`,
            `"${(l.complemento || '').replace(/"/g, '""')}"`,
            `"${(l.bairro || '').replace(/"/g, '""')}"`,
            l.totalActions,
            l.isMultiAction ? 'SIM' : 'NÃO',
            l.isSuperSupporter ? 'SIM' : 'NÃO',
            `"${l.distinctCampaigns.join(' | ').replace(/"/g, '""')}"`,
            `"${l.firstDate ? new Date(l.firstDate).toLocaleDateString('pt-BR') : ''}"`,
            `"${l.lastDate ? new Date(l.lastDate).toLocaleDateString('pt-BR') : ''}"`
          ];
          res.write(row.join(',') + '\n');
        }
        res.end();
        return;
      }

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      const buffer = leadsConsolidator.exportLeads(req.query as any, format);
      return res.send(buffer);
    } catch (err) {
      console.error("Error in /api/leads/export:", err);
      if (!res.headersSent) {
        return res.status(500).json({ error: "Erro ao exportar leads" });
      } else {
        res.end();
      }
    }
  });

  app.post('/api/leads/refresh-cache', async (req, res) => {
    try {
      // Run in background without blocking
      leadsConsolidator.refreshFromDatabase().catch(console.error);
      return res.json({ success: true, message: "Atualização de leads iniciada em segundo plano." });
    } catch (err) {
      return res.status(500).json({ error: "Erro ao disparar atualização de leads" });
    }
  });

  // Legacy Consolidated Leads Endpoint (optimizado)
  app.get('/api/leads/consolidated', async (req, res) => {
    try {
      // Returns high-performance summary & page 1 to prevent client crashes
      const summary = leadsConsolidator.getSummary();
      const page1 = leadsConsolidator.getPaginatedLeads({ page: 1, pageSize: 100 });
      return res.json({
        summary,
        leads: page1.leads,
        total: page1.totalFiltered
      });
    } catch (err) {
      console.error("Error in /api/leads/consolidated:", err);
      return res.status(500).json({ error: "Erro ao consolidar leads" });
    }
  });


  // Jogo Users
  app.post('/api/jogo/register', async (req, res) => {
    const { nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado } = req.body;
    if (usuario && usuario.includes('@')) {
      return res.status(400).json({ error: "O nome de usuário não pode ser um e-mail" });
    }
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    if (db) {
      try {
        await db.query(
          'INSERT INTO jogo_users (id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade, estado]
        );
        return res.json({ success: true, data: { id, nomeCompleto, usuario, email, whatsapp, cep, cidade, estado } });
      } catch (err) {
        console.error(err);
        return res.status(400).json({ error: "Usuário já existe ou erro no DB" });
      }
    }
    return res.status(500).json({ error: "DB offline" });
  });

  app.post('/api/jogo/login', async (req, res) => {
    const { usuario, senha } = req.body;
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM jogo_users WHERE (usuario = ? OR email = ?) AND senha = ?', [usuario, usuario, senha]);
        if (rows.length > 0) {
          const user = rows[0];
          delete user.senha; // hide password
          return res.json({ success: true, data: user });
        } else {
          return res.status(401).json({ error: "Credenciais inválidas" });
        }
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.status(500).json({ error: "DB offline" });
  });

  app.get('/api/jogo/users', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query(`
          SELECT u.*, 
            (SELECT MAX(score) FROM jogo_scores s WHERE s.usuario = u.usuario) as maxScore,
            (SELECT COUNT(*) FROM jogo_scores s WHERE s.usuario = u.usuario) as playCount
          FROM jogo_users u 
          ORDER BY u.createdAt DESC
        `);
        return res.json(rows);
      } catch (err) {
        console.error("Error fetching users:", err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json([]);
  });

  app.delete('/api/jogo/users/:id', async (req, res) => {
    if (db) {
      try {
        const [users] = await db.query('SELECT usuario FROM jogo_users WHERE id = ?', [req.params.id]);
        if (users && users.length > 0) {
          const usuario = users[0].usuario;
          await db.query('DELETE FROM jogo_scores WHERE usuario = ?', [usuario]);
        }
        await db.query('DELETE FROM jogo_users WHERE id = ?', [req.params.id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json({ success: true });
  });

  // API routing for Jogo
  app.get('/api/jogo/scores', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query(`
          SELECT MIN(id) as id, nome, MAX(cidade) as cidade, MAX(score) as score, MAX(createdAt) as createdAt, usuario 
          FROM jogo_scores 
          GROUP BY nome, usuario 
          ORDER BY score DESC 
          LIMIT 100
        `);
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const grouped = [...jogoScoresData].reduce((acc: any, curr) => {
      const key = curr.usuario || curr.nome;
      if (!acc[key] || acc[key].score < curr.score) {
        acc[key] = curr;
      }
      return acc;
    }, {});
    const sorted = Object.values(grouped).sort((a: any, b: any) => b.score - a.score).slice(0, 100);
    res.json(sorted);
  });

  app.post('/api/jogo/scores', async (req, res) => {
    let { nome, cidade, score, fase, usuario } = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString();
    
    if (db) {
      try {
        if (usuario && usuario.includes('@')) {
          const trimmed = usuario.trim();
          const [users] = await db.query('SELECT usuario, nomeCompleto FROM jogo_users WHERE email = ? OR usuario = ?', [trimmed, trimmed]);
          if (users && users.length > 0) {
            usuario = users[0].usuario || users[0].nomeCompleto;
            nome = usuario;
          } else {
            usuario = "Jogador_" + id.substring(0, 5);
            nome = usuario;
          }
        }

        await db.query(
          'INSERT INTO jogo_scores (id, nome, cidade, score, fase, createdAt, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [id, nome, cidade, score, fase, createdAt, usuario]
        );
        return res.json({ success: true, data: { id, nome, cidade, score, fase, createdAt, usuario } });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const newScore = { id, nome, cidade, score, fase, createdAt };
    jogoScoresData.push(newScore);
    res.json({ success: true, data: newScore });
  });

  // API routing for cities
  app.get('/api/cities', async (req, res) => {
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols ORDER BY createdAt DESC');
        // Convert active from tinyint(1) if necessary
        return res.json((rows as any[]).map(r => ({ ...r, active: Boolean(r.active) })));
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    res.json(protocolsData);
  });

  app.get('/api/cities/:name', async (req, res) => {
    const cityName = req.params.name;
    
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols WHERE name = ?', [cityName]);
        const protocols = (rows as any[]).map(r => ({ ...r, active: Boolean(r.active) }));
        const activeProtocol = protocols.find(p => p.status === 'protocolado' && p.active !== false);
        
        if (activeProtocol) {
          return res.json(activeProtocol);
        } else {
          return res.json({ name: cityName, state: "SP", status: "nao-protocolado" });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    const protocols = protocolsData.filter(p => p.name === cityName);
    const activeProtocol = protocols.find(p => p.status === 'protocolado' && p.active !== false);

    if (activeProtocol) {
      res.json(activeProtocol);
    } else {
      res.json({ name: cityName, state: "SP", status: "nao-protocolado" });
    }
  });

  app.post('/api/protocols', async (req, res) => {
    const { name, state, councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou } = req.body;
    if (!name) return res.status(400).json({ error: "City name required" });

    const status = jaProtocolou === 'sim' ? "protocolado" : "solicitado";
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const newProtocol = {
      id,
      name,
      state: state || "SP",
      councillorName,
      role,
      email,
      whatsapp,
      protocolNumber,
      date,
      link,
      jaProtocolou,
      status, // "protocolado" | "solicitado"
      active: false,
      createdAt
    };
    
    if (db) {
      try {
        await db.query(
          `INSERT INTO protocols (id, name, state, councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou, status, active, createdAt)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [id, name, state || "SP", councillorName, role, email, whatsapp, protocolNumber, date, link, jaProtocolou, status, false, createdAt]
        );
        return res.json({ success: true, data: newProtocol });
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    protocolsData.push(newProtocol);
    res.json({ success: true, data: newProtocol });
  });

  app.put('/api/protocols/:id/toggle-active', async (req, res) => {
    const id = req.params.id;
    
    if (db) {
      try {
        const [rows] = await db.query('SELECT * FROM protocols WHERE id = ?', [id]);
        const protocolArray = rows as any[];
        if (protocolArray.length > 0) {
          const newActive = !protocolArray[0].active;
          await db.query('UPDATE protocols SET active = ? WHERE id = ?', [newActive, id]);
          return res.json({ success: true, data: { ...protocolArray[0], active: newActive } });
        } else {
          return res.status(404).json({ error: "Protocol not found" });
        }
      } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "DB erro" });
      }
    }

    const protocolIndex = protocolsData.findIndex(p => p.id === id);
    if (protocolIndex !== -1) {
      protocolsData[protocolIndex].active = !protocolsData[protocolIndex].active;
      res.json({ success: true, data: protocolsData[protocolIndex] });
    } else {
      res.status(404).json({ error: "Protocol not found" });
    }
  });

  app.delete('/api/protocols/:id', async (req, res) => {
    const id = req.params.id;
    if (db) {
      try {
        await db.query('DELETE FROM protocols WHERE id = ?', [id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    const idx = protocolsData.findIndex(p => p.id === id);
    if (idx !== -1) protocolsData.splice(idx, 1);
    res.json({ success: true });
  });

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/debug-db", (req, res) => {
    res.json({
      dbHost: process.env.DB_HOST || "not set",
      dbUser: process.env.DB_USER || "not set",
      dbName: process.env.DB_NAME || "not set",
      dbPort: process.env.DB_PORT || "not set",
      hasPassword: !!process.env.DB_PASSWORD,
    });
  });

  // Rota para a API de Conversões da Meta (CAPI)
  app.post("/api/events", async (req, res) => {
    const { eventName, eventUrl, userAgent, clientIp, fbp, fbc, eventId } = req.body;
    
    const token = process.env.META_CAPI_TOKEN;
    
    if (!token) {
      console.warn("META_CAPI_TOKEN não configurado. Evento não enviado para a CAPI.");
      return res.status(200).json({ success: false, message: "Token não configurado" });
    }

    try {
      // Usa o eventId enviado pelo frontend para garantir a desduplicação
      const finalEventId = eventId || `evt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      
      const payload: any = {
        data: [
          {
            event_name: eventName,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            event_id: finalEventId,
            event_source_url: eventUrl,
            user_data: {
              client_ip_address: clientIp || req.ip || req.headers['x-forwarded-for'],
              client_user_agent: userAgent || req.headers['user-agent'],
              fbp: fbp,
              fbc: fbc
            }
          }
        ]
      };

      // Adiciona o código de teste se estiver configurado nas variáveis de ambiente
      if (process.env.META_TEST_EVENT_CODE) {
        payload.test_event_code = process.env.META_TEST_EVENT_CODE;
      }

      const response = await fetch(`https://graph.facebook.com/v19.0/${PIXEL_ID}/events?access_token=${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      
      if (!response.ok) {
        console.error("Erro na Meta CAPI:", data);
        return res.status(400).json({ success: false, error: data });
      }

      res.status(200).json({ success: true, data });
    } catch (error) {
      console.error("Erro ao enviar evento para a Meta CAPI:", error);
      res.status(500).json({ success: false, error: "Erro interno do servidor" });
    }
  });

  // Vite middleware for development
  const distPath = path.join(process.cwd(), 'dist');
  const isProd = process.env.NODE_ENV === "production";

  if (!isProd) {
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "custom",
      });
      app.use(vite.middlewares);

      app.get('*all', async (req, res, next) => {
        try {
          let template = await fs.promises.readFile(path.join(process.cwd(), 'index.html'), 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);

          if (req.path.startsWith('/jogo')) {
            const jogoTitle = "Jogo do Mandato | Deputado Rafael Saraiva";
            const jogoDesc = "Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!";
            
            template = template.replace(/<title>.*?<\/title>/, `<title>${jogoTitle}</title>`);
            template = template.split('content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP"').join(`content="${jogoTitle}"`);
            template = template.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e o Instituto ELPA."').join(`content="${jogoDesc}"`);
            template = template.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo."').join(`content="${jogoDesc}"`);
            template = template.split('content="https://lh3.googleusercontent.com/d/14C1ToZx8KSE4oySqVSPnfI6l3OP2Lrhg"').join('content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ"');
          }
          
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
        } catch (e) {
          vite.ssrFixStacktrace(e);
          next(e);
        }
      });
    } catch (err) {
      console.warn("Vite not found, falling back to static serving");
      app.use(express.static(distPath));
      app.get('*all', (req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    app.use(express.static(distPath, { index: false }));
    
    app.get('*all', async (req, res, next) => {
      try {
        let html = await fs.promises.readFile(path.join(distPath, 'index.html'), 'utf-8');
        
        if (req.path.startsWith('/jogo')) {
          const jogoTitle = "Jogo do Mandato | Deputado Rafael Saraiva";
          const jogoDesc = "Jogue o Jogo do Mandato do Deputado Rafael Saraiva, resgate os animais e conheça mais sobre as ações do mandato em defesa da causa animal!";
          
          html = html.replace(/<title>.*?<\/title>/, `<title>${jogoTitle}</title>`);
          html = html.split('content="Deputado Rafael Saraiva | Defesa da Causa Animal em SP"').join(`content="${jogoTitle}"`);
          html = html.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo. Conheça as propostas e o Instituto ELPA."').join(`content="${jogoDesc}"`);
          html = html.split('content="Acompanhe o trabalho do Deputado Estadual Rafael Saraiva e suas ações em defesa da causa animal em todo o estado de São Paulo."').join(`content="${jogoDesc}"`);
          html = html.split('content="https://lh3.googleusercontent.com/d/14C1ToZx8KSE4oySqVSPnfI6l3OP2Lrhg"').join('content="https://lh3.googleusercontent.com/d/1hEky7g-TlnhbIlDtqnQLTxtTIgEEkVrZ"');
        }
        
        res.status(200).set({ 'Content-Type': 'text/html' }).send(html);
      } catch (e) {
        next(e);
      }
    });
  }

  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
