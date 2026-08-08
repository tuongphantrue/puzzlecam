import { createWorker, PSM } from 'tesseract.js'
import type { SudokuGrid } from './solver'

export interface SudokuScanProgress {
  phase: 'prepare' | 'ocr' | 'done'
  current?: number
  total?: number
  message: string
}

export interface SudokuScanResult {
  grid: SudokuGrid
  confidence: number
  detectedCells: number
  board: { x: number; y: number; size: number }
  warnings: string[]
}

type GrayImage = {
  width: number
  height: number
  data: Uint8ClampedArray
}

const emptyGrid = (): SudokuGrid => Array.from({ length: 9 }, () => Array(9).fill(0))

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

async function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return await new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not read the selected image.'))
    img.src = dataUrl
  })
}

function imageToGray(img: HTMLImageElement, maxSide = 1400): GrayImage {
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

function projection(gray: GrayImage, threshold: number) {
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
  return { x, y }
}

function smooth(values: Float32Array, radius: number) {
  const out = new Float32Array(values.length)
  let running = 0
  for (let i = 0; i < values.length; i += 1) {
    running += values[i]
    if (i - radius - 1 >= 0) running -= values[i - radius - 1]
    const start = Math.max(0, i - radius)
    out[i] = running / (i - start + 1)
  }
  return out
}

function strongLineGroups(values: Float32Array, minValue: number) {
  const groups: Array<{ start: number; end: number; center: number; score: number }> = []
  let start = -1
  let score = 0
  let weighted = 0

  const finish = (end: number) => {
    if (start < 0) return
    groups.push({
      start,
      end,
      center: weighted / Math.max(score, 1),
      score,
    })
    start = -1
    score = 0
    weighted = 0
  }

  for (let i = 0; i < values.length; i += 1) {
    if (values[i] >= minValue) {
      if (start < 0) start = i
      score += values[i]
      weighted += values[i] * i
    } else {
      finish(i - 1)
    }
  }
  finish(values.length - 1)
  return groups
}

function detectBoard(gray: GrayImage) {
  const threshold = clamp(otsuThreshold(gray.data) + 22, 80, 210)
  const { x, y } = projection(gray, threshold)
  const sx = smooth(x, Math.max(1, Math.round(gray.width * 0.002)))
  const sy = smooth(y, Math.max(1, Math.round(gray.height * 0.002)))

  const xGroups = strongLineGroups(sx, gray.height * 0.24)
  const yGroups = strongLineGroups(sy, gray.width * 0.24)

  const getOuter = (groups: ReturnType<typeof strongLineGroups>, size: number) => {
    const usable = groups.filter((g) => g.center > size * 0.03 && g.center < size * 0.97)
    if (usable.length < 2) return null
    return [usable[0].center, usable[usable.length - 1].center] as const
  }

  const xb = getOuter(xGroups, gray.width)
  const yb = getOuter(yGroups, gray.height)

  if (xb && yb) {
    const detectedWidth = xb[1] - xb[0]
    const detectedHeight = yb[1] - yb[0]
    const ratio = detectedWidth / Math.max(1, detectedHeight)
    if (ratio > 0.72 && ratio < 1.38 && detectedWidth > gray.width * 0.28 && detectedHeight > gray.height * 0.28) {
      const size = Math.min(detectedWidth, detectedHeight)
      const cx = (xb[0] + xb[1]) / 2
      const cy = (yb[0] + yb[1]) / 2
      return {
        x: Math.round(clamp(cx - size / 2, 0, gray.width - size)),
        y: Math.round(clamp(cy - size / 2, 0, gray.height - size)),
        size: Math.round(size),
        threshold,
        fallback: false,
      }
    }
  }

  const size = Math.round(Math.min(gray.width, gray.height) * 0.88)
  return {
    x: Math.round((gray.width - size) / 2),
    y: Math.round((gray.height - size) / 2),
    size,
    threshold,
    fallback: true,
  }
}

function makeCellCanvas(gray: GrayImage, board: { x: number; y: number; size: number }, row: number, col: number) {
  const cell = board.size / 9
  const pad = Math.max(3, cell * 0.16)
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
  const threshold = clamp(otsuThreshold(Uint8ClampedArray.from(pixels)) + 12, 70, 210)
  let dark = 0
  for (const value of pixels) if (value < threshold) dark += 1
  const inkRatio = dark / Math.max(1, pixels.length)

  // Most empty Sudoku cells contain almost no ink after removing grid borders.
  if (inkRatio < 0.018) return { canvas: null, inkRatio }

  const target = 96
  const canvas = document.createElement('canvas')
  canvas.width = target
  canvas.height = target
  const ctx = canvas.getContext('2d')
  if (!ctx) return { canvas: null, inkRatio }
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, target, target)

  const inner = 76
  const tmp = document.createElement('canvas')
  tmp.width = width
  tmp.height = height
  const tctx = tmp.getContext('2d')
  if (!tctx) return { canvas: null, inkRatio }
  const image = tctx.createImageData(width, height)
  let p = 0
  for (let y = y0; y < y1; y += 1) {
    const offset = y * gray.width
    for (let x = x0; x < x1; x += 1) {
      const black = gray.data[offset + x] < threshold
      const value = black ? 0 : 255
      image.data[p++] = value
      image.data[p++] = value
      image.data[p++] = value
      image.data[p++] = 255
    }
  }
  tctx.putImageData(image, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(tmp, 10, 10, inner, inner)
  return { canvas, inkRatio }
}

function cleanDigit(text: string) {
  const match = text.replace(/[^1-9]/g, '').match(/[1-9]/)
  return match ? Number(match[0]) : 0
}

export async function recognizeSudoku(
  dataUrl: string,
  onProgress?: (progress: SudokuScanProgress) => void,
): Promise<SudokuScanResult> {
  onProgress?.({ phase: 'prepare', message: 'Finding the Sudoku board…' })
  const img = await loadImage(dataUrl)
  const gray = imageToGray(img)
  const board = detectBoard(gray)
  const grid = emptyGrid()
  const warnings: string[] = []
  if (board.fallback) warnings.push('Board edges were estimated. For best OCR, keep the Sudoku square straight and fill most of the frame.')

  const candidates: Array<{ row: number; col: number; canvas: HTMLCanvasElement }> = []
  for (let row = 0; row < 9; row += 1) {
    for (let col = 0; col < 9; col += 1) {
      const cell = makeCellCanvas(gray, board, row, col)
      if (cell.canvas) candidates.push({ row, col, canvas: cell.canvas })
    }
  }

  onProgress?.({ phase: 'prepare', message: `Found ${candidates.length} cells that may contain digits. Loading OCR…` })

  const worker = await createWorker('eng')
  try {
    await worker.setParameters({
      tessedit_char_whitelist: '123456789',
      tessedit_pageseg_mode: PSM.SINGLE_CHAR,
      preserve_interword_spaces: '0',
    })

    let confidenceTotal = 0
    let confidenceCount = 0
    let detectedCells = 0

    for (let i = 0; i < candidates.length; i += 1) {
      const candidate = candidates[i]
      onProgress?.({
        phase: 'ocr',
        current: i + 1,
        total: candidates.length,
        message: `Reading digit ${i + 1} of ${candidates.length}…`,
      })
      const result = await worker.recognize(candidate.canvas)
      const digit = cleanDigit(result.data.text)
      const confidence = Number(result.data.confidence || 0)
      if (digit && confidence >= 25) {
        grid[candidate.row][candidate.col] = digit
        detectedCells += 1
        confidenceTotal += confidence
        confidenceCount += 1
      }
    }

    const confidence = confidenceCount ? confidenceTotal / confidenceCount : 0
    if (detectedCells < 10) warnings.push('Only a few digits were recognized. Try a closer, brighter, straighter photo.')
    if (confidence < 55 && detectedCells) warnings.push('OCR confidence is low. Check the recognized givens before trusting the solution.')

    onProgress?.({ phase: 'done', message: `Recognized ${detectedCells} digits.` })
    return {
      grid,
      confidence,
      detectedCells,
      board: { x: board.x, y: board.y, size: board.size },
      warnings,
    }
  } finally {
    await worker.terminate()
  }
}
