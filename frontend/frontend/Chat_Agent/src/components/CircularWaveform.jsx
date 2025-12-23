import React from 'react';

/**
 * Enhanced Circular audio waveform visualization
 * Premium animated circle with advanced effects
 */
const CircularWaveform = ({ frequencyData, isActive = true, isSpeaking = false }) => {
  const barCount = frequencyData.length;
  const radius = 140;
  const centerX = 180;
  const centerY = 180;
  const barWidth = 3;

  return (
    <div className="relative flex items-center justify-center">
      {/* Slow rotating container */}
      <svg width="360" height="360" className="transform -rotate-90 animate-spin-slow">
        {/* Outer pulsing ring - ENHANCED */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 40}
          fill="none"
          stroke="url(#outerGradient)"
          strokeWidth="2"
          opacity="0.5"
        >
          <animate
            attributeName="r"
            values={`${radius + 40};${radius + 50};${radius + 40}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.5;0.8;0.5"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Secondary outer ring */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 30}
          fill="none"
          stroke="url(#secondaryGradient)"
          strokeWidth="1.5"
          opacity="0.4"
        >
          <animate
            attributeName="r"
            values={`${radius + 30};${radius + 35};${radius + 30}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Middle ring - ENHANCED */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius + 15}
          fill="none"
          stroke="url(#middleGradient)"
          strokeWidth="1"
          opacity="0.4"
        />
        
        {/* Inner background circle - ENHANCED */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 40}
          fill="url(#innerGradient)"
          opacity="0.25"
        >
          <animate
            attributeName="opacity"
            values="0.25;0.4;0.25"
            dur="2s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* Frequency bars - ENHANCED with longer range and better glow */}
        {Array.from({ length: barCount }).map((_, index) => {
          const angle = (index / barCount) * Math.PI * 2;
          const value = frequencyData[index] || 0;
          const normalizedValue = value / 255;
          
          // ENHANCED: Increased range 5-80px (was 8-60px)
          const minHeight = 5;
          const maxHeight = 80;
          const barHeight = isActive 
            ? minHeight + (normalizedValue * maxHeight * 1.2) // Extra boost
            : minHeight;
          
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
              opacity={0.7 + (normalizedValue * 0.3)}
              className="transition-all duration-150 ease-out"
              style={{
                // ENHANCED: Multi-layer glow with brighter colors
                filter: isActive 
                  ? `drop-shadow(0 0 ${5 + normalizedValue * 12}px rgba(168, 85, 247, ${0.7 + normalizedValue * 0.3}))
                     drop-shadow(0 0 ${10 + normalizedValue * 20}px rgba(59, 130, 246, ${0.4}))
                     drop-shadow(0 0 ${15 + normalizedValue * 25}px rgba(6, 182, 212, ${0.2}))` 
                  : 'none'
              }}
            />
          );
        })}
        
        {/* Center pulsing circle - ENHANCED */}
        <circle
          cx={centerX}
          cy={centerY}
          r={radius - 70}
          fill="url(#centerGradient)"
          opacity="0.6"
        >
          <animate
            attributeName="r"
            values={`${radius - 70};${radius - 60};${radius - 70}`}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            values="0.6;0.8;0.6"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
        
        {/* ENHANCED Gradients with brighter colors */}
        <defs>
          <linearGradient id="outerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#3b82f6" stopOpacity="0.8" />
            <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.9" />
          </linearGradient>
          
          <linearGradient id="secondaryGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0.7" />
          </linearGradient>
          
          <linearGradient id="middleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6" />
          </linearGradient>
          
          <linearGradient id="barGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="25%" stopColor="#8b5cf6" />
            <stop offset="50%" stopColor="#6366f1" />
            <stop offset="75%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          
          <radialGradient id="centerGradient">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.2" />
          </radialGradient>
          
          <radialGradient id="innerGradient">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </radialGradient>
        </defs>
      </svg>
      
      {/* Center status text */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {isActive ? (
            <div className="space-y-1">
              <div className="relative w-4 h-4 mx-auto">
                <div className="absolute inset-0 w-4 h-4 bg-red-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-4 h-4 bg-red-500 rounded-full shadow-lg shadow-red-500/50"></div>
              </div>
              <p className="text-xs font-bold text-purple-600 uppercase tracking-wider">Listening</p>
            </div>
          ) : isSpeaking ? (
            <div className="space-y-1">
              <div className="relative w-4 h-4 mx-auto">
                <div className="absolute inset-0 w-4 h-4 bg-blue-500 rounded-full animate-ping opacity-75"></div>
                <div className="relative w-4 h-4 bg-blue-500 rounded-full shadow-lg shadow-blue-500/50"></div>
              </div>
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Speaking</p>
            </div>
          ) : (
            <div className="space-y-1">
              <div className="w-4 h-4 bg-gray-400 rounded-full mx-auto"></div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Ready</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CircularWaveform;
