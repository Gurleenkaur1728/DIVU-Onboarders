import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../supabaseClient"; 

export default function Home() {

  const [name, setName] = useState(() => localStorage.getItem("profile.name") || "");
  const [role, setRole] = useState(() => localStorage.getItem("profile.role") || "");

  useEffect(() => {

    const pid = localStorage.getItem("profile_id");
    if (!pid) return;

    (async () => {
      const { data: rows, error } = await supabase
        .from("users")
        .select("name", "role")
        .eq("id", pid)
        .limit(1);          

      if (!error && rows?.length) {
        const row = rows[0];
        const display = row?.name?.trim() || (row?.role?.toUpperCase());
        setName(display);
        setRole(row?.role || "user");
        localStorage.setItem("profile_name", display);
        localStorage.setItem("profile.role", row?.role);
      }
    })();
  }, [name]);

  const [hero, setHero] = useState({
    title: "Welcome to DIVU",
    subtitle: "Your onboarding journey starts here.",
    media_url: "/bg.png",
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("home_content")
        .select("title, subtitle, media_url")
        .eq("section", "hero")
        .eq("sort_order", 0)
        .maybeSingle();

      if (!cancelled) {
        if (!error && data) setHero({
          title: data.title ?? hero.title,
          subtitle: data.subtitle ?? hero.subtitle,
          media_url: data.media_url ?? hero.media_url,
        });
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: `url('${hero.media_url || "/bg.png"}')` }}
    >
      <Sidebar role={ROLES.USER} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">Welcome to DIVU, {name}!</span>
            <span className=" text-emerald-800 italic">{role}</span>
          </div>        
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" active />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" />
        </div>

        {/* Content */}
        <div className="bg-white/95 rounded-2xl shadow-2xl p-16 max-w-5xl mx-auto relative overflow-hidden">
          <img src="/divu-logo.png" alt="DIVU Logo" className="absolute opacity-10 right-10 bottom-10 w-48" />
          <h1 className="text-4xl font-extrabold text-emerald-900 mb-6 text-center">
            {loading ? "…" : hero.title}
          </h1>
          <div className="w-28 h-1 bg-emerald-500 mx-auto mb-8 rounded-full"></div>
          <p className="text-xl text-gray-700 leading-relaxed mb-6 text-center">
            {loading ? "Loading…" : hero.subtitle}
          </p>
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
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
    >
      {label}
    </Link>
  );
}
