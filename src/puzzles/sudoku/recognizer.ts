import { createWorker, PSM } from 'tesseract.js'

import { solveSudoku, type SudokuGrid } from './solver'

export interface SudokuScanProgress {
  phase: 'prepare' | 'ocr' | 'done'
  current?: number
  total?: number
  message: string
}

export interface SudokuReviewCell {
  row: number
  col: number
  confidence: number
  reason: 'low-confidence' | 'unreadable' | 'conflict-removed' | 'solver-removed'
}

export interface SudokuScanResult {
  grid: SudokuGrid
  confidence: number
  detectedCells: number
  candidateCells: number
  board: { x: number; y: number; size: number }
  boardMethod: 'perspective' | 'grid-lines'
  warnings: string[]
  reviewCells: SudokuReviewCell[]
}

type GrayImage = {
  width: number
  height: number
  data: Uint8ClampedArray
}

type Point = { x: number; y: number }
type Quad = [Point, Point, Point, Point]
type Cv = any

type CellCandidate = {
  row: number
  col: number
  canvas: HTMLCanvasElement
  alternate: HTMLCanvasElement | null
}

type RecognizedEntry = {
  row: number
  col: number
  digit: number
  confidence: number
}

const OPENCV_URL = 'https://docs.opencv.org/4.10.0/opencv.js'
const BOARD_SIZE = 900
const emptyGrid = (): SudokuGrid => Array.from({ length: 9 }, () => Array(9).fill(0))
let openCvPromise: Promise<Cv> | null = null

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the selected image.'))
    img.src = dataUrl
  })
}

function imageToGray(img: HTMLImageElement, maxSide = 1800): GrayImage {
  const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
  const width = Math.max(1, Math.round(img.naturalWidth * scale))
  const height = Math.max(1, Math.round(img.naturalHeight * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas is unavailable in this browser.')
  ctx.drawImage(img, 0, 0, width, height)
  const rgba = ctx.getImageData(0, 0, width, height).data
  const gray = new Uint8ClampedArray(width * height)
  for (let i = 0, p = 0; i < rgba.length; i += 4, p += 1) {
    gray[p] = Math.round(rgba[i] * 0.299 + rgba[i + 1] * 0.587 + rgba[i + 2] * 0.114)
  }
  return { width, height, data: gray }
}

function otsuThreshold(gray: Uint8ClampedArray) {
  const histogram = new Array<number>(256).fill(0)
  for (const value of gray) histogram[value] += 1
  const total = gray.length
  let sum = 0
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i]
  let sumBackground = 0
  let weightBackground = 0
  let bestVariance = 0
  let threshold = 128
  for (let i = 0; i < 256; i += 1) {
    weightBackground += histogram[i]
    if (!weightBackground) continue
    const weightForeground = total - weightBackground
    if (!weightForeground) break
    sumBackground += i * histogram[i]
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sum - sumBackground) / weightForeground
    const between = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (between > bestVariance) {
      bestVariance = between
      threshold = i
    }
  }
  return threshold
}

function orderQuad(points: Point[]): Quad {
  const bySum = [...points].sort((a, b) => (a.x + a.y) - (b.x + b.y))
  const tl = bySum[0]
  const br = bySum[bySum.length - 1]
  const remaining = points.filter((point) => point !== tl && point !== br)
  const tr = remaining[0].x - remaining[0].y > remaining[1].x - remaining[1].y ? remaining[0] : remaining[1]
  const bl = remaining[0] === tr ? remaining[1] : remaining[0]
  return [tl, tr, br, bl]
}

