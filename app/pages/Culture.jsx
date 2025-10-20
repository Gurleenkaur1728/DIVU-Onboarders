import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient";


export default function Culture() {
  const [content, setContent] = useState({
    title: "DIVU Culture",
    subtitle: "Loading content...",
    media_url: "/cultureglobe.jpg",
  });

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("home_content")
        .select("title, subtitle, media_url")
        .eq("section", "culture")
        .eq("sort_order", 0)
        .maybeSingle();
      if (!error && data) setContent(data);
    })();
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={ROLES.USER} active="culture" />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;name&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" active />
          <Tab label="About" to="/about" />
        </div>

        {/* Content */}
        <div className="bg-white/95 rounded-xl shadow-lg p-10 max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-6">
            {content.title}
          </h1>

          <div className="grid md:grid-cols-2 gap-6 items-center">
            <p className="text-lg text-gray-800 leading-relaxed">
              {content.subtitle}
            </p>
            {content.media_url && (
              <img
                src={content.media_url}
                alt="Culture visual"
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
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"}`}
    >
      {label}
    </Link>
  );
}
