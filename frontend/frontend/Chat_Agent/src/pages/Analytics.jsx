import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';
import { getUserResults } from '../services/apiService';

const Analytics = ({ userEmail, onLogout }) => {
  const navigate = useNavigate();
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalInterviews: 0,
    averageScore: 0,
    highestScore: 0,
    lowestScore: 0,
    topStrengths: [],
    commonWeaknesses: []
  });

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        navigate('/');
        return;
      }

      const user = JSON.parse(userStr);
      if (!user || !user.userId) {
        navigate('/');
        return;
      }

      const data = await getUserResults(user.userId);
      setResults(data);
      calculateStats(data);
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data) => {
    if (!data || data.length === 0) {
      return;
    }

    const scores = data.map(r => parseInt(r.assessment?.candidate_score_percent || 0));
    const totalInterviews = data.length;
    const averageScore = Math.round(scores.reduce((a, b) => a + b, 0) / totalInterviews);
    const highestScore = Math.max(...scores);
    const lowestScore = Math.min(...scores);

    const strengthsMap = {};
    const weaknessesMap = {};

    data.forEach(result => {
      const assessment = result.assessment || {};
      
      (assessment.strengths || []).forEach(strength => {
        strengthsMap[strength] = (strengthsMap[strength] || 0) + 1;
      });

      (assessment.weaknesses || assessment.improvement_areas || []).forEach(weakness => {
        weaknessesMap[weakness] = (weaknessesMap[weakness] || 0) + 1;
      });
    });

    const topStrengths = Object.entries(strengthsMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([strength, count]) => ({ name: strength, count }));

    const commonWeaknesses = Object.entries(weaknessesMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([weakness, count]) => ({ name: weakness, count }));

    setStats({
      totalInterviews,
      averageScore,
      highestScore,
      lowestScore,
      topStrengths,
      commonWeaknesses
    });
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-400 bg-green-500/20';
    if (score >= 60) return 'text-cyan-400 bg-cyan-500/20';
    return 'text-red-400 bg-red-500/20';
  };

  const getScoreTrend = () => {
    if (results.length < 2) return null;
    
    const recentScores = results.slice(0, 5).map(r => parseInt(r.assessment?.candidate_score_percent || 0));
    const avg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    
    if (avg > stats.averageScore) {
      return { trend: 'up', text: 'Improving', color: 'text-green-400' };
    } else if (avg < stats.averageScore) {
      return { trend: 'down', text: 'Declining', color: 'text-red-400' };
    }
    return { trend: 'stable', text: 'Stable', color: 'text-white/60' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0b1a]">
        <Header userEmail={userEmail} onLogout={onLogout} />
        <div className="flex pt-[72px]">
          <Sidebar />
          <main className="flex-1 p-8">
            <div className="max-w-6xl mx-auto">
              <div className="text-center py-12">
                <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/50">Loading analytics...</p>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const trend = getScoreTrend();

  return (
    <div className="min-h-screen bg-[#0d0b1a]">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[72px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-6xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-2">
                Performance Analytics
              </h1>
              <p className="text-white/60 text-lg">
                Track your interview performance and improvement over time
              </p>
            </div>

            {results.length === 0 ? (
              <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-12 border border-[rgba(0,217,255,0.15)] text-center">
                <div className="w-20 h-20 bg-[#0d0b1a] rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">No Data Yet</h2>
                <p className="text-white/50 mb-6">Complete some interviews to see your analytics</p>
                <button
                  onClick={() => navigate('/interview')}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-cyan-600 text-white rounded-xl font-semibold hover:from-purple-500 hover:to-cyan-500 transition shadow-lg"
                >
                  Start Your First Interview
                </button>
              </div>
            ) : (
              <>
                {/* Stats Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/60 text-sm">Total Interviews</p>
                      <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-cyan-400">{stats.totalInterviews}</p>
                  </div>

                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/60 text-sm">Average Score</p>
                      <div className="w-8 h-8 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                    <div className="flex items-end gap-2">
                      <p className="text-4xl font-bold text-purple-400">{stats.averageScore}%</p>
                      {trend && (
                        <span className={`text-sm font-medium ${trend.color} mb-1`}>
                          {trend.text}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/60 text-sm">Highest Score</p>
                      <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-green-400">{stats.highestScore}%</p>
                  </div>

                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-6 border border-[rgba(0,217,255,0.15)]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-white/60 text-sm">Lowest Score</p>
                      <div className="w-8 h-8 bg-orange-500/20 rounded-lg flex items-center justify-center">
                        <svg className="w-4 h-4 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                        </svg>
                      </div>
                    </div>
                    <p className="text-4xl font-bold text-orange-400">{stats.lowestScore}%</p>
                  </div>
                </div>

                {/* Strengths & Weaknesses */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                  {/* Top Strengths */}
                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Top Strengths
                    </h2>
                    {stats.topStrengths.length > 0 ? (
                      <div className="space-y-4">
                        {stats.topStrengths.map((strength, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-white font-medium">{strength.name}</p>
                              <div className="w-full bg-[#0d0b1a] rounded-full h-2 mt-2">
                                <div 
                                  className="bg-gradient-to-r from-green-500 to-cyan-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(strength.count / stats.totalInterviews) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="ml-4 text-sm font-semibold text-green-400">
                              {strength.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-center py-8">No strengths data yet</p>
                    )}
                  </div>

                  {/* Common Weaknesses */}
                  <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                    <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                      <svg className="w-6 h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      Areas to Improve
                    </h2>
                    {stats.commonWeaknesses.length > 0 ? (
                      <div className="space-y-4">
                        {stats.commonWeaknesses.map((weakness, idx) => (
                          <div key={idx} className="flex items-center justify-between">
                            <div className="flex-1">
                              <p className="text-white font-medium">{weakness.name}</p>
                              <div className="w-full bg-[#0d0b1a] rounded-full h-2 mt-2">
                                <div 
                                  className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all"
                                  style={{ width: `${(weakness.count / stats.totalInterviews) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <span className="ml-4 text-sm font-semibold text-orange-400">
                              {weakness.count}x
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-white/30 text-center py-8">No weaknesses data yet</p>
                    )}
                  </div>
                </div>

                {/* Recent Performance */}
                <div className="bg-[#1a1633]/80 backdrop-blur-xl rounded-2xl p-8 border border-[rgba(0,217,255,0.15)]">
                  <h2 className="text-xl font-bold text-white mb-6">Recent Performance</h2>
                  <div className="space-y-4">
                    {results.slice(0, 5).map((result, idx) => {
                      const score = parseInt(result.assessment?.candidate_score_percent || 0);
                      return (
                        <div 
                          key={result.sessionId} 
                          className="flex items-center justify-between p-4 bg-[#0d0b1a]/50 border border-[rgba(0,217,255,0.1)] rounded-xl hover:border-cyan-500/30 transition cursor-pointer"
                          onClick={() => navigate(`/results/${result.sessionId}`)}
                        >
                          <div className="flex items-center gap-4">
                            <div className={`w-16 h-16 rounded-xl ${getScoreColor(score)} flex items-center justify-center`}>
                              <span className="text-2xl font-bold">{score}%</span>
                            </div>
                            <div>
                              <p className="font-semibold text-white">Interview #{results.length - idx}</p>
                              <p className="text-sm text-white/50">
                                {new Date(result.createdAt).toLocaleDateString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  year: 'numeric' 
                                })}
                              </p>
                            </div>
                          </div>
                          <svg className="w-5 h-5 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;