function quadBounds(quad: Quad) {
  const xs = quad.map((point) => point.x)
  const ys = quad.map((point) => point.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  const width = Math.max(...xs) - x
  const height = Math.max(...ys) - y
  return { x, y, width, height }
}

function quadLooksLikeBoard(quad: Quad, imageWidth: number, imageHeight: number) {
  const [tl, tr, br, bl] = quad
  const top = distance(tl, tr)
  const right = distance(tr, br)
  const bottom = distance(bl, br)
  const left = distance(tl, bl)
  const avgWidth = (top + bottom) / 2
  const avgHeight = (left + right) / 2
  const ratio = avgWidth / Math.max(1, avgHeight)
  const bounds = quadBounds(quad)
  const areaRatio = (bounds.width * bounds.height) / Math.max(1, imageWidth * imageHeight)
  return ratio > 0.55 && ratio < 1.8 && areaRatio > 0.08 && avgWidth > 160 && avgHeight > 160
}

async function getOpenCv(): Promise<Cv> {
  const win = window as typeof window & { cv?: Cv | Promise<Cv> }

  const resolveExisting = async () => {
    if (!win.cv) return null
    const cv = typeof (win.cv as Promise<Cv>)?.then === 'function' ? await (win.cv as Promise<Cv>) : win.cv
    return cv?.Mat ? cv : null
  }

  const existing = await resolveExisting()
  if (existing) return existing
  if (openCvPromise) return openCvPromise

  openCvPromise = new Promise<Cv>((resolve, reject) => {
    let finished = false
    const deadline = Date.now() + 30000

    const finish = (value: Cv) => {
      if (finished) return
      finished = true
      resolve(value)
    }

    const fail = (message: string) => {
      if (finished) return
      finished = true
      openCvPromise = null
      reject(new Error(message))
    }

    const poll = async () => {
      try {
        const cv = await resolveExisting()
        if (cv) {
          finish(cv)
          return
        }
      } catch {
        // Keep polling while the WebAssembly runtime initializes.
      }
      if (Date.now() > deadline) {
        fail('OpenCV vision engine took too long to load.')
        return
      }
      window.setTimeout(() => void poll(), 80)
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[data-puzzlecam-opencv]')
    if (!existingScript) {
      const script = document.createElement('script')
      script.src = OPENCV_URL
      script.async = true
      script.dataset.puzzlecamOpencv = 'true'
      script.addEventListener('error', () => fail('Could not load the local vision engine. Check your connection and try again.'))
      document.head.appendChild(script)
    }

    void poll()
  })

  return openCvPromise
}

function projectionFallback(gray: GrayImage) {
  const threshold = clamp(otsuThreshold(gray.data) + 18, 70, 215)
  const x = new Float32Array(gray.width)
  const y = new Float32Array(gray.height)

  for (let row = 0; row < gray.height; row += 1) {
    const offset = row * gray.width
    for (let col = 0; col < gray.width; col += 1) {
      if (gray.data[offset + col] < threshold) {
        x[col] += 1
        y[row] += 1
      }
    }
  }

  const bestGrid = (values: Float32Array, crossSize: number) => {
    const smooth = new Float32Array(values.length)
    for (let i = 0; i < values.length; i += 1) {
      let sum = 0
      let count = 0
      for (let j = Math.max(0, i - 2); j <= Math.min(values.length - 1, i + 2); j += 1) {
        sum += values[j]
        count += 1
      }
      smooth[i] = sum / count
    }

    const peakFloor = Math.max(crossSize * 0.18, Math.max(...Array.from(smooth)) * 0.3)
    const groups: Array<{ center: number; score: number }> = []
    let start = -1
    let weight = 0
    let weighted = 0
    const close = (end: number) => {
      if (start < 0) return
      groups.push({ center: weighted / Math.max(1, weight), score: weight / Math.max(1, end - start + 1) })
      start = -1
      weight = 0
      weighted = 0
    }

    for (let i = 0; i < smooth.length; i += 1) {
      if (smooth[i] >= peakFloor) {
        if (start < 0) start = i
        weight += smooth[i]
        weighted += smooth[i] * i
      } else {
        close(i - 1)
      }
    }
    close(smooth.length - 1)

    let best: { start: number; end: number; matches: number; score: number } | null = null
    for (let a = 0; a < groups.length; a += 1) {
      for (let b = a + 1; b < groups.length; b += 1) {
        const startPos = groups[a].center
        const endPos = groups[b].center
        const span = endPos - startPos
        if (span < values.length * 0.3) continue
        const step = span / 9
        if (step < 12) continue
        let matches = 0
        let score = 0
        for (let line = 0; line < 10; line += 1) {
          const expected = startPos + line * step
          let bestDistance = Infinity
          let bestStrength = 0
          for (const group of groups) {
            const delta = Math.abs(group.center - expected)
            if (delta < bestDistance) {
              bestDistance = delta
              bestStrength = group.score
            }
          }
          if (bestDistance <= step * 0.2) {
            matches += 1
            score += bestStrength
          }
        }
        const candidate = { start: startPos, end: endPos, matches, score }
        if (!best || candidate.matches > best.matches || (candidate.matches === best.matches && candidate.score > best.score)) best = candidate
      }
    }
    return best && best.matches >= 7 ? best : null
  }

  const gx = bestGrid(x, gray.height)
  const gy = bestGrid(y, gray.width)
  if (!gx || !gy) return null
  const width = gx.end - gx.start
  const height = gy.end - gy.start
  const size = Math.min(width, height)
  const cx = (gx.start + gx.end) / 2
  const cy = (gy.start + gy.end) / 2
  return {
    x: Math.round(clamp(cx - size / 2, 0, gray.width - size)),
    y: Math.round(clamp(cy - size / 2, 0, gray.height - size)),
    size: Math.round(size),
  }
}

function regularGridScore(cv: Cv, gray: any) {
  const binary = new cv.Mat()
  try {
    cv.adaptiveThreshold(gray, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 31, 7)
    const size = gray.rows
    const x = new Float32Array(gray.cols)
    const y = new Float32Array(gray.rows)
    const data: Uint8Array = binary.data
    for (let row = 0; row < gray.rows; row += 1) {
      const offset = row * gray.cols
      for (let col = 0; col < gray.cols; col += 1) {
        if (data[offset + col]) {
          x[col] += 1
          y[row] += 1
        }
      }
    }

    const axisScore = (values: Float32Array) => {
      let total = 0
      const window = Math.max(3, Math.round(values.length / 45))
      for (let line = 0; line < 10; line += 1) {
        const expected = Math.round((line * (values.length - 1)) / 9)
        let peak = 0
        for (let pos = Math.max(0, expected - window); pos <= Math.min(values.length - 1, expected + window); pos += 1) {
          peak = Math.max(peak, values[pos])
        }
        total += clamp(peak / Math.max(1, size * 0.55), 0, 1)
      }
      return total / 10
    }

    return (axisScore(x) + axisScore(y)) / 2
  } finally {
    binary.delete()
  }
}

function warpFromQuad(cv: Cv, gray: any, quad: Quad, size = BOARD_SIZE) {
  const srcPoints = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flatMap((point) => [point.x, point.y]))
  const dstPoints = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, size - 1, 0, size - 1, size - 1, 0, size - 1])
  const matrix = cv.getPerspectiveTransform(srcPoints, dstPoints)
  const warped = new cv.Mat()
  try {
    cv.warpPerspective(gray, warped, matrix, new cv.Size(size, size), cv.INTER_CUBIC, cv.BORDER_CONSTANT, new cv.Scalar(255, 255, 255, 255))
    return warped
  } finally {
    srcPoints.delete()
    dstPoints.delete()
    matrix.delete()
  }
}

