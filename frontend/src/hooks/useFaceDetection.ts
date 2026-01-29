import { useCallback, useEffect, useRef, useState } from 'react';
import { FaceDetection as MediaPipeFaceDetection, Results, Detection } from '@mediapipe/face_detection';

// Face detection result interface
export interface FaceDetection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

// Extend Detection type to include score property
interface DetectionWithScore extends Detection {
  score?: number[];
}

interface UseFaceDetectionReturn {
  isModelLoaded: boolean;
  detectFaces: (videoElement: HTMLVideoElement) => Promise<FaceDetection[]>;
  error: string | null;
  cleanup: () => void;
}

export const useFaceDetection = (): UseFaceDetectionReturn => {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const faceDetectionRef = useRef<MediaPipeFaceDetection | null>(null);
  const latestDetectionsRef = useRef<FaceDetection[]>([]);
  const videoWidthRef = useRef<number>(0);
  const videoHeightRef = useRef<number>(0);

  useEffect(() => {
    const initializeFaceDetection = async () => {
      try {
        console.log('Initializing MediaPipe Face Detection...');

        // Initialize MediaPipe Face Detection
        const faceDetection = new MediaPipeFaceDetection({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`;
          }
        });

        faceDetection.setOptions({
          model: 'short', // 'short' for faces within 2 meters, 'full' for faces within 5 meters
          minDetectionConfidence: 0.5
        });

        // Set up results callback
        faceDetection.onResults((results: Results) => {
          const detections: FaceDetection[] = [];

          if (results.detections && results.detections.length > 0) {
            results.detections.forEach((detection, index) => {
              const bbox = detection.boundingBox;

              if (bbox) {
                // Convert normalized coordinates to pixel coordinates
                const x = bbox.xCenter * videoWidthRef.current - (bbox.width * videoWidthRef.current) / 2;
                const y = bbox.yCenter * videoHeightRef.current - (bbox.height * videoHeightRef.current) / 2;
                const width = bbox.width * videoWidthRef.current;
                const height = bbox.height * videoHeightRef.current;

                // Access score using type assertion as MediaPipe's TypeScript types are incomplete
                const detectionWithScore = detection as DetectionWithScore;
                const confidence = (detectionWithScore.score && detectionWithScore.score[0]) || 0.5;

                detections.push({
                  id: `face-${index}-${Date.now()}`,
                  x: Math.max(0, x),
                  y: Math.max(0, y),
                  width: Math.min(width, videoWidthRef.current - x),
                  height: Math.min(height, videoHeightRef.current - y),
                  confidence: confidence,
                  label: `Face ${index + 1}`
                });
              }
            });
          }

          latestDetectionsRef.current = detections;
        });

        faceDetectionRef.current = faceDetection;
        setIsModelLoaded(true);
        console.log('MediaPipe Face Detection loaded successfully');
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        console.error('Error initializing MediaPipe Face Detection:', errorMessage);
        setError(`Failed to load face detection model: ${errorMessage}`);
      }
    };

    initializeFaceDetection();

    // Cleanup on unmount
    return () => {
      if (faceDetectionRef.current) {
        faceDetectionRef.current.close();
        faceDetectionRef.current = null;
      }
      latestDetectionsRef.current = [];
    };
  }, []);

  const detectFaces = useCallback(async (videoElement: HTMLVideoElement): Promise<FaceDetection[]> => {
    if (!faceDetectionRef.current || !isModelLoaded) {
      return [];
    }

    try {
      // Update video dimensions
      videoWidthRef.current = videoElement.videoWidth;
      videoHeightRef.current = videoElement.videoHeight;

      // Send video frame to MediaPipe for face detection
      await faceDetectionRef.current.send({ image: videoElement });

      // Return the latest detections
      return latestDetectionsRef.current;
    } catch (err) {
      console.error('Error detecting faces:', err);
      return [];
    }
  }, [isModelLoaded]);

  const cleanup = useCallback(() => {
    if (faceDetectionRef.current) {
      faceDetectionRef.current.close();
      faceDetectionRef.current = null;
    }
    latestDetectionsRef.current = [];
  }, []);

  return {
    isModelLoaded,
    detectFaces,
    error,
    cleanup
  };
};
