import express from "express";
import path from "path";
import fs from "fs";
import { getDbConnection } from "./db.js";

const PIXEL_ID = "909578061696893";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  // Middleware para parsear JSON no body
  app.use(express.json());

  // In-memory data store for cities and protocols (fallback)
  const protocolsData: any[] = [];
  const citizensData: any[] = [];
  const petitionsData: any[] = [];
  const contraMausTratosData: any[] = [];

  let db: any = null;
  // Initialize DB in the background without blocking server startup
  getDbConnection().then(connection => {
    db = connection;
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
          [id, data.nome, data.whatsapp, data.email, data.cep, data.endereco, data.numero, data.complemento, data.bairro, data.cidade, data.estado, createdAt]
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
        appType: "spa",
      });
      app.use(vite.middlewares);
    } catch (err) {
      console.warn("Vite not found, falling back to static serving");
      app.use(express.static(distPath));
      app.use((req, res, next) => {
        if (req.method === 'GET' && req.accepts('html')) {
          res.sendFile(path.join(distPath, 'index.html'));
        } else {
          next();
        }
      });
    }
  } else {
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method === 'GET' && req.accepts('html')) {
        res.sendFile(path.join(distPath, 'index.html'));
      } else {
        next();
      }
    });
  }

  app.listen(PORT as number, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
