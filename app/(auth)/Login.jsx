import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { Eye, EyeOff } from "lucide-react";

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

    if (!username || !password) {
      setErr("Please enter both email and password");
      return;
    }

    try {
      setLoading(true);

      // 1) Sign in via Supabase Auth (source of truth)
      const { data, error } = await supabase.auth.signInWithPassword({
        email: username.trim(),
        password,
      });
      if (error) {
        setErr("Invalid email or password.");
        setLoading(false);
        return;
      }

      const authUser = data.user; // <-- the signed-in user (has .id and .email)

      // 2) Optional: fetch display profile (until users.user_id FK is in place)
      const { data: profile, error: profErr } = await supabase
        .from("users")
        .select("id, name, email, role_id")
        .eq("email", authUser.email)
        .maybeSingle();
      if (profErr) throw profErr;

      // 3) Authoritative role by auth user id
      const { data: roleRow, error: roleErr } = await supabase
        .from("user_roles")
        .select("role_id, role")
        .eq("user_id", authUser.id)
        .maybeSingle();
      if (roleErr) throw roleErr;

      const rid = Number(roleRow?.role_id ?? profile?.role_id ?? 0);
      const rtxt = (
        roleRow?.role ??
        (rid === 2 ? "superadmin" : rid === 1 ? "admin" : "user")
      ).toLowerCase();

      // 4) Cache non-sensitive hints for UI (do NOT trust for auth)
      if (profile?.id) localStorage.setItem("profile_id", profile.id);
      localStorage.setItem("role_id", String(rid));
      localStorage.setItem("role", rtxt);

      setLoading(false);

      const isAdmin =
        rtxt === "admin" || rtxt === "superadmin" || rid === 1 || rid === 2;

      navigate(isAdmin ? "/admin/dashboard" : "/home");
    } catch (e) {
      console.error(e);
      setErr("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () =>
    setVisualizePassword((prev) => !prev);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-900 to-slate-800">
      {/* Background glow */}
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

      {/* Card */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8 shadow-2xl transform hover:scale-[1.02] transition-all duration-300">
            {/* Logo */}
            <div className="flex justify-center mb-8">
              <div className="p-4 rounded-full from-emerald-400/20 to-blue-400/20">
                <Logo />
              </div>
            </div>

            <h2 className="mb-8 text-center text-2xl font-bold bg-gradient-to-r from-emerald-300 to-blue-300 bg-clip-text text-transparent">
              Employee Login
            </h2>

            <form onSubmit={handleLogin} className="space-y-6">
              {/* Email */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90">
                  Email
                </label>
                <input
                  type="email"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your email"
                  className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20"
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-emerald-200/90 ">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={visualizePassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    className="w-full rounded-xl border border-white/30 bg-white/5 backdrop-blur-sm px-4 pr-10 py-3 text-white placeholder-white/50 outline-none focus:border-emerald-400/60 focus:bg-white/10 focus:ring-2 focus:ring-emerald-400/20"
                  />
                  <button
                    type="button"
                    onClick={togglePasswordVisibility}
                    aria-label={visualizePassword ? "Hide password" : "Show password"}
                    aria-pressed={visualizePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white"
                  >
                    {visualizePassword ? <Eye /> : <EyeOff />}
                  </button>
                </div>
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
