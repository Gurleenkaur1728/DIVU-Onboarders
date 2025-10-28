import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../../components/Sidebar.jsx";
import { Plus, Trash2, Save, Lock } from "lucide-react";
import { useRole } from "../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../src/lib/supabaseClient.js";
 
export default function ManageContent() {
  const navigate = useNavigate();
  const { roleId, isAdmin } = useRole();
  const [activeTab, setActiveTab] = useState("welcome");
  const [sections, setSections] = useState([]); // [{id, section, title, subtitle, description, media_url, cta_label, cta_href, sort_order, is_active}]
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
 
  // Add Section form
  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState("text"); // "text" | "photo" | "video"
  const [newDraft, setNewDraft] = useState({
    title: "",
    subtitle: "",
    description: "",
    media_url: "",
    cta_label: "",
    cta_href: "",
  });

  // Role check
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);
 
  const tabToSection = useCallback((tab) => {
    return tab === "welcome" ? "hero" : tab === "culture" ? "culture" : "about";
  }, []);

  /* Load Data */
  const fetchSections = useCallback(async (tab) => {
    setLoading(true);
    setMessage("");
    const section = tabToSection(tab);

    try {
      const { data, error } = await supabase
        .from("home_content")
        .select("*")
        .eq("section", section)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;

      let rows = data || [];

      if (rows.length === 0) {
        const { data: inserted, error: insertError } = await supabase
          .from("home_content")
          .insert([
            {
              section,
              sort_order: 0,
              title: section === "hero" ? "Welcome" : "Section Title",
              subtitle: "",
              description: "",
              media_url: "",
              cta_label: "",
              cta_href: "",
              is_active: true,
            },
          ])
          .select("*")
          .maybeSingle();

        if (insertError) throw insertError;
        rows = inserted ? [inserted] : [];
      }

      setSections(rows);
    } catch (error) {
      console.error("Error loading content sections:", error);
      setMessage("⚠️ Failed to load content.");
      setSections([]);
    } finally {
      setLoading(false);
    }
  }, [tabToSection]);

  // Load all sections for current tab
  useEffect(() => {
    if (activeTab) fetchSections(activeTab);
  }, [activeTab, fetchSections]);

  function updateLocal(index, patch) {
    setSections((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  }

  async function handleUpload(e, index) {
    const file = e.target.files?.[0];
    if (!file) return;

    const sectionName = sections[index]?.section || tabToSection(activeTab);
    const fileExt = file.name.split(".").pop();
    const filePath = `${sectionName}/${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      console.error(uploadError);
      setMessage("⚠️ Upload failed.");
      return;
    }

    const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
    updateLocal(index, { media_url: data.publicUrl });
    setMessage("✅ Media uploaded!");
  }

  // Save section
  async function saveSection(index) {
    setLoading(true);
    setMessage("");
    const row = sections[index];

    try {
      let result;

      if (row.id) {
        result = await supabase
          .from("home_content")
          .update({
            title: row.title ?? "",
            subtitle: row.subtitle ?? "",
            description: row.description ?? "",
            media_url: row.media_url ?? "",
            cta_label: row.cta_label ?? "",
            cta_href: row.cta_href ?? "",
            is_active: row.is_active ?? true,
            sort_order: row.sort_order ?? 0,
          })
          .eq("id", row.id)
          .select("*")
          .maybeSingle();
      } else {
        result = await supabase
          .from("home_content")
          .insert([
            {
              section: tabToSection(activeTab),
              title: row.title ?? "",
              subtitle: row.subtitle ?? "",
              description: row.description ?? "",
              media_url: row.media_url ?? "",
              cta_label: row.cta_label ?? "",
              cta_href: row.cta_href ?? "",
              is_active: row.is_active ?? true,
              sort_order: row.sort_order ?? sections.length,
            },
          ])
          .select("*")
          .maybeSingle();
      }

      if (result.error) throw result.error;

      setMessage("✅ Section saved.");
      await fetchSections(activeTab);
    } catch (error) {
      console.error("Error saving content section:", error);
      setMessage("⚠️ Failed to save changes.");
    } finally {
      setLoading(false);
    }
  }

  // Delete section
  async function deleteSection(index) {
    const row = sections[index];
    if (!row) return;

    // First section protection: either id === first, or sort_order === 0
    const isFirst = row.sort_order === 0;
    if (isFirst) {
      setMessage("⚠️ You cannot delete the first section.");
      return;
    }

    if (!row.id) {
      setSections((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const { error } = await supabase
        .from("home_content")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      setMessage("🗑️ Section deleted.");
      await resequenceSortOrder();
      await fetchSections(activeTab);
    } catch (error) {
      console.error("Error deleting content section:", error);
      setMessage("⚠️ Failed to delete section.");
    } finally {
      setLoading(false);
    }
  }

  // Resequence sort order
  async function resequenceSortOrder() {
    try {
      const section = tabToSection(activeTab);
      const { data, error } = await supabase
        .from("home_content")
        .select("id")
        .eq("section", section)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data) return;

      const updates = data.map((row, idx) => ({ id: row.id, sort_order: idx }));
      if (updates.length === 0) return;

      const { error: upsertError } = await supabase
        .from("home_content")
        .upsert(updates, { onConflict: "id" });

      if (upsertError) throw upsertError;
    } catch (error) {
      console.error("Error resequencing sort order:", error);
    }
  }

  // Add Section flow
  function addDraftSection() {
    const section = tabToSection(activeTab);
    const nextOrder = sections.length; // append
    const base = {
      id: null,
      section,
      title: newDraft.title.trim(),
      subtitle: newDraft.subtitle.trim(),
      description: newDraft.description.trim(),
      media_url: newDraft.media_url.trim(),
      cta_label: newDraft.cta_label.trim(),
      cta_href: newDraft.cta_href.trim(),
      sort_order: nextOrder,
      is_active: true,
    };
    setSections((prev) => [...prev, base]);
    // reset add form
    setNewDraft({
      title: "",
      subtitle: "",
      description: "",
      media_url: "",
      cta_label: "",
      cta_href: "",
    });
    setNewType("text");
    setAddOpen(false);
  }

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="manage-content" role={roleId} />
 
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">Admin – Manage Content</span>
        </div>
 
        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          MANAGE CONTENT
        </div>
 
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome"  active={activeTab === "welcome"} onClick={() => setActiveTab("welcome")} />
          <Tab label="Culture"  active={activeTab === "culture"} onClick={() => setActiveTab("culture")} />
          <Tab label="About"    active={activeTab === "about"}   onClick={() => setActiveTab("about")} />
        </div>
 
        {/* Sections List */}
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-5xl">
          <h3 className="font-bold text-lg mb-4 text-emerald-900">
            {activeTab === "welcome"
              ? "Homepage Hero Sections"
              : activeTab === "culture"
              ? "Culture Page Sections"
              : "About Page Sections"}
          </h3>
 
          {sections.map((s, idx) => {
            const isFirst = s.sort_order === 0;
            return (
              <div key={s.id ?? `draft-${idx}`} className="border rounded-xl p-4 mb-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-1 rounded bg-emerald-50 border border-emerald-200 text-emerald-900">
                      #{s.sort_order}
                    </span>
                    {isFirst ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800">
                        <Lock size={14}/> First section (locked)
                      </span>
                    ) : null}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSection(idx)}
                      disabled={loading}
                      className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                    >
                      <Save size={16}/> {loading ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => deleteSection(idx)}
                      disabled={isFirst || loading}
                      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded ${
                        isFirst ? "bg-gray-200 text-gray-500 cursor-not-allowed" : "bg-red-600 text-white hover:bg-red-700"
                      }`}
                      title={isFirst ? "The first section cannot be deleted" : "Delete section"}
                    >
                      <Trash2 size={16}/> Delete
                    </button>
                  </div>
                </div>
 
                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="font-semibold text-emerald-900">Title</span>
                    <input
                      type="text"
                      value={s.title ?? ""}
                      onChange={(e) => updateLocal(idx, { title: e.target.value })}
                      placeholder="Enter title"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
 
                  <label className="block">
                    <span className="font-semibold text-emerald-900">Subtitle</span>
                    <input
                      type="text"
                      value={s.subtitle ?? ""}
                      onChange={(e) => updateLocal(idx, { subtitle: e.target.value })}
                      placeholder="Optional subtitle"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
 
                  <label className="block md:col-span-2">
                    <span className="font-semibold text-emerald-900">Body / Description</span>
                    <textarea
                      rows="4"
                      value={s.description ?? ""}
                      onChange={(e) => updateLocal(idx, { description: e.target.value })}
                      placeholder="Enter descriptive text"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
 
                  <label className="block">
                    <span className="font-semibold text-emerald-900">CTA Label</span>
                    <input
                      type="text"
                      value={s.cta_label ?? ""}
                      onChange={(e) => updateLocal(idx, { cta_label: e.target.value })}
                      placeholder="e.g., Get Started"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
 
                  <label className="block">
                    <span className="font-semibold text-emerald-900">CTA Link</span>
                    <input
                      type="url"
                      value={s.cta_href ?? ""}
                      onChange={(e) => updateLocal(idx, { cta_href: e.target.value })}
                      placeholder="https://example.com"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
 
                  {/* Media */}
                  <div className="md:col-span-2">
                    <span className="font-semibold text-emerald-900">Media (Image or Video)</span>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleUpload(e, idx)}
                        className="cursor-pointer"
                      />
                      {s.media_url && (/\.(mp4|webm|mov|m4v)$/i.test(s.media_url) ? (
                        <video
                          src={s.media_url}
                          className="w-48 h-28 object-cover rounded border"
                          controls
                        />
                      ) : (
                        <img
                          src={s.media_url}
                          alt="preview"
                          className="w-48 h-28 object-cover rounded border"
                        />
                      ))}
                    </div>
                    <input
                      type="url"
                      value={s.media_url ?? ""}
                      onChange={(e) => updateLocal(idx, { media_url: e.target.value })}
                      placeholder="Or paste a direct media URL..."
                      className="w-full border rounded px-3 py-2 mt-3 focus:ring-2 focus:ring-emerald-400"
                    />
                  </div>
 
                  {/* Active toggle */}
                  <label className="flex items-center gap-2 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(s.is_active)}
                      onChange={(e) => updateLocal(idx, { is_active: e.target.checked })}
                    />
                    <span className="text-sm text-emerald-900">Active</span>
                  </label>
                </div>
              </div>
            );
          })}
 
          {/* Add Section */}
          <div className="mt-8 border-t pt-6">
            {!addOpen ? (
              <button
                onClick={() => setAddOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
              >
                <Plus size={18}/> Add Section
              </button>
            ) : (
              <div className="border rounded-xl p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <label className="block">
                    <span className="font-semibold text-emerald-900">Type</span>
                    <select
                      value={newType}
                      onChange={(e) => setNewType(e.target.value)}
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="text">Text</option>
                      <option value="photo">Photo</option>
                      <option value="video">Video</option>
                    </select>
                  </label>
                  <label className="block md:col-span-2">
                    <span className="font-semibold text-emerald-900">Title</span>
                    <input
                      type="text"
                      value={newDraft.title}
                      onChange={(e) => setNewDraft((p) => ({ ...p, title: e.target.value }))}
                      placeholder="Enter title"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                </div>
 
                <label className="block mb-3">
                  <span className="font-semibold text-emerald-900">Subtitle</span>
                  <input
                    type="text"
                    value={newDraft.subtitle}
                    onChange={(e) => setNewDraft((p) => ({ ...p, subtitle: e.target.value }))}
                    placeholder="Optional subtitle"
                    className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                  />
                </label>
 
                <label className="block mb-3">
                  <span className="font-semibold text-emerald-900">Body / Description</span>
                  <textarea
                    rows="3"
                    value={newDraft.description}
                    onChange={(e) => setNewDraft((p) => ({ ...p, description: e.target.value }))}
                    placeholder="Enter descriptive text"
                    className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                  />
                </label>
 
                {(newType === "photo" || newType === "video") && (
                  <label className="block mb-3">
                    <span className="font-semibold text-emerald-900">Media URL</span>
                    <input
                      type="url"
                      value={newDraft.media_url}
                      onChange={(e) => setNewDraft((p) => ({ ...p, media_url: e.target.value }))}
                      placeholder={newType === "photo" ? "https://...image.jpg" : "https://...video.mp4"}
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                )}
 
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="block">
                    <span className="font-semibold text-emerald-900">CTA Label</span>
                    <input
                      type="text"
                      value={newDraft.cta_label}
                      onChange={(e) => setNewDraft((p) => ({ ...p, cta_label: e.target.value }))}
                      placeholder="e.g., Learn More"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                  <label className="block">
                    <span className="font-semibold text-emerald-900">CTA Link</span>
                    <input
                      type="url"
                      value={newDraft.cta_href}
                      onChange={(e) => setNewDraft((p) => ({ ...p, cta_href: e.target.value }))}
                      placeholder="https://example.com"
                      className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
                    />
                  </label>
                </div>
 
                <div className="flex items-center gap-3 mt-4">
                  <button
                    onClick={addDraftSection}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Save size={18}/> Add
                  </button>
                  <button
                    onClick={() => { setAddOpen(false); setNewDraft({ title:"", subtitle:"", description:"", media_url:"", cta_label:"", cta_href:"" }); setNewType("text"); }}
                    className="px-4 py-2 rounded border"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
 
          {/* Messages */}
          {message && (
            <p className={`mt-4 font-medium ${message.includes("⚠️") ? "text-red-600" : "text-emerald-700"}`}>
              {message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
 
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