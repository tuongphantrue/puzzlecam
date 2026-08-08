/**
 * Shared vision contract for future OCR / CV modules.
 *
 * CameraPanel currently produces a data URL. A recognizer can implement this
 * interface and convert that image into a puzzle-specific state. Keeping this
 * boundary small lets OpenCV/ONNX models be lazy-loaded only for the puzzle
 * that needs them.
 */
export interface VisionResult<T> {
  confidence: number
  state: T
  warnings?: string[]
}

export interface VisionRecognizer<T> {
  id: string
  recognize(image: string): Promise<VisionResult<T>>
}

export async function imageDataUrlToBitmap(dataUrl: string): Promise<ImageBitmap> {
  const response = await fetch(dataUrl)
  const blob = await response.blob()
  return createImageBitmap(blob)
}
