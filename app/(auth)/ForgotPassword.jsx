import { useState } from "react";
import AuthCard from "../components/AuthCard.jsx";
import Logo from "../components/Logo.jsx";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [empId, setEmpId] = useState("");
  const [username, setUsername] = useState("");

  const onSubmit = (e) => {
    e.preventDefault();
    // dummy success
    alert("If your details match our records, a reset link will be sent.");
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
          Forgot Password
        </h2>

        <form onSubmit={onSubmit}>
          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Employee ID</span>
            <input
              type="text"
              value={empId}
              onChange={(e) => setEmpId(e.target.value)}
              placeholder="12345"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <label className="block mb-3">
            <span className="mb-1 block text-xs text-[#cfe6d6]">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="username"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none focus:ring"
            />
          </label>

          <button
            type="submit"
            className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold"
          >
            Send New Password Link
          </button>
        </form>

        <p className="mt-3 text-center text-[10px] text-white/50">
          You’ll receive a link if details match our records.
        </p>
      </AuthCard>
    </div>
  );
}
