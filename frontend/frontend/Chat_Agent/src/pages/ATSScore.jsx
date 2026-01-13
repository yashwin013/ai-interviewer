import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
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

  const getRatingColor = (rating) => {
    switch (rating) {
      case 'Excellent': return 'text-green-400 bg-green-500/20 border-green-500/30';
      case 'Good': return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
      case 'Needs Improvement': return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
      default: return 'text-red-400 bg-red-500/20 border-red-500/30';
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
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-5xl mx-auto">
            {/* Back Button */}
            <button
              onClick={() => navigate('/dashboard/resume')}
              className="flex items-center gap-2 text-white/60 hover:text-cyan-400 transition mb-6"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back to Resume
            </button>

            {/* Page Title */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                ATS Resume Analysis
              </h1>
              <p className="text-white/60 text-lg">See how your resume performs against Applicant Tracking Systems</p>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-20">
                <div className="text-center">
                  <div className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/60 font-medium">Analyzing your resume...</p>
                  <p className="text-white/30 text-sm">This won't take long</p>
                </div>
              </div>
            ) : error ? (
              <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-8 text-center">
                <svg className="w-16 h-16 text-red-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <h3 className="text-xl font-bold text-red-400 mb-2">Unable to Calculate Score</h3>
                <p className="text-red-400/80 mb-4">{error}</p>
                <button
                  onClick={() => navigate('/dashboard/resume')}
                  className="bg-red-500 text-white px-6 py-2 rounded-lg hover:bg-red-400 transition"
                >
                  Upload Resume
                </button>
              </div>
            ) : scoreData && (
              <div className="space-y-6">
                {/* Main Score Card */}
                <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h1 className="text-2xl font-bold text-white">ATS Resume Score</h1>
                      <p className="text-white/50 mt-1">Rule-based analysis of your resume</p>
                    </div>
                    <span className={`px-4 py-2 rounded-full font-semibold border ${getRatingColor(scoreData.rating)}`}>
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
                          stroke="#1a1633"
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
                            <stop offset="0%" stopColor={scoreData.percentage >= 70 ? '#00d9ff' : '#f59e0b'} />
                            <stop offset="100%" stopColor={scoreData.percentage >= 70 ? '#a855f7' : '#ef4444'} />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-center">
                          <span className="text-5xl font-bold text-white">{scoreData.percentage}</span>
                          <span className="text-2xl text-white/50">%</span>
                          <p className="text-sm text-white/30 mt-1">{scoreData.total_score}/{scoreData.max_score} pts</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1">
                      <p className="text-lg text-white/70 mb-4">{scoreData.summary}</p>
                      
                      {/* Quick Stats */}
                      <div className="grid grid-cols-3 gap-4">
                        <div className="bg-[#0d0b1a]/50 rounded-xl p-4 text-center border border-[rgba(0,217,255,0.1)]">
                          <p className="text-2xl font-bold text-purple-400">{Object.keys(scoreData.breakdown).length}</p>
                          <p className="text-sm text-white/50">Categories</p>
                        </div>
                        <div className="bg-[#0d0b1a]/50 rounded-xl p-4 text-center border border-[rgba(0,217,255,0.1)]">
                          <p className="text-2xl font-bold text-cyan-400">{scoreData.tips.length}</p>
                          <p className="text-sm text-white/50">Tips</p>
                        </div>
                        <div className="bg-[#0d0b1a]/50 rounded-xl p-4 text-center border border-[rgba(0,217,255,0.1)]">
                          <p className="text-2xl font-bold text-green-400">0</p>
                          <p className="text-sm text-white/50">AI Tokens</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Category Breakdown */}
                <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                  <h2 className="text-xl font-bold text-white mb-6">Score Breakdown</h2>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {Object.entries(scoreData.breakdown).map(([key, category], index) => (
                      <div 
                        key={key}
                        className="bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.1)] rounded-xl p-5 hover:border-cyan-500/30 transition"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                            {getCategoryIcon(key)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-white">{category.label}</h3>
                            <p className="text-sm text-white/50">{category.score}/{category.max} points</p>
                          </div>
                          <span className={`text-lg font-bold ${
                            category.score / category.max >= 0.8 ? 'text-green-400' :
                            category.score / category.max >= 0.5 ? 'text-yellow-400' : 'text-red-400'
                          }`}>
                            {Math.round((category.score / category.max) * 100)}%
                          </span>
                        </div>
                        
                        {/* Progress Bar */}
                        <div className="h-2 bg-[#0d0b1a] rounded-full overflow-hidden mb-3">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${
                              category.score / category.max >= 0.8 ? 'from-green-500 to-cyan-400' :
                              category.score / category.max >= 0.5 ? 'from-yellow-500 to-orange-400' : 'from-red-500 to-pink-400'
                            }`}
                            style={{width: `${(category.score / category.max) * 100}%`}}
                          ></div>
                        </div>
                        
                        {/* Details */}
                        <ul className="space-y-1">
                          {category.details.map((detail, i) => (
                            <li key={i} className="text-sm text-white/60 flex items-start gap-1">
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
                  <div className="bg-gradient-to-r from-purple-600/80 to-cyan-600/80 backdrop-blur-xl rounded-2xl p-8 text-white">
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

                {/* AI Tips Section
                <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-xl text-white">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">AI-Powered Feedback</h2>
                        <p className="text-sm text-white/50">Get personalized tips using AI (~250 tokens)</p>
                      </div>
                    </div>
                    
                    {!aiTips && (
                      <button
                        onClick={fetchAITips}
                        disabled={loadingAI}
                        className="bg-gradient-to-r from-purple-600 to-cyan-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg disabled:opacity-50 flex items-center gap-2"
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
                    <div className="bg-red-500/20 border border-red-500/30 rounded-xl p-4 text-red-400 text-sm">
                      {aiError}
                    </div>
                  )}
                  
                  {aiTips && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-white/50 mb-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-400 rounded-full text-xs font-medium border border-purple-500/30">
                          {aiTips.source === 'ai' ? '🤖 AI Generated' : '📋 Rule-Based'}
                        </span>
                        <span>• {aiTips.tokens_used || '~250'} tokens used</span>
                      </div>
                      
                      <ul className="space-y-3">
                        {aiTips.ai_tips.map((tip, index) => (
                          <li key={index} className="flex items-start gap-3 p-4 bg-gradient-to-r from-purple-500/10 to-cyan-500/10 rounded-xl border border-purple-500/20">
                            <span className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                              {index + 1}
                            </span>
                            <span className="text-white/80 pt-1">{tip}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <p className="text-xs text-white/30 text-center mt-4">
                        {aiTips.message}
                      </p>
                    </div>
                  )}
                  
                  {!aiTips && !loadingAI && (
                    <p className="text-white/40 text-center py-4">
                      Click "Get AI Tips" for personalized, AI-generated improvement suggestions.
                    </p>
                  )}
                </div> */}

              {/*   Action Buttons */}
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate('/dashboard/resume')}
                    className="flex-1 bg-[#1a1633] border border-cyan-500/30 text-cyan-400 py-4 rounded-xl font-bold hover:bg-cyan-500/10 transition"
                  >
                    Update Resume
                  </button>
                  <button
                    onClick={fetchATSScore}
                    className="flex-1 bg-gradient-to-r from-purple-600 to-cyan-600 text-white py-4 rounded-xl font-bold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
                  >
                    Recalculate Score
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ATSScore;
