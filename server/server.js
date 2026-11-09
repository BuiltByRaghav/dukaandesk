// Load variables from the .env file (must be first)
require('dotenv').config()

const express = require('express')
const cors = require('cors')
const productRoutes = require('./routes/productRoutes')
const orderRoutes = require('./routes/orderRoutes')
const voiceRoutes = require('./routes/voiceRoutes')
const authRoutes = require('./routes/authRoutes')
const { requireAuth } = require('./middleware/auth')

/* ---------- Check login settings before anything starts ---------- */

const missing = ['OWNER_USERNAME', 'OWNER_PASSWORD', 'JWT_SECRET'].filter(
  (name) => !process.env[name],
)
if (missing.length > 0) {
  console.error(`Missing in server/.env: ${missing.join(', ')}. The server cannot start without them.`)
  process.exit(1)
}
if (process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET must be at least 32 characters. Generate a longer one (see the setup step).')
  process.exit(1)
}
if (process.env.OWNER_PASSWORD.length < 8) {
  console.error('OWNER_PASSWORD must be at least 8 characters.')
  process.exit(1)
}

const app = express()
const PORT = process.env.PORT || 5000

// CLIENT_URL can hold several addresses separated by commas, e.g.
// http://localhost:5173,https://dukaandesk.example.com
const allowedOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

/* ---------- Middleware ---------- */

// Don't tell the world we use Express
app.disable('x-powered-by')

// Only your own React app may call this server
app.use(
  cors({
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
)

// Read JSON bodies (small limit: orders and typed text are tiny)
app.use(express.json({ limit: '100kb' }))

// Print one line per request in the terminal, e.g. "POST /api/orders 201 4ms"
app.use((req, res, next) => {
  const start = Date.now()
  res.on('finish', () => {
    if (req.path === '/api/health') return
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})

/* ---------- Routes ---------- */

// Public: confirms the server is running
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'DukaanDesk server is running',
    voiceConfigured: Boolean(process.env.GNANI_API_KEY),
    time: new Date().toISOString(),
  })
})

// Public: logging in
app.use('/api/auth', authRoutes)

// Everything below requires a logged-in shopkeeper
app.use('/api/products', requireAuth, productRoutes)
app.use('/api/orders', requireAuth, orderRoutes)
app.use('/api/voice', requireAuth, voiceRoutes)

/* ---------- Errors ---------- */

// Any /api address that doesn't exist
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'Route not found' })
})

// Catches anything that went wrong (must have 4 arguments)
app.use((err, req, res, next) => {
  // Broken JSON sent by a client
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'Request body is not valid JSON' })
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request is too large' })
  }

  console.error('Unexpected error:', err)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

/* ---------- Start server ---------- */

/* ---------- Start server ---------- */

// Vercel imports the app; locally (npm run dev) we start it ourselves
if (require.main === module) {
  const server = app.listen(PORT, () => {
    console.log(`DukaanDesk server running on http://localhost:${PORT}`)
    console.log(`Allowed website(s): ${allowedOrigins.join(', ')}`)
    if (!process.env.GNANI_API_KEY) {
      console.warn('Warning: GNANI_API_KEY is empty, so voice recording is disabled.')
    }
  })

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Port ${PORT} is already in use. Close the other program or change PORT in .env.`)
    } else {
      console.error('Server failed to start:', err.message)
    }
    process.exit(1)
  })
}

module.exports = app