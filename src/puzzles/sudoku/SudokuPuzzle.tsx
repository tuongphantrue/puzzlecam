import { useMemo, useState } from 'react'
import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'
import { recognizeSudoku, type SudokuScanProgress } from './recognizer'
import { emptyGrid, hasConflicts, nextHint, sampleGrid, solveSudoku, type SudokuGrid } from './solver'

const clone = (grid: SudokuGrid) => grid.map((row) => [...row])

function givenSet(grid: SudokuGrid) {
  return new Set(grid.flatMap((row, r) => row.map((value, c) => value ? `${r}-${c}` : '')).filter(Boolean))
}

export default function SudokuPuzzle() {
  const [grid, setGrid] = useState<SudokuGrid>(() => clone(sampleGrid))
  const [givens, setGivens] = useState(() => givenSet(sampleGrid))
  const [message, setMessage] = useState('Sample loaded. Capture or upload a Sudoku to scan it automatically.')
  const [hinted, setHinted] = useState<string | null>(null)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState<SudokuScanProgress | null>(null)
  const [scanWarnings, setScanWarnings] = useState<string[]>([])

  const conflicts = useMemo(() => hasConflicts(grid), [grid])

  const change = (r: number, c: number, raw: string) => {
    const value = Number(raw.replace(/[^1-9]/g, '').slice(-1)) || 0
    const next = clone(grid)
    next[r][c] = value
    setGrid(next)
    setHinted(null)
    setMessage('Board updated. You can correct any OCR mistakes before solving again.')
  }

  const solve = () => {
    const result = solveSudoku(grid)
    if (!result) {
      setMessage('This board has a conflict or no valid solution. Check the recognized digits.')
      return
    }
    setGrid(result)
    setHinted(null)
    setMessage('Solved ✓')
  }

  const hint = () => {
    const result = nextHint(grid)
    if (!result) {
      setMessage(conflicts ? 'Fix the conflicting values first.' : 'No hint needed — the board is complete.')
      return
    }
    const next = clone(grid)
    next[result.row][result.col] = result.value
    setGrid(next)
    setHinted(`${result.row}-${result.col}`)
    setMessage(`Hint: R${result.row + 1}C${result.col + 1} = ${result.value}`)
  }

  const scanImage = async (dataUrl: string) => {
    setScanning(true)
    setScanWarnings([])
    setHinted(null)
    setMessage('Scanning image…')
    try {
      const result = await recognizeSudoku(dataUrl, setProgress)
      const recognized = clone(result.grid)
      const recognizedGivens = givenSet(recognized)
      setGivens(recognizedGivens)
      setScanWarnings(result.warnings)

      if (result.detectedCells === 0) {
        setGrid(recognized)
        setMessage('No digits were recognized. Try a closer, brighter photo with the board straight in the frame.')
        return
      }

      if (hasConflicts(recognized)) {
        setGrid(recognized)
        setMessage(`Recognized ${result.detectedCells} digits, but some conflict. Correct the highlighted board values, then tap Solve.`)
        return
      }

      const solved = solveSudoku(recognized)
      if (solved) {
        setGrid(solved)
        setMessage(`Scanned ${result.detectedCells} givens and solved automatically ✓ OCR confidence ${Math.round(result.confidence)}%.`)
      } else {
        setGrid(recognized)
        setMessage(`Recognized ${result.detectedCells} digits, but the board could not be solved. Check OCR values and try again.`)
      }
    } catch (error) {
      setMessage(error instanceof Error ? `Scan failed: ${error.message}` : 'Scan failed. Try another image.')
    } finally {
      setScanning(false)
      setProgress(null)
    }
  }

  const loadSample = () => {
    setGrid(clone(sampleGrid))
    setGivens(givenSet(sampleGrid))
    setHinted(null)
    setScanWarnings([])
    setMessage('Sample loaded.')
  }

  const clear = () => {
    setGrid(emptyGrid())
    setGivens(new Set())
    setHinted(null)
    setScanWarnings([])
    setMessage('Empty board. Enter digits manually, capture a Sudoku, or upload a photo.')
  }

  const progressPercent = progress?.phase === 'ocr' && progress.total
    ? Math.round(((progress.current || 0) / progress.total) * 100)
    : null

  return (
    <PuzzleShell icon="🔢" title="Sudoku" subtitle="Scan from a mobile camera or upload a picture on desktop. OCR runs in your browser, then PuzzleCam solves the recognized board.">
      <div className="two-column puzzle-workspace">
        <section className="panel sudoku-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Scanner + solver</p><h3>9×9 board</h3></div>
            <span className={`status ${conflicts ? 'problem' : scanning ? 'prototype' : 'ready'}`}>{conflicts ? 'Conflict' : scanning ? 'Scanning' : 'Ready'}</span>
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

          <div className="sudoku-grid" role="grid" aria-label="Sudoku grid">
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
                  className={`${givens.has(key) ? 'given' : ''} ${hinted === key ? 'hinted' : ''}`}
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
            <button className="primary-button" onClick={solve} disabled={scanning}>Solve</button>
            <button className="secondary-button" onClick={hint} disabled={scanning}>Hint</button>
            <button className="secondary-button" onClick={loadSample} disabled={scanning}>Sample</button>
            <button className="ghost-button" onClick={clear} disabled={scanning}>Clear</button>
          </div>
          <p className="muted small">Dark cells are the original givens detected from the picture; lighter cells are the computed solution. Always check OCR values when the photo is blurry, tilted, or handwritten.</p>
        </section>
        <CameraPanel title="Scan Sudoku" onCapture={(image) => void scanImage(image)} />
      </div>
    </PuzzleShell>
  )
}
