# PuzzleCam — Rework-style all-pages UI update

This package is an **overlay for the existing `tuongphantrue/puzzlecam` repository**.

## What it changes

- Replaces the old dark marketing-style home screen with a light, dense enterprise app dashboard.
- Adds one consistent app shell across every page: left navigation, top bar, breadcrumbs, status language, compact panels and responsive mobile navigation.
- Restyles the ready modules: Sudoku, Word Search and Tic-Tac-Toe.
- Restyles shared camera/upload input so puzzle pages use the same UI language.
- Gives planned modules their own consistent in-app placeholder pages instead of marketing cards.
- Keeps Sudoku **solver-only**: photo/upload → OCR → review recognized digits → solve. No generated sample, Hint, difficulty or New Game flow.

## Files to replace/add

Copy the `src/` folder from this ZIP over the `src/` folder in the repository:

- `src/App.tsx` — new global app shell + dashboard + module navigation
- `src/components/PuzzleShell.tsx` — shared page heading/container
- `src/components/CameraPanel.tsx` — same camera/upload behavior with the new UI
- `src/puzzles/sudoku/SudokuPuzzle.tsx` — solver-only Sudoku flow
- `src/styles.css` — compatibility entry point
- `src/css/rework.css` — global Rework-style app UI
- `src/css/sudoku.css` — Sudoku workflow styles

No solver/recognizer files are replaced, so the existing puzzle engines stay in place.

## Deploy

After copying the files, commit and push to `main`. The repository's existing GitHub Pages workflow can build/deploy the updated UI.

If GitHub Pages still shows the old design immediately after deployment, hard refresh the page (Ctrl+Shift+R) or clear the installed PWA/service-worker cache, because PuzzleCam is an installable PWA and an older app shell may remain cached.
