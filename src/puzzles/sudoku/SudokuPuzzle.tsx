import { useMemo, useRef, useState } from 'react'
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
  const [message, setMessage] = useState('Upload or photograph a Sudoku puzzle to begin.')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<SudokuScanProgress | null>(null)
  const [scanMeta, setScanMeta] = useState<ScanMeta>(null)
  const [image, setImage] = useState<string | null>(null)
  const [solved, setSolved] = useState(false)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)

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
      setMessage('Upload or photograph a Sudoku before solving.')
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

  const loadFile = (file?: File) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => void scanImage(String(reader.result))
    reader.readAsDataURL(file)
  }

  const clear = () => {
    setGrid(emptyGrid())
    setGivens(new Set())
    setScanMeta(null)
    setImage(null)
    setSolved(false)
    setMessage('Upload or photograph a Sudoku puzzle to begin.')
  }

  const validationLabel = conflicts ? 'Needs review' : recognizedCount ? 'Valid' : 'Waiting'
  const workflowStep = solved ? 4 : recognizedCount ? 3 : image ? 2 : 1

  return (
    <PuzzleShell
      icon="▦"
      title="Sudoku Solver"
      subtitle="Upload or photograph a Sudoku puzzle, review recognized digits, then solve."
    >
      <div className="rw-sudoku-page">
        <div className="rw-page-toolbar">
          <div className="rw-breadcrumb">Puzzles <span>/</span> Sudoku Solver</div>
          <span className={`rw-status-chip ${scanning ? 'busy' : ''}`}>
            <i /> {scanning ? 'OCR running' : 'OCR ready'}
          </span>
        </div>

        <div className="rw-workspace-grid">
          <section className="rw-card rw-input-card">
            <div className="rw-card-title">1. Input</div>
            <button className="rw-input-action" onClick={() => photoInputRef.current?.click()} disabled={scanning}>
              <span className="rw-icon">⌑</span>
              Take Photo
            </button>
            <button className="rw-input-action" onClick={() => uploadInputRef.current?.click()} disabled={scanning}>
              <span className="rw-icon">⇧</span>
              Upload Image
            </button>
            <input
              ref={photoInputRef}
              className="rw-hidden-input"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
            <input
              ref={uploadInputRef}
              className="rw-hidden-input"
              type="file"
              accept="image/*"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
            <p className="rw-helper">JPG, PNG, HEIC and other browser-supported images.</p>
          </section>

          <section className="rw-card rw-image-card">
            <div className="rw-card-title">2. Captured Image</div>
            <div className={`rw-image-stage ${image ? 'has-image' : ''}`}>
              {image ? (
                <img src={image} alt="Captured Sudoku" />
              ) : (
                <div className="rw-empty-state">
                  <span className="rw-empty-icon">▧</span>
                  <strong>No image selected</strong>
                  <small>Take a photo or upload a clear picture of the full Sudoku grid.</small>
                </div>
              )}
            </div>
          </section>

          <section className="rw-card rw-summary-card">
            <div className="rw-card-title">3. OCR Summary</div>
            <div className="rw-summary-row"><span>Recognized cells</span><strong>{scanMeta ? `${scanMeta.detectedCells} / 81` : '—'}</strong></div>
            <div className="rw-summary-row"><span>Confidence (avg.)</span><strong>{scanMeta ? `${Math.round(scanMeta.confidence)}%` : '—'}</strong></div>
            <div className="rw-summary-row"><span>Warnings</span><strong>{scanMeta ? scanMeta.warnings.length : '—'}</strong></div>
            <div className="rw-summary-row">
              <span>Validation</span>
              <strong className={conflicts ? 'rw-text-danger' : recognizedCount ? 'rw-text-success' : ''}>{validationLabel}</strong>
            </div>
            <div className="rw-summary-row"><span>Status</span><strong>{scanning ? 'Processing' : solved ? 'Solved' : recognizedCount ? 'Ready to review' : 'Waiting'}</strong></div>
          </section>

          <aside className="rw-card rw-workflow-card">
            <div className="rw-card-title">Workflow Overview</div>
            {[
              ['Input', image ? 'Image selected' : 'Waiting for image'],
              ['OCR', recognizedCount ? `${recognizedCount} cells recognized` : scanning ? 'Processing image' : 'Pending'],
              ['Validation', recognizedCount ? validationLabel : 'Pending'],
              ['Solve', solved ? 'Solution ready' : 'Pending'],
            ].map(([label, detail], index) => {
              const number = index + 1
              const complete = workflowStep > number || (number === 4 && solved)
              const active = workflowStep === number && !complete
              return (
                <div className={`rw-step ${complete ? 'complete' : ''} ${active ? 'active' : ''}`} key={label}>
                  <span className="rw-step-number">{number}</span>
                  <div><strong>{label}</strong><small>{detail}</small></div>
                  <span className="rw-step-state">{complete ? '✓' : active ? '○' : ''}</span>
                </div>
              )
            })}

            <div className="rw-side-section">
              <div className="rw-side-heading">OCR Status</div>
              <div className="rw-side-row"><span><i className="rw-dot" />Engine</span><strong>{scanning ? 'Running' : 'Ready'}</strong></div>
              <div className="rw-side-row"><span><i className="rw-dot" />Language</span><strong>Numeric</strong></div>
              <div className="rw-side-row"><span><i className="rw-dot" />Processing</span><strong>Local</strong></div>
            </div>

            <div className="rw-tip-box">
              <strong>ⓘ Tips</strong>
              <p>Keep the entire grid visible, well-lit and as straight as possible. Review OCR before solving.</p>
            </div>
          </aside>

          <section className="rw-card rw-board-card">
            <div className="rw-board-heading">
              <div>
                <div className="rw-card-title">4. Review Recognized Digits</div>
                <p>Edit any incorrect OCR digits before solving. Empty cells stay blank.</p>
              </div>
              {recognizedCount > 0 && <span className="rw-mini-badge">{recognizedCount} givens</span>}
            </div>

            {scanning && (
              <div className="rw-scan-progress" aria-live="polite">
                <div><strong>{progress?.message || 'Preparing scanner…'}</strong><span>{progressPercent !== null ? `${progressPercent}%` : ''}</span></div>
                <div className="rw-progress-track"><span style={{ width: `${progressPercent ?? 12}%` }} /></div>
              </div>
            )}

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

            <p className={`rw-solver-message ${conflicts ? 'error' : ''}`}>{message}</p>

            <div className="rw-action-bar">
              <div className="rw-action-left">
                <button className="rw-button secondary" onClick={() => image && void scanImage(image)} disabled={!image || scanning}>↻ Run OCR</button>
                <button className="rw-button secondary" onClick={clear} disabled={scanning}>⌫ Clear</button>
              </div>
              <button className="rw-button primary" onClick={solve} disabled={scanning || !recognizedCount || conflicts}>▦ Solve Sudoku</button>
            </div>
          </section>

          <section className="rw-card rw-review-card">
            <div className="rw-card-title">5. Solution / Review</div>
            <div className={`rw-review-state ${solved ? 'solved' : ''}`}>
              <span>{solved ? '✓' : '◇'}</span>
              <strong>{solved ? 'Solution ready' : 'Review recognized cells before solving.'}</strong>
              <p>{solved ? 'Original recognized givens remain emphasized; computed solution cells are lighter.' : 'Once the OCR digits look correct, click Solve Sudoku to generate the solution.'}</p>
            </div>

            <div className="rw-issues-heading">Detected Issues</div>
            {conflicts && (
              <div className="rw-issue danger">
                <span className="rw-issue-dot" />
                <div><strong>Conflicting values</strong><small>Correct the board before solving.</small></div>
              </div>
            )}
            {scanMeta?.warnings.map((warning) => (
              <div className="rw-issue" key={warning}>
                <span className="rw-issue-dot" />
                <div><strong>OCR warning</strong><small>{warning}</small></div>
              </div>
            ))}
            {!conflicts && !scanMeta?.warnings.length && (
              <div className="rw-no-issues">{recognizedCount ? 'No validation issues detected.' : 'Issues will appear here after OCR.'}</div>
            )}
          </section>
        </div>
      </div>
    </PuzzleShell>
  )
}
