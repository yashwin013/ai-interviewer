import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Custom hook for real-time voice interview using WebSocket and Web Audio API
 * Uses AudioWorklet for PCM audio capture compatible with Deepgram
 */
export const useVoiceInterview = (sessionId) => {
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [questionNumber, setQuestionNumber] = useState(0);
  const [error, setError] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const [audioStream, setAudioStream] = useState(null); // For visualization
  const [isSpeaking, setIsSpeaking] = useState(false); // Track when AI is speaking
  
  const wsRef = useRef(null);
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const processorRef = useRef(null);
  const lastSpokenQuestionRef = useRef(''); // Track last spoken question to prevent duplicates
  
  /**
   * Connect to WebSocket server
   */
  const connect = useCallback(() => {
    if (!sessionId) {
      setError('No session ID provided');
      return;
    }
    
    try {
      const wsUrl = `ws://localhost:8000/api/ws/voice-interview/${sessionId}`;
      console.log('[VOICE] Connecting to:', wsUrl);
      console.log('[VOICE] Creating WebSocket...');
      
      const ws = new WebSocket(wsUrl);
      
      console.log('[VOICE] WebSocket created, readyState:', ws.readyState);
      
      ws.onopen = () => {
        console.log('[VOICE] WebSocket connected');
        console.log('[VOICE] WebSocket URL:', ws.url);
        console.log('[VOICE] WebSocket readyState:', ws.readyState);
        console.log('[VOICE] WebSocket protocol:', ws.protocol);
        setIsConnected(true);
        setError(null);
      };
      
      ws.onmessage = (event) => {
        try {
          console.log('[VOICE] Raw message received:', event.data);
          const message = JSON.parse(event.data);
          console.log('[VOICE] Parsed message:', message);
          
          switch (message.type) {
            case 'question':
              setCurrentQuestion(message.text);
              setQuestionNumber(message.questionNumber);
              
              // Only speak if it's a different question (prevent duplicates)
              if (lastSpokenQuestionRef.current !== message.text) {
                lastSpokenQuestionRef.current = message.text;
                speakText(message.text);
              } else {
                console.log('[VOICE] Skipping duplicate question TTS');
              }
              break;
            
            case 'ready':
              console.log('[VOICE] System ready:', message.message);
              break;
            
            case 'complete':
              console.log('[VOICE] Interview complete');
              setIsComplete(true);
              setAssessment(message.assessment);
              stopRecording();
              break;
            
            case 'error':
              console.error('[VOICE] Server error:', message.message);
              setError(message.message);
              break;
            
            case 'transcript':
              // Optional: show interim transcripts
              console.log('[VOICE] Transcript:', message.text, message.isFinal ? '(final)' : '(interim)');
              break;
            
            case 'pong':
              // Keepalive response
              break;
            
            default:
              console.warn('[VOICE] Unknown message type:', message.type);
          }
        } catch (err) {
          console.error('[VOICE] Failed to parse message:', err);
        }
      };
      
      ws.onerror = (err) => {
        console.error('[VOICE] WebSocket error:', err);
        console.error('[VOICE] Error details:', {
          type: err.type,
          target: err.target,
          readyState: ws.readyState
        });
        setError('WebSocket connection error');
      };
      
      ws.onclose = (event) => {
        console.log('[VOICE] WebSocket closed');
        console.log('[VOICE] Close event:', {
          code: event.code,
          reason: event.reason,
          wasClean: event.wasClean
        });
        setIsConnected(false);
      };
      
      wsRef.current = ws;
      
    } catch (err) {
      console.error('[VOICE] Connection error:', err);
      setError(`Failed to connect: ${err.message}`);
    }
  }, [sessionId]);
  
  /**
   * Disconnect from WebSocket
   */
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopRecording();
  }, []);
  
  /**
   * Start recording audio using Web Audio API for PCM capture
   */
  const startRecording = useCallback(async () => {
    try {
      console.log('[VOICE] Requesting microphone access...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      
      audioStreamRef.current = stream;
      setAudioStream(stream); // Expose stream for visualization
      
      // Create Audio Context for PCM processing
      const audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000
      });
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      
      // Create ScriptProcessor for audio processing
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;
      
      processor.onaudioprocess = (e) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
          return;
        }
        
        // Get PCM data
        const inputData = e.inputBuffer.getChannelData(0);
        
        // Convert Float32 to Int16 (linear16 format for Deepgram)
        const int16Data = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp to [-1, 1] and convert to 16-bit integer
          const s = Math.max(-1, Math.min(1, inputData[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        
        // Convert to base64 and send
        const base64Audio = arrayBufferToBase64(int16Data.buffer);
        wsRef.current.send(JSON.stringify({
          type: 'audio',
          data: base64Audio
        }));
      };
      
      // Connect nodes
      source.connect(processor);
      processor.connect(audioContext.destination);
      
      setIsRecording(true);
      console.log('[VOICE] Recording started with PCM capture');
      
    } catch (err) {
      console.error('[VOICE] Failed to start recording:', err);
      setError(`Microphone error: ${err.message}`);
    }
  }, []);
  
  /**
   * Stop recording audio
   */
  const stopRecording = useCallback(() => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach(track => track.stop());
      audioStreamRef.current = null;
    }
    
    setAudioStream(null); // Clear stream for visualization
    setIsRecording(false);
  }, []);
  
  /**
   * Convert ArrayBuffer to Base64
   */
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  };
  
  /**
   * Speak text using browser TTS
   * Customize these values to change the AI's voice:
   * - rate: 0.1 (very slow) to 10 (very fast) - default: 1
   * - pitch: 0 (very low) to 2 (very high) - default: 1
   * - volume: 0 (silent) to 1 (full volume) - default: 1
   */
  const speakText = (text) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // ===== CUSTOMIZE VOICE HERE =====
      utterance.rate = 1.0;      // Speed: 1.0 = normal (try 0.8-1.5)
      utterance.pitch = 1.0;     // Pitch: 1.0 = normal (try 0.8-1.3)
      utterance.volume = 1;      // Volume: 1 = full volume
      utterance.lang = 'en-US';  // Language
      // ================================
      
      // Select voice - try different voices for better quality
      const voices = window.speechSynthesis.getVoices();
      
      // Priority order: Google > Microsoft > Samantha > Default
      const preferredVoice = 
        voices.find(v => v.name.includes('Google UK English Female')) ||  // Natural female
        voices.find(v => v.name.includes('Google US English')) ||         // Google voices
        voices.find(v => v.name.includes('Microsoft Zira')) ||            // Microsoft female
        voices.find(v => v.name.includes('Microsoft David')) ||           // Microsoft male
        voices.find(v => v.name.includes('Samantha')) ||                  // macOS female
        voices.find(v => v.name.includes('Google')) ||                    // Any Google
        voices.find(v => v.name.includes('Microsoft')) ||                 // Any Microsoft
        voices[0];                                                         // Fallback to first
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
        console.log('[TTS] Using voice:', preferredVoice.name);
      }
      
      // Track when AI starts speaking
      utterance.onstart = () => {
        setIsSpeaking(true);
      };
      
      // Track when AI stops speaking
      utterance.onend = () => {
        setIsSpeaking(false);
      };
      
      utterance.onerror = () => {
        setIsSpeaking(false);
      };
      
      window.speechSynthesis.speak(utterance);
    }
  };
  
  /**
   * Send end signal to server
   */
  const endInterview = useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end' }));
    }
    stopRecording();
  }, [stopRecording]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  // Load voices for TTS
  useEffect(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.getVoices();
    }
  }, []);
  
  return {
    // State
    isConnected,
    isRecording,
    currentQuestion,
    questionNumber,
    error,
    isComplete,
    assessment,
    audioStream, // For visualization
    isSpeaking, // Track when AI is speaking
    
    // Actions
    connect,
    disconnect,
    startRecording,
    stopRecording,
    endInterview
  };
};
