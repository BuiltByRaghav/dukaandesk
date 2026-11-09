// The shop's catalogue: built-in products + the shopkeeper's own products + voice aliases.
// Every other server file reads products from here.

const db = require('../db')
const { categories, products: builtIn } = require('./products')
const { aliases: builtInAliases } = require('./productAliases')
const { buildIndex, aliasKey, reservedReason } = require('../services/orderParser')

const DEFAULT_EMOJI = '🏷️'
const MAX_ALIASES = 20

db.exec(`
  CREATE TABLE IF NOT EXISTS product_prices (
    product_id INTEGER PRIMARY KEY,
    price      REAL NOT NULL
  );

  CREATE TABLE IF NOT EXISTS custom_products (
    id         INTEGER PRIMARY KEY,
    name       TEXT NOT NULL,
    price      REAL NOT NULL,
    unit       TEXT NOT NULL,
    category   TEXT NOT NULL,
    active     INTEGER NOT NULL DEFAULT 1,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS product_aliases (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    alias      TEXT NOT NULL,
    key        TEXT NOT NULL UNIQUE
  );
`)

const selectPrices = db.prepare('SELECT product_id, price FROM product_prices')
const selectCustom = db.prepare('SELECT * FROM custom_products WHERE active = 1 ORDER BY id')
const selectAliases = db.prepare('SELECT id, product_id, alias FROM product_aliases ORDER BY id')
const upsertPrice = db.prepare(`
  INSERT INTO product_prices (product_id, price) VALUES (?, ?)
  ON CONFLICT(product_id) DO UPDATE SET price = excluded.price
`)
const maxCustomId = db.prepare('SELECT MAX(id) AS max FROM custom_products')
const insertCustomRow = db.prepare(`
  INSERT INTO custom_products (id, name, price, unit, category, active, created_at)
  VALUES (?, ?, ?, ?, ?, 1, ?)
`)
const updateCustomRow = db.prepare(
  'UPDATE custom_products SET name = ?, price = ?, unit = ?, category = ? WHERE id = ? AND active = 1',
)
const deactivateCustom = db.prepare('UPDATE custom_products SET active = 0 WHERE id = ?')
const deleteAliasesOf = db.prepare('DELETE FROM product_aliases WHERE product_id = ?')
const insertAlias = db.prepare('INSERT INTO product_aliases (product_id, alias, key) VALUES (?, ?, ?)')
const deleteAlias = db.prepare('DELETE FROM product_aliases WHERE id = ? AND product_id = ?')
const customCategories = db.prepare('SELECT DISTINCT category FROM custom_products WHERE active = 1')

/* ---------- Reading ---------- */

// Every product the shop sells, with current prices and the aliases the shopkeeper added
function listProducts() {
  const prices = new Map(selectPrices.all().map((row) => [row.product_id, row.price]))

  const taught = new Map()
  for (const row of selectAliases.all()) {
    if (!taught.has(row.product_id)) taught.set(row.product_id, [])
    taught.get(row.product_id).push({ id: row.id, alias: row.alias })
  }

  const fromBuiltIn = builtIn.map((p) => ({
    ...p,
    price: prices.has(p.id) ? prices.get(p.id) : p.price,
    custom: false,
    aliases: taught.get(p.id) || [],
  }))

  const fromCustom = selectCustom.all().map((row) => ({
    id: row.id,
    name: row.name,
    emoji: DEFAULT_EMOJI,
    price: row.price,
    unit: row.unit,
    category: row.category,
    custom: true,
    aliases: taught.get(row.id) || [],
  }))

  return [...fromBuiltIn, ...fromCustom]
}

function findProduct(id) {
  return listProducts().find((p) => p.id === id) || null
}

// Products plus every phrase that can be spoken for them (used by the voice parser)
function getCatalogue() {
  return listProducts().map((p) => ({
    ...p,
    phrases: [...(builtInAliases[p.id] || []), ...p.aliases.map((a) => a.alias)],
  }))
}

/* ---------- Checks ---------- */

// Which OTHER product already uses this word or phrase?
function owner(key, exceptId) {
  const catalogue = getCatalogue()
  const ids = buildIndex(catalogue).get(key) || []
  const otherId = ids.find((id) => id !== exceptId)
  return otherId === undefined ? null : catalogue.find((p) => p.id === otherId)
}

