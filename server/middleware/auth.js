const jwt = require('jsonwebtoken')

// Put this in front of any route that needs a logged-in shopkeeper.
// The browser sends:  Authorization: Bearer <token>
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in' })
  }

  try {
    jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
    next()
  } catch (error) {
    res.status(401).json({ error: 'Your session has expired. Please log in again.' })
  }
}

module.exports = { requireAuth }