import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useProgress } from './useProgress'
import { localStorageMock } from '../../test/setup'

describe('useProgress', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    localStorageMock.clear()
  })

  const mockStops = [
    { id: 'stop1', name: 'First Stop' },
    { id: 'stop2', name: 'Second Stop' },
    { id: 'stop3', name: 'Third Stop' },
  ]

  it('should initialize with empty progress when no localStorage data exists', () => {
    localStorageMock.getItem.mockReturnValue(null)

    const { result } = renderHook(() => useProgress(mockStops))

    expect(result.current.progress).toEqual({})
    expect(result.current.completeCount).toBe(0)
    expect(result.current.percent).toBe(0)
    expect(localStorageMock.getItem).toHaveBeenCalledWith('vail-love-hunt-progress')
  })

  it('should initialize with existing localStorage data', () => {
    const existingProgress = {
      'stop1': { done: true, notes: 'Found it!' },
      'stop2': { done: false, notes: 'Still looking' }
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(existingProgress))

    const { result } = renderHook(() => useProgress(mockStops))

    expect(result.current.progress).toEqual(existingProgress)
    expect(result.current.completeCount).toBe(1)
    expect(result.current.percent).toBe(33) // 1 out of 3 = 33%
  })

  it('should handle corrupted localStorage data gracefully', () => {
    localStorageMock.getItem.mockReturnValue('invalid-json')

    const { result } = renderHook(() => useProgress(mockStops))

    expect(result.current.progress).toEqual({})
    expect(result.current.completeCount).toBe(0)
    expect(result.current.percent).toBe(0)
  })

  it('should update progress and persist to localStorage', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'stop1': { done: true, notes: 'Completed first stop' }
      })
    })

    expect(result.current.progress).toEqual({
      'stop1': { done: true, notes: 'Completed first stop' }
    })
    expect(result.current.completeCount).toBe(1)
    expect(result.current.percent).toBe(33)
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'vail-love-hunt-progress',
      JSON.stringify({ 'stop1': { done: true, notes: 'Completed first stop' } })
    )
  })

  it('should calculate completeCount correctly', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'stop1': { done: true, notes: 'Done' },
        'stop2': { done: true, notes: 'Also done' },
        'stop3': { done: false, notes: 'Not done yet' }
      })
    })

    expect(result.current.completeCount).toBe(2)
    expect(result.current.percent).toBe(67) // 2 out of 3 = 67%
  })

  it('should handle 100% completion', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'stop1': { done: true, notes: 'Done' },
        'stop2': { done: true, notes: 'Done' },
        'stop3': { done: true, notes: 'Done' }
      })
    })

    expect(result.current.completeCount).toBe(3)
    expect(result.current.percent).toBe(100)
  })

  it('should handle empty stops array', () => {
    const { result } = renderHook(() => useProgress([]))

    expect(result.current.completeCount).toBe(0)
    expect(result.current.percent).toBe(0) // Should return 0 instead of NaN for empty array
  })

  it('should handle stops array with no matching progress entries', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'nonexistent-stop': { done: true, notes: 'This stop does not exist' }
      })
    })

    expect(result.current.completeCount).toBe(0)
    expect(result.current.percent).toBe(0)
  })

  it('should handle partial progress updates', () => {
    const initialProgress = {
      'stop1': { done: true, notes: 'Initial' },
      'stop2': { done: false, notes: 'Initial' }
    }
    localStorageMock.getItem.mockReturnValue(JSON.stringify(initialProgress))

    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        ...result.current.progress,
        'stop2': { done: true, notes: 'Updated' }
      })
    })

    expect(result.current.progress).toEqual({
      'stop1': { done: true, notes: 'Initial' },
      'stop2': { done: true, notes: 'Updated' }
    })
    expect(result.current.completeCount).toBe(2)
    expect(result.current.percent).toBe(67)
  })

  it('should handle localStorage quota exceeded error', () => {
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorageMock.setItem.mockImplementation(() => {
      const error = new Error('QuotaExceededError')
      error.name = 'QuotaExceededError'
      throw error
    })

    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({ 'stop1': { done: true, notes: 'Test' } })
    })

    expect(consoleSpy).toHaveBeenCalledWith('localStorage quota exceeded - clearing old data and trying again')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('vail-love-hunt-progress')
    
    consoleSpy.mockRestore()
  })

  it('should handle localStorage errors when clearing fails', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorageMock.setItem.mockImplementation(() => {
      const error = new Error('QuotaExceededError')
      error.name = 'QuotaExceededError'
      throw error
    })

    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({ 'stop1': { done: true, notes: 'Test' } })
    })

    expect(consoleSpy).toHaveBeenCalledWith('Failed to save progress even after clearing storage')
    
    consoleSpy.mockRestore()
  })

  it('should handle other localStorage errors gracefully', () => {
    localStorageMock.setItem.mockImplementation(() => {
      throw new Error('Some other localStorage error')
    })

    const { result } = renderHook(() => useProgress(mockStops))

    // Should not throw an error, just silently fail
    act(() => {
      result.current.setProgress({ 'stop1': { done: true, notes: 'Test' } })
    })

    expect(result.current.progress).toEqual({ 'stop1': { done: true, notes: 'Test' } })
  })

  it('should recalculate derived values when stops array changes', () => {
    const { result, rerender } = renderHook(
      ({ stops }) => useProgress(stops),
      { initialProps: { stops: mockStops } }
    )

    act(() => {
      result.current.setProgress({
        'stop1': { done: true, notes: 'Done' },
        'stop4': { done: true, notes: 'Done but not in initial array' }
      })
    })

    expect(result.current.completeCount).toBe(1) // Only stop1 counts
    expect(result.current.percent).toBe(33)

    // Add stop4 to the array
    const newStops = [...mockStops, { id: 'stop4', name: 'Fourth Stop' }]
    rerender({ stops: newStops })

    expect(result.current.completeCount).toBe(2) // Now both stop1 and stop4 count
    expect(result.current.percent).toBe(50) // 2 out of 4 = 50%
  })

  it('should handle progress entries without done property', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'stop1': { notes: 'Has notes but no done property' },
        'stop2': { done: undefined, notes: 'Undefined done property' },
        'stop3': { done: null, notes: 'Null done property' }
      })
    })

    expect(result.current.completeCount).toBe(0)
    expect(result.current.percent).toBe(0)
  })

  it('should handle boolean coercion for done property', () => {
    const { result } = renderHook(() => useProgress(mockStops))

    act(() => {
      result.current.setProgress({
        'stop1': { done: true, notes: 'True' },
        'stop2': { done: false, notes: 'False' },
        'stop3': { done: 'truthy', notes: 'Truthy string' } // This should be truthy
      })
    })

    expect(result.current.completeCount).toBe(2) // stop1 (true) and stop3 (truthy string)
    expect(result.current.percent).toBe(67)
  })
})