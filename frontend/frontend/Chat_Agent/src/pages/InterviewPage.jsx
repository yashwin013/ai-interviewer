import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview, initInterview, submitAnswer, getResumeStatus } from "../services/apiService";
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
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [interviewEnded, setInterviewEnded] = useState(false);
  
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

  // Check if user has resume before starting interview
  useEffect(() => {
    const checkResumeAndInitialize = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || !user.userId) {
          alert("User not found. Please login again.");
          navigate("/");
          return;
        }

        // Check if user has uploaded resume
        const resumeStatus = await getResumeStatus(user.userId);
        
        if (!resumeStatus.hasResume) {
          alert("Please upload your resume before starting an interview.");
          navigate("/dashboard");
          return;
        }

        // Initialize interview
        setLoading(true);
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

    checkResumeAndInitialize();
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
            onClick={() => navigate("/dashboard")}
            className="mt-4 bg-[#6e46ae] text-white px-6 py-2 rounded-lg hover:bg-[#583a8b] transition"
          >
            Go to Dashboard
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
        
        {/* Chat Messages Container */}
        <div className="flex-1 bg-white rounded-xl shadow-lg p-6 mb-4 overflow-y-auto">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`mb-4 flex ${
                msg.sender === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[70%] p-4 rounded-2xl ${
                  msg.sender === "user"
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-gray-100 p-4 rounded-2xl">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!interviewEnded && (
          <div className="bg-white rounded-xl shadow-lg p-4">
            {/* Recording Controls */}
            <div className="mb-4 flex items-center justify-between bg-gray-50 p-4 rounded-lg">
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isTranscribing || loading}
                    className="bg-red-500 text-white p-4 rounded-full hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Start Recording"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="bg-gray-600 text-white p-4 rounded-full hover:bg-gray-700 transition animate-pulse"
                    title="Stop Recording"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                
                <div>
                  <p className="text-sm font-semibold text-gray-700">
                    {isRecording ? `Recording... ${recordingDuration}s` : 
                     isTranscribing ? 'Transcribing...' : 
                     'Click to record your answer'}
                  </p>
                  {isRecording && (
                    <p className="text-xs text-gray-500">
                      {recordingDuration < MIN_RECORDING_DURATION 
                        ? `Record for at least ${MIN_RECORDING_DURATION} seconds` 
                        : 'Click stop when done'}
                    </p>
                  )}
                </div>
              </div>

              {availableDevices.length > 1 && (
                <select
                  value={selectedDevice}
                  onChange={(e) => setSelectedDevice(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  disabled={isRecording}
                >
                  {availableDevices.map((device) => (
                    <option key={device.deviceId} value={device.deviceId}>
                      {device.label || `Microphone ${device.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Text Input */}
            <div className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSend()}
                placeholder="Type your answer or use voice recording..."
                disabled={loading || interviewEnded}
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 disabled:bg-gray-100"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || interviewEnded}
                className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-8 py-3 rounded-lg hover:shadow-lg transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {interviewEnded && (
          <div className="bg-green-50 border-2 border-green-200 rounded-xl p-6 text-center">
            <div className="text-green-600 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">Interview Complete!</h3>
            <p className="text-gray-600 mb-4">Generating your assessment...</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InterviewPage;
