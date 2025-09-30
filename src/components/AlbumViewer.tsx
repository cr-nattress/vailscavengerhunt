/**
 * @file components/AlbumViewer.tsx
 * @component AlbumViewer
 * @category UI Components
 *
 * @description
 * Collapsible image album viewer with preloading.
 * Features:
 * - Expandable/collapsible container
 * - Image preloading for smooth display
 * - Responsive image sizing
 * - Graceful error handling
 * - Visual state indicators
 *
 * @performance
 * - Hidden image preloading prevents layout shift
 * - React.memo prevents unnecessary re-renders
 * - Max height constraint prevents viewport overflow
 *
 * @ux
 * - Smooth expand/collapse animation
 * - Visual feedback for interactive elements
 * - Emoji icons for friendly appearance
 * - Color-coded borders for state indication
 *
 * @accessibility
 * - Alt text for all images
 * - Clickable header for expand/collapse
 * - Visual indicators for state changes
 */

import React, { useState, useEffect } from 'react';

interface AlbumViewerProps {
  /** URL indicator (presence triggers render) */
  collageUrl?: string | null;
  /** Full resolution image to display */
  imageUrl?: string | null;
  /** Default expanded state */
  initialExpanded?: boolean;
}

/**
 * Renders a collapsible album viewer for photo collages.
 *
 * @example
 * <AlbumViewer
 *   collageUrl="https://cloudinary.com/collage-thumb.jpg"
 *   imageUrl="https://cloudinary.com/collage-full.jpg"
 *   initialExpanded={false}
 * />
 */
const AlbumViewer: React.FC<AlbumViewerProps> = ({ 
  collageUrl, 
  imageUrl, 
  initialExpanded = true 
}) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [imageLoaded, setImageLoaded] = useState(false);

  /**
   * EFFECT: Reset preload state on image change
   * Ensures loading indicator shows for new images
   */
  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  /**
   * EFFECT: Auto-expand on new collage
   * When user creates new collage, show it immediately
   */
  useEffect(() => {
    setExpanded(initialExpanded);
  }, [collageUrl, initialExpanded]);

  // VISIBILITY: Only render when collage exists
  // collageUrl acts as presence indicator
  if (!collageUrl) return null;

  return (
    <>
      {/**
       * CONTAINER: Collapsible album section
       * Border color indicates expanded state
       */}
      <div className={`mt-6 shadow-sm border rounded-lg bg-white p-4 ${
        expanded ? 'border-blue-200' : 'border-gray-200' // STATE VISUALIZATION: Blue when expanded
      }`}>
        <div
          className='flex justify-between items-center cursor-pointer'
          onClick={() => setExpanded(!expanded)}
        >
          <div className='flex items-center gap-2'>
            <span className='text-lg'>📸</span>
            <h3 className='text-lg font-semibold text-slate-700'>Album</h3>
          </div>
          <span className='text-blue-500'>
            {expanded ? '▼' : '▶'} {/* INDICATOR: Arrow direction shows state */}
          </span>
        </div>

        {/**
         * IMAGE DISPLAY: Only show when expanded AND loaded
         * Prevents flash of missing image
         * Transition provides smooth appearance
         */}
        {expanded && imageLoaded && (
          <div className='flex justify-center transition-all duration-300 ease-in-out mt-4'>
            <img
              src={imageUrl || undefined}
              alt="Full size collage"
              className='max-w-full h-auto rounded-lg shadow-md'
              style={{ maxHeight: '70vh' }} // CONSTRAINT: Prevent viewport overflow
            />
          </div>
        )}
      </div>
      
      {/**
       * PRELOADER: Hidden image for smooth loading
       * - Loads image in background
       * - Prevents layout shift when displayed
       * - Handles both success and error cases
       */}
      {imageUrl && !imageLoaded && (
        <img
          src={imageUrl}
          alt="Preloading collage"
          className='hidden'
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)} // FALLBACK: Show placeholder even on error
        />
      )}
    </>
  );
};

/**
 * OPTIMIZATION: React.memo prevents re-renders
 * Component only updates when props actually change
 * Important for parent components that render frequently
 */
export default React.memo(AlbumViewer);
