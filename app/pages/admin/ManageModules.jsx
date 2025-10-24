/*Can you help me write a reusable function in 
React called addSection() that adds a new section to a module? Each section can be of type text, image, or video and should use crypto.randomUUID() for IDs. It should update state dynamically so the new section appears instantly on the UI. Please include example code and state structure.import { useEffect, useState, useMemo } from "react";*/

/*Can you help me link a checklist template to a user by their ID? Just the Supabase insert logic.*/

/*Quick one — how do I move a section up or down in an array in React without breaking order?*/
/*What’s the cleanest way to save all my module data at once — template + items + content — to Supabase?*/
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { useEffect, useState, useMemo } from "react";
import { Plus, Edit, Trash2 } from "lucide-react";
import Toast from "../../components/Toast.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";

import StatusPill from "../../components/modules/StatusPill.jsx";
import ModuleBuilderModal from "../../components/modules/ModuleBuilderModal.jsx";

/* id helper */
const uid = () => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export default function ManageModules() {
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });
  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [modules, setModules] = useState([]);
  const [toast, setToast] = useState(null);

  // builder modal
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftId, setDraftId] = useState(null);

  const showToast = (msg, type = "info") => setToast({ msg, type });

  const loadModules = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      let query = supabase.from("modules").select("*").order("created_at", { ascending: false });
      if (profileId) query = query.eq("created_by", profileId);
      const { data, error } = await query;
      if (error) throw error;
      setModules(data || []);
    } catch (err) {
      console.error(err);
      showToast("Could not load modules.", "error");
    }
  };

  useEffect(() => {
    loadModules();
  }, []);

  const openBuilder = async () => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      showToast("Please log in to create a module.", "error");
      return;
    }

    // resume latest draft for this user if exists
    const { data: existing, error } = await supabase
      .from("module_drafts")
      .select("*")
      .eq("user_id", profileId)
      .order("updated_at", { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      showToast("Could not load draft.", "error");
      return;
    }

    if (existing && existing.length) {
      setDraftId(existing[0].id);
      setBuilderOpen(true);
      showToast("Resuming previous draft.", "info");
      return;
    }

    // create a new draft
    const { data: newDraft, error: createErr } = await supabase
      .from("module_drafts")
      .insert({
        user_id: profileId,
        title: "",
        description: "",
        current_step: 0,
        progress_percent: 5,
        draft_data: { pages: [] },
      })
      .select("id")
      .single();

    if (createErr) {
      console.error(createErr);
      showToast("Failed to start a new draft.", "error");
      return;
    }

    setDraftId(newDraft.id);
    setBuilderOpen(true);
    showToast("New module draft created.", "success");
  };

  // refresh list when builder closes
  useEffect(() => {
    if (!builderOpen) loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderOpen]);

  const totals = useMemo(() => {
    const count = modules.length;
    const minutes = modules.reduce((sum, m) => sum + (m.estimated_time_min || 0), 0);
    return { count, minutes };
  }, [modules]);

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-modules" role={role} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow mb-4">
          <span className="text-emerald-950 font-semibold">Admin Panel – Manage Modules</span>
          <button
            onClick={openBuilder}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
          >
            <Plus size={16} /> Create New Module
          </button>
        </div>

        {/* title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE MODULES
        </div>

        {/* stat line */}
        <p className="text-sm text-emerald-700 mb-3">
          {`${totals.count} modules • ${totals.minutes} min total`}
        </p>

        {/* grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.length === 0 ? (
            <div className="col-span-2 text-center text-emerald-700 font-medium">
              No modules yet. Click “Create New Module” to begin.
            </div>
          ) : (
            modules.map((m) => (
              <div key={m.id} className="bg-white/95 rounded-lg shadow border border-gray-200 p-5 flex flex-col">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-lg font-bold text-emerald-950">{m.title}</h2>
                  <StatusPill status={m.status} />
                </div>
                <p className="text-sm text-emerald-950/80 mb-3">{m.description}</p>
                <div className="flex gap-6 text-xs text-emerald-700 mb-4">
                  <span><span className="font-semibold">Progress:</span> {m.progress ?? 0}%</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div
                      className={`h-full ${m.status === "completed" ? "bg-emerald-500" : "bg-emerald-700"}`}
                      style={{ width: `${m.progress ?? 0}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button
                    onClick={openBuilder}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
                  >
                    <Edit size={14} /> Edit / Build
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        await supabase.from("modules").delete().eq("id", m.id);
                        setModules((p) => p.filter((x) => x.id !== m.id));
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
            ))
          )}
        </div>
      </div>

      {builderOpen && draftId && (
        <ModuleBuilderModal
          draftId={draftId}
          onClose={() => {
            setBuilderOpen(false);
            setDraftId(null);
          }}
          showToast={showToast}
        />
      )}

      {toast && <Toast message={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}