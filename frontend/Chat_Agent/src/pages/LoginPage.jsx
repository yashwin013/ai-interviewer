import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { loginRequest } from "../redux/auth/signupSlice";
import { useDispatch, useSelector } from "react-redux";


const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const navigate = useNavigate();
  const dispatch = useDispatch();
  
  const { loading, login, error: apiError } = useSelector((state) => state.signup);

  // Handle successful login
  useEffect(() => {
    if (login && login.token) {
      // Call parent onLogin handler if provided
      if (onLogin) {
        onLogin(login);
      }
      // Navigate to upload page
      navigate("/upload");
    }
  }, [login, navigate, onLogin]);

  // Display API errors
  useEffect(() => {
    if (apiError) {
      setError(apiError);
    }
  }, [apiError]);

  const validateEmail = (email) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }
    if (!validateEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password.trim()) {
      setError("Password is required");
      return;
    }

    dispatch(loginRequest({ email, password }));
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-md p-6">
        <h2 className="text-2xl font-semibold text-gray-700 mb-4 text-center">
          Login
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-gray-600 mb-1">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-300"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-gray-600 mb-1">Password</label>
            <input
              type="password"
              name="password"
              placeholder="•••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none"
            />
          </div>

          {error && (
            <div className="bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
          >
            {loading ? "Processing..." : "Login"}
          </button>
        </form>
        <div className="text-center mt-4">
          <p className="text-gray-600 text-sm">
            Don't have an account?
          </p>

          <button
            onClick={() => navigate("/SignupPage")}
            className="mt-2 w-full border border-blue-500 text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition"
          >
            Signup
          </button>
        </div>

        <p className="text-center text-gray-500 text-sm mt-4">
          © 2025 Live Stream Login — All Rights Reserved
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
