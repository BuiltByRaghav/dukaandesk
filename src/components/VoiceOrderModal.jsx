import { useState, useEffect, useRef } from 'react'
import Modal from './Modal'
import * as api from '../api'
import { blobToWav } from '../utils/audioToWav'
import './VoiceOrderModal.css'

const MAX_SECONDS = 25 // Gnani accepts up to 30 seconds

function VoiceOrderModal({ isOpen, onClose, onAddItems, products = [], onAliasesChanged }) {
  const [text, setText] = useState('')
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Words the shopkeeper has already clarified, e.g. { tamater: 7 }
  const [choices, setChoices] = useState({})
  const [remember, setRemember] = useState(false)
  const [skipUnclear, setSkipUnclear] = useState(false)

  const recorderRef = useRef(null)
  const streamRef = useRef(null)
  const chunksRef = useRef([])
  const timerRef = useRef(null)
  // Bumped whenever the popup opens or closes, so late replies from an old
  // recording are ignored.
  const sessionRef = useRef(0)

  // Turns the microphone off completely
  function stopStream() {
    clearTimeout(timerRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  }

  // Throws away any recording in progress
  function cancelRecording() {
    sessionRef.current += 1
    const recorder = recorderRef.current
    if (recorder && recorder.state !== 'inactive') {
      recorder.onstop = null
      recorder.stop()
    }
    recorderRef.current = null
    stopStream()
    setRecording(false)
  }

  // Reset everything each time the popup opens or closes
  useEffect(() => {
    cancelRecording()
    setTranscribing(false)
    setParsing(false)
    if (isOpen) {
      setText('')
      setResult(null)
      setError('')
      setChoices({})
      setSkipUnclear(false)
    }
  }, [isOpen])

  // Turn the mic off if the component disappears
  useEffect(() => () => cancelRecording(), [])

  // Typed text: send the sentence to the server and show the preview
  async function understand(sentence, useChoices = choices) {
    const clean = sentence.trim()
    if (!clean) {
      setError('Say or type an order first.')
      return
    }

    setParsing(true)
    setError('')
    setResult(null)
    setSkipUnclear(false)

    try {
      const data = await api.parseVoiceText(clean, useChoices)
      setResult(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setParsing(false)
    }
  }

  // The shopkeeper picked a product for an unclear word: ask the server again with that choice
  async function chooseProduct(word, productId) {
    const id = Number(productId)
    if (!id) return

    const next = { ...choices, [word]: id }
    setChoices(next)

    if (remember) {
      api
        .addProductAlias(id, word)
        .then(() => onAliasesChanged && onAliasesChanged())
        .catch(() => {}) // Saving the word is a bonus; the order still works without it
    }

    await understand(text, next)
  }

  // Runs when the recording stops: convert, upload, show the result
  async function handleRecordingDone(session, mimeType) {
    stopStream()
    recorderRef.current = null
    setRecording(false)

    const blob = new Blob(chunksRef.current, { type: mimeType || 'audio/webm' })
    if (blob.size < 1000) {
      setError("I didn't hear anything. Tap the mic and try again.")
      return
    }

    setTranscribing(true)

    try {
      const wav = await blobToWav(blob)
      const data = await api.transcribeAudio(wav)
      if (session !== sessionRef.current) return // popup was closed meanwhile

      setText(data.transcript || '')
      setResult(data)
      if (!data.transcript) {
        setError("I didn't hear any speech. Tap the mic and try again.")
      }
    } catch (err) {
      if (session === sessionRef.current) setError(err.message)
    } finally {
      if (session === sessionRef.current) setTranscribing(false)
    }
  }

  async function startRecording() {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setError('Recording is not supported in this browser. Use Chrome or Edge, or type your order.')
      return
    }

    setError('')
    setResult(null)
    setText('')
    setChoices({})
    setSkipUnclear(false)

    const session = sessionRef.current

    let stream
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      setError('Microphone permission was blocked. Allow it in your browser and try again.')
      return
    }

    // The popup was closed while the browser was asking for permission
    if (session !== sessionRef.current) {
      stream.getTracks().forEach((track) => track.stop())
      return
    }

    streamRef.current = stream
    chunksRef.current = []

    const recorder = new MediaRecorder(stream)
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data)
    }
    recorder.onstop = () => handleRecordingDone(session, recorder.mimeType)

    recorderRef.current = recorder
    recorder.start()
    setRecording(true)

    // Stop automatically so the clip never goes over the 30 second limit
    timerRef.current = setTimeout(() => {
      if (recorder.state === 'recording') recorder.stop()
    }, MAX_SECONDS * 1000)
  }

  function handleMicClick() {
    if (recording) {
      recorderRef.current?.stop() // onstop then processes the audio
    } else {
      startRecording()
    }
  }

  const busy = transcribing || parsing
  const clarifications = result ? result.clarifications || [] : []
  const items = result ? result.items || [] : []
  const canAdd = items.length > 0 && !busy && (clarifications.length === 0 || skipUnclear)

  function handleAdd() {
    if (canAdd) onAddItems(items)
  }

  let statusText = 'Tap the mic and speak. Language is detected automatically.'
  if (recording) statusText = 'Listening... tap again when you are done.'
  if (transcribing) statusText = 'Understanding your order...'

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Voice Order 🎤">
      <p className="voice-hint">
        Say something like “2 kilo tamatar aur 1 doodh” in English, हिन्दी, मराठी or ગુજરાતી, or type it below.
      </p>

      <div className="voice-mic-row">
        <button
          className={`mic-btn emoji ${recording ? 'listening' : ''}`}
          onClick={handleMicClick}
          disabled={transcribing}
          aria-label={recording ? 'Stop recording' : 'Start recording'}
        >
          {recording ? '⏹️' : transcribing ? '⏳' : '🎤'}
        </button>
        <span className="mic-status">{statusText}</span>
      </div>

      <div className="voice-input-row">
        <input
          type="text"
          value={text}
          placeholder="Or type your order here"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !busy && !recording) understand(text)
          }}
        />
        <button
          className="btn btn-soft"
          onClick={() => understand(text)}
          disabled={busy || recording}
        >
          {parsing ? '...' : 'Understand'}
        </button>
      </div>

      {error && <p className="voice-error">{error}</p>}

      {result && result.transcript && (
        <div className="voice-result">
          {items.length > 0 && (
            <>
              <ul className="summary-list">
                {items.map((item) => (
                  <li key={item.productId} className="summary-line">
                    <span>
                      <span className="emoji">{item.emoji}</span> {item.name} × {item.qty} {item.unit}
                      {item.assumedQty && <span className="voice-assumed"> (quantity assumed)</span>}
                    </span>
                    <span>₹{(item.price * item.qty).toLocaleString('en-IN')}</span>
                  </li>
                ))}
              </ul>
              <div className="total-row">
                <span>Total</span>
                <strong>₹{result.total.toLocaleString('en-IN')}</strong>
              </div>
            </>
          )}

          {clarifications.length > 0 && (
            <div className="voice-clarify">
              <p className="voice-clarify-title">I need your help with this:</p>

              {clarifications.map((c, position) => (
                <div key={`${c.type}-${c.word || position}`} className="voice-clarify-item">
                  <p>{c.message}</p>

                  {c.options.length > 0 && (
                    <div className="voice-options">
                      {c.options.map((option) => (
                        <button
                          key={option.productId}
                          className="btn btn-soft"
                          disabled={busy}
                          onClick={() => chooseProduct(c.word, option.productId)}
                        >
                          <span className="emoji">{option.emoji}</span> {option.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {c.pick && (
                    <select
                      defaultValue=""
                      disabled={busy}
                      onChange={(e) => chooseProduct(c.word, e.target.value)}
                    >
                      <option value="" disabled>
                        Choose a product…
                      </option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              <label className="voice-remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                Remember the words I pick for next time
              </label>

              {items.length > 0 && !skipUnclear && (
                <button className="link-btn" onClick={() => setSkipUnclear(true)}>
                  Skip the unclear part and use the rest
                </button>
              )}
            </div>
          )}

          {items.length === 0 && clarifications.length === 0 && (
            <p className="voice-error">
              I couldn't find any products in that sentence. Try again or type it.
            </p>
          )}

          {result.ignored && result.ignored.length > 0 && (
            <p className="voice-note">Not used: {result.ignored.join(', ')}</p>
          )}
        </div>
      )}

      <div className="modal-actions">
        <button className="btn btn-soft" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" onClick={handleAdd} disabled={!canAdd}>
          Add to order
        </button>
      </div>
    </Modal>
  )
}

export default VoiceOrderModal