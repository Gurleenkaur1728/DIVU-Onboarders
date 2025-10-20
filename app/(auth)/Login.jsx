import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { Eye, EyeOff } from "lucide-react";
import bcrypt from "bcryptjs";

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const [visualizePassword, setVisualizePassword] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const email = username.trim().toLowerCase();
    if (!email || !password) {
      setErr("Please enter both email and password");
      setLoading(false);
      return;
    }

    try {
      // Fetch user from USERS table
      const { data: user, error } = await supabase
        .from("users")
        .select("id, email, password, role_id, name")
        .eq("email", email)
        .maybeSingle();

      if (error || !user) {
        setErr("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Verify password
      const valid = await bcrypt.compare(password, user.password || "");
      if (!valid) {
        setErr("Invalid email or password.");
        setLoading(false);
        return;
      }

      // Determine role & redirect
      const roleId = Number(user.role_id);
      let role = "employee";
      let path = "/home";

      if (roleId === 1) {
        role = "admin";
        path = "/admin/dashboard";
      } else if (roleId === 2) {
        role = "superadmin";
        path = "/admin/dashboard";
      } else if (roleId === 0) {
        role = "employee";
        path = "/home";
      }

      // Store session
      localStorage.setItem("user", JSON.stringify({ email }));
      localStorage.setItem("role_id", roleId);
      localStorage.setItem("role", role);
      localStorage.setItem("user_name", user.name || "");

      // Redirect
      navigate(path);
      setLoading(false);
    } catch (e) {
      console.error("Login error:", e);
      setErr("Unexpected error. Try again.");
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () =>
    setVisualizePassword((prev) => !prev);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800">
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/15 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-cyan-400/10 rounded-full blur-3xl animate-ping" />
      </div>

      <div
        className="absolute inset-0 bg-cover bg-center mix-blend-overlay opacity-30"
        style={{ backgroundImage: "url('/bg.png')" }}
      />

      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl">
            <div className="flex justify-center mb-8">
              <Logo />
            </div>

            <h2 className="mb-8 text-center text-2xl font-bold bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
              Employee / Admin Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-emerald-200/90">
                  Email
                </label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/30 bg-white/5 px-4 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-emerald-200/90">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={visualizePassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/30 bg-white/5 px-4 pr-10 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {visualizePassword ? <Eye /> : <EyeOff />}
                  </button>
                </div>
              </div>

              {err && (
                <p className="bg-red-500/20 text-red-300 px-4 py-2 rounded-lg text-sm">
                  {err}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 py-3 px-4 font-semibold text-white shadow-lg hover:from-blue-500 hover:to-blue-600 disabled:opacity-50"
              >
                {loading ? "Signing in..." : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <Link to="/forgot" className="text-sm text-cyan-300 hover:underline">
                Forgot password?
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
//login