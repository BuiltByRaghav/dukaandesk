const express = require('express')
const store = require('../data/productStore')
const orders = require('../data/orders')

const router = express.Router()

const MAX_QTY = 100

// GET /api/orders
// Optional filter: /api/orders?status=active  or  /api/orders?status=done
router.get('/', (req, res) => {
  const { status } = req.query

  if (status && status !== 'active' && status !== 'done') {
    return res.status(400).json({ error: 'status must be "active" or "done"' })
  }

  const result = orders.listOrders(status)
  res.json({ count: result.length, orders: result })
})

// GET /api/orders/ORD-1001
router.get('/:id', (req, res) => {
  const order = orders.getOrder(req.params.id)

  if (!order) {
    return res.status(404).json({ error: 'Order not found' })
  }

  res.json({ order })
})

// POST /api/orders
// Body: { "customer": "Sunita", "items": [ { "productId": 7, "qty": 2 } ] }
router.post('/', (req, res) => {
  const { customer, items } = req.body || {}

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'An order needs at least one item' })
  }
  if (items.length > 200) {
    return res.status(400).json({ error: 'Too many items in one order' })
  }

  // Prices always come from the shop's catalogue in the database, never from the client
  const catalogue = new Map(store.listProducts().map((p) => [p.id, p]))

  // Combine duplicates, e.g. productId 7 listed twice becomes one line
  const merged = new Map()

  for (const entry of items) {
    const productId = Number(entry && entry.productId)
    const qty = Number(entry && entry.qty)

    if (!Number.isFinite(qty) || qty < 0.001 || qty > MAX_QTY) {
      return res.status(400).json({ error: 'qty must be a number from 0.001 to 100' })
    }

    if (!catalogue.has(productId)) {
      return res
        .status(400)
        .json({ error: `Product ${entry && entry.productId} is not in your catalogue` })
    }

    merged.set(productId, (merged.get(productId) || 0) + qty)
  }

  const orderItems = [...merged.entries()].map(([productId, qty]) => {
    const product = catalogue.get(productId)
    return {
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      price: product.price,
      unit: product.unit,
      qty: Math.min(Math.round(qty * 1000) / 1000, MAX_QTY),
    }
  })

  const newOrder = orders.createOrder({
    customer: String(customer || '').trim().slice(0, 60) || 'Walk-in customer',
    items: orderItems,
  })

  res.status(201).json({ order: newOrder })
})

// PATCH /api/orders/ORD-1001/done
router.patch('/:id/done', (req, res) => {
  const result = orders.markDone(req.params.id)

  if (result.error === 'not_found') {
    return res.status(404).json({ error: 'Order not found' })
  }

  if (result.error === 'already_done') {
    return res.status(409).json({ error: 'Order is already done' })
  }

  res.json({ order: result.order })
})

module.exports = router