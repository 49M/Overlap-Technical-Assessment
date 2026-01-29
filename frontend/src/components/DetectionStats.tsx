import React from 'react';
import { FaceDetection } from '../App';

// Support both face detection stats and video processing stats
interface DetectionStatsProps {
  detections?: FaceDetection[];
  processingTime: number;
  isDetecting?: boolean;
  fps?: number;
  isProcessing?: boolean;
}

const DetectionStats: React.FC<DetectionStatsProps> = ({
  detections = [],
  processingTime,
  isDetecting = false,
  fps = 0,
  isProcessing = false
}) => {
  const averageConfidence = detections.length > 0
    ? detections.reduce((sum, det) => sum + det.confidence, 0) / detections.length
    : 0;

  // Determine performance color coding
  const getFpsColor = (fpsValue: number) => {
    if (fpsValue >= 28) return '#4CAF50'; // Green - excellent
    if (fpsValue >= 24) return '#FFA726'; // Orange - acceptable
    return '#EF5350'; // Red - poor
  };

  const getProcessingTimeColor = (time: number) => {
    if (time <= 33) return '#4CAF50'; // Green - under 30fps threshold
    if (time <= 42) return '#FFA726'; // Orange - under 24fps threshold
    return '#EF5350'; // Red - too slow
  };

  // Video processing stats mode
  if (fps !== undefined && fps > 0) {
    return (
      <div className="stats">
        <h3>Performance Metrics</h3>
        <div className="stats-grid">
          <div className="stat-item">
            <div className="stat-value" style={{ color: getFpsColor(fps) }}>
              {isProcessing ? `${fps} fps` : '...'}
            </div>
            <div className="stat-label">Frame Rate</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: getProcessingTimeColor(processingTime) }}>
              {isProcessing ? `${processingTime}ms` : '...'}
            </div>
            <div className="stat-label">Processing Time</div>
          </div>
          <div className="stat-item">
            <div className="stat-value" style={{ color: '#2196F3' }}>
              {isProcessing ? 'Active' : 'Inactive'}
            </div>
            <div className="stat-label">Status</div>
          </div>
        </div>

        <div style={{ marginTop: '15px', fontSize: '14px', color: '#666' }}>
          <p>
            <strong>Target:</strong> 30fps (33ms per frame) for smooth playback
          </p>
          <p style={{ marginTop: '5px' }}>
            {fps >= 28 && '✓ Excellent performance'}
            {fps >= 24 && fps < 28 && '⚠ Acceptable performance'}
            {fps < 24 && '⚠ Performance below target'}
          </p>
        </div>
      </div>
    );
  }

  // Face detection stats mode (original functionality)
  return (
    <div className="stats">
      <h3>Detection Results</h3>
      <div className="stats-grid">
        <div className="stat-item">
          <div className="stat-value">
            {isDetecting ? '...' : detections.length}
          </div>
          <div className="stat-label">Faces Detected</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {isDetecting ? '...' : `${Math.round(averageConfidence * 100)}%`}
          </div>
          <div className="stat-label">Avg Confidence</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">
            {isDetecting ? '...' : `${processingTime}ms`}
          </div>
          <div className="stat-label">Processing Time</div>
        </div>
      </div>

      {detections.length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4>Individual Detections:</h4>
          <ul style={{ textAlign: 'left', maxWidth: '400px', margin: '0 auto' }}>
            {detections.map((detection) => (
              <li key={detection.id} style={{ margin: '5px 0' }}>
                {detection.label || `Face ${detection.id}`}: {Math.round(detection.confidence * 100)}% confidence
                <br />
                <small>
                  Position: ({detection.x}, {detection.y})
                  Size: {detection.width}x{detection.height}
                </small>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DetectionStats; 