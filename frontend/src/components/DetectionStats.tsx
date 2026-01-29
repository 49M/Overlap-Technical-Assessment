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

  const StatCard = ({ icon, value, label, color }: { icon: string, value: string | number, label: string, color: string }) => (
    <div style={{
      background: 'rgba(255, 255, 255, 0.75)',
      backdropFilter: 'blur(10px)',
      borderRadius: '12px',
      padding: '1.5rem',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      transition: 'all 0.3s ease',
      cursor: 'default',
      border: '2px solid transparent',
      position: 'relative',
      overflow: 'hidden'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 12px 24px rgba(0,0,0,0.15)';
      e.currentTarget.style.borderColor = color;
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
      e.currentTarget.style.borderColor = 'transparent';
    }}>
      {/* Background decoration */}
      <div style={{
        position: 'absolute',
        top: '-20px',
        right: '-20px',
        fontSize: '4rem',
        opacity: '0.05',
        transform: 'rotate(-15deg)'
      }}>
        {icon}
      </div>

      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        marginBottom: '0.75rem'
      }}>
        <div style={{
          fontSize: '1.75rem',
          background: `linear-gradient(135deg, ${color}22 0%, ${color}44 100%)`,
          padding: '0.5rem',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minWidth: '50px',
          minHeight: '50px'
        }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{
            fontSize: '2rem',
            fontWeight: '700',
            color: '#1f2937',
            lineHeight: '1',
            marginBottom: '0.25rem'
          }}>
            {value}
          </div>
          <div style={{
            fontSize: '0.875rem',
            color: '#6b7280',
            fontWeight: '500',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {label}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{
      background: 'rgba(255,255,255,0.1)',
      backdropFilter: 'blur(10px)',
      borderRadius: '16px',
      padding: '2rem',
      border: '1px solid rgba(255,255,255,0.2)'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{
          fontSize: '1.5rem'
        }}>📊</div>
        <h3 style={{
          margin: 0,
          fontSize: '1.5rem',
          fontWeight: '600',
          color: 'white',
          textShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          Detection Analytics
        </h3>
        {isProcessing && (
          <div style={{
            marginLeft: 'auto',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            color: 'rgba(255,255,255,0.9)',
            fontSize: '0.875rem'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              animation: 'pulse 2s ease-in-out infinite'
            }} />
            Processing...
          </div>
        )}
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <StatCard
          icon="👤"
          value={coverage > 0 ? `${Math.round(coverage * 100)}%` : '-'}
          label="Person Coverage"
          color="#06b6d4"
        />
        <StatCard
          icon="🎯"
          value={faceConfidence > 0 ? `${(faceConfidence * 100).toFixed(2)}%` : '-'}
          label="Face Confidence"
          color="#8b5cf6"
        />
        <StatCard
          icon="👥"
          value={faceDetections.length}
          label="Faces Detected"
          color="#14b8a6"
        />
        <StatCard
          icon="⚡"
          value={processingTime > 0 ? `${processingTime}ms` : '-'}
          label="Processing Time"
          color="#f59e0b"
        />
        <StatCard
          icon="📹"
          value={fps > 0 ? `${fps} FPS` : '-'}
          label="Frame Rate"
          color="#6366f1"
        />
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.5;
            transform: scale(1.2);
          }
        }
      `}</style>
    </div>
  );
};

export default DetectionStats;