function nameProblem(name, exceptId) {
  const key = aliasKey(name)
  if (!key) return { error: 'invalid', message: 'Enter a product name' }

  const reason = reservedReason(key)
  if (reason) {
    return { error: 'invalid', message: `"${name}" is ${reason}, so it can't be used as a product name` }
  }

  const clash = owner(key, exceptId)
  if (clash) return { error: 'conflict', message: `"${name}" already refers to ${clash.name}` }

  return null
}

// Reuses an existing category spelling (so "fruits" joins "Fruits"); blank becomes "Other"
function canonicalCategory(input) {
  const wanted = String(input || '').trim().replace(/\s+/g, ' ').slice(0, 30)
  if (!wanted) return 'Other'

  const known = new Set([
    ...categories.filter((c) => c !== 'All'),
    'Other',
    ...customCategories.all().map((row) => row.category),
  ])
  for (const name of known) {
    if (name.toLowerCase() === wanted.toLowerCase()) return name
  }
  return wanted
}

/* ---------- Custom products ---------- */

// Ids start at 1001 (built-in products use 1 to 28) and are never reused
const insertCustom = db.transaction(({ name, price, unit, category }) => {
  const id = Math.max(maxCustomId.get().max || 1000, 1000) + 1
  insertCustomRow.run(id, name, price, unit, category, Date.now())
  return id
})

function createProduct({ name, price, unit, category }) {
  const problem = nameProblem(name)
  if (problem) return problem

  const id = insertCustom({ name, price, unit: unit || 'item', category: canonicalCategory(category) })
  return { product: findProduct(id) }
}

// changes: any of { name, price, unit, category }. Built-in products accept only a price.
function updateProduct(id, changes) {
  const current = findProduct(id)
  if (!current) return { error: 'not_found', message: 'Product not found' }

  if (!current.custom) {
    if (Object.keys(changes).some((key) => key !== 'price')) {
      return { error: 'builtin', message: 'Built-in products can only have their price changed' }
    }
    upsertPrice.run(id, changes.price)
    return { product: findProduct(id) }
  }

  const next = {
    name: changes.name !== undefined ? changes.name : current.name,
    price: changes.price !== undefined ? changes.price : current.price,
    unit: changes.unit !== undefined ? changes.unit || 'item' : current.unit,
    category: changes.category !== undefined ? canonicalCategory(changes.category) : current.category,
  }

  if (changes.name !== undefined) {
    const problem = nameProblem(next.name, id)
    if (problem) return problem
  }

  updateCustomRow.run(next.name, next.price, next.unit, next.category, id)
  return { product: findProduct(id) }
}

// Hides the product everywhere. Old orders keep their own copy of the name and price.
const removeCustom = db.transaction((id) => {
  deactivateCustom.run(id)
  deleteAliasesOf.run(id)
})

function deleteProduct(id) {
  const current = findProduct(id)
  if (!current) return { error: 'not_found', message: 'Product not found' }
  if (!current.custom) return { error: 'builtin', message: 'Built-in products cannot be deleted' }

  removeCustom(id)
  return { ok: true }
}

/* ---------- Aliases ---------- */

function addAlias(productId, text) {
  const product = findProduct(productId)
  if (!product) return { error: 'not_found', message: 'Product not found' }

  const alias = String(text || '').trim().replace(/\s+/g, ' ')
  const key = aliasKey(alias)

  if (!key) return { error: 'invalid', message: 'Type a word or phrase' }
  if (alias.length > 40 || key.split(' ').length > 4) {
    return { error: 'invalid', message: 'Keep an alias to 4 words or fewer' }
  }
  if (product.aliases.length >= MAX_ALIASES) {
    return { error: 'invalid', message: `A product can have at most ${MAX_ALIASES} extra names` }
  }

  const reason = reservedReason(key)
  if (reason) return { error: 'invalid', message: `"${alias}" is ${reason}, so it can't be used as a product name` }

  const clash = owner(key, productId)
  if (clash) return { error: 'conflict', message: `"${alias}" already means ${clash.name}` }

  const ownIds = buildIndex(getCatalogue()).get(key) || []
  if (ownIds.includes(productId)) {
    return { error: 'conflict', message: `"${alias}" is already a name for ${product.name}` }
  }

  insertAlias.run(productId, alias, key)
  return { product: findProduct(productId) }
}

function removeAlias(productId, aliasId) {
  const result = deleteAlias.run(aliasId, productId)
  if (result.changes === 0) return { error: 'not_found', message: 'Alias not found' }
  return { product: findProduct(productId) }
}

module.exports = {
  listProducts,
  findProduct,
  getCatalogue,
  createProduct,
  updateProduct,
  deleteProduct,
  addAlias,
  removeAlias,
}