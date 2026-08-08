interface Props {
  onHome: () => void
  showBack: boolean
}

export default function AppHeader({ onHome, showBack }: Props) {
  return (
    <header className="app-header">
      <button className="brand" onClick={onHome} aria-label="PuzzleCam home">
        <img src="./logo.svg" alt="" />
        <span>
          <strong>PuzzleCam</strong>
          <small>Point. Think. Solve.</small>
        </span>
      </button>
      {showBack && (
        <button className="ghost-button" onClick={onHome}>
          ← All puzzles
        </button>
      )}
    </header>
  )
}
