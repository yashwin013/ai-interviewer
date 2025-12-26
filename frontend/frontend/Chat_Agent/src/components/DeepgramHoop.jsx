import React, { useRef, useEffect, useCallback } from 'react';

/**
 * Deepgram Hoop - Original Crescent Animation
 * Exact port of the TypeScript Web Component to React
 */

// Constants
const PULSE_PERIOD_SECONDS = 3;
const PULSE_SIZE_MULTIPLIER = 1.02;
const AVERAGE_ROTATION_PERIOD_SECONDS = 6;
const ROCKING_PERIOD_SECONDS = 3;
const ROCKING_TRANSITION_TIME_MS = 1000;
const DEFLATE_PULL = 2;
const DEFLATE_TRANSITION_TIME_MS = 1000;
const INFLATE_TRANSITION_TIME_MS = 300;
const CHATTER_SIZE_MULTIPLIER = 1.15;
const CHATTER_WINDOW_SIZE = 3;
const CHATTER_FRAME_LAG = 5;

// Status enum
export const VoiceBotStatus = {
  Active: 'active',
  Sleeping: 'sleeping',
  NotStarted: 'not-started',
};

// Colors
const Color = {
  springGreen: '#13ef93cc',
  magenta: '#ee028ccc',
  lightPurple: '#ae63f9cc',
  lightBlue: '#14a9fbcc',
  green: '#a1f9d4cc',
  darkBlue: '#4b3cffcc',
  purple: '#dd0070cc',
  transparent: 'transparent',
};

// Line configurations
const lines = [
  {
    segments: [
      { pct: 0.42, color: Color.transparent },
      { pct: 0.61, color: Color.magenta },
    ],
    startAngle: 3.52,
    speedMultiplier: 1.21,
    centerOffset: { x: 0.01, y: -0.01 },
    radiusOffset: 0.02,
    width: 3.38,
  },
  {
    segments: [
      { pct: 0.28, color: Color.springGreen },
      { pct: 0.62, color: Color.magenta },
      { pct: 0.8, color: Color.transparent },
    ],
    startAngle: 1.59,
    speedMultiplier: 0.64,
    centerOffset: { x: -0.03, y: -0.01 },
    radiusOffset: 0.05,
    width: 2.39,
  },
  {
    segments: [
      { pct: 0.1, color: Color.transparent },
      { pct: 0.31, color: Color.green },
      { pct: 0.45, color: Color.lightBlue },
      { pct: 0.66, color: Color.lightPurple },
    ],
    startAngle: 2.86,
    speedMultiplier: 0.94,
    centerOffset: { x: 0.02, y: 0.02 },
    radiusOffset: -0.06,
    width: 2.64,
  },
  {
    segments: [
      { pct: 0.1, color: Color.lightPurple },
      { pct: 0.5, color: Color.transparent },
      { pct: 0.9, color: Color.green },
    ],
    startAngle: 5.67,
    speedMultiplier: 1.3,
    centerOffset: { x: -0.01, y: 0.01 },
    radiusOffset: 0.04,
    width: 2.95,
  },
];

const LINE_COUNT = lines.length;

// Helper functions
const pi = (n) => Math.PI * n;
const lerp = (start, stop, amt) => amt * (stop - start) + start;
const clamp = ({ low, high }, val) => Math.min(high, Math.max(val, low));
const easeInOutQuad = (x) => x < 0.5 ? 2 * x * x : 1 - (-2 * x + 2) ** 2 / 2;

const coordsFrom = ({ x, y }, distance, angle) => ({
  x: x + distance * Math.cos(angle),
  y: y + distance * Math.sin(angle),
});

// Status-based values
const deflationDepth = (status) => {
  switch (status) {
    case VoiceBotStatus.Active: return 0;
    case VoiceBotStatus.Sleeping: return 0.65;
    case VoiceBotStatus.NotStarted: return 1;
    default: return 0;
  }
};

const rockingAngle = (status) => {
  switch (status) {
    case VoiceBotStatus.Active: return pi(1 / 15);
    case VoiceBotStatus.Sleeping: return pi(1 / 15);
    case VoiceBotStatus.NotStarted: return pi(1 / 2);
    default: return pi(1 / 15);
  }
};

const speedOf = (status) => {
  switch (status) {
    case VoiceBotStatus.Active: return 1;
    case VoiceBotStatus.Sleeping: return 0.5;
    case VoiceBotStatus.NotStarted: return 0.2;
    default: return 1;
  }
};

// Gradient creation
const makeGradient = (ctx, center, offset, angle, parts) => {
  const x1 = center.x * (1 - Math.cos(angle) + offset.x);
  const y1 = center.y * (1 - Math.sin(angle) + offset.y);
  const x2 = center.x * (1 + Math.cos(angle) + offset.x);
  const y2 = center.y * (1 + Math.sin(angle) + offset.y);
  const g = ctx.createLinearGradient(x1, y1, x2, y2);
  parts.forEach(({ pct, color }) => g.addColorStop(pct, color));
  return g;
};

