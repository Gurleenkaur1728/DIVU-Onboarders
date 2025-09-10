import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCard from "../components/AuthCard.jsx";
import Logo from "../components/Logo.jsx";
import { supabase } from "../../src/lib/supabaseClient"; // keep if you're using Supabase

export default function SignUp() {
  const nav = useNavigate();
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    if (!name.trim() || !email.trim() || !password.trim()) {
      setErr("Please fill in all required fields");
      return;
    }

    try {
      setBusy(true);

      const insertData = {
        name: name.trim(),
        email: email.trim(),
        password: password.trim(),
      };
      if (employeeId.trim()) insertData.employee_id = employeeId.trim();

      const { data, error } = await supabase.from("users").insert([insertData]);
      if (error) {
        setErr(error.message);
      } else {
        setOk(true);
        setTimeout(() => nav("/"), 1500);
      }
    } catch (e) {
      setErr(String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[#0c1214] bg-cover bg-center p-6"
      style={{ backgroundImage: "url('/bg.png')" }} // put bg.png in /public
    >
      <AuthCard>
        <div className="flex justify-center mb-4">
          <Logo />
        </div>

        <h2 className="mb-4 text-center text-base font-semibold text-white opacity-90">
          Create your account
        </h2>

        <form onSubmit={submit}>
          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Full name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">
              Employee ID (optional)
            </span>
            <input
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="EMP-001"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          {err && <p className="mb-2 text-sm text-red-500">{err}</p>}
          {ok && <p className="mb-2 text-sm text-green-500">Account created!</p>}

          <button
            type="submit"
            disabled={busy}
            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold disabled:opacity-60"
          >
            {busy ? "Creating…" : "Create account"}
          </button>
        </form>

        <div className="mt-3 text-center">
          <Link to="/" className="text-sm text-blue-300 underline">
            Already have an account? Sign in
          </Link>
        </div>
      </AuthCard>
    </div>
  );
}
