// Understands an order sentence using ONLY the shop's own catalogue.
//  - A product is recognised only when the words match its name or one of its aliases.
//  - Prices come from the catalogue (the database). Nothing is invented.
//  - Anything unclear is returned as a "clarification" for the shopkeeper, never guessed.

const MAX_QTY = 100

/* ---------- Text helpers ---------- */

// Lowercase, convert Hindi/Marathi/Gujarati digits, and drop "nukta" dots (ज़ -> ज)
// so that spelling variants of the same word match.
function cleanText(text) {
  return String(text)
    .normalize('NFD')
    .replace(/[\u093c\u0abc]/g, '')
    .normalize('NFC')
    .replace(/[\u200b-\u200d\ufeff]/g, '')
    .toLowerCase()
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[૦-૯]/g, (d) => String('૦૧૨૩૪૫૬૭૮૯'.indexOf(d)))
}

function wordSet(list) {
  return new Set(list.split(/\s+/).filter(Boolean).map(cleanText))
}

/* ---------- Word lists (English, Hindi, Marathi, Gujarati, Hinglish) ---------- */

const SEPARATORS = new Set([',', ';', '।'])

// Words that split one item from the next: "tamatar AUR doodh"
const SEPARATOR_WORDS = wordSet('aur and also plus ani aani tatha ane और तथा आणि અને')

// Polite or filler words that carry no meaning for the order
const FILLER = wordSet(`
  a an the of to for my me i we you it is are am was be can could will would shall please plz pls kindly
  give get want wants need needs order add send bring put take like have has some any just only
  fresh good best nice small big
  mujhe muje mujhko hume humein hamein humko mereko mera meri mere apna apne aap aapka tum
  chahiye chahie chahiyen chaiye chahta chahti chahte
  dena de dedo dijiye dijie deejiye diji
  kijiye kijie karo kar karna bhejo bhej bhejiye lao laiye le lena lijiye lo
  hai hain ho hoga toh ka ke ki ko se mein me par pe ye yeh woh wo bhi bas sirf kuch thoda thodi
  hello hi namaste sir madam bhaiya bhaiyya bhai uncle ji ok okay theek thik accha achha acchi
  taza tazi tazaa kitna kya nahi nahin na mat abhi jaldi delivery bill total zara jara
  मुझे मुझको हमें हमको चाहिए चाहिये दीजिए दीजिये दे देना कीजिए करो कर भेजो भेज लाओ ले लेना लीजिए
  है हैं हो का के की को से में पर पे ये यह वो भी बस कुछ थोड़ा थोड़ी हेलो नमस्ते सर भैया भाई जी
  ओके ठीक अच्छा अच्छी ताजा ताज़ा आप मेरे मेरा मेरी तो ना नहीं कृपया प्लीज ऑर्डर अब जल्दी कितना क्या ज़रा जरा
  mala amhala pahije pahijet hawe dya dyaa ahe aahe aho
  मला आम्हाला पाहिजे हवे हवा हवी द्या देणे ला चा ची चे च्या मध्ये आहे आहेत तर पण भाऊ दादा ताई अहो
  mane amane joie joiye joshe aapo apo aapjo che
  મને અમને જોઈએ જોઈશે આપો આપજો કૃપા કરીને છે નો ની નું ના માં પર ભાઈ સર ઓર્ડર
`)

// "tamatar de DO" means "give", not "2"
const GIVE_WORDS = wordSet('de दे dena देना dijiye दीजिए')
const DO_WORDS = wordSet('do दो')

const NUMBER_MAP = new Map(
  Object.entries({
    one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
    ek: 1, do: 2, teen: 3, char: 4, chaar: 4, paanch: 5, panch: 5, chhe: 6, chhah: 6,
    saat: 7, aath: 8, nau: 9, das: 10,
    don: 2, paach: 5, pach: 5, saha: 6, daha: 10, tran: 3, chha: 6, nav: 9,
    'एक': 1, 'दो': 2, 'तीन': 3, 'चार': 4, 'पाँच': 5, 'पांच': 5, 'छह': 6, 'छः': 6,
    'सात': 7, 'आठ': 8, 'नौ': 9, 'दस': 10,
    'दोन': 2, 'पाच': 5, 'सहा': 6, 'नऊ': 9, 'दहा': 10,
    'એક': 1, 'બે': 2, 'ત્રણ': 3, 'ચાર': 4, 'પાંચ': 5, 'છ': 6, 'સાત': 7, 'આઠ': 8, 'નવ': 9, 'દસ': 10,
    // halves and "one and a half" / "two and a half"
    half: 0.5, aadha: 0.5, adha: 0.5, 'आधा': 0.5, 'आधी': 0.5, 'अर्धा': 0.5, 'અડધો': 0.5, 'અડધા': 0.5,
    dedh: 1.5, derh: 1.5, 'डेढ़': 1.5, 'दीड': 1.5, 'દોઢ': 1.5,
    dhai: 2.5, dhaai: 2.5, 'ढाई': 2.5, 'अडीच': 2.5, 'અઢી': 2.5,
  }).map(([word, value]) => [cleanText(word), value]),
)

