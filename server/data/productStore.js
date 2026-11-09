// Saves price changes in the database and applies them to the product list.
// The other server files keep using data/products.js and automatically see the new prices.

const db = require('../db')
const { products } = require('./products')

db.exec(`
  CREATE TABLE IF NOT EXISTS product_prices (
    product_id INTEGER PRIMARY KEY,
    price      REAL NOT NULL
  )
`)

// On startup, apply any saved prices on top of the defaults
for (const row of db.prepare('SELECT product_id, price FROM product_prices').all()) {
  const product = products.find((p) => p.id === row.product_id)
  if (product) product.price = row.price
}

const upsert = db.prepare(`
  INSERT INTO product_prices (product_id, price) VALUES (?, ?)
  ON CONFLICT(product_id) DO UPDATE SET price = excluded.price
`)

function listProducts() {
  return products
}

// Returns the updated product, or null if the id doesn't exist
function setPrice(id, price) {
  const product = products.find((p) => p.id === id)
  if (!product) return null

  upsert.run(id, price)
  product.price = price
  return product
}

module.exports = { listProducts, setPrice }