import { useEffect, useMemo, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { Link } from "react-router-dom";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { supabase } from "../../src/lib/supabaseClient";

export default function About() {
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

    const fallback = [
      {
        id: "fallback",
        title: "About DIVU",
        subtitle: "Learn about our mission and how we onboard with care.",
        description: "",
        media_url: "/aboutdivu.jpg",
        sort_order: 1,
        is_active: true,
      },
    ];

    async function loadSections() {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("home_content")
          .select("*")
          .eq("section", "about")
          .eq("is_active", true)
          .order("sort_order", { ascending: true });

        if (error) throw error;
        if (!active) return;

        setSections(data?.length ? data : fallback);
      } catch (err) {
        console.error(err);
        if (active) setSections(fallback);
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

        {/* HEADER — matches Admin Dashboard */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-emerald-950 dark:text-emerald-100">
              Welcome {name || "to DIVU"}!
            </h1>
          </div>

          {/* TABS IN HEADER */}
          <div className="flex gap-2">
            <HeaderTab label="Welcome" to="/home" />
            <HeaderTab label="Culture" to="/culture" />
            <HeaderTab label="About" to="/about" active />
          </div>
        </div>

        {/* HERO CARD */}
        <Card className="mb-8">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">
                {loading ? "…" : hero?.title}
              </h2>

              {hero?.subtitle && (
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">
                  {hero.subtitle}
                </p>
              )}

              {hero?.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-6">
                  {hero.description}
                </p>
              )}

              {hero?.cta_label && hero?.cta_href && (
                <CTAButton href={hero.cta_href} label={hero.cta_label} />
              )}
            </div>

            {hero?.media_url && (
              <MediaBlock url={hero.media_url} alt="About visual" />
            )}
          </div>
        </Card>

        {/* ADDITIONAL SECTIONS */}
        {rest.length > 0 && (
          <div className="space-y-6">
            {rest.map((s) => (
              <Card key={s.id}>
                <div className="grid md:grid-cols-2 gap-8 items-center">
                  <div>
                    {s.title && (
                      <h3 className="text-2xl font-bold mb-2">{s.title}</h3>
                    )}
                    {s.subtitle && (
                      <p className="font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {s.subtitle}
                      </p>
                    )}
                    {s.description && (
                      <p className="text-gray-700 dark:text-gray-300 mb-4">
                        {s.description}
                      </p>
                    )}
                    {s.cta_label && s.cta_href && (
                      <CTAButton href={s.cta_href} label={s.cta_label} />
                    )}
                  </div>

                  {s.media_url && (
                    <MediaBlock url={s.media_url} alt={s.title} />
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

/* -------------------- UI HELPERS -------------------- */

function HeaderTab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`
        px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          active
            ? "bg-DivuLightGreen text-black border-black border"
            : "bg-white/80 text-gray-700  dark:bg-black/30 dark:text-gray-300 hover:bg-DivuBlue border border-black"
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
  const isInternal = href.startsWith("/") || href.startsWith("#");
  const classes =
    "inline-block px-5 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition";

  return isInternal ? (
    <Link to={href} className={classes}>
      {label}
    </Link>
  ) : (
    <a href={href} target="_blank" rel="noopener noreferrer" className={classes}>
      {label}
    </a>
  );
}

function MediaBlock({ url, alt }) {
  return isVideo(url) ? (
    <video
      src={url}
      autoPlay
      loop
      muted
      playsInline
      className="rounded-lg shadow-lg object-cover w-full max-w-md"
    />
  ) : (
    <img
      src={url}
      alt={alt}
      className="rounded-lg shadow-lg object-cover w-full max-w-md"
    />
  );
}

function isVideo(url = "") {
  return /\.(mp4|webm|mov|m4v)(\?.*)?$/i.test(url);
}
