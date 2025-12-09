import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const ResumeSummary = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resumeProfile } = location.state || {};

  console.log("Received Resume Data:", resumeProfile);
  const cleanedText = useMemo(() => {
    const raw = resumeProfile?.extracted_text ?? "";
    if (!raw) return "";
    let t = raw;
    t = t.replace(/\s{2,}/g, " ");
    t = t.replace(/•/g, "\n• ");
    t = t.replace(/(Career Objective|Professional Experience|Education|Professional Skills|Personal Strengths|Personal Profile|Declaration|Date:|Place:)/g, "\n$1");
    t = t.replace(/([.,])([A-Za-z])/g, "$1 $2");
    t = t.replace(/(Phone:|Phone|Tel:|Email:|E-mail:)/gi, "\n$1 ");
    t = t.replace(/([a-z])([A-Z])/g, "$1 $2");
    t = t.replace(/\n{2,}/g, "\n\n").trim();

    return t;
  }, [resumeProfile]);
  if (!resumeProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 font-sans">
        <div className="bg-white p-8 rounded-xl shadow-xl text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-gray-800 text-lg font-semibold mb-2">No Resume Data Found</p>
          <p className="text-gray-500 mb-6">Please upload your resume to see the summary.</p>
          <button
            onClick={() => navigate("/upload")}
            className="w-full bg-[#6e46ae] text-white px-6 py-3 rounded-lg hover:bg-[#56368b] transition font-medium"
          >
            Go to Upload
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50 font-sans py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-[#1e0c3e] px-8 py-6 text-white flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">Resume Summary</h1>
              <p className="text-white/70 text-sm mt-1">AI-generated analysis of your profile</p>
            </div>
            <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>

          <div className="p-8 space-y-8">
            {resumeProfile && (
              <div className="border-b border-gray-100 pb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Extracted Resume Text
                </h3>
                <p className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm whitespace-pre-line leading-relaxed">
                  {cleanedText}
                </p>
              </div>
            )}
          </div>
          {resumeProfile.skills && (
            <div className="border-b border-gray-100 pb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Detected Skills</h3>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(resumeProfile.skills) ? (
                  resumeProfile.skills.map((skill, index) => (
                    <span
                      key={index}
                      className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-sm font-medium border border-blue-100"
                    >
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-gray-600 italic">{resumeProfile.skills}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-8">
            {resumeProfile.experience && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Experience
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm leading-relaxed whitespace-pre-line border border-gray-100">
                  {resumeProfile.experience}
                </div>
              </div>
            )}

            {resumeProfile.education && (
              <div>
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
                  </svg>
                  Education
                </h3>
                <div className="bg-gray-50 p-4 rounded-lg text-gray-700 text-sm leading-relaxed whitespace-pre-line border border-gray-100">
                  {resumeProfile.education}
                </div>
              </div>
            )}
          </div>

          <div className="pt-6">
            <button
              onClick={() => navigate("/start-interview")}
              className="w-full bg-[#00c0b3] text-white text-lg font-bold py-4 rounded-xl hover:bg-[#00a093] transition shadow-lg hover:shadow-xl transform active:scale-99 flex items-center justify-center gap-2"
            >
              <span>Start Mock Interview</span>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
            <p className="text-center text-gray-400 text-sm mt-3">Ready to practice? Let's verify your skills.</p>
          </div>
        </div>
      </div>
    </div>
    // </div>
  );
};

export default ResumeSummary;
