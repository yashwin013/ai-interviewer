import React from 'react';
import Header from './Header';
import Sidebar from '../components/dashboard/Sidebar';

const JobBoard = ({ userEmail, onLogout }) => {
  // Mock jobs data - will be replaced with API
  const jobs = [];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50">
      <Header userEmail={userEmail} onLogout={onLogout} />
      
      <div className="flex pt-[138px]">
        <Sidebar />
        
        <main className="flex-1 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="mb-8">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                Job Board
              </h1>
              <p className="text-gray-600 text-lg">
                Find positions that match your skills and experience
              </p>
            </div>

            {/* Filters - Coming soon */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-6 mb-6 border border-white/50">
              <div className="flex items-center gap-4">
                <input
                  type="text"
                  placeholder="Search jobs..."
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-300 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition"
                />
                <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transition">
                  Search
                </button>
              </div>
            </div>

            {/* Jobs List */}
            <div className="bg-white/90 backdrop-blur-lg rounded-2xl shadow-xl p-8 border border-white/50">
              {jobs.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-lg font-semibold">No jobs available yet</p>
                  <p className="text-gray-400 text-sm mt-2">Check back soon for new opportunities</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {jobs.map((job) => (
                    <div key={job.id} className="p-6 border border-gray-200 rounded-xl hover:border-purple-300 hover:shadow-lg transition">
                      {/* Job card content will go here */}
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

export default JobBoard;
