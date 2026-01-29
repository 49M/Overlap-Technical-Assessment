import React, { useState } from 'react';
import { BackgroundFilteredVideo, ProcessingStats } from './components/BackgroundFilteredVideo';
import { EffectControls } from './components/EffectControls';
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
  const [response, setResponse] = useState<string>('');
  const [effectEnabled, setEffectEnabled] = useState<boolean>(false);
  const [stats, setStats] = useState<ProcessingStats>({ fps: 0, processingTime: 0 });

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

  return (
    <div className="container">
      <div style={{ textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>Video Background Filter</h1>

        <BackgroundFilteredVideo
          videoUrl={videoUrl}
          effectEnabled={effectEnabled}
          onStatsUpdate={setStats}
        />

        <EffectControls
          enabled={effectEnabled}
          onToggle={setEffectEnabled}
        />

        {effectEnabled && (
          <DetectionStats
            fps={stats.fps}
            processingTime={stats.processingTime}
            isProcessing={effectEnabled}
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