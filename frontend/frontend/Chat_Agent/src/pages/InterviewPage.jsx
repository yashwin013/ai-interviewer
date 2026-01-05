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
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
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
  const MIN_RECORDING_DURATION = 4;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const checkResumeAndInitialize = async () => {
      try {
        const user = JSON.parse(localStorage.getItem("user"));

        if (!user || !user.userId) {
          alert("User not found. Please login again.");
          navigate("/");
          return;
        }

        const resumeStatus = await getResumeStatus(user.userId);
        
        if (!resumeStatus.hasResume) {
          alert("Please upload your resume before starting an interview.");
          navigate("/dashboard");
          return;
        }

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
        setIsTimerRunning(true);
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

  const transcribeAudio = async (audioBlob) => {
    console.log('[TRANSCRIBE] Starting transcription...');
    setIsTranscribing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      
      const response = await axios.post(
        'http://localhost:8000/api/interview/transcribe',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
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

  useEffect(() => {
    if (audioBlob && !isRecording) {
      transcribeAudio(audioBlob);
    }
  }, [audioBlob, isRecording]);

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
      // Interview complete - use closing message from API
      const finalMsg =
        response.closingMessage ||
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
      <div className="min-h-screen flex items-center justify-center bg-[#0d0b1a]">
        <div className="bg-[#1a1633] p-8 rounded-2xl shadow-xl max-w-md text-center border border-[rgba(0,217,255,0.2)]">
          <p className="text-white font-semibold mb-2">{error}</p>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 transition"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#0d0b1a]">
      <Header />

      <div className="mt-[72px] flex-1 max-w-5xl mx-auto w-full p-4 md:p-6 flex flex-col h-[calc(100vh-72px)]">
        {/* Timer Display - Top Right */}
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
        
        {/* Chat Messages Container */}
        <div className="flex-1 bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl border border-[rgba(0,217,255,0.15)] p-6 mb-4 overflow-y-auto">
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
                    ? "bg-gradient-to-r from-purple-600 to-cyan-600 text-white"
                    : "bg-[#0d0b1a]/80 text-white/90 border border-[rgba(0,217,255,0.1)]"
                }`}
              >
                <p className="text-sm leading-relaxed">{msg.text}</p>
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start mb-4">
              <div className="bg-[#0d0b1a]/80 p-4 rounded-2xl border border-[rgba(0,217,255,0.1)]">
                <div className="flex gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!interviewEnded && (
          <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl border border-[rgba(0,217,255,0.15)] p-4">
            {/* Recording Controls */}
            <div className="mb-4 flex items-center justify-between bg-[#0d0b1a]/50 p-4 rounded-xl border border-[rgba(0,217,255,0.1)]">
              <div className="flex items-center gap-4">
                {!isRecording ? (
                  <button
                    onClick={startRecording}
                    disabled={isTranscribing || loading}
                    className="bg-gradient-to-r from-red-500 to-red-600 text-white p-4 rounded-full hover:from-red-400 hover:to-red-500 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                    title="Start Recording"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleStopRecording}
                    className="bg-white/10 text-white p-4 rounded-full hover:bg-white/20 transition animate-pulse border border-cyan-500/50"
                    title="Stop Recording"
                  >
                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
                
                <div>
                  <p className="text-sm font-semibold text-white">
                    {isRecording ? `Recording... ${recordingDuration}s` : 
                     isTranscribing ? 'Transcribing...' : 
                     'Click to record your answer'}
                  </p>
                  {isRecording && (
                    <p className="text-xs text-white/50">
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
                  className="px-3 py-2 bg-[#0d0b1a] border border-[rgba(0,217,255,0.2)] rounded-lg text-sm text-white"
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
                className="flex-1 px-4 py-3 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.2)] rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500/30 focus:border-cyan-500 disabled:opacity-50 text-white placeholder-white/40"
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || loading || interviewEnded}
                className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-8 py-3 rounded-xl hover:from-purple-500 hover:to-cyan-500 transition disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg"
              >
                Send
              </button>
            </div>
          </div>
        )}

        {interviewEnded && (
          <div className="bg-green-500/10 border-2 border-green-500/30 rounded-2xl p-6 text-center">
            <div className="text-green-400 text-5xl mb-4">✓</div>
            <h3 className="text-xl font-bold text-white mb-2">Interview Complete!</h3>
            <p className="text-white/60 mb-4">Generating your assessment...</p>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-500 transition"
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
