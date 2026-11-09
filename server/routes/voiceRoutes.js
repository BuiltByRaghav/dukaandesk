const express = require('express')
const multer = require('multer')
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

// Converts Hindi/Marathi (०-९) and Gujarati (૦-૯) digits into 0-9
function normalizeDigits(text) {
  return text
    .replace(/[०-९]/g, (d) => String('०१२३४५६७८९'.indexOf(d)))
    .replace(/[૦-૯]/g, (d) => String('૦૧૨૩૪૫૬૭૮૯'.indexOf(d)))
}

// Turns a sentence into the preview shape the React app expects
function buildPreview(text) {
  const clean = normalizeDigits(text.trim())
  const items = parseTranscript(clean)
  const total = items.reduce((sum, item) => sum + item.price * item.qty, 0)

  return {
    transcript: text.trim(),
    understood: items.length > 0,
    items,
    total,
  }
}

// POST /api/voice/parse
// Body: { "text": "2 kilo tamatar aur 1 doodh" }
// Returns a PREVIEW. It does not create an order.
router.post('/parse', (req, res) => {
  const { text } = req.body || {}

  if (typeof text !== 'string' || text.trim() === '') {
    return res.status(400).json({ error: 'text is required' })
  }

  if (text.length > 500) {
    return res.status(400).json({ error: 'text is too long (max 500 characters)' })
  }

  res.json(buildPreview(text))
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