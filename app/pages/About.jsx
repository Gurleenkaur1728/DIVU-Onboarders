import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { supabase } from "../../src/lib/supabaseClient";
 
export default function About() {
  const { roleId, role } = useRole();
  const [name, setName] = useState(() => localStorage.getItem("user_name") || "");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
 
  const hero = useMemo(() => sections[0], [sections]);
  const rest = useMemo(() => sections.slice(1), [sections]);
 
  // Load name from localStorage (managed by login)
  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) {
      setName(storedName);
    }
  }, []);
 
  // Load all active 'about' sections
  useEffect(() => {
    let active = true;
    const fallback = [{
      id: "fallback",
      title: "About DIVU",
      subtitle: "Learn about our mission and how we onboard with care.",
      description: "",
      media_url: "/aboutdivu.jpg",
      cta_label: "",
      cta_href: "",
      sort_order: 1,
      is_active: true,
    }];

    async function loadSections() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("home_content")
          .select("*")
          .eq("section", "about")
          .eq("is_active", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

        if (error) throw error;

        if (!active) return;

        if (Array.isArray(data) && data.length > 0) {
          setSections(data);
        } else {
          setSections(fallback);
        }
      } catch (error) {
        console.error("Error loading about sections:", error);
        if (active) setSections(fallback);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSections();

    return () => {
      active = false;
    };
  }, []);
 
  return (
    <AppLayout>
    <div className="min-h-screen">
       
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-emerald-950">
              Welcome {name ? name : "to DIVU"}!
            </h1>
            {role && (
              <span className="text-gray-600 text-sm">{role}</span>
            )}
          </div>
        </div>
 
        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" active />
        </div>
 
        {/* Hero */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-10 max-w-6xl mx-auto mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {loading ? "…" : (hero?.title || "About DIVU")}
              </h2>
              {hero?.subtitle ? (
                <p className="text-lg text-gray-700 leading-relaxed mb-6">
                  {hero.subtitle}
                </p>
              ) : null}
              {hero?.description ? (
                <p className="text-base text-gray-700 leading-relaxed mb-6">
                  {hero.description}
                </p>
              ) : null}
              {hero?.cta_label && hero?.cta_href ? (
                <CTAButton href={hero.cta_href} label={hero.cta_label} />
              ) : null}
            </div>
 
            {hero?.media_url ? (
              <div className="flex justify-center">
                {isVideo(hero.media_url) ? (
                  <video
                    src={hero.media_url}
                    className="rounded-lg shadow-lg object-cover w-full max-w-md"
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                ) : (
                  <img
                    src={hero.media_url}
                    alt="About visual"
                    className="rounded-lg shadow-lg object-cover w-full max-w-md"
                  />
                )}
              </div>
            ) : null}
          </div>
        </div>
 
        {/* Additional Sections */}
        {rest.length > 0 && (
          <div className="max-w-6xl mx-auto space-y-6">
            {rest.map((s) => (
              <SectionBlock key={s.id}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    {s.title ? (
                      <h2 className="text-2xl font-bold text-gray-900 mb-2">{s.title}</h2>
                    ) : null}
                    {s.subtitle ? (
                      <p className="text-gray-700 font-medium mb-3">{s.subtitle}</p>
                    ) : null}
                    {s.description ? (
                      <p className="text-gray-700 leading-relaxed mb-4">{s.description}</p>
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
    </AppLayout>
  );
}
 
function Tab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition
        ${
          active
            ? "bg-emerald-600 text-white shadow-sm"
            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
  return <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-8">{children}</div>;
}
 
function isVideo(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}