function detectPerspectiveBoard(cv: Cv, img: HTMLImageElement) {
  const original = cv.imread(img)
  const resized = new cv.Mat()
  const gray = new cv.Mat()
  const blurred = new cv.Mat()
  const binary = new cv.Mat()
  const closed = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3))

  try {
    const scale = Math.min(1, 1800 / Math.max(original.cols, original.rows))
    if (scale < 1) cv.resize(original, resized, new cv.Size(Math.round(original.cols * scale), Math.round(original.rows * scale)), 0, 0, cv.INTER_AREA)
    else original.copyTo(resized)

    cv.cvtColor(resized, gray, cv.COLOR_RGBA2GRAY)
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0, 0, cv.BORDER_DEFAULT)
    cv.adaptiveThreshold(blurred, binary, 255, cv.ADAPTIVE_THRESH_GAUSSIAN_C, cv.THRESH_BINARY_INV, 41, 9)
    cv.morphologyEx(binary, closed, cv.MORPH_CLOSE, kernel)
    cv.findContours(closed, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const imageArea = gray.cols * gray.rows
    const candidates: Array<{ quad: Quad; contourArea: number }> = []

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i)
      const approx = new cv.Mat()
      try {
        const area = Math.abs(cv.contourArea(contour, false))
        if (area < imageArea * 0.06) continue
        const perimeter = cv.arcLength(contour, true)
        cv.approxPolyDP(contour, approx, perimeter * 0.02, true)
        if (approx.rows !== 4) continue
        const raw: Int32Array = approx.data32S
        const points: Point[] = []
        for (let p = 0; p < raw.length; p += 2) points.push({ x: raw[p], y: raw[p + 1] })
        if (points.length !== 4) continue
        const quad = orderQuad(points)
        if (!quadLooksLikeBoard(quad, gray.cols, gray.rows)) continue
        candidates.push({ quad, contourArea: area })
      } finally {
        approx.delete()
        contour.delete()
      }
    }

    candidates.sort((a, b) => b.contourArea - a.contourArea)
    let best: { quad: Quad; warped: any; score: number } | null = null
    for (const candidate of candidates.slice(0, 10)) {
      const warped = warpFromQuad(cv, gray, candidate.quad, 450)
      const gridScore = regularGridScore(cv, warped)
      const areaScore = clamp(candidate.contourArea / Math.max(1, imageArea * 0.55), 0, 1)
      const score = gridScore * 0.82 + areaScore * 0.18
      if (!best || score > best.score) {
        if (best) best.warped.delete()
        best = { quad: candidate.quad, warped, score }
      } else {
        warped.delete()
      }
    }

    if (!best || best.score < 0.42) {
      if (best) best.warped.delete()
      return null
    }

    const warpedFull = warpFromQuad(cv, gray, best.quad, BOARD_SIZE)
    best.warped.delete()
    const bounds = quadBounds(best.quad)
    return {
      gray: warpedFull,
      sourceWidth: gray.cols,
      sourceHeight: gray.rows,
      bounds,
      score: best.score,
    }
  } finally {
    original.delete()
    resized.delete()
    gray.delete()
    blurred.delete()
    binary.delete()
    closed.delete()
    contours.delete()
    hierarchy.delete()
    kernel.delete()
  }
}

