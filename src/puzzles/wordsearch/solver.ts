export interface Match { word: string; cells: [number, number][] }
const dirs = [-1,0,1].flatMap((dr) => [-1,0,1].map((dc) => [dr, dc] as const)).filter(([dr,dc]) => dr || dc)

export function parseGrid(raw: string): string[][] {
  return raw.trim().split(/\n+/).map((line) => line.toUpperCase().replace(/[^A-Z]/g, '').split('')).filter((row) => row.length)
}

export function findWords(grid: string[][], words: string[]): Match[] {
  if (!grid.length) return []
  const matches: Match[] = []
  const rows = grid.length
  for (const raw of words) {
    const word = raw.toUpperCase().replace(/[^A-Z]/g, '')
    if (!word) continue
    let found: Match | null = null
    outer: for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < grid[r].length; c += 1) {
        for (const [dr,dc] of dirs) {
          const cells: [number, number][] = []
          let ok = true
          for (let i = 0; i < word.length; i += 1) {
            const rr = r + dr * i, cc = c + dc * i
            if (rr < 0 || rr >= rows || cc < 0 || cc >= grid[rr].length || grid[rr][cc] !== word[i]) { ok = false; break }
            cells.push([rr,cc])
          }
          if (ok) { found = { word, cells }; break outer }
        }
      }
    }
    if (found) matches.push(found)
  }
  return matches
}
