import React from 'react';

interface VideoCardProps {
  title: string;
  isActive: boolean;
  animation: 'slideInLeft' | 'slideInRight';
  children: React.ReactNode;
}

const VideoCard: React.FC<VideoCardProps> = ({
  title,
  isActive,
  animation,
  children
}) => {
  return (
    <div
      className="video-card"
      style={{
        background: 'linear-gradient(135deg, rgba(255, 245, 245, 0.75) 0%, rgba(255, 255, 255, 0.75) 100%)',
        backdropFilter: 'blur(10px)',
        borderRadius: '16px',
        padding: '1.5rem',
        boxShadow: '0 20px 60px rgba(255, 53, 53, 0.2)',
        border: '2px solid rgba(255, 53, 53, 0.1)',
        transition: 'all 0.3s ease',
        animation: `${animation} 0.6s ease-out`
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
          background: isActive ? '#ff3535' : '#fca5a5',
          boxShadow: isActive ? '0 0 12px rgba(255, 53, 53, 0.6)' : '0 0 4px rgba(252, 165, 165, 0.4)',
          transition: 'all 0.3s ease',
          animation: isActive ? 'pulse 2s ease-in-out infinite' : 'none'
        }} />
        <h3 style={{
          margin: 0,
          fontSize: '1.25rem',
          fontWeight: '600',
          color: '#7f1d1d',
          textShadow: '0 1px 2px rgba(0,0,0,0.05)'
        }}>
          {title}
        </h3>
      </div>
      <div style={{
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        {children}
      </div>
    </div>
  );
};

export default VideoCard;
