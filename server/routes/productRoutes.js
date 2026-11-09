const express = require('express')
const store = require('../data/productStore')

const router = express.Router()

// GET /api/products
router.get('/', (req, res) => {
  const list = store.listProducts()
  res.json({ count: list.length, products: list })
})

// PATCH /api/products/7
// Body: { "price": 45 }
router.patch('/:id', (req, res) => {
  const id = Number(req.params.id)
  const price = Number((req.body || {}).price)

  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Invalid product id' })
  }

  if (!Number.isFinite(price) || price <= 0 || price > 100000) {
    return res.status(400).json({ error: 'Price must be a number between 0.01 and 100000' })
  }

  const updated = store.setPrice(id, Math.round(price * 100) / 100)

  if (!updated) {
    return res.status(404).json({ error: 'Product not found' })
  }

  res.json({ product: updated })
})

module.exports = router