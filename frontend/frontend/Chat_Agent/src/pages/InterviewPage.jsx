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
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 1;
      utterance.lang = 'en-US';
      
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
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [error, setError] = useState("");
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
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col flex-1 border border-gray-100">
          <div className="bg-[#2a164b] p-4 flex items-center justify-between shadow-md z-10">
            <h1 className="text-white font-bold text-lg">Voice Interview Session</h1>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex w-full ${
                  msg.sender === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`p-4 rounded-2xl text-sm shadow-sm ${
                    msg.sender === "user"
                      ? "bg-[#6e46ae] text-white"
                      : "bg-white border border-gray-100 text-gray-800"
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            ))}
            {loading && (
              <p className="text-gray-400 text-sm animate-pulse">AI is typing...</p>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Voice-Only Input Section */}
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex flex-col gap-3">
              {/* Microphone Selector - Always show if devices available */}
              {availableDevices.length > 0 && (
                <div>
                  <label className="text-sm text-gray-600 mb-1 block font-semibold">🎤 Microphone:</label>
                  <select
                    value={selectedDevice || ''}
                    onChange={(e) => setSelectedDevice(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm bg-white hover:border-purple-400 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                    disabled={isRecording}
                  >
                    {availableDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${device.deviceId.substring(0, 8)}`}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Select the correct microphone if audio isn't being captured</p>
                </div>
              )}
              
              {/* Recording Button */}
              <button
                onClick={isRecording ? handleStopRecording : startRecording}
                disabled={loading || interviewEnded || isTranscribing}
                className={`w-full py-4 rounded-full font-semibold transition-all text-lg ${
                  isRecording
                    ? 'bg-red-500 text-white animate-pulse'
                    : 'bg-purple-500 text-white hover:bg-purple-600'
                } ${(loading || interviewEnded || isTranscribing) ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isRecording 
                  ? `⏹️ Stop Recording (${recordingDuration}s${recordingDuration < MIN_RECORDING_DURATION ? ` - min ${MIN_RECORDING_DURATION}s` : ''})` 
                  : '🎤 Start Speaking'}
              </button>
              
              {/* Transcription Status */}
              {isTranscribing && (
                <div className="text-center text-gray-600 animate-pulse py-2 font-medium">
                  🔄 Transcribing your answer...
                </div>
              )}
              
              {/* Transcribed Text Preview */}
              {input && !isTranscribing && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2 font-semibold">You said:</p>
                  <p className="text-gray-800 mb-3">{input}</p>
                  
                  <button
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                    className="w-full bg-[#00c0b3] text-white py-3 rounded-lg font-semibold hover:bg-[#00a89d] transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ✓ Submit Answer
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
