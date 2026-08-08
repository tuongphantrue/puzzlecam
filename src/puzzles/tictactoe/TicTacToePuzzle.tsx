import { useState } from 'react'
import CameraPanel from '../../components/CameraPanel'
import PuzzleShell from '../../components/PuzzleShell'
import { bestMove, winner, type Board } from './engine'

const empty = (): Board => Array(9).fill(null)

export default function TicTacToePuzzle() {
  const [board, setBoard] = useState<Board>(empty)
  const [suggested, setSuggested] = useState(-1)

  const cycle = (i: number) => {
    const next = [...board]
    next[i] = next[i] === null ? 'X' : next[i] === 'X' ? 'O' : null
    setBoard(next)
    setSuggested(-1)
  }

  const result = winner(board)
  const count = board.filter(Boolean).length
  const nextPlayer: 'X' | 'O' = count % 2 === 0 ? 'X' : 'O'
  const suggest = () => setSuggested(bestMove([...board], nextPlayer))

  return (
    <PuzzleShell icon="❌" title="Tic-Tac-Toe" subtitle="A complete minimax demo showing how game engines plug into PuzzleCam.">
      <div className="two-column puzzle-workspace">
        <section className="panel">
          <div className="panel-heading"><div><p className="eyebrow">Game engine</p><h3>Tap cells to enter the board</h3></div><span className="status ready">Minimax</span></div>
          <div className="ttt-grid">
            {board.map((cell, i) => <button key={i} className={suggested === i ? 'suggested' : ''} onClick={() => cycle(i)}>{cell}</button>)}
          </div>
          <p className="solver-message">{result ? (result === 'draw' ? 'Draw.' : `${result} has already won.`) : `Next player: ${nextPlayer}${suggested >= 0 ? ` — best move is square ${suggested + 1}.` : ''}`}</p>
          <div className="button-row wrap"><button className="primary-button" onClick={suggest} disabled={Boolean(result)}>Best move</button><button className="secondary-button" onClick={() => { setBoard(empty()); setSuggested(-1) }}>Clear</button></div>
        </section>
        <CameraPanel title="Scan board reference" />
      </div>
    </PuzzleShell>
  )
}
