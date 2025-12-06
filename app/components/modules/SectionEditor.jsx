import { supabase } from "../../../src/lib/supabaseClient.js";

/* id + clamp helpers */
const uid = () =>
  globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

/* Extract text content from all pages for AI quiz generation */
const extractModuleContent = (pages) => {
  if (!pages || pages.length === 0) {
    return "No content available yet. Please add some text sections first.";
  }

  const contentParts = [];
  
  pages.forEach((page, pageIndex) => {
    if (page.name) {
      contentParts.push(`Page ${pageIndex + 1}: ${page.name}`);
    }
    
    if (page.sections && Array.isArray(page.sections)) {
      page.sections.forEach((section) => {
        switch (section.type) {
          case "text":
            if (section.title) contentParts.push(`Title: ${section.title}`);
            if (section.body) contentParts.push(section.body);
            break;
          case "photo":
            if (section.caption) contentParts.push(`Image caption: ${section.caption}`);
            break;
          case "video":
            if (section.transcript) contentParts.push(`Video transcript: ${section.transcript}`);
            break;
          case "flashcards":
            if (section.cards) {
              section.cards.forEach((card) => {
                if (card.front || card.back) {
                  contentParts.push(`Flashcard - Front: ${card.front} | Back: ${card.back}`);
                }
              });
            }
            break;
          case "dropdowns":
            if (section.items) {
              section.items.forEach((item) => {
                if (item.header) contentParts.push(`Topic: ${item.header}`);
                if (item.info) contentParts.push(item.info);
              });
            }
            break;
          case "checklist":
            if (section.items) {
              section.items.forEach((item) => {
                if (item.text) contentParts.push(`Checklist item: ${item.text}`);
              });
            }
            break;
          case "embed":
            if (section.note) contentParts.push(`Embedded content note: ${section.note}`);
            break;
        }
      });
    }
  });
  
  const fullContent = contentParts.join("\n\n");
  return fullContent.trim() || "No meaningful content found. Please add text, descriptions, or captions to your module sections.";
};

