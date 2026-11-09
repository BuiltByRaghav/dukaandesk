const express = require('express')
const multer = require('multer')
const store = require('../data/productStore')
const { parseTranscript } = require('../services/orderParser')
const { isConfigured, transcribeAudio } = require('../services/gnaniService')

const router = express.Router()

// Keeps the uploaded audio in memory (max 5 MB; a 30 second WAV is about 1 MB)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
})

// Gnani allows only 1 active request at a time on some accounts,
// so we handle one voice recording at a time.
let busy = false

// Only accepts { "word": productId } pairs; anything else is dropped
function cleanChoices(raw) {
  const out = {}
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out

  for (const [word, id] of Object.entries(raw).slice(0, 20)) {
    if (word.length <= 60 && Number.isInteger(id)) out[word] = id
  }
  return out
}

// Turns a sentence into the preview the React app shows. Prices and totals come from the database.
function buildPreview(text, choices = {}) {
  const { items, clarifications, ignored } = parseTranscript(text, store.getCatalogue(), { choices })
  const sum = items.reduce((total, item) => total + item.price * item.qty, 0)

  return {
    transcript: text.trim(),
    understood: items.length > 0,
    items,
    clarifications,
    ignored,
    total: Math.round(sum * 100) / 100,
  }
}

// POST /api/voice/parse
// Body: { "text": "2 kilo tamatar aur 1 doodh", "choices": { "tamater": 7 } }  (choices optional)
// Returns a PREVIEW. It does not create an order.
router.post('/parse', (req, res) => {
  const { text, choices } = req.body || {}

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' })
  }

  if (text.length > 500) {
    return res.status(400).json({ error: 'text is too long (max 500 characters)' })
  }

  res.json(buildPreview(text, cleanChoices(choices)))
})

// POST /api/voice/transcribe
// Form field "audio" = a WAV recording. Returns the same preview as /parse,
// plus the detected language. It does not create an order.
router.post('/transcribe', (req, res) => {
  upload.single('audio')(req, res, async (uploadError) => {
    if (uploadError) {
      if (uploadError.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: 'Recording is too large. Keep it under 30 seconds.' })
      }
      return res.status(400).json({ error: 'Could not read the uploaded audio.' })
    }

    if (!isConfigured()) {
      return res.status(503).json({
        error: 'Voice is not set up. Add GNANI_API_KEY to server/.env and restart the server.',
      })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No audio received.' })
    }

    if (busy) {
      return res.status(429).json({ error: 'Still processing the previous recording. Wait a moment.' })
    }

    busy = true

    try {
      const result = await transcribeAudio(req.file.buffer, 'recording.wav', 'audio/wav')

      const preview = buildPreview(result.transcript)
      res.json({ ...preview, language: result.language, truncated: result.truncated })
    } catch (error) {
      res.status(error.httpStatus || 500).json({
        error: error.publicMessage || 'Could not understand the recording.',
      })
    } finally {
      busy = false
    }
  })
})

module.exports = router