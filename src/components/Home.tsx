import type { PuzzleDefinition } from '../types'

interface Props {
  puzzles: PuzzleDefinition[]
  onOpen: (id: string) => void
}

const statusLabel = {
  ready: 'Ready',
  prototype: 'Prototype',
  planned: 'Planned',
}

export default function Home({ puzzles, onOpen }: Props) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <span className="hero-badge">One camera. Many puzzle engines.</span>
          <h1>Turn your phone into a puzzle solver and coach.</h1>
          <p>Use one installable web app for Sudoku, board games, word puzzles, cube solving, and more. Camera processing is designed to stay on-device.</p>
          <div className="hero-actions">
            <button className="primary-button large" onClick={() => onOpen('sudoku')}>Try Sudoku</button>
            <button className="secondary-button large" onClick={() => document.getElementById('puzzles')?.scrollIntoView({ behavior: 'smooth' })}>Browse modules</button>
          </div>
        </div>
        <div className="hero-visual" aria-label="PuzzleCam concept">
          <div className="phone">
            <div className="phone-top" />
            <div className="viewfinder">
              <div className="mini-grid">
                {Array.from({ length: 81 }).map((_, i) => <span key={i}>{[0, 10, 20, 30, 40, 50, 60, 70, 80].includes(i) ? ((i / 10) % 9 + 1).toFixed(0) : ''}</span>)}
              </div>
              <div className="focus-corners" />
              <div className="detected-pill">Sudoku detected ✓</div>
            </div>
            <div className="phone-actions"><span>Hint</span><strong>Solve</strong><span>Coach</span></div>
          </div>
        </div>
      </section>

      <section className="section" id="puzzles">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Puzzle registry</p>
            <h2>Choose a module</h2>
          </div>
          <p className="muted">Ready modules are functional now. Prototype/planned modules already have a place in the architecture.</p>
        </div>
        <div className="puzzle-grid">
          {puzzles.map((puzzle) => (
            <button className="puzzle-card" key={puzzle.id} onClick={() => onOpen(puzzle.id)}>
              <div className="puzzle-card-top">
                <span className="puzzle-icon">{puzzle.icon}</span>
                <span className={`status ${puzzle.status}`}>{statusLabel[puzzle.status]}</span>
              </div>
              <h3>{puzzle.name}</h3>
              <p>{puzzle.description}</p>
              <span className="card-link">Open module →</span>
            </button>
          ))}
        </div>
      </section>
    </main>
  )
}
