import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import Logo from "../components/Logo.jsx";
import { supabase } from "../../src/lib/supabaseClient";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");

    if (!username || !password) {
      setErr("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", username.trim())
        .eq("password", password);

      setLoading(false);

      if (error) {
        console.error("Login error:", error);
        setErr(`Database error: ${error.message}`);
        return;
      }

      if (data && data.length > 0) {
        navigate("/home");
      } else {
        setErr("Invalid email or password. Please try again.");
      }
    } catch (e) {
      console.error("Unexpected login error:", e);
      setErr("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800">
      {/* Animated background elements */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-ping" />
      </div>

      {/* Background image overlay */}
      <div 
        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
        style={{ backgroundImage: "url('/bg.png')" }}
      />

      {/* Main content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Enhanced AuthCard styling */}
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
            {/* Logo section with glow effect */}
            <div className="flex justify-center mb-8 transform hover:scale-110 transition-transform duration-300">
              <div className="p-4 rounded-full bg-gradient-to-r from-emerald-400/20 to-blue-400/20 backdrop-blur-sm">
                <Logo />
              </div>
            </div>

            {/* Title with gradient text */}
            <h2 className="mb-8 text-center text-2xl font-bold bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
              Employee Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Enhanced input fields */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90">
                  Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter your username"
                    className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/50 outline-none transition-all duration-300 focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20 hover:border-white/40"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-blue-500/5 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90">
                  Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/50 outline-none transition-all duration-300 focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20 hover:border-white/40"
                  />
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-emerald-500/5 to-blue-500/5 pointer-events-none" />
                </div>
              </div>

              {/* Error message with better styling */}
              {err && (
                <div className="relative">
                  <div className="absolute inset-0 rounded-lg bg-red-500/20 blur-sm" />
                  <p className="relative bg-red-500/10 border border-red-400/30 rounded-lg px-4 py-2 text-sm text-red-300 backdrop-blur-sm">
                    {err}
                  </p>
                </div>
              )}

              {/* Enhanced login button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 px-4 font-semibold text-white shadow-lg transition-all duration-300 hover:from-blue-500 hover:to-blue-600 hover:shadow-xl hover:shadow-blue-500/25 focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
                <span className="relative flex items-center justify-center gap-2">
                  {loading && (
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {loading ? "Signing in..." : "Login"}
                </span>
              </button>
            </form>

            {/* Forgot password link */}
            <div className="mt-6 text-center">
              <Link 
                to="/forgot" 
                className="text-sm text-cyan-300 hover:text-cyan-200 transition-colors duration-200 hover:underline decoration-2 underline-offset-4"
              >
                Forgot password?
              </Link>
            </div>

            {/* Enhanced sign up button */}
            <button
              onClick={() => navigate("/signUp")}
              className="mt-4 w-full relative overflow-hidden rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 py-3 px-4 font-semibold text-white shadow-lg transition-all duration-300 hover:from-emerald-500 hover:to-emerald-600 hover:shadow-xl hover:shadow-emerald-500/25 focus:ring-2 focus:ring-emerald-400/50 transform hover:scale-[1.02]"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300" />
              <span className="relative">Create New Account</span>
            </button>

            {/* Footer text with better styling */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <p className="text-center text-xs text-white/40 leading-relaxed">
                Use of this system is restricted to authorized users.
                <br />
                Activity may be monitored.
              </p>
            </div>
          </div>

          {/* Additional decorative elements */}
          <div className="mt-8 flex justify-center space-x-2">
            <div className="w-2 h-2 bg-emerald-400/60 rounded-full animate-pulse" />
            <div className="w-2 h-2 bg-blue-400/60 rounded-full animate-pulse delay-200" />
            <div className="w-2 h-2 bg-cyan-400/60 rounded-full animate-pulse delay-500" />
          </div>
        </div>
      </div>
    </div>
  );
}