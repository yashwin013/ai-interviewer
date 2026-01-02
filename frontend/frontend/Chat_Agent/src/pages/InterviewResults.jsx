import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Header from './Header';
import { getSessionResult } from '../services/apiService';

const InterviewResults = ({ userEmail, onLogout }) => {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchResult();
  }, [sessionId]);

  const fetchResult = async () => {
    try {
      setLoading(true);
      const data = await getSessionResult(sessionId);
      setResult(data);
    } catch (err) {
      console.error('Failed to fetch result:', err);
      setError('Failed to load interview results. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'from-green-500 to-cyan-500';
    if (score >= 60) return 'from-cyan-500 to-blue-500';
    if (score >= 40) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  const getScoreLabel = (score) => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="pt-[72px] flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white/50">Loading results...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="pt-[72px] flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-red-400 font-semibold mb-4">{error || 'Results not found'}</p>
            <button
              onClick={() => navigate('/dashboard/history')}
              className="px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition"
            >
              Back to History
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assessment = result.assessment || {};
  const score = assessment.candidate_score_percent || 0;

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="pt-[72px] p-8">
        <div className="max-w-5xl mx-auto">
          {/* Back Button */}
          <button
            onClick={() => navigate('/dashboard/history')}
            className="mb-6 flex items-center gap-2 text-white/60 hover:text-cyan-400 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to History
          </button>

          {/* Header */}
          <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 mb-6 border border-[rgba(0,217,255,0.15)]">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Interview Results</h1>
                <p className="text-white/50">Session ID: {sessionId}</p>
              </div>
              <div className={`w-32 h-32 rounded-full bg-gradient-to-br ${getScoreColor(score)} flex items-center justify-center shadow-2xl`}>
                <div className="text-center">
                  <div className="text-4xl font-bold text-white">{score}%</div>
                  <div className="text-sm text-white/90">{getScoreLabel(score)}</div>
                </div>
              </div>
            </div>

            {assessment.summary && (
              <div className="bg-[#0d0b1a]/50 rounded-xl p-6 border border-[rgba(0,217,255,0.1)]">
                <h3 className="text-lg font-semibold text-white mb-3">Summary</h3>
                <p className="text-white/70 leading-relaxed">{assessment.summary}</p>
              </div>
            )}
          </div>

          {/* Strengths */}
          {assessment.strengths && assessment.strengths.length > 0 && (
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 mb-6 border border-[rgba(0,217,255,0.15)]">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-green-400">✓</span> Strengths
              </h2>
              <div className="space-y-3">
                {assessment.strengths.map((strength, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                    <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <p className="text-white/80">{strength}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weaknesses */}
          {assessment.weaknesses && assessment.weaknesses.length > 0 && (
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 mb-6 border border-[rgba(0,217,255,0.15)]">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-orange-400">⚠</span> Areas for Improvement
              </h2>
              <div className="space-y-3">
                {assessment.weaknesses.map((weakness, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                    <div className="w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                    </div>
                    <p className="text-white/80">{weakness}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {assessment.recommendations && assessment.recommendations.length > 0 && (
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 mb-6 border border-[rgba(0,217,255,0.15)]">
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
                <span className="text-cyan-400">💡</span> Recommendations
              </h2>
              <div className="space-y-3">
                {assessment.recommendations.map((recommendation, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-cyan-500/10 rounded-xl p-4 border border-cyan-500/20">
                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-cyan-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-white text-sm font-bold">{idx + 1}</span>
                    </div>
                    <p className="text-white/80">{recommendation}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => navigate('/interview')}
              className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
            >
              Start New Interview
            </button>
            <button
              onClick={() => navigate('/dashboard/history')}
              className="flex-1 py-4 bg-[#1a1633] text-white rounded-xl font-semibold hover:bg-[#1a1633]/80 transition border border-[rgba(0,217,255,0.2)]"
            >
              View All Interviews
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewResults;
