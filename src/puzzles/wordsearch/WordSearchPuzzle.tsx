import { useMemo, useState } from 'react'
import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'
import { findWords, parseGrid } from './solver'

const initialGrid = `C H E S S A\nW O R D Q B\nS U D O K U\nT E S T P C\nR U B I K S\nP U Z Z L E`
const initialWords = 'CHESS\nWORD\nSUDOKU\nRUBIK\nPUZZLE'

export default function WordSearchPuzzle() {
  const [rawGrid, setRawGrid] = useState(initialGrid)
  const [rawWords, setRawWords] = useState(initialWords)
  const grid = useMemo(() => parseGrid(rawGrid), [rawGrid])
  const words = useMemo(() => rawWords.split(/[\n,]+/).map((w) => w.trim()).filter(Boolean), [rawWords])
  const matches = useMemo(() => findWords(grid, words), [grid, words])
  const marked = new Set(matches.flatMap((m) => m.cells.map(([r,c]) => `${r}-${c}`)))
  const rectangular = grid.length > 0 && grid.every((row) => row.length === grid[0].length)

  return (
    <PuzzleShell icon="🔤" title="Word Search" subtitle="A working 8-direction word finder; OCR can feed its recognized letter grid later.">
      <div className="two-column puzzle-workspace">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Word engine</p><h3>Paste letters + target words</h3></div><span className={`status ${rectangular ? 'ready' : 'problem'}`}>{rectangular ? `${matches.length} found` : 'Uneven rows'}</span></div>
          <label className="field-label">Letter grid<textarea value={rawGrid} onChange={(e) => setRawGrid(e.target.value)} rows={7} spellCheck={false} /></label>
          <label className="field-label">Words<textarea value={rawWords} onChange={(e) => setRawWords(e.target.value)} rows={5} spellCheck={false} /></label>
          {rectangular && <div className="word-grid" style={{ gridTemplateColumns: `repeat(${grid[0]?.length || 1}, 1fr)` }}>{grid.flatMap((row,r) => row.map((letter,c) => <span key={`${r}-${c}`} className={marked.has(`${r}-${c}`) ? 'marked' : ''}>{letter}</span>))}</div>}
          <p className="solver-message">Found: {matches.map((m) => m.word).join(', ') || 'none'}</p>
        </section>
        <CameraPanel title="Scan word-search reference" />
      </div>
    </PuzzleShell>
  )
}
