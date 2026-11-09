// All communication with the backend lives in this one file.

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
const TOKEN_KEY = 'dukaandesk_token'

/* ---------- Login token (kept in this browser) ---------- */

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch (error) {
    return null
  }
}

function saveToken(token) {
  try {
    localStorage.setItem(TOKEN_KEY, token)
  } catch (error) {
    // Storage blocked: the person will simply have to log in again next time
  }
}

function clearToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch (error) {
    // Nothing to do
  }
}

// App code registers a function here; it is called when the server says "not logged in"
let onUnauthorized = null
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler
}

/* ---------- Core request function ---------- */

async function request(path, options = {}) {
  // "public: true" is used for the login call itself
  const { public: isPublic, ...fetchOptions } = options

  // JSON requests need a Content-Type header. File uploads (FormData) set their own.
  const isUpload = fetchOptions.body instanceof FormData
  const headers = isUpload ? {} : { 'Content-Type': 'application/json' }

  const token = getToken()
  if (token && !isPublic) {
    headers.Authorization = `Bearer ${token}`
  }

  let response

  try {
    response = await fetch(`${API_URL}${path}`, { ...fetchOptions, headers })
  } catch (error) {
    // The request never reached the server (server off, wrong port, etc.)
    throw new Error('Cannot reach the server. Is it running on port 5000?')
  }

  const data = await response.json().catch(() => ({}))

  if (response.status === 401 && !isPublic) {
    // The saved login is missing, wrong or expired: go back to the login screen
    clearToken()
    if (onUnauthorized) onUnauthorized()
  }

  if (!response.ok) {
    throw new Error(data.error || 'Something went wrong')
  }

  return data
}

/* ---------- Login ---------- */

export async function login(username, password) {
  const data = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
    public: true,
  })
  saveToken(data.token)
}

// Checks that the saved token is still accepted by the server
export function fetchMe() {
  return request('/auth/me')
}

export function logout() {
  clearToken()
}

/* ---------- Orders ---------- */

// Get every order (active and done)
export function fetchOrders() {
  return request('/orders')
}

// Create an order. Only product ids and quantities are sent.
// The server works out names, prices and the total itself.
export function createOrder({ customer, items }) {
  return request('/orders', {
    method: 'POST',
    body: JSON.stringify({ customer, items }),
  })
}

// Mark an order as done
export function markOrderDone(orderId) {
  return request(`/orders/${orderId}/done`, { method: 'PATCH' })
}

/* ---------- Voice ---------- */

// Turn typed text into a preview of products and quantities.
// This does NOT create an order.
export function parseVoiceText(text) {
  return request('/voice/parse', {
    method: 'POST',
    body: JSON.stringify({ text }),
  })
}

// Send a WAV recording. The server transcribes it with Gnani and returns
// the same kind of preview as parseVoiceText. This does NOT create an order.
export function transcribeAudio(wavBlob) {
  const form = new FormData()
  form.append('audio', wavBlob, 'recording.wav')

  return request('/voice/transcribe', {
    method: 'POST',
    body: form,
  })
}
/* ---------- Products ---------- */

export function fetchProducts() {
  return request('/products')
}

export function updateProductPrice(productId, price) {
  return request(`/products/${productId}`, {
    method: 'PATCH',
    body: JSON.stringify({ price }),
  })
}