function createNormalizedCanvas(cv: Cv, binaryCell: any, rect: { x: number; y: number; width: number; height: number }, dilate: boolean) {
  const margin = Math.max(2, Math.round(Math.max(rect.width, rect.height) * 0.08))
  const x = clamp(rect.x - margin, 0, binaryCell.cols - 1)
  const y = clamp(rect.y - margin, 0, binaryCell.rows - 1)
  const right = clamp(rect.x + rect.width + margin, x + 1, binaryCell.cols)
  const bottom = clamp(rect.y + rect.height + margin, y + 1, binaryCell.rows)
  const roi = binaryCell.roi(new cv.Rect(x, y, right - x, bottom - y))
  const work = new cv.Mat()
  const inverted = new cv.Mat()
  let kernel: any = null
  try {
    if (dilate) {
      kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(2, 2))
      cv.dilate(roi, work, kernel)
    } else {
      roi.copyTo(work)
    }
    cv.bitwise_not(work, inverted)
    const raw = document.createElement('canvas')
    cv.imshow(raw, inverted)

    const target = 180
    const canvas = document.createElement('canvas')
    canvas.width = target
    canvas.height = target
    const ctx = canvas.getContext('2d')
    if (!ctx) return canvas
    ctx.fillStyle = '#fff'
    ctx.fillRect(0, 0, target, target)
    ctx.imageSmoothingEnabled = false
    const maxDim = 128
    const scale = Math.min(maxDim / raw.width, maxDim / raw.height)
    const width = Math.max(1, Math.round(raw.width * scale))
    const height = Math.max(1, Math.round(raw.height * scale))
    const dx = Math.round((target - width) / 2)
    const dy = Math.round((target - height) / 2)
    ctx.drawImage(raw, 0, 0, raw.width, raw.height, dx, dy, width, height)
    return canvas
  } finally {
    roi.delete()
    work.delete()
    inverted.delete()
    if (kernel) kernel.delete()
  }
}

