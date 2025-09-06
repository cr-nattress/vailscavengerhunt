import { describe, it, expect, vi, beforeEach } from 'vitest'
import { CollageService } from './CollageService'
import { apiClient } from '../services/apiClient'
import * as schemas from '../types/schemas'

// Mock the apiClient
vi.mock('../services/apiClient', () => ({
  apiClient: {
    requestFormData: vi.fn(),
    post: vi.fn()
  }
}))

// Mock the schema validation
vi.mock('../types/schemas', async () => {
  const actual = await vi.importActual('../types/schemas')
  return {
    ...actual,
    validateSchema: vi.fn((schema, data, context) => data) // Return data as-is for tests
  }
})

describe('CollageService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset console methods
    vi.spyOn(console, 'log').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  const createMockFile = (name: string, type = 'image/jpeg', size = 1000) => {
    return new File(['mock-file-content'], name, { type, lastModified: Date.now() })
  }

  describe('createCollage', () => {
    it('should create a collage successfully', async () => {
      const mockFiles = [createMockFile('photo1.jpg'), createMockFile('photo2.jpg')]
      const mockTitles = ['Location 1', 'Location 2']
      const mockResponse = { collageUrl: 'https://cloudinary.com/mock-collage.jpg' }

      vi.mocked(apiClient.requestFormData).mockResolvedValue(mockResponse)

      const result = await CollageService.createCollage(mockFiles, mockTitles)

      expect(result).toBe('https://cloudinary.com/mock-collage.jpg')
      expect(apiClient.requestFormData).toHaveBeenCalledWith('/collage', expect.any(FormData), {
        timeout: 60000,
        retryAttempts: 2
      })
    })

    it('should throw error when no files provided', async () => {
      await expect(
        CollageService.createCollage([], ['title'])
      ).rejects.toThrow('No files provided')
    })

    it('should throw error when file and title counts mismatch', async () => {
      const mockFiles = [createMockFile('photo1.jpg')]
      const mockTitles = ['Title 1', 'Title 2']

      await expect(
        CollageService.createCollage(mockFiles, mockTitles)
      ).rejects.toThrow('Number of titles must match number of files')
    })

    it('should validate file types and reject non-images', async () => {
      const mockFiles = [
        createMockFile('photo1.jpg', 'image/jpeg'),
        createMockFile('document.pdf', 'application/pdf')
      ]
      const mockTitles = ['Photo', 'Document']

      await expect(
        CollageService.createCollage(mockFiles, mockTitles)
      ).rejects.toThrow('All files must be images')
    })

    it('should include metadata when provided', async () => {
      const mockFiles = [createMockFile('photo1.jpg')]
      const mockTitles = ['Location 1']
      const mockMetadata = {
        dateISO: '2023-01-01T00:00:00Z',
        locationSlug: 'vail-village',
        teamSlug: 'team-alpha',
        sessionId: 'session-123'
      }
      const mockResponse = { collageUrl: 'https://cloudinary.com/mock-collage.jpg' }

      vi.mocked(apiClient.requestFormData).mockResolvedValue(mockResponse)

      await CollageService.createCollage(mockFiles, mockTitles, mockMetadata)

      expect(apiClient.requestFormData).toHaveBeenCalledWith('/collage', expect.any(FormData), {
        timeout: 60000,
        retryAttempts: 2
      })

      // Check that FormData was constructed properly
      const formDataArg = vi.mocked(apiClient.requestFormData).mock.calls[0][1] as FormData
      expect(formDataArg).toBeInstanceOf(FormData)
    })

    it('should handle API client errors', async () => {
      const mockFiles = [createMockFile('photo1.jpg')]
      const mockTitles = ['Location 1']
      const apiError = new Error('API request failed')

      vi.mocked(apiClient.requestFormData).mockRejectedValue(apiError)

      await expect(
        CollageService.createCollage(mockFiles, mockTitles)
      ).rejects.toThrow('API request failed')
    })
  })

  describe('createCollageWithDetails', () => {
    it('should create collage and return full response', async () => {
      const mockFiles = [createMockFile('photo1.jpg')]
      const mockTitles = ['Location 1']
      const mockResponse = {
        collageUrl: 'https://cloudinary.com/mock-collage.jpg',
        uploads: [{ publicId: 'abc123', secureUrl: 'https://cloudinary.com/photo1.jpg', title: 'Location 1' }],
        metadata: { uploadedAt: '2023-01-01T00:00:00Z' }
      }

      vi.mocked(apiClient.requestFormData).mockResolvedValue(mockResponse)

      const result = await CollageService.createCollageWithDetails(mockFiles, mockTitles)

      expect(result).toEqual(mockResponse)
      expect(apiClient.requestFormData).toHaveBeenCalledWith('/collage', expect.any(FormData), {
        timeout: 60000,
        retryAttempts: 2
      })
    })

    it('should throw error for empty files array', async () => {
      await expect(
        CollageService.createCollageWithDetails([], ['title'])
      ).rejects.toThrow('No files provided')
    })

    it('should throw error for mismatched arrays', async () => {
      const mockFiles = [createMockFile('photo1.jpg')]
      const mockTitles = ['Title 1', 'Title 2']

      await expect(
        CollageService.createCollageWithDetails(mockFiles, mockTitles)
      ).rejects.toThrow('Number of titles must match number of files')
    })

    it('should validate file types', async () => {
      const mockFiles = [createMockFile('document.txt', 'text/plain')]
      const mockTitles = ['Document']

      await expect(
        CollageService.createCollageWithDetails(mockFiles, mockTitles)
      ).rejects.toThrow('All files must be images')
    })
  })

  describe('createCollageFromIds', () => {
    it('should create collage from public IDs', async () => {
      const mockPublicIds = ['id1', 'id2', 'id3']
      const mockResponse = {
        collageUrl: 'https://cloudinary.com/collage-from-ids.jpg',
        publicIds: mockPublicIds
      }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      const result = await CollageService.createCollageFromIds(mockPublicIds)

      expect(result).toEqual(mockResponse)
      expect(apiClient.post).toHaveBeenCalledWith('/collage-from-ids', {
        publicIds: mockPublicIds,
        metadata: undefined
      }, {
        timeout: 30000,
        retryAttempts: 2
      })
    })

    it('should include metadata when provided', async () => {
      const mockPublicIds = ['id1', 'id2']
      const mockMetadata = {
        dateISO: '2023-01-01T00:00:00Z',
        locationSlug: 'vail-village',
        teamSlug: 'team-alpha',
        sessionId: 'session-123'
      }
      const mockResponse = { collageUrl: 'https://cloudinary.com/collage.jpg', publicIds: mockPublicIds }

      vi.mocked(apiClient.post).mockResolvedValue(mockResponse)

      await CollageService.createCollageFromIds(mockPublicIds, mockMetadata)

      expect(apiClient.post).toHaveBeenCalledWith('/collage-from-ids', {
        publicIds: mockPublicIds,
        metadata: mockMetadata
      }, {
        timeout: 30000,
        retryAttempts: 2
      })
    })

    it('should throw error for empty public IDs array', async () => {
      await expect(
        CollageService.createCollageFromIds([])
      ).rejects.toThrow('No public IDs provided')
    })

    it('should handle API errors', async () => {
      const mockPublicIds = ['id1']
      const apiError = new Error('Failed to create collage from IDs')

      vi.mocked(apiClient.post).mockRejectedValue(apiError)

      await expect(
        CollageService.createCollageFromIds(mockPublicIds)
      ).rejects.toThrow('Failed to create collage from IDs')
    })
  })

  describe('resizeImage', () => {
    it('should return original file when already small enough', async () => {
      const mockFile = createMockFile('small.jpg', 'image/jpeg', 500)
      
      // Mock Image to have small dimensions
      const originalImage = global.Image
      global.Image = class extends originalImage {
        width = 800
        height = 600
      } as any

      const result = await CollageService.resizeImage(mockFile, 1600)

      expect(result).toBe(mockFile) // Should return the same file
      
      global.Image = originalImage
    })

    it('should resize large images', async () => {
      const mockFile = createMockFile('large.jpg', 'image/jpeg', 2000)
      
      // Mock Image to have large dimensions
      const originalImage = global.Image
      global.Image = class extends originalImage {
        width = 3000
        height = 2000
      } as any

      // Mock canvas toBlob
      const mockBlob = new Blob(['resized-content'], { type: 'image/jpeg' })
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        callback(mockBlob)
      })

      const result = await CollageService.resizeImage(mockFile, 1600, 0.8)

      expect(result).toBeInstanceOf(File)
      expect(result.name).toBe('large.jpg')
      expect(result.type).toBe('image/jpeg')
      
      global.Image = originalImage
    })

    it('should handle canvas toBlob returning null', async () => {
      const mockFile = createMockFile('image.jpg', 'image/jpeg', 1000)
      
      const originalImage = global.Image
      global.Image = class extends originalImage {
        width = 2000
        height = 1500
      } as any

      // Mock canvas toBlob to return null
      HTMLCanvasElement.prototype.toBlob = vi.fn((callback) => {
        callback(null)
      })

      const result = await CollageService.resizeImage(mockFile, 1600)

      expect(result).toBe(mockFile) // Should return original file when blob creation fails
      
      global.Image = originalImage
    })

    it('should use correct quality and maxWidth parameters', async () => {
      const mockFile = createMockFile('image.jpg', 'image/jpeg', 1000)
      
      const originalImage = global.Image
      global.Image = class extends originalImage {
        width = 2000
        height = 1500
      } as any

      const mockBlob = new Blob(['resized'], { type: 'image/jpeg' })
      const toBlobSpy = vi.fn((callback) => callback(mockBlob))
      HTMLCanvasElement.prototype.toBlob = toBlobSpy

      await CollageService.resizeImage(mockFile, 800, 0.9)

      expect(toBlobSpy).toHaveBeenCalledWith(expect.any(Function), 'image/jpeg', 0.9)
      
      global.Image = originalImage
    })
  })

  describe('resizeImages', () => {
    it('should resize multiple images', async () => {
      const mockFiles = [
        createMockFile('image1.jpg'),
        createMockFile('image2.jpg'),
        createMockFile('image3.jpg')
      ]

      // Mock the resizeImage method to return modified files
      const resizeImageSpy = vi.spyOn(CollageService, 'resizeImage').mockImplementation(
        async (file) => new File(['resized'], file.name, { type: 'image/jpeg' })
      )

      const results = await CollageService.resizeImages(mockFiles, 1200, 0.7)

      expect(results).toHaveLength(3)
      expect(resizeImageSpy).toHaveBeenCalledTimes(3)
      expect(resizeImageSpy).toHaveBeenCalledWith(mockFiles[0], 1200, 0.7)
      expect(resizeImageSpy).toHaveBeenCalledWith(mockFiles[1], 1200, 0.7)
      expect(resizeImageSpy).toHaveBeenCalledWith(mockFiles[2], 1200, 0.7)

      resizeImageSpy.mockRestore()
    })

    it('should handle empty files array', async () => {
      const results = await CollageService.resizeImages([])
      expect(results).toEqual([])
    })

    it('should use default parameters', async () => {
      const mockFiles = [createMockFile('image.jpg')]
      
      const resizeImageSpy = vi.spyOn(CollageService, 'resizeImage').mockResolvedValue(mockFiles[0])

      await CollageService.resizeImages(mockFiles)

      expect(resizeImageSpy).toHaveBeenCalledWith(mockFiles[0], 1600, 0.8)

      resizeImageSpy.mockRestore()
    })

    it('should handle resize failures gracefully', async () => {
      const mockFiles = [createMockFile('image.jpg')]
      
      const resizeImageSpy = vi.spyOn(CollageService, 'resizeImage').mockRejectedValue(new Error('Resize failed'))

      await expect(CollageService.resizeImages(mockFiles)).rejects.toThrow('Resize failed')

      resizeImageSpy.mockRestore()
    })
  })
})