export default function SectionEditor({ section, onChange, uploadToBucket, allPages }) {
  if (!section) return null;

  /* Upload handler */
  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const path = await uploadToBucket(file);
    if (path) {
      // Convert path to public URL
      const { data } = supabase.storage.from("assets").getPublicUrl(path);
      onChange({ media_url: data.publicUrl, media_path: path });
    }
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
          {(section.media_url || section.media_path) && (
            <img
              src={
                section.media_url || supabase.storage
                  .from("assets")
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
          {(section.media_url || section.media_path) && (
            <video
              controls
              src={
                section.media_url || supabase.storage
                  .from("assets")
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
                value={c.front || ""}
                onChange={(e) => {
                  const cards = [...(section.cards || [])];
                  cards[i] = { ...cards[i], front: e.target.value };
                  onChange({ cards });
                }}
                placeholder="Question / Front of Card"
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <textarea
                value={c.back || ""}
                onChange={(e) => {
                  const cards = [...(section.cards || [])];
                  cards[i] = { ...cards[i], back: e.target.value };
                  onChange({ cards });
                }}
                placeholder="Answer / Back of Card"
                className="w-full border rounded px-2 py-1 text-sm h-16"
              />
            </div>
          ))}
          <button
            onClick={() =>
              onChange({
                cards: [...(section.cards || []), { id: uid(), front: "", back: "" }],
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

    /* QUIZ/ASSESSMENT SECTION */
    case "quiz":
      return (
        <div className="space-y-6">
          {/* Quiz Title & Description */}
          <div className="space-y-2 bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900">📝 Quiz Settings</h3>
            <input
              value={section.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="Quiz Title (e.g., Module 1 Assessment)"
              className="w-full border rounded px-3 py-2"
            />
            <textarea
              value={section.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Quiz description or instructions"
              className="w-full border rounded px-3 py-2 h-20"
            />
            
            {/* Quiz Settings */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passing Score (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={section.settings?.passingScore || 70}
                  onChange={(e) => onChange({ 
                    settings: { ...section.settings, passingScore: parseInt(e.target.value) || 70 } 
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Max Attempts (0 = unlimited)
                </label>
                <input
                  type="number"
                  min="0"
                  value={section.settings?.maxAttempts || 3}
                  onChange={(e) => onChange({ 
                    settings: { ...section.settings, maxAttempts: parseInt(e.target.value) || 0 } 
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Limit (minutes, 0 = none)
                </label>
                <input
                  type="number"
                  min="0"
                  value={section.settings?.timeLimit || 0}
                  onChange={(e) => onChange({ 
                    settings: { ...section.settings, timeLimit: parseInt(e.target.value) || null } 
                  })}
                  className="w-full border rounded px-3 py-2"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.settings?.showCorrectAnswers ?? true}
                    onChange={(e) => onChange({ 
                      settings: { ...section.settings, showCorrectAnswers: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Show Correct Answers</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.settings?.allowRetake ?? true}
                    onChange={(e) => onChange({ 
                      settings: { ...section.settings, allowRetake: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Allow Retake</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={section.settings?.shuffleQuestions ?? false}
                    onChange={(e) => onChange({ 
                      settings: { ...section.settings, shuffleQuestions: e.target.checked } 
                    })}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Shuffle Questions</span>
                </label>
              </div>
            </div>
          </div>

          {/* Questions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">Questions</h3>
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    // Get module content from parent - we'll need to pass this
                    if (!window.confirm("Generate quiz questions with AI? This will analyze your module content and create questions automatically.")) {
                      return;
                    }
                    
                    const btn = event.target;
                    btn.disabled = true;
                    btn.textContent = "Generating...";
                    
                    try {
                      // Extract all text content from the module pages
                      const moduleContent = extractModuleContent(allPages || []);
                      
                      const response = await fetch("/api/ai/generate-quiz", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          moduleContent,
                          questionCount: 10
                        })
                      });
                      
                      const data = await response.json();
                      
                      if (data.questions) {
                        onChange({ questions: data.questions });
                        alert(`✅ Successfully generated ${data.questions.length} questions!`);
                      } else {
                        throw new Error(data.error || "Failed to generate questions");
                      }
                    } catch (error) {
                      console.error("AI generation error:", error);
                      alert("❌ Failed to generate quiz questions. Please try again.");
                    } finally {
                      btn.disabled = false;
                      btn.textContent = "✨ Generate with AI";
                    }
                  }}
                  className="px-3 py-1 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded hover:from-purple-700 hover:to-blue-700 text-sm font-medium"
                >
                  ✨ Generate with AI
                </button>
                <button
                  onClick={() => {
                    const newQuestion = {
                      id: uid(),
                      type: "multiple-choice",
                      question: "",
                      options: ["", "", "", ""],
                      correctAnswer: 0,
                      points: 10,
                      explanation: ""
                    };
                    onChange({ questions: [...(section.questions || []), newQuestion] });
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  + Add Question
                </button>
              </div>
            </div>

            {(section.questions || []).map((q, qIdx) => (
              <div key={q.id} className="border border-gray-300 rounded-lg p-4 bg-gray-50">
                <div className="flex items-start justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Question {qIdx + 1}</h4>
                  <button
                    onClick={() => {
                      const newQuestions = section.questions.filter((_, i) => i !== qIdx);
                      onChange({ questions: newQuestions });
                    }}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    Delete
                  </button>
                </div>

                <div className="space-y-3">
                  {/* Question Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question Type
                    </label>
                    <select
                      value={q.type || "multiple-choice"}
                      onChange={(e) => {
                        const newQuestions = [...section.questions];
                        const newType = e.target.value;
                        
                        // Reset question based on type
                        if (newType === "multiple-choice") {
                          newQuestions[qIdx] = { ...q, type: newType, options: ["", "", "", ""], correctAnswer: 0 };
                        } else if (newType === "multiple-select") {
                          newQuestions[qIdx] = { ...q, type: newType, options: ["", "", "", ""], correctAnswers: [0] };
                        } else if (newType === "true-false") {
                          newQuestions[qIdx] = { ...q, type: newType, correctAnswer: true, options: undefined };
                        } else if (newType === "fill-blank") {
                          newQuestions[qIdx] = { ...q, type: newType, correctAnswer: "", options: undefined };
                        }
                        
                        onChange({ questions: newQuestions });
                      }}
                      className="w-full border rounded px-3 py-2"
                    >
                      <option value="multiple-choice">Multiple Choice (Single Answer)</option>
                      <option value="multiple-select">Multiple Select (Multiple Answers)</option>
                      <option value="true-false">True/False</option>
                      <option value="fill-blank">Fill in the Blank</option>
                    </select>
                  </div>

                  {/* Question Text */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Question
                    </label>
                    <textarea
                      value={q.question || ""}
                      onChange={(e) => {
                        const newQuestions = [...section.questions];
                        newQuestions[qIdx].question = e.target.value;
                        onChange({ questions: newQuestions });
                      }}
                      placeholder="Enter your question here..."
                      className="w-full border rounded px-3 py-2 h-20"
                    />
                  </div>

                  {/* Question Type Specific Fields */}
                  {q.type === "multiple-choice" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Options (select correct answer)
                      </label>
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 mb-2">
                          <input
                            type="radio"
                            name={`correct-${q.id}`}
                            checked={q.correctAnswer === optIdx}
                            onChange={() => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIdx].correctAnswer = optIdx;
                              onChange({ questions: newQuestions });
                            }}
                            className="flex-shrink-0"
                          />
                          <input
                            value={opt}
                            onChange={(e) => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIdx].options[optIdx] = e.target.value;
                              onChange({ questions: newQuestions });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 border rounded px-3 py-2"
                          />
                          {q.options.length > 2 && (
                            <button
                              onClick={() => {
                                const newQuestions = [...section.questions];
                                newQuestions[qIdx].options.splice(optIdx, 1);
                                if (newQuestions[qIdx].correctAnswer >= optIdx && newQuestions[qIdx].correctAnswer > 0) {
                                  newQuestions[qIdx].correctAnswer--;
                                }
                                onChange({ questions: newQuestions });
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newQuestions = [...section.questions];
                          newQuestions[qIdx].options.push("");
                          onChange({ questions: newQuestions });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  {q.type === "multiple-select" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Options (check all correct answers)
                      </label>
                      {(q.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2 mb-2">
                          <input
                            type="checkbox"
                            checked={(q.correctAnswers || []).includes(optIdx)}
                            onChange={(e) => {
                              const newQuestions = [...section.questions];
                              const currentCorrect = newQuestions[qIdx].correctAnswers || [];
                              if (e.target.checked) {
                                newQuestions[qIdx].correctAnswers = [...currentCorrect, optIdx];
                              } else {
                                newQuestions[qIdx].correctAnswers = currentCorrect.filter(i => i !== optIdx);
                              }
                              onChange({ questions: newQuestions });
                            }}
                            className="flex-shrink-0"
                          />
                          <input
                            value={opt}
                            onChange={(e) => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIdx].options[optIdx] = e.target.value;
                              onChange({ questions: newQuestions });
                            }}
                            placeholder={`Option ${optIdx + 1}`}
                            className="flex-1 border rounded px-3 py-2"
                          />
                          {q.options.length > 2 && (
                            <button
                              onClick={() => {
                                const newQuestions = [...section.questions];
                                newQuestions[qIdx].options.splice(optIdx, 1);
                                // Update correct answers indices
                                newQuestions[qIdx].correctAnswers = (newQuestions[qIdx].correctAnswers || [])
                                  .filter(i => i !== optIdx)
                                  .map(i => i > optIdx ? i - 1 : i);
                                onChange({ questions: newQuestions });
                              }}
                              className="text-red-600 hover:text-red-800 text-sm px-2"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        onClick={() => {
                          const newQuestions = [...section.questions];
                          newQuestions[qIdx].options.push("");
                          onChange({ questions: newQuestions });
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        + Add Option
                      </button>
                    </div>
                  )}

                  {q.type === "true-false" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correct Answer
                      </label>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`tf-${q.id}`}
                            checked={q.correctAnswer === true}
                            onChange={() => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIdx].correctAnswer = true;
                              onChange({ questions: newQuestions });
                            }}
                          />
                          <span>True</span>
                        </label>
                        <label className="flex items-center gap-2">
                          <input
                            type="radio"
                            name={`tf-${q.id}`}
                            checked={q.correctAnswer === false}
                            onChange={() => {
                              const newQuestions = [...section.questions];
                              newQuestions[qIdx].correctAnswer = false;
                              onChange({ questions: newQuestions });
                            }}
                          />
                          <span>False</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {q.type === "fill-blank" && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Correct Answer (case-insensitive)
                      </label>
                      <input
                        value={q.correctAnswer || ""}
                        onChange={(e) => {
                          const newQuestions = [...section.questions];
                          newQuestions[qIdx].correctAnswer = e.target.value;
                          onChange({ questions: newQuestions });
                        }}
                        placeholder="Enter the correct answer"
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  )}

                  {/* Points */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={q.points || 10}
                        onChange={(e) => {
                          const newQuestions = [...section.questions];
                          newQuestions[qIdx].points = parseInt(e.target.value) || 10;
                          onChange({ questions: newQuestions });
                        }}
                        className="w-full border rounded px-3 py-2"
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Explanation (shown after answering)
                    </label>
                    <textarea
                      value={q.explanation || ""}
                      onChange={(e) => {
                        const newQuestions = [...section.questions];
                        newQuestions[qIdx].explanation = e.target.value;
                        onChange({ questions: newQuestions });
                      }}
                      placeholder="Explain why this answer is correct..."
                      className="w-full border rounded px-3 py-2 h-16"
                    />
                  </div>
                </div>
              </div>
            ))}

            {(section.questions || []).length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No questions yet. Click "Add Question" to create one.
              </div>
            )}

            {/* Total Points Summary */}
            {(section.questions || []).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="text-sm text-green-900">
                  <strong>Total Points:</strong> {(section.questions || []).reduce((sum, q) => sum + (q.points || 0), 0)} points
                  {" | "}
                  <strong>{(section.questions || []).length}</strong> question{(section.questions || []).length !== 1 ? 's' : ''}
                </div>
              </div>
            )}
          </div>
        </div>
      );

    /* FILE DOWNLOAD SECTION */
    case "file":
      return (
        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              File Title *
            </label>
            <input
              type="text"
              value={section.title || ""}
              onChange={(e) => onChange({ title: e.target.value })}
              placeholder="e.g., Employee Handbook, Safety Guidelines"
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              value={section.description || ""}
              onChange={(e) => onChange({ description: e.target.value })}
              placeholder="Describe what this file contains..."
              className="w-full border rounded px-3 py-2 h-20"
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Upload File *
            </label>
            {section.file_url ? (
              <div className="border rounded-lg p-4 bg-emerald-50 border-emerald-200">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-emerald-900">
                      📄 {section.file_name || "Uploaded file"}
                    </div>
                    {section.file_size > 0 && (
                      <div className="text-sm text-emerald-700">
                        {(section.file_size / 1024).toFixed(2)} KB
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => onChange({ file_url: "", file_name: "", file_size: 0 })}
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-emerald-400 transition-colors">
                <input
                  type="file"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    
                    const path = await uploadToBucket(file);
                    if (path) {
                      const { data } = supabase.storage.from("assets").getPublicUrl(path);
                      onChange({
                        file_url: data.publicUrl,
                        file_name: file.name,
                        file_size: file.size,
                      });
                    }
                  }}
                  className="hidden"
                  id="file-upload"
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-block px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  Choose File
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  PDF, DOC, XLS, PPT, TXT, ZIP (max 50MB)
                </p>
              </div>
            )}
          </div>
        </div>
      );

    /* DEFAULT CASE */
    default:
      return <div className="text-gray-400">Unknown section type.</div>;
  }
}