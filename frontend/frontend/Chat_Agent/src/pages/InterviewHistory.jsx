import React from 'react';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';

const InterviewHistory = ({ userEmail, onLogout }) => {
  // Mock data - will be replaced with API
  const interviews = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Interview History
              </h1>
              <p className="text-gray-600 text-lg">
                Review your past interviews and track your progress
              </p>
            </div>

            {/* Filters */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <div className="flex items-center gap-4">
                <select className="px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition">
                  <option>All Interviews</option>
                  <option>Practice</option>
                  <option>Job Applications</option>
                </select>
                <select className="px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition">
                  <option>Last 30 days</option>
                  <option>Last 3 months</option>
                  <option>Last 6 months</option>
                  <option>All time</option>
                </select>
              </div>
            </div>

            {/* Interview List */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              {interviews.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-semibold">No interviews yet</p>
                  <p className="text-gray-400 text-sm mt-2">Complete your first interview to see it here</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {interviews.map((interview) => (
                    <div key={interview.id} className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-lg transition">
                      {/* Interview card content will go here */}
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
