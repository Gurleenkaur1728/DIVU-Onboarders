import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useRole } from "../../../src/lib/hooks/useRole.js";
import { useToast } from "../../context/ToastContext.jsx";

// Icons
import { 
  Save,
  Trash2, 
  Plus } from "lucide-react";

export default function ManageContent() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState("welcome");
  const [sections, setSections] = useState([]);
  const [_loading, setLoading] = useState(false);

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
                sort_order: 1,
                title: section === "hero" ? "Welcome to DIVU!" : "Section Title",
                subtitle: "",
                description: "",
                media_url: "",
                cta_label: "",
                cta_href: "",
                is_active: true,
              },
            ])
            .select("*")
            .single();

          if (insertError) throw insertError;
          rows = inserted ? [inserted] : [];
        }

        setSections(rows);
      } catch (error) {
        showToast("Failed to load content: " + error.message, "error");
      } finally {
        setLoading(false);
      }
    },
    [tabToSection, showToast]
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

    try {
      showToast("Uploading media...", "info");
      
      const { error: uploadError } = await supabase.storage
        .from("assets")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from("assets").getPublicUrl(filePath);
      const publicUrl = data.publicUrl;
      
      updateLocal(index, { media_url: publicUrl });
      
      // Auto-save after upload
      const row = { ...sections[index], media_url: publicUrl };
      
      if (row.id) {
        const { error: saveError } = await supabase
          .from("home_content")
          .update({ media_url: publicUrl })
          .eq("id", row.id);
          
        if (saveError) throw saveError;
      }
      
      showToast("Media uploaded and saved successfully!", "success");
    } catch (error) {
      showToast("Upload failed: " + error.message, "error");
    }
  }

  async function saveSection(index) {
    setLoading(true);
    const row = sections[index];

    try {
      if (row.id) {
        // UPDATE existing section
        const { error } = await supabase
          .from("home_content")
          .update({
            title: row.title ?? "",
            subtitle: row.subtitle ?? "",
            description: row.description ?? "",
            media_url: row.media_url ?? "",
            cta_label: row.cta_label ?? "",
            cta_href: row.cta_href ?? "",
            is_active: row.is_active ?? true,
            sort_order: row.sort_order ?? 1,
          })
          .eq("id", row.id);

        if (error) throw error;
      } else {
        // INSERT new section - calculate next sort_order
        const maxSort = sections.reduce((max, s) => 
          (s.sort_order > max ? s.sort_order : max), 0
        );

        const { error } = await supabase
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
              sort_order: maxSort + 1,
            },
          ]);

        if (error) throw error;
      }

      showToast("Section saved successfully!", "success");
      await fetchSections(activeTab);
    } catch (error) {
      showToast("Failed to save: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function deleteSection(index) {
    const row = sections[index];
    if (!row) return;

    if (!row.id) {
      // Remove unsaved draft
      setSections((prev) => prev.filter((_, i) => i !== index));
      showToast("Draft section removed", "info");
      return;
    }

    if (!confirm("Are you sure you want to delete this section?")) {
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from("home_content")
        .delete()
        .eq("id", row.id);

      if (error) throw error;

      showToast("Section deleted successfully", "success");
      await fetchSections(activeTab);
    } catch (error) {
      showToast("Failed to delete: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  async function addDraftSection() {
    setLoading(true);

    try {
      // Calculate next sort_order
      const maxSort = sections.reduce((max, s) => 
        (s.sort_order > max ? s.sort_order : max), 0
      );

      const { error } = await supabase
        .from("home_content")
        .insert([
          {
            section: tabToSection(activeTab),
            title: "New Section",
            subtitle: "",
            description: "",
            media_url: "",
            cta_label: "",
            cta_href: "",
            is_active: true,
            sort_order: maxSort + 1,
          },
        ]);

      if (error) throw error;

      showToast("New section added! Edit and save your changes.", "success");
      await fetchSections(activeTab);
    } catch (error) {
      showToast("Failed to add section: " + error.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="bg-white min-h-screen p-8">
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
            return (
              <div
                key={s.id ?? `draft-${idx}`}
                className="border border-gray-200 rounded-lg p-4 mb-5"
              >
                {/* Header row */}
                <div className="flex justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm px-2 py-1 rounded bg-emerald-100 border border-emerald-300 text-emerald-700 font-medium">
                      Section #{s.sort_order}
                    </span>
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
                      onClick={() => deleteSection(idx)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition"
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
          <button
            onClick={addDraftSection}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition mt-4"
          >
            <Plus size={18} />
            Add Section
          </button>
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
