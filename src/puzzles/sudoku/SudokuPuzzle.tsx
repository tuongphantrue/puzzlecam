import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PuzzleShell from '../../components/PuzzleShell'
import { recognizeSudoku, type SudokuScanProgress } from './recognizer'
import { emptyGrid, hasConflicts, solveSudoku, type SudokuGrid } from './solver'

const clone = (grid: SudokuGrid) => grid.map((row) => [...row])

function givenSet(grid: SudokuGrid) {
  return new Set(
    grid
      .flatMap((row, r) => row.map((value, c) => (value ? `${r}-${c}` : '')))
      .filter(Boolean),
  )
}

type ScanMeta = {
  detectedCells: number
  confidence: number
  warnings: string[]
} | null

export default function SudokuPuzzle() {
  const [grid, setGrid] = useState<SudokuGrid>(() => emptyGrid())
  const [givens, setGivens] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState('Upload, photograph, or paste a Sudoku puzzle to begin.')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<SudokuScanProgress | null>(null)
  const [scanMeta, setScanMeta] = useState<ScanMeta>(null)
  const [image, setImage] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const pasteZoneRef = useRef<HTMLDivElement>(null)

  const conflicts = useMemo(() => hasConflicts(grid), [grid])
  const recognizedCount = givens.size
  const progressPercent = progress?.phase === 'ocr' && progress.total
    ? Math.round(((progress.current || 0) / progress.total) * 100)
    : null

  const change = (r: number, c: number, raw: string) => {
    const value = Number(raw.replace(/[^1-9]/g, '').slice(-1)) || 0
    const next = clone(grid)
    next[r][c] = value
    setGrid(next)
    setSolved(false)

    const nextGivens = new Set(givens)
    const key = `${r}-${c}`
    if (value) nextGivens.add(key)
    else nextGivens.delete(key)
    setGivens(nextGivens)
    setMessage('Board updated. Review the recognized digits, then solve when ready.')
  }

  const solve = () => {
    if (!recognizedCount) {
      setMessage('Upload, photograph, or paste a Sudoku before solving.')
      return
    }
    const result = solveSudoku(grid)
    if (!result) {
      setMessage('This board has a conflict or no valid solution. Check the recognized digits.')
      return
    }
    setGrid(result)
    setSolved(true)
    setMessage('Solution ready ✓')
  }

  const scanImage = async (dataUrl: string) => {
    setImage(dataUrl)
    setScanning(true)
    setSolved(false)
    setScanMeta(null)
    setMessage('Scanning image…')
    try {
      const result = await recognizeSudoku(dataUrl, setProgress)
      const recognized = clone(result.grid)
      const recognizedGivens = givenSet(recognized)
      setGrid(recognized)
      setGivens(recognizedGivens)
      setScanMeta({
        detectedCells: result.detectedCells,
        confidence: result.confidence,
        warnings: result.warnings,
      })

      if (result.detectedCells === 0) {
        setMessage('No digits were recognized. Try a closer, brighter photo with the full grid visible.')
      } else if (hasConflicts(recognized)) {
        setMessage(`Recognized ${result.detectedCells} digits, but some values conflict. Correct them before solving.`)
      } else {
        setMessage(`OCR complete: ${result.detectedCells} givens recognized. Review them, then click Solve Sudoku.`)
      }
    } catch (error) {
      setGrid(emptyGrid())
      setGivens(new Set())
      setScanMeta(null)
      setMessage(error instanceof Error ? `Scan failed: ${error.message}` : 'Scan failed. Try another image.')
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }

  const loadFile = useCallback((file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => void scanImage(String(reader.result))
    reader.readAsDataURL(file)
  }, [])

  const pasteFileFromEvent = useCallback((event: ClipboardEvent) => {
    const item = Array.from(event.clipboardData?.items || []).find((entry) => entry.type.startsWith('image/'))
    const file = item?.getAsFile()
    if (!file) return false
    event.preventDefault()
    setMessage('Clipboard image received. Running OCR…')
    loadFile(file)
    return true
  }, [loadFile])

  const pasteFromClipboard = async () => {
    const clipboard = navigator.clipboard as Clipboard & { read?: () => Promise<Array<{ types: readonly string[]; getType: (type: string) => Promise<Blob> }>> }
    if (!clipboard?.read) {
      pasteZoneRef.current?.focus()
      setMessage('Paste area ready. Press Ctrl+V (or Cmd+V) to paste your Sudoku image.')
      return
    }

    try {
      const items = await clipboard.read()
      for (const item of items) {
        const imageType = item.types.find((type) => type.startsWith('image/'))
        if (!imageType) continue
        const blob = await item.getType(imageType)
        setMessage('Clipboard image received. Running OCR…')
        loadFile(new File([blob], 'clipboard-sudoku', { type: imageType }))
        return
      }
      pasteZoneRef.current?.focus()
      setMessage('No image found in the clipboard. Copy a screenshot or image, then press Ctrl+V.')
    } catch {
      pasteZoneRef.current?.focus()
      setMessage('Browser clipboard access was blocked. Click the paste area and press Ctrl+V instead.')
    }
  }

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      pasteFileFromEvent(event)
    }
    document.addEventListener('paste', handlePaste)
    return () => document.removeEventListener('paste', handlePaste)
  }, [pasteFileFromEvent])

  const clear = () => {
    setGrid(emptyGrid())
    setGivens(new Set())
    setScanMeta(null)
    setImage(null)
    setSolved(false)
    setMessage('Upload, photograph, or paste a Sudoku puzzle to begin.')
  }

  const validationLabel = conflicts ? 'Needs review' : recognizedCount ? 'Valid' : 'Waiting'
  const issueCount = (conflicts ? 1 : 0) + (scanMeta?.warnings.length || 0)

  return (
    <PuzzleShell
      icon="▦"
      title="Sudoku"
      subtitle="Scan, upload, or paste a Sudoku, review OCR, then solve."
    >
      <div className="rw-sudoku-page">
        <div className="rw-commandbar">
          <div className="rw-view-tabs" aria-label="Sudoku workflow">
            <span className={image ? 'done' : 'active'}>Input</span>
            <span className={recognizedCount && !solved ? 'active' : recognizedCount ? 'done' : ''}>Review</span>
            <span className={solved ? 'active' : ''}>Solution</span>
          </div>
          <div className="rw-command-actions">
            <button className="rw-button secondary" onClick={() => photoInputRef.current?.click()} disabled={scanning}>⌑ Take photo</button>
            <button className="rw-button secondary" onClick={() => uploadInputRef.current?.click()} disabled={scanning}>⇧ Upload image</button>
            <button className="rw-button secondary" onClick={() => void pasteFromClipboard()} disabled={scanning}>⌘ Paste image</button>
            <input ref={photoInputRef} className="rw-hidden-input" type="file" accept="image/*" capture="environment" onChange={(event) => loadFile(event.target.files?.[0])} />
            <input ref={uploadInputRef} className="rw-hidden-input" type="file" accept="image/*" onChange={(event) => loadFile(event.target.files?.[0])} />
          </div>
        </div>

        <div className="rw-statusline" aria-live="polite">
          <span><em className={image ? 'ok' : ''} />Input <strong>{image ? 'Image selected' : 'Waiting'}</strong></span>
          <span><em className={recognizedCount ? 'ok' : scanning ? 'busy' : ''} />OCR <strong>{scanning ? 'Running' : recognizedCount ? `${recognizedCount} cells` : 'Pending'}</strong></span>
          <span><em className={recognizedCount && !conflicts ? 'ok' : conflicts ? 'danger' : ''} />Validation <strong>{validationLabel}</strong></span>
          <span><em className={solved ? 'ok' : ''} />Solve <strong>{solved ? 'Ready' : 'Pending'}</strong></span>
        </div>

        <div className="rw-main-grid">
          <section className="rw-board-surface">
            <div className="rw-section-heading">
              <div>
                <strong>{solved ? 'Solved board' : 'Review recognized digits'}</strong>
                <small>{solved ? 'Recognized givens remain emphasized.' : 'Edit any incorrect OCR digit before solving.'}</small>
              </div>
              <span>{recognizedCount ? `${recognizedCount} givens` : 'Empty board'}</span>
            </div>

            {scanning && (
              <div className="rw-scan-progress">
                <div><strong>{progress?.message || 'Preparing scanner…'}</strong><span>{progressPercent !== null ? `${progressPercent}%` : ''}</span></div>
                <div className="rw-progress-track"><span style={{ width: `${progressPercent ?? 12}%` }} /></div>
              </div>
            )}

            <div className="rw-grid-wrap">
              <div className="rw-sudoku-grid" role="grid" aria-label="Sudoku grid">
                {grid.map((row, r) => row.map((value, c) => {
                  const key = `${r}-${c}`
                  const isGiven = givens.has(key)
                  return (
                    <input
                      key={key}
                      aria-label={`Row ${r + 1}, column ${c + 1}`}
                      inputMode="numeric"
                      value={value || ''}
                      disabled={scanning || (solved && !isGiven)}
                      onChange={(event) => change(r, c, event.target.value)}
                      className={`${isGiven ? 'given' : ''} ${solved && !isGiven && value ? 'solution' : ''}`}
                    />
                  )
                }))}
              </div>
            </div>

            <div className={`rw-message-row ${conflicts ? 'error' : solved ? 'success' : ''}`}>
              <span>{conflicts ? '!' : solved ? '✓' : 'i'}</span><p>{message}</p>
            </div>

            <div className="rw-actionbar">
              <div>
                <button className="rw-button secondary" onClick={() => image && void scanImage(image)} disabled={!image || scanning}>↻ Run OCR</button>
                <button className="rw-button ghost" onClick={clear} disabled={scanning}>Clear</button>
              </div>
              <button className="rw-button primary" onClick={solve} disabled={scanning || !recognizedCount || conflicts}>Solve Sudoku</button>
            </div>
          </section>

          <aside className="rw-inspector">
            <section className="rw-inspector-section">
              <div className="rw-inspector-title"><strong>Source image</strong><span>{image ? 'Loaded' : 'No image'}</span></div>
              <div className={`rw-image-stage ${image ? 'has-image' : ''}`}>
                {image ? <img src={image} alt="Captured Sudoku" /> : <div className="rw-empty-state"><span>▧</span><strong>No image selected</strong><small>Take a photo, upload an image, or paste one from your clipboard.</small></div>}
              </div>
              <div
                ref={pasteZoneRef}
                className="rw-paste-zone"
                tabIndex={0}
                    role="button"
                aria-label="Paste Sudoku image from clipboard"
                onClick={() => pasteZoneRef.current?.focus()}
              >
                <span className="rw-paste-icon">⌘</span>
                <div><strong>{image ? 'Paste another image' : 'Paste from clipboard'}</strong><small>Click here, then press Ctrl+V or Cmd+V</small></div>
                <kbd>Ctrl / Cmd + V</kbd>
              </div>
            </section>

            <section className="rw-inspector-section">
              <div className="rw-inspector-title"><strong>Recognition</strong><span>{scanning ? 'Processing' : 'Local'}</span></div>
              <div className="rw-detail-row"><span>Recognized cells</span><strong>{scanMeta ? `${scanMeta.detectedCells} / 81` : '—'}</strong></div>
              <div className="rw-detail-row"><span>Confidence</span><strong>{scanMeta ? `${Math.round(scanMeta.confidence)}%` : '—'}</strong></div>
              <div className="rw-detail-row"><span>Validation</span><strong className={conflicts ? 'danger' : recognizedCount ? 'ok' : ''}>{validationLabel}</strong></div>
              <div className="rw-detail-row"><span>Issues</span><strong>{scanMeta || conflicts ? issueCount : '—'}</strong></div>
            </section>

            <section className="rw-inspector-section">
              <div className="rw-inspector-title"><strong>Review</strong><span>{issueCount ? `${issueCount} issue${issueCount === 1 ? '' : 's'}` : 'Clear'}</span></div>
              {conflicts && <div className="rw-issue-row danger"><i /><div><strong>Conflicting values</strong><small>Correct the board before solving.</small></div></div>}
              {scanMeta?.warnings.map((warning) => <div className="rw-issue-row" key={warning}><i /><div><strong>OCR warning</strong><small>{warning}</small></div></div>)}
              {!conflicts && !scanMeta?.warnings.length && <p className="rw-inspector-note">{recognizedCount ? 'No validation issues detected.' : 'OCR warnings and validation issues will appear here.'}</p>}
            </section>

            <section className="rw-inspector-section rw-tip-section">
              <strong>Capture tip</strong>
              <p>Keep the entire grid visible, well-lit and as straight as possible. Always review OCR before solving.</p>
            </section>
          </aside>
        </div>
      </div>
    </PuzzleShell>
  )
}
