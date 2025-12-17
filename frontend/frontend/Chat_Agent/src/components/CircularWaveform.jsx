import React from 'react';

/**
 * Circular audio waveform visualization
 * Sophisticated animated circle that responds to voice frequency
 */
const CircularWaveform = ({ frequencyData, isActive = true, isSpeaking = false }) => {
  const barCount = frequencyData.length;
  const radius = 140; // Larger circle radius
  const centerX = 180;
  const centerY = 180;
  const barWidth = 3;

  return (
    <div className="relative flex items-center justify-center">
      <svg width="360" height="360" className="transform -rotate-90">
        {/* Outer pulsing ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 30}
          fill="none"
          stroke="url(#outerGradient)"
          strokeWidth="1"
          opacity="0.3"
        >
          <animate
            attributeName="r"
            values={`${radius + 30};${radius + 35};${radius + 30}`}
            dur="2s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.3;0.6;0.3"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Middle ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 15}
          fill="none"
          stroke="url(#middleGradient)"
          strokeWidth="0.5"
          opacity="0.2"
        />
        
        {/* Inner background circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 40}
          fill="url(#innerGradient)"
          opacity="0.15"
        >
          <animate
            attributeName="opacity"
            values="0.15;0.25;0.15"
            dur="3s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Frequency bars arranged in circle */}
        {Array.from({ length: barCount }).map((_, index) => {
          const angle = (index / barCount) * Math.PI * 2;
          const value = frequencyData[index] || 0;
          const normalizedValue = value / 255;
          
          // Calculate bar height with longer bars
          const minHeight = 8;
          const maxHeight = 60; // Much longer bars
          const barHeight = isActive 
            ? minHeight + (normalizedValue * maxHeight)
            : minHeight;
          
          // Calculate positions
          const innerRadius = radius - 30;
          const outerRadius = innerRadius + barHeight;
          
          const x1 = centerX + Math.cos(angle) * innerRadius;
          const y1 = centerY + Math.sin(angle) * innerRadius;
          const x2 = centerX + Math.cos(angle) * outerRadius;
          const y2 = centerY + Math.sin(angle) * outerRadius;
          
          return (
            <line
              key={index}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="url(#barGradient)"
              strokeWidth={barWidth}
              strokeLinecap="round"
              opacity={0.6 + (normalizedValue * 0.4)}
              className="transition-all duration-100 ease-out"
              style={{
                filter: isActive 
                  ? `drop-shadow(0 0 ${3 + normalizedValue * 6}px rgba(168, 85, 247, ${0.4 + normalizedValue * 0.4}))` 
                  : 'none'
              }}
            />
          );
        })}
        
        {/* Center pulsing circle */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 70}
          fill="url(#centerGradient)"
          opacity="0.4"
        >
          <animate
            attributeName="r"
            values={`${radius - 70};${radius - 65};${radius - 70}`}
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Gradients */}
        <defs>
          <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.8" />
          </linearGradient>
          
          <linearGradient id="middleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.5" />
          </linearGradient>
          
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="30%" stopColor="#8b5cf6" />
            <stop offset="60%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
          
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </radialGradient>
          
          <radialGradient id="innerGradient">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.05" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Center status text - no emojis */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {isActive ? (
            <div className="space-y-1">
              <div className="w-3 h-3 bg-red-500 rounded-full mx-auto animate-pulse shadow-lg shadow-red-500/50"></div>
              <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Listening</p>
            </div>
          ) : isSpeaking ? (
            <div className="space-y-1">
              <div className="w-3 h-3 bg-blue-500 rounded-full mx-auto animate-pulse shadow-lg shadow-blue-500/50"></div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Speaking</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-3 h-3 bg-gray-400 rounded-full mx-auto"></div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircularWaveform;

