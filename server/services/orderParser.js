const { products } = require('../data/products')
const { aliases } = require('../data/productAliases')

/* ---------- Word lists ---------- */

// Number words in English, Hindi, Marathi and Gujarati
const NUMBER_WORDS = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, chaar: 5 - 1, paanch: 5, panch: 5, chhe: 6, chhah: 6,
  saat: 7, aath: 8, nau: 9, das: 10,
  'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'छः': 6,
  'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
  don: 2, tin: 3, paach: 5, pach: 5, saha: 6, nau_: 9, daha: 10,
  'दोन': 2, 'पाच': 5, 'सहा': 6, 'नऊ': 9, 'दहा': 10,
  'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
  'એક': 1,
}

// Words that describe a quantity (we skip over them, e.g. "2 kilo tomato")
const UNIT_WORDS = new Set([
  'kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms',
  'litre', 'litres', 'liter', 'liters', 'packet', 'packets',
  'pack', 'packs', 'piece', 'pieces', 'dozen',
  'किलो', 'किलोग्राम', 'लीटर', 'पैकेट', 'डझन', 'दर्जन',
  'કિલો', 'કિલોગ્રામ', 'લીટર', 'પેકેટ',
])

const MAX_QTY = 100 // same limit as the orders API

/* ---------- Helpers ---------- */

// Lowercase and split into words. Works for English, Hindi, Marathi, Gujarati.
// \p{L} = letters, \p{M} = vowel marks used in Indian scripts, \p{N} = digits
function tokenize(text) {
  return String(text)
    .toLowerCase()
    .split(/[^\p{L}\p{M}\p{N}]+/u)
    .filter(Boolean)
}

function toNumber(token) {
  if (/^\d+$/.test(token)) return Number(token)
  return NUMBER_WORDS[token] ?? null
}

// Build a lookup: "tamatar" -> 7, "cold drink" -> 27, ...
const aliasMap = new Map()
let maxWords = 1

function addAlias(phrase, productId) {
  const key = tokenize(phrase).join(' ')
  if (!key) return
  aliasMap.set(key, productId)
  maxWords = Math.max(maxWords, key.split(' ').length)
}

products.forEach((product) => {
  addAlias(product.name, product.id)
  ;(aliases[product.id] || []).forEach((alias) => addAlias(alias, product.id))
})

// Look left for a quantity (skipping unit words like "kilo")
function findQtyBefore(tokens, used, from) {
  let j = from
  while (j >= 0 && UNIT_WORDS.has(tokens[j])) j--
  if (j >= 0 && !used[j] && toNumber(tokens[j]) !== null) {
    used[j] = true
    return toNumber(tokens[j])
  }
  return null
}

// Look right for a quantity (skipping unit words)
function findQtyAfter(tokens, used, from) {
  let j = from
  while (j < tokens.length && UNIT_WORDS.has(tokens[j])) j++
  if (j < tokens.length && !used[j] && toNumber(tokens[j]) !== null) {
    used[j] = true
    return toNumber(tokens[j])
  }
  return null
}

/* ---------- Main function ---------- */

// Turns "2 kilo tamatar aur 1 doodh" into a list of order items.
function parseTranscript(text) {
  const tokens = tokenize(text)
  const used = new Array(tokens.length).fill(false)
  const found = new Map() // productId -> qty, in the order spoken

  let i = 0
  while (i < tokens.length) {
    // Try the longest phrase first, so "cold drink" wins over "drink"
    let match = null
    for (let len = Math.min(maxWords, tokens.length - i); len >= 1; len--) {
      const phrase = tokens.slice(i, i + len).join(' ')
      if (aliasMap.has(phrase)) {
        match = { productId: aliasMap.get(phrase), len }
        break
      }
    }

    if (!match) {
      i++
      continue
    }

    const start = i
    const end = i + match.len - 1

    // Quantity can come before ("2 tomato") or after ("tomato 2"). Default is 1.
    let qty = findQtyBefore(tokens, used, start - 1)
    if (qty === null) qty = findQtyAfter(tokens, used, end + 1)
    if (qty === null) qty = 1

    qty = Math.min(Math.max(qty, 1), MAX_QTY)
    found.set(match.productId, (found.get(match.productId) || 0) + qty)

    i = end + 1
  }

  const items = [...found.entries()].map(([productId, qty]) => {
    const product = products.find((p) => p.id === productId)
    return {
      productId: product.id,
      name: product.name,
      emoji: product.emoji,
      price: product.price,
      unit: product.unit,
      qty: Math.min(qty, MAX_QTY),
    }
  })

  return items
}

module.exports = { parseTranscript }