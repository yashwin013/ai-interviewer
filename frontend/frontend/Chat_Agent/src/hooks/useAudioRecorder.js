import { useState, useRef, useEffect } from 'react';

export const useAudioRecorder = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [availableDevices, setAvailableDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Get available microphones
  useEffect(() => {
    const getDevices = async () => {
      try {
        // Request permission first
        await navigator.mediaDevices.getUserMedia({ audio: true });
        
        // Then get devices
        const devices = await navigator.mediaDevices.enumerateDevices();
        const audioDevices = devices.filter(device => device.kind === 'audioinput');
        console.log('[AUDIO DEVICES] Found:', audioDevices);
        setAvailableDevices(audioDevices);
        
        // Set default device
        if (audioDevices.length > 0 && !selectedDevice) {
          setSelectedDevice(audioDevices[0].deviceId);
        }
      } catch (error) {
        console.error('[AUDIO DEVICES] Error getting devices:', error);
      }
    };
    
    getDevices();
  }, []);

  const startRecording = async () => {
    try {
      console.log('[AUDIO RECORDER] Starting with device:', selectedDevice);
      
      // Request microphone with specific device
      const constraints = {
        audio: {
          deviceId: selectedDevice ? { exact: selectedDevice } : undefined,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,  // Added for better volume
          sampleRate: 44100
        }
      };
      
      console.log('[AUDIO RECORDER] Constraints:', constraints);
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Log track settings
      const audioTrack = stream.getAudioTracks()[0];
      console.log('[AUDIO RECORDER] Track settings:', audioTrack.getSettings());
      console.log('[AUDIO RECORDER] Track label:', audioTrack.label);

      // Create MediaRecorder
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm'
      });

      // Collect audio chunks
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // When recording stops, create blob
      mediaRecorder.onstop = () => {
        console.log('[AUDIO RECORDER] Recording stopped');
        console.log('[AUDIO RECORDER] Audio chunks collected:', audioChunksRef.current.length);
        
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('[AUDIO RECORDER] Blob size:', blob.size, 'bytes');
        
        setAudioBlob(blob);
        audioChunksRef.current = [];
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Start recording with timeslice to collect data every 100ms
      mediaRecorder.start(100); // Collect data every 100ms
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);

    } catch (error) {
      console.error('Error starting recording:', error);
      
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permission in browser settings.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone.');
      } else if (error.name === 'OverconstrainedError') {
        alert('Selected microphone not available. Please choose a different microphone.');
      } else {
        alert('Could not access microphone: ' + error.message);
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const resetRecording = () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
  };

  return {
    isRecording,
    audioBlob,
    startRecording,
    stopRecording,
    resetRecording,
    availableDevices,
    selectedDevice,
    setSelectedDevice
  };
};
