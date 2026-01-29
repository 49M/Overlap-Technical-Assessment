import React from 'react';

interface EffectControlsProps {
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
  disabled?: boolean;
}

export const EffectControls: React.FC<EffectControlsProps> = ({
  enabled,
  onToggle,
  disabled = false
}) => {
  return (
    <div className="effect-controls" style={{ margin: '20px 0' }}>
      <button
        onClick={() => onToggle(!enabled)}
        disabled={disabled}
        style={{
          padding: '12px 24px',
          fontSize: '16px',
          fontWeight: 'bold',
          color: enabled ? '#fff' : '#333',
          backgroundColor: enabled ? '#4CAF50' : '#f0f0f0',
          border: enabled ? '2px solid #45a049' : '2px solid #ccc',
          borderRadius: '8px',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.3s ease',
          boxShadow: enabled ? '0 4px 6px rgba(76, 175, 80, 0.3)' : '0 2px 4px rgba(0, 0, 0, 0.1)'
        }}
      >
        {enabled ? '✓ Grayscale Background: ON' : 'Grayscale Background: OFF'}
      </button>

      {disabled && (
        <p style={{ color: '#666', fontSize: '14px', marginTop: '8px' }}>
          Waiting for model to load...
        </p>
      )}

      {enabled && !disabled && (
        <p style={{ color: '#4CAF50', fontSize: '14px', marginTop: '8px' }}>
          Background effect is active. Person remains in color.
        </p>
      )}
    </div>
  );
};