function extractCellCandidate(cv: Cv, warpedGray: any, row: number, col: number): CellCandidate | null {
  const cell = warpedGray.cols / 9
  const pad = Math.max(8, Math.round(cell * 0.12))
  const x0 = Math.round(col * cell + pad)
  const y0 = Math.round(row * cell + pad)
  const x1 = Math.round((col + 1) * cell - pad)
  const y1 = Math.round((row + 1) * cell - pad)
  const roi = warpedGray.roi(new cv.Rect(x0, y0, Math.max(1, x1 - x0), Math.max(1, y1 - y0)))
  const blurred = new cv.Mat()
  const binary = new cv.Mat()
  const contours = new cv.MatVector()
  const hierarchy = new cv.Mat()

  try {
    cv.GaussianBlur(roi, blurred, new cv.Size(3, 3), 0, 0, cv.BORDER_DEFAULT)
    cv.threshold(blurred, binary, 0, 255, cv.THRESH_BINARY_INV + cv.THRESH_OTSU)
    cv.findContours(binary, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)

    const area = binary.rows * binary.cols
    const centerX = binary.cols / 2
    const centerY = binary.rows / 2
    let best: { rect: { x: number; y: number; width: number; height: number }; score: number } | null = null

    for (let i = 0; i < contours.size(); i += 1) {
      const contour = contours.get(i)
      try {
        const rect = cv.boundingRect(contour)
        const contourArea = Math.abs(cv.contourArea(contour, false))
        const heightRatio = rect.height / binary.rows
        const widthRatio = rect.width / binary.cols
        const areaRatio = contourArea / Math.max(1, area)
        const touchesEdge = rect.x <= 1 || rect.y <= 1 || rect.x + rect.width >= binary.cols - 1 || rect.y + rect.height >= binary.rows - 1
        const longHorizontal = widthRatio > 0.72 && heightRatio < 0.12
        const longVertical = heightRatio > 0.72 && widthRatio < 0.1
        if (touchesEdge || longHorizontal || longVertical) continue
        if (heightRatio < 0.24 || widthRatio < 0.035 || areaRatio < 0.0025) continue
        const cx = rect.x + rect.width / 2
        const cy = rect.y + rect.height / 2
        const centerDistance = Math.hypot((cx - centerX) / binary.cols, (cy - centerY) / binary.rows)
        if (centerDistance > 0.43) continue
        const score = contourArea * (1 + heightRatio) * (1 - Math.min(0.8, centerDistance))
        if (!best || score > best.score) best = { rect, score }
      } finally {
        contour.delete()
      }
    }

    if (!best) return null
    return {
      row,
      col,
      canvas: createNormalizedCanvas(cv, binary, best.rect, false),
      alternate: createNormalizedCanvas(cv, binary, best.rect, true),
    }
  } finally {
    roi.delete()
    blurred.delete()
    binary.delete()
    contours.delete()
    hierarchy.delete()
  }
}

