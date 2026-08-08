import { useMemo, useState } from 'react'
import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'
import { emptyGrid, hasConflicts, nextHint, sampleGrid, solveSudoku, type SudokuGrid } from './solver'

const clone = (grid: SudokuGrid) => grid.map((row) => [...row])

export default function SudokuPuzzle() {
  const [grid, setGrid] = useState<SudokuGrid>(() => clone(sampleGrid))
  const [givens, setGivens] = useState(() => new Set(sampleGrid.flatMap((row, r) => row.map((v, c) => v ? `${r}-${c}` : '')).filter(Boolean)))
  const [message, setMessage] = useState('Sample loaded. Edit any cell or solve it.')
  const [hinted, setHinted] = useState<string | null>(null)

  const conflicts = useMemo(() => hasConflicts(grid), [grid])

  const change = (r: number, c: number, raw: string) => {
    const value = Number(raw.replace(/[^1-9]/g, '').slice(-1)) || 0
    const next = clone(grid)
    next[r][c] = value
    setGrid(next)
    setHinted(null)
    setMessage('Board updated.')
  }

  const solve = () => {
    const result = solveSudoku(grid)
    if (!result) {
      setMessage('This board has a conflict or no valid solution.')
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

  const loadSample = () => {
    setGrid(clone(sampleGrid))
    setGivens(new Set(sampleGrid.flatMap((row, r) => row.map((v, c) => v ? `${r}-${c}` : '')).filter(Boolean)))
    setHinted(null)
    setMessage('Sample loaded.')
  }

  const clear = () => {
    setGrid(emptyGrid())
    setGivens(new Set())
    setHinted(null)
    setMessage('Empty board. Enter the digits you can see.')
  }

  return (
    <PuzzleShell icon="🔢" title="Sudoku" subtitle="A working local solver with one-step hints and a shared camera reference panel.">
      <div className="two-column puzzle-workspace">
        <section className="panel sudoku-panel">
          <div className="panel-heading">
            <div><p className="eyebrow">Solver</p><h3>9×9 board</h3></div>
            <span className={`status ${conflicts ? 'problem' : 'ready'}`}>{conflicts ? 'Conflict' : 'Valid'}</span>
          </div>
          <div className="sudoku-grid" role="grid" aria-label="Sudoku grid">
            {grid.map((row, r) => row.map((value, c) => {
              const key = `${r}-${c}`
              return (
                <input
                  key={key}
                  aria-label={`Row ${r + 1}, column ${c + 1}`}
                  inputMode="numeric"
                  value={value || ''}
                  onChange={(e) => change(r, c, e.target.value)}
                  className={`${givens.has(key) ? 'given' : ''} ${hinted === key ? 'hinted' : ''}`}
                />
              )
            }))}
          </div>
          <p className={`solver-message ${conflicts ? 'error-message' : ''}`}>{message}</p>
          <div className="button-row wrap">
            <button className="primary-button" onClick={solve}>Solve</button>
            <button className="secondary-button" onClick={hint}>Hint</button>
            <button className="secondary-button" onClick={loadSample}>Sample</button>
            <button className="ghost-button" onClick={clear}>Clear</button>
          </div>
          <p className="muted small">Tip: after camera OCR is added, recognized digits will be placed into this exact board for verification before solving.</p>
        </section>
        <CameraPanel title="Scan Sudoku reference" />
      </div>
    </PuzzleShell>
  )
}
