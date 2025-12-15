import AppLayout from "../../../src/AppLayout.jsx";
import { useEffect, useState, useMemo } from "react";
import { Plus, Edit, Trash2, Search, SlidersHorizontal, Grid3x3, List, Copy, MoreVertical } from "lucide-react";
import Toast from "../../components/Toast.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useRole } from "../../../src/lib/hooks/useRole.js";

import StatusPill from "../../components/modules/StatusPill.jsx";
import ModuleBuilderModal from "../../components/modules/ModuleBuilderModal.jsx";

export default function ManageModules() {
  const { roleId } = useRole();

  const [modules, setModules] = useState([]);
  const [draftModules, setDraftModules] = useState([]);
  const [publishedModules, setPublishedModules] = useState([]);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search, filter, and view state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("date"); // "date", "title", "progress"
  const [viewMode, setViewMode] = useState("grid"); // "grid" or "list"
  const [selectedDrafts, setSelectedDrafts] = useState([]);
  const [showQuickActions, setShowQuickActions] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });

  // builder modal state
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftId, setDraftId] = useState(null);

  const showToast = useMemo(
    () => (msg, type = "info") => setToast({ msg, type }),
    []
  );

  // ✅ Load all modules (published + drafts)
  const loadModules = useMemo(
    () => async () => {
      setLoading(true);
      try {
        const profileId = localStorage.getItem("profile_id");

        // Fetch published modules
        let modulesQuery = supabase
          .from("modules")
          .select("*")
          .order("created_at", { ascending: false });
        if (profileId) modulesQuery = modulesQuery.eq("created_by", profileId);

        const { data: publishedData, error: publishedErr } = await modulesQuery;
        if (publishedErr) throw publishedErr;

        // Fetch draft modules
        let draftsQuery = supabase
          .from("module_drafts")
          .select("*")
          .order("updated_at", { ascending: false });
        if (profileId) draftsQuery = draftsQuery.eq("user_id", profileId);

        const { data: draftData, error: draftErr } = await draftsQuery;
        if (draftErr) throw draftErr;

        // Normalize drafts
        const formattedDrafts = (draftData || []).map((d) => ({
          id: d.id,
          title: d.title || "(Untitled Draft)",
          description: d.description || "No description yet.",
          status: "draft",
          progress: d.progress_percent || 0,
          estimated_time_min: 0,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));

        // Normalize published modules
        const formattedPublished = (publishedData || []).map((m) => ({
          ...m,
          status: "published",
          progress: 100,
        }));

        // Combine all modules
        const allModules = [...formattedPublished, ...formattedDrafts];

        // Update states
        setModules(allModules);
        setDraftModules(formattedDrafts);
        setPublishedModules(formattedPublished);
      } catch (err) {
        console.error(err);
        showToast("Could not load modules.", "error");
      } finally {
        setLoading(false);
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // ✅ Unified builder handler
  const openBuilder = async (existingDraftId = null) => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      showToast("Please log in to create or edit a module.", "error");
      return;
    }

    try {
      if (existingDraftId) {
        setDraftId(existingDraftId);
        setBuilderOpen(true);
        showToast("Resuming selected draft.", "info");
      } else {
        const { data: newDraft, error: createErr } = await supabase
          .from("module_drafts")
          .insert({
            user_id: profileId,
            title: "",
            description: "",
            current_step: 0,
            progress_percent: 5,
            draft_data: { pages: [] },
            status: "draft",
          })
          .select("id")
          .single();

        if (createErr) throw createErr;

        setDraftId(newDraft.id);
        setBuilderOpen(true);
        showToast("New module draft created.", "success");
      }
    } catch (err) {
      console.error(err);
      showToast("Could not open builder.", "error");
    }
  };

  // Refresh list when builder closes
  useEffect(() => {
    if (!builderOpen) loadModules();
  }, [builderOpen, loadModules]);

  // Bulk delete selected drafts
  const bulkDeleteDrafts = async () => {
    if (selectedDrafts.length === 0) return;

    setConfirmModal({
      show: true,
      message: `Delete ${selectedDrafts.length} selected draft(s)?`,
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("module_drafts")
            .delete()
            .in("id", selectedDrafts);
          
          if (error) throw error;
          
          setSelectedDrafts([]);
          showToast(`Deleted ${selectedDrafts.length} draft(s).`, "success");
          loadModules();
        } catch (e) {
          console.error(e);
          showToast("Bulk delete failed.", "error");
        }
        setConfirmModal({ show: false, message: "", onConfirm: null });
      }
    });
  };

  // Legacy bulk delete (old code to be removed)
  const _bulkDeleteDraftsOld = async () => {
    if (selectedDrafts.length === 0) return;

    try {
      const { error } = await supabase
        .from("module_drafts")
        .delete()
        .in("id", selectedDrafts);
      
      if (error) throw error;
      
      setSelectedDrafts([]);
      showToast(`Deleted ${selectedDrafts.length} draft(s).`, "success");
      loadModules();
    } catch (e) {
      console.error(e);
      showToast("Bulk delete failed.", "error");
    }
  };

  // Duplicate module
  const duplicateModule = async (moduleId) => {
    try {
      const { data: original } = await supabase
        .from("module_drafts")
        .select("*")
        .eq("id", moduleId)
        .single();
      
      if (original) {
        await supabase.from("module_drafts").insert({
          ...original,
          id: undefined,
          title: `${original.title} (Copy)`,
          created_at: undefined,
          updated_at: undefined,
        });
        showToast("Draft duplicated.", "success");
        loadModules();
      }
    } catch (e) {
      console.error(e);
      showToast("Duplicate failed.", "error");
    }
  };

  // Filter and sort modules
  const filterAndSort = (moduleList) => {
    let filtered = moduleList;

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.title.toLowerCase().includes(query) ||
          (m.description || "").toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === "title") {
        return a.title.localeCompare(b.title);
      } else if (sortBy === "progress") {
        return (b.progress || 0) - (a.progress || 0);
      } else {
        // Default: date (most recent first)
        const dateA = new Date(a.updated_at || a.created_at || 0);
        const dateB = new Date(b.updated_at || b.created_at || 0);
        return dateB - dateA;
      }
    });

    return filtered;
  };

  const filteredDrafts = useMemo(
    () => filterAndSort(draftModules),
    [draftModules, searchQuery, sortBy]
  );

  const filteredPublished = useMemo(
    () => filterAndSort(publishedModules),
    [publishedModules, searchQuery, sortBy]
  );

  // ✅ Calculate total stats
  const totals = useMemo(() => {
    const count = modules.length;
    const minutes = modules.reduce(
      (sum, m) => sum + (m.estimated_time_min || 0),
      0
    );
    return { count, minutes };
  }, [modules]);

  // Relative time helper
  const getRelativeTime = (date) => {
    if (!date) return "N/A";
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffMinutes > 0) return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`;
    return "Just now";
  };

      {/* Edit + Delete Buttons */}
      <div className="flex gap-2 mt-auto">
        <button
          onClick={() => openBuilder(m.status === "draft" ? m.id : null)}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-DivuBlue/80 text-white text-sm font-semibold hover:bg-DivuBlue"
        >
          <Edit size={14} /> Edit / Build
        </button>

        <button
          onClick={async () => {
            try {
              if (m.status === "draft") {
                await supabase.from("module_drafts").delete().eq("id", m.id).order('order_index', { ascending: true });
                setDraftModules((p) => p.filter((x) => x.id !== m.id));
              } else {
                await supabase.from("modules").delete().eq("id", m.id).order('order_index', { ascending: true });
                setPublishedModules((p) => p.filter((x) => x.id !== m.id));
              }
              setModules((p) => p.filter((x) => x.id !== m.id));
              showToast("Module deleted.", "success");
            } catch (e) {
              console.error(e);
              showToast("Delete failed.", "error");
            }
            setModules((p) => p.filter((x) => x.id !== m.id));
            showToast("Module deleted.", "success");
          } catch (e) {
            console.error(e);
            showToast("Delete failed.", "error");
          }
          setConfirmModal({ show: false, message: "", onConfirm: null });
        }
      });
    };

    // Legacy delete (old code to be removed)
    const _handleDeleteOld = async () => {
      const confirmMsg = m.status === "draft" 
        ? `Delete draft "${m.title}"? This cannot be undone.`
        : `Delete published module "${m.title}"? This will remove it for all employees.`;

      try {
        if (m.status === "draft") {
          await supabase.from("module_drafts").delete().eq("id", m.id);
          setDraftModules((p) => p.filter((x) => x.id !== m.id));
        } else {
          await supabase.from("modules").delete().eq("id", m.id);
          setPublishedModules((p) => p.filter((x) => x.id !== m.id));
        }
        setModules((p) => p.filter((x) => x.id !== m.id));
        showToast("Module deleted.", "success");
      } catch (e) {
        console.error(e);
        showToast("Delete failed.", "error");
      }
    };

    const formatDate = (date) => {
      if (!date) return "N/A";
      return new Date(date).toLocaleDateString("en-US", { 
        month: "short", 
        day: "numeric", 
        year: "numeric" 
      });
    };

    const isSelected = selectedDrafts.includes(m.id);

    return (
      <div
        key={m.id}
        className={`bg-white rounded-lg shadow-sm border ${
          isSelected ? "border-emerald-500 ring-2 ring-emerald-100" : "border-gray-200"
        } p-5 flex flex-col hover:shadow-md transition group relative`}
      >
        {/* Selection checkbox for drafts */}
        {m.status === "draft" && (
          <div className="absolute top-3 left-3">
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleSelection(m.id)}
              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
            />
          </div>
        )}

        {/* Quick actions menu */}
        <div className="absolute top-3 right-3">
          <button
            onClick={() => setShowQuickActions(showQuickActions === m.id ? null : m.id)}
            className="p-1 rounded hover:bg-gray-100 transition"
          >
            <MoreVertical size={18} className="text-gray-500" />
          </button>
          {showQuickActions === m.id && (
            <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {m.status === "draft" && (
                <button
                  onClick={() => {
                    duplicateModule(m.id);
                    setShowQuickActions(null);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                >
                  <Copy size={16} /> Duplicate
                </button>
              )}
              <button
                onClick={() => {
                  handleDelete();
                  setShowQuickActions(null);
                }}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 rounded-b-lg"
              >
                <Trash2 size={16} /> Delete
              </button>
            </div>
          )}
        </div>

        <div className="flex items-start justify-between mb-3" style={{ marginTop: m.status === "draft" ? "1.5rem" : "0" }}>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-gray-700 transition pr-8">{m.title}</h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
              <span>📅 {formatDate(m.created_at || m.updated_at)}</span>
              {m.updated_at && (
                <>
                  <span>•</span>
                  <span className="text-gray-400">Edited {getRelativeTime(m.updated_at)}</span>
                </>
              )}
              {m.estimated_time_min > 0 && (
                <>
                  <span>•</span>
                  <span>⏱️ {m.estimated_time_min} min</span>
                </>
              )}
            </div>
          </div>
          <StatusPill status={m.status} />
        </div>
        
        <p className="text-sm text-gray-600 mb-4 line-clamp-2">{m.description || "No description provided."}</p>
        
        <div className="flex items-center gap-2 mb-4">
          <div className="flex-1 h-2.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={`h-full transition-all ${
                m.status === "published" ? "bg-emerald-600" : "bg-gray-400"
              }`}
              style={{ width: `${m.progress ?? 0}%` }}
            />
          </div>
          <span className="text-xs font-semibold text-gray-600 min-w-[45px] text-right">{m.progress ?? 0}%</span>
        </div>

        {/* Edit + Delete Buttons */}
        <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
          <button
            onClick={() => openBuilder(m.status === "draft" ? m.id : null)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 transition"
          >
            <Edit size={16} /> {m.status === "draft" ? "Continue" : "Edit"}
          </button>

          <button
            onClick={handleDelete}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 hover:border-red-300 hover:text-red-600 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <AppLayout>
      <div className="flex-1 min-h-dvh p-6 space-y-6">
        {/* Header */}
        <div
          className="
            mb-6 px-6 py-4 rounded-lg border shadow-sm
            flex items-center justify-between transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          <div>
            <h1 className="text-2xl font-bold">
              Manage Modules
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Create, edit, and publish training modules for employees
            </p>
          </div>

          <button
            onClick={() => openBuilder(null)}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-DivuDarkGreen text-white font-medium
              hover:bg-DivuBlue transition
            "
          >
            <Plus size={16} /> Create Module
          </button>
        </div>


        {/* Search, Filter, and View Controls */}
        <div className="mb-6 flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search modules by title or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
              dark:bg-transparent dark:border-gray-600 dark:text-white
              "
            />
          </div>

          <div className="flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-gray-500" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-3 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500
              dark:bg-transparent dark:border-gray-600 dark:text-white"
            >
              <option value="date" className="text-black"
              >Sort by: Recent</option>
              <option value="title"
              className="text-black">Sort by: Title</option>
              <option value="progress" className="text-black">Sort by: Progress</option>
            </select>
          </div>

          <div className="flex items-center gap-1 border border-gray-300 rounded-lg p-1">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded ${
                viewMode === "grid" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
              } transition`}
              title="Grid view"
            >
              <Grid3x3 size={18} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded ${
                viewMode === "list" ? "bg-emerald-600 text-white" : "text-gray-600 hover:bg-gray-100"
              } transition`}
              title="List view"
            >
              <List size={18} />
            </button>
          </div>
        </div>

        {/* Bulk Actions Toolbar */}
        {selectedDrafts.length > 0 && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-emerald-800">
              {selectedDrafts.length} draft{selectedDrafts.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedDrafts([])}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 transition"
              >
                Clear
              </button>
              <button
                onClick={bulkDeleteDrafts}
                className="px-4 py-1.5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition flex items-center gap-1.5"
              >
                <Trash2 size={16} /> Delete Selected
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className= "rounded-lg p-5 shadow-sm border transition bg-white border-gray-300 text-gray-900 dark:bg-black/40 dark:border-black dark:text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">📝 Draft Modules</p>
                <p className="text-3xl font-bold">{draftModules.length}</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <Edit className="text-gray-600" size={24} />
              </div>
            </div>
          </div>

          <div className= "rounded-lg p-5 shadow-sm border transition bg-white border-gray-300 text-gray-900 dark:bg-black/40 dark:border-black dark:text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">✅ Published Modules</p>
                <p className="text-3xl font-bold">{publishedModules.length}</p>
              </div>
              <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
                <span className="text-2xl text-emerald-600">✓</span>
              </div>
            </div>
          </div>

          <div className= "rounded-lg p-5 shadow-sm border transition bg-white border-gray-300 text-gray-900 dark:bg-black/40 dark:border-black dark:text-white">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium mb-1">⏱️ Total Duration</p>
                <p className="text-3xl font-bold">{totals.minutes} min</p>
              </div>
              <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                <span className="text-2xl">⏱️</span>
              </div>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="space-y-8">
            {/* Loading skeleton */}
            <div className="space-y-4">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-3 rounded-lg p-5 shadow-sm border transition bg-white border-gray-300 text-gray-900 dark:bg-black/40 dark:border-black dark:text-white">
                    <div className="h-5 bg-gray-200 rounded animate-pulse" />
                    <div className="h-4 bg-gray-100 rounded animate-pulse" />
                    <div className="h-2 bg-gray-200 rounded animate-pulse" />
                    <div className="flex gap-2">
                      <div className="flex-1 h-9 bg-gray-200 rounded animate-pulse" />
                      <div className="h-9 w-9 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Draft Modules Section */}
            <section className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">  
                  <span className="w-1 h-6 bg-gray-400 rounded"
                  ></span>
                  Draft Modules
                  <span className="text-sm font-normal text-gray-500">({filteredDrafts.length})</span>
                </h3>
                {filteredDrafts.length > 0 && (
                  <button
                    onClick={selectAllDrafts}
                    className="text-sm text-DivuBlue600 hover:text-emerald-700 font-medium"
                  >
                    {selectedDrafts.length === filteredDrafts.length ? "Deselect All" : "Select All"}
                  </button>
                )}
              </div>
              {filteredDrafts.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-4xl mb-3">📝</div>
                  <p className="text-gray-600 font-medium mb-1">
                    {searchQuery ? "No drafts match your search" : "No draft modules yet"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? "Try a different search term" : "Click \"Create New Module\" to get started"}
                  </p>
                </div>
              ) : (
                <div className={viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 rounded-lg p-5 shadow-sm border transition bg-white border-gray-300 text-gray-900 dark:bg-black/40 dark:border-black dark:text-white"
                  : "space-y-3"
                }>
                  {filteredDrafts.map(renderModuleCard)}
                </div>
              )}
            </section>

            {/* Published Modules Section */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2 dark:text-white">
                  <span className="w-1 h-6 bg-emerald-600 rounded"></span>
                  Published Modules
                  <span className="text-sm font-normal text-gray-500">({filteredPublished.length})</span>
                </h3>
              </div>
              {filteredPublished.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="text-4xl mb-3">✅</div>
                  <p className="text-gray-600 font-medium mb-1">
                    {searchQuery ? "No published modules match your search" : "No published modules yet"}
                  </p>
                  <p className="text-sm text-gray-500">
                    {searchQuery ? "Try a different search term" : "Complete and publish your drafts to see them here"}
                  </p>
                </div>
              ) : (
                <div className={viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" 
                  : "space-y-3"
                }>
                  {filteredPublished.map(renderModuleCard)}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {/* Module Builder Modal */}
      {builderOpen && draftId && (
        <ModuleBuilderModal
          draftId={draftId}
          onClose={() => {
            setBuilderOpen(false);
            setDraftId(null);
            loadModules();
          }}
          showToast={showToast}
          onModuleCreated={loadModules}
        />
      )}

      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 animate-fade-in">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Confirm Action</h3>
            <p className="text-gray-700 mb-6">{confirmModal.message}</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      {toast && (
        <Toast
          message={toast.msg}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </AppLayout>
  );
}
