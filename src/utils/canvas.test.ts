import { describe, it, expect, vi, beforeEach } from 'vitest'
import { buildStorybook } from './canvas'
import { mockCanvasContext } from '../../test/setup'

describe('buildStorybook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return null for empty arrays', async () => {
    const result = await buildStorybook([], [])
    expect(result).toBeNull()
  })

  it('should handle single image and title', async () => {
    const photos = ['data:image/jpeg;base64,mock-data']
    const titles = ['Test Image']

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(mockCanvasContext.drawImage).toHaveBeenCalled()
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('1. Test Image', expect.any(Number), expect.any(Number))
  })

  it('should handle multiple images and titles', async () => {
    const photos = [
      'data:image/jpeg;base64,image1',
      'data:image/jpeg;base64,image2',
      'data:image/jpeg;base64,image3'
    ]
    const titles = ['First', 'Second', 'Third']

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(mockCanvasContext.drawImage).toHaveBeenCalledTimes(3)
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('1. First', expect.any(Number), expect.any(Number))
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('2. Second', expect.any(Number), expect.any(Number))
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('3. Third', expect.any(Number), expect.any(Number))
  })

  it('should handle mismatched array lengths by using minimum length', async () => {
    const photos = ['data:image/jpeg;base64,image1', 'data:image/jpeg;base64,image2']
    const titles = ['First'] // Only one title for two photos

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    // Should only process 1 image (minimum of 2 photos and 1 title)
    expect(mockCanvasContext.drawImage).toHaveBeenCalledTimes(1)
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('1. First', expect.any(Number), expect.any(Number))
  })

  it('should set up canvas dimensions correctly', async () => {
    const photos = ['data:image/jpeg;base64,mock']
    const titles = ['Test']

    await buildStorybook(photos, titles)

    // Verify canvas was created and context methods were called
    expect(mockCanvasContext.fillStyle).toBeTruthy()
    expect(mockCanvasContext.fillRect).toHaveBeenCalled()
  })

  it('should handle grid layout for multiple images', async () => {
    // Test with 4 images to verify grid calculation (should be 2x2)
    const photos = Array(4).fill('data:image/jpeg;base64,mock')
    const titles = ['First', 'Second', 'Third', 'Fourth']

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(mockCanvasContext.drawImage).toHaveBeenCalledTimes(4)
  })

  it('should apply proper styling and formatting', async () => {
    const photos = ['data:image/jpeg;base64,mock']
    const titles = ['Test Photo']

    await buildStorybook(photos, titles)

    // Verify background was filled
    expect(mockCanvasContext.fillStyle).toBe('#0f172a') // Text color
    expect(mockCanvasContext.fillRect).toHaveBeenCalled()
    
    // Verify font was set
    expect(mockCanvasContext.font).toBe('600 18px system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial')
    expect(mockCanvasContext.textBaseline).toBe('top')
  })

  it('should handle large number of images (grid constraint)', async () => {
    // Test with 6 images (should create 2 rows of 3)
    const photos = Array(6).fill('data:image/jpeg;base64,mock')
    const titles = Array(6).fill(0).map((_, i) => `Image ${i + 1}`)

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(mockCanvasContext.drawImage).toHaveBeenCalledTimes(6)
    expect(mockCanvasContext.fillText).toHaveBeenCalledTimes(6)
  })

  it('should handle image loading errors gracefully', async () => {
    // Mock Image to simulate load error
    const originalImage = global.Image
    global.Image = class {
      onload: (() => void) | null = null
      onerror: (() => void) | null = null
      src = ''
      crossOrigin = ''
      width = 100
      height = 100

      constructor() {
        // Simulate error after a tick
        setTimeout(() => {
          if (this.onerror) {
            this.onerror()
          }
        }, 0)
      }
    } as any

    const photos = ['invalid-url']
    const titles = ['Test']

    await expect(buildStorybook(photos, titles)).rejects.toThrow()

    // Restore original Image mock
    global.Image = originalImage
  })

  it('should handle real-world scavenger hunt data', async () => {
    const photos = [
      'https://res.cloudinary.com/mock/image/upload/clock-tower.jpg',
      'https://res.cloudinary.com/mock/image/upload/gore-creek.jpg'
    ]
    const titles = ['Clock Tower', 'Gore Creek Waterfront']

    const result = await buildStorybook(photos, titles)

    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('1. Clock Tower', expect.any(Number), expect.any(Number))
    expect(mockCanvasContext.fillText).toHaveBeenCalledWith('2. Gore Creek Waterfront', expect.any(Number), expect.any(Number))
  })
})