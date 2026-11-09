// Converts a browser recording (usually WebM) into a 16 kHz mono WAV file,
// which is a format Gnani accepts.

const TARGET_RATE = 16000

function writeText(view, offset, text) {
  for (let i = 0; i < text.length; i++) {
    view.setUint8(offset + i, text.charCodeAt(i))
  }
}

// Wraps raw audio samples in a WAV file
function encodeWav(samples, sampleRate) {
  const dataSize = samples.length * 2 // 16-bit = 2 bytes per sample
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)

  writeText(view, 0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeText(view, 8, 'WAVE')
  writeText(view, 12, 'fmt ')
  view.setUint32(16, 16, true) // size of this block
  view.setUint16(20, 1, true) // 1 = PCM
  view.setUint16(22, 1, true) // 1 channel (mono)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // bytes per second
  view.setUint16(32, 2, true) // bytes per sample
  view.setUint16(34, 16, true) // bits per sample
  writeText(view, 36, 'data')
  view.setUint32(40, dataSize, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true)
    offset += 2
  }

  return new Blob([view], { type: 'audio/wav' })
}

export async function blobToWav(blob) {
  const arrayBuffer = await blob.arrayBuffer()

  // 1. Decode the recording into raw audio
  const AudioContextClass = window.AudioContext || window.webkitAudioContext
  const context = new AudioContextClass()
  let decoded
  try {
    decoded = await context.decodeAudioData(arrayBuffer)
  } finally {
    context.close()
  }

  // 2. Resample to 16 kHz mono
  const length = Math.max(1, Math.ceil(decoded.duration * TARGET_RATE))
  const offline = new OfflineAudioContext(1, length, TARGET_RATE)
  const source = offline.createBufferSource()
  source.buffer = decoded
  source.connect(offline.destination)
  source.start()
  const rendered = await offline.startRendering()

  // 3. Write it as a WAV file
  return encodeWav(rendered.getChannelData(0), TARGET_RATE)
}