import React from 'react';
import { FaceDetection } from '../App';

interface DetectionStatsProps {
  processingTime: number;
  isProcessing: boolean;
  coverage: number;
  faceConfidence: number;
  faceDetections: FaceDetection[];
}

const DetectionStats: React.FC<DetectionStatsProps> = ({
  processingTime,
  isProcessing,
  coverage,
  faceConfidence,
  faceDetections
}) => {
  const fps = processingTime > 0 ? Math.round(1000 / processingTime) : 0;

  return (
    <div className="stats">
      <h3>Detection Results</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">
            {coverage > 0 ? `${Math.round(coverage * 100)}%` : '-'}
          </div>
          <div className="stat-label">Coverage</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {faceConfidence > 0 ? `${(faceConfidence * 100).toFixed(2)}%` : '-'}
          </div>
          <div className="stat-label">Confidence</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {faceDetections.length}
          </div>
          <div className="stat-label">Faces Detected</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {processingTime > 0 ? `${processingTime}ms` : '-'}
          </div>
          <div className="stat-label">Processing Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {fps > 0 ? `${fps} FPS` : '-'}
          </div>
          <div className="stat-label">Frame Rate</div>
        </div>
      </div>
    </div>
  );
};

export default DetectionStats;
