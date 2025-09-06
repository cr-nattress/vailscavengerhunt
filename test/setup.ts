import { vi } from 'vitest'
import '@testing-library/jest-dom'

// Mock global URL.createObjectURL for file/blob testing
global.URL.createObjectURL = vi.fn(() => 'blob:mock-url')
global.URL.revokeObjectURL = vi.fn()

// Mock HTMLCanvasElement and its 2D context for canvas operations
const mockCanvasContext = {
  drawImage: vi.fn(),
  clearRect: vi.fn(),
  fillRect: vi.fn(),
  fillText: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  arcTo: vi.fn(),
  closePath: vi.fn(),
  clip: vi.fn(),
  strokeRect: vi.fn(),
  toDataURL: vi.fn(() => 'data:image/png;base64,mock-canvas-data'),
  getImageData: vi.fn(() => ({
    data: new Uint8ClampedArray(4),
    width: 1,
    height: 1
  })),
  putImageData: vi.fn(),
  canvas: {
    width: 100,
    height: 100
  },
  fillStyle: '#ffffff',
  strokeStyle: '#000000',
  lineWidth: 1,
  font: 'Arial',
  textBaseline: 'alphabetic'
}

HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === '2d') {
    return mockCanvasContext as any
  }
  return null
})

HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/png;base64,mock-canvas-data')

// Mock navigator.clipboard for clipboard testing
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('mock-text'))
  },
  writable: true
})

// Mock navigator.share for sharing functionality
Object.defineProperty(navigator, 'share', {
  value: vi.fn(() => Promise.resolve()),
  writable: true
})

// Mock global fetch by default - individual tests can override
global.fetch = vi.fn()

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true
})

// Mock window.location
Object.defineProperty(window, 'location', {
  value: {
    href: 'http://localhost:3000',
    origin: 'http://localhost:3000',
    hostname: 'localhost',
    port: '3000',
    pathname: '/',
    search: '',
    hash: ''
  },
  writable: true
})

// Mock Image constructor for image loading tests
global.Image = class {
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  src = ''
  width = 100
  height = 100

  constructor() {
    // Simulate successful image load after a tick
    setTimeout(() => {
      if (this.onload) {
        this.onload()
      }
    }, 0)
  }
} as any

// Mock FileReader for file operations
global.FileReader = class {
  onload: ((event: any) => void) | null = null
  onerror: (() => void) | null = null
  result: string | ArrayBuffer | null = null

  readAsDataURL(file: Blob) {
    setTimeout(() => {
      this.result = 'data:image/jpeg;base64,mock-file-data'
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any)
      }
    }, 0)
  }

  readAsText(file: Blob) {
    setTimeout(() => {
      this.result = 'mock-text-content'
      if (this.onload) {
        this.onload({ target: { result: this.result } } as any)
      }
    }, 0)
  }
} as any

// Export mock context for use in tests
export { mockCanvasContext, localStorageMock }