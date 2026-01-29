import React, { useRef, useState, useCallback } from 'react';
import { ProcessingStats } from './components/BackgroundFilteredVideo';
import DetectionStats from './components/DetectionStats';
import VideoPlayer from './components/VideoPlayer';
import { useSegmentation } from './hooks/useSegmentation';
import { applyGrayscaleToBackground, areCompatibleDimensions } from './utils/effectsProcessor';
import { videoUrl } from './consts';

const App: React.FC = () => {
  const [response, setResponse] = useState<string>('');
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [stats, setStats] = useState<ProcessingStats>({ fps: 0, processingTime: 0 });

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hiddenCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const fpsCounterRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const isFrameProcessingRef = useRef<boolean>(false);
  const isDetectingRef = useRef<boolean>(false);

  const { isModelLoaded: isSegmentationLoaded, processFrame: processSegmentation, error: segmentationError, reset, enable } = useSegmentation();

  /**
   * Start detection - implements background filtering with person segmentation
   * This is the main function required by the assessment
   */
  const startDetection = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;

    if (!video || !canvas || !hiddenCanvas) {
      console.warn('Video or canvas not ready');
      return;
    }

    if (!isSegmentationLoaded) {
      console.warn('Model not loaded yet');
      return;
    }

    // Initialize canvas dimensions
    if (video.videoWidth && video.videoHeight) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      hiddenCanvas.width = video.videoWidth;
      hiddenCanvas.height = video.videoHeight;
    }

    setIsDetecting(true);
    isDetectingRef.current = true;
    enable(); // Enable background segmentation

    const processFrame = async () => {
      if (!isDetectingRef.current) return;

      // Prevent concurrent processing
      if (isFrameProcessingRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
        return;
      }

      isFrameProcessingRef.current = true;

      const startTime = performance.now();

      try {
        const ctx = canvas.getContext('2d');
        const hiddenCtx = hiddenCanvas.getContext('2d');

        if (!ctx || !hiddenCtx || !video || video.paused || video.ended) {
          isFrameProcessingRef.current = false;
          if (isDetectingRef.current) {
            animationFrameRef.current = requestAnimationFrame(processFrame);
          }
          return;
        }

        // Set canvas dimensions to match video
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          hiddenCanvas.width = video.videoWidth;
          hiddenCanvas.height = video.videoHeight;
        }

        // Draw video to hidden canvas
        hiddenCtx.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
        const frameData = hiddenCtx.getImageData(0, 0, hiddenCanvas.width, hiddenCanvas.height);

        // Process background filter (always enabled)
        const segmentationMask = await processSegmentation(video);

        if (segmentationMask && areCompatibleDimensions(frameData, segmentationMask)) {
          const processedFrame = applyGrayscaleToBackground(frameData, segmentationMask);
          ctx.putImageData(processedFrame, 0, 0);
        } else {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Calculate performance metrics
        const endTime = performance.now();
        const processingTime = endTime - startTime;

        const now = performance.now();
        const deltaTime = now - lastFrameTimeRef.current;
        if (deltaTime > 0) {
          const currentFps = 1000 / deltaTime;
          fpsCounterRef.current.push(currentFps);

          if (fpsCounterRef.current.length > 30) {
            fpsCounterRef.current.shift();
          }

          const avgFps = fpsCounterRef.current.reduce((a, b) => a + b, 0) / fpsCounterRef.current.length;

          setStats({
            fps: Math.round(avgFps),
            processingTime: Math.round(processingTime)
          });
        }

        lastFrameTimeRef.current = now;
      } catch (err) {
        console.error('Error processing frame:', err);
      }

      isFrameProcessingRef.current = false;

      if (isDetectingRef.current) {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }
    };

    processFrame();
  }, [isSegmentationLoaded, processSegmentation, enable]);

  /**
   * Stop detection
   */
  const stopDetection = useCallback(() => {
    setIsDetecting(false);
    isDetectingRef.current = false;
    isFrameProcessingRef.current = false;

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    fpsCounterRef.current = [];
    lastFrameTimeRef.current = 0;
    reset(); // Reset segmentation
  }, [reset]);

  const pingBackend = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8080/hello-world');
      const data = await res.text();
      setResponse(data);
      console.log('Backend response:', data);
    } catch (error) {
      console.error('Error pinging backend:', error);
      setResponse('Error connecting to backend');
    }
  };

  const modelsLoaded = isSegmentationLoaded;
  const anyError = segmentationError;

  return (
    <div className="container">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Video Processing System</h1>
        <p style={{ marginBottom: '20px', color: '#666' }}>
          Background grayscale filter with person segmentation
        </p>

        {anyError && (
          <div className="error-message" style={{ color: 'red', marginBottom: '10px' }}>
            Error: {anyError}
          </div>
        )}

        {!modelsLoaded && !anyError && (
          <div className="loading-message" style={{ marginBottom: '10px' }}>
            Loading segmentation model... {isSegmentationLoaded ? '✓' : '...'}
          </div>
        )}

        <div style={{ position: 'relative', display: 'inline-block', marginBottom: '20px' }}>
          {/* Video element - hidden when processing */}
          <VideoPlayer
            ref={videoRef}
            src={videoUrl}
            style={{ display: isDetecting ? 'none' : 'block' }}
          />

          {/* Canvas for processed video - shown when processing */}
          <canvas
            ref={canvasRef}
            style={{
              maxWidth: '800px',
              width: '100%',
              display: isDetecting ? 'block' : 'none'
            }}
          />

          {/* Hidden canvas for processing */}
          <canvas ref={hiddenCanvasRef} style={{ display: 'none' }} />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={isDetecting ? stopDetection : startDetection}
            disabled={!modelsLoaded}
            className={`btn ${isDetecting ? 'btn-danger' : 'btn-success'}`}
          >
            {isDetecting ? 'Stop Detection' : 'Start Detection'}
          </button>
        </div>

        {isDetecting && (
          <DetectionStats
            fps={stats.fps}
            processingTime={stats.processingTime}
            isProcessing={isDetecting}
          />
        )}

        <div style={{ marginTop: '20px' }}>
          <button
            onClick={pingBackend}
            className="btn btn-primary"
          >
            Ping Backend
          </button>
          {response && (
            <div style={{ marginTop: '10px', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
              Response: {response}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
