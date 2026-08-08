# PuzzleCam

PuzzleCam is a camera-first puzzle solver PWA designed to run directly from GitHub Pages. No local server is required for normal use.

## v0.3

The Sudoku module now supports both main workflows:

- **Mobile:** open the live rear camera, capture a Sudoku, scan it, and solve it.
- **Desktop/web:** upload a Sudoku picture, scan it, and solve it.

Sudoku OCR is performed in the browser with Tesseract.js. Puzzle images are not sent to a PuzzleCam backend.

### Current modules

- Sudoku — scanner + OCR + automatic solver + hints
- Tic-Tac-Toe — playable minimax assistant
- Word Search — grid/word solver
- Chess — module scaffold
- Rubik's Cube — module scaffold
- Checkers, Connect Four, Nonogram, Math — planned/scaffold modules

## GitHub Pages deployment

1. Upload the project contents to the root of your GitHub repository.
2. Commit/push to the `main` branch.
3. In GitHub, open **Settings → Pages** and choose **GitHub Actions** as the source.
4. The included `.github/workflows/deploy.yml` installs dependencies, builds the app, and deploys `dist`.
5. Future pushes to `main` redeploy automatically.

Vite automatically receives the correct `/<repository>/` base path when it builds in GitHub Actions.

## Camera requirements

Browser camera APIs require HTTPS (or localhost). GitHub Pages uses HTTPS, so the deployed site can request camera permission on supported mobile/desktop browsers.

## Sudoku scanning tips

For best OCR accuracy:

- Fill most of the camera frame with the Sudoku.
- Keep the board as straight as possible.
- Use bright, even lighting.
- Avoid glare and heavy shadows.
- Printed digits work better than handwriting in this version.
- If one digit is wrong, edit it in the 9×9 board and press **Solve** again.

The first scan may take longer because the browser needs to load the OCR language model.

## Development (optional)

Local development is not required to use PuzzleCam, but developers can run:

```bash
npm install
npm run dev
```

## Privacy

Camera/photo processing is designed to happen in the browser. Tesseract.js may download its OCR runtime/language assets from its configured web resources, but PuzzleCam itself has no image-upload backend.
