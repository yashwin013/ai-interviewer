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

// ==================== RESULTS APIs ====================

/**
 * Get all interview results for a user
 * @param {string} userId - User ID
 * @returns {Promise} - Array of interview results
 */
export const getUserResults = async (userId) => {
  const response = await axiosInstance.get(`/results/user/${userId}`);
  return response.data;
};

/**
 * Get interview result for a specific session
 * @param {string} sessionId - Interview session ID
 * @returns {Promise} - Interview result with assessment
 */
export const getSessionResult = async (sessionId) => {
  const response = await axiosInstance.get(`/results/session/${sessionId}`);
  return response.data;
};

// ==================== JOBS APIs ====================

/**
 * Get all jobs with pagination and filters
 * @param {object} params - Query parameters (page, limit, location, experience_level, skills)
 * @returns {Promise} - Jobs list with pagination
 */
export const getAllJobs = async (params = {}) => {
  const response = await axiosInstance.get('/jobs', { params });
  return response.data;
};

/**
 * Get a specific job by ID
 * @param {string} jobId - Job ID
 * @returns {Promise} - Job details
 */
export const getJobById = async (jobId) => {
  const response = await axiosInstance.get(`/jobs/${jobId}`);
  return response.data;
};

/**
 * Search jobs by keyword
 * @param {string} query - Search query
 * @param {number} page - Page number
 * @param {number} limit - Items per page
 * @returns {Promise} - Search results
 */
export const searchJobs = async (query, page = 1, limit = 20) => {
  const response = await axiosInstance.get('/jobs/search/query', {
    params: { q: query, page, limit }
  });
  return response.data;
};
