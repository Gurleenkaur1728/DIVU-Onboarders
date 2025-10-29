import { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar.jsx";
import {
  Pencil,
  Trash2,
  User,
  PlusCircle,
  X,
  MessageSquare,
  Folder,
  CalendarDays,
  Archive,
} from "lucide-react";
import { supabase } from "../../../src/lib/supabaseClient";
import { useRole } from "../../../src/lib/hooks/useRole.js";

export default function ManageQuestions() {
  const { roleId } = useRole();

  const [tab, setTab] = useState("employee"); // "faqs" | "employee" | "archive"

  // --- FAQs state
  const [faqs, setFaqs] = useState([]);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingFaq, setEditingFaq] = useState(null);

  // --- Employee Questions state
  const [employeeQuestions, setEmployeeQuestions] = useState([]);
  const [answeringQ, setAnsweringQ] = useState(null);
  const [answerText, setAnswerText] = useState("");

  // --- Answered Archive (grouped) state
  const [answeredGroups, setAnsweredGroups] = useState([]);

  /* ---------- FAQs: Supabase CRUD ---------- */
  useEffect(() => {
    let ignore = false;

    const loadFaqs = async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, is_published, created_at, updated_at")
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) console.error(error);
        setFaqs(data ?? []);
      }
    };

    loadFaqs();

    const ch = supabase
      .channel("faqs-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faqs" },
        () => loadFaqs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      ignore = true;
    };
  }, []);

  const addFaq = async () => {
    if (!newQ.trim() || !newA.trim()) return;
    const { error } = await supabase
      .from("faqs")
      .insert({ question: newQ.trim(), answer: newA.trim(), is_published: true });
    if (error) return alert(error.message);
    setNewQ("");
    setNewA("");
  };

  const deleteFaq = async (id) => {
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) alert(error.message);
  };

  const saveEditFaq = async () => {
    if (!editingFaq) return;
    const { id, question, answer } = editingFaq;
    const { error } = await supabase
      .from("faqs")
      .update({ question: question.trim(), answer: answer.trim() })
      .eq("id", id);
    if (error) return alert(error.message);
    setEditingFaq(null);
  };

  /* ---------- Employee Questions: list + realtime ---------- */
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      const { data, error } = await supabase
        .from("user_questions")
        .select(`
          id, question_text, answer_text, status, created_at, updated_at, answered_by,
          users:user_id ( name, email )
        `)
        // show only items that are open + answered
        .in("status", ["open", "answered"])
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (error) console.error(error);
        setEmployeeQuestions(
          (data ?? []).map((r) => ({
            id: r.id,
            name: r.users?.name ?? "Employee",
            email: r.users?.email ?? "N/A",
            question: r.question_text,
            answer: r.answer_text,
            status: r.status, // open and answered ie not closed
            created_at: r.created_at,
            updated_at: r.updated_at,
          }))
        );
      }
    };

    load();

    const channel = supabase
      .channel("uq-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_questions" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      ignore = true;
    };
  }, []);

  /* ---------- Answer modal: persist to Supabase ---------- */
  const saveAnswer = async () => {
    if (!answeringQ) return;
    if (answeringQ.status === "closed") {
      alert("This question has been archived and can no longer be edited.");
      return;
    }

    const payload = {
      answer_text: answerText.trim(),
      status: "answered", // stays in Employee tab, but now editable
      answered_by: (await supabase.auth.getUser()).data.user?.id ?? null,
    };

    const { data, error } = await supabase
      .from("user_questions")
      .update(payload)
      .eq("id", answeringQ.id)
      .select("id, answer_text, status, updated_at")
      .single();

    if (error) return alert(error.message);

    setEmployeeQuestions((prev) =>
      prev.map((q) =>
        q.id === data.id
          ? { ...q, answer: data.answer_text, status: data.status, updated_at: data.updated_at }
          : q
      )
    );
    setAnsweringQ(null);
    setAnswerText("");

    if (tab === "archive") {
      await loadAnsweredArchive();
    }
  };

  /** Move an answered item to the Archive (status → closed) */
  const moveToArchive = async (id) => {
    const { error } = await supabase
      .from("user_questions")
      .update({ status: "closed" })
      .eq("id", id)
      .select("id")
      .single();

    if (error) return alert(error.message);

    // Remove from employee list
    setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));

    // If the archive tab is open, refresh it
    if (tab === "archive") {
      await loadAnsweredArchive();
    }
  };

  /** Delete a question (Admin/Super Admin) */
  async function deleteQuestion(id) {
    const { error } = await supabase.from("user_questions").delete().eq("id", id);
    if (error) return alert(error.message);
    setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
    setAnsweredGroups((prev) =>
      prev.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) })).filter((g) => g.items.length)
    );
  }

  /* ---------- Answered Archive loaders ---------- */
  function groupByDay(rows) {
    const dayKey = (r) => (r.updated_at || r.created_at || "").slice(0, 10);
    const bucket = new Map();
    (rows || []).forEach((r) => {
      const k = dayKey(r);
      if (!bucket.has(k)) bucket.set(k, []);
      bucket.get(k).push(r);
    });
    const groups = Array.from(bucket.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          (b.updated_at || b.created_at || "").localeCompare(a.updated_at || a.created_at || "")
        ),
      }));
    return groups;
  }

  const loadAnsweredArchive = async () => {
    const { data, error } = await supabase
      .from("user_questions")
      .select(`
        id, question_text, answer_text, status, created_at, updated_at,
        users:user_id ( name, email )
      `)
      .eq("status", "closed")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setAnsweredGroups([]);
      return;
    }

    const rows = (data ?? []).map((r) => ({
      id: r.id,
      name: r.users?.name ?? "Employee",
      email: r.users?.email ?? "N/A",
      question: r.question_text,
      answer: r.answer_text,
      created_at: r.created_at,
      updated_at: r.updated_at,
    }));

    setAnsweredGroups(groupByDay(rows));
  };

  useEffect(() => {
    if (tab === "archive") loadAnsweredArchive();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  /* ---------- Render ---------- */
  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar role={roleId} active="manage-questions" />

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <span className="text-emerald-950 font-semibold">Admin Panel – Manage Questions</span>
        </div>

        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE QUESTIONS
        </div>

        <div className="flex gap-2 mb-6">
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
          <Tab label="Employee Questions" active={tab === "employee"} onClick={() => setTab("employee")} />
          <Tab label="Answered Archive" active={tab === "archive"} onClick={() => setTab("archive")} />
        </div>

        {tab === "faqs" && (
          <FaqsTab
            faqs={faqs}
            newQ={newQ}
            newA={newA}
            setNewQ={setNewQ}
            setNewA={setNewA}
            addFaq={addFaq}
            deleteFaq={deleteFaq}
            editingFaq={editingFaq}
            setEditingFaq={setEditingFaq}
            saveEditFaq={saveEditFaq}
          />
        )}

        {tab === "employee" && (
          <EmployeeQuestionsTab
            employeeQuestions={employeeQuestions}
            setAnsweringQ={setAnsweringQ}
            deleteQuestion={deleteQuestion}
            moveToArchive={moveToArchive}
          />
        )}

        {tab === "archive" && <AnsweredArchiveTab groups={answeredGroups} />}
      </div>

      {editingFaq && (
        <Modal title="Edit FAQ" onClose={() => setEditingFaq(null)} onSave={saveEditFaq}>
          <input
            type="text"
            value={editingFaq.question}
            onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
            className="w-full px-3 py-2 mb-3 rounded-md border border-emerald-700 bg-emerald-900/60 text-white"
          />
          <textarea
            value={editingFaq.answer}
            onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/60 text-white"
          />
        </Modal>
      )}

      {answeringQ && (
        <Modal
          title={`${answeringQ.status === "answered" ? "Edit answer" : "Answer"}: ${answeringQ.question}`}
          onClose={() => setAnsweringQ(null)}
          onSave={saveAnswer}
        >
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={4}
            placeholder="Type your answer here..."
            className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/60 text-white"
          />
          {answeringQ.status === "answered" && (
            <p className="mt-2 text-xs text-emerald-200/80">
              Tip: click <b>Move to Archive</b> on the table to mark this conversation as closed.
            </p>
          )}
        </Modal>
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function FaqsTab({ faqs, newQ, newA, setNewQ, setNewA, addFaq, deleteFaq, setEditingFaq }) {
  return (
    <div className="space-y-6">
      <div className="bg-emerald-900/90 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/60 space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <PlusCircle size={18} className="text-emerald-300" /> Add New FAQ
        </h3>
        <input
          type="text"
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Enter FAQ question"
          className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/40 text-white"
        />
        <textarea
          value={newA}
          onChange={(e) => setNewA(e.target.value)}
          placeholder="Enter FAQ answer"
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/40 text-white"
        />
        <button
          onClick={addFaq}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow hover:scale-105 transition"
        >
          Add FAQ
        </button>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-emerald-900/80 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/40"
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{faq.question}</h3>
                <p className="text-sm text-emerald-200/80 mt-1">{faq.answer}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFaq({ ...faq })}
                  className="p-2 rounded-md bg-emerald-700 hover:bg-emerald-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => deleteFaq(faq.id)}
                  className="p-2 rounded-md bg-red-600 hover:bg-red-500"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function EmployeeQuestionsTab({ employeeQuestions, setAnsweringQ, deleteQuestion, moveToArchive }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
      <table className="min-w-[760px] w-full border-collapse">
        <thead>
          <tr className="bg-emerald-900/95 text-left text-emerald-100">
            <Th>Employee</Th>
            <Th>Question</Th>
            <Th>Answer</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {employeeQuestions.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 italic text-gray-500">
                No employee questions yet.
              </td>
            </tr>
          ) : (
            employeeQuestions.map((q, idx) => (
              <tr
                key={q.id}
                className={`text-emerald-950 text-sm ${idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-emerald-300" />
                    <div className="flex flex-col">
                      <span className="font-medium">{q.name}</span>
                      <span className="text-xs text-gray-500">{q.email}</span>
                    </div>
                  </div>
                </td>

                <td className="px-4 py-3">{q.question}</td>

                <td className="px-4 py-3">
                  {q.answer ? (
                    <span className="text-emerald-700 font-medium">{q.answer}</span>
                  ) : (
                    <span className="text-gray-400 italic">No answer yet</span>
                  )}
                </td>

                <td className="px-4 py-3 flex flex-wrap gap-2">
                  {q.status === "open" && (
                    <button
                      onClick={() => {
                        setAnsweringQ(q);
                      }}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                    >
                      <MessageSquare size={14} /> Answer
                    </button>
                  )}

                  {q.status === "answered" && (
                    <>
                      <button
                        onClick={() => setAnsweringQ(q)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white"
                      >
                        <Pencil size={14} /> Edit
                      </button>

                      <button
                        onClick={() => moveToArchive(q.id)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-500 hover:bg-emerald-400 text-xs font-semibold text-white"
                      >
                        <Archive size={14} /> Move to Archive
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function AnsweredArchiveTab({ groups }) {
  if (!groups || groups.length === 0) {
    return (
      <div className="px-4 py-3 rounded-md bg-white border border-emerald-200 text-gray-600 italic">
        No answered questions yet.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groups.map(({ date, items }) => (
        <div key={date} className="rounded-xl border border-emerald-200 bg-white shadow">
          <div className="flex items-center gap-2 px-4 py-3 bg-emerald-900/95 text-emerald-100 rounded-t-xl">
            <Folder size={16} className="text-emerald-300" />
            <span className="font-semibold flex items-center gap-2">
              <CalendarDays size={16} /> {date}
            </span>
            <span className="ml-2 text-emerald-200/80 text-sm">({items.length})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse">
              <thead>
                <tr className="bg-emerald-800 text-left text-emerald-100">
                  <Th>Employee</Th>
                  <Th>Question</Th>
                  <Th>Answer</Th>
                  <Th>Closed At</Th>
                </tr>
              </thead>
              <tbody>
                {items.map((r, idx) => (
                  <tr
                    key={r.id}
                    className={`text-emerald-950 text-sm ${idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}`}
                  >
                    <td className="px-4 py-3">
                      {r.name} <span className="text-xs text-gray-500">({r.email})</span>
                    </td>
                    <td className="px-4 py-3">{r.question}</td>
                    <td className="px-4 py-3">{r.answer}</td>
                    <td className="px-4 py-3">
                      {(r.updated_at || r.created_at || "").slice(0, 19).replace("T", " ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- UI bits ---------- */

function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-emerald-950/95 text-white rounded-xl shadow-lg border border-emerald-700 backdrop-blur-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 p-2 rounded-full bg-emerald-700/50 hover:bg-emerald-600"
        >
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600/70 hover:bg-gray-500">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
      }`}
    >
      {label}
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold border-r border-emerald-800/50">{children}</th>;
}
