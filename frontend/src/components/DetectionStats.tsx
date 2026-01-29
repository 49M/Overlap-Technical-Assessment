import React from 'react';

// Support video processing stats
interface DetectionStatsProps {
  processingTime: number;
  fps?: number;
  isProcessing?: boolean;
}

const DetectionStats: React.FC<DetectionStatsProps> = ({
  processingTime,
  fps = 0,
  isProcessing = false
}) => {
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
};

export default DetectionStats; 