import React, { forwardRef, CSSProperties } from 'react';

interface VideoPlayerProps {
  src: string;
  onLoadedMetadata?: () => void;
  style?: CSSProperties;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(
  ({ src, onLoadedMetadata, style }, ref) => {
    return (
      <video
        ref={ref}
        src={src}
        className="video-player"
        controls
        onLoadedMetadata={onLoadedMetadata}
        crossOrigin="anonymous"
        style={style}
      />
    );
  }
);

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer; 