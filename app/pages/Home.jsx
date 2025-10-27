import { useEffect, useState, useMemo } from "react";
import Sidebar, { ROLES } from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient";
 
export default function Home() {
  const [name, setName] = useState(() =>
    localStorage.getItem("profile_name") || ""
  );
  const [role, setRole] = useState(() =>
    localStorage.getItem("profile.role") || "user"
  );
 
  // All sections for the Welcome page (maps to 'hero' in DB)
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
 
  // Convenience: first section is the hero, rest are additional blocks
  const hero = useMemo(() => sections[0], [sections]);
  const rest = useMemo(() => sections.slice(1), [sections]);
 
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
        localStorage.setItem("profile.role", row?.role || "user");
      }
    })();
  }, []);
 
  // Load all active sections for the Welcome page
  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("home_content")
        .select("id, title, subtitle, description, media_url, cta_label, cta_href, sort_order, is_active")
        .eq("section", "hero")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });
 
      if (!error && Array.isArray(data) && data.length) {
        setSections(data);
      } else {
        // Graceful fallback if nothing found
        setSections([
          {
            id: "fallback",
            title: "Welcome to DIVU",
            subtitle: "Your onboarding journey starts here.",
            description: "",
            media_url: "/divu-logo.png",
            cta_label: "",
            cta_href: "",
            sort_order: 0,
            is_active: true,
          },
        ]);
      }
      setLoading(false);
    })();
  }, []);
 
  return (
    <div className="flex min-h-dvh bg-cover bg-center relative bg-emerald-50">
      <Sidebar role={ROLES.USER} />
 
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
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
 
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" active />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" />
        </div>
 
        {/* HERO (first section) */}
        <div className="bg-white/95 rounded-2xl shadow-2xl p-10 max-w-6xl mx-auto mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h1 className="text-4xl font-extrabold text-emerald-900 mb-4">
                {loading ? "…" : (hero?.title || "Welcome to DIVU")}
              </h1>
              <p className="text-lg text-gray-700 leading-relaxed mb-6">
                {loading ? "Loading…" : (hero?.subtitle || "Your onboarding journey starts here.")}
              </p>
              {hero?.description ? (
                <p className="text-base text-gray-700 leading-relaxed mb-6">
                  {hero.description}
                </p>
              ) : null}
              {hero?.cta_label && hero?.cta_href ? (
                <CTAButton href={hero.cta_href} label={hero.cta_label} />
              ) : null}
            </div>
 
            {/* Media */}
            {hero?.media_url ? (
              <div className="flex justify-center">
                {isVideo(hero.media_url) ? (
                  <video
                    src={hero.media_url}
                    className="rounded-lg shadow-lg object-cover w-full max-w-md"
                    autoPlay
                    muted
                    loop
                    playsInline
                  />
                ) : (
                  <img
                    src={hero.media_url}
                    alt="Home visual"
                    className="rounded-lg shadow-lg object-cover w-full max-w-md"
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
 
        {/* Additional sections */}
        {rest.length > 0 && (
          <div className="max-w-6xl mx-auto space-y-6">
            {rest.map((s) => (
              <SectionBlock key={s.id}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    {s.title ? (
                      <h2 className="text-2xl font-bold text-emerald-900 mb-2">
                        {s.title}
                      </h2>
                    ) : null}
                    {s.subtitle ? (
                      <p className="text-emerald-800 font-medium mb-3">
                        {s.subtitle}
                      </p>
                    ) : null}
                    {s.description ? (
                      <p className="text-gray-700 leading-relaxed mb-4">
                        {s.description}
                      </p>
                    ) : null}
                    {s.cta_label && s.cta_href ? (
                      <CTAButton href={s.cta_href} label={s.cta_label} />
                    ) : null}
                  </div>
                  {s.media_url ? (
                    <div className="flex justify-center">
                      {isVideo(s.media_url) ? (
                        <video
                          src={s.media_url}
                          className="rounded-lg shadow-lg object-cover w-full max-w-md"
                          autoPlay
                          loop
                          muted
                          playsInline
                        />
                      ) : (
                        <img
                          src={s.media_url}
                          alt={s.title || "Section media"}
                          className="rounded-lg shadow-lg object-cover w-full max-w-md"
                        />
                      )}
                    </div>
                  ) : null}
                </div>
              </SectionBlock>
            ))}
          </div>
        )}
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
 
function CTAButton({ href, label }) {
  const isInternal = href?.startsWith("/") || href?.startsWith("#");
  if (isInternal) {
    return (
      <Link
        to={href}
        className="inline-block px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
      >
        {label}
      </Link>
    );
  }
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
    >
      {label}
    </a>
  );
}
 
function SectionBlock({ children }) {
  return (
    <div className="bg-white/95 rounded-2xl shadow-lg p-8">{children}</div>
  );
}
 
function isVideo(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}