function fallbackCellCanvas(gray: GrayImage, board: { x: number; y: number; size: number }, row: number, col: number) {
  const cell = board.size / 9
  const pad = Math.max(3, cell * 0.13)
  const x0 = clamp(Math.round(board.x + col * cell + pad), 0, gray.width - 1)
  const y0 = clamp(Math.round(board.y + row * cell + pad), 0, gray.height - 1)
  const x1 = clamp(Math.round(board.x + (col + 1) * cell - pad), x0 + 1, gray.width)
  const y1 = clamp(Math.round(board.y + (row + 1) * cell - pad), y0 + 1, gray.height)
  const width = x1 - x0
  const height = y1 - y0
  const pixels: number[] = []
  for (let y = y0; y < y1; y += 1) {
    const offset = y * gray.width
    for (let x = x0; x < x1; x += 1) pixels.push(gray.data[offset + x])
  }
  const threshold = clamp(otsuThreshold(Uint8ClampedArray.from(pixels)) + 8, 65, 215)
  let dark = 0
  for (const value of pixels) if (value < threshold) dark += 1
  const inkRatio = dark / Math.max(1, pixels.length)
  if (inkRatio < 0.007) return null

  const raw = document.createElement('canvas')
  raw.width = width
  raw.height = height
  const rctx = raw.getContext('2d')
  if (!rctx) return null
  const image = rctx.createImageData(width, height)
  let p = 0
  for (let y = y0; y < y1; y += 1) {
    const offset = y * gray.width
    for (let x = x0; x < x1; x += 1) {
      const value = gray.data[offset + x] < threshold ? 0 : 255
      image.data[p++] = value
      image.data[p++] = value
      image.data[p++] = value
      image.data[p++] = 255
    }
  }
  rctx.putImageData(image, 0, 0)

  const canvas = document.createElement('canvas')
  canvas.width = 180
  canvas.height = 180
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, 180, 180)
  ctx.imageSmoothingEnabled = false
  ctx.drawImage(raw, 20, 20, 140, 140)
  return { row, col, canvas, alternate: null } satisfies CellCandidate
}

function cleanDigit(text: string) {
  const match = text.replace(/[^1-9]/g, '').match(/[1-9]/)
  return match ? Number(match[0]) : 0
}

function conflictKeys(grid: SudokuGrid) {
  const keys = new Set<string>()
  const markDuplicates = (cells: Array<{ row: number; col: number; value: number }>) => {
    const groups = new Map<number, Array<{ row: number; col: number }>>()
    for (const cell of cells) {
      if (!cell.value) continue
      const list = groups.get(cell.value) || []
      list.push(cell)
      groups.set(cell.value, list)
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue
      for (const cell of group) keys.add(`${cell.row}-${cell.col}`)
    }
  }

  for (let row = 0; row < 9; row += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, col) => ({ row, col, value: grid[row][col] })))
  }
  for (let col = 0; col < 9; col += 1) {
    markDuplicates(Array.from({ length: 9 }, (_, row) => ({ row, col, value: grid[row][col] })))
  }
  for (let boxRow = 0; boxRow < 3; boxRow += 1) {
    for (let boxCol = 0; boxCol < 3; boxCol += 1) {
      const cells: Array<{ row: number; col: number; value: number }> = []
      for (let dr = 0; dr < 3; dr += 1) for (let dc = 0; dc < 3; dc += 1) {
        const row = boxRow * 3 + dr
        const col = boxCol * 3 + dc
        cells.push({ row, col, value: grid[row][col] })
      }
      markDuplicates(cells)
    }
  }
  return keys
}

function copyGrid(grid: SudokuGrid) {
  return grid.map((row) => [...row])
}

