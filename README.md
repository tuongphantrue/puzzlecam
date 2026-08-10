# PuzzleCam — Rework-style Sudoku UI update

This package contains the real source replacement for the Sudoku page.

## Files

- `src/puzzles/sudoku/SudokuPuzzle.tsx`
- `src/puzzles/sudoku/rework-sudoku.css`

## Apply

Copy both files into the same paths in your existing `puzzlecam` repository. `SudokuPuzzle.tsx` imports the new scoped CSS automatically.

No changes are required to the existing Sudoku `recognizer.ts` or `solver.ts`.

## Behavior

Sudoku is solver-only:

1. Take a photo or upload an image.
2. OCR recognizes the givens.
3. The recognized board is shown for review/correction.
4. The user explicitly clicks **Solve Sudoku**.
5. Original givens remain visually emphasized and computed solution cells are lighter.

Removed from this flow:

- generated/sample puzzle
- Hint
- difficulty/game controls
- automatic solving immediately after OCR

The UI uses a Rework-inspired enterprise SaaS visual language: monochrome surfaces, compact panels, subtle dividers, dense status metadata and a workflow overview.
