/**
 * @file components/CollageUploader.tsx
 * @component CollageUploader
 * @category UI Components
 *
 * @description
 * Interactive photo collage creation component with metadata injection.
 * Features:
 * - Multi-image upload with drag-and-drop support
 * - Real-time image resizing before upload
 * - Custom titles for each location/photo
 * - Auto-generated Cloudinary collage via API
 * - Context-aware metadata injection (team, location, session)
 *
 * @performance
 * - Image resizing: O(n) where n = number of images
 * - Max 10 images to prevent browser memory issues
 * - Resizes images client-side to reduce upload payload
 *
 * @stateManagement
 * - Local state for form inputs and loading states
 * - UploadContext provides default metadata (team, location, session)
 * - Props override context for flexible reuse
 *
 * @errorHandling
 * - Validates file types (images only)
 * - Enforces max image count
 * - Requires titles for all images
 * - Displays user-friendly error messages
 *
 * @relatedComponents
 * - CollageService: Handles image processing and API calls
 * - UploadContext: Provides session metadata
 *
 * @browserSupport
 * - File API required for multi-file selection
 * - Canvas API used for image resizing
 */

import React, { useState, useCallback } from 'react';
import { CollageService } from '../client/CollageService';
import { useUploadMeta } from '../features/upload/UploadContext';

interface CollageUploaderProps {
  /**
   * Triggered when collage is successfully created.
   * @sideEffects Parent component may navigate or update UI
   */
  onCollageCreated?: (collageUrl: string) => void;

  /**
   * Pre-populated titles for known locations.
   * @example ['Gondola One', 'Mid-Vail', 'Eagle\'s Nest']
   */
  defaultTitles?: string[];

  /**
   * Maximum images allowed in a single collage.
   * @performance Higher counts may impact browser memory
   * @default 10
   */
  maxImages?: number;

  /** Tailwind CSS classes for custom styling */
  className?: string;

  /**
   * Override context-provided metadata.
   * @priority Props > Context > Defaults
   */
  locationSlug?: string;
  teamSlug?: string;
  sessionId?: string;
}