function cleanWithSudokuConstraints(grid: SudokuGrid, entries: RecognizedEntry[], reviewCells: SudokuReviewCell[], warnings: string[]) {
  const confidence = new Map(entries.map((entry) => [`${entry.row}-${entry.col}`, entry.confidence]))
  let removedConflicts = 0

  while (true) {
    const conflicts = conflictKeys(grid)
    if (!conflicts.size) break
    const weakest = [...conflicts]
      .map((key) => ({ key, confidence: confidence.get(key) ?? 0 }))
      .sort((a, b) => a.confidence - b.confidence)[0]
    if (!weakest) break
    const [row, col] = weakest.key.split('-').map(Number)
    grid[row][col] = 0
    removedConflicts += 1
    reviewCells.push({ row, col, confidence: weakest.confidence, reason: 'conflict-removed' })
  }

  if (removedConflicts) warnings.push(`${removedConflicts} OCR value${removedConflicts === 1 ? '' : 's'} conflicted with Sudoku rules and were cleared for review.`)

  let solverRemoved = 0
  for (let pass = 0; pass < 3 && entries.length >= 17 && !solveSudoku(grid); pass += 1) {
    const active = entries
      .filter((entry) => grid[entry.row][entry.col] !== 0)
      .sort((a, b) => a.confidence - b.confidence)
      .slice(0, 12)

    let fixed = false
    for (const entry of active) {
      const trial = copyGrid(grid)
      trial[entry.row][entry.col] = 0
      if (solveSudoku(trial)) {
        grid[entry.row][entry.col] = 0
        reviewCells.push({ row: entry.row, col: entry.col, confidence: entry.confidence, reason: 'solver-removed' })
        solverRemoved += 1
        fixed = true
        break
      }
    }
    if (!fixed) break
  }
  if (solverRemoved) warnings.push(`${solverRemoved} additional OCR value${solverRemoved === 1 ? '' : 's'} made the puzzle unsatisfiable and were cleared for review.`)
}

async function recognizeCandidates(candidates: CellCandidate[], onProgress?: (progress: SudokuScanProgress) => void) {
  const worker = await createWorker('eng')
  const entries: RecognizedEntry[] = []
  const reviewCells: SudokuReviewCell[] = []

  try {
    await worker.setParameters({
      tessedit_char_whitelist: '123456789',
      tessedit_pageseg_mode: PSM.SINGLE_CHAR,
      preserve_interword_spaces: '0',
      user_defined_dpi: '300',
    })

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i]
      onProgress?.({
        phase: 'ocr',
        current: i + 1,
        total: candidates.length,
        message: `Reading digit ${i + 1} of ${candidates.length}…`,
      })

      const first = await worker.recognize(candidate.canvas)
      let digit = cleanDigit(first.data.text)
      let confidence = Number(first.data.confidence || 0)

      if ((!digit || confidence < 55) && candidate.alternate) {
        const second = await worker.recognize(candidate.alternate)
        const secondDigit = cleanDigit(second.data.text)
        const secondConfidence = Number(second.data.confidence || 0)
        if (secondDigit && (!digit || secondConfidence > confidence)) {
          digit = secondDigit
          confidence = secondConfidence
        }
      }

      if (!digit || confidence < 18) {
        reviewCells.push({ row: candidate.row, col: candidate.col, confidence, reason: 'unreadable' })
        continue
      }

      entries.push({ row: candidate.row, col: candidate.col, digit, confidence })
      if (confidence < 48) reviewCells.push({ row: candidate.row, col: candidate.col, confidence, reason: 'low-confidence' })
    }
  } finally {
    await worker.terminate()
  }

  return { entries, reviewCells }
}

