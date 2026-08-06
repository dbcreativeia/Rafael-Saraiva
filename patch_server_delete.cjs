const fs = require('fs');

let serverContent = fs.readFileSync('server.ts', 'utf-8');
const oldDelete = `  app.delete('/api/jogo/users/:id', async (req, res) => {
    if (db) {
      try {
        await db.query('DELETE FROM jogo_users WHERE id = ?', [req.params.id]);
        return res.json({ success: true });
      } catch (err) {
        return res.status(500).json({ error: "DB erro" });
      }
    }
    return res.json({ success: true });
  });`;

const newDelete = `  app.delete('/api/jogo/users/:id', async (req, res) => {
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
  });`;

serverContent = serverContent.replace(oldDelete, newDelete);
fs.writeFileSync('server.ts', serverContent);
