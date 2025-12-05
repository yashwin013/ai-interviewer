import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { startInterview, initInterview, submitAnswer } from "../services/apiService";

const InterviewPage = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestionNumber, setCurrentQuestionNumber] = useState(0);
  const [interviewEnded, setInterviewEnded] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  // Initialize interview on component mount
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

        // Step 1: Start interview session
        const startResponse = await startInterview(user.userId);
        const newSessionId = startResponse.sessionId;
        setSessionId(newSessionId);

        // Step 2: Initialize interview and get first question
        const initResponse = await initInterview(newSessionId);
        const firstQuestion = initResponse.firstQuestion;

        setMessages([
          { sender: "ai", text: "Hello! I'm your AI interviewer. Let's begin!" },
          { sender: "ai", text: firstQuestion }
        ]);
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

  const handleSend = async () => {
    if (!input.trim() || loading || interviewEnded) return;

    const userAnswer = input.trim();
    setInput("");
    
    // Add user message to chat
    setMessages(prev => [...prev, { sender: "user", text: userAnswer }]);
    setLoading(true);

    try {
      // Submit answer and get next question
      const response = await submitAnswer(sessionId, currentQuestionNumber, userAnswer);

      if (response.nextQuestion) {
        // Add next question to chat
        setMessages(prev => [
          ...prev,
          { sender: "ai", text: response.nextQuestion }
        ]);
        setCurrentQuestionNumber(response.nextQuestionNumber);
      } else {
        // Interview ended
        setMessages(prev => [
          ...prev,
          { sender: "ai", text: response.message || "Thank you! The interview has been completed." }
        ]);
        setInterviewEnded(true);
      }
    } catch (err) {
      console.error("Submit answer error:", err);
      setMessages(prev => [
        ...prev,
        { 
          sender: "ai", 
          text: "Sorry, there was an error processing your answer. Please try again." 
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-md max-w-md">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => navigate("/upload")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-100 p-4">
      <h1 className="text-3xl font-bold text-gray-700">Interview Started 🎤</h1>
      <p className="text-gray-600 mt-2">Your interview session is now live.</p>
      
      <div className="w-full max-w-lg bg-white shadow-md rounded-xl mt-6 flex flex-col h-[70vh]">
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg max-w-[80%] ${
                msg.sender === "user"
                  ? "ml-auto bg-blue-500 text-white"
                  : "mr-auto bg-gray-200 text-gray-700"
              }`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="mr-auto bg-gray-200 text-gray-700 p-3 rounded-lg max-w-[80%]">
              <span className="animate-pulse">Thinking...</span>
            </div>
          )}
        </div>
        
        <div className="p-3 border-t bg-gray-50 flex items-center gap-2">
          <input
            type="text"
            placeholder={interviewEnded ? "Interview completed" : "Type your answer..."}
            className="flex-1 border border-gray-300 px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            disabled={loading || interviewEnded}
          />
          <button
            onClick={handleSend}
            disabled={loading || interviewEnded || !input.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
      </div>

      {interviewEnded && (
        <button
          onClick={() => navigate("/upload")}
          className="mt-4 bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
        >
          Back to Dashboard
        </button>
      )}
    </div>
  );
};

export default InterviewPage;

