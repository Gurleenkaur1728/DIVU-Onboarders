import { useEffect, useMemo, useState } from "react";
import { CheckCircle, Plus, Trash2, Copy } from "lucide-react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import PageEditor from "./PageEditor.jsx";

/* helpers */
const uid = () =>
  globalThis.crypto?.randomUUID?.() ??
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const words = (t = "") => t.trim().split(/\s+/).filter(Boolean).length;

/* section presets (same as big file) */
export const SECTION_TYPES = [
  { key: "text", label: "Text" },
  { key: "photo", label: "Photo" },
  { key: "video", label: "Video" },
  { key: "flashcards", label: "Flashcards" },
  { key: "dropdowns", label: "Dropdowns" },
  { key: "questionnaire", label: "Questionnaire" },
  { key: "checklist", label: "Checklist" },
  { key: "embed", label: "Embed (URL)" },
];

export const defaultSection = (type) => {
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

export default function ModuleBuilderModal({ draftId, onClose, showToast, onModuleCreated }) {
  /* steps: 0 Info → 1 Pages → 2 Review */
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [abandonConfirmOpen, setAbandonConfirmOpen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // pages: [{id, name, sections:[section]}]
  const [pages, setPages] = useState([]);
  const [activePageIndex, setActivePageIndex] = useState(-1);

  // inline type chooser (Info step + Pages step)
  const [selectTypeOpen, setSelectTypeOpen] = useState(false);

  /* word caps like your big file */
  const titleWordLimit = 100;
  const descWordLimit = 250;

  /* load draft */
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

  /* progress calc (same weighting) */
  const progress = useMemo(() => {
    let base = 0;
    if (title.trim()) base += 20;
    if (description.trim()) base += 20;
    if (pages.length > 0) base += 40;
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
        status: "draft", // ✅ ensures any unfinished draft is marked as draft
        ...patch,
      })
      .eq("id", draftId);
  };

  /* word-limit handlers like original */
  const onChangeTitle = (val) => {
    if (words(val) <= titleWordLimit) setTitle(val);
  };
  const onChangeDescription = (val) => {
    if (words(val) <= descWordLimit) setDescription(val);
  };

  /* page operations */
  const addPageWithSectionType = async (type) => {
    const newPage = { id: uid(), name: `Page ${pages.length + 1}`, sections: [defaultSection(type)] };
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

  /* section ops passed to PageEditor */
  const onMoveSection = async (sectionIndex, dir) => {
    const p = pages[activePageIndex] || { sections: [] };
    const next = Array.isArray(p.sections) ? [...p.sections] : [];
    const to = sectionIndex + (dir === "up" ? -1 : 1);
    if (to < 0 || to >= next.length) return;
    const [spliced] = next.splice(sectionIndex, 1);
    next.splice(to, 0, spliced);
    await updateActivePage({ sections: next });
  };

  const onRemoveSection = async (sectionId) => {
    const p = pages[activePageIndex] || { sections: [] };
    const next = (p.sections || []).filter((s) => s.id !== sectionId);
    await updateActivePage({ sections: next });
    showToast("Section removed.", "info");
  };

  const onAddSection = async (type) => {
    const p = pages[activePageIndex] || { sections: [] };
    const next = [...(p.sections || []), defaultSection(type)];
    await updateActivePage({ sections: next });
    showToast(`${type} section added to page.`, "success");
  };

  /* navigation + validation like original */
  const goInfo = () => { setStep(0); persistDraft({ current_step: 0 }); };
  const goReview = () => { setStep(2); persistDraft({ current_step: 2 }); };
  const goPage = (i) => { setStep(1); setActivePageIndex(i); persistDraft({ current_step: 1 }); };

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
            if (!s.body || !s.body.trim()) {
              showToast(`Page ${pIndex + 1} — text section ${sIndex + 1} cannot be empty.`, "error"); 
              return false;
            }
            break;
          case "photo":
          case "video":
            if (!s.media_path || !s.media_path.trim()) {
              showToast(`Page ${pIndex + 1} — ${s.type} section ${sIndex + 1} requires an upload.`, "error");
              return false;
            }
            break;
          case "flashcards":
            if (!Array.isArray(s.cards) || s.cards.length === 0) {
              showToast(`Page ${pIndex + 1} — flashcards need at least one card.`, "error"); 
              return false;
            }
            break;
          case "dropdowns":
            if (!Array.isArray(s.items) || s.items.length === 0) {
              showToast(`Page ${pIndex + 1} — dropdown needs at least one item.`, "error");
              return false;
            }
            break;
          case "questionnaire":
            if (!Array.isArray(s.questions) || s.questions.length === 0) {
              showToast(`Page ${pIndex + 1} — questionnaire needs at least one question.`, "error");
              return false;
            }
            break;
          case "checklist":
            if (!Array.isArray(s.items) || s.items.length === 0) {
              showToast(`Page ${pIndex + 1} — checklist needs at least one item.`, "error");
              return false;
            }
            break;
          case "embed":
            if (!s.url || !s.url.trim()) {
              showToast(`Page ${pIndex + 1} — embed requires a URL.`, "error");
              return false;
            }
            break;
          default:
            break;
        }
      }
    }
    return true;
  };

  const handleAddPage = () => {
    if (!title || !title.trim()) { showToast("Add a module title first.", "error"); return; }
    if (!description || !description.trim()) { showToast("Add a module description first.", "error"); return; }
    setSelectTypeOpen(true);
    if (step === 0) setStep(1);
  };

  const handleNext = () => {
    if (step === 1 && !validatePagesSections()) return;
    const ns = clamp(step + 1, 0, 2);
    setStep(ns);
    persistDraft({ current_step: ns });
  };

  /* publish to modules table with pages data */
  const completeModule = async () => {
    if (!title.trim() || !description.trim() || pages.length === 0) {
      showToast("Complete Title, Description and at least one Page.", "warning");
      return;
    }
    if (!validatePagesSections()) return;

    setSaving(true);
    const profileId = localStorage.getItem("profile_id");

    console.log("Creating module with data:", {
      title: title.trim(),
      description: description.trim(),
      created_by: profileId,
      pages: pages,
      pagesCount: pages.length
    });

    try {
      // Create the module with pages data directly in the pages column
      const { data: moduleData, error: modErr } = await supabase
        .from("modules")
        .insert({
          title: title.trim(),
          description: description.trim(),
          created_by: profileId,
          estimated_time_min: 10,
          pages: pages // Store pages data directly in the pages column
        })
        .select()
        .single();

      if (modErr) {
        console.error("Module creation error:", modErr);
        showToast(`Error creating module: ${modErr.message}`, "error");
        setSaving(false);
        return;
      }

      console.log("Module created successfully with pages data:", moduleData);

      console.log("Module creation process completed, deleting draft...");

      // Delete the draft since we've successfully published
      await supabase.from("module_drafts").delete().eq("id", draftId);
      setSaving(false);
      showToast("Module created successfully!", "success");

      // ✅ Notify parent to refresh and close modal
      if (typeof onModuleCreated === "function") {
        onModuleCreated();
      }
      onClose();
    } catch (error) {
      console.error("Unexpected error during module creation:", error);
      showToast("Unexpected error creating module.", "error");
      setSaving(false);
    }
  };

  /* abandon draft */
  const abandonModule = async () => {
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

  /* upload helper */
  const uploadToBucket = async (file) => {
    if (!file) return null;
    const ext = file.name.split(".").pop() || "bin";
    const path = `uploads/${Date.now()}-${uid()}.${ext}`;
    const { error } = await supabase.storage.from("assets").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      showToast("Upload failed.", "error");
      return null;
    }
    showToast("File uploaded successfully.", "success");
    return path;
  };

  /* progress dot UI */
  const ProgressDot = ({ label, active, done, onClick, index }) => (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group focus:outline-none"
      title={label}
    >
      <div
        className={`flex items-center justify-center w-8 h-8 rounded-full font-bold border shadow-sm transition-all
        ${active ? "bg-emerald-600 text-white border-emerald-700 scale-105 ring-2 ring-emerald-400/30"
                 : done ? "bg-white text-emerald-700 border-emerald-300"
                 : "bg-white text-emerald-800 border-emerald-300 group-hover:bg-emerald-50"}`}
      >
        {done ? (
          <CheckCircle size={14} className="text-emerald-600" />
        ) : (
          <span className={`text-xs font-semibold ${active ? "text-white" : "text-emerald-800"}`}>
            {typeof index === "number" ? index + 1 : (label === "Info" ? "I" : "R")}
          </span>
        )}
      </div>
      <span className={`text-[11px] font-semibold ${active ? "text-white" : done ? "text-emerald-100" : "text-emerald-200"}`}>
        {label}
      </span>
    </button>
  );

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
        <div className="bg-emerald-950 text-white rounded-xl p-6">Loading draft…</div>
      </div>
    );
  }
  return (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-6 z-50">
    {/* fixed-size modal */}
    <div className="w-full max-w-5xl h-[80vh] bg-white rounded-2xl shadow-xl overflow-visible flex flex-col">
      {/* header */}
      <div className="flex items-center justify-between bg-emerald-900 text-white rounded-t-2xl p-4">
        {/* progress dots w/ connectors */}
        <div className="flex items-center gap-3 overflow-x-auto">
          <ProgressDot label="Info" active={step === 0} done={step > 0} onClick={goInfo} />
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
          <ProgressDot label="Review" active={step === 2} done={false} onClick={goReview} />
        </div>

        <div className="flex gap-2 items-center">
          <button
            onClick={() => setAbandonConfirmOpen(true)}
            className="px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-sm font-semibold"
          >
            Abandon
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-sm font-semibold"
          >
            Close
          </button>
        </div>

        {/* Abandon confirm modal */}
        {abandonConfirmOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/40">
            <div className="bg-white w-full max-w-md rounded-xl shadow-xl p-6 mx-4">
              <div className="text-lg font-semibold text-emerald-900 mb-2">Abandon draft?</div>
              <p className="text-sm text-emerald-700 mb-4">
                This will permanently delete your draft and all progress. This action cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setAbandonConfirmOpen(false)}
                  className="px-3 py-1.5 rounded bg-gray-200 hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={abandonModule}
                  className="px-3 py-1.5 rounded bg-red-600 text-white"
                >
                  Yes, abandon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* unified progress bar */}
      <div className="px-6 py-3 flex items-center gap-4">
        <div className="relative flex-1 h-3 rounded-full bg-emerald-100/70 shadow-inner overflow-hidden">
          <div
            className="absolute left-0 top-0 h-full rounded-full transition-[width] duration-500 ease-out bg-gradient-to-r from-emerald-600 to-emerald-400 shadow"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="w-12 text-right">
          <span className="text-sm font-semibold text-emerald-900">{progress}%</span>
        </div>
      </div>

      {/* scroll body */}
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

              {!selectTypeOpen && (
                <button
                  onClick={handleAddPage}
                  className="mt-3 px-3 py-2 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                >
                  + Add First Page
                </button>
              )}

              {selectTypeOpen && (
                <div className="mt-4 p-4 border rounded-xl border-emerald-300 bg-emerald-50">
                  <div className="font-semibold text-emerald-900 mb-2">
                    Choose content type for new page
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
                    {SECTION_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => addPageWithSectionType(t.key)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-100 text-emerald-900"
                      >
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
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
            {/* left panel */}
            <div className="col-span-12 lg:col-span-4 space-y-4">
              <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-emerald-900">Pages</div>
                  <button
                    onClick={() => setSelectTypeOpen(true)}
                    className="px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                  >
                    <Plus size={14} className="inline mr-1" />
                    Add Page
                  </button>
                </div>

                <div className="mt-3 space-y-2">
                  {pages.length === 0 ? (
                    <div className="text-sm text-emerald-700">
                      No pages yet. Click “Add Page”.
                    </div>
                  ) : (
                    pages.map((p, i) => (
                      <div
                        key={p.id}
                        className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
                          i === activePageIndex
                            ? "border-emerald-300 bg-emerald-50"
                            : "border-gray-200 bg-white"
                        }`}
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

              {selectTypeOpen && (
                <div className="p-4 border rounded-xl border-emerald-300 bg-white">
                  <div className="font-semibold text-emerald-900 mb-2">
                    Choose Content Type for New Page
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {SECTION_TYPES.map((t) => (
                      <button
                        key={t.key}
                        onClick={() => addPageWithSectionType(t.key)}
                        className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-emerald-50 text-emerald-900"
                      >
                        <span className="text-xs">{t.label}</span>
                      </button>
                    ))}
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

            {/* right editor */}
            <div className="col-span-12 lg:col-span-8">
              {activePageIndex === -1 || !pages[activePageIndex] ? (
                <div className="text-gray-400 text-center p-10">
                  Select or create a page to edit.
                </div>
              ) : (
                <PageEditor
                  page={pages[activePageIndex]}
                  onRename={async (name) => updateActivePage({ name })}
                  onAddSection={onAddSection}
                  onRemoveSection={onRemoveSection}
                  onMoveSection={onMoveSection}
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
                <div>
                  <span className="font-semibold">Title:</span>{" "}
                  {title || <i>(empty)</i>}
                </div>
                <div className="mt-1">
                  <span className="font-semibold">Description:</span>{" "}
                  {description || <i>(empty)</i>}
                </div>
                <div className="mt-3 font-semibold">Pages:</div>
                {pages.length === 0 ? (
                  <div className="text-emerald-700">No pages added.</div>
                ) : (
                  <ul className="list-disc pl-6">
                    {pages.map((p, i) => (
                      <li key={p.id} className="mb-1">
                        <span className="font-medium">
                          {p.name || `Page ${i + 1}`}
                        </span>{" "}
                        — {(p.sections || []).length} section(s)
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* footer */}
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

  
