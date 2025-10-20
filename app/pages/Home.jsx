import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient"; // ✅ Corrected import path

export default function Home() {
  const [name, setName] = useState(() => localStorage.getItem("profile_name") || "");
  const [role, setRole] = useState(() => localStorage.getItem("profile.role") || "user");
  const [hero, setHero] = useState({
    title: "Welcome to DIVU",
    subtitle: "Your onboarding journey starts here.",
    media_url: "/divu-logo.png",
  });
  const [loading, setLoading] = useState(true);

  // ✅ Fetch logged-in user info
  useEffect(() => {
    const pid = localStorage.getItem("profile_id");
    if (!pid) return;

    (async () => {
      const { data: rows, error } = await supabase
        .from("users")
        .select("name, role")
        .eq("id", pid)
        .limit(1);

      if (!error && rows?.length) {
        const row = rows[0];
        const displayName = row?.name?.trim() || "Employee";
        setName(displayName);
        setRole(row?.role || "user");
        localStorage.setItem("profile_name", displayName);
        localStorage.setItem("profile.role", row?.role);
      }
    })();
  }, []);

  // ✅ Load dynamic hero content
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("home_content")
        .select("title, subtitle, media_url")
        .eq("section", "hero")
        .eq("sort_order", 0)
        .maybeSingle();

      if (!error && data) setHero(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative bg-emerald-50">
      <Sidebar role={ROLES.USER} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* 🟩 Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Welcome {name ? name : "to DIVU"}!
            </span>
            <span className="text-emerald-800 italic">{role}</span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* 🟩 Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" active />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" />
        </div>

        {/* 🟩 Content */}
        <div className="bg-white/95 rounded-2xl shadow-2xl p-10 max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Left Text */}
            <div>
              <h1 className="text-4xl font-extrabold text-emerald-900 mb-4">
                {loading ? "…" : hero.title}
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed">
                {loading ? "Loading…" : hero.subtitle}
              </p>
            </div>

            {/* Right Image */}
            {hero.media_url && (
              <div className="flex justify-center">
                <img
                  src={hero.media_url}
                  alt="Home visual"
                  className="rounded-lg shadow-lg object-cover w-full max-w-sm"
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition shadow
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
    >
      {label}
    </Link>
  );
}
