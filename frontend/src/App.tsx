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
        if (!videoRef.current || videoRef.current.paused || isProcessingFrame) {
          return;
        }

        isProcessingFrame = true;
        setIsProcessing(true);
        const startTime = performance.now();

        try {
          const blob = await captureFrame(videoRef.current);
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
          setIsProcessing(false);
          isProcessingFrame = false;
        }
      }, 50);
    };

    startProcessing();

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  return (
    <div className="container">
      <h1 style={{ textAlign: 'center', marginBottom: '20px' }}>
        Person Segmentation with Background Grayscaling
      </h1>

      <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap: 'wrap' }}>
        {/* Original Video */}
        <div>
          <h3 style={{ textAlign: 'center' }}>Original Video</h3>
          <div className="video-container" style={{ position: 'relative' }}>
            <VideoPlayer
              ref={videoRef}
              src={videoUrl}
              onLoadedMetadata={() => console.log('Video loaded')}
            />
          </div>
        </div>

        {/* Processed Video */}
        <div>
          <h3 style={{ textAlign: 'center' }}>{processedImageUrl ? 'Grayscale Video' : ''}</h3>
          <div className="video-container" style={{ position: 'relative', marginTop: '50px' }}>
            {processedImageUrl ? (
              <img
                src={processedImageUrl}
                alt="Processed frame"
                className="video-player"
              />
            ) : (
              <p style={{
                paddingLeft: '20px',
                paddingRight: '20px',
              }}>
                Play the video to see grayscaled version
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div style={{ marginTop: '30px' }}>
        <DetectionStats
          processingTime={processingTime}
          isProcessing={isProcessing}
          coverage={coverage}
          faceConfidence={confidence}
          faceDetections={faceDetections}
        />
      </div>

      {/* Backend Test Button */}
      {/* <div style={{ marginTop: '20px', textAlign: 'center' }}>
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
      </div> */}
    </div>
  );
};

export default App; 