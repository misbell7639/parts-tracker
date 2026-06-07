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

// ── helpers ──────────────────────────────────────────────
function readDB() {
  try {
    if (!fs.existsSync(DATA_FILE)) return defaultDB();
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (e) {
    return defaultDB();
  }
}

function writeDB(data) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function defaultDB() {
  return {
    techs: ['MPER', 'ATOD', 'CHUF', 'ASMI'],
    checkouts: [],
    log: [],
    catalog: [],
    passwords: { catalog: '7639', manager: '@ccess18' }
  };
}

// ── API routes ────────────────────────────────────────────

// GET all data (for initial load)
app.get('/api/data', (req, res) => {
  res.json(readDB());
});

// SAVE full state (client sends everything back)
app.post('/api/save', (req, res) => {
  try {
    const db = readDB();
    const body = req.body;
    if (body.techs !== undefined)     db.techs     = body.techs;
    if (body.checkouts !== undefined) db.checkouts = body.checkouts;
    if (body.log !== undefined)       db.log       = body.log.slice(0, 500);
    if (body.catalog !== undefined)   db.catalog   = body.catalog;
    if (body.passwords !== undefined) db.passwords = body.passwords;
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Individual endpoints for granular updates
app.post('/api/checkout', (req, res) => {
  try {
    const db = readDB();
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
    writeDB(db);
    res.json({ ok: true, checkouts: db.checkouts, log: db.log });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/techs', (req, res) => {
  try {
    const db = readDB();
    db.techs = req.body.techs;
    writeDB(db);
    res.json({ ok: true, techs: db.techs });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/catalog', (req, res) => {
  try {
    const db = readDB();
    db.catalog = req.body.catalog;
    writeDB(db);
    res.json({ ok: true, count: db.catalog.length });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post('/api/passwords', (req, res) => {
  try {
    const db = readDB();
    db.passwords = req.body.passwords;
    writeDB(db);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// Fallback to index.html for any unknown route
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Parts Tracker running on port ${PORT}`);
});
