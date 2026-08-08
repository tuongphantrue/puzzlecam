import { useEffect, useMemo, useRef, useState } from 'react'

type InputMode = 'camera' | 'upload'

interface Props {
  title?: string
  onCapture?: (dataUrl: string) => void
}

function isProbablyMobile() {
  if (typeof navigator === 'undefined') return false
  return /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile/i.test(navigator.userAgent)
}

export default function CameraPanel({ title = 'Camera reference', onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const mobile = useMemo(() => isProbablyMobile(), [])
  const supportsCamera = typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia)
  const [mode, setMode] = useState<InputMode>(supportsCamera && mobile ? 'camera' : 'upload')
  const [active, setActive] = useState(false)
  const [image, setImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stop = () => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setActive(false)
  }

  const clearImage = () => setImage(null)

  const start = async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Camera API is not available in this browser.')
      }
      stop()
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setMode('camera')
      setActive(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to open camera.')
    }
  }

  const capture = () => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.drawImage(video, 0, 0)
    const data = canvas.toDataURL('image/jpeg', 0.9)
    setImage(data)
    onCapture?.(data)
    stop()
  }

  const upload = (file?: File) => {
    if (!file) return
    setError(null)
    stop()
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result)
      setImage(data)
      onCapture?.(data)
    }
    reader.readAsDataURL(file)
  }

  const switchMode = (nextMode: InputMode) => {
    setMode(nextMode)
    setError(null)
    stop()
  }

  useEffect(() => () => stop(), [])

  const helperText = mobile
    ? 'Mobile mode: use the live rear camera or pick an image from your phone gallery.'
    : 'Desktop mode: upload a picture from your computer, or use a webcam if available.'

  return (
    <section className="camera-card panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Shared vision input</p>
          <h3>{title}</h3>
        </div>
        <span className="privacy-pill">Local only</span>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Input source">
        <button
          type="button"
          className={`toggle-chip ${mode === 'camera' ? 'active' : ''}`}
          onClick={() => switchMode('camera')}
          disabled={!supportsCamera}
          aria-pressed={mode === 'camera'}
        >
          📷 Camera
        </button>
        <button
          type="button"
          className={`toggle-chip ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => switchMode('upload')}
          aria-pressed={mode === 'upload'}
        >
          🖼 Upload picture
        </button>
      </div>

      <p className="muted small camera-helper">{helperText}</p>

      <div className="camera-stage">
        {image && !active ? (
          <img src={image} alt="Captured puzzle" />
        ) : (
          <video ref={videoRef} playsInline muted className={active ? '' : 'is-hidden'} />
        )}
        {!active && !image && (
          <div className="camera-empty">
            <span>{mode === 'camera' ? '📷' : '🖼'}</span>
            <strong>{mode === 'camera' ? 'Camera is off' : 'No image selected'}</strong>
            <small>
              {mode === 'camera'
                ? 'Open the camera on your phone or laptop.'
                : 'Choose a puzzle photo from your device.'}
            </small>
          </div>
        )}
        {(active || image) && <div className="scan-guide" aria-hidden="true" />}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="button-row wrap">
        {mode === 'camera' ? (
          <>
            {!active ? (
              <button className="primary-button" onClick={start} disabled={!supportsCamera}>Open camera</button>
            ) : (
              <button className="primary-button" onClick={capture}>Capture</button>
            )}
            {active && <button className="secondary-button" onClick={stop}>Stop</button>}
          </>
        ) : (
          <button className="primary-button" onClick={() => fileInputRef.current?.click()}>Choose picture</button>
        )}

        <label className="secondary-button file-button">
          Upload image
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => upload(e.target.files?.[0])}
          />
        </label>

        {image && !active && <button className="secondary-button" onClick={clearImage}>Clear</button>}
      </div>

      {!supportsCamera && (
        <p className="muted small">This browser does not expose camera access, so upload mode is the fallback.</p>
      )}

      <p className="muted small">PuzzleCam now supports both flows in one responsive page: live camera on mobile and upload-picture mode on desktop or mobile. Automatic OCR / board recognition remains the next vision layer behind this shared input module.</p>
    </section>
  )
}
