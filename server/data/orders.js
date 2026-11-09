// All order reading and writing goes through this file.
// Orders are never deleted. Marking one Done only changes its status.

const db = require('../db')

const selectItems = db.prepare('SELECT * FROM order_items WHERE order_num = ? ORDER BY id')
const selectOne = db.prepare('SELECT * FROM orders WHERE id = ?')
const insertOrder = db.prepare(`
  INSERT INTO orders (num, id, customer, total, status, created_at, completed_at)
  VALUES (?, ?, ?, ?, 'active', ?, NULL)
`)
const insertItem = db.prepare(`
  INSERT INTO order_items (order_num, product_id, name, emoji, price, unit, qty)
  VALUES (?, ?, ?, ?, ?, ?, ?)
`)
const markDoneStmt = db.prepare(`
  UPDATE orders SET status = 'done', completed_at = ? WHERE id = ? AND status = 'active'
`)
const maxNum = db.prepare('SELECT MAX(num) AS max FROM orders')

// Turns a database row into the same object shape the React app already uses
function toOrder(row) {
  return {
    id: row.id,
    customer: row.customer,
    items: selectItems.all(row.num).map((item) => ({
      productId: item.product_id,
      name: item.name,
      emoji: item.emoji,
      price: item.price,
      unit: item.unit,
      qty: item.qty,
    })),
    total: row.total,
    status: row.status,
    createdAt: row.created_at,
    completedAt: row.completed_at,
  }
}

// status: 'active', 'done', or undefined for everything
function listOrders(status) {
  let rows

  if (status === 'done') {
    rows = db.prepare("SELECT * FROM orders WHERE status = 'done' ORDER BY completed_at DESC").all()
  } else if (status === 'active') {
    rows = db.prepare("SELECT * FROM orders WHERE status = 'active' ORDER BY created_at DESC").all()
  } else {
    rows = db.prepare('SELECT * FROM orders ORDER BY created_at DESC').all()
  }

  return rows.map(toOrder)
}

function getOrder(id) {
  const row = selectOne.get(id)
  return row ? toOrder(row) : null
}

// items: [{ productId, name, emoji, price, unit, qty }]
const createOrder = db.transaction(({ customer, items }) => {
  // The next number is worked out inside the transaction, so two orders can never share an ID
  const num = Math.max(maxNum.get().max || 1000, 1000) + 1
  const id = `ORD-${num}`
  const total = Math.round(items.reduce((sum, item) => sum + item.price * item.qty, 0) * 100) / 100

  insertOrder.run(num, id, customer, total, Date.now())
  for (const item of items) {
    insertItem.run(num, item.productId, item.name, item.emoji, item.price, item.unit, item.qty)
  }

  return getOrder(id)
})

// Returns { order } on success, or { error: 'not_found' | 'already_done' }
function markDone(id) {
  const result = markDoneStmt.run(Date.now(), id)

  if (result.changes === 0) {
    return { error: getOrder(id) ? 'already_done' : 'not_found' }
  }

  return { order: getOrder(id) }
}

module.exports = { listOrders, getOrder, createOrder, markDone }