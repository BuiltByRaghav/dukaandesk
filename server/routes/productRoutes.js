const express = require('express')
const store = require('../data/productStore')

const router = express.Router()

const STATUS = { not_found: 404, conflict: 409, builtin: 403, invalid: 400 }

// Sends either the store's error or its success result
function send(res, result, okStatus = 200) {
  if (result.error) {
    return res.status(STATUS[result.error] || 400).json({ error: result.message })
  }
  return res.status(okStatus).json(result)
}

function readPrice(value) {
  const price = Number(value)
  if (!Number.isFinite(price) || price <= 0 || price > 100000) return null
  return Math.round(price * 100) / 100
}

function readText(value, max) {
  return String(value === undefined || value === null ? '' : value)
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, max)
}

const PRICE_ERROR = 'Price must be a number between 0.01 and 100000'

// GET /api/products  (built-in + custom, with prices and aliases)
router.get('/', (req, res) => {
  const list = store.listProducts()
  res.json({ count: list.length, products: list })
})

// POST /api/products
// Body: { "name": "Paneer", "price": 320, "unit": "kg", "category": "Dairy" }  (unit, category optional)
router.post('/', (req, res) => {
  const body = req.body || {}
  const name = readText(body.name, 60)
  const price = readPrice(body.price)

  if (!name) return res.status(400).json({ error: 'Enter a product name' })
  if (price === null) return res.status(400).json({ error: PRICE_ERROR })

  send(
    res,
    store.createProduct({
      name,
      price,
      unit: readText(body.unit, 20),
      category: readText(body.category, 30),
    }),
    201,
  )
})

// PATCH /api/products/7   Body: any of { price, name, unit, category }
// Built-in products accept only a price.
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id' })

  const body = req.body || {}
  const changes = {}

  if (body.price !== undefined) {
    const price = readPrice(body.price)
    if (price === null) return res.status(400).json({ error: PRICE_ERROR })
    changes.price = price
  }
  if (body.name !== undefined) {
    const name = readText(body.name, 60)
    if (!name) return res.status(400).json({ error: 'Enter a product name' })
    changes.name = name
  }
  if (body.unit !== undefined) changes.unit = readText(body.unit, 20)
  if (body.category !== undefined) changes.category = readText(body.category, 30)

  if (Object.keys(changes).length === 0) {
    return res.status(400).json({ error: 'Nothing to change' })
  }

  send(res, store.updateProduct(id, changes))
})

// DELETE /api/products/1001  (custom products only)
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id' })
  send(res, store.deleteProduct(id))
})

// POST /api/products/1001/aliases   Body: { "alias": "पनीर" }
router.post('/:id/aliases', (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(400).json({ error: 'Invalid product id' })
  send(res, store.addAlias(id, (req.body || {}).alias), 201)
})

// DELETE /api/products/1001/aliases/5
router.delete('/:id/aliases/:aliasId', (req, res) => {
  const id = Number(req.params.id)
  const aliasId = Number(req.params.aliasId)
  if (!Number.isInteger(id) || !Number.isInteger(aliasId)) {
    return res.status(400).json({ error: 'Invalid id' })
  }
  send(res, store.removeAlias(id, aliasId))
})

module.exports = router