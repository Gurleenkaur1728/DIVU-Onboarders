import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { supabase } from "../../src/lib/supabaseClient";
import bcrypt from "bcryptjs";

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
      // Get user info including stored password
      const { data, error } = await supabase
        .from("users")
        .select("id, email, role_id, password")
        .eq("email", username.trim())
        .single();

      setLoading(false);

      if (error || !data) {
        setErr("Invalid email or password. Please try again.");
        return;
      }

      let isValid = false;

      // Case 1: Stored password looks like a bcrypt hash
      if (
        data.password.startsWith("$2a$") ||
        data.password.startsWith("$2b$") ||
        data.password.startsWith("$2y$")
      ) {
        isValid = await bcrypt.compare(password, data.password);
      } else {
        // Case 2: Legacy plain text password
        isValid = password === data.password;

        // If correct, upgrade to bcrypt immediately
        if (isValid) {
          const hashed = await bcrypt.hash(password, 10);
          await supabase
            .from("users")
            .update({ password: hashed })
            .eq("id", data.id);
        }
      }

      if (!isValid) {
        setErr("Invalid email or password. Please try again.");
        return;
      }

      // Save session info
      localStorage.setItem(
        "user",
        JSON.stringify({ id: data.id, email: data.email })
      );
      localStorage.setItem("role_id", data.role_id);

      // Redirect based on role
      if (data.role_id === 1 || data.role_id === 2) {
        navigate("/admin/dashboard");
      } else {
        navigate("/home");
      }
    } catch (e) {
      console.error("Unexpected login error:", e);
      setErr("An unexpected error occurred. Please try again.");
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-ping" />
      </div>

      {/* Background image overlay */}
      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
        style={{ backgroundImage: "url('/bg.png')" }}
      />

      {/* Main */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-full bg-gradient-to-r from-emerald-400/20 to-blue-400/20 backdrop-blur-sm">
                <Logo />
              </div>
            </div>

            <h2 className="mb-8 text-center text-2xl font-bold bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
              Employee Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Username */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90">
                  Email
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Error */}
              {err && (
                <p className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {err}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 px-4 font-semibold text-white shadow-lg hover:from-blue-500 hover:to-blue-600 focus:ring-2 focus:ring-blue-400/50 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <Link
                to="/forgot"
                className="text-sm text-cyan-300 hover:underline"
              >
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
