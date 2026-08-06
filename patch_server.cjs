const fs = require('fs');
let content = fs.readFileSync('server.ts', 'utf-8');

const additionalApis = `
  // Jogo Users
  app.post('/api/jogo/register', async (req, res) => {
    const { nomeCompleto, usuario, senha, email, whatsapp, cep, cidade } = req.body;
    const id = Date.now().toString() + Math.random().toString(36).substring(2, 9);
    if (db) {
      try {
        await db.query(
          'INSERT INTO jogo_users (id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
          [id, nomeCompleto, usuario, senha, email, whatsapp, cep, cidade]
        );
        return res.json({ success: true, data: { id, nomeCompleto, usuario, email, whatsapp, cep, cidade } });
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
        const [rows] = await db.query('SELECT * FROM jogo_users WHERE usuario = ? AND senha = ?', [usuario, senha]);
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
        const [rows] = await db.query('SELECT * FROM jogo_users ORDER BY createdAt DESC');
        return res.json(rows);
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json([]);
  });

  app.delete('/api/jogo/users/:id', async (req, res) => {
    if (db) {
      try {
        await db.query('DELETE FROM jogo_users WHERE id = ?', [req.params.id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json({ success: true });
  });

`;

content = content.replace("  // API routing for Jogo", additionalApis + "  // API routing for Jogo");

content = content.replace(
    "'INSERT INTO jogo_scores (id, nome, cidade, score, fase, createdAt) VALUES (?, ?, ?, ?, ?, ?)',",
    "'INSERT INTO jogo_scores (id, nome, cidade, score, fase, createdAt, usuario) VALUES (?, ?, ?, ?, ?, ?, ?)',"
);
content = content.replace(
    "[id, nome, cidade, score, fase, createdAt]",
    "[id, req.body.nome, req.body.cidade, req.body.score, req.body.fase, createdAt, req.body.usuario]"
);

fs.writeFileSync('server.ts', content);
