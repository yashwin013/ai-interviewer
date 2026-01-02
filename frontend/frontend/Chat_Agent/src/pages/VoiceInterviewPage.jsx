import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startInterview, getResumeStatus } from '../services/apiService';
import { useVoiceInterview } from '../hooks/useVoiceInterview';
import { useAudioVisualizer } from '../hooks/useAudioVisualizer';
import DeepgramHoop, { VoiceBotStatus } from '../components/DeepgramHoop';
import Header from './Header';

const VoiceInterviewPage = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [sessionId, setSessionId] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const hasInitialized = React.useRef(false);
  const hasStartedRecording = React.useRef(false);
  
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
    audioStream,
    isSpeaking,
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
        
        const resumeStatus = await getResumeStatus(user.userId);
        
        if (!resumeStatus.hasResume) {
          alert('Please upload your resume before starting an interview.');
          navigate('/dashboard');
          return;
        }
        
        const response = await startInterview(user.userId);
        const newSessionId = response.sessionId;
        
        console.log('[INIT] Session created:', newSessionId);
        setSessionId(newSessionId);
        
      } catch (err) {
        console.error('[INIT] Failed to create session:', err);
        alert('Failed to start interview. Please try again.');
        navigate('/dashboard');
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
        setIsTimerRunning(true);
      }, 1000);
    }
  }, [isConnected, isRecording, isComplete, startRecording]);
  
  // Handle interview completion
  useEffect(() => {
    if (isComplete && assessment) {
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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b1a]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-purple-500 mx-auto mb-4"></div>
          <p className="text-white/60 font-semibold">Initializing interview...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b1a]">
        <div className="bg-[#1a1633] p-8 rounded-2xl shadow-xl max-w-md text-center border border-[rgba(0,217,255,0.2)]">
          <div className="text-red-400 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-white/60 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }
  
  if (isComplete) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b1a]">
        <div className="bg-[#1a1633] p-8 rounded-2xl shadow-xl max-w-md text-center border border-[rgba(0,217,255,0.2)]">
          <div className="text-green-400 text-6xl mb-4">✓</div>
          <h2 className="text-2xl font-bold text-white mb-2">Interview Complete!</h2>
          <p className="text-white/60 mb-4">
            Thank you for completing the interview. Your assessment has been generated.
          </p>
          {assessment && (
            <div className="bg-cyan-500/10 p-4 rounded-lg mb-4 border border-cyan-500/30">
              <p className="text-lg font-bold text-cyan-400">
                Score: {assessment.candidate_score_percent}%
              </p>
              <p className="text-sm text-cyan-400/70 mt-1">
                {assessment.hiring_recommendation}
              </p>
            </div>
          )}
          <p className="text-sm text-white/40">Redirecting to results...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col bg-[#0d0b1a] relative overflow-hidden">
      <style>{`
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
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-pulse-ring { animation: pulse-ring 1.5s ease-in-out infinite; }
      `}</style>

      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-float"></div>
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 right-1/3 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <Header userEmail={userEmail} onLogout={onLogout} />
      
      {/* Timer Display */}
      {sessionId && (
        <div className="fixed top-[84px] right-6 z-50">
          <div className="bg-[#1a1633]/90 backdrop-blur-lg rounded-2xl shadow-xl px-6 py-3 border border-[rgba(0,217,255,0.2)]">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs text-white/50 font-medium">Interview Time</p>
                <p className="text-2xl font-bold text-cyan-400">
                  {formatTime(elapsedTime)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="mt-[72px] flex-1 flex items-center justify-center p-4">
        <div className="max-w-2xl w-full">
          {/* Main Interview Card */}
          <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-3xl shadow-2xl p-12 animate-fade-in border border-[rgba(0,217,255,0.15)]">
            
            {/* Connection Status Bar */}
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-[rgba(0,217,255,0.1)]">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-white/30'}`}></div>
                  {isConnected && (
                    <>
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-pulse-ring"></div>
                      <div className="absolute inset-0 w-3 h-3 rounded-full bg-green-500 animate-pulse-ring" style={{animationDelay: '0.5s'}}></div>
                    </>
                  )}
                </div>
                <span className="text-sm font-semibold text-white">
                  {isConnected ? '🟢 Connected' : '⚪ Connecting...'}
                </span>
              </div>
              
              <div className="flex items-center gap-2 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 px-4 py-2 rounded-full border border-purple-500/30">
                <span className="text-sm text-white/70 font-medium">Question</span>
                <span className="text-2xl font-bold text-cyan-400">
                  {questionNumber}
                </span>
              </div>
            </div>
            
            {/* Deepgram Hoop Waveform */}
            <div className="flex flex-col items-center justify-center py-8">
              <DeepgramHoop 
                status={
                  !isConnected ? VoiceBotStatus.NotStarted :
                  isSpeaking ? VoiceBotStatus.Active :
                  isRecording ? VoiceBotStatus.Active :
                  VoiceBotStatus.Sleeping
                }
                agentVolume={isSpeaking ? 0.6 + Math.random() * 0.4 : 0}
                userVolume={isRecording && !isSpeaking && frequencyData.length > 0 
                  ? Math.min(1, (frequencyData.reduce((a, b) => a + b, 0) / frequencyData.length / 128)) 
                  : 0}
                width={360}
                height={360}
              />
              
              {/* Status Text */}
              <div className="mt-8 text-center">
                {!isSpeaking && isRecording ? (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-xl font-semibold text-cyan-400">
                      Listening
                    </p>
                  </div>
                ) : !isConnected ? (
                  <div className="space-y-2 animate-fade-in">
                    <p className="text-xl font-semibold text-white/60">
                      Connecting...
                    </p>
                  </div>
                ) : null}
              </div>
            </div>
            
            {/* End Interview Button */}
            {isConnected && (
              <div className="mt-6 flex justify-center">
                <button
                  onClick={() => {
                    if (window.confirm('Are you sure you want to end the interview? Your progress will be saved and an assessment will be generated.')) {
                      endInterview();
                    }
                  }}
                  className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                  </svg>
                  End Interview
                </button>
              </div>
            )}
          </div>
          
          {/* Tips Card */}
          <div className="mt-6 bg-[#1a1633]/80 backdrop-blur-xl border border-[rgba(0,217,255,0.15)] rounded-2xl p-6 shadow-lg animate-fade-in" style={{animationDelay: '0.2s'}}>
            <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              <span className="text-lg">Interview Tips</span>
            </h3>
            <ul className="text-sm text-white/60 space-y-2">
              <li className="flex items-start gap-2 hover:text-white/80 transition-colors">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Listen carefully to each question</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white/80 transition-colors">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Speak naturally - the AI will automatically detect when you're done</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white/80 transition-colors">
                <span className="text-cyan-400 mt-0.5">•</span>
                <span>Pause for 3 seconds after finishing your answer</span>
              </li>
              <li className="flex items-start gap-2 hover:text-white/80 transition-colors">
                <span className="text-cyan-400 mt-0.5">•</span>
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
