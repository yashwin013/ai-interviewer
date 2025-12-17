import { useEffect, useRef, useState } from 'react';

/**
 * Custom hook for real-time audio visualization
 * Analyzes microphone input and provides frequency data for waveform display
 */
export const useAudioVisualizer = (audioStream) => {
  const [frequencyData, setFrequencyData] = useState(new Uint8Array(32));
  const analyzerRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    if (!audioStream) {
      return;
    }

    try {
      // Create audio context and analyzer
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const analyzer = audioContext.createAnalyser();
      
      // Configure analyzer for smooth visualization
      analyzer.fftSize = 64; // 32 frequency bins (fftSize / 2)
      analyzer.smoothingTimeConstant = 0.8; // Smooth transitions
      analyzer.minDecibels = -90;
      analyzer.maxDecibels = -10;

      // Connect audio stream to analyzer
      const source = audioContext.createMediaStreamSource(audioStream);
      source.connect(analyzer);

      audioContextRef.current = audioContext;
      analyzerRef.current = analyzer;

      // Animation loop to update frequency data
      const updateFrequencyData = () => {
        if (!analyzerRef.current) return;

        const dataArray = new Uint8Array(analyzerRef.current.frequencyBinCount);
        analyzerRef.current.getByteFrequencyData(dataArray);
        
        setFrequencyData(dataArray);
        animationFrameRef.current = requestAnimationFrame(updateFrequencyData);
      };

      updateFrequencyData();

      console.log('[VISUALIZER] Audio analyzer initialized');

    } catch (error) {
      console.error('[VISUALIZER] Failed to initialize:', error);
    }

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [audioStream]);

  return frequencyData;
};
