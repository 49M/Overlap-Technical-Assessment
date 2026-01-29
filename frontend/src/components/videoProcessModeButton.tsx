import React from 'react';

interface VideoProcessModeButtonProps {
  currentMode: 'grayscale' | 'blur';
  targetMode: 'grayscale' | 'blur';
  onClick: () => void;
  label: string;
}

const VideoProcessModeButton: React.FC<VideoProcessModeButtonProps> = ({
  currentMode,
  targetMode,
  onClick,
  label,
}) => {
  const isActive = currentMode === targetMode;

  return (
    <button
      onClick={onClick}
      style={{
        background: isActive
          ? 'linear-gradient(135deg, rgba(255, 53, 53, 0.9) 0%, rgba(214, 161, 161, 0.9) 100%)'
          : 'rgba(255, 255, 255, 0.75)',
        backdropFilter: 'blur(10px)',
        color: isActive ? 'white' : '#7f1d1d',
        border: `2px solid ${isActive ? 'rgba(255, 53, 53, 0.4)' : 'rgba(255, 53, 53, 0.2)'}`,
        borderRadius: '12px',
        padding: '0.75rem 2rem',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        boxShadow: isActive
          ? '0 8px 24px rgba(255, 53, 53, 0.3)'
          : '0 4px 12px rgba(0, 0, 0, 0.1)',
        textShadow: isActive ? '0 1px 2px rgba(0,0,0,0.2)' : 'none',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.transform = 'translateY(-2px)';
          e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
        }
      }}
    >
      {label}
    </button>
  );
};

export default VideoProcessModeButton;
