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
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={ROLES.USER} active="about" />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* 🟩 Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Hello {name ? name : "Employee"}, learn more about DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* 🟩 Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" active />
        </div>

        {/* 🟩 Content */}
        <div className="bg-white/95 rounded-xl shadow-lg p-10 max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-6">
            {loading ? "Loading..." : content.title}
          </h1>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            <p className="text-lg text-gray-800 leading-relaxed">
              {loading ? "Loading..." : content.subtitle}
            </p>
            {content.media_url && (
              <img
                src={content.media_url}
                alt="About DIVU visual"
                className="rounded-lg shadow-lg w-full object-cover"
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
