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

export default function CameraPanel({ title = 'Image input', onCapture }: Props) {
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

  const start = async () => {
    setError(null)
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Camera API is not available in this browser.')
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
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(video, 0, 0)
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

  return (
    <section className="camera-card panel pc-camera-panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Input</p>
          <h3>{title}</h3>
        </div>
        <span className="privacy-pill"><i /> Local only</span>
      </div>

      <div className="mode-toggle" role="tablist" aria-label="Input source">
        <button
          type="button"
          className={`toggle-chip ${mode === 'camera' ? 'active' : ''}`}
          onClick={() => switchMode('camera')}
          disabled={!supportsCamera}
          aria-pressed={mode === 'camera'}
        >
          Take photo
        </button>
        <button
          type="button"
          className={`toggle-chip ${mode === 'upload' ? 'active' : ''}`}
          onClick={() => switchMode('upload')}
          aria-pressed={mode === 'upload'}
        >
          Upload image
        </button>
      </div>

      <div className="camera-stage">
        {image && !active ? (
          <img src={image} alt="Captured puzzle" />
        ) : (
          <video ref={videoRef} playsInline muted className={active ? '' : 'is-hidden'} />
        )}
        {!active && !image && (
          <div className="camera-empty">
            <span className="pc-camera-glyph">▧</span>
            <strong>{mode === 'camera' ? 'Camera is off' : 'No image selected'}</strong>
            <small>{mode === 'camera' ? 'Open your rear camera and keep the puzzle inside the frame.' : 'Choose a clear picture of the puzzle from this device.'}</small>
          </div>
        )}
        {(active || image) && <div className="scan-guide" aria-hidden="true" />}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="button-row wrap">
        {mode === 'camera' ? (
          !active
            ? <button className="primary-button" onClick={start} disabled={!supportsCamera}>Open camera</button>
            : <>
                <button className="primary-button" onClick={capture}>Capture</button>
                <button className="secondary-button" onClick={stop}>Stop</button>
              </>
        ) : (
          <button className="primary-button" onClick={() => fileInputRef.current?.click()}>Choose image</button>
        )}
        {image && !active && <button className="secondary-button" onClick={() => setImage(null)}>Clear</button>}
      </div>

      <input
        ref={fileInputRef}
        className="pc-file-input"
        type="file"
        accept="image/*"
        onChange={(event) => upload(event.target.files?.[0])}
      />

      <p className="muted small pc-camera-note">
        {mobile ? 'Use the live camera or choose an image from your gallery.' : 'Upload a picture, or use a webcam when available.'}
      </p>
    </section>
  )
}
