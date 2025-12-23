import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import { getATSScore, getAITips } from '../services/apiService';

const ATSScore = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scoreData, setScoreData] = useState(null);
  const [aiTips, setAiTips] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [aiError, setAiError] = useState(null);

  useEffect(() => {
    fetchATSScore();
  }, []);

  const fetchATSScore = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/login');
        return;
      }

      const user = JSON.parse(userStr);
      if (!user || !user.userId) {
        navigate('/login');
        return;
      }

      const data = await getATSScore(user.userId);
      setScoreData(data);
    } catch (err) {
      console.error('Failed to fetch ATS score:', err);
      setError(err.response?.data?.detail || 'Failed to calculate ATS score');
    } finally {
      setLoading(false);
    }
  };

  const fetchAITips = async () => {
    try {
      setLoadingAI(true);
      setAiError(null);
      
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr);
      
      const data = await getAITips(user.userId);
      setAiTips(data);
    } catch (err) {
      console.error('Failed to fetch AI tips:', err);
      setAiError(err.response?.data?.detail || 'Failed to get AI tips');
    } finally {
      setLoadingAI(false);
    }
  };

  const getScoreColor = (percentage) => {
    if (percentage >= 85) return 'from-green-500 to-emerald-500';
    if (percentage >= 70) return 'from-blue-500 to-cyan-500';
    if (percentage >= 50) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Excellent': return 'text-green-600 bg-green-100';
      case 'Good': return 'text-blue-600 bg-blue-100';
      case 'Needs Improvement': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-red-600 bg-red-100';
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      contact_info: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      ),
      sections: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
        </svg>
      ),
      skills: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      action_verbs: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      quantified: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      length: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
      experience: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    };
    return icons[category] || icons.sections;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      {/* Animations */}
      <style>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes scale-in {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes progress-fill {
          from { width: 0; }
        }
        @keyframes count-up {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.6s ease-out; }
        .animate-scale-in { animation: scale-in 0.5s ease-out; }
        .animate-progress { animation: progress-fill 1s ease-out; }
      `}</style>

      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="pt-[138px] px-4 pb-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard/resume')}
            className="flex items-center gap-2 text-gray-600 hover:text-purple-600 transition mb-6 animate-slide-up"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Resume
          </button>

          {/* Page Title */}
          <div className="mb-8 animate-slide-up">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
              ATS Resume Analysis
            </h1>
            <p className="text-gray-600 text-lg">See how your resume performs against Applicant Tracking Systems</p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="text-center">
                <div className="w-20 h-20 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-gray-600 font-medium">Analyzing your resume...</p>
                <p className="text-gray-400 text-sm">This won't take long</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center animate-scale-in">
              <svg className="w-16 h-16 text-red-500 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <h3 className="text-xl font-bold text-red-700 mb-2">Unable to Calculate Score</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => navigate('/dashboard/resume')}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
              >
                Upload Resume
              </button>
            </div>
          ) : scoreData && (
            <div className="space-y-6">
              {/* Main Score Card */}
              <div className="bg-white rounded-3xl shadow-xl p-8 animate-scale-in">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-800">ATS Resume Score</h1>
                    <p className="text-gray-500 mt-1">Rule-based analysis of your resume</p>
                  </div>
                  <span className={`px-4 py-2 rounded-full font-semibold ${getRatingColor(scoreData.rating)}`}>
                    {scoreData.rating}
                  </span>
                </div>

                {/* Score Circle */}
                <div className="flex items-center gap-12">
                  <div className="relative w-48 h-48">
                    <svg className="w-48 h-48 transform -rotate-90">
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        fill="none"
                        stroke="#e5e7eb"
                        strokeWidth="12"
                      />
                      <circle
                        cx="96"
                        cy="96"
                        r="88"
                        fill="none"
                        stroke="url(#scoreGradient)"
                        strokeWidth="12"
                        strokeLinecap="round"
                        strokeDasharray={`${(scoreData.percentage / 100) * 553} 553`}
                        className="transition-all duration-1000 ease-out"
                      />
                      <defs>
                        <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor={scoreData.percentage >= 70 ? '#10b981' : '#f59e0b'} />
                          <stop offset="100%" stopColor={scoreData.percentage >= 70 ? '#06b6d4' : '#ef4444'} />
                        </linearGradient>
                      </defs>
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <span className="text-5xl font-bold text-gray-800">{scoreData.percentage}</span>
                        <span className="text-2xl text-gray-500">%</span>
                        <p className="text-sm text-gray-400 mt-1">{scoreData.total_score}/{scoreData.max_score} pts</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1">
                    <p className="text-lg text-gray-600 mb-4">{scoreData.summary}</p>
                    
                    {/* Quick Stats */}
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-purple-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-purple-600">{Object.keys(scoreData.breakdown).length}</p>
                        <p className="text-sm text-gray-500">Categories</p>
                      </div>
                      <div className="bg-blue-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-blue-600">{scoreData.tips.length}</p>
                        <p className="text-sm text-gray-500">Tips</p>
                      </div>
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <p className="text-2xl font-bold text-green-600">0</p>
                        <p className="text-sm text-gray-500">AI Tokens</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up" style={{animationDelay: '0.1s'}}>
                <h2 className="text-xl font-bold text-gray-800 mb-6">Score Breakdown</h2>
                
                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(scoreData.breakdown).map(([key, category], index) => (
                    <div 
                      key={key}
                      className="border border-gray-200 rounded-2xl p-5 hover:border-purple-300 hover:shadow-lg transition animate-slide-up"
                      style={{animationDelay: `${0.1 + index * 0.05}s`}}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 bg-purple-100 rounded-xl text-purple-600">
                          {getCategoryIcon(key)}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800">{category.label}</h3>
                          <p className="text-sm text-gray-500">{category.score}/{category.max} points</p>
                        </div>
                        <span className={`text-lg font-bold ${
                          category.score / category.max >= 0.8 ? 'text-green-600' :
                          category.score / category.max >= 0.5 ? 'text-yellow-600' : 'text-red-600'
                        }`}>
                          {Math.round((category.score / category.max) * 100)}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden mb-3">
                        <div 
                          className={`h-full rounded-full bg-gradient-to-r ${
                            category.score / category.max >= 0.8 ? 'from-green-500 to-emerald-400' :
                            category.score / category.max >= 0.5 ? 'from-yellow-500 to-orange-400' : 'from-red-500 to-pink-400'
                          } animate-progress`}
                          style={{width: `${(category.score / category.max) * 100}%`}}
                        ></div>
                      </div>
                      
                      {/* Details */}
                      <ul className="space-y-1">
                        {category.details.map((detail, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                            <span>{detail}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>

              {/* Improvement Tips */}
              {scoreData.tips.length > 0 && (
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-3xl shadow-xl p-8 text-white animate-slide-up" style={{animationDelay: '0.2s'}}>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="p-3 bg-white/20 rounded-xl">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h2 className="text-xl font-bold">Improvement Tips</h2>
                  </div>
                  
                  <ul className="space-y-3">
                    {scoreData.tips.map((tip, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <span className="flex-shrink-0 w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-sm font-bold">
                          {index + 1}
                        </span>
                        <span className="text-white/90">{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* AI Tips Section */}
              <div className="bg-white rounded-3xl shadow-xl p-8 animate-slide-up" style={{animationDelay: '0.25s'}}>
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl text-white">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-gray-800">AI-Powered Feedback</h2>
                      <p className="text-sm text-gray-500">Get personalized tips using AI (~250 tokens)</p>
                    </div>
                  </div>
                  
                  {!aiTips && (
                    <button
                      onClick={fetchAITips}
                      disabled={loadingAI}
                      className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg hover:shadow-xl disabled:opacity-50 flex items-center gap-2"
                    >
                      {loadingAI ? (
                        <>
                          <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Generating...
                        </>
                      ) : (
                        <>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Get AI Tips
                        </>
                      )}
                    </button>
                  )}
                </div>
                
                {aiError && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-600 text-sm">
                    {aiError}
                  </div>
                )}
                
                {aiTips && (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                        {aiTips.source === 'ai' ? '🤖 AI Generated' : '📋 Rule-Based'}
                      </span>
                      <span>• {aiTips.tokens_used || '~250'} tokens used</span>
                    </div>
                    
                    <ul className="space-y-3">
                      {aiTips.ai_tips.map((tip, index) => (
                        <li key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl border border-indigo-100">
                          <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                            {index + 1}
                          </span>
                          <span className="text-gray-700 pt-1">{tip}</span>
                        </li>
                      ))}
                    </ul>
                    
                    <p className="text-xs text-gray-400 text-center mt-4">
                      {aiTips.message}
                    </p>
                  </div>
                )}
                
                {!aiTips && !loadingAI && (
                  <p className="text-gray-500 text-center py-4">
                    Click "Get AI Tips" for personalized, AI-generated improvement suggestions.
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 animate-slide-up" style={{animationDelay: '0.3s'}}>
                <button
                  onClick={() => navigate('/dashboard/resume')}
                  className="flex-1 bg-white border-2 border-purple-600 text-purple-600 py-4 rounded-xl font-bold hover:bg-purple-50 transition"
                >
                  Update Resume
                </button>
                <button
                  onClick={fetchATSScore}
                  className="flex-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white py-4 rounded-xl font-bold hover:from-purple-700 hover:to-blue-700 transition shadow-lg"
                >
                  Recalculate Score
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ATSScore;
