import { useEffect, useRef, useState } from 'react'

interface Props {
  title?: string
  onCapture?: (dataUrl: string) => void
}

export default function CameraPanel({ title = 'Camera reference', onCapture }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
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
    const reader = new FileReader()
    reader.onload = () => {
      const data = String(reader.result)
      setImage(data)
      onCapture?.(data)
    }
    reader.readAsDataURL(file)
  }

  useEffect(() => () => stop(), [])

  return (
    <section className="camera-card panel">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">Shared vision input</p>
          <h3>{title}</h3>
        </div>
        <span className="privacy-pill">Local only</span>
      </div>

      <div className="camera-stage">
        {image && !active ? (
          <img src={image} alt="Captured puzzle" />
        ) : (
          <video ref={videoRef} playsInline muted className={active ? '' : 'is-hidden'} />
        )}
        {!active && !image && (
          <div className="camera-empty">
            <span>📷</span>
            <strong>Camera is off</strong>
            <small>Start the camera or choose a photo.</small>
          </div>
        )}
        {(active || image) && <div className="scan-guide" aria-hidden="true" />}
      </div>

      {error && <p className="error-message">{error}</p>}

      <div className="button-row wrap">
        {!active ? (
          <button className="primary-button" onClick={start}>Open camera</button>
        ) : (
          <button className="primary-button" onClick={capture}>Capture</button>
        )}
        {active && <button className="secondary-button" onClick={stop}>Stop</button>}
        {image && !active && <button className="secondary-button" onClick={() => setImage(null)}>Retake</button>}
        <label className="secondary-button file-button">
          Choose photo
          <input type="file" accept="image/*" capture="environment" onChange={(e) => upload(e.target.files?.[0])} />
        </label>
      </div>
      <p className="muted small">The v0.1 camera captures a clean reference image. Automatic OCR/board recognition is the next vision layer; the puzzle engines already live behind a shared module interface.</p>
    </section>
  )
}
