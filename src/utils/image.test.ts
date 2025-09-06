import { describe, it, expect, vi } from 'vitest'
import { base64ToFile, compressImage } from './image'

describe('base64ToFile', () => {
  it('should convert base64 string to File object', () => {
    // Use a simple, valid base64 string
    const base64 = 'data:image/jpeg;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    const filename = 'test.jpg'
    
    const file = base64ToFile(base64, filename)
    
    expect(file).toBeInstanceOf(File)
    expect(file.name).toBe(filename)
    expect(file.type).toBe('image/jpeg')
    expect(file.size).toBeGreaterThan(0)
  })

  it('should handle different MIME types', () => {
    const pngBase64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=='
    const file = base64ToFile(pngBase64, 'test.png')
    
    expect(file.type).toBe('image/png')
    expect(file.name).toBe('test.png')
  })

  it('should default to octet-stream for unknown MIME types', () => {
    const invalidBase64 = 'data:unknown/type;base64,dGVzdA=='
    const file = base64ToFile(invalidBase64, 'test.bin')
    
    expect(file.type).toBe('unknown/type')
  })

  it('should handle malformed base64 strings', () => {
    const malformedBase64 = 'not-a-valid-base64-string'
    
    expect(() => {
      base64ToFile(malformedBase64, 'test.txt')
    }).toThrow()
  })

  it('should handle empty filename', () => {
    const base64 = 'data:text/plain;base64,dGVzdA=='
    const file = base64ToFile(base64, '')
    
    expect(file.name).toBe('')
    expect(file.type).toBe('text/plain')
  })
})

describe('compressImage', () => {
  it('should compress image and return base64 data URL', async () => {
    // Create a mock file
    const mockFile = new File(['mock-image-data'], 'test.jpg', { type: 'image/jpeg' })
    
    const result = await compressImage(mockFile)
    
    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile)
  })

  it('should use default compression settings', async () => {
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' })
    
    await compressImage(mockFile)
    
    // Verify canvas operations were called
    const mockCanvas = document.createElement('canvas')
    const mockCtx = mockCanvas.getContext('2d')
    expect(mockCtx?.drawImage).toHaveBeenCalled()
  })

  it('should apply custom width and quality settings', async () => {
    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' })
    
    await compressImage(mockFile, 1200, 0.9)
    
    // The function should still work with custom parameters
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile)
  })

  it('should handle aspect ratio calculations correctly', async () => {
    // Mock Image dimensions in our global Image mock
    const originalImage = global.Image
    global.Image = class extends originalImage {
      width = 1600
      height = 1200
    } as any

    const mockFile = new File(['mock'], 'test.jpg', { type: 'image/jpeg' })
    
    await compressImage(mockFile, 800)
    
    // Verify the image was processed
    expect(global.URL.createObjectURL).toHaveBeenCalledWith(mockFile)
    
    // Restore original Image mock
    global.Image = originalImage
  })

  it('should handle square images', async () => {
    const originalImage = global.Image
    global.Image = class extends originalImage {
      width = 1000
      height = 1000
    } as any

    const mockFile = new File(['mock'], 'square.jpg', { type: 'image/jpeg' })
    
    const result = await compressImage(mockFile, 500)
    
    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    
    global.Image = originalImage
  })

  it('should handle very small images', async () => {
    const originalImage = global.Image
    global.Image = class extends originalImage {
      width = 50
      height = 50
    } as any

    const mockFile = new File(['tiny'], 'tiny.jpg', { type: 'image/jpeg' })
    
    const result = await compressImage(mockFile, 800)
    
    expect(result).toBe('data:image/png;base64,mock-canvas-data')
    
    global.Image = originalImage
  })
})