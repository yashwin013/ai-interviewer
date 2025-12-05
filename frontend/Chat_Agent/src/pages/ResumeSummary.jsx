import React from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ResumeSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const resumeProfile = location.state?.resumeProfile;
  if (!resumeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-xl shadow-md">
          <p className="text-red-600 mb-4">No resume data found.</p>
          <button
            onClick={() => navigate("/upload")}
            className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600"
          >
            Upload Resume
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen px-6 py-20 bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-center">Resume Summary</h1>
      <div className="max-w-2xl mx-auto bg-white p-6 rounded-lg shadow">
        {resumeProfile.name && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Name</h3>
            <p className="text-gray-600">{resumeProfile.name}</p>
          </div>
        )}

        {resumeProfile.skills && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Skills</h3>
            <div className="flex flex-wrap gap-2 mt-2">
              {Array.isArray(resumeProfile.skills) ? (
                resumeProfile.skills.map((skill, index) => (
                  <span
                    key={index}
                    className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-gray-600">{resumeProfile.skills}</p>
              )}
            </div>
          </div>
        )}

        {resumeProfile.experience && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Experience</h3>
            <p className="text-gray-600 whitespace-pre-line">{resumeProfile.experience}</p>
          </div>
        )}

        {resumeProfile.education && (
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-700">Education</h3>
            <p className="text-gray-600 whitespace-pre-line">{resumeProfile.education}</p>
          </div>
        )}

        <button
          onClick={() => navigate("/start-interview")}
          className="mt-6 w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
        >
          Start Interview
        </button>
      </div>
    </div>
  );
};

export default ResumeSummary;
