# PuzzleCam v0.3 status

PuzzleCam is a GitHub Pages-ready React/TypeScript PWA.

## Working now

- Responsive mobile and desktop web UI
- Mobile live camera input using the rear camera when available
- Desktop/mobile image upload
- Sudoku solver and one-step hints
- Sudoku photo scanner:
  - estimates the Sudoku board from grid-line projections
  - splits the board into 81 cells
  - skips likely blank cells
  - runs printed-digit OCR locally in the browser with Tesseract.js
  - populates the recognized givens
  - automatically solves the board when OCR produces a valid Sudoku
  - leaves OCR results editable when recognition needs correction
- Tic-Tac-Toe minimax engine
- Word Search solver
- Installable PWA configuration
- Automatic GitHub Pages deployment through GitHub Actions

## Scanner limitations in v0.3

The Sudoku scanner is optimized for clear, printed Sudoku puzzles photographed nearly straight-on. Heavy perspective distortion, shadows, very small boards, decorative fonts, or handwriting can reduce OCR accuracy. The recognized cells remain editable before solving again.

## Next vision improvements

- Perspective correction using four-corner/grid detection
- Visual overlay of solved digits onto the captured Sudoku image
- Faster digit classification with a small dedicated 1–9 model
- Chessboard/piece recognition + Stockfish