// type: weight (factor = grams), volume (factor = ml), count (factor = how many pieces)
const UNIT_GROUPS = [
  { type: 'weight', factor: 1000, words: 'kg kgs kilo kilos kilogram kilograms किलो किलोग्राम કિલો કિલોગ્રામ' },
  { type: 'weight', factor: 1, words: 'g gm gms gram grams ग्राम ग्रॅम ગ્રામ' },
  { type: 'volume', factor: 1000, words: 'l ltr ltrs lit litre litres liter liters लीटर लिटर લીટર લિટર' },
  { type: 'volume', factor: 1, words: 'ml mls millilitre millilitres milliliter milliliters मिली मिलीलीटर મિલી' },
  { type: 'count', factor: 1, piece: true, words: 'piece pieces pc pcs nag नग टुकड़ा तुकडा ટુકડો' },
  {
    type: 'count',
    factor: 1,
    words:
      'packet packets pack packs pkt पैकेट पॅकेट પેકેટ bottle bottles botal बोतल बाटली બોટલ loaf loaves bunch bunches gaddi गड्डी bar bars box boxes dabba dibba डब्बा डिब्बा ડબ્બો',
  },
  { type: 'count', factor: 12, words: 'dozen dozens darjan dozan डझन दर्जन ડઝન' },
]

const BASE_UNITS = new Map()
for (const group of UNIT_GROUPS) {
  for (const word of group.words.split(/\s+/)) {
    BASE_UNITS.set(cleanText(word), { type: group.type, factor: group.factor, piece: Boolean(group.piece) })
  }
}

/* ---------- Tokens and keys ---------- */

// Numbers (2, 2.5), words in any script, and separators (comma, danda)
const TOKEN_RE = /\d+(?:\.\d+)?|[\p{L}\p{M}]+|[,;।]/gu

function tokenize(text) {
  return cleanText(text).match(TOKEN_RE) || []
}

// "Cold Drink!" -> "cold drink". Used for product names and aliases.
function aliasKey(text) {
  return tokenize(text)
    .filter((token) => !SEPARATORS.has(token))
    .join(' ')
}

// Why a word can't be used as a product name or alias (or null if it can)
function reservedReason(key) {
  if (!key) return 'empty'
  if (!key.includes(' ')) {
    if (/^\d/.test(key) || NUMBER_MAP.has(key)) return 'a number'
    if (BASE_UNITS.has(key)) return 'a unit word'
    if (FILLER.has(key) || SEPARATOR_WORDS.has(key)) return 'a common filler word'
  }
  return null
}

/* ---------- Catalogue index ---------- */

// phrase -> [productId, ...]. A phrase with 2+ ids is ambiguous and will be asked about.
function buildIndex(catalogue, { variants = false } = {}) {
  const index = new Map()

  function add(phrase, id) {
    const key = aliasKey(phrase)
    if (!key) return
    const ids = index.get(key)
    if (!ids) index.set(key, [id])
    else if (!ids.includes(id)) ids.push(id)
  }

  for (const product of catalogue) {
    add(product.name, product.id)
    for (const alias of product.phrases || []) add(alias, product.id)
  }

  // Simple English plurals: "mangos" <-> "mango" (never overrides a real name or alias)
  if (variants) {
    for (const key of [...index.keys()]) {
      if (!/^[a-z]{4,}$/.test(key)) continue
      const other = key.endsWith('s') ? key.slice(0, -1) : `${key}s`
      if (!index.has(other)) index.set(other, [...index.get(key)])
    }
  }

  return index
}

function longestPhrase(index) {
  let longest = 1
  for (const key of index.keys()) longest = Math.max(longest, key.split(' ').length)
  return longest
}

/* ---------- Units and quantities ---------- */

// "kg" -> weight 1000 g,  "250g" -> weight 250 g (a pack),  "dozen" -> 12 pieces,  "loaf" -> 1 piece
function parseProductUnit(unit) {
  const key = aliasKey(unit)
  const match = key.match(/^(\d+(?:\.\d+)?) (.+)$/)
  const amount = match ? Number(match[1]) : 1
  const known = BASE_UNITS.get(match ? match[2] : key)

  if (known && amount > 0) return { type: known.type, size: amount * known.factor, pack: Boolean(match) }
  return { type: 'count', size: 1, pack: Boolean(match) }
}

