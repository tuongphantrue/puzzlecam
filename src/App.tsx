import { useEffect, useState } from 'react'
import AppHeader from './components/AppHeader'
import Home from './components/Home'
import { findPuzzle, puzzles } from './core/registry'

function idFromHash() {
  const value = window.location.hash.replace(/^#\/?/, '')
  return value || null
}

export default function App() {
  const [selectedId, setSelectedId] = useState<string | null>(() => idFromHash())
  const selected = findPuzzle(selectedId)

  const open = (id: string) => {
    window.location.hash = `/${id}`
    setSelectedId(id)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const home = () => {
    history.pushState('', document.title, window.location.pathname + window.location.search)
    setSelectedId(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  useEffect(() => {
    const onHash = () => setSelectedId(idFromHash())
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const PuzzleComponent = selected?.component

  return (
    <div className="app-shell">
      <AppHeader onHome={home} showBack={Boolean(selected)} />
      {PuzzleComponent ? <PuzzleComponent /> : <Home puzzles={puzzles} onOpen={open} />}
      <footer>
        <span>PuzzleCam v0.3</span>
        <span>Camera frames stay in your browser in this MVP.</span>
      </footer>
    </div>
  )
}
