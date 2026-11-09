const express = require('express')
const { products } = require('../data/products')
const orders = require('../data/orders')

const router = express.Router()

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

  // Combine duplicates, e.g. productId 7 listed twice becomes one line
  const merged = {}

  for (const entry of items) {
    const productId = Number(entry.productId)
    const qty = Number(entry.qty)

    if (!Number.isInteger(qty) || qty < 1 || qty > 100) {
      return res.status(400).json({ error: 'qty must be a whole number from 1 to 100' })
    }

    // Prices always come from the server catalogue, never from the client
    const product = products.find((p) => p.id === productId)
    if (!product) {
      return res.status(400).json({ error: `Product ${entry.productId} does not exist` })
    }

    merged[productId] = (merged[productId] || 0) + qty
  }

  const orderItems = Object.entries(merged).map(([productId, qty]) => {
    const product = products.find((p) => p.id === Number(productId))
    return {
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      price: product.price,
      unit: product.unit,
      qty: Math.min(qty, 100),
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