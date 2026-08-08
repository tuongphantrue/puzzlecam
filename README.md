# PuzzleCam

🌐 **Live website:** https://tuongphantrue.github.io/puzzlecam/

[**Open PuzzleCam →**](https://tuongphantrue.github.io/puzzlecam/)

> **Want GitHub hosting only?** See [`GITHUB_PAGES.md`](./GITHUB_PAGES.md). No local deployment is required.

**Point. Think. Solve.** PuzzleCam is a camera-first, installable web app designed to host multiple puzzle/game recognition and solving engines behind one mobile UI.

## What works in v0.2

- Shared mobile camera and photo capture component
- Local-only camera frames (no backend in this MVP)
- **Sudoku**: editable 9×9 grid, validation, full solver, one-step hint
- **Tic-Tac-Toe**: editable board + perfect minimax best move
- **Word Search**: letter-grid parser + 8-direction word finder/highlighting
- Plug-in pages for Chess, Rubik's Cube, Checkers, Connect Four, Nonogram, and Math
- Installable PWA / offline app shell
- GitHub Pages deployment workflow
- Responsive phone/desktop UI

> Camera OCR and automatic board/puzzle classification are intentionally separated from the solvers. In v0.2 the camera captures a reference photo; OCR/vision models can feed recognized state into the existing engines next.

## Stack

- React 19 + TypeScript
- Vite
- vite-plugin-pwa / Workbox
- Browser `getUserMedia()` camera API
- No server required for the MVP

## Optional local development

Requirements: Node.js 22+.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. Camera access works on `localhost` or HTTPS.

## Production build

```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages

No local build is needed. Upload the repository files to GitHub, then select **Settings → Pages → Source → GitHub Actions**. The included workflow installs dependencies, builds the app on GitHub's servers, and deploys `dist/` automatically.

See [`GITHUB_PAGES.md`](./GITHUB_PAGES.md) for the browser-only steps. The Vite config detects the repository name during GitHub Actions so project URLs such as `https://YOURNAME.github.io/puzzlecam/` work without editing the source.

## Architecture

```text
Camera / photo
      |
      v
Shared vision layer (next)
      |
      +--> puzzle classifier (next)
      |
      +--> state recognizer per puzzle (next)
                |
                v
          Puzzle registry
        /      |       \
   Sudoku   Chess   Word Search ...
    solver  engine      solver
        \      |       /
         result / hint
              |
              v
       Canvas/SVG overlay (next)
```

### Puzzle plug-in shape

Every puzzle is registered in `src/core/registry.ts` with an `id`, name, status, description and React component. This keeps navigation/deployment/camera concerns independent from each solver.

```ts
{
  id: 'sudoku',
  name: 'Sudoku',
  status: 'ready',
  component: SudokuPuzzle,
}
```

## Recommended roadmap

### v0.2 — Sudoku camera vision

1. Load OpenCV.js or OpenCV WASM lazily.
2. Detect the largest quadrilateral / Sudoku border.
3. Perspective-warp to a square.
4. Split into 81 cells.
5. Run a small digit classifier (0–9, where 0 = blank) in ONNX Runtime Web.
6. Put predicted digits into the existing Sudoku UI for user verification.
7. Render solved digits back over the image/camera using Canvas.

### v0.3 — Chess

1. Detect/orient the board.
2. Classify 64 squares into empty + 12 chess pieces.
3. Generate FEN.
4. Load Stockfish WASM in a Web Worker.
5. Draw best-move arrows and evaluation.

Use chess analysis for training/positions you are allowed to analyze, not for cheating in live competitive games.

### v0.4 — Word Search OCR

OCR the letter grid, normalize uncertain characters, then pass the resulting matrix directly into the existing word finder.

### v0.5 — Rubik's Cube

Capture six faces, calibrate colors using center stickers, validate the reconstructed state, solve it, and animate moves.

## Suggested future folders

```text
src/
  vision/
    opencv/
    classifiers/
    perspective/
  overlays/
    canvas/
    arrows/
  workers/
    stockfish.worker.ts
    vision.worker.ts
  models/
    sudoku-digits.onnx
    chess-pieces.onnx
```

## Privacy model

The MVP does not upload camera images. Keep recognition and solving in-browser where practical. If a future cloud model is added, make uploads explicit and optional.

## License

MIT — see `LICENSE`.
