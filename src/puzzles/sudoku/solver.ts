export type SudokuGrid = number[][]

export const emptyGrid = (): SudokuGrid => Array.from({ length: 9 }, () => Array(9).fill(0))

export const sampleGrid: SudokuGrid = [
  [5,3,0,0,7,0,0,0,0],
  [6,0,0,1,9,5,0,0,0],
  [0,9,8,0,0,0,0,6,0],
  [8,0,0,0,6,0,0,0,3],
  [4,0,0,8,0,3,0,0,1],
  [7,0,0,0,2,0,0,0,6],
  [0,6,0,0,0,0,2,8,0],
  [0,0,0,4,1,9,0,0,5],
  [0,0,0,0,8,0,0,7,9],
]

const validAt = (grid: SudokuGrid, row: number, col: number, value: number) => {
  for (let i = 0; i < 9; i += 1) {
    if (grid[row][i] === value || grid[i][col] === value) return false
  }
  const r0 = Math.floor(row / 3) * 3
  const c0 = Math.floor(col / 3) * 3
  for (let r = r0; r < r0 + 3; r += 1) {
    for (let c = c0; c < c0 + 3; c += 1) {
      if (grid[r][c] === value) return false
    }
  }
  return true
}

export const hasConflicts = (grid: SudokuGrid) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const value = grid[r][c]
      if (!value) continue
      const copy = grid.map((row) => [...row])
      copy[r][c] = 0
      if (!validAt(copy, r, c, value)) return true
    }
  }
  return false
}

export function solveSudoku(input: SudokuGrid): SudokuGrid | null {
  if (hasConflicts(input)) return null
  const grid = input.map((row) => [...row])

  const solve = (): boolean => {
    let best: { row: number; col: number; candidates: number[] } | null = null

    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        if (grid[row][col] !== 0) continue
        const candidates: number[] = []
        for (let value = 1; value <= 9; value += 1) {
          if (validAt(grid, row, col, value)) candidates.push(value)
        }
        if (candidates.length === 0) return false
        if (!best || candidates.length < best.candidates.length) best = { row, col, candidates }
      }
    }

    if (!best) return true
    const target = best
    for (const value of target.candidates) {
      grid[target.row][target.col] = value
      if (solve()) return true
      grid[target.row][target.col] = 0
    }
    return false
  }

  return solve() ? grid : null
}

export function nextHint(input: SudokuGrid) {
  const solved = solveSudoku(input)
  if (!solved) return null
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (input[r][c] === 0) return { row: r, col: c, value: solved[r][c] }
    }
  }
  return null
}
