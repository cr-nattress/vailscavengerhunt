import React from 'react';

export interface AlbumViewerProps {
  /** URL of the collage to display; when absent, component returns null */
  collageUrl?: string | null;
  /** Full size image URL for the collage */
  imageUrl?: string | null;
  /** Initial expanded state (default: true) */
  initialExpanded?: boolean;
}

declare const AlbumViewer: React.MemoExoticComponent<
  (props: AlbumViewerProps) => JSX.Element | null
>;

export default AlbumViewer;
