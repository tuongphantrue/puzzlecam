# PuzzleCam — Rework-style all-pages UI + clipboard image input

This package is an **overlay for the existing `tuongphantrue/puzzlecam` repository**.

## What it changes

- Replaces the old dark marketing-style home screen with a light, dense Rework-style app workspace.
- Uses one consistent shell across Dashboard/My puzzles, Sudoku, Word Search, Tic-Tac-Toe and planned solvers.
- Keeps Sudoku **solver-only**: photo/upload/paste → OCR → review recognized digits → solve.
- Adds **Paste from clipboard** as a first-class image source. Users can click the paste area or simply press `Ctrl+V` / `Cmd+V` while the solver is open.
- The shared `CameraPanel` also supports clipboard images, so image-enabled puzzle modules can reuse the same behavior.
- Replaces the old colorful camera favicon/app icon with a compact monochrome **camera + puzzle-grid** mark that matches the new UI.
- Uses that same mark in the PuzzleCam sidebar brand so the browser icon and in-app identity are consistent.

## Files to replace/add

Copy the contents of this package over the repository, preserving folders.

### UI
- `src/App.tsx`
- `src/components/PuzzleShell.tsx`
- `src/components/CameraPanel.tsx`
- `src/puzzles/sudoku/SudokuPuzzle.tsx`
- `src/styles.css`
- `src/css/rework.css`
- `src/css/sudoku.css`

### Favicon / PWA icon assets
- `public/favicon.svg`
- `public/favicon.ico`
- `public/favicon-16x16.png`
- `public/favicon-32x32.png`
- `public/apple-touch-icon.png`
- `public/safari-pinned-tab.svg`
- `public/pwa-192x192.png`
- `public/pwa-512x512.png`
- `public/maskable-512x512.png`

The common Vite/VitePWA filenames are included so existing favicon/PWA references can be replaced without changing solver code.

## If your `index.html` explicitly names an older favicon

Point its favicon links at the new public asset, preferably:

```html
<link rel="icon" type="image/svg+xml" href="./favicon.svg" />
<link rel="icon" type="image/png" sizes="32x32" href="./favicon-32x32.png" />
<link rel="apple-touch-icon" href="./apple-touch-icon.png" />
```

For GitHub Pages, keeping these references relative avoids pointing at the domain root instead of `/puzzlecam/`.

## Deploy / cache

After copying the files, commit and push to `main`. The repository's GitHub Pages workflow can rebuild the app.

Favicons and PWA icons are aggressively cached by browsers and service workers. After deployment, if the old icon remains, use a hard refresh and clear the PuzzleCam site/PWA cache once.

## Sidebar collapse update

The Rework-style navigation can now be collapsed on desktop using the small chevron on the sidebar edge.

- Expanded width: 216 px
- Collapsed width: 58 px, icon-only navigation
- The collapsed preference is saved in `localStorage`
- Navigation items expose titles/tooltips in collapsed mode
- On screens 760 px and below, the sidebar uses the existing full-width mobile drawer instead of the desktop collapsed state


## Clipboard image input

Sudoku now exposes three image sources in the command bar: **Take photo**, **Upload image**, and **Paste image**.

The right-side Source image inspector also contains a compact paste target. Copy a screenshot or image, focus the paste area, then press `Ctrl+V` on Windows/Linux or `Cmd+V` on macOS. The pasted image goes through the same local OCR flow as an uploaded file.

When supported by the browser, clicking **Paste image** also attempts direct clipboard-image access. If the browser blocks that permission, the UI falls back to the standard keyboard paste event instead.
