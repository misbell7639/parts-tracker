const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'db.json');

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// ── database setup ────────────────────────────────────────
let pool = null;

if (process.env.DATABASE_URL) {
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
}

async function initDB() {
  if (!pool) return;
  await pool.query(
    'CREATE TABLE IF NOT EXISTS store (id INTEGER PRIMARY KEY, data JSONB NOT NULL)'
  );
  const { rows } = await pool.query('SELECT id FROM store WHERE id = 1');
  if (rows.length === 0) {
    await pool.query('INSERT INTO store VALUES (1, $1)', [JSON.stringify(defaultDB())]);
  }
}

// ── helpers ──────────────────────────────────────────────
function defaultDB() {
  return {
    techs: ['MPER', 'ATOD', 'CHUF', 'ASMI'],
    checkouts: [],
    log: [],
    catalog: [],
    passwords: { catalog: '7639', manager: '@ccess18' }
  };
}

async function readDB() {
  if (pool) {
    const { rows } = await pool.query('SELECT data FROM store WHERE id = 1');
    return rows[0]?.data || defaultDB();
  }
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultDB();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch {
    return defaultDB();
  }
}

async function writeDB(data) {
  if (pool) {
    await pool.query('UPDATE store SET data = $1 WHERE id = 1', [JSON.stringify(data)]);
    return;
  }
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ── API routes ────────────────────────────────────────────

app.get('/api/data', async (req, res) => {
  try {
    res.json(await readDB());
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/save', async (req, res) => {
  try {
    const db = await readDB();
    const body = req.body;
    if (body.techs !== undefined)     db.techs     = body.techs;
    if (body.checkouts !== undefined) db.checkouts = body.checkouts;
    if (body.log !== undefined)       db.log       = body.log.slice(0, 500);
    if (body.catalog !== undefined)   db.catalog   = body.catalog;
    if (body.passwords !== undefined) db.passwords = body.passwords;
    await writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/checkout', async (req, res) => {
  try {
    const db = await readDB();
    const { action, tech, partNum, desc, qty } = req.body;
    const key = tech + '__' + partNum;
    let ex = db.checkouts.find(c => c.key === key);
    if (action === 'pull') {
      if (ex) { ex.qty += qty; ex.desc = desc || ex.desc; }
      else db.checkouts.push({ key, tech, partNum, desc, qty });
    } else if (action === 'return') {
      if (ex) ex.qty = Math.max(0, ex.qty - qty);
    } else if (action === 'checkin') {
      if (ex) {
        ex.qty = Math.max(0, ex.qty - qty);
        if (req.body.shelf) ex.lastShelf = req.body.shelf;
      }
    }
    db.log.unshift({
      action, tech, partNum, desc, qty,
      shelf: req.body.shelf || '—',
      time: new Date().toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    });
    if (db.log.length > 500) db.log = db.log.slice(0, 500);
    await writeDB(db);
    res.json({ ok: true, checkouts: db.checkouts, log: db.log });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/techs', async (req, res) => {
  try {
    const db = await readDB();
    db.techs = req.body.techs;
    await writeDB(db);
    res.json({ ok: true, techs: db.techs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/catalog', async (req, res) => {
  try {
    const db = await readDB();
    db.catalog = req.body.catalog;
    await writeDB(db);
    res.json({ ok: true, count: db.catalog.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/passwords', async (req, res) => {
  try {
    const db = await readDB();
    db.passwords = req.body.passwords;
    await writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initDB()
  .then(() => app.listen(PORT, () => console.log(`Parts Tracker running on port ${PORT}`)))
  .catch(err => { console.error('DB init failed:', err); process.exit(1); });
