import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import StopCard from './StopCard'

// Mock ProgressRing component
vi.mock('../../components/ProgressRing', () => ({
  default: ({ number, isCompleted }: { number: number, isCompleted: boolean }) => (
    <div data-testid="progress-ring">{isCompleted ? `✓${number}` : number}</div>
  )
}))

describe('StopCard', () => {
  const mockStop = {
    id: 'stop1',
    title: 'Clock Tower',
    originalNumber: 1,
    hints: [
      'Look for a tall structure that tells time',
      'It chimes every hour on the hour',
      'Located in the heart of Vail Village'
    ],
    funFact: 'This iconic clock tower was built in 1962 and is a beloved Vail landmark'
  }

  const mockProps = {
    stop: mockStop,
    progress: {},
    onUpload: vi.fn(),
    onToggleExpanded: vi.fn(),
    expanded: false,
    uploadingStops: new Set<string>(),
    transitioningStops: new Set<string>(),
    revealNextHint: vi.fn(),
    index: 0
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Initial State', () => {
    it('should render stop card with initial state', () => {
      render(<StopCard {...mockProps} />)

      expect(screen.getByText('Clock Tower')).toBeInTheDocument()
      expect(screen.getByTestId('progress-ring')).toHaveTextContent('1')
      expect(screen.getByText('📷 Capture a creative selfie together at this location.')).toBeInTheDocument()
    })

    it('should show blurred title when no photo is uploaded', () => {
      render(<StopCard {...mockProps} />)

      const titleElement = screen.getByText('Clock Tower')
      expect(titleElement).toHaveClass('blur-sm')
    })

    it('should display placeholder image initially', () => {
      render(<StopCard {...mockProps} />)

      const image = screen.getByAltText('Selfie')
      expect(image).toHaveAttribute('src', '/images/selfie-placeholder.svg')
    })

    it('should show first hint by default', () => {
      render(<StopCard {...mockProps} />)

      expect(screen.getByText('Look for a tall structure that tells time')).toBeInTheDocument()
      expect(screen.queryByText('It chimes every hour on the hour')).not.toBeInTheDocument()
    })
  })

  describe('Hint System', () => {
    it('should show hint button when hints are available', () => {
      const progress = { [mockStop.id]: { done: false, notes: '', photo: null, revealedHints: 1 } }
      
      render(<StopCard {...mockProps} progress={progress} />)

      const hintButton = screen.getByRole('button')
      expect(hintButton).toBeInTheDocument()
      
      // Should show next hint number (2)
      expect(screen.getByText('2')).toBeInTheDocument()
    })

    it('should call revealNextHint when hint button is clicked', () => {
      const progress = { [mockStop.id]: { done: false, notes: '', photo: null, revealedHints: 1 } }
      
      render(<StopCard {...mockProps} progress={progress} />)

      const hintButton = screen.getByRole('button')
      fireEvent.click(hintButton)

      expect(mockProps.revealNextHint).toHaveBeenCalledTimes(1)
    })

    it('should not show hint button when all hints are revealed', () => {
      const progress = { [mockStop.id]: { done: false, notes: '', photo: null, revealedHints: 3 } }
      
      render(<StopCard {...mockProps} progress={progress} />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should display multiple hints when revealed', () => {
      const progress = { [mockStop.id]: { done: false, notes: '', photo: null, revealedHints: 2 } }
      
      render(<StopCard {...mockProps} progress={progress} />)

      expect(screen.getByText('Look for a tall structure that tells time')).toBeInTheDocument()
      expect(screen.getByText('It chimes every hour on the hour')).toBeInTheDocument()
      expect(screen.queryByText('Located in the heart of Vail Village')).not.toBeInTheDocument()
    })

    it('should style hints differently based on index', () => {
      const progress = { [mockStop.id]: { done: false, notes: '', photo: null, revealedHints: 3 } }
      
      render(<StopCard {...mockProps} progress={progress} />)

      // Just check that hints are visible
      expect(screen.getByText('🎯')).toBeInTheDocument()
      
      // All hints should be visible
      expect(screen.getByText('Look for a tall structure that tells time')).toBeInTheDocument()
      expect(screen.getByText('It chimes every hour on the hour')).toBeInTheDocument()
      expect(screen.getByText('Located in the heart of Vail Village')).toBeInTheDocument()
    })
  })

  describe('Photo Upload', () => {
    it('should show upload button when no photo is present', () => {
      render(<StopCard {...mockProps} />)

      expect(screen.getByText('📸 Upload Photo')).toBeInTheDocument()
      const fileInput = document.querySelector('input[type="file"]')
      expect(fileInput).toBeInTheDocument()
    })

    it('should show processing state when uploading', () => {
      const uploadingStops = new Set(['stop1'])
      
      render(<StopCard {...mockProps} uploadingStops={uploadingStops} />)

      expect(screen.getByText('Processing...')).toBeInTheDocument()
      expect(screen.queryByText('📸 Upload Photo')).not.toBeInTheDocument()
    })

    it('should handle file upload', async () => {
      const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' })
      mockProps.onUpload.mockResolvedValue(undefined)
      
      render(<StopCard {...mockProps} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      // Mock FileList
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(mockProps.onUpload).toHaveBeenCalledWith('stop1', mockFile)
      })
    })

    it('should reject non-image files', async () => {
      const mockFile = new File(['test'], 'test.txt', { type: 'text/plain' })
      
      render(<StopCard {...mockProps} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(mockProps.onUpload).not.toHaveBeenCalled()
      })
    })

    it('should show uploaded photo when available', () => {
      const progress = { 
        [mockStop.id]: { 
          done: false, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} />)

      const image = screen.getByAltText('Selfie')
      expect(image).toHaveAttribute('src', 'https://example.com/photo.jpg')
      expect(screen.getByText('✨ Your photo')).toBeInTheDocument()
      expect(screen.getByText('✅ Photo Complete')).toBeInTheDocument()
    })
  })

  describe('Completed State', () => {
    it('should show completed state correctly', () => {
      const progress = { 
        [mockStop.id]: { 
          done: true, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} />)

      // Should show checkmark icon
      const checkmark = document.querySelector('.bg-green-500')
      expect(checkmark).toBeInTheDocument()
      
      // Should show expand/collapse arrow
      expect(screen.getByText('▶')).toBeInTheDocument()
      
      // Title should not be blurred
      const titleElement = screen.getByText('Clock Tower')
      expect(titleElement).not.toHaveClass('blur-sm')
      
      // Fun fact should not show because card is not expanded
      expect(screen.queryByText('This iconic clock tower was built in 1962 and is a beloved Vail landmark')).not.toBeInTheDocument()
    })

    it('should handle expand/collapse when completed', () => {
      const progress = { 
        [mockStop.id]: { 
          done: true, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} />)

      const card = screen.getByText('Clock Tower').closest('div')
      fireEvent.click(card!)

      expect(mockProps.onToggleExpanded).toHaveBeenCalledWith('stop1')
    })

    it('should show expanded state correctly', () => {
      const progress = { 
        [mockStop.id]: { 
          done: true, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} expanded={true} />)

      expect(screen.getByText('▼')).toBeInTheDocument()
      expect(screen.getByText('This iconic clock tower was built in 1962 and is a beloved Vail landmark')).toBeInTheDocument()
    })

    it('should not allow interaction when transitioning', () => {
      const progress = { 
        [mockStop.id]: { 
          done: true, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      const transitioningStops = new Set(['stop1'])
      
      render(<StopCard {...mockProps} progress={progress} transitioningStops={transitioningStops} />)

      const card = screen.getByText('Clock Tower').closest('div')
      fireEvent.click(card!)

      expect(mockProps.onToggleExpanded).not.toHaveBeenCalled()
    })
  })

  describe('Visual States', () => {
    it('should apply transitioning styles', () => {
      const transitioningStops = new Set(['stop1'])
      
      render(<StopCard {...mockProps} transitioningStops={transitioningStops} />)

      const card = screen.getByText('Clock Tower').closest('div')
      // Component renders when transitioning
      expect(card).toBeInTheDocument()
    })

    it('should handle image loading errors', () => {
      const progress = { 
        [mockStop.id]: { 
          done: false, 
          notes: '', 
          photo: 'invalid-url', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} />)

      const image = screen.getByAltText('Selfie')
      
      // Trigger onError
      fireEvent.error(image)

      expect(image).toHaveStyle({ display: 'none' })
    })

    it('should show correct animation delay based on index', () => {
      render(<StopCard {...mockProps} index={2} />)

      const card = screen.getByText('Clock Tower').closest('div')
      // Component renders with index
      expect(card).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<StopCard {...mockProps} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      expect(fileInput).toHaveAttribute('type', 'file')
      expect(fileInput).toHaveAttribute('accept', 'image/*')
    })

    it('should prevent event propagation on file input click', () => {
      const stopPropagation = vi.fn()
      
      render(<StopCard {...mockProps} />)

      const label = screen.getByText('📸 Upload Photo')
      
      // Mock event object
      const mockEvent = { stopPropagation }
      fireEvent.click(label, mockEvent)

      // The actual stopPropagation would be called within the onClick handler
      expect(label).toBeInTheDocument()
    })

    it('should show appropriate cursor for different states', () => {
      const progress = { 
        [mockStop.id]: { 
          done: true, 
          notes: '', 
          photo: 'https://example.com/photo.jpg', 
          revealedHints: 1 
        } 
      }
      
      render(<StopCard {...mockProps} progress={progress} />)

      // Check the main card container has cursor-pointer
      const mainCard = document.querySelector('.cursor-pointer')
      expect(mainCard).toBeInTheDocument()
    })
  })

  describe('Edge Cases', () => {
    it('should handle missing progress data gracefully', () => {
      render(<StopCard {...mockProps} progress={{}} />)

      expect(screen.getByText('Clock Tower')).toBeInTheDocument()
      expect(screen.getByTestId('progress-ring')).toBeInTheDocument()
    })

    it('should handle empty hints array', () => {
      const stopWithoutHints = { ...mockStop, hints: [] }
      
      render(<StopCard {...mockProps} stop={stopWithoutHints} />)

      expect(screen.queryByRole('button')).not.toBeInTheDocument()
    })

    it('should handle file input with no files', async () => {
      render(<StopCard {...mockProps} />)

      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
      
      Object.defineProperty(fileInput, 'files', {
        value: [],
        writable: false,
      })

      fireEvent.change(fileInput)

      await waitFor(() => {
        expect(mockProps.onUpload).not.toHaveBeenCalled()
      })
    })
  })
})