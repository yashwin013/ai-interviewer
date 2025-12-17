import React from 'react';

/**
 * Real-time audio waveform visualization component
 * Displays animated bars that respond to actual audio frequency data
 */
const AudioWaveform = ({ frequencyData, isActive = true, color = 'purple' }) => {
  const barCount = frequencyData.length;

  // Color schemes
  const colorSchemes = {
    purple: {
      gradient: 'from-purple-500 via-purple-400 to-blue-500',
      glow: 'shadow-purple-500/50'
    },
    blue: {
      gradient: 'from-blue-500 via-cyan-400 to-teal-500',
      glow: 'shadow-blue-500/50'
    },
    green: {
      gradient: 'from-green-500 via-emerald-400 to-teal-500',
      glow: 'shadow-green-500/50'
    }
  };

  const scheme = colorSchemes[color] || colorSchemes.purple;

  return (
    <div className="flex items-center justify-center gap-1 h-24 px-4">
      {Array.from({ length: barCount }).map((_, index) => {
        // Get frequency value (0-255) and normalize to 0-1
        const value = frequencyData[index] || 0;
        const normalizedValue = value / 255;
        
        // Calculate height with minimum threshold for visual appeal
        const minHeight = 0.1;
        const height = isActive 
          ? Math.max(minHeight, normalizedValue) * 100
          : minHeight * 100;

        return (
          <div
            key={index}
            className={`
              w-1.5 rounded-full transition-all duration-75 ease-out
              bg-linear-to-t ${scheme.gradient}
              ${isActive ? `shadow-lg ${scheme.glow}` : 'opacity-30'}
            `}
            style={{
              height: `${height}%`,
              transform: `scaleY(${isActive ? 1 : 0.3})`,
              opacity: isActive ? 0.8 + (normalizedValue * 0.2) : 0.3,
            }}
          />
        );
      })}
    </div>
  );
};

export default AudioWaveform;
