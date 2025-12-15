import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { supabase } from "../../src/lib/supabaseClient";
import { Link } from "react-router-dom";
import { useRole } from "../../src/lib/hooks/useRole.js";

export default function Culture() {
  const { role } = useRole();
  const [name, setName] = useState(() => localStorage.getItem("user_name") || "");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);

  const hero = useMemo(() => sections[0], [sections]);
  const rest = useMemo(() => sections.slice(1), [sections]);

  useEffect(() => {
    const storedName = localStorage.getItem("user_name");
    if (storedName) setName(storedName);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadSections() {
      setLoading(true);
      try {
        const { data } = await supabase
          .from("home_content")
          .select("*")
          .eq("section", "culture")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (active) setSections(data || []);
      } catch (err) {
        console.error(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSections();
    return () => (active = false);
  }, []);

  return (
    <AppLayout>
      <div className="flex-1 min-h-dvh p-6 space-y-6 mt-8">

        {/* HEADER */}
        <Header name={name} role={role} active="culture" />

        {/* HERO */}
        <Card className="mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                {loading ? "…" : hero?.title}
              </h2>
              <p className="text-lg text-gray-700 dark:text-gray-300 mb-6">
                {hero?.subtitle}
              </p>
              {hero?.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {hero.description}
                </p>
              )}
            </div>

            {hero?.media_url && <Media url={hero.media_url} />}
          </div>
        </Card>

        {/* ADDITIONAL SECTIONS */}
        <div className="space-y-6">
          {rest.map((s) => (
            <Card key={s.id}>
              <div className="grid md:grid-cols-2 gap-8 items-center">
                <div>
                  <h3 className="text-2xl font-bold mb-2">{s.title}</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {s.subtitle}
                  </p>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    {s.description}
                  </p>
                </div>
                {s.media_url && <Media url={s.media_url} />}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
    
  );  
}

/* ---------- UI Helpers  ---------- */

function Header({ name, role, active }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">
          Welcome {name || "to DIVU"}!
        </h1>
      </div>

      <div className="flex gap-2">
        <HeaderTab label="Welcome" to="/home" active={active === "home"} />
        <HeaderTab label="Culture" to="/culture" active={active === "culture"} />
        <HeaderTab label="About" to="/about" active={active === "about"} />
      </div>
    </div>
  );
}

function HeaderTab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          active
            ? "bg-DivuLightGreen text-black border-black border"
            : "bg-white/80 text-gray-700  dark:bg-black/30 dark:text-gray-300 hover:bg-DivuBlue border border-black dark:hover:bg-DivuBlue"
        }
      `}
    >
      {label}
    </Link>
  );
}

function Card({ children, className = "" }) {
  return (
    <div
      className={`
        rounded-xl border shadow-sm p-8 transition
        bg-white/90 text-gray-900 border-gray-200
        dark:bg-black/40 dark:text-gray-100 dark:border-black
        ${className}
      `}
    >
      {children}
    </div>
  );
}

function CTAButton({ href, label }) {
  return (
    <Link
      to={href}
      className="inline-block px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
    >
      {label}
    </Link>
  );
}

function Media({ url }) {
  return /\.(mp4|webm|mov|m4v)/i.test(url) ? (
    <video src={url} autoPlay loop muted className="rounded-lg shadow-lg w-full max-w-md" />
  ) : (
    <img src={url} alt="" className="rounded-lg shadow-lg w-full max-w-md" />
  );
}
