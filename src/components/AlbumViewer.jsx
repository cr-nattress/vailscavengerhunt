import React, { useState, useEffect } from 'react';

/**
 * AlbumViewer Component
 * Displays a collapsible album container with the prize collage image
 * 
 * @param {Object} props
 * @param {string} [props.collageUrl] - URL of the collage to display
 * @param {string} [props.imageUrl] - Full size image URL
 * @param {boolean} [props.initialExpanded=true] - Initial expanded state
 */
const AlbumViewer = ({ collageUrl, imageUrl, initialExpanded = true }) => {
  const [expanded, setExpanded] = useState(initialExpanded);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Reset image loaded state when imageUrl changes
  useEffect(() => {
    setImageLoaded(false);
  }, [imageUrl]);

  // Reset expanded state when collageUrl changes (new collage created)
  useEffect(() => {
    setExpanded(initialExpanded);
  }, [collageUrl, initialExpanded]);

  if (!collageUrl) return null;

  return (
    <>
      {/* Album container - collapsible after prize is claimed */}
      <div className={`mt-6 shadow-sm border rounded-lg bg-white p-4 ${
        expanded ? 'border-blue-200' : 'border-gray-200'
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
            {expanded ? '▼' : '▶'}
          </span>
        </div>
        
        {expanded && imageLoaded && (
          <div className='flex justify-center transition-all duration-300 ease-in-out mt-4'>
            <img 
              src={imageUrl} 
              alt="Full size collage" 
              className='max-w-full h-auto rounded-lg shadow-md'
              style={{ maxHeight: '70vh' }}
            />
          </div>
        )}
      </div>
      
      {/* Hidden image for preloading */}
      {imageUrl && !imageLoaded && (
        <img 
          src={imageUrl} 
          alt="Preloading collage" 
          className='hidden'
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageLoaded(true)} // Show even if there's an error
        />
      )}
    </>
  );
};

export default React.memo(AlbumViewer);