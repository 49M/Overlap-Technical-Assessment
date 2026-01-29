import React, { useRef, useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import DetectionStats from './components/DetectionStats';
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

  // const pingBackend = async () => {
  //   try {
  //     const res = await fetch('http://127.0.0.1:8080/hello-world');
  //     const data = await res.text();
  //     setResponse(data);
  //     console.log('Backend response:', data);
  //   } catch (error) {
  //     console.error('Error pinging backend:', error);
  //     setResponse('Error connecting to backend');
  //   }
  // };

  const captureFrame = (video: HTMLVideoElement): Promise<Blob> => {
    const canvas = document.createElement("canvas");

    const scale = Math.min(1, 1280 / video.videoWidth);
    canvas.width = video.videoWidth * scale;
    canvas.height = video.videoHeight * scale;

    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    return new Promise<Blob>((resolve) =>
      canvas.toBlob((blob) => resolve(blob!), "image/jpeg", 0.7)
    );
  };

  const processFrame = async (blob: Blob) => {
    const formData = new FormData();
    formData.append("image", blob);

    const res = await fetch("http://127.0.0.1:8080/process-frame", {
      method: "POST",
      body: formData,
    });

    return res.json();
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    let isProcessingFrame = false;

    const startProcessing = async () => {
      interval = setInterval(async () => {
        const isPlaying = videoRef.current && !videoRef.current.paused && !videoRef.current.ended;

        // Update processing state based on video playback
        setIsProcessing(!!isPlaying);

        if (!isPlaying || isProcessingFrame) {
          return;
        }

        isProcessingFrame = true;
        const startTime = performance.now();

        try {
          const blob = await captureFrame(videoRef.current!);
          const result = await processFrame(blob);

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
  }, []);

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

      {/* Video Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
        gap: '2rem',
        maxWidth: '1400px',
        margin: '0 auto 3rem'
      }}>
        {/* Original Video Card */}
        <div
          className="video-card"
          style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 60px rgba(255, 53, 53, 0.2)',
            border: '2px solid rgba(255, 53, 53, 0.1)',
            transition: 'all 0.3s ease',
            animation: 'slideInLeft 0.6s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 53, 53, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(255, 53, 53, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 53, 53, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 53, 53, 0.1)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ff3535',
              boxShadow: '0 0 12px rgba(255, 53, 53, 0.6)',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#7f1d1d',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Original Video
            </h3>
          </div>
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}>
            <VideoPlayer
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={() => console.log('Video loaded')}
            />
          </div>
        </div>

        {/* Processed Video Card */}
        <div
          className="video-card"
          style={{
            background: 'linear-gradient(135deg, #fff5f5 0%, #ffffff 100%)',
            borderRadius: '16px',
            padding: '1.5rem',
            boxShadow: '0 20px 60px rgba(255, 53, 53, 0.2)',
            border: '2px solid rgba(255, 53, 53, 0.1)',
            transition: 'all 0.3s ease',
            animation: 'slideInRight 0.6s ease-out'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-8px)';
            e.currentTarget.style.boxShadow = '0 30px 80px rgba(255, 53, 53, 0.3)';
            e.currentTarget.style.borderColor = 'rgba(255, 53, 53, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 20px 60px rgba(255, 53, 53, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(255, 53, 53, 0.1)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '1rem',
            gap: '0.75rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: processedImageUrl ? '#ff3535' : '#fca5a5',
              boxShadow: processedImageUrl ? '0 0 12px rgba(255, 53, 53, 0.6)' : '0 0 4px rgba(252, 165, 165, 0.4)',
              transition: 'all 0.3s ease',
              animation: processedImageUrl ? 'pulse 2s ease-in-out infinite' : 'none'
            }} />
            <h3 style={{
              margin: 0,
              fontSize: '1.25rem',
              fontWeight: '600',
              color: '#7f1d1d',
              textShadow: '0 1px 2px rgba(0,0,0,0.05)'
            }}>
              Processed Video
            </h3>
          </div>
          <div style={{
            borderRadius: '12px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
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
        </div>
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