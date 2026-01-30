import React from 'react';

interface GlassButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  htmlFor?: string;
  type?: 'button' | 'label';
}

const GlassButton: React.FC<GlassButtonProps> = ({
  children,
  onClick,
  htmlFor,
  type = 'button'
}) => {
  const buttonStyle: React.CSSProperties = {
    background: 'rgba(255, 255, 255, 0.75)',
    backdropFilter: 'blur(10px)',
    color: '#7f1d1d',
    border: '2px solid rgba(255, 53, 53, 0.2)',
    borderRadius: '12px',
    padding: '0.75rem 2rem',
    fontSize: '1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    display: 'inline-block'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.15)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
  };

  if (type === 'label') {
    return (
      <label
        htmlFor={htmlFor}
        style={buttonStyle}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {children}
      </label>
    );
  }

  return (
    <button
      onClick={onClick}
      style={buttonStyle}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </button>
  );
};

export default GlassButton;
