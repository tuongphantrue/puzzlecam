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

const workspaceNav: NavItem[] = [
  { id: 'dashboard', label: 'My puzzles', icon: '⌂', status: 'ready' },
]

const solverNav: NavItem[] = [
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

const allNav = [...workspaceNav, ...solverNav, ...plannedNav]

const pageMeta: Record<PageId, { title: string; section: string }> = {
  dashboard: { title: 'My puzzles', section: 'Workspace' },
  sudoku: { title: 'Sudoku', section: 'Solvers' },
  wordsearch: { title: 'Word Search', section: 'Solvers' },
  tictactoe: { title: 'Tic-Tac-Toe', section: 'Solvers' },
  chess: { title: 'Chess', section: 'More solvers' },
  rubik: { title: "Rubik's Cube", section: 'More solvers' },
  checkers: { title: 'Checkers', section: 'More solvers' },
  connectfour: { title: 'Connect Four', section: 'More solvers' },
  nonogram: { title: 'Nonogram', section: 'More solvers' },
  math: { title: 'Math', section: 'More solvers' },
}

function pageFromHash(): PageId {
  if (typeof window === 'undefined') return 'dashboard'
  const raw = window.location.hash.replace(/^#\/?/, '').toLowerCase()
  return allNav.some((item) => item.id === raw) ? (raw as PageId) : 'dashboard'
}

function Icon({ name }: { name: string }) {
  return <span className="pc-nav-icon" aria-hidden="true">{name}</span>
}

function SolverRow({ item, navigate }: { item: NavItem; navigate: (id: PageId) => void }) {
  const details: Record<string, { input: string; engine: string }> = {
    sudoku: { input: 'Photo / upload / paste', engine: 'OCR + solver' },
    wordsearch: { input: 'Grid / words', engine: '8-direction finder' },
    tictactoe: { input: 'Board state', engine: 'Minimax' },
  }
  const detail = details[item.id]

  return (
    <button className="pc-table-row pc-table-row-action" onClick={() => navigate(item.id)}>
      <span className="pc-solver-name"><Icon name={item.icon} /><strong>{item.label}</strong></span>
      <span>{detail?.input}</span>
      <span>{detail?.engine}</span>
      <span><em className="pc-status-dot" />Ready</span>
      <span className="pc-table-open">Open →</span>
    </button>
  )
}

function Dashboard({ navigate }: { navigate: (id: PageId) => void }) {
  return (
    <div className="pc-dashboard">
      <header className="pc-page-heading">
        <div>
          <h1>My puzzles</h1>
          <p>Open a solver and work from one consistent puzzle workspace.</p>
        </div>
        <button className="pc-button pc-button-primary" onClick={() => navigate('sudoku')}>Open Sudoku solver</button>
      </header>

      <div className="pc-page-toolbar" aria-label="Puzzle views">
        <div className="pc-view-tabs">
          <span className="pc-view-tab active">Solvers</span>
          <span className="pc-view-tab">Recent</span>
        </div>
        <span className="pc-inline-status"><i /> Local processing ready</span>
      </div>

      <div className="pc-home-grid">
        <section className="pc-work-surface">
          <div className="pc-section-header">
            <div><strong>Solver workspace</strong><small>Available tools</small></div>
            <span>3 ready</span>
          </div>
          <div className="pc-data-table">
            <div className="pc-table-head"><span>Solver</span><span>Input</span><span>Engine</span><span>Status</span><span /></div>
            {solverNav.map((item) => <SolverRow key={item.id} item={item} navigate={navigate} />)}
          </div>
        </section>

        <aside className="pc-inspector-surface">
          <div className="pc-inspector-heading">Workspace</div>
          <div className="pc-inspector-row"><span>Processing</span><strong>On device</strong></div>
          <div className="pc-inspector-row"><span>Ready solvers</span><strong>3</strong></div>
          <div className="pc-inspector-row"><span>Image input</span><strong>Camera · Upload · Paste</strong></div>
          <div className="pc-inspector-section">
            <strong>Start here</strong>
            <p>Choose a solver from the table. Sudoku accepts a photo, uploaded image, or clipboard screenshot and lets you review OCR before solving.</p>
          </div>
          <div className="pc-inspector-section">
            <strong>More solvers</strong>
            <div className="pc-mini-list">
              {plannedNav.slice(0, 4).map((item) => (
                <button key={item.id} onClick={() => navigate(item.id)}><span>{item.label}</span><em>Planned</em></button>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}

function ComingSoon({ item }: { item: NavItem }) {
  return (
    <div className="pc-placeholder-page">
      <header className="pc-page-heading">
        <div><h1>{item.label}</h1><p>This solver will use the same PuzzleCam workspace convention.</p></div>
        <span className="pc-inline-status muted">Planned</span>
      </header>
      <div className="pc-page-toolbar"><div className="pc-view-tabs"><span className="pc-view-tab active">Overview</span></div></div>
      <section className="pc-work-surface pc-placeholder-surface">
        <Icon name={item.icon} />
        <div><strong>{item.label} is planned</strong><p>Its input, analysis and result views will live inside the same compact app shell instead of a separate marketing-style page.</p></div>
      </section>
    </div>
  )
}

export default function App() {
  const [page, setPage] = useState<PageId>(() => pageFromHash())
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.localStorage.getItem('puzzlecam-sidebar-collapsed') === '1'
  })

  useEffect(() => {
    const sync = () => setPage(pageFromHash())
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])

  useEffect(() => {
    window.localStorage.setItem('puzzlecam-sidebar-collapsed', sidebarCollapsed ? '1' : '0')
  }, [sidebarCollapsed])

  const navigate = (id: PageId) => {
    setMobileNavOpen(false)
    window.location.hash = `#/${id}`
    setPage(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const activeItem = useMemo(() => allNav.find((item) => item.id === page), [page])
  const meta = pageMeta[page]

  const renderPage = () => {
    if (page === 'dashboard') return <Dashboard navigate={navigate} />
    if (page === 'sudoku') return <SudokuPuzzle />
    if (page === 'wordsearch') return <WordSearchPuzzle />
    if (page === 'tictactoe') return <TicTacToePuzzle />
    return <ComingSoon item={activeItem || plannedNav[0]} />
  }

  const navGroup = (label: string, items: NavItem[]) => (
    <>
      <p className="pc-nav-label">{label}</p>
      {items.map((item) => (
        <button key={item.id} title={sidebarCollapsed ? item.label : undefined} className={`pc-nav-item ${page === item.id ? 'active' : ''}`} onClick={() => navigate(item.id)}>
          <Icon name={item.icon} />
          <span>{item.label}</span>
          {item.status === 'ready' && item.id !== 'dashboard' && <i className="pc-ready-dot" title="Ready" />}
        </button>
      ))}
    </>
  )

  return (
    <div className="pc-app-shell">
      <aside className={`pc-sidebar ${sidebarCollapsed ? 'collapsed' : ''} ${mobileNavOpen ? 'open' : ''}`}>
        <div className="pc-sidebar-head">
          <button className="pc-brand" onClick={() => navigate('dashboard')} title={sidebarCollapsed ? 'PuzzleCam — My puzzles' : undefined}>
            <span className="pc-brand-mark"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" /></span>
            <span className="pc-brand-copy"><strong>PuzzleCam</strong><small>Puzzle workspace</small></span>
          </button>
          <button
            type="button"
            className="pc-sidebar-collapse"
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            onClick={() => setSidebarCollapsed((value) => !value)}
          >
            {sidebarCollapsed ? '›' : '‹'}
          </button>
        </div>
        <nav className="pc-nav" aria-label="Primary navigation">
          {navGroup('Workspace', workspaceNav)}
          {navGroup('Solvers', solverNav)}
          <div className="pc-nav-divider" />
          {navGroup('More solvers', plannedNav)}
        </nav>
        <div className="pc-sidebar-footer"><span><i /> <b>Local processing</b></span><small>v0.3</small></div>
      </aside>

      {mobileNavOpen && <button className="pc-nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <div className={`pc-app-main ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <header className="pc-topbar">
          <div className="pc-topbar-left">
            <button className="pc-mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}>☰</button>
            <div className="pc-breadcrumbs"><span>{meta.section}</span><b>/</b><strong>{meta.title}</strong></div>
          </div>
          <div className="pc-topbar-actions">
            <span className="pc-system-status"><i /> Ready</span>
            <button type="button" className="pc-topbar-button" title="PuzzleCam help">?</button>
          </div>
        </header>
        <main className="pc-content">{renderPage()}</main>
      </div>
    </div>
  )
}
