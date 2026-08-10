import { useEffect, useMemo, useState } from 'react'
import SudokuPuzzle from './puzzles/sudoku/SudokuPuzzle'
import TicTacToePuzzle from './puzzles/tictactoe/TicTacToePuzzle'
import WordSearchPuzzle from './puzzles/wordsearch/WordSearchPuzzle'

type PageId =
  | 'dashboard'
  | 'sudoku'
  | 'wordsearch'
  | 'tictactoe'
  | 'chess'
  | 'rubik'
  | 'checkers'
  | 'connectfour'
  | 'nonogram'
  | 'math'

type NavItem = {
  id: PageId
  label: string
  icon: string
  status?: 'ready' | 'planned'
}

const primaryNav: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⌂', status: 'ready' },
  { id: 'sudoku', label: 'Sudoku', icon: '▦', status: 'ready' },
  { id: 'wordsearch', label: 'Word Search', icon: '⠿', status: 'ready' },
  { id: 'tictactoe', label: 'Tic-Tac-Toe', icon: '⌗', status: 'ready' },
]

const plannedNav: NavItem[] = [
  { id: 'chess', label: 'Chess', icon: '♙', status: 'planned' },
  { id: 'rubik', label: "Rubik's Cube", icon: '◇', status: 'planned' },
  { id: 'checkers', label: 'Checkers', icon: '◫', status: 'planned' },
  { id: 'connectfour', label: 'Connect Four', icon: '⊙', status: 'planned' },
  { id: 'nonogram', label: 'Nonogram', icon: '▤', status: 'planned' },
  { id: 'math', label: 'Math', icon: '∑', status: 'planned' },
]

const pageMeta: Record<PageId, { title: string; section: string }> = {
  dashboard: { title: 'Dashboard', section: 'Workspace' },
  sudoku: { title: 'Sudoku Solver', section: 'Puzzles' },
  wordsearch: { title: 'Word Search', section: 'Puzzles' },
  tictactoe: { title: 'Tic-Tac-Toe', section: 'Puzzles' },
  chess: { title: 'Chess', section: 'Coming soon' },
  rubik: { title: "Rubik's Cube", section: 'Coming soon' },
  checkers: { title: 'Checkers', section: 'Coming soon' },
  connectfour: { title: 'Connect Four', section: 'Coming soon' },
  nonogram: { title: 'Nonogram', section: 'Coming soon' },
  math: { title: 'Math Solver', section: 'Coming soon' },
}

function pageFromHash(): PageId {
  if (typeof window === 'undefined') return 'dashboard'
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  const known = [...primaryNav, ...plannedNav].some((item) => item.id === raw)
  return known ? (raw as PageId) : 'dashboard'
}

function Icon({ name }: { name: string }) {
  return <span className="pc-nav-icon" aria-hidden="true">{name}</span>
}