// Turns what was said ("500 gram") into the product's own unit ("0.5" kg)
function convertQty(group, unit) {
  const spoken = group.unit

  if (!spoken) {
    // A bare number. For dozen-priced items ("6 eggs") it could mean dozens or pieces, so ask.
    if (unit.type === 'count' && unit.size > 1) return { error: 'need_unit' }
    return { qty: group.value }
  }

  if (spoken.type === unit.type) {
    if (unit.type === 'count' && unit.size > 1 && spoken.factor === 1 && !spoken.piece) {
      return { error: 'unit_mismatch' }
    }
    return { qty: (group.value * spoken.factor) / unit.size }
  }

  // "2 packet cheese" when cheese is sold in 200g packs
  if (spoken.type === 'count' && unit.pack) return { qty: group.value * spoken.factor }

  return { error: 'unit_mismatch' }
}

/* ---------- Spelling help ---------- */

function distance(a, b) {
  const x = Array.from(a)
  const y = Array.from(b)
  let previous = Array.from({ length: y.length + 1 }, (_, j) => j)

  for (let i = 1; i <= x.length; i++) {
    const row = [i]
    for (let j = 1; j <= y.length; j++) {
      row[j] = Math.min(
        previous[j] + 1,
        row[j - 1] + 1,
        previous[j - 1] + (x[i - 1] === y[j - 1] ? 0 : 1),
      )
    }
    previous = row
  }

  return previous[y.length]
}

// Products whose name or alias is CLOSE to an unknown word (used only to offer "Did you mean...?")
function suggest(word, index) {
  const length = Array.from(word).length
  if (length < 4) return []

  const limit = length <= 5 ? 1 : 2
  const best = new Map()

  for (const [key, ids] of index) {
    for (const part of key.split(' ')) {
      if (Math.abs(Array.from(part).length - length) > limit) continue
      if (length <= 5 && part[0] !== word[0]) continue

      const d = distance(word, part)
      if (d > limit) continue
      for (const id of ids) best.set(id, Math.min(best.has(id) ? best.get(id) : 9, d))
    }
  }

  return [...best.entries()]
    .sort((a, b) => a[1] - b[1])
    .slice(0, 3)
    .map(([id]) => id)
}

/* ---------- Main function ---------- */

