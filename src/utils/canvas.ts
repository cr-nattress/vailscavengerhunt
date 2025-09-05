/**
 * Build a shareable collage ("storybook") from images + titles
 */
export const buildStorybook = async (photos: string[], titles: string[]): Promise<string | null> => {
  const n = Math.min(photos.length, titles.length)
  if (n === 0) return null

  // Grid sizing: up to 3 across for this preview use-case
  const cols = Math.min(3, n)
  const rows = Math.ceil(n / cols)
  const padding = 24
  const captionH = 56
  const tile = 560 // image square size per tile
  const width = padding + cols * (tile + padding)
  const height = padding + rows * (tile + captionH + padding)

  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D
  canvas.width = width
  canvas.height = height

  // Background
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // Helper: load image
  const load = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })

  // Helper: draw image with cover fit into a rounded rect
  const drawCover = (image: HTMLImageElement, x: number, y: number, size: number) => {
    const iw = image.width, ih = image.height
    const scale = Math.max(size / iw, size / ih)
    const dw = iw * scale, dh = ih * scale
    const dx = x + (size - dw) / 2
    const dy = y + (size - dh) / 2

    // Rounded clip
    const r = 16
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.arcTo(x + size, y, x + size, y + size, r)
    ctx.arcTo(x + size, y + size, x, y + size, r)
    ctx.arcTo(x, y + size, x, y, r)
    ctx.arcTo(x, y, x + size, y, r)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(image, dx, dy, dw, dh)
    ctx.restore()

    // Border
    ctx.strokeStyle = '#e2e8f0'
    ctx.lineWidth = 2
    ctx.strokeRect(x + 1, y + 1, size - 2, size - 2)
  }

  // Load images sequentially to keep memory lower
  const images: HTMLImageElement[] = []
  for (let i = 0; i < n; i++) images.push(await load(photos[i]))

  // Draw tiles
  ctx.fillStyle = '#0f172a' // slate-900 for text
  ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
  ctx.textBaseline = 'top'

  for (let i = 0; i < n; i++) {
    const col = i % cols
    const row = Math.floor(i / cols)
    const x = padding + col * (tile + padding)
    const y = padding + row * (tile + captionH + padding)

    drawCover(images[i], x, y, tile)

    // Caption line
    const title = titles[i]
    const label = `${i + 1}. ${title}`
    ctx.fillStyle = '#0f172a'
    ctx.font = '600 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial'
    ctx.fillText(label, x + 8, y + tile + 12)
  }

  return canvas.toDataURL('image/png')
}