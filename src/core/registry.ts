import type { PuzzleDefinition } from '../types'
import SudokuPuzzle from '../puzzles/sudoku/SudokuPuzzle'
import TicTacToePuzzle from '../puzzles/tictactoe/TicTacToePuzzle'
import WordSearchPuzzle from '../puzzles/wordsearch/WordSearchPuzzle'
import { createStubPuzzle } from '../puzzles/stubs/StubPuzzle'

const Chess = createStubPuzzle(
  'Chess',
  '♟️',
  'Board recognition → FEN → Stockfish WebAssembly → best-move arrows and coaching.',
  ['Detect 8×8 board', 'Recognize 12 piece classes', 'Generate FEN', 'Run Stockfish in a Web Worker'],
)

const Rubiks = createStubPuzzle(
  "Rubik's Cube",
  '🧊',
  'Scan six faces, classify sticker colors, reconstruct the cube, and guide each move.',
  ['Capture six faces', 'Color calibration', 'Validate cube state', 'Run cube solver'],
)

const Checkers = createStubPuzzle(
  'Checkers',
  '⚫',
  'Recognize pieces and kings, validate turns, and suggest moves with a game engine.',
  ['Board detector', 'Piece classifier', 'Move generator', 'Minimax engine'],
)

const Nonogram = createStubPuzzle(
  'Nonogram',
  '🧩',
  'Read row/column clues and solve the grid with constraint propagation.',
  ['Grid + clue OCR', 'Constraint model', 'Hint generator', 'Overlay renderer'],
)

const Math = createStubPuzzle(
  'Math',
  '🧮',
  'Capture an equation, recognize the expression, then show an answer or step-by-step hint.',
  ['Expression OCR', 'Parser', 'Symbolic solver', 'Step renderer'],
)

const ConnectFour = createStubPuzzle(
  'Connect Four',
  '🔴',
  'Recognize a 7×6 board and suggest the strongest legal move.',
  ['Disc detector', 'Board state', 'Winner check', 'Minimax/alpha-beta'],
)

export const puzzles: PuzzleDefinition[] = [
  {
    id: 'sudoku',
    name: 'Sudoku',
    icon: '🔢',
    description: 'Solve a 9×9 Sudoku, get one-step hints, and use camera capture for reference.',
    status: 'ready',
    component: SudokuPuzzle,
  },
  {
    id: 'tic-tac-toe',
    name: 'Tic-Tac-Toe',
    icon: '❌',
    description: 'Tap in a board and let minimax calculate the best move.',
    status: 'ready',
    component: TicTacToePuzzle,
  },
  {
    id: 'word-search',
    name: 'Word Search',
    icon: '🔤',
    description: 'Paste a letter grid and word list, then highlight every match in 8 directions.',
    status: 'ready',
    component: WordSearchPuzzle,
  },
  { id: 'chess', name: 'Chess', icon: '♟️', description: 'Camera board recognition and Stockfish analysis.', status: 'prototype', component: Chess },
  { id: 'rubiks', name: "Rubik's Cube", icon: '🧊', description: 'Six-face scan and move-by-move cube guidance.', status: 'prototype', component: Rubiks },
  { id: 'checkers', name: 'Checkers', icon: '⚫', description: 'Board recognition and move analysis.', status: 'planned', component: Checkers },
  { id: 'connect-four', name: 'Connect Four', icon: '🔴', description: 'Board scan and best-move engine.', status: 'planned', component: ConnectFour },
  { id: 'nonogram', name: 'Nonogram', icon: '🧩', description: 'Clue OCR and constraint solver.', status: 'planned', component: Nonogram },
  { id: 'math', name: 'Math', icon: '🧮', description: 'Expression OCR with answers and steps.', status: 'planned', component: Math },
]

export const findPuzzle = (id: string | null) => puzzles.find((p) => p.id === id)
