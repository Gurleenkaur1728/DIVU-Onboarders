import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useRole } from "../../../src/lib/hooks/useRole.js";

// Icons
import { 
  Save,
  Trash2, 
  Plus, 
  Lock } from "lucide-react";

export default function ManageContent() {
  const navigate = useNavigate();
  const { roleId, isAdmin } = useRole();

  const [activeTab, setActiveTab] = useState("welcome");
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [newType, setNewType] = useState("text");
  const [newDraft, setNewDraft] = useState({
    title: "",
    subtitle: "",
    description: "",
    media_url: "",
    cta_label: "",
    cta_href: "",
  });

  // Redirect non-admins
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);

  const tabToSection = useCallback((tab) => {
    if (tab === "welcome") return "hero";
    if (tab === "culture") return "culture";
    return "about";
  }, []);

  const fetchSections = useCallback(
    async (tab) => {
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
        console.error("Error loading content:", error);
        setMessage("⚠️ Failed to load content.");
      } finally {
        setLoading(false);
      }
    },
    [tabToSection]
  );

  useEffect(() => {
    fetchSections(activeTab);
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
    const filePath = `${sectionName}/${Date.now()}_${Math.random()
      .toString(36)
      .slice(2)}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, file, { upsert: false });

    if (uploadError) {
      setMessage("⚠️ Upload failed.");
      return;
    }

    const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
    updateLocal(index, { media_url: data.publicUrl });
    setMessage("✅ Media uploaded!");
  }

  async function saveSection(index) {
    setLoading(true);
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
              ...row,
              sort_order: sections.length,
            },
          ])
          .select("*")
          .maybeSingle();
      }

      if (result.error) throw result.error;

      setMessage("✅ Section saved.");
      fetchSections(activeTab);
    } catch (error) {
      console.error(error);
      setMessage("⚠️ Failed to save section.");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSection(index) {
    const row = sections[index];
    if (!row) return;

    if (row.sort_order === 0) {
      setMessage("⚠️ You cannot delete the first section.");
      return;
    }

    if (!row.id) {
      setSections((prev) => prev.filter((_, i) => i !== index));
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("home_content")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      setMessage("🗑️ Section deleted.");
      fetchSections(activeTab);
    } catch (error) {
      console.error(error);
      setMessage("⚠️ Failed to delete section.");
    } finally {
      setLoading(false);
    }
  }

  function addDraftSection() {
    const newSection = {
      id: null,
      section: tabToSection(activeTab),
      ...newDraft,
      sort_order: sections.length,
      is_active: true,
    };

    setSections((prev) => [...prev, newSection]);

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
    <AppLayout>
      <div className="min-h-screen p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-emerald-950 mb-2">Manage Content</h1>
          <p className="text-gray-600">Edit homepage content for Welcome, Culture, and About sections</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8">
          <Tab
            label="Welcome"
            active={activeTab === "welcome"}
            onClick={() => setActiveTab("welcome")}
          />
          <Tab
            label="Culture"
            active={activeTab === "culture"}
            onClick={() => setActiveTab("culture")}
          />
          <Tab
            label="About"
            active={activeTab === "about"}
            onClick={() => setActiveTab("about")}
          />
        </div>

        {/* Section Editor */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 max-w-5xl">
          {/* Loop sections */}
          {sections.map((s, idx) => {
            const isFirst = s.sort_order === 0;

            return (
              <div
                key={s.id ?? `draft-${idx}`}
                className="border border-gray-200 rounded-lg p-4 mb-5"
              >
                {/* Header row */}
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-1 rounded bg-gray-100 border border-gray-300 text-gray-700">
                      #{s.sort_order}
                    </span>

                    {isFirst && (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                        <Lock size={14} /> First section (locked)
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => saveSection(idx)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition"
                    >
                      <Save size={16} />
                      Save
                    </button>

                    <button
                      disabled={isFirst}
                      onClick={() => deleteSection(idx)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${
                        isFirst
                          ? "bg-gray-200 text-gray-400 cursor-not-allowed"
                          : "bg-red-600 text-white hover:bg-red-700 transition"
                      }`}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </div>

                {/* Fields */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Title */}
                  <label className="block">
                    <span className="font-semibold text-gray-700">
                      Title
                    </span>
                    <input
                      type="text"
                      value={s.title ?? ""}
                      onChange={(e) =>
                        updateLocal(idx, { title: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </label>

                  {/* Subtitle */}
                  <label className="block">
                    <span className="font-semibold text-gray-700">
                      Subtitle
                    </span>
                    <input
                      type="text"
                      value={s.subtitle ?? ""}
                      onChange={(e) =>
                        updateLocal(idx, { subtitle: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </label>

                  {/* Description */}
                  <label className="block md:col-span-2">
                    <span className="font-semibold text-gray-700">
                      Description
                    </span>
                    <textarea
                      rows="4"
                      value={s.description ?? ""}
                      onChange={(e) =>
                        updateLocal(idx, { description: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </label>

                  {/* CTA label */}
                  <label className="block">
                    <span className="font-semibold text-gray-700">
                      CTA Label
                    </span>
                    <input
                      type="text"
                      value={s.cta_label ?? ""}
                      onChange={(e) =>
                        updateLocal(idx, { cta_label: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </label>

                  {/* CTA link */}
                  <label className="block">
                    <span className="font-semibold text-gray-700">
                      CTA Link
                    </span>
                    <input
                      type="url"
                      value={s.cta_href ?? ""}
                      onChange={(e) =>
                        updateLocal(idx, { cta_href: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </label>

                  {/* Media Upload */}
                  <div className="md:col-span-2">
                    <span className="font-semibold text-gray-700">
                      Media
                    </span>
                    <div className="flex items-center gap-3 mt-2">
                      <input
                        type="file"
                        accept="image/*,video/*"
                        onChange={(e) => handleUpload(e, idx)}
                      />
                      {s.media_url && <img src={s.media_url} className="w-40" />}
                    </div>
                  </div>

                  {/* Active toggle */}
                  <label className="flex items-center gap-2 md:col-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(s.is_active)}
                      onChange={(e) =>
                        updateLocal(idx, { is_active: e.target.checked })
                      }
                      className="rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span className="text-gray-700">Active</span>
                  </label>
                </div>
              </div>
            );
          })}

          {/* ADD NEW SECTION */}
          {!addOpen ? (
            <button
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition mt-4"
            >
              <Plus size={18} />
              Add Section
            </button>
          ) : (
            <div className="border border-gray-200 rounded-lg p-4 mt-4">
              <h3 className="font-semibold text-gray-900 mb-2">
                Add New Section
              </h3>

              <label className="block mb-3">
                <span className="font-semibold text-gray-700">Title</span>
                <input
                  type="text"
                  value={newDraft.title}
                  onChange={(e) =>
                    setNewDraft((p) => ({ ...p, title: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </label>

              <label className="block mb-3">
                <span className="font-semibold text-gray-700">Subtitle</span>
                <input
                  type="text"
                  value={newDraft.subtitle}
                  onChange={(e) =>
                    setNewDraft((p) => ({ ...p, subtitle: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </label>

              <label className="block mb-3">
                <span className="font-semibold text-gray-700">
                  Description
                </span>
                <textarea
                  rows="3"
                  value={newDraft.description}
                  onChange={(e) =>
                    setNewDraft((p) => ({ ...p, description: e.target.value }))
                  }
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </label>

              <div className="flex items-center gap-3 mt-4">
                <button
                  onClick={addDraftSection}
                  className="flex items-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition"
                >
                  <Save size={18} />
                  Add
                </button>
                <button
                  onClick={() => setAddOpen(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {message && (
            <p
              className={`mt-4 px-4 py-2 rounded-lg font-medium ${
                message.includes("⚠️")
                  ? "bg-red-50 text-red-700 border border-red-200"
                  : "bg-green-50 text-green-700 border border-green-200"
              }`}
            >
              {message}
            </p>
          )}
        </div>
      </div>
    </AppLayout>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
