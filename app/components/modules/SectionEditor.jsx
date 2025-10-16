import { supabase } from "../../../src/lib/supabaseClient.js";

/* id + clamp helpers */
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function SectionEditor({ section, onChange, uploadToBucket }) {
  if (!section) return null;

  /* Upload handler */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadToBucket(file);
    if (path) onChange({ media_path: path });
  };

  switch (section.type) {
    /* TEXT SECTION */
    case "text":
      return (
        <div className="space-y-2">
          <input
            value={section.title || ""}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="Text block title"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={section.body || ""}
            onChange={(e) => onChange({ body: e.target.value })}
            placeholder="Text block content"
            className="w-full border rounded px-3 py-2 h-32"
          />
        </div>
      );

    /* PHOTO SECTION */
    case "photo":
      return (
        <div className="space-y-2">
          <input type="file" accept="image/*" onChange={handleUpload} />
          {section.media_path && (
            <img
              src={
                supabase.storage
                  .from("modules_assets")
                  .getPublicUrl(section.media_path).data.publicUrl
              }
              className="rounded shadow max-h-64"
              alt="Uploaded"
            />
          )}
          <input
            value={section.caption || ""}
            onChange={(e) => onChange({ caption: e.target.value })}
            placeholder="Caption"
            className="w-full border rounded px-3 py-2"
          />
        </div>
      );

    /* VIDEO SECTION */
    case "video":
      return (
        <div className="space-y-2">
          <input type="file" accept="video/*" onChange={handleUpload} />
          {section.media_path && (
            <video
              controls
              src={
                supabase.storage
                  .from("modules_assets")
                  .getPublicUrl(section.media_path).data.publicUrl
              }
              className="rounded shadow max-h-64"
            />
          )}
          <textarea
            value={section.transcript || ""}
            onChange={(e) => onChange({ transcript: e.target.value })}
            placeholder="Transcript / Notes"
            className="w-full border rounded px-3 py-2 h-24"
          />
        </div>
      );

    /* FLASHCARDS SECTION */
    case "flashcards":
      return (
        <div className="space-y-2">
          {(section.cards || []).map((c, i) => (
            <div key={c.id} className="border rounded p-2 space-y-1">
              <input
                value={c.title || ""}
                onChange={(e) => {
                  const cards = [...(section.cards || [])];
                  cards[i] = { ...cards[i], title: e.target.value };
                  onChange({ cards });
                }}
                placeholder="Card Title"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                value={c.info || ""}
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
            onClick={() =>
              onChange({
                cards: [...(section.cards || []), { id: uid(), title: "", info: "" }],
              })
            }
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Card
          </button>
        </div>
      );

    /* DROPDOWNS SECTION */
    case "dropdowns":
      return (
        <div className="space-y-2">
          {(section.items || []).map((it, i) => (
            <div key={it.id} className="border rounded p-2 space-y-1">
              <input
                value={it.header || ""}
                onChange={(e) => {
                  const items = [...(section.items || [])];
                  items[i] = { ...items[i], header: e.target.value };
                  onChange({ items });
                }}
                placeholder="Dropdown Header"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                value={it.info || ""}
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
            onClick={() =>
              onChange({
                items: [...(section.items || []), { id: uid(), header: "", info: "" }],
              })
            }
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Dropdown
          </button>
        </div>
      );

    /* QUESTIONNAIRE SECTION */
    case "questionnaire":
      return (
        <div className="space-y-2">
          {(section.questions || []).map((q, i) => (
            <div key={q.id} className="border rounded p-2 space-y-1">
              <input
                value={q.q || ""}
                onChange={(e) => {
                  const qs = [...(section.questions || [])];
                  qs[i] = { ...qs[i], q: e.target.value };
                  onChange({ questions: qs });
                }}
                placeholder="Question"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <div className="text-xs font-semibold text-emerald-900 mb-1">
                Options
              </div>
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
                      const ci = clamp(
                        parseInt(e.target.value || "0", 10),
                        0,
                        (q.options || []).length - 1
                      );
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
                questions: [
                  ...(section.questions || []),
                  { id: uid(), q: "", kind: "mcq", options: ["", ""], correctIndex: 0 },
                ],
              })
            }
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Question
          </button>
        </div>
      );

    /* CHECKLIST SECTION */
    case "checklist":
      return (
        <div className="space-y-2">
          {(section.items || []).map((it, i) => (
            <div key={it.id} className="flex items-center gap-2">
              <input
                value={it.text || ""}
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
            onClick={() =>
              onChange({
                items: [...(section.items || []), { id: uid(), text: "", required: true }],
              })
            }
            className="px-3 py-1 bg-emerald-600 text-white text-sm rounded"
          >
            + Add Item
          </button>
        </div>
      );

    /* EMBED SECTION */
    case "embed":
      return (
        <div className="space-y-2">
          <input
            value={section.url || ""}
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="Embed URL"
            className="w-full border rounded px-3 py-2"
          />
          <textarea
            value={section.note || ""}
            onChange={(e) => onChange({ note: e.target.value })}
            placeholder="Notes or context"
            className="w-full border rounded px-3 py-2 h-20"
          />
          {section.url && (
            <iframe
              src={section.url}
              title="Embedded Content"
              className="w-full h-64 border rounded"
              allowFullScreen
            />
          )}
        </div>
      );

    /* DEFAULT CASE */
    default:
      return <div className="text-gray-400">Unknown section type.</div>;
  }
}