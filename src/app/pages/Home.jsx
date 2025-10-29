import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { useRole } from "../../lib/hooks/useRole.js";

export default function Home() {

  const { roleId, role } = useRole();
  const [name, setName] = useState(() => localStorage.getItem("user_name") || "");

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) {
      setName(storedName);
    }
  }, []);

  const defaultHero = {
    title: "Welcome to DIVU",
    subtitle: "Your onboarding journey starts here.",
    media_url: "/bg.png",
  };
  const [hero, setHero] = useState(defaultHero);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    try {
      const storedHero = JSON.parse(localStorage.getItem("hero_content"));
      if (storedHero) {
        setHero((prev) => ({
          title: storedHero.title ?? prev.title,
          subtitle: storedHero.subtitle ?? prev.subtitle,
          media_url: storedHero.media_url ?? prev.media_url,
        }));
      }
    } catch (error) {
      console.error("Error loading hero content:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: `url('${hero.media_url || "/bg.png"}')` }}
    >
      <Sidebar role={roleId} />

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
