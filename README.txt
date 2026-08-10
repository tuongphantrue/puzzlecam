PuzzleCam Sudoku solver-only update

Replace this file in your repository:
  src/puzzles/sudoku/SudokuPuzzle.tsx

What changed:
- Sudoku opens with an empty board instead of a sample puzzle.
- Removed Sample and Hint game-style actions.
- Photo/camera upload is the intended starting point.
- OCR results are shown BEFORE solving so the user can correct recognition mistakes.
- Main action is now "Solve Sudoku".
- Reset returns to the photo-first empty state.
- The solver still runs entirely in the browser using the existing recognizer/solver.

No changes are required to recognizer.ts or solver.ts for this UI/flow change.
