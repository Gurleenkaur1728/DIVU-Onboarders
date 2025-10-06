import { useEffect, useState, useRef } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Menu, AppWindow, Upload, Trash2, Link as LinkIcon, Image as ImageIcon, Film } from "lucide-react";
import { supabase } from "../../../supabaseClient";

/* ============================================
   Helpers
   ============================================ */

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

async function uploadToHomeMedia(file, prefix = "content") {
  if (!file) return { publicURL: null, error: new Error("No file selected") };
  const ext = file.name.split(".").pop()?.toLowerCase() || "bin";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  const path = `${prefix}/${stamp}-${rand}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("home-media")
    .upload(path, file, { cacheControl: "3600", upsert: true });

  if (uploadError) return { publicURL: null, error: uploadError };

  const { data: urlData } = supabase.storage.from("home-media").getPublicUrl(path);
  return { publicURL: urlData?.publicUrl || null, error: null };
}

/* ============================================
   Page
   ============================================ */

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
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-content" role={role} />

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900" />
            <span className="text-emerald-950 font-semibold">Welcome &lt;Admin&gt; to DIVU!</span>
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

/* ---------- UI atoms ---------- */

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

function Field({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <>
      <label className="block text-sm font-medium text-emerald-800">{label}</label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2 text-emerald-900 bg-white placeholder-emerald-400"
      />
    </>
  );
}

function TextArea({ label, value, onChange, rows = 3, placeholder }) {
  return (
    <>
      <label className="block text-sm font-medium text-emerald-800">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-md border border-emerald-300 px-3 py-2 text-emerald-900 bg-white placeholder-emerald-400"
      />
    </>
  );
}

/* ---------- Media Picker ---------- */

function MediaPicker({ label = "Upload media", accept = "image/*,video/*", value, onChange }) {
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  async function handlePick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setMsg("Uploading…");
    const { publicURL, error } = await uploadToHomeMedia(file, "home");
    setBusy(false);
    setMsg(error ? `Upload failed: ${error.message}` : "Uploaded");
    if (!error && publicURL) onChange(publicURL);
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-emerald-800">{label}</label>
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700"
          disabled={busy}
        >
          <Upload className="w-4 h-4" />
          {busy ? "Uploading…" : "Choose File"}
        </button>
        {value ? (
          <>
            <a href={value} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-emerald-900 underline">
              <LinkIcon className="w-4 h-4" /> Open current
            </a>
            <button
              type="button"
              onClick={() => onChange("")}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" /> Clear
            </button>
          </>
        ) : null}
        {!!msg && <span className="text-xs text-emerald-900">{msg}</span>}
      </div>
      <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handlePick} />
      {value && value.match(/\.(png|jpe?g|gif|webp|svg)$/i) ? (
        <img src={value} alt="preview" className="mt-2 max-h-32 rounded border border-emerald-200" />
      ) : null}
    </div>
  );
}

/* ============================================
   WELCOME (HERO) TAB — fixed to use section='hero'
   ============================================ */

function WelcomeEditor() {
  const [title, setTitle] = useState("Welcome to DIVU");
  const [subtitle, setSubtitle] = useState("Your onboarding journey starts here.");
  const [imageUrl, setImageUrl] = useState("");
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
        .eq("section", "hero")
        .eq("sort_order", 0)
        .maybeSingle();
      if (!canceled) {
        if (!error && data) {
          setTitle(data.title ?? "");
          setSubtitle(data.subtitle ?? "");
          setImageUrl(data.media_url ?? "");
        }
        setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await upsertHomeContent({
      section: "hero",
      sort_order: 0,
      title,
      subtitle,
      media_url: imageUrl,
      is_active: true,
    });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "Saved!");
  }

  return (
    <EditorCard title="Edit Welcome Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <Field label="Title" value={title} onChange={setTitle} />
      <Field label="Subtitle" value={subtitle} onChange={setSubtitle} />
      <MediaPicker
        label={
          <>
            Main Image <ImageIcon className="inline-block w-4 h-4 ml-1" />
          </>
        }
        accept="image/*"
        value={imageUrl}
        onChange={setImageUrl}
      />
    </EditorCard>
  );
}

/* ============================================
   CULTURE TAB — fixed image saving and reloading
   ============================================ */

function CultureEditor() {
  const [heading, setHeading] = useState("Our Culture");
  const [description, setDescription] = useState("Lorem ipsum dolor sit amet...");
  const [mediaUrl, setMediaUrl] = useState("");
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
          setMediaUrl(data.media_url ?? "");
        }
        setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");
    const { error } = await upsertHomeContent({
      section: "culture",
      sort_order: 0,
      title: heading,
      description,
      media_url: mediaUrl, // ✅ ensure it saves correctly
      is_active: true,
    });
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "✅ Saved successfully!");
  }

  return (
    <EditorCard title="Edit Culture Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <Field label="Heading" value={heading} onChange={setHeading} />
      <TextArea label="Description" value={description} onChange={setDescription} rows={4} />
      <MediaPicker
        label={<>Image / Video <ImageIcon className="inline-block w-4 h-4 ml-1" /></>}
        accept="image/*,video/*"
        value={mediaUrl}
        onChange={setMediaUrl}
      />
    </EditorCard>
  );
}

/* ============================================
   ABOUT TAB — added image upload support
   ============================================ */

function AboutEditor() {
  const [mission, setMission] = useState("");
  const [values, setValues] = useState("");
  const [howWeWork, setHowWeWork] = useState("");
  const [imageUrl, setImageUrl] = useState(""); // ✅ NEW
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
          const i = data.find((d) => d.sort_order === 3); // ✅ for image
          if (m) setMission(m.description ?? "");
          if (v) setValues(v.description ?? "");
          if (h) setHowWeWork(h.description ?? "");
          if (i) setImageUrl(i.media_url ?? "");
        }
        setLoading(false);
      }
    })();
    return () => { canceled = true; };
  }, []);

  async function save() {
    setSaving(true);
    setMsg("");

    const rows = [
      { section: "about", sort_order: 0, title: "Mission", description: mission, is_active: true },
      { section: "about", sort_order: 1, title: "Values", description: values, is_active: true },
      { section: "about", sort_order: 2, title: "How We Work", description: howWeWork, is_active: true },
      { section: "about", sort_order: 3, title: "Image", media_url: imageUrl, is_active: true }, // ✅ NEW IMAGE ROW
    ];

    const { error } = await upsertHomeContent(rows);
    setSaving(false);
    setMsg(error ? `Error: ${error.message}` : "✅ Saved successfully!");
  }

  return (
    <EditorCard title="Edit About Section" loading={loading} saving={saving} msg={msg} onSave={save}>
      <TextArea label="Mission" value={mission} onChange={setMission} rows={2} />
      <TextArea label="Values" value={values} onChange={setValues} rows={2} />
      <TextArea label="How We Work" value={howWeWork} onChange={setHowWeWork} rows={3} />
      <MediaPicker
        label={<>Main Image <ImageIcon className="inline-block w-4 h-4 ml-1" /></>}
        accept="image/*"
        value={imageUrl}
        onChange={setImageUrl}
      />
    </EditorCard>
  );
}
