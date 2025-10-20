import { useState, useEffect } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { Upload } from "lucide-react";

export default function ManageContent() {
  const [activeTab, setActiveTab] = useState("welcome");
  const [content, setContent] = useState({
    title: "",
    subtitle: "",
    media_url: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const [roleId, setRoleId] = useState(() => {
    const r = localStorage.getItem("role_id");
    const n = r ? parseInt(r, 10) : NaN;
        return Number.isNaN(n) ? null : n;
  });

  useEffect(() => {
    // If not in localStorage, fall back to fetching profile
    (async () => {
      if (roleId != null) return;
      const { data: { user } = {} } = await supabase.auth.getUser();
      if (!user) return;
      const { data: prof } = await supabase
        .from("users")
        .select("role_id")
        .eq("id", user.id)
        .maybeSingle();
      if (prof?.role_id != null) {
        setRoleId(typeof prof.role_id === "string" ? parseInt(prof.role_id, 10) : prof.role_id);
      }
    })();
  }, [roleId]);


  // 🧭 Load content whenever the active tab changes
  useEffect(() => {
    if (activeTab) loadContent(activeTab);
  }, [activeTab]);

  // ✅ Fetch content from Supabase for the current tab
  async function loadContent(tab) {
    setLoading(true);
    setMessage("");

    const section =
      tab === "welcome" ? "hero" : tab === "culture" ? "culture" : "about";

    const { data, error } = await supabase
      .from("home_content")
      .select("*")
      .eq("section", section)
      .eq("sort_order", 0)
      .maybeSingle();

    if (error) {
      console.error(error);
      setMessage("⚠️ Failed to load content.");
    } else if (data) {
      setContent(data);
    } else {
      setContent({ title: "", subtitle: "", media_url: "" });
    }

    setLoading(false);
  }

  // ✅ Handle image upload (Supabase Storage)
  async function handleUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `${activeTab}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("assets")
      .upload(filePath, file);

    if (uploadError) {
      console.error(uploadError);
      setMessage("⚠️ Image upload failed.");
      return;
    }

    const { data } = supabase.storage
      .from("assets")
      .getPublicUrl(filePath);

    setContent((prev) => ({ ...prev, media_url: data.publicUrl }));
    setMessage("✅ Image uploaded successfully!");
  }

  // ✅ Save updated content back to Supabase
  async function saveContent() {
    setLoading(true);
    setMessage("");

    const section =
      activeTab === "welcome" ? "hero" : activeTab === "culture" ? "culture" : "about";

    // Check if the record already exists
    const { data: existing } = await supabase
      .from("home_content")
      .select("id")
      .eq("section", section)
      .eq("sort_order", 0)
      .maybeSingle();

    let result;
    if (existing) {
      // Update existing
      result = await supabase
        .from("home_content")
        .update({
          title: content.title,
          subtitle: content.subtitle,
          media_url: content.media_url,
        })
        .eq("id", existing.id);
    } else {
      // Insert new
      result = await supabase.from("home_content").insert([
        {
          section,
          sort_order: 0,
          title: content.title,
          subtitle: content.subtitle,
          media_url: content.media_url,
        },
      ]);
    }

    if (result.error) {
      console.error(result.error);
      setMessage("⚠️ Failed to save changes.");
    } else {
      setMessage(
        `✅ ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} content updated successfully!`
      );
    }

    setLoading(false);
  }

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="manage-content" role={roleId ?? ROLES.ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Admin – Manage Content
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          MANAGE CONTENT
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
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

        {/* Content Editor */}
        <div className="bg-white rounded-xl p-6 shadow-lg max-w-3xl">
          <h3 className="font-bold text-lg mb-4 text-emerald-900">
            {activeTab === "welcome"
              ? "Homepage Hero Section"
              : activeTab === "culture"
              ? "Culture Page Section"
              : "About Page Section"}
          </h3>

          {/* Title Field */}
          <label className="block mb-4">
            <span className="font-semibold text-emerald-900">Title</span>
            <input
              type="text"
              value={content.title}
              onChange={(e) => setContent({ ...content, title: e.target.value })}
              placeholder="Enter title"
              className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
            />
          </label>

          {/* Subtitle / Body Field */}
          <label className="block mb-4">
            <span className="font-semibold text-emerald-900">
              {activeTab === "welcome" ? "Subtitle" : "Body Text"}
            </span>
            <textarea
              rows="4"
              value={content.subtitle}
              onChange={(e) =>
                setContent({ ...content, subtitle: e.target.value })
              }
              placeholder="Enter description text"
              className="w-full border rounded px-3 py-2 mt-1 focus:ring-2 focus:ring-emerald-400"
            />
          </label>

          {/* Image Upload Field */}
          <div className="mb-4">
            <span className="font-semibold text-emerald-900">Image Upload</span>
            <div className="flex items-center gap-3 mt-2">
              <input
                type="file"
                accept="image/*"
                onChange={handleUpload}
                className="cursor-pointer"
              />
              {content.media_url && (
                <img
                  src={content.media_url}
                  alt="preview"
                  className="w-32 h-20 object-cover rounded border"
                />
              )}
            </div>
          </div>

          {/* Save Button */}
          <button
            onClick={saveContent}
            disabled={loading}
            className="px-6 py-2 bg-emerald-600 text-white font-semibold rounded hover:bg-emerald-700 transition"
          >
            {loading ? "Saving..." : "Save Changes"}
          </button>

          {/* Message */}
          {message && (
            <p
              className={`mt-4 font-medium ${
                message.includes("⚠️")
                  ? "text-red-600"
                  : "text-emerald-700"
              }`}
            >
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
