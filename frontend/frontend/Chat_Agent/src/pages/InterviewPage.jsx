import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview, initInterview, submitAnswer } from "../services/apiService";
import { useAudioRecorder } from "../hooks/useAudioRecorder";
import axios from "axios";
import Header from "./Header";

// ---- Text-to-Speech (Browser API - FREE) ----
const speakText = (text) => {
  return new Promise((resolve) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Match settings from useVoiceInterview.js
      utterance.rate = 1.0;      // Same speed as questions
      utterance.pitch = 1.0;     // Same pitch as questions
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
      // Use same voice selection logic
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = 
        voices.find(v => v.name.includes('Google UK English Female')) ||
        voices.find(v => v.name.includes('Google US English')) ||
        voices.find(v => v.name.includes('Microsoft Zira')) ||
        voices.find(v => v.name.includes('Microsoft David')) ||
        voices.find(v => v.name.includes('Samantha')) ||
        voices.find(v => v.name.includes('Google')) ||
        voices.find(v => v.name.includes('Microsoft')) ||
        voices[0];
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }
      
      utterance.onend = () => resolve();
      utterance.onerror = () => resolve();
      
      window.speechSynthesis.speak(utterance);
    } else {
      console.warn('Text-to-Speech not supported');
      resolve();
    }
  });
};

const InterviewPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState("");
  const [questionNumber, setQuestionNumber] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Timer state
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  
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
  
  const navigate = useNavigate();
  const messagesEndRef = React.useRef(null);
  
  
  // Audio recording state
  const { 
    isRecording, 
    audioBlob, 
    startRecording, 
    stopRecording, 
    resetRecording,
    availableDevices,
    selectedDevice,
    setSelectedDevice
  } = useAudioRecorder();
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingTimerRef = React.useRef(null);
  const MIN_RECORDING_DURATION = 4; // seconds

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // ---- Start Interview ----
  useEffect(() => {
    const initializeInterview = async () => {
      try {
        setLoading(true);
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || !user.userId) {
          setError("User not found. Please login again.");
          setTimeout(() => navigate("/"), 2000);
          return;
        }

        const startResponse = await startInterview(user.userId);
        const newSessionId = startResponse.sessionId;
        setSessionId(newSessionId);

        const initResponse = await initInterview(newSessionId);
        const firstQuestion = initResponse.firstQuestion;

        setMessages([
          { sender: "ai", text: "Hello! I'm your AI interviewer. Let's begin!" },
          { sender: "ai", text: firstQuestion },
        ]);

        await speakText("Hello! I'm your AI interviewer. Let's begin!");
        await speakText(firstQuestion);

        setCurrentQuestionNumber(1);
        setIsTimerRunning(true); // Start the timer
      } catch (err) {
        console.error("Interview initialization error:", err);
        setError(
          err.response?.data?.detail ||
            "Failed to start interview. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    initializeInterview();
  }, [navigate]);

  // Transcribe audio using Whisper API
  const transcribeAudio = async (audioBlob) => {
    console.log('[TRANSCRIBE] Starting transcription...');
    console.log('[TRANSCRIBE] Audio blob size:', audioBlob.size, 'bytes');
    
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      console.log('[TRANSCRIBE] Sending to backend...');
      
      const response = await axios.post(
        'http://localhost:8000/api/interview/transcribe',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      console.log('[TRANSCRIBE] Response:', response.data);
      
      if (response.data.success) {
        setInput(response.data.text);
        resetRecording();
      } else {
        alert(response.data.error || 'No speech detected. Please try again.');
        resetRecording();
      }
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
      resetRecording();
    } finally {
      setIsTranscribing(false);
    }
  };

  // Auto-transcribe when recording stops
  useEffect(() => {
    if (audioBlob && !isRecording) {
      transcribeAudio(audioBlob);
    }
  }, [audioBlob, isRecording]);

  // Recording timer
  useEffect(() => {
    if (isRecording) {
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    }
    
    return () => {
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, [isRecording]);

  // Custom stop recording with minimum duration check
  const handleStopRecording = () => {
    if (recordingDuration < MIN_RECORDING_DURATION) {
      alert(`Please record for at least ${MIN_RECORDING_DURATION} seconds. Current: ${recordingDuration}s`);
      return;
    }
    stopRecording();
  };

  const handleSend = async () => {
    if (!input.trim() || loading || interviewEnded) return;

    const userAnswer = input.trim();
    setInput("");

    setMessages((prev) => [...prev, { sender: "user", text: userAnswer }]);
    setLoading(true);

    try {
      const response = await submitAnswer(
        sessionId,
        currentQuestionNumber,
        userAnswer
      );

      if (response.nextQuestion) {
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: response.nextQuestion },
        ]);

        await speakText(response.nextQuestion);
        setCurrentQuestionNumber(response.nextQuestionNumber);
      } else {
        const finalMsg =
          response.message ||
          "Thank you! The interview has been completed.";

        setMessages((prev) => [...prev, { sender: "ai", text: finalMsg }]);
        await speakText(finalMsg);
        setInterviewEnded(true);
      }
    } catch (err) {
      console.error("Submit answer error:", err);
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "Sorry, there was an error processing your answer. Please try again.",
        },
      ]);
      await speakText(
        "Sorry, there was an error processing your answer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl max-w-md text-center">
          <p className="text-gray-800 font-semibold mb-2">{error}</p>
          <button
            onClick={() => navigate("/upload")}
            className="mt-4 bg-[#6e46ae] text-white px-6 py-2 rounded-lg hover:bg-[#583a8b] transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 font-sans">
      <Header />

      <div className="mt-[138px] flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 flex flex-col h-[calc(100vh-138px)]">
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
        
        {/* Mode Selection Banner */}
        <div className="mb-4 bg-gradient-to-r from-purple-100 to-blue-100 border-2 border-purple-300 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-purple-900 mb-1">🎙️ Try Real-Time Voice Interview!</h3>
              <p className="text-sm text-purple-700">
                Experience a more natural interview with real-time voice streaming - no clicking needed!
              </p>
            </div>
            <button
              onClick={() => navigate('/voice-interview')}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              Switch to Voice Mode →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
