import { useState, useEffect } from 'react'
import { CollageService } from '../client/CollageService'
import { useToastActions } from '../features/notifications/ToastProvider'

interface UseCollageOptions {
  stops: any[]
  progress: any
  teamName?: string
}

export function useCollage({ stops, progress, teamName }: UseCollageOptions) {
  const [collageUrl, setCollageUrl] = useState<string | null>(null)
  const [collageLoading, setCollageLoading] = useState(false)
  const { success, error: showError } = useToastActions()

  useEffect(() => {
    const allDone = stops.every(stop => progress[stop.id]?.done)
    if (!allDone || collageUrl) return

    const createCollage = async () => {
      try {
        setCollageLoading(true)
        const photoUrls = stops
          .map(stop => progress[stop.id]?.photo)
          .filter(Boolean)

        if (photoUrls.length === stops.length) {
          const collageImageUrl = await CollageService.createCollage(photoUrls, teamName)
          setCollageUrl(collageImageUrl)
          success('🎉 Created your photo collage!')
        }
      } catch (err) {
        console.error('Failed to create collage:', err)
        showError('Failed to create collage')
      } finally {
        setCollageLoading(false)
      }
    }

    createCollage()
  }, [progress, stops, collageUrl, teamName, success, showError])

  return {
    collageUrl,
    collageLoading,
    setCollageUrl
  }
}