// text: the sentence.  catalogue: products with a `phrases` list (from productStore.getCatalogue()).
// options.choices: words the shopkeeper already clarified, e.g. { tamater: 7 }.
// Returns { items, clarifications, ignored }.
function parseTranscript(text, catalogue, options = {}) {
  const byId = new Map(catalogue.map((p) => [p.id, p]))
  const index = buildIndex(catalogue, { variants: true })

  // A choice only counts if the product really is in the catalogue
  for (const [word, id] of Object.entries(options.choices || {})) {
    const key = aliasKey(word)
    if (key && byId.has(Number(id))) index.set(key, [Number(id)])
  }
  const maxWords = longestPhrase(index)

  // Units: the standard ones plus each product's own unit word (tin, jar, ...)
  const units = new Map(BASE_UNITS)
  for (const product of catalogue) {
    const label = aliasKey(product.unit)
    if (/^[\p{L}\p{M}]+$/u.test(label) && !units.has(label) && !NUMBER_MAP.has(label)) {
      units.set(label, { type: 'count', factor: 1, piece: false })
    }
  }

  const tokens = tokenize(text)

  /* Step 1: label every word as a product, number, unit, separator or unknown word */
  const entities = []
  let i = 0
  while (i < tokens.length) {
    const token = tokens[i]

    if (SEPARATORS.has(token)) {
      entities.push({ kind: 'sep' })
      i += 1
      continue
    }

    // Longest product name/alias first, so "cold drink" wins over "drink"
    let match = null
    for (let len = Math.min(maxWords, tokens.length - i); len >= 1; len--) {
      const slice = tokens.slice(i, i + len)
      if (slice.some((t) => SEPARATORS.has(t))) continue
      const key = slice.join(' ')
      if (index.has(key)) {
        match = { key, ids: index.get(key), len }
        break
      }
    }
    if (match) {
      entities.push({ kind: 'product', key: match.key, ids: match.ids })
      i += match.len
      continue
    }

    if (SEPARATOR_WORDS.has(token)) {
      entities.push({ kind: 'sep' })
    } else if (/^\d/.test(token)) {
      entities.push({ kind: 'num', value: Number(token), word: token })
    } else if (NUMBER_MAP.has(token)) {
      if (!(DO_WORDS.has(token) && GIVE_WORDS.has(tokens[i - 1]))) {
        entities.push({ kind: 'num', value: NUMBER_MAP.get(token), word: token })
      }
    } else if (units.has(token)) {
      entities.push({ kind: 'unit', word: token, ...units.get(token) })
    } else if (!FILLER.has(token)) {
      entities.push({ kind: 'word', word: token })
    }
    i += 1
  }

  /* Step 2: quantity groups, e.g. "2 kilo", "aadha kilo", "500 gram", "3" */
  const groups = []
  for (let k = 0; k < entities.length; k++) {
    const e = entities[k]
    const next = entities[k + 1]

    if (e.kind === 'num') {
      if (next && next.kind === 'unit') {
        groups.push({ start: k, end: k + 1, value: e.value, unit: next, spoken: `${e.word} ${next.word}` })
        k += 1
      } else {
        groups.push({ start: k, end: k, value: e.value, unit: null, spoken: e.word })
      }
    } else if (e.kind === 'unit' && e.word.length > 1) {
      // "kilo tamatar" with no number means 1 kilo
      groups.push({ start: k, end: k, value: 1, unit: e, spoken: e.word, impliedOne: true })
    }
  }

  /* Step 3: give each product its quantity ("2 kilo tamatar" or "tamatar 2 kilo") */
  const claimed = new Set()
  const lines = new Map() // productId -> { product, qty, assumed }
  const clarifications = []

  function optionsFor(ids) {
    return ids
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((p) => ({ productId: p.id, name: p.name, emoji: p.emoji, unit: p.unit }))
  }

  function ask(type, message, extra = {}) {
    clarifications.push({ type, message, word: null, options: [], pick: false, ...extra })
  }

  entities.forEach((e, k) => {
    if (e.kind !== 'product') return

    // A quantity directly before the product wins; otherwise one directly after it
    let group = groups.find((g) => g.end === k - 1)
    if (!group || claimed.has(group)) group = groups.find((g) => g.start === k + 1)
    if (group && claimed.has(group)) group = null
    if (group) claimed.add(group)

    if (e.ids.length > 1) {
      ask('ambiguous', `"${e.key}" could mean more than one product. Which one did you mean?`, {
        word: e.key,
        options: optionsFor(e.ids),
      })
      return
    }

    const product = byId.get(e.ids[0])
    const unit = parseProductUnit(product.unit)

    let qty = 1
    let assumed = true

    if (group) {
      assumed = Boolean(group.impliedOne)
      const converted = convertQty(group, unit)

      if (converted.error === 'need_unit') {
        ask(
          'need_unit',
          `${product.name} is priced per ${product.unit}. Say the unit too, for example "1 ${product.unit}" or "6 piece".`,
        )
        return
      }
      if (converted.error === 'unit_mismatch') {
        ask(
          'unit_mismatch',
          `${product.name} is sold per ${product.unit}, so "${group.spoken}" doesn't fit. Say the quantity in ${product.unit}, or just a number.`,
        )
        return
      }
      qty = Math.round(converted.qty * 1000) / 1000
    }

    const existing = lines.get(product.id)
    const total = Math.round(((existing ? existing.qty : 0) + qty) * 1000) / 1000

    if (qty < 0.001 || total > MAX_QTY) {
      ask('bad_quantity', `${product.name}: that quantity is out of range (0.001 to ${MAX_QTY} ${product.unit}).`)
      return
    }

    lines.set(product.id, {
      product,
      qty: total,
      assumed: existing ? existing.assumed && assumed : assumed,
    })
  })

  /* Step 4: words we did not understand */
  const unclaimed = groups.filter((g) => !claimed.has(g))
  const ignored = []
  const seen = new Set()

  entities.forEach((e, k) => {
    if (e.kind !== 'word' || seen.has(e.word)) return
    seen.add(e.word)

    const nextToQuantity = unclaimed.some((g) => g.end === k - 1 || g.start === k + 1)
    const close = suggest(e.word, index)

    if (close.length > 0) {
      ask('suggestion', `I didn't recognise "${e.word}". Did you mean:`, {
        word: e.word,
        options: optionsFor(close),
      })
    } else if (nextToQuantity) {
      ask('unknown', `"${e.word}" isn't in your catalogue. Choose the product it means, or say it again.`, {
        word: e.word,
        pick: true,
      })
    } else {
      ignored.push(e.word)
    }
  })

  const items = [...lines.values()].map(({ product, qty, assumed }) => ({
    productId: product.id,
    name: product.name,
    emoji: product.emoji,
    price: product.price,
    unit: product.unit,
    qty,
    assumedQty: assumed,
  }))

  return { items, clarifications, ignored }
}

module.exports = { parseTranscript, buildIndex, aliasKey, reservedReason }