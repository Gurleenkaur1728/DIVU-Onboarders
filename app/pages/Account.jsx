import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { Bell, Menu, ArrowLeft } from "lucide-react";

export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const nav = useNavigate();
  const isSmall = window.innerWidth < 900;

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.from("users").select("*").limit(1);
      if (error) throw error;
      if (data && data.length > 0) {
        const user = data[0];
        setUserId(user.id);
        setName(user.name || "");
        setEmail(user.email || "");
        setEmployeeId(user.employee_id || "");
      }
    } catch (e) {
      alert("Error fetching user data: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!name.trim()) return alert("Name cannot be empty");
    try {
      setBusy(true);
      const { error } = await supabase.from("users").update({ name }).eq("id", userId);
      if (error) throw error;
      alert("Your name has been updated successfully.");
    } catch (e) {
      alert("Update failed: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    // Simplified → just go back to login
    nav("/");
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
        <p className="text-emerald-100 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 relative">
      {/* Sidebar (desktop) */}
      {!isSmall && <Sidebar active="account" />}

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-800/30 rounded-xl px-4 py-3 mb-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500 text-white font-bold">
              {name ? name.charAt(0).toUpperCase() : "?"}
            </div>
            <div>
              <p className="text-emerald-200 text-xs">Welcome back!</p>
              <p className="text-emerald-50 font-bold">{name}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {isSmall && <Menu className="w-6 h-6 text-emerald-200 cursor-pointer" />}
            <Bell className="w-6 h-6 text-emerald-200" />
          </div>
        </div>

        {/* Title bar */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-600 to-green-600 rounded-xl px-6 py-4 shadow-lg mb-6">
          <h2 className="text-xl font-extrabold text-white tracking-wide">
            Account Settings
          </h2>
          <button
            onClick={() => nav(-1)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/20 text-white hover:bg-white/30 transition"
          >
            <ArrowLeft size={16} />
            Back
          </button>
        </div>

        {/* Content Card */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg max-w-lg">
          <label className="block mb-3">
            <span className="block text-sm font-semibold text-emerald-900 mb-1">
              Full name
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              className="w-full rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-emerald-900 shadow-sm focus:border-emerald-400 focus:ring focus:ring-emerald-300/50"
            />
          </label>

          <label className="block mb-3">
            <span className="block text-sm font-semibold text-emerald-900 mb-1">
              Email
            </span>
            <input
              type="email"
              value={email}
              disabled
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
            />
          </label>

          <label className="block mb-6">
            <span className="block text-sm font-semibold text-emerald-900 mb-1">
              Employee ID
            </span>
            <input
              type="text"
              value={employeeId}
              disabled
              className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
            />
          </label>

          <button
            onClick={save}
            disabled={busy}
            className="w-full py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-md hover:from-emerald-400 hover:to-green-500 transition"
          >
            {busy ? "Saving…" : "Save changes"}
          </button>

          <button
            onClick={signOut}
            className="w-full py-3 rounded-xl font-semibold border-2 border-red-500 text-red-600 bg-red-50 hover:bg-red-100 transition mt-4"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
}
