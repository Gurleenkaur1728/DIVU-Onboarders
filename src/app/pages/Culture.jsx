import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../supabaseClient"; // <- adjust if your path differs

export default function Culture() {
  // defaults = your current static copy
  const defaultHeading = "DIVU Culture";
  const defaultParagraphs = [
    "Our culture is built on trust, inclusiveness, and shared responsibility. We embrace diversity across borders and time zones, working as a remote-first company that thrives on collaboration and accountability.",
    "We believe that curiosity sparks better questions, and better questions lead to smarter solutions.",
    "At DIVU, everyone has the autonomy to take ownership, challenge ideas, and drive sustainable innovation.",
    "Together we celebrate achievements, learn from setbacks, and continuously evolve as a team that values integrity and meaningful progress.",
  ];

  const [heading, setHeading] = useState(defaultHeading);
  const [paras, setParas] = useState(defaultParagraphs);

  useEffect(() => {
    let cancel = false;
    (async () => {
      // one row: section='culture', sort_order=0
      const { data, error } = await supabase
        .from("home_content")
        .select("title, description")
        .eq("section", "culture")
        .eq("sort_order", 0)
        .maybeSingle();

      if (!cancel && !error && data) {
        if (data.title) setHeading(data.title);
        if (data.description) {
          // split description into paragraphs on blank lines / newlines
          const parts = data.description.split(/\n{2,}|\r?\n/g).filter(Boolean);
          if (parts.length) setParas(parts);
        }
      }
    })();
    return () => {
      cancel = true;
    };
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar active="culture" role={ROLES.USER} />

      {/* Main Content */}
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

        {/* Content Card — same layout + images as before */}
        <div className="bg-white/95 rounded-xl shadow-lg p-10 max-w-5xl mx-auto">
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-6">
            {heading}
          </h1>

          {/* Text + first image */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              {paras.map((p, i) => (
                <p key={i} className="text-lg text-gray-800 leading-relaxed mb-4">
                  {p}
                </p>
              ))}
            </div>
            <div className="flex items-start justify-center">
              <img
                src="/cultureglobe.jpg"
                alt="Culture globe"
                className="rounded-lg shadow-lg w-full object-cover"
              />
            </div>
          </div>

          {/* Second image full width */}
          <div>
            <img
              src="/cultureWorkshop.jpg"
              alt="Workshop session"
              className="rounded-lg shadow-lg w-full object-cover"
            />
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
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"
        }`}
    >
      {label}
    </Link>
  );
}
