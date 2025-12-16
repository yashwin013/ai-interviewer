import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ResumeSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resumeProfile } = location.state || {};

  if (!resumeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 font-sans">
        <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-md w-full animate-fade-in">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 text-lg font-semibold mb-2">No Resume Data Found</p>
          <p className="text-gray-500 mb-6">Please upload your resume to continue.</p>
          <button
            onClick={() => navigate("/upload")}
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-3 rounded-xl hover:from-purple-700 hover:to-blue-700 transition-all transform hover:scale-105 font-medium shadow-lg"
          >
            Go to Upload
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <style>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slide-in-right {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-glow {
          0%, 100% { box-shadow: 0 0 20px rgba(168, 85, 247, 0.3); }
          50% { box-shadow: 0 0 30px rgba(168, 85, 247, 0.5); }
        }
        .animate-fade-in { animation: fade-in 0.6s ease-out; }
        .animate-slide-in-left { animation: slide-in-left 0.6s ease-out; }
        .animate-slide-in-right { animation: slide-in-right 0.6s ease-out; }
        .animate-pulse-glow { animation: pulse-glow 2s ease-in-out infinite; }
      `}</style>

      <div className="max-w-5xl mx-auto">
        {/* Header Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-2xl overflow-hidden mb-8 animate-fade-in">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 px-8 py-8 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold mb-2">✨ Ready for Your Interview!</h1>
                <p className="text-white/90 text-lg">Your resume has been analyzed. Review the guidelines below.</p>
              </div>
              <div className="hidden md:block w-20 h-20 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Interview Rules Grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Before You Begin */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in-left border border-purple-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Before You Begin</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-purple-500 mt-1">•</span>
                <span>Find a <strong>quiet environment</strong> with minimal background noise</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-purple-500 mt-1">•</span>
                <span>Test your <strong>microphone</strong> to ensure clear audio</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-purple-500 mt-1">•</span>
                <span>Ensure <strong>stable internet connection</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-purple-500 mt-1">•</span>
                <span>Have your <strong>resume ready</strong> for reference</span>
              </li>
            </ul>
          </div>

          {/* During Interview */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in-right border border-blue-100">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">During Interview</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span>Speak <strong>clearly and naturally</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>Pause for 3 seconds</strong> after finishing your answer</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span>Listen carefully to <strong>each question</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-blue-500 mt-1">•</span>
                <span><strong>No clicking needed</strong> - fully automatic!</span>
              </li>
            </ul>
          </div>

          {/* Interview Format */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in-left border border-indigo-100" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Interview Format</h3>
            </div>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-indigo-500 mt-1">•</span>
                <span><strong>5-7 questions</strong> based on your resume</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-indigo-500 mt-1">•</span>
                <span>Each question <strong>builds on your answers</strong></span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-indigo-500 mt-1">•</span>
                <span>Average <strong>2-3 minutes</strong> per question</span>
              </li>
              <li className="flex items-start gap-3 text-gray-700">
                <span className="text-indigo-500 mt-1">•</span>
                <span>Total duration: <strong>15-20 minutes</strong></span>
              </li>
            </ul>
          </div>

          {/* Do's and Don'ts */}
          <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-xl p-6 hover:shadow-2xl transition-all duration-300 animate-slide-in-right border border-green-100" style={{animationDelay: '0.1s'}}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-gray-800">Do's & Don'ts</h3>
            </div>
            <div className="space-y-3">
              <div className="flex items-start gap-3 text-gray-700">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Do</strong> provide specific examples from your experience</span>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <span className="text-green-500 mt-1">✓</span>
                <span><strong>Do</strong> be honest and authentic</span>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <span className="text-red-500 mt-1">✗</span>
                <span><strong>Don't</strong> rush - take time to think</span>
              </div>
              <div className="flex items-start gap-3 text-gray-700">
                <span className="text-red-500 mt-1">✗</span>
                <span><strong>Don't</strong> interrupt the AI while it's speaking</span>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl p-8 animate-fade-in animate-pulse-glow" style={{animationDelay: '0.2s'}}>
          <button
            onClick={() => navigate("/voice-interview")}
            className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white text-xl font-bold py-6 rounded-2xl hover:from-purple-700 hover:via-blue-700 hover:to-indigo-700 transition-all shadow-2xl hover:shadow-purple-500/50 transform hover:scale-105 active:scale-95 flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
            <span>Start Voice Interview</span>
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p className="text-center text-gray-500 text-sm mt-4">
            🎯 Ready when you are! Click above to begin your mock interview.
          </p>
        </div>
      </div>
    </div>
  );
};

export default ResumeSummary;
