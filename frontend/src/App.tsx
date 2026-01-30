import React, { useRef, useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import DetectionStats from './components/DetectionStats';
import VideoProcessModeButton from './components/videoProcessModeButton';
import GlassButton from './components/GlassButton';
import VideoCard from './components/VideoCard';
import { videoUrl } from './consts';

export interface FaceDetection {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
  label?: string;
}

const App: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [response, setResponse] = useState<string>('');
  const [processedImageUrl, setProcessedImageUrl] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processingTime, setProcessingTime] = useState<number>(0);
  const [coverage, setCoverage] = useState<number>(0);
  const [confidence, setConfidence] = useState<number>(0)
  const [faceDetections, setFaceDetections] = useState<FaceDetection[]>([]);
  const [processingMode, setProcessingMode] = useState<'grayscale' | 'blur'>('grayscale');
  const [currentVideoUrl, setCurrentVideoUrl] = useState<string>(videoUrl);
  const [isCustomVideo, setIsCustomVideo] = useState<boolean>(false);

  const captureFrame = (video: HTMLVideoElement): Promise<Blob> => {
    const canvas = document.createElement("canvas");

    const scale = Math.min(1, 850 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.6)
    );
  };

  const processFrame = async (blob: Blob, mode: 'grayscale' | 'blur') => {
    const formData = new FormData();
    formData.append("image", blob);
    formData.append("mode", mode);

    const res = await fetch("http://127.0.0.1:8080/process-frame", {
      method: "POST",
      body: formData,
    });

    return res.json();
  };

  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      // Revoke previous blob URL to avoid memory leaks
      if (isCustomVideo && currentVideoUrl !== videoUrl) {
        URL.revokeObjectURL(currentVideoUrl);
      }

      const blobUrl = URL.createObjectURL(file);
      setCurrentVideoUrl(blobUrl);
      setIsCustomVideo(true);

      // Reset processing states
      setProcessedImageUrl('');
      setIsProcessing(false);
    }
  };

  const handleResetVideo = () => {
    // Revoke blob URL to free memory
    if (isCustomVideo && currentVideoUrl !== videoUrl) {
      URL.revokeObjectURL(currentVideoUrl);
    }

    setCurrentVideoUrl(videoUrl);
    setIsCustomVideo(false);

    setProcessedImageUrl('');
    setIsProcessing(false);
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isProcessingFrame = false;

    const startProcessing = async () => {
      interval = setInterval(async () => {
        const isPlaying = videoRef.current && !videoRef.current.paused && !videoRef.current.ended;

        setIsProcessing(!!isPlaying);

        if (!isPlaying || isProcessingFrame) {
          return;
        }

        isProcessingFrame = true;
        const startTime = performance.now();

        try {
          const blob = await captureFrame(videoRef.current!);
          const result = await processFrame(blob, processingMode);

          const endTime = performance.now();
          setProcessingTime(Math.round(endTime - startTime));

          setProcessedImageUrl(result.processed_image || '');

          // Extract person confidence and face detections from result
          const personDetection = result.detections?.find((d: any) => d.label === 'person');
          const faces = result.detections?.filter((d: any) => d.label === 'face') || [];

          setCoverage(personDetection?.coverage || 0);

          // Calculate average face confidence from all detected faces
          const avgFaceConfidence = faces.length > 0
            ? faces.reduce((sum: number, face: any) => sum + face.confidence, 0) / faces.length
            : 0;
          setConfidence(avgFaceConfidence);

          setFaceDetections(faces);
        } catch (error) {
          console.error('Error processing frame:', error);
        } finally {
          isProcessingFrame = false;
        }
      }, 50);
    };

    startProcessing();

    return () => {
      setIsProcessing(false);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [processingMode]);

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #d6a1a1 0%, #ff3535 100%)',
      padding: '2rem',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        textAlign: 'center',
        marginBottom: '3rem',
        animation: 'fadeIn 0.8s ease-in'
      }}>
        <h1 style={{
          color: 'white',
          fontSize: '2.5rem',
          fontWeight: '700',
          marginBottom: '0.5rem',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Real-Time Face Detection
        </h1>
        <p style={{
          color: 'rgba(255,255,255,0.9)',
          fontSize: '1.1rem',
          fontWeight: '400'
        }}>
          AI-Powered Person Segmentation & Background Processing
        </p>
      </div>

      {/* Video Upload Section */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <input
          type="file"
          accept="video/*"
          onChange={handleVideoUpload}
          style={{ display: 'none' }}
          id="video-upload-input"
        />
        <GlassButton type="label" htmlFor="video-upload-input">
          Upload Custom Video
        </GlassButton>
        {isCustomVideo && (
          <GlassButton onClick={handleResetVideo}>
            Reset to Default
          </GlassButton>
        )}
      </div>

      {/* Processing Mode Selection */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '2rem',
        gap: '1rem'
      }}>
        <VideoProcessModeButton
          currentMode={processingMode}
          targetMode="grayscale"
          onClick={() => setProcessingMode('grayscale')}
          label="Grayscale Background"
        />
        <VideoProcessModeButton
          currentMode={processingMode}
          targetMode="blur"
          onClick={() => setProcessingMode('blur')}
          label="Blur Background"
        />
      </div>

      {/* Video Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        maxWidth: '1400px',
        margin: '0 auto 3rem'
      }}>
        {/* Original Video Card */}
        <VideoCard title="Original Video" isActive={true} animation="slideInLeft">
          <VideoPlayer
            ref={videoRef}
            src={currentVideoUrl}
            onLoadedMetadata={() => console.log('Video loaded')}
          />
        </VideoCard>

        {/* Processed Video Card */}
        <VideoCard title="Processed Video" isActive={!!processedImageUrl} animation="slideInRight">
          <div style={{
            minHeight: '300px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: processedImageUrl ? 'transparent' : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)'
          }}>
            {processedImageUrl ? (
              <img
                src={processedImageUrl}
                alt="Processed frame"
                className="video-player"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                  animation: 'fadeIn 0.3s ease-in'
                }}
              />
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280'
              }}>
                <div style={{
                  fontSize: '3rem',
                  marginBottom: '1rem'
                }}>▶️</div>
                <p style={{
                  fontSize: '1rem',
                  margin: 0
                }}>
                  Play the video to see real-time processing
                </p>
              </div>
            )}
          </div>
        </VideoCard>
      </div>

      {/* Statistics */}
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        animation: 'slideUp 0.8s ease-out'
      }}>
        <DetectionStats
          processingTime={processingTime}
          isProcessing={isProcessing}
          coverage={coverage}
          faceConfidence={confidence}
          faceDetections={faceDetections}
        />
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default App; 