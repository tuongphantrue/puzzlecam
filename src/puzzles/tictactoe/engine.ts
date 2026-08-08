export type Cell = 'X' | 'O' | null
export type Board = Cell[]

export const winner = (board: Board): Cell | 'draw' => {
  const lines = [[0,1,2],[3,4,5],[6,7,8],[0,3,6],[1,4,7],[2,5,8],[0,4,8],[2,4,6]]
  for (const [a,b,c] of lines) if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  return board.every(Boolean) ? 'draw' : null
}

const minimax = (board: Board, turn: 'X' | 'O', ai: 'X' | 'O'): number => {
  const result = winner(board)
  if (result === ai) return 10
  if (result && result !== 'draw') return -10
  if (result === 'draw') return 0
  const scores: number[] = []
  for (let i = 0; i < 9; i += 1) {
    if (board[i]) continue
    board[i] = turn
    scores.push(minimax(board, turn === 'X' ? 'O' : 'X', ai))
    board[i] = null
  }
  return turn === ai ? Math.max(...scores) : Math.min(...scores)
}

export const bestMove = (board: Board, ai: 'X' | 'O') => {
  if (winner(board)) return -1
  let best = -Infinity
  let index = -1
  for (let i = 0; i < 9; i += 1) {
    if (board[i]) continue
    board[i] = ai
    const score = minimax(board, ai === 'X' ? 'O' : 'X', ai)
    board[i] = null
    if (score > best) { best = score; index = i }
  }
  return index
}
