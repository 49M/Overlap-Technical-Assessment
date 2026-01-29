import { useCallback, useEffect, useRef, useState } from 'react';
import { SelfieSegmentation, Results } from '@mediapipe/selfie_segmentation';

interface UseSegmentationReturn {
  isModelLoaded: boolean;
  processFrame: (videoElement: HTMLVideoElement) => Promise<ImageData | null>;
  error: string | null;
  cleanup: () => void;
  reset: () => void;
  enable: () => void;
}

export const useSegmentation = (): UseSegmentationReturn => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const segmentationRef = useRef<SelfieSegmentation | null>(null);
  const latestResultRef = useRef<ImageData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const sessionIdRef = useRef<number>(0);
  const isProcessingEnabledRef = useRef<boolean>(true);

  useEffect(() => {
    const initializeSegmentation = async () => {
      try {
        console.log('Initializing MediaPipe Selfie Segmentation...');

        // Create hidden canvas for processing segmentation mask
        canvasRef.current = document.createElement('canvas');

        // Initialize MediaPipe Selfie Segmentation
        const selfieSegmentation = new SelfieSegmentation({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/selfie_segmentation/${file}`;
          }
        });

        selfieSegmentation.setOptions({
          modelSelection: 1, // 0 = general (faster), 1 = landscape (more accurate, balanced performance)
          selfieMode: false  // false = no mirror effect
        });

        // Set up results callback
        selfieSegmentation.onResults((results: Results) => {
          // Only process results if processing is enabled
          // This prevents stale results from previous sessions
          if (!isProcessingEnabledRef.current) {
            return;
          }

          if (results.segmentationMask) {
            const canvas = canvasRef.current;
            if (!canvas) return;

            // Set canvas dimensions to match mask dimensions
            canvas.width = results.segmentationMask.width;
            canvas.height = results.segmentationMask.height;

            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Draw segmentation mask to canvas
            ctx.drawImage(results.segmentationMask, 0, 0);

            // Extract ImageData from canvas
            latestResultRef.current = ctx.getImageData(
              0,
              0,
              canvas.width,
              canvas.height
            );
          }
        });

        segmentationRef.current = selfieSegmentation;
        setIsModelLoaded(true);
        console.log('MediaPipe model loaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error initializing MediaPipe:', errorMessage);
        setError(`Failed to load segmentation model: ${errorMessage}`);
      }
    };

    initializeSegmentation();

    // Cleanup on unmount
    return () => {
      if (segmentationRef.current) {
        segmentationRef.current.close();
        segmentationRef.current = null;
      }
      canvasRef.current = null;
      latestResultRef.current = null;
    };
  }, []);

  const processFrame = useCallback(async (videoElement: HTMLVideoElement): Promise<ImageData | null> => {
    if (!segmentationRef.current || !isModelLoaded) {
      return null;
    }

    try {
      // Send video frame to MediaPipe for segmentation
      await segmentationRef.current.send({ image: videoElement });

      // Return the latest segmentation mask
      return latestResultRef.current;
    } catch (err) {
      console.error('Error processing frame:', err);
      return null;
    }
  }, [isModelLoaded]);

  const cleanup = useCallback(() => {
    if (segmentationRef.current) {
      segmentationRef.current.close();
      segmentationRef.current = null;
    }
    canvasRef.current = null;
    latestResultRef.current = null;
    isProcessingEnabledRef.current = false;
  }, []);

  const reset = useCallback(() => {
    // Disable processing to ignore any in-flight MediaPipe results
    isProcessingEnabledRef.current = false;

    // Clear the cached segmentation result
    latestResultRef.current = null;

    // Increment session ID to invalidate old processing sessions
    sessionIdRef.current += 1;
  }, []);

  const enable = useCallback(() => {
    // Enable processing for new session
    isProcessingEnabledRef.current = true;
    latestResultRef.current = null;
  }, []);

  return {
    isModelLoaded,
    processFrame,
    error,
    cleanup,
    reset,
    enable
  };
};