export async function recognizeSudoku(
  dataUrl: string,
  onProgress?: (progress: SudokuScanProgress) => void,
): Promise<SudokuScanResult> {
  onProgress?.({ phase: 'prepare', message: 'Detecting and straightening the Sudoku grid…' })
  const img = await loadImage(dataUrl)
  const warnings: string[] = []
  let boardMethod: SudokuScanResult['boardMethod'] = 'grid-lines'
  let board = { x: 0, y: 0, size: 0 }
  let candidates: CellCandidate[] = []

  try {
    const cv = await getOpenCv()
    const detected = detectPerspectiveBoard(cv, img)
    if (detected) {
      boardMethod = 'perspective'
      const bounds = detected.bounds
      board = {
        x: Math.round(bounds.x),
        y: Math.round(bounds.y),
        size: Math.round(Math.min(bounds.width, bounds.height)),
      }
      try {
        for (let row = 0; row < 9; row += 1) {
          for (let col = 0; col < 9; col += 1) {
            const candidate = extractCellCandidate(cv, detected.gray, row, col)
            if (candidate) candidates.push(candidate)
          }
        }
      } finally {
        detected.gray.delete()
      }
    } else {
      warnings.push('Perspective detection was uncertain, so grid-line fallback was used. A tighter crop may improve recognition.')
    }
  } catch {
    warnings.push('Perspective correction could not start, so the lightweight grid-line scanner was used.')
  }

  if (candidates.length > 0 && candidates.length < 10) {
    warnings.push(`Perspective correction found only ${candidates.length} likely digit cells, so grid-line fallback was tried instead.`)
    candidates = []
    boardMethod = 'grid-lines'
  }

  if (!candidates.length) {
    const gray = imageToGray(img)
    const fallback = projectionFallback(gray)
    const fallbackBoard = fallback || (() => {
      const size = Math.round(Math.min(gray.width, gray.height) * 0.9)
      return { x: Math.round((gray.width - size) / 2), y: Math.round((gray.height - size) / 2), size }
    })()
    board = fallbackBoard
    for (let row = 0; row < 9; row += 1) {
      for (let col = 0; col < 9; col += 1) {
        const candidate = fallbackCellCanvas(gray, fallbackBoard, row, col)
        if (candidate) candidates.push(candidate)
      }
    }
  }

  onProgress?.({ phase: 'prepare', message: `Found ${candidates.length} cells that appear to contain digits. Loading OCR…` })

  if (!candidates.length) {
    onProgress?.({ phase: 'done', message: 'No digit cells were detected.' })
    return {
      grid: emptyGrid(),
      confidence: 0,
      detectedCells: 0,
      candidateCells: 0,
      board,
      boardMethod,
      warnings: [...warnings, 'No digit-shaped cells were found. Crop closer to the Sudoku board and try again.'],
      reviewCells: [],
    }
  }

  const { entries, reviewCells } = await recognizeCandidates(candidates, onProgress)
  const grid = emptyGrid()
  for (const entry of entries) grid[entry.row][entry.col] = entry.digit

  cleanWithSudokuConstraints(grid, entries, reviewCells, warnings)

  const activeEntries = entries.filter((entry) => grid[entry.row][entry.col] !== 0)
  const detectedCells = activeEntries.length
  const confidence = detectedCells
    ? activeEntries.reduce((total, entry) => total + entry.confidence, 0) / detectedCells
    : 0

  const unreadable = reviewCells.filter((cell) => cell.reason === 'unreadable').length
  const lowConfidence = reviewCells.filter((cell) => cell.reason === 'low-confidence').length
  if (unreadable) warnings.push(`${unreadable} cell${unreadable === 1 ? '' : 's'} appeared to contain a digit but could not be read reliably.`)
  if (lowConfidence) warnings.push(`${lowConfidence} recognized digit${lowConfidence === 1 ? '' : 's'} should be visually checked.`)
  if (detectedCells < 17) warnings.push('Fewer than 17 reliable givens remain. Verify the image crop and highlighted review cells before solving.')

  onProgress?.({ phase: 'done', message: `Recognized ${detectedCells} of ${candidates.length} likely digit cells.` })
  return {
    grid,
    confidence,
    detectedCells,
    candidateCells: candidates.length,
    board,
    boardMethod,
    warnings,
    reviewCells,
  }
}
