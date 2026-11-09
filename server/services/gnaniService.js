// Talks to Gnani's Speech-to-Text REST API (Prisma v3.0).
// The API key is read from server/.env and never leaves the server.

const { products } = require('../data/products')

const GNANI_URL = 'https://api.vachana.ai/stt/v3'

// Hints that help the model recognise our product names
const KEYTERMS = products.map((product) => product.name)
const TOPIC = 'A customer telling a grocery shop the vegetables, fruits and items to buy, with quantities in kilos'

function isConfigured() {
  return Boolean(process.env.GNANI_API_KEY)
}

// Gnani sends errors in several shapes. This finds the message in any of them.
function extractMessage(body) {
  if (!body) return ''
  if (body.error && typeof body.error === 'object' && body.error.message) return body.error.message
  if (body.detail && !Array.isArray(body.detail) && body.detail.message) return body.detail.message
  if (typeof body.message === 'string') return body.message
  return ''
}

// An error that carries a safe message for the browser and an HTTP status for our reply
function makeError(httpStatus, publicMessage) {
  const error = new Error(publicMessage)
  error.httpStatus = httpStatus
  error.publicMessage = publicMessage
  return error
}

// Takes a WAV file (as a Buffer) and returns { transcript, language, truncated }
async function transcribeAudio(audioBuffer, filename = 'recording.wav', mimeType = 'audio/wav') {
  const form = new FormData()
  form.append('audio_file', new Blob([audioBuffer], { type: mimeType }), filename)
  form.append('model', 'prisma-v3.0')
  form.append('language_code', 'indic-auto') // model detects English, Hindi, Marathi, Gujarati...
  form.append('format', 'transcribe') // numbers come back as digits, e.g. "2 किलो टमाटर"
  form.append('topic', TOPIC)
  form.append('keyterms', JSON.stringify(KEYTERMS))

  let response
  try {
    response = await fetch(GNANI_URL, {
      method: 'POST',
      headers: { 'X-API-Key-ID': process.env.GNANI_API_KEY },
      body: form,
      signal: AbortSignal.timeout(20000),
    })
  } catch (error) {
    console.error('Gnani request failed:', error.message)
    if (error.name === 'TimeoutError') {
      throw makeError(504, 'The speech service took too long. Please try again.')
    }
    throw makeError(502, 'Could not reach the speech service. Check your internet connection.')
  }

  const body = await response.json().catch(() => null)

  if (!response.ok) {
    // The full detail is printed here in the terminal, for you to debug
    console.error(`Gnani error ${response.status}:`, JSON.stringify(body))

    if (response.status === 401 || response.status === 403) {
      throw makeError(502, 'Gnani rejected the API key. Check GNANI_API_KEY and that it has Speech to Text access.')
    }
    if (response.status === 402) {
      throw makeError(502, 'The Gnani account has no credit left.')
    }
    if (response.status === 429) {
      throw makeError(429, 'The speech service is busy. Try again in a moment.')
    }
    if (response.status === 400) {
      throw makeError(400, extractMessage(body) || 'The audio could not be processed.')
    }
    if (response.status === 504) {
      throw makeError(504, 'The speech service took too long. Please try again.')
    }
    throw makeError(502, 'The speech service failed. Please try again.')
  }

  return {
    transcript: (body && body.transcript) || '',
    language: (body && body.detected_language_code) || null,
    truncated: Boolean(body && body.truncated),
  }
}

module.exports = { isConfigured, transcribeAudio }