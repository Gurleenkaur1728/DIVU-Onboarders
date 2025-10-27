import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react"; 
import { supabase } from "../../src/lib/supabaseClient";

export default function About() {
  const [name, setName] = useState(() => localStorage.getItem("profile_name") || "");
  const [content, setContent] = useState({
    title: "About DIVU",
    subtitle: "Loading content...",
    media_url: "/aboutdivu.jpg",
  });
  const [loading, setLoading] = useState(true);

  // ✅ Fetch logged-in user name
  useEffect(() => {
    const storedName = localStorage.getItem("profile_name");
    if (storedName) {
      setName(storedName);
    } else {
      (async () => {
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user?.email) {
          const { data: row } = await supabase
            .from("users")
            .select("name")
            .eq("email", userData.user.email)
            .maybeSingle();
          if (row?.name) {
            setName(row.name);
            localStorage.setItem("profile_name", row.name);
          }
        }
      })();
    }
  }, []);

  // ✅ Fetch About Page Content
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("home_content")
        .select("title, subtitle, media_url")
        .eq("section", "about")
        .eq("sort_order", 0)
        .maybeSingle();

      if (!error && data) setContent(data);
      setLoading(false);
    })();
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 relative"
      style={{ backgroundImage: "url('/bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
    >
      <Sidebar role={ROLES.USER} active="about" />

      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
        {/* 🟩 Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-lg px-4 py-3 mb-6 shadow-sm border border-emerald-200/50">
          <div className="flex items-center gap-2 text-sm sm:text-base">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Welcome {name ? `${name}` : "Employee"}!
              <span className="font-normal italic text-emerald-700 ml-1">user</span>
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* 🟩 Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" active />
        </div>

        {/* 🟩 Content */}
        <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 max-w-5xl mx-auto border border-emerald-100/70">
          <h1 className="text-3xl sm:text-4xl font-extrabold text-emerald-900 mb-6">
            {loading ? "Loading..." : content.title}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <p className="text-base sm:text-lg text-emerald-900 leading-relaxed">
              {loading ? (
                <span className="animate-pulse italic text-emerald-600">Loading content...</span>
              ) : (
                content.subtitle
              )}
            </p>
            {content.media_url && (
              <img
                src={content.media_url}
                alt="About DIVU visual"
                className="rounded-xl shadow-md w-full object-cover transition-transform duration-300 hover:scale-[1.02]"
              />
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
      className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300 hover:scale-[1.02]"
        }`}
    >
      {label}
    </Link>
  );
}
