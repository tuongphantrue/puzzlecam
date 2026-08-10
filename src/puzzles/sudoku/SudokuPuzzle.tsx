import { useMemo, useState } from 'react'
import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'
import { recognizeSudoku, type SudokuScanProgress } from './recognizer'
import { emptyGrid, hasConflicts, solveSudoku, type SudokuGrid } from './solver'

const clone = (grid: SudokuGrid) => grid.map((row) => [...row])

function givenSet(grid: SudokuGrid) {
  return new Set(grid.flatMap((row, r) => row.map((value, c) => value ? `${r}-${c}` : '')).filter(Boolean))
}

export default function SudokuPuzzle() {
  const [grid, setGrid] = useState<SudokuGrid>(() => emptyGrid())
  const [givens, setGivens] = useState<Set<string>>(() => new Set())
  const [message, setMessage] = useState('Take a photo or upload a Sudoku puzzle to begin.')
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<SudokuScanProgress | null>(null)
  const [scanWarnings, setScanWarnings] = useState<string[]>([])
  const conflicts = useMemo(() => hasConflicts(grid), [grid])
  const hasDigits = useMemo(() => grid.some((row) => row.some(Boolean)), [grid])

  const change = (r: number, c: number, raw: string) => {
    const value = Number(raw.replace(/[^1-9]/g, '').slice(-1)) || 0
    const next = clone(grid)
    const key = `${r}-${c}`

    next[r][c] = value
    setGrid(next)
    setGivens((current) => {
      const updated = new Set(current)
      if (value) updated.add(key)
      else updated.delete(key)
      return updated
    })
    setMessage('Board corrected. Check the recognized givens, then tap Solve Sudoku.')
  }

  const solve = () => {
    if (!hasDigits) {
      setMessage('Take a photo or upload a Sudoku puzzle first.')
      return
    }

    const result = solveSudoku(grid)
    if (!result) {
      setMessage('This board has a conflict or no valid solution. Check the recognized digits.')
      return
    }

    setGrid(result)
    setMessage('Sudoku solved ✓ Dark cells are the givens from the photo; lighter cells are the solution.')
  }

  const scanImage = async (dataUrl: string) => {
    setScanning(true)
    setScanWarnings([])
    setMessage('Scanning Sudoku…')

    try {
      const result = await recognizeSudoku(dataUrl, setProgress)
      const recognized = clone(result.grid)

      setGrid(recognized)
      setGivens(givenSet(recognized))
      setScanWarnings(result.warnings)

      if (result.detectedCells === 0) {
        setMessage('No Sudoku digits were recognized. Try a closer, brighter photo with the board straight in the frame.')
        return
      }

      if (hasConflicts(recognized)) {
        setMessage(`Recognized ${result.detectedCells} givens, but some values conflict. Correct the highlighted cells, then tap Solve Sudoku.`)
        return
      }

      setMessage(`Recognized ${result.detectedCells} givens with ${Math.round(result.confidence)}% OCR confidence. Review the board, correct any OCR mistakes, then tap Solve Sudoku.`)
    } catch (error) {
      setGrid(emptyGrid())
      setGivens(new Set())
      setMessage(error instanceof Error ? `Scan failed: ${error.message}` : 'Scan failed. Try another image.')
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }

  const reset = () => {
    setGrid(emptyGrid())
    setGivens(new Set())
    setScanWarnings([])
    setMessage('Take a photo or upload a Sudoku puzzle to begin.')
  }

  const progressPercent = progress?.phase === 'ocr' && progress.total
    ? Math.round(((progress.current || 0) / progress.total) * 100)
    : null

  return (
    <PuzzleShell
      icon="🔢"
      title="Sudoku Solver"
      subtitle="Take a photo or upload a Sudoku. PuzzleCam recognizes the givens in your browser, lets you correct OCR mistakes, then solves the puzzle."
    >
      <div className="two-column puzzle-workspace">
        <section className="panel sudoku-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Photo solver</p><h3>Recognized Sudoku</h3></div>
            <span className={`status ${conflicts ? 'problem' : scanning ? 'prototype' : 'ready'}`}>
              {conflicts ? 'Check OCR' : scanning ? 'Scanning' : hasDigits ? 'Ready to solve' : 'Waiting for photo'}
            </span>
          </div>

          {scanning && (
            <div className="scan-progress" aria-live="polite">
              <div className="scan-progress-row">
                <strong>{progress?.message || 'Preparing scanner…'}</strong>
                {progressPercent !== null && <span>{progressPercent}%</span>}
              </div>
              <div className="progress-track">
                <span style={{ width: `${progressPercent ?? 12}%` }} />
              </div>
              <small>First scan may take longer while the OCR language model loads.</small>
            </div>
          )}

          <div className="sudoku-grid" role="grid" aria-label="Recognized Sudoku grid">
            {grid.map((row, r) => row.map((value, c) => {
              const key = `${r}-${c}`
              return (
                <input
                  key={key}
                  aria-label={`Row ${r + 1}, column ${c + 1}`}
                  inputMode="numeric"
                  value={value || ''}
                  disabled={scanning}
                  onChange={(e) => change(r, c, e.target.value)}
                  className={givens.has(key) ? 'given' : ''}
                />
              )
            }))}
          </div>

          <p className={`solver-message ${conflicts ? 'error-message' : ''}`}>{message}</p>

          {scanWarnings.length > 0 && (
            <div className="scan-warnings">
              {scanWarnings.map((warning) => <p key={warning}>⚠ {warning}</p>)}
            </div>
          )}

          <div className="button-row wrap">
            <button className="primary-button" onClick={solve} disabled={scanning || !hasDigits || conflicts}>
              Solve Sudoku
            </button>
            <button className="ghost-button" onClick={reset} disabled={scanning || !hasDigits}>
              Reset
            </button>
          </div>

          <p className="muted small">
            This is a solver, not a Sudoku game generator. Dark cells are the givens recognized from your photo. Correct any OCR mistakes before solving.
          </p>
        </section>

        <CameraPanel title="Take or upload Sudoku photo" onCapture={(image) => void scanImage(image)} />
      </div>
    </PuzzleShell>
  )
}