export const CollageUploader: React.FC<CollageUploaderProps> = ({
  onCollageCreated,
  defaultTitles = [],
  maxImages = 10,
  className = '',
  locationSlug: propsLocationSlug,
  teamSlug: propsTeamSlug,
  sessionId: propsSessionId
}) => {
  /**
   * PATTERN: Props override context pattern
   * Allows component to be used standalone (with props)
   * or within upload flow (with context)
   */
  const contextMeta = useUploadMeta();

  // PRECEDENCE: Props > Context > undefined
  // This enables both standalone usage and context-aware usage
  const uploadMeta = {
    locationSlug: propsLocationSlug || contextMeta.locationSlug,
    teamSlug: propsTeamSlug || contextMeta.teamSlug,
    sessionId: propsSessionId || contextMeta.sessionId,
    dateISO: contextMeta.dateISO // Always use context for date
  };

  const [files, setFiles] = useState<File[]>([]);
  const [titles, setTitles] = useState<string[]>(defaultTitles);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [collageUrl, setCollageUrl] = useState<string | null>(null);

  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);

    // VALIDATION: Prevent excessive memory usage
    // Large image counts can crash mobile browsers
    if (selectedFiles.length > maxImages) {
      setError(`Maximum ${maxImages} images allowed`);
      return;
    }

    // SECURITY: Validate MIME types to prevent non-image uploads
    // Prevents processing of potentially malicious files
    const invalidFiles = selectedFiles.filter(file => !file.type.startsWith('image/'));
    if (invalidFiles.length > 0) {
      setError('All files must be images');
      return;
    }

    setFiles(selectedFiles);
    setError(null);

    // UX: Auto-generate placeholder titles
    // Users can still customize them before submission
    const newTitles = [...titles];
    while (newTitles.length < selectedFiles.length) {
      newTitles.push(`Location ${newTitles.length + 1}`);
    }
    setTitles(newTitles.slice(0, selectedFiles.length));
  }, [maxImages, titles]);

  const handleTitleChange = useCallback((index: number, value: string) => {
    const newTitles = [...titles];
    newTitles[index] = value;
    setTitles(newTitles);
  }, [titles]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    // VALIDATION: Ensure at least one image selected
    if (files.length === 0) {
      setError('Please select at least one image');
      return;
    }

    // REQUIREMENT: Titles required for proper collage labeling
    // Cloudinary API uses these for text overlays
    if (titles.some(title => !title.trim())) {
      setError('Please provide titles for all images');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      /**
       * OPTIMIZATION: Client-side resizing reduces upload time
       * - Targets 1200px max dimension
       * - Maintains aspect ratio
       * - Reduces bandwidth by ~70%
       */
      console.log('Resizing images...');
      const resizedFiles = await CollageService.resizeImages(files);

      // CRITICAL: Metadata injection for proper categorization
      // Used for filtering and analytics in the backend
      console.log('Creating collage with metadata:', uploadMeta);
      const url = await CollageService.createCollage(resizedFiles, titles, uploadMeta);

      setCollageUrl(url);
      onCollageCreated?.(url); // PATTERN: Optional callback for parent actions

    } catch (err) {
      // ERROR HANDLING: User-friendly messages
      // Network errors and API limits are most common
      console.error('Collage creation failed:', err);
      setError(err instanceof Error ? err.message : 'Failed to create collage');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFiles([]);
    setTitles([]);
    setCollageUrl(null);
    setError(null);

    // BROWSER QUIRK: File inputs must be manually cleared
    // Setting files state doesn't clear the input element
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  return (
    <div className={`collage-uploader ${className}`}>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* File Input */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Select Photos (max {maxImages})
          </label>
          <input
            type="file"
            multiple
            accept="image/*"
            onChange={handleFileChange}
            disabled={loading}
            className="block w-full text-sm text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-rose-100 file:text-rose-700 hover:file:bg-rose-200 disabled:opacity-50"
          />
          {files.length > 0 && (
            <p className="mt-1 text-xs text-slate-600">
              {files.length} image{files.length > 1 ? 's' : ''} selected
            </p>
          )}
        </div>

        {/* Title Inputs */}
        {files.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Location Titles
            </label>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-rose-100 text-rose-700 text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                  <input
                    type="text"
                    value={titles[index] || ''}
                    onChange={(e) => handleTitleChange(index, e.target.value)}
                    placeholder={`Location ${index + 1}`}
                    disabled={loading}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-rose-500 focus:border-rose-500 disabled:opacity-50"
                  />
                  <span className="text-xs text-slate-500 w-16 flex-shrink-0">
                    {file.name.substring(0, 12)}...
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || files.length === 0}
            className="flex-1 px-4 py-2 bg-gradient-to-r from-rose-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-medium rounded-md shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Creating Collage...
              </span>
            ) : (
              '🎨 Create Collage'
            )}
          </button>
          
          {(files.length > 0 || collageUrl) && (
            <button
              type="button"
              onClick={handleReset}
              disabled={loading}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 rounded-md transition-colors disabled:opacity-50"
            >
              Reset
            </button>
          )}
        </div>
      </form>

      {/* SUCCESS STATE: Display generated collage with download option */}
      {collageUrl && (
        <div className="mt-8 border rounded-lg p-4 bg-slate-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-slate-900">Your Collage</h3>
            <a
              href={collageUrl}
              download="VailLoveHunt-Collage.jpg"
              className="px-3 py-1 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 rounded text-sm font-medium transition-colors"
            >
              Download
            </a>
          </div>
          <img
            src={collageUrl}
            alt="Generated collage"
            className="w-full rounded-lg shadow-lg"
            loading="lazy" // PERFORMANCE: Lazy load for below-the-fold content
          />
        </div>
      )}
    </div>
  );
};