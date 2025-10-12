import { useEffect, useMemo, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import {
  Edit,
  Trash2,
  Plus,
  CheckCircle,
  Lock,
  PlayCircle,
  Timer,
  X,
  Film,
  Image as ImageIcon,
  FileText,
  BookOpen,
  ListChecks,
  List,
  Layers,
  Link2,
  MoveUp,
  MoveDown,
  Copy,
} from "lucide-react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Toast from "../../components/Toast.jsx";

/* ---------------- Utilities ---------------- */
const uid = () => crypto.randomUUID();
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const words = (t = "") => t.trim().split(/\s+/).filter(Boolean).length;

const SECTION_TYPES = [
  { key: "text", label: "Text", icon: FileText },
  { key: "photo", label: "Photo", icon: ImageIcon },
  { key: "video", label: "Video", icon: Film },
  { key: "flashcards", label: "Flashcards", icon: BookOpen },
  { key: "dropdowns", label: "Dropdowns", icon: List },
  { key: "questionnaire", label: "Questionnaire", icon: Layers },
  { key: "checklist", label: "Checklist", icon: ListChecks },
  { key: "embed", label: "Embed (URL)", icon: Link2 },
];

const defaultSection = (type) => {
  switch (type) {
    case "text":
      return { id: uid(), type, title: "", body: "" };
    case "photo":
      return { id: uid(), type, media_path: "", caption: "" };
    case "video":
      return { id: uid(), type, media_path: "", transcript: "" };
    case "flashcards":
      return { id: uid(), type, cards: [{ id: uid(), title: "", info: "" }] };
    case "dropdowns":
      return { id: uid(), type, items: [{ id: uid(), header: "", info: "" }] };
    case "questionnaire":
      return {
        id: uid(),
        type,
        questions: [{ id: uid(), q: "", kind: "mcq", options: ["", ""], correctIndex: 0 }],
      };
    case "checklist":
      return { id: uid(), type, items: [{ id: uid(), text: "", required: true }] };
    case "embed":
      return { id: uid(), type, url: "", note: "" };
    default:
      return { id: uid(), type: "text", title: "", body: "" };
  }
};

/* ---------------- Main Page ---------------- */
export default function ManageModules() {
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });

  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [modules, setModules] = useState([]); // optional: list modules
  const [builderOpen, setBuilderOpen] = useState(false);
  const [draftId, setDraftId] = useState(null);

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = (msg, type = "info") => setToast({ msg, type });

  const handleOpenBuilder = async () => {
    const profileId = localStorage.getItem("profile_id");
    if (!profileId) {
      showToast("Please log in to create a module.", "error");
      return;
    }

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
      showToast("Resuming your previous draft.", "info");
      return;
    }

    const { data: newDraft, error: createErr } = await supabase
      .from("module_drafts")
      .insert({
        user_id: profileId,
        title: "",
        description: "",
        current_step: 0, // 0 Info, 1 Pages, 2 Review
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

  // Load modules for this user (also refresh after builder modal closes)
  const loadModules = async () => {
    try {
      const profileId = localStorage.getItem("profile_id");
      let query = supabase.from("modules").select("*");
      if (profileId) query = query.eq("created_by", profileId);
      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) {
        console.error(error);
        showToast("Could not load modules.", "error");
        return;
      }
      setModules(data || []);
    } catch (err) {
      console.error(err);
      showToast("Failed to load modules.", "error");
    }
  };

  useEffect(() => {
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refresh list when the builder modal closes (so completed modules appear)
  useEffect(() => {
    if (!builderOpen) loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [builderOpen]);

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-modules" role={role} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow mb-4">
          <span className="text-emerald-950 font-semibold">Admin Panel – Manage Modules</span>
          <button
            onClick={handleOpenBuilder}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
          >
            <Plus size={16} /> Create New Module
          </button>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE MODULES
        </div>

        {/* Optional grid of existing modules */}
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
                  <span><span className="font-semibold">Progress:</span> {m.progress}%</span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                    <div className={`h-full ${m.status === "completed" ? "bg-emerald-500" : "bg-emerald-700"}`} style={{ width: `${m.progress}%` }} />
                  </div>
                </div>
                <div className="flex gap-2 mt-auto">
                  <button onClick={handleOpenBuilder} className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600">
                    <Edit size={14} /> Edit / Build
                  </button>
                  <button onClick={() => setModules((p) => p.filter((x) => x.id !== m.id))} className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
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

/* ----------------- Builder Modal ----------------- */
function ModuleBuilderModal({ draftId, onClose, showToast }) {
  // Steps: 0 Info → 1 Pages → 2 Review
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [abandonConfirmOpen, setAbandonConfirmOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // pages: [{id, name?, sections:[section]}]
  const [pages, setPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(-1);

  const titleWordLimit = 100;
  const descWordLimit = 250;

  // Add Page – type chooser
  const [selectTypeOpen, setSelectTypeOpen] = useState(false);
  const openTypeChooser = () => {
    setSelectTypeOpen(true);
    if (step === 0) setStep(1);
  };

  // Load draft
  useEffect(() => {
    const loadDraft = async () => {
      const { data, error } = await supabase.from("module_drafts").select("*").eq("id", draftId).single();
      if (error) {
        console.error(error);
        showToast("Failed to load draft.", "error");
        onClose();
        return;
      }
      setTitle(data.title || "");
      setDescription(data.description || "");
      const dd = data.draft_data || {};
      const draftPages = Array.isArray(dd.pages) ? dd.pages : [];
      setPages(draftPages);
      setStep(Number(data.current_step ?? 0));
      if (draftPages.length) setActivePageIndex(0);
      setLoading(false);
    };
    loadDraft();
  }, [draftId, onClose, showToast]);

  const progress = useMemo(() => {
    // Combine step and presence of pages/fields
    let base = 0;
    // weighted by completion
    if (title.trim()) base += 20;
    if (description.trim()) base += 20;
    if (pages.length > 0) base += 40;
    // final step gives the last 20
    if (step === 2) base += 20;
    return clamp(base, 5, 100);
  }, [step, title, description, pages.length]);

  const persistDraft = async (patch = {}) => {
    await supabase
      .from("module_drafts")
      .update({
        title,
        description,
        current_step: step,
        progress_percent: progress,
        draft_data: { pages },
        updated_at: new Date().toISOString(),
        ...patch,
      })
      .eq("id", draftId);
  };

  // word limits
  const onChangeTitle = (val) => {
    const arr = val.trim().split(/\s+/);
    if (arr.filter(Boolean).length <= titleWordLimit) setTitle(val);
  };
  const onChangeDescription = (val) => {
    const arr = val.trim().split(/\s+/);
    if (arr.filter(Boolean).length <= descWordLimit) setDescription(val);
  };

  // Page helpers
  const addPageWithSectionType = async (type) => {
    const newPage = {
      id: uid(),
      name: `Page ${pages.length + 1}`,
      sections: [defaultSection(type)],
    };
    const updated = [...pages, newPage];
    setPages(updated);
    setActivePageIndex(updated.length - 1);
    setSelectTypeOpen(false);
    await persistDraft({ draft_data: { pages: updated }, current_step: 1 });
    setStep(1);
    showToast(`${type} section added to new page.`, "success");
  };

  const removePage = async (pageIndex) => {
    const updated = pages.filter((_, i) => i !== pageIndex);
    setPages(updated);
    const newActive = updated.length ? clamp(activePageIndex - (pageIndex <= activePageIndex ? 1 : 0), 0, updated.length - 1) : -1;
    setActivePageIndex(newActive);
    await persistDraft({ draft_data: { pages: updated } });
    showToast("Page deleted.", "info");
  };

  const duplicatePage = async (pageIndex) => {
    const page = pages[pageIndex];
    const clone = {
      ...page,
      id: uid(),
      name: `${page.name || `Page ${pageIndex + 1}`} (copy)`,
      sections: page.sections?.map((s) => ({ ...structuredClone(s), id: uid() })) || [],
    };
    const updated = [...pages.slice(0, pageIndex + 1), clone, ...pages.slice(pageIndex + 1)];
    setPages(updated);
    setActivePageIndex(pageIndex + 1);
    await persistDraft({ draft_data: { pages: updated } });
    showToast("Page duplicated.", "success");
  };

  const updateActivePage = async (patch) => {
    if (activePageIndex < 0 || !pages[activePageIndex]) return;
    const updated = [...pages];
    updated[activePageIndex] = { ...updated[activePageIndex], ...patch };
    setPages(updated);
    await persistDraft({ draft_data: { pages: updated } });
  };

  const moveSection = async (sectionIndex, dir) => {
    if (activePageIndex < 0) return;
    const p = pages[activePageIndex] || { sections: [] };
    const next = Array.isArray(p.sections) ? [...p.sections] : [];
    const to = sectionIndex + (dir === "up" ? -1 : 1);
    if (to < 0 || to >= next.length) return;
    const [spliced] = next.splice(sectionIndex, 1);
    next.splice(to, 0, spliced);
    await updateActivePage({ sections: next });
  };

  const removeSection = async (sectionId) => {
    if (activePageIndex < 0) return;
    const p = pages[activePageIndex] || { sections: [] };
    const next = (p.sections || []).filter((s) => s.id !== sectionId);
    await updateActivePage({ sections: next });
    showToast("Section removed.", "info");
  };

  const addSectionToActivePage = async (type) => {
    if (activePageIndex < 0) return;
    const p = pages[activePageIndex] || { sections: [] };
    const next = [...(p.sections || []), defaultSection(type)];
    await updateActivePage({ sections: next });
    showToast(`${type} section added to page.`, "success");
  };

  // Complete & Abandon
  const completeModule = async () => {
    if (!title.trim() || !description.trim() || pages.length === 0) {
      showToast("Please complete Title, Description and at least one Page.", "warning");
      return;
    }
    // validate all pages and sections
    if (!validatePagesSections()) return;
    setSaving(true);
    const profileId = localStorage.getItem("profile_id");

    // Create module row
    const { data: module, error: modErr } = await supabase
      .from("modules")
      .insert({
        title: title.trim(),
        description: description.trim(),
        created_by: profileId,
        estimated_time_min: 10,
      })
      .select("*")
      .single();

    if (modErr) {
      console.error(modErr);
      showToast("Error creating module.", "error");
      setSaving(false);
      return;
    }

    // Flatten pages/sections into module_sections
    const sectionsPayload = [];
    pages.forEach((page, pIndex) => {
      const pName = page.name || `Page ${pIndex + 1}`;
      const secArr = Array.isArray(page.sections) ? page.sections : [];
      secArr.forEach((section, sIndex) => {
        sectionsPayload.push({
          module_id: module.id,
          title: pName,
          content_type: section.type,
          content_text: section.body || section.caption || "",
          media_path: section.media_path || null,
          quiz_data: section.questions || section.cards || section.items || null,
          order_index: pIndex * 100 + sIndex,
          is_mandatory: true,
        });
      });
    });

    const { error: secErr } = await supabase.from("module_sections").insert(sectionsPayload);
    if (secErr) {
      console.error(secErr);
      showToast("Failed to save module sections.", "error");
      setSaving(false);
      return;
    }

    await supabase.from("module_drafts").delete().eq("id", draftId);
    setSaving(false);
    showToast("Module created successfully!", "success");
    onClose();
  };

  // Show inline confirmation instead of browser confirm()
  const abandonModule = async () => {
    // perform delete
    try {
      await supabase.from("module_drafts").delete().eq("id", draftId);
      showToast("Draft abandoned and deleted.", "info");
    } catch (err) {
      console.error(err);
      showToast("Failed to abandon draft.", "error");
      return;
    } finally {
      setAbandonConfirmOpen(false);
    }
    onClose();
  };

  // Upload helper
  const uploadToBucket = async (file) => {
    if (!file) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `uploads/${Date.now()}-${uid()}.${ext}`;
    const { error } = await supabase.storage.from("modules_assets").upload(path, file);
    if (error) {
      console.error(error);
      showToast("Upload failed.", "error");
      return null;
    }
    showToast("File uploaded successfully.", "success");
    return path;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
        <div className="bg-emerald-950 text-white rounded-xl p-6">Loading draft…</div>
      </div>
    );
  }

  /* --------- Unified Progress Bar (Info ● Page N ● Review) --------- */
  const ProgressDot = ({ label, active, done, onClick, index }) => (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 group focus:outline-none`} 
      title={label}
      aria-label={`${label} ${done ? 'completed' : active ? 'current step' : 'not completed'}`}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold border shadow-sm transform transition-all duration-200
        ${active ? "bg-emerald-600 text-white border-emerald-700 scale-105 ring-2 ring-emerald-400/30"
                 : done ? "bg-white text-emerald-700 border-emerald-300"
                 : "bg-white text-emerald-800 border-emerald-300 group-hover:bg-emerald-50"}`}
      >
        {/* Show check icon when done, otherwise show number or shorthand for Info/Review */}
        {done ? (
          <CheckCircle size={14} className="text-emerald-600" />
        ) : (
          <span className={`text-xs font-semibold ${active ? "text-white" : "text-emerald-800"}`}>
            {typeof index === 'number' ? index + 1 : (label === 'Info' ? 'I' : 'R')}
          </span>
        )}
      </div>
  <span className={`text-[11px] font-semibold ${active ? "text-white" : done ? "text-emerald-100" : "text-emerald-200"} drop-shadow-sm`}>{label}</span>
    </button>
  );

  // Circle-only variant for top row (no label) so connectors align to the circle center
  const ProgressCircle = ({ active, done, onClick, index, title }) => (
    <button
      onClick={onClick}
      className={`flex items-center justify-center w-8 h-8 rounded-full font-bold border shadow-sm transform transition-all duration-200
      ${active ? "bg-emerald-600 text-white border-emerald-700 scale-105 ring-2 ring-emerald-400/30"
               : done ? "bg-white text-emerald-700 border-emerald-300"
               : "bg-white text-emerald-800 border-emerald-300 group-hover:bg-emerald-50"}`}
      title={title}
      aria-label={`${title} ${done ? 'completed' : active ? 'current step' : 'not completed'}`}
    >
      {done ? (
        <CheckCircle size={14} className="text-emerald-600" />
      ) : (
        <span className={`text-xs font-semibold ${active ? "text-white" : "text-emerald-800"}`}>
          {typeof index === 'number' ? index + 1 : (title === 'Info' ? 'I' : 'R')}
        </span>
      )}
    </button>
  );

  const goInfo = () => { setStep(0); persistDraft({ current_step: 0 }); };
  const goReview = () => { setStep(2); persistDraft({ current_step: 2 }); };
  const goPage = (i) => {
    setStep(1);
    setActivePageIndex(i);
    persistDraft({ current_step: 1 });
  };

  // Move to next step with validation
  const handleNext = () => {
    // From Pages -> Review: require at least one page and each page must have >=1 section and non-empty important fields
    if (step === 1) {
      const ok = validatePagesSections();
      if (!ok) return;
    }
    const ns = clamp(step + 1, 0, 2);
    setStep(ns);
    persistDraft({ current_step: ns });
  };

  // Validate pages and their sections for required fields depending on section type
  const validatePagesSections = () => {
    if (!Array.isArray(pages) || pages.length === 0) {
      showToast("Add at least one page before proceeding.", "error");
      return false;
    }
    for (let pIndex = 0; pIndex < pages.length; pIndex++) {
      const p = pages[pIndex] || { sections: [] };
      if (!Array.isArray(p.sections) || p.sections.length === 0) {
        showToast(`Page ${pIndex + 1} must have at least one section.`, "error");
        return false;
      }
      for (let sIndex = 0; sIndex < p.sections.length; sIndex++) {
        const s = p.sections[sIndex] || {};
        switch (s.type) {
          case "text":
            if (!s.body || !s.body.trim()) { showToast(`Page ${pIndex + 1} — text section ${sIndex + 1} cannot be empty.`, "error"); return false; }
            break;
          case "photo":
          case "video":
            if (!s.media_path || !s.media_path.trim()) { showToast(`Page ${pIndex + 1} — ${s.type} section ${sIndex + 1} must have an uploaded media.`, "error"); return false; }
            break;
          case "flashcards":
            if (!Array.isArray(s.cards) || s.cards.length === 0) { showToast(`Page ${pIndex + 1} — flashcards must contain at least one card.`, "error"); return false; }
            break;
          case "dropdowns":
            if (!Array.isArray(s.items) || s.items.length === 0) { showToast(`Page ${pIndex + 1} — dropdown must contain at least one item.`, "error"); return false; }
            break;
          case "questionnaire":
            if (!Array.isArray(s.questions) || s.questions.length === 0) { showToast(`Page ${pIndex + 1} — questionnaire must contain at least one question.`, "error"); return false; }
            break;
          case "checklist":
            if (!Array.isArray(s.items) || s.items.length === 0) { showToast(`Page ${pIndex + 1} — checklist must contain at least one item.`, "error"); return false; }
            break;
          case "embed":
            if (!s.url || !s.url.trim()) { showToast(`Page ${pIndex + 1} — embed section ${sIndex + 1} must have a URL.`, "error"); return false; }
            break;
          default:
            break;
        }
      }
    }
    return true;
  };

  // Add page from Info step — ensure title & description are provided first
  const handleAddPage = () => {
    if (!title || !title.trim()) {
      showToast("Please add a module title before adding pages.", "error");
      return;
    }
    if (!description || !description.trim()) {
      showToast("Please add a module description before adding pages.", "error");
      return;
    }
    openTypeChooser();
  };

  /* --------- Layout --------- */
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
      {/* Fixed-size modal: consistent max width and height; content scrolls inside */}
      <div className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-xl overflow-visible flex flex-col">
  {/* Header (sticky) */}
  <div className="flex items-center justify-between bg-emerald-900 text-white rounded-t-2xl p-4">
          {/* Unified progress with pages */}
          <div className="flex items-center gap-3 flex-nowrap overflow-x-auto">
            <ProgressDot label="Info" active={step === 0} done={step > 0} onClick={goInfo} index={null} />
            <div className="h-[2px] w-6 bg-emerald-300 rounded self-center" />
            {pages.map((p, i) => (
                <div key={p.id} className="flex items-center gap-3">
                <ProgressDot
                  label={`Page ${i + 1}`}
                  active={step === 1 && activePageIndex === i}
                  done={step === 2 || (step === 1 && activePageIndex > i)}
                    onClick={() => goPage(i)}
                    index={i}
                />
                {i < pages.length - 1 && <div className="h-[2px] w-6 bg-emerald-300 rounded self-center" />}
              </div>
            ))}
            {pages.length > 0 && <div className="h-[2px] w-6 bg-emerald-300 rounded self-center" />}
            <ProgressDot label="Review" active={step === 2} done={false} onClick={goReview} index={null} />
          </div>

          <div className="flex gap-2 items-center">
            <button onClick={() => setAbandonConfirmOpen(true)} className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-sm font-semibold">
              Abandon
            </button>
            <button onClick={onClose} className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold">
              Close
            </button>
          </div>

          {/* Abandon confirmation modal overlay */}
          {abandonConfirmOpen && (
            <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
              <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 mx-4">
                <div className="flex items-start gap-3">
                  <div className="text-red-600 mt-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M5.63 19h12.74A2 2 0 0020.34 17L17.2 7.5A2 2 0 0015.36 6H8.64a2 2 0 00-1.84 1.5L3.66 17a2 2 0 001.97 2z" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <div className="text-lg font-semibold text-emerald-900 mb-1">Abandon draft?</div>
                    <div className="text-sm text-emerald-700 mb-4">This will permanently delete your draft and all progress. This action cannot be undone.</div>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setAbandonConfirmOpen(false)} className="px-3 py-1.5 rounded bg-gray-200 text-sm text-emerald-900 hover:bg-gray-300">Cancel</button>
                      <button onClick={abandonModule} className="px-3 py-1.5 rounded bg-red-600 text-white">Yes, abandon</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Progress bar (improved styling + accessibility) with percentage to the right */}
        <div className="px-6 py-3 flex items-center gap-4">
          <div
            role="progressbar"
            aria-label="Module build progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progress}
            className="relative flex-1 h-3 rounded-full bg-emerald-100/70 shadow-inner overflow-hidden"
          >
            <div
              className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500 ease-out bg-gradient-to-r from-emerald-600 to-emerald-400 shadow"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="w-12 text-right">
            <span className="text-sm font-semibold text-emerald-900">{progress}%</span>
          </div>
        </div>

  {/* Scrollable Content Area */}
  <div className="px-6 pb-4 flex-1 overflow-auto">
          {/* Step 0: Info */}
          {step === 0 && (
            <div className="grid grid-cols-1 gap-6">
              <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                <div className="mb-3">
                  <div className="font-semibold text-emerald-900 mb-2">Module Title</div>
                  <input
                    value={title}
                    onChange={(e) => onChangeTitle(e.target.value)}
                    onBlur={() => persistDraft()}
                    placeholder="Module Title (max 100 words)"
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm mb-2"
                  />
                  <div className="text-xs text-emerald-700">{words(title)}/100 words</div>
                </div>

                <div>
                  <div className="font-semibold text-emerald-900 mb-2">Module Description</div>
                  <textarea
                    value={description}
                    onChange={(e) => onChangeDescription(e.target.value)}
                    onBlur={() => persistDraft()}
                    placeholder="Module Description (max 250 words)"
                    className="w-full border border-emerald-300 rounded-lg px-3 py-2 text-sm h-28 resize-none"
                  />
                  <div className="text-xs text-emerald-700">{words(description)}/250 words</div>
                </div>

                {/* Type chooser anchored in Info (still available) */}
                {selectTypeOpen && (
                  <div className="mt-4 p-4 border rounded-xl border-emerald-300 bg-white">
                    <div className="font-semibold text-emerald-900 mb-2">Choose Content Type for New Page</div>
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                      {SECTION_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.key}
                            onClick={() => addPageWithSectionType(t.key)}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-900"
                          >
                            <Icon size={18} />
                            <span className="text-xs">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-right mt-3">
                      <button
                        onClick={() => setSelectTypeOpen(false)}
                        className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 1: Pages */}
          {step === 1 && (
            <div className="grid grid-cols-12 gap-6">
              {/* Left: pages list + add page */}
              <div className="col-span-12 lg:col-span-4 space-y-4">
                <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-emerald-900">Pages</div>
                    <button
                      onClick={openTypeChooser}
                      className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                    >
                      <Plus size={14} className="inline mr-1" />
                      Add Page
                    </button>
                  </div>

                  <div className="mt-3 space-y-2">
                    {pages.length === 0 ? (
                      <div className="text-sm text-emerald-700">No pages yet. Click “Add Page”.</div>
                    ) : (
                      pages.map((p, i) => (
                        <div
                          key={p.id}
                          className={`flex items-center justify-between border rounded-lg px-3 py-2 ${i === activePageIndex ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-white"}`}
                        >
                          <button
                            className="text-left text-sm text-emerald-800 font-medium truncate"
                            onClick={() => setActivePageIndex(i)}
                            title="Open page"
                          >
                            {p.name || `Page ${i + 1}`}
                          </button>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => duplicatePage(i)}
                              className="p-1.5 rounded bg-blue-600 text-white hover:bg-blue-500"
                              title="Duplicate page"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              onClick={() => removePage(i)}
                              className="p-1.5 rounded bg-red-600 text-white hover:bg-red-500"
                              title="Delete page"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Content type selector (shown when Add Page clicked) */}
                {selectTypeOpen && (
                  <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                    <div className="font-semibold text-emerald-900 mb-2">Choose Content Type for New Page</div>
                    <div className="grid grid-cols-3 gap-2">
                      {SECTION_TYPES.map((t) => {
                        const Icon = t.icon;
                        return (
                          <button
                            key={t.key}
                            onClick={() => addPageWithSectionType(t.key)}
                            className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-900"
                          >
                            <Icon size={18} />
                            <span className="text-xs">{t.label}</span>
                          </button>
                        );
                      })}
                    </div>
                    <div className="text-right mt-3">
                      <button
                        onClick={() => setSelectTypeOpen(false)}
                        className="px-3 py-1.5 rounded bg-gray-200 text-gray-800 text-sm hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Right: page editor */}
              <div className="col-span-12 lg:col-span-8">
                {activePageIndex === -1 || !pages[activePageIndex] ? (
                  <div className="text-gray-400 text-center p-10">Select or create a page to edit.</div>
                ) : (
                  <PageEditor
                    page={pages[activePageIndex]}
                    onRename={async (name) => updateActivePage({ name })}
                    onAddSection={addSectionToActivePage}
                    onRemoveSection={removeSection}
                    onMoveSection={moveSection}
                    onUpdateSection={async (sectionIndex, sectionPatch) => {
                      const page = pages[activePageIndex] || { sections: [] };
                      const next = Array.isArray(page.sections) ? [...page.sections] : [];
                      next[sectionIndex] = { ...next[sectionIndex], ...sectionPatch };
                      await updateActivePage({ sections: next });
                    }}
                    uploadToBucket={uploadToBucket}
                  />
                )}
              </div>
            </div>
          )}

          {/* Step 2: Review */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                <div className="font-semibold text-emerald-900 mb-2">Review Summary</div>
                <div className="text-sm text-emerald-900">
                  <div><span className="font-semibold">Title:</span> {title || <i>(empty)</i>}</div>
                  <div className="mt-1"><span className="font-semibold">Description:</span> {description || <i>(empty)</i>}</div>
                  <div className="mt-3 font-semibold">Pages:</div>
                  {pages.length === 0 ? (
                    <div className="text-emerald-700">No pages added.</div>
                  ) : (
                    <ul className="list-disc pl-6">
                      {pages.map((p, i) => (
                        <li key={p.id} className="mb-1">
                          <span className="font-medium">{p.name || `Page ${i + 1}`}</span> — {(p.sections || []).length} section(s)
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer (sticky) */}
        <div className="flex items-center justify-between border-t border-gray-200 p-4">
          <div className="text-xs text-emerald-800">Draft is autosaved</div>

          {step < 2 ? (
            step === 0 ? (
              <button
                onClick={handleAddPage}
                className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500"
              >
                Add Page
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500"
              >
                Complete & Review
              </button>
            )
          ) : (
            <button
              onClick={completeModule}
              disabled={saving}
              className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-500 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Complete Module"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page Editor (multiple sections) ---------------- */
function PageEditor({
  page,
  onRename,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onUpdateSection,
  uploadToBucket,
}) {
  if (!page) return <div className="text-gray-400">Invalid page.</div>;
  if (!Array.isArray(page.sections)) page.sections = [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <input
          value={page.name || ""}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Page name (optional)"
          className="flex-1 border rounded px-3 py-2"
        />
      </div>

      {/* Add more content to this page */}
      <div className="p-3 border rounded-lg border-emerald-200 bg-emerald-50">
        <div className="text-sm font-semibold text-emerald-900 mb-2">Add content to this page:</div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {SECTION_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.key}
                onClick={() => onAddSection(t.key)}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-white text-emerald-900"
              >
                <Icon size={18} />
                <span className="text-xs">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sections list */}
      {(!page.sections || page.sections.length === 0) ? (
        <div className="text-gray-500">No content sections on this page yet.</div>
      ) : (
        <div className="space-y-4">
          {page.sections.map((section, idx) => (
            <div key={section.id} className="border rounded-xl p-3 bg-white shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-emerald-900 text-sm capitalize">{section.type} section</div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onMoveSection(idx, "up")}
                    className="p-1.5 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                    title="Move up"
                  >
                    <MoveUp size={16} />
                  </button>
                  <button
                    onClick={() => onMoveSection(idx, "down")}
                    className="p-1.5 rounded bg-gray-200 text-gray-800 hover:bg-gray-300"
                    title="Move down"
                  >
                    <MoveDown size={16} />
                  </button>
                  <button
                    onClick={() => onRemoveSection(section.id)}
                    className="p-1.5 rounded bg-red-600 text-white hover:bg-red-500"
                    title="Remove section"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <SectionEditor
                section={section}
                onChange={(patch) => onUpdateSection(idx, patch)}
                uploadToBucket={uploadToBucket}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------- Section Editor ---------------- */
function SectionEditor({ section, onChange, uploadToBucket }) {
  if (!section) return null;

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadToBucket(file);
    if (path) onChange({ media_path: path });
  };

  switch (section.type) {
    case "text":
      return (
        <div className="space-y-2">
          <input
            value={section.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Text block title"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={section.body}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Text block content"
            className="w-full border rounded px-3 py-2 h-32"
          />
        </div>
      );

    case "photo":
      return (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={handleUpload} />
          {section.media_path && (
            <img
              src={supabase.storage.from("modules_assets").getPublicUrl(section.media_path).data.publicUrl}
              className="rounded shadow max-h-64"
            />
          )}
          <input
            value={section.caption}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Caption"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      );

    case "video":
      return (
        <div className="space-y-2">
          <input type="file" accept="video/*" onChange={handleUpload} />
          {section.media_path && (
            <video
              controls
              src={supabase.storage.from("modules_assets").getPublicUrl(section.media_path).data.publicUrl}
              className="rounded shadow max-h-64"
            />
          )}
          <textarea
            value={section.transcript}
            onChange={(e) => onChange({ transcript: e.target.value })}
            placeholder="Transcript / Notes"
            className="w-full border rounded px-3 py-2 h-24"
          />
        </div>
      );

    case "flashcards":
      return (
        <div className="space-y-2">
          {(section.cards || []).map((c, i) => (
            <div key={c.id} className="border rounded p-2 space-y-1">
              <input
                value={c.title}
                onChange={(e) => {
                  const cards = [...(section.cards || [])];
                  cards[i] = { ...cards[i], title: e.target.value };
                  onChange({ cards });
                }}
                placeholder="Card Title"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                value={c.info}
                onChange={(e) => {
                  const cards = [...(section.cards || [])];
                  cards[i] = { ...cards[i], info: e.target.value };
                  onChange({ cards });
                }}
                placeholder="Card Info"
                className="w-full border rounded px-2 py-1 text-sm h-16"
              />
            </div>
          ))}
          <button
            onClick={() => onChange({ cards: [...(section.cards || []), { id: uid(), title: "", info: "" }] })}
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Card
          </button>
        </div>
      );

    case "dropdowns":
      return (
        <div className="space-y-2">
          {(section.items || []).map((it, i) => (
            <div key={it.id} className="border rounded p-2 space-y-1">
              <input
                value={it.header}
                onChange={(e) => {
                  const items = [...(section.items || [])];
                  items[i] = { ...items[i], header: e.target.value };
                  onChange({ items });
                }}
                placeholder="Dropdown Header"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                value={it.info}
                onChange={(e) => {
                  const items = [...(section.items || [])];
                  items[i] = { ...items[i], info: e.target.value };
                  onChange({ items });
                }}
                placeholder="Dropdown Info"
                className="w-full border rounded px-2 py-1 text-sm h-16"
              />
            </div>
          ))}
          <button
            onClick={() => onChange({ items: [...(section.items || []), { id: uid(), header: "", info: "" }] })}
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Dropdown
          </button>
        </div>
      );

    case "questionnaire":
      return (
        <div className="space-y-2">
          {(section.questions || []).map((q, i) => (
            <div key={q.id} className="border rounded p-2 space-y-1">
              <input
                value={q.q}
                onChange={(e) => {
                  const qs = [...(section.questions || [])];
                  qs[i] = { ...qs[i], q: e.target.value };
                  onChange({ questions: qs });
                }}
                placeholder="Question"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <div className="text-xs font-semibold text-emerald-900 mb-1">Options</div>
              {(q.options || []).map((opt, oi) => (
                <input
                  key={oi}
                  value={opt}
                  onChange={(e) => {
                    const qs = [...(section.questions || [])];
                    const opts = [...(qs[i].options || [])];
                    opts[oi] = e.target.value;
                    qs[i] = { ...qs[i], options: opts };
                    onChange({ questions: qs });
                  }}
                  placeholder={`Option ${oi + 1}`}
                  className="w-full border rounded px-2 py-1 text-sm mb-1"
                />
              ))}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const qs = [...(section.questions || [])];
                    const opts = [...(qs[i].options || []), ""];
                    qs[i] = { ...qs[i], options: opts };
                    onChange({ questions: qs });
                  }}
                  className="px-2 py-1 text-xs rounded bg-emerald-600 text-white"
                >
                  + Add Option
                </button>
                <label className="text-xs">
                  Correct Index:
                  <input
                    type="number"
                    min={0}
                    max={(q.options || []).length - 1}
                    value={q.correctIndex ?? 0}
                    onChange={(e) => {
                      const qs = [...(section.questions || [])];
                      const ci = clamp(parseInt(e.target.value || "0", 10), 0, (q.options || []).length - 1);
                      qs[i] = { ...qs[i], correctIndex: ci };
                      onChange({ questions: qs });
                    }}
                    className="ml-2 w-16 border rounded px-2 py-0.5"
                  />
                </label>
              </div>
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                questions: [...(section.questions || []), { id: uid(), q: "", kind: "mcq", options: ["", ""], correctIndex: 0 }],
              })
            }
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Question
          </button>
        </div>
      );

    case "checklist":
      return (
        <div className="space-y-2">
          {(section.items || []).map((it, i) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.text}
                onChange={(e) => {
                  const items = [...(section.items || [])];
                  items[i] = { ...items[i], text: e.target.value };
                  onChange({ items });
                }}
                placeholder="Checklist item"
                className="flex-1 border rounded px-2 py-1 text-sm"
              />
              <label className="text-xs flex items-center gap-1">
                <input
                  type="checkbox"
                  checked={!!it.required}
                  onChange={(e) => {
                    const items = [...(section.items || [])];
                    items[i] = { ...items[i], required: e.target.checked };
                    onChange({ items });
                  }}
                />
                required
              </label>
            </div>
          ))}
          <button
            onClick={() => onChange({ items: [...(section.items || []), { id: uid(), text: "", required: true }] })}
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Item
          </button>
        </div>
      );

    case "embed":
      return (
        <div className="space-y-2">
          <input
            value={section.url}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="Embed URL"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={section.note}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Notes or context"
            className="w-full border rounded px-3 py-2 h-20"
          />
          {section.url && (
            <iframe src={section.url} title="Embed" className="w-full h-64 border rounded" allowFullScreen />
          )}
        </div>
      );

    default:
      return <div className="text-gray-400">Unknown section type.</div>;
  }
}

/* ---------------- StatusPill ---------------- */
function StatusPill({ status }) {
  const info =
    status === "completed"
      ? { color: "text-emerald-600", label: "Completed", icon: CheckCircle }
      : status === "in-progress"
      ? { color: "text-amber-500", label: "In progress", icon: Timer }
      : status === "available"
      ? { color: "text-emerald-700", label: "Available", icon: PlayCircle }
      : { color: "text-gray-500", label: "Locked", icon: Lock };

  const Icon = info.icon;
  return (
    <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-xs font-bold border-current ${info.color}`}>
      <Icon className="w-4 h-4" /> {info.label}
    </div>
  );
}
