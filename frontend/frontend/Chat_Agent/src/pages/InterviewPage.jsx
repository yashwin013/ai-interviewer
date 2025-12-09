import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview, initInterview, submitAnswer } from "../services/apiService";
import Header from "./Header";

// ---- Speech To Text (Browser API) ----
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

let recognition;
if (SpeechRecognition) {
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = "en-US";
}

// ---- Natural Voice (OpenAI Text → Speech) ----
const speakWithOpenAI = async (text) => {
  try {
    const response = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "alloy", // natural male voice
        input: text,
      }),
    });

    const audioBlob = await response.blob();
    const audioUrl = URL.createObjectURL(audioBlob);

    const audio = new Audio(audioUrl);
    audio.play();
  } catch (error) {
    console.error("TTS Error:", error);
  }
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

        // Show & Speak
        setMessages([
          { sender: "ai", text: "Hello! I'm your AI interviewer. Let's begin!" },
          { sender: "ai", text: firstQuestion },
        ]);

        await speakWithOpenAI("Hello! I'm your AI interviewer. Let's begin!");
        await speakWithOpenAI(firstQuestion);

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

  // ---- Speech Recognition Start ----
  const startListening = () => {
    if (!recognition) {
      alert("Speech Recognition not supported in this browser.");
      return;
    }

    recognition.start();

    recognition.onresult = (event) => {
      const speechText = event.results[0][0].transcript;
      setInput(speechText);
    };

    recognition.onerror = (event) => {
      console.log("Speech Recognition Error:", event.error);
    };
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

        await speakWithOpenAI(response.nextQuestion);
        setCurrentQuestionNumber(response.nextQuestionNumber);
      } else {
        const finalMsg =
          response.message ||
          "Thank you! The interview has been completed.";

        setMessages((prev) => [...prev, { sender: "ai", text: finalMsg }]);

        await speakWithOpenAI(finalMsg);

        setInterviewEnded(true);
        console.log("dxfcgvhbnm");
        
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
      await speakWithOpenAI(
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
            <h1 className="text-white font-bold text-lg">Interview Session</h1>
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
          <div className="p-4 bg-white border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                onClick={startListening}
                className="bg-purple-200 text-purple-800 p-4 rounded-full hover:bg-purple-300 transition shadow-md"
              >
                🎤
              </button>

              <input
                type="text"
                placeholder="Speak or type your answer..."
                className="flex-1 bg-gray-50 border border-gray-200 px-6 py-4 rounded-full"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                disabled={loading || interviewEnded}
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-[#00c0b3] text-white p-4 rounded-full shadow-md"
              >
                ➤
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewPage;
