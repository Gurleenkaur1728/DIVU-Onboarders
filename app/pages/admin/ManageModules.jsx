import AppLayout from "../../../src/AppLayout.jsx";
import { useEffect, useState, useMemo } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
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
        }));

        // Normalize published modules (modules table records are considered published)
        const formattedPublished = (publishedData || []).map((m) => ({
          ...m,
          status: "published", // Set status explicitly since DB might not have this field
          progress: 100, // Published modules are considered complete
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
      }
    },
    [showToast]
  );

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  // ✅ Unified builder handler — handles both new and existing drafts
  const openBuilder = async (existingDraftId = null) => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      showToast("Please log in to create or edit a module.", "error");
      return;
    }

    try {
      if (existingDraftId) {
        // 🟢 Resume existing draft
        setDraftId(existingDraftId);
        setBuilderOpen(true);
        showToast("Resuming selected draft.", "info");
      } else {
        // 🆕 Create new empty draft
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

  // ✅ Calculate total stats
  const totals = useMemo(() => {
    const count = modules.length;
    const minutes = modules.reduce(
      (sum, m) => sum + (m.estimated_time_min || 0),
      0
    );
    return { count, minutes };
  }, [modules]);

  // ✅ Render each module card (for drafts or published)
  const renderModuleCard = (m) => (
    <div
      key={m.id}
      className="bg-white/95 rounded-lg shadow border border-gray-200 p-5 flex flex-col"
    >
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-bold text-emerald-950">{m.title}</h2>
        <StatusPill status={m.status} />
      </div>
      <p className="text-sm text-emerald-950/80 mb-3">{m.description}</p>
      <div className="flex gap-6 text-xs text-emerald-700 mb-4">
        <span>
          <span className="font-semibold">Progress:</span> {m.progress ?? 0}%
        </span>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
          <div
            className={`h-full ${
              m.status === "published" ? "bg-emerald-500" : "bg-emerald-700"
            }`}
            style={{ width: `${m.progress ?? 0}%` }}
          />
        </div>
      </div>

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
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
    </div>
  );

  return (
    <AppLayout>
    {/* // <div
    //   className="flex min-h-dvh bg-cover bg-center relative"
    //   style={{ backgroundImage: "url('/bg.png')" }}
    // > */}
      {/* <Sidebar active="manage-modules" role={roleId} /> */}

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon Header */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow mb-4">
          <span className="text-emerald-950 font-semibold">
            Admin Panel – Manage Modules
          </span>
          <button
            onClick={() => openBuilder(null)} // always create new draft
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-DivuLightGreen text-black text-sm font-semibold hover:bg-DivuBlue"
          >
            <Plus size={16} /> Create New Module
          </button>
        </div>

        {/* Title */}
        <div className="bg-DivuDarkGreen px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE MODULES
        </div>

        {/* Stats */}
        <p className="text-sm text-emerald-700 mb-3">
          {`${totals.count} modules • ${totals.minutes} min total`}
        </p>

        {/* Draft Modules Section */}
        <section className="mb-8">
          <h3 className="text-xl font-bold text-yellow-700 mb-3">
            📝 Draft Modules
          </h3>
          {draftModules.length === 0 ? (
            <p className="text-gray-500 italic">
              No draft modules. Start creating one!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {draftModules.map(renderModuleCard)}
            </div>
          )}
        </section>

        {/* Published Modules Section */}
        <section>
          <h3 className="text-xl font-bold text-green-700 mb-3">
            ✅ Published Modules
          </h3>
          {publishedModules.length === 0 ? (
            <p className="text-gray-500 italic">No published modules yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {publishedModules.map(renderModuleCard)}
            </div>
          )}
        </section>
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
