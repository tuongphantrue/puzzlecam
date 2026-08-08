# PuzzleCam v0.2 status

## Ready now

- PWA shell and responsive UI
- Camera/photo capture
- Puzzle registry / plug-in routing
- Sudoku solver + validation + hint
- Tic-Tac-Toe minimax
- Word Search 8-direction solver
- GitHub Pages workflow

## Scaffolded, next implementation

- Chess: board CV + piece model + FEN + Stockfish WASM
- Rubik's Cube: six-face capture + color classifier + cube solver
- Checkers: board CV + move engine
- Connect Four: disc CV + minimax
- Nonogram: clue OCR + constraint solver
- Math: expression OCR + symbolic engine

## Vision boundary

`src/core/vision.ts` defines the recognizer contract. The next Sudoku camera milestone should implement `VisionRecognizer<SudokuGrid>` and feed recognized digits into the existing Sudoku board before solving.
