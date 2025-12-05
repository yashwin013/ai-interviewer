import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { signupRequest } from "../redux/auth/signupSlice";

const SignupPage = ({ onSignup }) => {
    const dispatch = useDispatch();
    const { loading, success, error: apiError } = useSelector((state) => state.signup);
    const navigate = useNavigate();
    const [error, setError] = useState("");
    const [form, setForm] = useState({
        name: "",
        email: "",
        password: "",
    });

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const validate = () => {
        if (!form.name.trim()) return "Name is required";
        if (!form.email.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
            return "Enter a valid email address";
        if (!form.password.trim()) return "Password is required";
        if (form.password.length < 6)
            return "Password must be at least 6 characters";
        return "";
    };

   const handleSubmit = (e) => {
  e.preventDefault();
  const msg = validate();
  if (msg) return setError(msg);

  setError("");

  dispatch(signupRequest(form));
};

useEffect(() => {
  if (success) {
    navigate("/");
  }
}, [success, navigate]);

useEffect(() => {
  if (apiError) {
    setError(apiError);
  }
}, [apiError]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="w-full max-w-md bg-white shadow-md rounded-xl p-6">
                <h2 className="text-3xl font-bold text-gray-700 text-center">Sign Up</h2>
                <p className="text-gray-500 text-center mt-1">Create your new account</p>

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                    <div>
                        <label className="block text-gray-600 mb-1">Full Name</label>
                        <input
                            type="text"
                            name="name"
                            placeholder="John Doe"
                            value={form.name}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-gray-600 mb-1">Password</label>
                        <input
                            type="password"
                            name="password"
                            placeholder="••••••••"
                            value={form.password}
                            onChange={handleChange}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-300 outline-none"
                        />
                    </div>
                    {error && (
                        <div className="bg-red-100 text-red-700 px-3 py-2 rounded-lg text-sm">
                            {error}
                        </div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-500 text-white py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
                    >
                        {loading ? "Creating..." : "Sign Up"}
                    </button>
                </form>

                <p className="text-gray-500 text-sm text-center mt-4">
                    Already have an account?
                    <span
                        className="text-blue-600 cursor-pointer hover:underline ml-1"
                        onClick={() => navigate("/login")}
                    >
                        Login
                    </span>        </p>
            </div>
        </div>
    );
};

export default SignupPage;
