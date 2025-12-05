import axiosInstance from "./axiosInstance";

/**
 * API Service Layer
 * Centralized functions for all backend API calls
 */

// ==================== AUTH APIs ====================

export const signupApi = (data) => {
  return axiosInstance.post("/auth/signup", data);
};

export const loginApi = (email, password) => {
  return axiosInstance.post("/auth/login", { email, password });
};

// ==================== RESUME APIs ====================

/**
 * Upload resume file for a user
 * @param {string} userId - User ID
 * @param {File} file - Resume file (PDF, DOC, DOCX)
 * @returns {Promise} - Parsed resume profile
 */
export const uploadResume = async (userId, file) => {
  const formData = new FormData();
  formData.append("resume", file);

  const response = await axiosInstance.post(`/resume/${userId}/upload-resume`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data;
};

// ==================== INTERVIEW APIs ====================

/**
 * Start a new interview session
 * @param {string} userId - User ID
 * @returns {Promise} - Session ID and message
 */
export const startInterview = async (userId) => {
  const response = await axiosInstance.post("/interview/start", { userId });
  return response.data;
};

/**
 * Initialize interview and get first question
 * @param {string} sessionId - Interview session ID
 * @returns {Promise} - First question
 */
export const initInterview = async (sessionId) => {
  const response = await axiosInstance.post(`/interview/init/${sessionId}`);
  return response.data;
};

/**
 * Submit answer and get next question
 * @param {string} sessionId - Interview session ID
 * @param {number} questionNumber - Current question number
 * @param {string} answer - User's answer
 * @returns {Promise} - Next question or completion message
 */
export const submitAnswer = async (sessionId, questionNumber, answer) => {
  const response = await axiosInstance.post(`/interview/answer/${sessionId}`, {
    questionNumber,
    answer,
  });
  return response.data;
};