// Crescent drawing function
const crescent = (ctx, center, offset, radius, deflation, strokeStyle) => {
  const bezierDistance = radius * (4 / 3) * Math.tan(pi(1 / 8));
  const adjustedCenter = {
    x: center.x * (1 + offset.x),
    y: center.y * (1 + offset.y),
  };
  
  ctx.strokeStyle = strokeStyle;
  ctx.beginPath();

  const arcStart = deflation.angle + pi(1 / 2);
  const arcEnd = deflation.angle + pi(3 / 2);
  ctx.arc(adjustedCenter.x, adjustedCenter.y, radius, arcStart, arcEnd, false);

  const start = coordsFrom(adjustedCenter, radius, arcEnd);
  const angleTowardsXAxis = pi(3 / 2) - deflation.angle;
  const distanceDownToXAxis = Math.cos(angleTowardsXAxis) * radius;
  const mid = coordsFrom(
    coordsFrom(adjustedCenter, radius, deflation.angle),
    distanceDownToXAxis * deflation.depth * DEFLATE_PULL,
    pi(1 / 2)
  );
  const end = coordsFrom(adjustedCenter, radius, arcStart);

  const bez1 = {
    cp1: coordsFrom(start, bezierDistance, arcEnd + pi(1 / 2)),
    cp2: coordsFrom(mid, bezierDistance, deflation.angle + pi(3 / 2)),
  };
  const bez2 = {
    cp1: coordsFrom(mid, bezierDistance, deflation.angle + pi(1 / 2)),
    cp2: coordsFrom(end, bezierDistance, arcStart + pi(3 / 2)),
  };

  ctx.bezierCurveTo(bez1.cp1.x, bez1.cp1.y, bez1.cp2.x, bez1.cp2.y, mid.x, mid.y);
  ctx.bezierCurveTo(bez2.cp1.x, bez2.cp1.y, bez2.cp2.x, bez2.cp2.y, end.x, end.y);
  ctx.stroke();
};

// Animation calculations
const radiusOscillation = (shape) =>
  1 + (PULSE_SIZE_MULTIPLIER - 1) * Math.sin((shape.time * pi(1)) / PULSE_PERIOD_SECONDS / 1000) * lerp(1, 0, shape.deflation);

const rollingAverage = (noise, start) => {
  const noiseWindow = noise.slice(start, start + CHATTER_WINDOW_SIZE);
  return noiseWindow.length > 0 ? noiseWindow.reduce((a, b) => a + b, 0) / noiseWindow.length : 0;
};

const speechSimulation = (shape, start) =>
  lerp(1, CHATTER_SIZE_MULTIPLIER, rollingAverage(shape.agentNoise, start));

const listeningSimulation = (shape, start) =>
  lerp(1, 1 / CHATTER_SIZE_MULTIPLIER, rollingAverage(shape.userNoise, start));

/**
 * DeepgramHoop Component - Original Animation
 */
