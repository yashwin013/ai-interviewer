import React from 'react';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';

const Analytics = ({ userEmail, onLogout }) => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Performance Analytics
              </h1>
              <p className="text-gray-600 text-lg">
                Track your progress and identify areas for improvement
              </p>
            </div>

            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50">
                <p className="text-gray-600 text-sm mb-2">Total Interviews</p>
                <p className="text-3xl font-bold text-gray-800">0</p>
              </div>
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50">
                <p className="text-gray-600 text-sm mb-2">Average Score</p>
                <p className="text-3xl font-bold text-gray-800">0%</p>
              </div>
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50">
                <p className="text-gray-600 text-sm mb-2">Best Score</p>
                <p className="text-3xl font-bold text-gray-800">0%</p>
              </div>
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/50">
                <p className="text-gray-600 text-sm mb-2">Total Time</p>
                <p className="text-3xl font-bold text-gray-800">0h</p>
              </div>
            </div>

            {/* Charts Placeholder */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Score Trends</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                  <p className="text-gray-400">Chart will appear here</p>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
                <h3 className="text-xl font-bold text-gray-800 mb-6">Skills Assessment</h3>
                <div className="h-64 flex items-center justify-center bg-gray-50 rounded-xl">
                  <p className="text-gray-400">Radar chart will appear here</p>
                </div>
              </div>
            </div>

            {/* Insights */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              <h3 className="text-xl font-bold text-gray-800 mb-6">AI Insights</h3>
              <div className="text-center py-12">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <p className="text-gray-500 text-lg font-semibold">No data available yet</p>
                <p className="text-gray-400 text-sm mt-2">Complete interviews to see personalized insights</p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Analytics;
