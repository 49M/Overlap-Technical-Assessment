import React, { useEffect, useRef, useState } from 'react';
import { useSegmentation } from '../hooks/useSegmentation';
import { applyGrayscaleToBackground, areCompatibleDimensions } from '../utils/effectsProcessor';

export interface ProcessingStats {
  fps: number;
  processingTime: number;
}

interface BackgroundFilteredVideoProps {
  videoUrl: string;
  effectEnabled: boolean;
  onStatsUpdate?: (stats: ProcessingStats) => void;
}

export const BackgroundFilteredVideo: React.FC<BackgroundFilteredVideoProps> = ({
  videoUrl,
  effectEnabled,
  onStatsUpdate
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const fpsCounterRef = useRef<number[]>([]);
  const isProcessingActiveRef = useRef<boolean>(false);
  const isFrameProcessingRef = useRef<boolean>(false);

  const { isModelLoaded, processFrame, error, reset, enable } = useSegmentation();
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Initialize canvases when video metadata is loaded
  const handleVideoLoadedMetadata = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;

    if (!video || !canvas || !hiddenCanvas) return;

    // Set canvas dimensions to match video
    const width = video.videoWidth;
    const height = video.videoHeight;

    canvas.width = width;
    canvas.height = height;
    hiddenCanvas.width = width;
    hiddenCanvas.height = height;

    setIsVideoReady(true);
    console.log(`Video loaded: ${width}x${height}`);
  };

  // Main processing loop
  useEffect(() => {
    if (!isVideoReady || !isModelLoaded || !effectEnabled) {
      isProcessingActiveRef.current = false;
      isFrameProcessingRef.current = false;

      // Reset segmentation cache when effect is disabled to prevent stale data
      if (!effectEnabled) {
        reset();

        // Clear and reset all canvases to ensure clean state
        const canvas = canvasRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;

        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            // Clear the entire canvas
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // Reset transform matrix
            ctx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }

        if (hiddenCanvas) {
          const hiddenCtx = hiddenCanvas.getContext('2d');
          if (hiddenCtx) {
            // Clear the entire hidden canvas
            hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
            // Reset transform matrix
            hiddenCtx.setTransform(1, 0, 0, 1, 0, 0);
          }
        }

        // Reset FPS counter
        fpsCounterRef.current = [];
        lastFrameTimeRef.current = 0;
      }

      // Draw the video directly if the effect is off
      if (isVideoReady && !effectEnabled) {
        const drawVideoDirectly = () => {
          const video = videoRef.current;
          const canvas = canvasRef.current;
          if (!video || !canvas || video.paused || video.ended) return;

          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          }

          animationFrameRef.current = requestAnimationFrame(drawVideoDirectly);
        };

        drawVideoDirectly();
      }

      // Cleanup function to cancel animation frame
      return () => {
        isProcessingActiveRef.current = false;
        isFrameProcessingRef.current = false;
        if (animationFrameRef.current !== null) {
          cancelAnimationFrame(animationFrameRef.current);
          animationFrameRef.current = null;
        }
      };
    }

    isProcessingActiveRef.current = true;

    // Enable segmentation processing for this new session
    enable();

    // Clear canvases to ensure fresh start
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;

    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    if (hiddenCanvas) {
      const hiddenCtx = hiddenCanvas.getContext('2d');
      if (hiddenCtx) {
        hiddenCtx.clearRect(0, 0, hiddenCanvas.width, hiddenCanvas.height);
        hiddenCtx.setTransform(1, 0, 0, 1, 0, 0);
      }
    }

    // Reset stats
    fpsCounterRef.current = [];
    lastFrameTimeRef.current = 0;

    const processVideoFrame = async () => {
      // Check if processing is still active before starting
      if (!isProcessingActiveRef.current) return;

      // Prevent concurrent frame processing
      if (isFrameProcessingRef.current) {
        // Skip this frame and schedule next one
        if (isProcessingActiveRef.current) {
          animationFrameRef.current = requestAnimationFrame(processVideoFrame);
        }
        return;
      }

      isFrameProcessingRef.current = true;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const hiddenCanvas = hiddenCanvasRef.current;

      if (!video || !canvas || !hiddenCanvas || video.paused || video.ended) {
        isFrameProcessingRef.current = false;
        if (isProcessingActiveRef.current) {
          animationFrameRef.current = requestAnimationFrame(processVideoFrame);
        }
        return;
      }

      const startTime = performance.now();

      try {
        // Get canvas contexts
        const ctx = canvas.getContext('2d');
        const hiddenCtx = hiddenCanvas.getContext('2d');

        if (!ctx || !hiddenCtx) {
          isFrameProcessingRef.current = false;
          if (isProcessingActiveRef.current) {
            animationFrameRef.current = requestAnimationFrame(processVideoFrame);
          }
          return;
        }

        // Draw current video frame to hidden canvas
        hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);

        // Get frame data
        const frameData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);

        // Process frame through MediaPipe segmentation
        const segmentationMask = await processFrame(video);

        // Check if still active after async operation
        if (!isProcessingActiveRef.current) {
          isFrameProcessingRef.current = false;
          return;
        }

        if (segmentationMask && areCompatibleDimensions(frameData, segmentationMask)) {
          // Apply grayscale effect to background
          const processedFrame = applyGrayscaleToBackground(frameData, segmentationMask);

          // Draw processed frame to visible canvas
          ctx.putImageData(processedFrame, 0, 0);
        } else {
          // Fallback: draw original frame if segmentation fails
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Calculate processing time
        const endTime = performance.now();
        const processingTime = endTime - startTime;

        // Calculate FPS
        const now = performance.now();
        const deltaTime = now - lastFrameTimeRef.current;
        if (deltaTime > 0) {
          const currentFps = 1000 / deltaTime;
          fpsCounterRef.current.push(currentFps);

          // Keep only last 30 frames for averaging
          if (fpsCounterRef.current.length > 30) {
            fpsCounterRef.current.shift();
          }

          // Calculate average FPS
          const avgFps = fpsCounterRef.current.reduce((a, b) => a + b, 0) / fpsCounterRef.current.length;

          // Update stats
          if (onStatsUpdate) {
            onStatsUpdate({
              fps: Math.round(avgFps),
              processingTime: Math.round(processingTime)
            });
          }
        }

        lastFrameTimeRef.current = now;
      } catch (err) {
        console.error('Error processing video frame:', err);
      }

      // Mark frame processing as complete
      isFrameProcessingRef.current = false;

      // Schedule next frame only if still active
      if (isProcessingActiveRef.current) {
        animationFrameRef.current = requestAnimationFrame(processVideoFrame);
      }
    };

    // Start processing loop
    processVideoFrame();

    // Cleanup
    return () => {
      isProcessingActiveRef.current = false;
      isFrameProcessingRef.current = false;
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [isVideoReady, isModelLoaded, effectEnabled, processFrame, onStatsUpdate, reset, enable]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return (
    <div className="video-container">
      {error && (
        <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
          Error: {error}
        </div>
      )}

      {!isModelLoaded && !error && (
        <div className="loading-message" style={{ marginBottom: '10px' }}>
          Loading MediaPipe model...
        </div>
      )}

      {/* Hidden video element for frame extraction */}
      <video
        ref={videoRef}
        src={videoUrl}
        crossOrigin="anonymous"
        onLoadedMetadata={handleVideoLoadedMetadata}
        controls
        autoPlay
        loop
        style={{ display: effectEnabled ? 'none' : 'block', maxWidth: '800px', width: '100%' }}
      />

      {/* Visible canvas for displaying processed video */}
      <canvas
        ref={canvasRef}
        style={{
          maxWidth: '800px',
          width: '100%',
          display: effectEnabled ? 'block' : 'none'
        }}
      />

      {/* Hidden canvas for frame extraction */}
      <canvas
        ref={hiddenCanvasRef}
        style={{ display: 'none' }}
      />
    </div>
  );
};
