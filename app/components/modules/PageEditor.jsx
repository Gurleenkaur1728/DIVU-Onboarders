import { MoveUp, MoveDown, Trash2, Plus } from "lucide-react";
import { SECTION_TYPES } from "./ModuleBuilderModal.jsx";
import SectionEditor from "./SectionEditor.jsx";

/* simple id helper */
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export default function PageEditor({
  page,
  pages,
  onRename,
  onAddSection,
  onRemoveSection,
  onMoveSection,
  onUpdateSection,
  uploadToBucket,
}) {
  // Safety check for missing page
  if (!page) {
    return (
      <div className="text-gray-400 text-center p-10">
        Select or create a page to start editing.
      </div>
    );
  }

  // Default fallback if no sections exist yet
  const { name = "", sections = [] } = page;

  return (
    <div className="space-y-4">
      {/* Page name field */}
      <div className="flex items-center gap-2">
        <input
          value={name}
          onChange={(e) => onRename(e.target.value)}
          placeholder="Page name (optional)"
          className="flex-1 border rounded px-3 py-2"
        />
      </div>

      {/* Add section area */}
      <div className="p-3 border rounded-lg border-emerald-200 bg-emerald-50">
        <div className="text-sm font-semibold text-emerald-900 mb-2">
          Add content to this page:
        </div>
        <div className="grid grid-cols-3 md:grid-cols-4 gap-2">
          {SECTION_TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => onAddSection(t.key)}
              className="flex flex-col items-center gap-1 px-3 py-2 rounded-lg border border-emerald-200 hover:bg-white text-emerald-900"
            >
              <Plus size={14} />
              <span className="text-xs">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Section List */}
      {sections.length === 0 ? (
        <div className="text-gray-500">
          No content sections on this page yet.
        </div>
      ) : (
        <div className="space-y-4">
          {sections.map((section, idx) => (
            <div
              key={section.id}
              className="border rounded-xl p-3 bg-white shadow-sm text-black"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="font-semibold text-emerald-900 text-sm capitalize">
                  {section.type} section
                </div>
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

              {/* Section Editor */}
              <SectionEditor
                section={section}
                onChange={(patch) => onUpdateSection(idx, patch)}
                uploadToBucket={uploadToBucket}
                allPages={pages}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}