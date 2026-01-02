import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getUserResults } from '../services/apiService';

const InterviewHistory = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [timeRange, setTimeRange] = useState('all');

  useEffect(() => {
    fetchInterviews();
  }, []);

  const fetchInterviews = async () => {
    try {
      setLoading(true);
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!user || !user.userId) {
        setError('User not found. Please login again.');
        return;
      }

      const results = await getUserResults(user.userId);
      setInterviews(results);
    } catch (err) {
      console.error('Failed to fetch interviews:', err);
      setError('Failed to load interview history. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20 border-green-500/30';
    if (score >= 60) return 'text-cyan-400 bg-cyan-500/20 border-cyan-500/30';
    if (score >= 40) return 'text-yellow-400 bg-yellow-500/20 border-yellow-500/30';
    return 'text-red-400 bg-red-500/20 border-red-500/30';
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Interview History
              </h1>
              <p className="text-white/60 text-lg">
                Review your past interviews and track your progress
              </p>
            </div>

            {/* Filters */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 mb-6 border border-[rgba(0,217,255,0.15)]">
              <div className="flex items-center gap-4">
                <select 
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="px-4 py-3 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.2)] rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition text-white"
                >
                  <option value="all">All Interviews</option>
                  <option value="practice">Practice</option>
                  <option value="job">Job Applications</option>
                </select>
                <select 
                  value={timeRange}
                  onChange={(e) => setTimeRange(e.target.value)}
                  className="px-4 py-3 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.2)] rounded-xl focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition text-white"
                >
                  <option value="all">All time</option>
                  <option value="30">Last 30 days</option>
                  <option value="90">Last 3 months</option>
                  <option value="180">Last 6 months</option>
                </select>
              </div>
            </div>

            {/* Interview List */}
            <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
              {loading ? (
                <div className="text-center py-12">
                  <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-white/50">Loading interviews...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-red-400 font-semibold">{error}</p>
                  <button
                    onClick={fetchInterviews}
                    className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-500 transition"
                  >
                    Retry
                  </button>
                </div>
              ) : interviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-[#0d0b1a] rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-white/50 text-lg font-semibold">No interviews yet</p>
                  <p className="text-white/30 text-sm mt-2">Complete your first interview to see it here</p>
                  <button
                    onClick={() => navigate('/interview')}
                    className="mt-6 px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
                  >
                    Start Interview
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div 
                      key={interview.resultId} 
                      className="p-6 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.1)] rounded-xl hover:border-cyan-500/30 transition group cursor-pointer"
                      onClick={() => navigate(`/results/${interview.sessionId}`)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <h3 className="text-xl font-bold text-white group-hover:text-cyan-400 transition">
                              Mock Interview
                            </h3>
                            <span className={`px-4 py-1 rounded-full text-sm font-semibold border ${getScoreColor(interview.assessment?.candidate_score_percent || 0)}`}>
                              {interview.assessment?.candidate_score_percent || 0}%
                            </span>
                          </div>
                          
                          <p className="text-white/50 text-sm mb-3">
                            {formatDate(interview.createdAt)}
                          </p>

                          {interview.assessment?.summary && (
                            <p className="text-white/70 mb-4 line-clamp-2">
                              {interview.assessment.summary}
                            </p>
                          )}

                          <div className="flex flex-wrap gap-2">
                            {interview.assessment?.strengths?.slice(0, 3).map((strength, idx) => (
                              <span key={idx} className="px-3 py-1 bg-green-500/10 text-green-400 rounded-lg text-sm border border-green-500/20">
                                ✓ {strength}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="ml-4">
                          <svg className="w-6 h-6 text-white/30 group-hover:text-cyan-400 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default InterviewHistory;
