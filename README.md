# PuzzleCam — Rework UI + clipboard + Sudoku vision v5

This is a **drop-in overlay** for the existing `tuongphantrue/puzzlecam` repository. Copy the package contents over the repository while preserving folders.

## Main change in this version: Sudoku image parsing

The previous scanner used an axis-aligned square estimate, split that square into 81 equal regions, applied one threshold per region, and sent the whole cropped region to Tesseract. That is fragile: a small crop error or perspective skew shifts every cell, and leftover grid lines/noise can be interpreted as digits.

The v5 scanner uses a staged vision pipeline instead:

1. **Board contour detection** — loads OpenCV.js lazily and searches the thresholded image for large quadrilateral Sudoku-grid candidates.
2. **Perspective correction** — the best quadrilateral is warped to a true 900×900 square before cells are split.
3. **Grid verification** — candidate quadrilaterals are scored by whether strong lines appear at the expected 10 grid-line positions.
4. **Digit-component isolation** — each cell is cropped inside its borders, thresholded, and reduced to the strongest centered digit-shaped connected contour. Border/grid remnants are rejected.
5. **OCR normalization** — the digit is aspect-preserved, centered on a white 180×180 canvas, and given a reasonable border before Tesseract `PSM.SINGLE_CHAR` OCR.
6. **Second-pass OCR** — low-confidence cells are retried with a lightly thickened digit image.
7. **Sudoku-aware cleanup** — direct row/column/box OCR conflicts are cleared at the lowest-confidence cell. If the OCR state is still impossible, a small number of low-confidence givens are tested and cleared for review rather than forcing an invalid board.
8. **Visible review cells** — uncertain/cleared cells are highlighted in yellow and listed in the right inspector.
9. **Fallback remains** — if OpenCV cannot load or no credible board quadrilateral is found, PuzzleCam falls back to a stronger regular-grid projection detector rather than failing completely.

The image is still processed in the browser. OpenCV.js is downloaded from the official OpenCV 4.10 documentation build on first use; the Sudoku image itself is not sent to OpenCV or a server.

## Recognition diagnostics added to the UI

The inspector now shows:

- Likely digit cells
- Recognized cells / likely cells
- Average OCR confidence
- Board detection method (`Perspective` or `Grid lines`)
- Highlighted cells that need manual review

These diagnostics make it much easier to distinguish a **board detection problem** from a **digit OCR problem**.

## Existing UI features kept

- Rework-style light, dense application shell on all pages
- Desktop collapsible sidebar with remembered state
- Mobile sidebar behavior
- Monochrome PuzzleCam favicon and PWA icons
- Sudoku is solver-only: **photo / upload / paste → OCR → review → solve**
- Clipboard image input using the command bar or `Ctrl+V` / `Cmd+V`

## Files to replace/add

### Sudoku vision + UI
- `src/puzzles/sudoku/recognizer.ts` **(new replacement in this package)**
- `src/puzzles/sudoku/SudokuPuzzle.tsx`
- `src/css/sudoku.css`

### Shared UI
- `src/App.tsx`
- `src/components/PuzzleShell.tsx`
- `src/components/CameraPanel.tsx`
- `src/styles.css`
- `src/css/rework.css`

### Favicon / PWA assets
- `public/favicon.svg`
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/safari-pinned-tab.svg`
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/maskable-512x512.png`

## No new npm package required

The app keeps the repository's existing Tesseract.js dependency. OpenCV.js is loaded lazily by `recognizer.ts`, so you do not need to change `package.json` for this update.

## Deployment

Copy the files over your repository, commit, and push to `main`. Let the existing GitHub Pages action rebuild the app. Because PuzzleCam is a PWA, use a hard refresh or clear the site's service-worker cache once if an older scanner bundle remains after deployment.