function Dashboard({ navigate }: { navigate: (id: PageId) => void }) {
  const quick = primaryNav.filter((item) => item.id !== 'dashboard')

  return (
    <div className="pc-dashboard">
      <header className="pc-page-heading">
        <div>
          <p className="pc-kicker">PuzzleCam workspace</p>
          <h1>Dashboard</h1>
          <p>Scan, review and solve puzzles from one clean workspace.</p>
        </div>
        <div className="pc-heading-actions">
          <span className="pc-status-pill"><i /> Local processing</span>
        </div>
      </header>

      <section className="pc-metric-grid" aria-label="Workspace summary">
        <article className="pc-metric-card">
          <span>Available solvers</span>
          <strong>3</strong>
          <small>Sudoku, Word Search, Tic-Tac-Toe</small>
        </article>
        <article className="pc-metric-card">
          <span>Vision workflow</span>
          <strong>Local</strong>
          <small>Camera and image processing stay in-browser</small>
        </article>
        <article className="pc-metric-card">
          <span>Sudoku OCR</span>
          <strong>Ready</strong>
          <small>Upload → review → solve</small>
        </article>
      </section>

      <div className="pc-dashboard-grid">
        <section className="pc-card pc-dashboard-main">
          <div className="pc-card-header">
            <div>
              <p className="pc-kicker">Quick start</p>
              <h2>Ready solvers</h2>
            </div>
            <span className="pc-subtle-label">3 modules</span>
          </div>

          <div className="pc-module-list">
            {quick.map((item) => (
              <button key={item.id} className="pc-module-row" onClick={() => navigate(item.id)}>
                <Icon name={item.icon} />
                <span className="pc-module-copy">
                  <strong>{item.label}</strong>
                  <small>
                    {item.id === 'sudoku' && 'Scan or upload a Sudoku, verify OCR digits, then solve.'}
                    {item.id === 'wordsearch' && 'Enter or review a letter grid and find target words.'}
                    {item.id === 'tictactoe' && 'Set a board position and calculate the best move.'}
                  </small>
                </span>
                <span className="pc-row-status ready">Ready</span>
                <span className="pc-row-arrow">→</span>
              </button>
            ))}
          </div>
        </section>

        <aside className="pc-card pc-dashboard-side">
          <div className="pc-card-header compact">
            <div>
              <p className="pc-kicker">Workflow</p>
              <h2>How PuzzleCam works</h2>
            </div>
          </div>
          <ol className="pc-workflow-list">
            <li><span>1</span><div><strong>Capture</strong><small>Take a photo or upload an image.</small></div></li>
            <li><span>2</span><div><strong>Recognize</strong><small>Convert the picture into puzzle state.</small></div></li>
            <li><span>3</span><div><strong>Review</strong><small>Correct uncertain recognition before solving.</small></div></li>
            <li><span>4</span><div><strong>Solve</strong><small>Run the appropriate local solver.</small></div></li>
          </ol>
        </aside>
      </div>

      <section className="pc-card pc-coming-card">
        <div className="pc-card-header">
          <div>
            <p className="pc-kicker">Roadmap</p>
            <h2>More puzzle engines</h2>
          </div>
          <span className="pc-subtle-label">Planned</span>
        </div>
        <div className="pc-coming-grid">
          {plannedNav.map((item) => (
            <button className="pc-coming-item" key={item.id} onClick={() => navigate(item.id)}>
              <Icon name={item.icon} />
              <span><strong>{item.label}</strong><small>Planned module</small></span>
              <span>→</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function ComingSoon({ item }: { item: NavItem }) {
  return (
    <div className="pc-placeholder-page">
      <header className="pc-page-heading">
        <div>
          <p className="pc-kicker">Puzzle module</p>
          <h1>{item.label}</h1>
          <p>This engine is reserved in the shared PuzzleCam workspace.</p>
        </div>
        <span className="pc-status-pill muted"><i /> Planned</span>
      </header>

      <section className="pc-card pc-empty-module">
        <div className="pc-empty-glyph"><Icon name={item.icon} /></div>
        <div>
          <h2>{item.label} is coming next</h2>
          <p>The page already uses the same app shell, spacing, panels, controls and status language as the ready solvers.</p>
        </div>
        <div className="pc-empty-meta">
          <div><span>Status</span><strong>Planned</strong></div>
          <div><span>Input</span><strong>Camera / image</strong></div>
          <div><span>Processing</span><strong>Local-first</strong></div>
        </div>
      </section>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<PageId>(() => pageFromHash())
  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  useEffect(() => {
    const sync = () => setPage(pageFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  const navigate = (id: PageId) => {
    setMobileNavOpen(false)
    if (id === 'dashboard') window.location.hash = '#/dashboard'
    else window.location.hash = `#/${id}`
    setPage(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeItem = useMemo(
    () => [...primaryNav, ...plannedNav].find((item) => item.id === page),
    [page],
  )

  const renderPage = () => {
    if (page === 'dashboard') return <Dashboard navigate={navigate} />
    if (page === 'sudoku') return <SudokuPuzzle />
    if (page === 'wordsearch') return <WordSearchPuzzle />
    if (page === 'tictactoe') return <TicTacToePuzzle />
    return <ComingSoon item={activeItem || plannedNav[0]} />
  }

  const meta = pageMeta[page]

  return (
    <div className="pc-app-shell">
      <aside className={`pc-sidebar ${mobileNavOpen ? 'open' : ''}`}>
        <div className="pc-brand" role="button" tabIndex={0} onClick={() => navigate('dashboard')}>
          <span className="pc-brand-mark">▣</span>
          <div><strong>PuzzleCam</strong><small>Point. Think. Solve.</small></div>
        </div>

        <nav className="pc-nav" aria-label="Primary navigation">
          <p className="pc-nav-label">Workspace</p>
          {primaryNav.map((item) => (
            <button
              key={item.id}
              className={`pc-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
              {item.id !== 'dashboard' && <i className="pc-ready-dot" title="Ready" />}
            </button>
          ))}

          <div className="pc-nav-divider" />
          <p className="pc-nav-label">More solvers</p>
          {plannedNav.map((item) => (
            <button
              key={item.id}
              className={`pc-nav-item ${page === item.id ? 'active' : ''}`}
              onClick={() => navigate(item.id)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="pc-sidebar-footer">
          <div><strong>PuzzleCam</strong><small>Local-first puzzle tools</small></div>
          <span>v0.3</span>
        </div>
      </aside>

      {mobileNavOpen && <button className="pc-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <div className="pc-app-main">
        <header className="pc-topbar">
          <div className="pc-topbar-left">
            <button className="pc-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button>
            <div className="pc-breadcrumbs">
              <span>{meta.section}</span>
              <b>/</b>
              <strong>{meta.title}</strong>
            </div>
          </div>
          <div className="pc-topbar-actions">
            <span className="pc-system-status"><i /> App ready</span>
            <button type="button" className="pc-topbar-button" title="PuzzleCam processes supported workflows locally">?</button>
          </div>
        </header>

        <main className="pc-content">{renderPage()}</main>
      </div>
    </div>
  )
}
