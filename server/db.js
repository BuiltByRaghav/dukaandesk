// Opens the SQLite database, creates the tables, and imports old orders.json data once.

const Database = require('better-sqlite3')
const fs = require('fs')
const path = require('path')

const STORAGE_DIR = process.env.VERCEL ? '/tmp' : path.join(__dirname, 'storage')
const DB_FILE = path.join(STORAGE_DIR, 'dukaandesk.db')
const OLD_JSON_FILE = path.join(STORAGE_DIR, 'orders.json')

fs.mkdirSync(STORAGE_DIR, { recursive: true })

const db = new Database(DB_FILE)
db.pragma('journal_mode = WAL') // faster, and safe if the server stops suddenly
db.pragma('foreign_keys = ON')

// One row per order, and one row per item inside an order
db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    num          INTEGER PRIMARY KEY,
    id           TEXT NOT NULL UNIQUE,
    customer     TEXT NOT NULL,
    total        REAL NOT NULL,
    status       TEXT NOT NULL CHECK (status IN ('active', 'done')),
    created_at   INTEGER NOT NULL,
    completed_at INTEGER
  );

  CREATE TABLE IF NOT EXISTS order_items (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    order_num  INTEGER NOT NULL REFERENCES orders(num),
    product_id INTEGER NOT NULL,
    name       TEXT NOT NULL,
    emoji      TEXT NOT NULL,
    price      REAL NOT NULL,
    unit       TEXT NOT NULL,
    qty        INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_items_order ON order_items(order_num);
  CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
`)

// One-time import of the old orders.json file (only if the database is empty)
function importOldJson() {
  if (!fs.existsSync(OLD_JSON_FILE)) return

  const existing = db.prepare('SELECT COUNT(*) AS n FROM orders').get().n
  if (existing > 0) return

  let saved
  try {
    saved = JSON.parse(fs.readFileSync(OLD_JSON_FILE, 'utf-8'))
  } catch (error) {
    console.error('Could not read old orders.json, skipping import:', error.message)
    return
  }
  if (!Array.isArray(saved)) return

  const insertOrder = db.prepare(`
    INSERT OR IGNORE INTO orders (num, id, customer, total, status, created_at, completed_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)
  const insertItem = db.prepare(`
    INSERT INTO order_items (order_num, product_id, name, emoji, price, unit, qty)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  // A transaction means "all or nothing": a failure halfway leaves no partial data
  const importAll = db.transaction((list) => {
    let count = 0
    for (const order of list) {
      const num = Number(String(order.id).replace('ORD-', ''))
      if (!Number.isInteger(num)) continue

      const result = insertOrder.run(
        num,
        `ORD-${num}`,
        order.customer || 'Walk-in customer',
        Number(order.total) || 0,
        order.status === 'done' ? 'done' : 'active',
        order.createdAt || Date.now(),
        order.completedAt || null,
      )
      if (result.changes === 0) continue

      for (const item of order.items || []) {
        insertItem.run(num, item.productId, item.name, item.emoji, item.price, item.unit, item.qty)
      }
      count += 1
    }
    return count
  })

  const imported = importAll(saved)
  fs.renameSync(OLD_JSON_FILE, `${OLD_JSON_FILE}.migrated`) // keep a backup copy
  console.log(`Imported ${imported} order(s) from the old orders.json (kept as orders.json.migrated)`)
}

importOldJson()

process.on('exit', () => db.close())

module.exports = db