import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Menu, AppWindow } from "lucide-react";
import { supabase } from "../../../supabaseClient";

/** DRY helper: upsert one or multiple rows into home_content safely */
async function upsertHomeContent(rows) {
  const payload = Array.isArray(rows) ? rows : [rows];
  const prepared = payload.map((r) => ({
    section: r.section,
    sort_order: r.sort_order ?? 0,
    title: r.title ?? null,
    subtitle: r.subtitle ?? null,
    description: r.description ?? null,
    media_url: r.media_url ?? null,
    cta_label: r.cta_label ?? null,
    cta_href: r.cta_href ?? null,
    is_active: r.is_active ?? true,
  }));
  return await supabase.from("home_content").upsert(prepared, {
    onConflict: "section,sort_order",
  });
}

function isSectionCheckError(error) {
  return !!error?.message?.toLowerCase?.().includes("home_content_section_chk");
}

export default function ManageContent() {
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });
  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [activeTab, setActiveTab] = useState("welcome");

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="manage-content" role={role} />

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900" />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;Admin&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        <div className="bg-emerald-900/95 text-white font-extrabold rounded-xl px-6 py-4 shadow-lg border border-emerald-400/70 text-2xl mb-4 tracking-wide drop-shadow-lg">
          MANAGE CONTENT
        </div>

        <div className="flex gap-2 mt-4">
          <Tab label="Welcome" active={activeTab === "welcome"} onClick={() => setActiveTab("welcome")} />
          <Tab label="Culture" active={activeTab === "culture"} onClick={() => setActiveTab("culture")} />
          <Tab label="About" active={activeTab === "about"} onClick={() => setActiveTab("about")} />
        </div>

        <div className="mt-6">
          {activeTab === "welcome" && (
            <Panel>
              <WelcomeEditor />
            </Panel>
          )}
          {activeTab === "culture" && (
            <Panel>
              <CultureEditor />
            </Panel>
          )}
          {activeTab === "about" && (
            <Panel>
              <AboutEditor />
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- small presentational helpers ---------- */
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"
      }`}
    >
      {label}
    </button>
  );
}

function Panel({ children }) {
  return (
    <div className="bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 text-white rounded-2xl shadow-2xl p-10 border border-emerald-400/70 space-y-6 relative overflow-hidden">
      <div className="absolute right-8 bottom-8 opacity-10 pointer-events-none select-none">
        <img src="/divu-logo.png" alt="DIVU Logo" className="w-40" />
      </div>
      {children}
    </div>
  );
}

/* =========================================================
   WELCOME TAB  → tries 'hero' then 'welcome'
   ========================================================= */
function WelcomeEditor() {
  const [title, setTitle] = useState("Welcome to DIVU");
  const [subtitle, setSubtitle] = useState("Your onboarding journey starts here.");
  const [backgroundImage, setBackgroundImage] = useState("/bg.png");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  // the section we discovered DB accepts (hero or welcome)
  const [sectionKey, setSectionKey] = useState("hero");

  // Load existing (try hero first, then welcome)
  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);

      let row = null;
      // try hero
      let { data, error } = await supabase
        .from("home_content")
        .select("*")
        .eq("section", "hero")
        .eq("sort_order", 0)
        .maybeSingle();
      if (!error && data) {
        row = data;
        if (!canceled) setSectionKey("hero");
      }

      // fallback to welcome
      if (!row) {
        const r2 = await supabase
          .from("home_content")
          .select("*")
          .eq("section", "welcome")
          .eq("sort_order", 0)
          .maybeSingle();
        if (!r2.error && r2.data) {
          row = r2.data;
          if (!canceled) setSectionKey("welcome");
        }
      }

      if (!canceled && row) {
        setTitle(row.title ?? "");
        setSubtitle(row.subtitle ?? "");
        setBackgroundImage(row.media_url ?? "");
      }

      if (!canceled) setLoading(false);
    })();
    return () => {
      canceled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");

    // 1) try current sectionKey
    let { error } = await upsertHomeContent({
      section: sectionKey,
      sort_order: 0,
      title,
      subtitle,
      media_url: backgroundImage,
      is_active: true,
    });

    // 2) if constraint fails and we were on 'hero', retry with 'welcome'
    if (isSectionCheckError(error) && sectionKey === "hero") {
      const r = await upsertHomeContent({
        section: "welcome",
        sort_order: 0,
        title,
        subtitle,
        media_url: backgroundImage,
        is_active: true,
      });
      if (!r.error) setSectionKey("welcome");
      error = r.error;
    }

    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved!");
  }

  return (
    <EditorCard title="Edit Welcome Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <Field label="Title" value={title} onChange={setTitle} />
      <Field label="Subtitle" value={subtitle} onChange={setSubtitle} />
      <Field label="Background Image" value={backgroundImage} onChange={setBackgroundImage} />
      <div className="text-xs text-emerald-800">Using DB section key: <b>{sectionKey}</b></div>
    </EditorCard>
  );
}

/* =========================================================
   CULTURE TAB  → section='culture', sort_order=0
   ========================================================= */
function CultureEditor() {
  const [heading, setHeading] = useState("Our Culture");
  const [description, setDescription] = useState("Lorem ipsum dolor sit amet...");
  const [videoUrl, setVideoUrl] = useState("/culture.mp4");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("home_content")
        .select("*")
        .eq("section", "culture")
        .eq("sort_order", 0)
        .maybeSingle();
      if (!canceled) {
        if (!error && data) {
          setHeading(data.title ?? "");
          setDescription(data.description ?? "");
          setVideoUrl(data.media_url ?? "");
        }
        setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await upsertHomeContent({
      section: "culture",
      sort_order: 0,
      title: heading,
      description,
      media_url: videoUrl,
      is_active: true,
    });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved!");
  }

  return (
    <EditorCard title="Edit Culture Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <Field label="Heading" value={heading} onChange={setHeading} />
      <TextArea label="Description" value={description} onChange={setDescription} rows={4} />
      <Field label="Video URL" value={videoUrl} onChange={setVideoUrl} />
    </EditorCard>
  );
}

/* =========================================================
   ABOUT TAB  → three rows with section='about'
   sort_order=0 (Mission), 1 (Values), 2 (How We Work)
   ========================================================= */
function AboutEditor() {
  const [mission, setMission] = useState("Deliver outstanding employee experiences...");
  const [values, setValues] = useState("Put people first, Communicate clearly, Own the outcome...");
  const [howWeWork, setHowWeWork] = useState(
    "We bias toward action, document decisions, and keep feedback loops short..."
  );
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let canceled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("home_content")
        .select("*")
        .eq("section", "about")
        .order("sort_order", { ascending: true });
      if (!canceled) {
        if (!error && data?.length) {
          const m = data.find((d) => d.sort_order === 0);
          const v = data.find((d) => d.sort_order === 1);
          const h = data.find((d) => d.sort_order === 2);
          if (m) setMission(m.description ?? "");
          if (v) setValues(v.description ?? "");
          if (h) setHowWeWork(h.description ?? "");
        }
        setLoading(false);
      }
    })();
    return () => {
      canceled = true;
    };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    const rows = [
      { section: "about", sort_order: 0, title: "Mission", description: mission, is_active: true },
      { section: "about", sort_order: 1, title: "Values", description: values, is_active: true },
      { section: "about", sort_order: 2, title: "How We Work", description: howWeWork, is_active: true },
    ];
    const { error } = await upsertHomeContent(rows);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved!");
  }

  return (
    <EditorCard title="Edit About Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <TextArea label="Mission" value={mission} onChange={setMission} rows={2} />
      <TextArea label="Values" value={values} onChange={setValues} rows={2} />
      <TextArea label="How We Work" value={howWeWork} onChange={setHowWeWork} rows={3} />
    </EditorCard>
  );
}

/* ---------- small form pieces ---------- */
function EditorCard({ title, children, loading, saving, msg, onSave }) {
  return (
    <div className="bg-emerald-50/90 rounded-lg p-6 shadow space-y-4">
      <h2 className="text-lg font-bold text-emerald-900 mb-2">{title}</h2>
      {loading ? <div className="text-emerald-700">Loading…</div> : null}
      {children}
      <div className="flex items-center gap-3">
        <button
          className="mt-2 px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700 disabled:opacity-60"
          onClick={onSave}
          disabled={saving}
        >
          {saving ? "Saving…" : "Save Changes"}
        </button>
        {!!msg && <span className="text-sm text-emerald-900">{msg}</span>}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }) {
  return (
    <>
      <label className="block text-sm font-medium text-emerald-800">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2 text-emerald-900 bg-white placeholder-emerald-400"
      />
    </>
  );
}

function TextArea({ label, value, onChange, rows = 3 }) {
  return (
    <>
      <label className="block text-sm font-medium text-emerald-800">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-md border border-emerald-300 px-3 py-2 text-emerald-900 bg-white placeholder-emerald-400"
      />
    </>
  );
}