const DeepgramHoop = ({ 
  status = VoiceBotStatus.NotStarted,
  agentVolume = 0,
  userVolume = 0,
  width = 360,
  height = 360,
}) => {
  const canvasRef = useRef(null);
  const shapeRef = useRef({
    generation: 0,
    time: 0,
    speed: speedOf(status),
    deflation: deflationDepth(status),
    rockingAngle: rockingAngle(status),
    agentNoise: Array(LINE_COUNT * CHATTER_FRAME_LAG + CHATTER_WINDOW_SIZE).fill(0),
    userNoise: Array(LINE_COUNT * CHATTER_FRAME_LAG + CHATTER_WINDOW_SIZE).fill(0),
    end: false,
  });
  const lastTimeRef = useRef(performance.now());
  const animationRef = useRef(null);
  const propsRef = useRef({ agentVolume, userVolume, status });

  // Keep props ref updated
  useEffect(() => {
    propsRef.current = { agentVolume, userVolume, status };
  }, [agentVolume, userVolume, status]);

  // Draw function
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const shape = shapeRef.current;
    if (shape.end) return;

    const now = performance.now();
    const last = lastTimeRef.current;
    lastTimeRef.current = now;
    
    // Get current props
    const { agentVolume: currentAgentVol, userVolume: currentUserVol, status: currentStatus } = propsRef.current;
    
    // Increment frame counter for slower chatter
    if (!shape.frameCount) shape.frameCount = 0;
    shape.frameCount++;
    
    // Simulate volume changes for chatter effect (every 5 frames for smoother animation)
    if (currentStatus === VoiceBotStatus.Active && shape.frameCount % 5 === 0) {
      // Push new noise values for chatter effect
      shape.agentNoise.shift();
      shape.agentNoise.push(currentAgentVol > 0 ? currentAgentVol * (0.7 + Math.random() * 0.3) : 0);
      
      shape.userNoise.shift();
      shape.userNoise.push(currentUserVol > 0 ? currentUserVol * (0.7 + Math.random() * 0.3) : 0);
    }
    
    shape.time += (now - last) * lerp(1, shape.speed, shape.deflation);
    
    ctx.clearRect(0, 0, width, height);
    ctx.filter = 'saturate(100%)';

    // Use fixed dimensions instead of getBoundingClientRect
    const center = { x: width / 2, y: height / 2 };
    const maxRadius = Math.min(center.x, center.y);

    lines.forEach((line, i) => {
      ctx.lineWidth = line.width;
      ctx.shadowColor = line.segments[0].color;
      ctx.shadowBlur = line.width * 1.1;
      
      const radius =
        maxRadius *
        0.8 *
        speechSimulation(shape, i * CHATTER_FRAME_LAG) *
        listeningSimulation(shape, i * CHATTER_FRAME_LAG) *
        radiusOscillation(shape);
      
      const gradient = makeGradient(
        ctx,
        center,
        line.centerOffset,
        line.startAngle + ((shape.time * pi(1)) / 1000 / AVERAGE_ROTATION_PERIOD_SECONDS) * line.speedMultiplier,
        line.segments
      );
      
      crescent(
        ctx,
        center,
        line.centerOffset,
        radius + line.radiusOffset * radius,
        {
          depth: easeInOutQuad(shape.deflation),
          angle: pi(3 / 2) + Math.sin((shape.time * pi(2)) / ROCKING_PERIOD_SECONDS / 1000) * shape.rockingAngle,
        },
        gradient
      );
    });

    animationRef.current = requestAnimationFrame(draw);
  }, [width, height]);

  // Initialize and start animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.width = width;
    canvas.height = height;
    
    shapeRef.current.end = false;
    lastTimeRef.current = performance.now();
    animationRef.current = requestAnimationFrame(draw);
    
    return () => {
      shapeRef.current.end = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [draw, width, height]);

  // Handle status transitions
  useEffect(() => {
    const shape = shapeRef.current;
    const targetDeflation = deflationDepth(status);
    const targetRocking = rockingAngle(status);
    
    shape.generation += 1;
    shape.speed = speedOf(status);
    
    // Animate transition
    const startTime = performance.now();
    const startDeflation = shape.deflation;
    const startRocking = shape.rockingAngle;
    
    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      
      // Deflation transition
      const deflateTime = targetDeflation > startDeflation ? DEFLATE_TRANSITION_TIME_MS : INFLATE_TRANSITION_TIME_MS;
      const deflateProgress = easeInOutQuad(clamp({ low: 0, high: 1 }, elapsed / deflateTime));
      shape.deflation = lerp(startDeflation, targetDeflation, deflateProgress);
      
      // Rocking transition
      const rockProgress = easeInOutQuad(clamp({ low: 0, high: 1 }, elapsed / ROCKING_TRANSITION_TIME_MS));
      shape.rockingAngle = lerp(startRocking, targetRocking, rockProgress);
      
      if (deflateProgress < 1 || rockProgress < 1) {
        requestAnimationFrame(animate);
      }
    };
    
    requestAnimationFrame(animate);
  }, [status]);

  // Handle agent volume
  useEffect(() => {
    const shape = shapeRef.current;
    shape.agentNoise.shift();
    shape.agentNoise.push(agentVolume);
  }, [agentVolume]);

  // Handle user volume
  useEffect(() => {
    const shape = shapeRef.current;
    shape.userNoise.shift();
    shape.userNoise.push(userVolume);
  }, [userVolume]);

  // Status info for center display
  const getStatusInfo = () => {
    switch (status) {
      case VoiceBotStatus.Active:
        if (agentVolume > 0.1) {
          return { label: 'Speaking', bgColor: 'bg-blue-500', textColor: 'text-blue-600' };
        }
        return { label: 'Listening', bgColor: 'bg-red-500', textColor: 'text-red-600' };
      case VoiceBotStatus.Sleeping:
        return { label: 'Thinking', bgColor: 'bg-purple-500', textColor: 'text-purple-600' };
      case VoiceBotStatus.NotStarted:
        return { label: 'Ready', bgColor: 'bg-gray-400', textColor: 'text-gray-500' };
      default:
        return { label: 'Ready', bgColor: 'bg-gray-400', textColor: 'text-gray-500' };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="relative flex items-center justify-center" style={{ width, height }}>
      <canvas 
        ref={canvasRef} 
        width={width} 
        height={height}
        className="absolute inset-0"
        style={{ width: `${width}px`, height: `${height}px` }}
      />
      
      {/* Center status indicator */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
        <div className="text-center">
          <div className="relative w-4 h-4 mx-auto mb-1">
            {status === VoiceBotStatus.Active ? (
              <>
                <div className={`absolute inset-0 w-4 h-4 ${statusInfo.bgColor} rounded-full animate-ping opacity-75`}></div>
                <div className={`relative w-4 h-4 ${statusInfo.bgColor} rounded-full shadow-lg`}></div>
              </>
            ) : (
              <div className={`w-4 h-4 ${statusInfo.bgColor} rounded-full mx-auto`}></div>
            )}
          </div>
          <p className={`text-xs font-bold ${statusInfo.textColor} uppercase tracking-wider`}>
            {statusInfo.label}
          </p>
        </div>
      </div>
    </div>
  );
};

export default DeepgramHoop;
