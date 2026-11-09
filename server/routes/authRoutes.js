const express = require('express')
const crypto = require('crypto')
const jwt = require('jsonwebtoken')
const { requireAuth } = require('../middleware/auth')

const router = express.Router()

const SESSION_HOURS = 12
const MAX_FAILED_ATTEMPTS = 5
const BLOCK_MINUTES = 15

// Remembers failed logins per IP address (kept in memory)
const failures = new Map()

setInterval(() => {
  const now = Date.now()
  for (const [ip, entry] of failures) {
    if (entry.resetAt <= now) failures.delete(ip)
  }
}, 60 * 1000).unref()

// Compares two texts without leaking, through timing, how much of them matched
function safeEqual(a, b) {
  const hashA = crypto.createHash('sha256').update(String(a)).digest()
  const hashB = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(hashA, hashB)
}

// POST /api/auth/login
// Body: { "username": "...", "password": "..." }
router.post('/login', (req, res) => {
  const ip = req.ip
  const now = Date.now()

  const entry = failures.get(ip)
  if (entry && entry.resetAt > now && entry.count >= MAX_FAILED_ATTEMPTS) {
    const minutes = Math.ceil((entry.resetAt - now) / 60000)
    return res.status(429).json({
      error: `Too many wrong attempts. Try again in ${minutes} minute(s).`,
    })
  }

  const { username, password } = req.body || {}

  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length > 200 ||
    password.length > 200
  ) {
    return res.status(400).json({ error: 'Enter your username and password' })
  }

  // Both checks always run, so the reply time doesn't reveal which one was wrong
  const userOk = safeEqual(username.trim(), process.env.OWNER_USERNAME)
  const passOk = safeEqual(password, process.env.OWNER_PASSWORD)

  if (!(userOk && passOk)) {
    const current = entry && entry.resetAt > now ? entry : { count: 0, resetAt: now + BLOCK_MINUTES * 60000 }
    current.count += 1
    failures.set(ip, current)
    return res.status(401).json({ error: 'Wrong username or password' })
  }

  failures.delete(ip)

  const token = jwt.sign({ role: 'owner' }, process.env.JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: `${SESSION_HOURS}h`,
  })

  res.json({ token })
})

// GET /api/auth/me
// Lets the website check that its saved token is still valid
router.get('/me', requireAuth, (req, res) => {
  res.json({ ok: true })
})

module.exports = router