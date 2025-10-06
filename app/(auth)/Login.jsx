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

      // 1) Auth sign-in (Auth → Users)
      const { data: { user }, error: authError } =
        await supabase.auth.signInWithPassword({
          email: username.trim(),
          password
        });

      if (authError || !user) {
        setLoading(false);
        setErr(authError?.message || "Invalid email or password.");
        return;
      }
      

      // 2) Get profile from  table by email (case-insensitive)
      const { data: profile, error: profErr } = await supabase
        .from("users")
        .select("id, name, email, role_id")
        .ilike("email", username.trim())
        .maybeSingle();

      if (profErr) {
        console.warn("Profile fetch error:", profErr.message);
      }

      const profileId = profile?.id ?? null;

      // 3) Role from user_roles by *profile id*, fallback to users.role_id, default 0
      let rid = 0;
      let rtxt = "";
      if (profileId) {
        const { data: roleRow } = await supabase
          .from("user_roles")
          .select("role_id, role")
          .eq("user_id", profileId)
          .maybeSingle();
        rid = Number(roleRow?.role_id ?? profile?.role_id ?? 0);
        rtxt = (roleRow?.role ?? "").toLowerCase();
      } else {
        rid = Number(profile?.role_id ?? 0);
      }

      const isAdmin = rid === 1 || rid === 2 || rtxt === "admin" || rtxt === "superadmin";

      // 4) Persist ONCE
      localStorage.setItem("user", JSON.stringify({ auth_id: user.id, email: user.email }));
      localStorage.setItem("profile_id", profileId || "");
      localStorage.setItem("role_id", String(rid));
      localStorage.setItem("role", rtxt || (isAdmin ? (rid === 2 ? "superadmin" : "admin") : "user"));

      setLoading(false);

      // 5) SINGLE redirect
      navigate(isAdmin ? "/admin/dashboard" : "/home");

      // optional debug
      console.log("login:", { auth_id: user.id, profile_id: profileId, rid, rtxt, isAdmin });

    } catch (error) {
      console.error("Login error:", error);
      setErr("An unexpected error occurred. Please try again.");
      setLoading(false);
    }

  };

  const togglePasswordVisibility = () => {
    setVisualizePassword((prev) => !prev);
  }

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
              <div className="p-4 rounded-full from-emerald-400/20 to-blue-400/20 ">
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