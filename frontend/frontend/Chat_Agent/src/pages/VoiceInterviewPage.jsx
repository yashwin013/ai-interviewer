import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startInterview } from '../services/apiService';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import CircularWaveform from '../components/CircularWaveform';
import Header from './Header';

const VoiceInterviewPage = () => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = React.useRef(false); // Prevent duplicate initialization
  const hasStartedRecording = React.useRef(false); // Prevent duplicate recording
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
  const {
    isConnected,
    isRecording,
    currentQuestion,
    questionNumber,
    error,
    isComplete,
    assessment,
    audioStream, // For visualization
    isSpeaking, // Track when AI is speaking
    connect,
    disconnect,
    startRecording,
    stopRecording,
    endInterview
  } = useVoiceInterview(sessionId);
  
  // Timer effect
  useEffect(() => {
    let interval;
    if (isTimerRunning && !isComplete) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning, isComplete]);
  
  // Format time as MM:SS
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Get real-time frequency data for visualization
  const frequencyData = useAudioVisualizer(audioStream);
  
  // Initialize interview session (only once)
  useEffect(() => {
    // Prevent duplicate initialization in React Strict Mode
    if (hasInitialized.current) {
      return;
    }
    
    hasInitialized.current = true;
    
    const initializeSession = async () => {
      try {
        const user = JSON.parse(localStorage.getItem('user'));
        
        if (!user || !user.userId) {
          alert('User not found. Please login again.');
          navigate('/');
          return;
        }
        
        // Create interview session
        const response = await startInterview(user.userId);
        const newSessionId = response.sessionId;
        
        console.log('[INIT] Session created:', newSessionId);
        setSessionId(newSessionId);
        
      } catch (err) {
        console.error('[INIT] Failed to create session:', err);
        alert('Failed to start interview. Please try again.');
        navigate('/upload');
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeSession();
  }, [navigate]);
  
  // Connect to WebSocket when session is ready
  useEffect(() => {
    if (sessionId && !isConnected && !isInitializing) {
      console.log('[INIT] Connecting to WebSocket...');
      connect();
    }
  }, [sessionId, isConnected, isInitializing, connect]);
  
  // Auto-start recording when connected (only once)
  useEffect(() => {
    if (isConnected && !isRecording && !isComplete && !hasStartedRecording.current) {
      hasStartedRecording.current = true;
      console.log('[INIT] Auto-starting recording...');
      setTimeout(() => {
        startRecording();
        setIsTimerRunning(true); // Start the timer
      }, 1000);
    }
  }, [isConnected, isRecording, isComplete, startRecording]);
  
  // Handle interview completion
  useEffect(() => {
    if (isComplete && assessment) {
      // Navigate to results after a delay
      setTimeout(() => {
        navigate('/results');
      }, 5000);
    }
  }, [isComplete, assessment, navigate]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);
  
  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Initializing interview...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
          <div className="text-red-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-gray-800 mb-2">Connection Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/upload')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
          <div className="text-green-500 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Interview Complete!</h2>
          <p className="text-gray-600 mb-4">
            Thank you for completing the interview. Your assessment has been generated.
          </p>
          {assessment && (
            <div className="bg-blue-50 p-4 rounded-lg mb-4">
              <p className="text-lg font-bold text-blue-900">
                Score: {assessment.candidate_score_percent}%
              </p>
              <p className="text-sm text-blue-700 mt-1">
                {assessment.hiring_recommendation}
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500">Redirecting to results...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Animated Background Elements */}
      <style>{`
        @keyframes gradient-shift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-20px); }
        }
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient-shift 8s ease infinite;
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-pulse-ring { animation: pulse-ring 2s ease-in-out infinite; }
      `}</style>

      <Header />
      
      {/* Timer Display - Top Right */}
      {sessionId && (
        <div className="fixed top-[150px] right-6 z-50">
          <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl px-6 py-3 border border-purple-200 hover:shadow-2xl transition-all">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-gray-500 font-medium">Interview Time</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {formatTime(elapsedTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-[138px] flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Main Interview Card */}
          <div className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl p-12 animate-fade-in border border-white/50">
            
            {/* Connection Status Bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  {isConnected && (
                    <>
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-pulse-ring"></div>
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-pulse-ring" style={{animationDelay: '0.5s'}}></div>
                    </>
                  )}
                </div>
                <span className="text-sm font-semibold text-gray-700">
                  {isConnected ? '🟢 Connected' : '⚪ Connecting...'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-100 to-blue-100 px-4 py-2 rounded-full">
                <span className="text-sm text-gray-600 font-medium">Question</span>
                <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                  {questionNumber}
                </span>
              </div>
            </div>
            
            {/* Circular Waveform - Center of Attention */}
            <div className="flex flex-col items-center justify-center py-8 animate-float">
              <CircularWaveform 
                frequencyData={frequencyData} 
                isActive={isRecording && !isSpeaking}
                isSpeaking={isSpeaking}
              />
              
              {/* Status Text */}
              <div className="mt-8 text-center">
                {!isSpeaking && isRecording ? (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-xl font-semibold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                      Listening
                    </p>
                  </div>
                ) : !isConnected ? (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-xl font-semibold text-gray-600">
                      Connecting...
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
          
          {/* Tips Card */}
          <div className="mt-6 bg-gradient-to-r from-blue-50/80 to-purple-50/80 backdrop-blur-sm border border-blue-200/50 rounded-2xl p-6 shadow-lg animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <span className="text-lg">Interview Tips</span>
            </h3>
            <ul className="text-sm text-blue-800 space-y-2">
              <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Listen carefully to each question</span>
              </li>
              <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Speak naturally - the AI will automatically detect when you're done</span>
              </li>
              <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Pause for 3 seconds after finishing your answer</span>
              </li>
              <li className="flex items-start gap-2 hover:translate-x-1 transition-transform">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>The waveform shows your voice activity in real-time</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceInterviewPage;
