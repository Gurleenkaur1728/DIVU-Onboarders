import { useEffect, useMemo, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Folder,
  CalendarDays,
  X,
  Send,
} from "lucide-react";

/**
 * Admin – Manage Questions
 * - Employee tab: view OPEN/ANSWERED questions, answer, close, delete
 * - Archive tab: view CLOSED questions grouped by day
 * - FAQs tab: simple CRUD for FAQs
 *
 * NOTE: We DO NOT use an implicit foreign table join.
 * `employee_id` is TEXT in user_questions, so we:
 *   1) fetch questions
 *   2) collect employee_ids
 *   3) fetch users IN that set
 *   4) map locally
 */

export default function ManageQuestions() {
  const [tab, setTab] = useState("employee"); // "employee" | "archive" | "faqs"

  // role for Sidebar
  const roleId = useMemo(() => {
    const rid = Number(localStorage.getItem("role_id") || 0);
    return [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(rid) ? rid : ROLES.ADMIN;
  }, []);

  // FAQs state
  const [faqs, setFaqs] = useState([]);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingFaq, setEditingFaq] = useState(null);

  // Employee Qs state
  const [employeeQuestions, setEmployeeQuestions] = useState([]);
  const [answeringQ, setAnsweringQ] = useState(null);
  const [answerText, setAnswerText] = useState("");

  // Archive
  const [answeredGroups, setAnsweredGroups] = useState([]);

  /* ========== Helpers ========== */
  function mapUsers(rows, usersById) {
    return (rows || []).map((r) => {
      const u = usersById.get(String(r.employee_id)) || {};
      return {
        id: r.id,
        employee_id: r.employee_id,
        name: u.name || "Employee",
        email: u.email || "N/A",
        question: r.question_text,
        answer: r.answer_text,
        status: r.status,
        created_at: r.created_at,
        updated_at: r.updated_at,
      };
    });
  }

  function groupByDay(rows) {
    const dayKey = (r) => (r.updated_at || r.created_at || "").slice(0, 10);
    const bucket = new Map();
    (rows || []).forEach((r) => {
      const k = dayKey(r);
      if (!bucket.has(k)) bucket.set(k, []);
      bucket.get(k).push(r);
    });
    return Array.from(bucket.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => ({
        date,
        items: items.sort((a, b) =>
          (b.updated_at || b.created_at || "").localeCompare(
            a.updated_at || a.created_at || ""
          )
        ),
      }));
  }

  async function fetchUsersForEmployeeIds(employeeIds) {
    const ids = [...new Set((employeeIds || []).filter(Boolean).map(String))];
    if (!ids.length) return new Map();
    const { data, error } = await supabase
      .from("users")
      .select("id, name, email")
      .in("id", ids);
    if (error) {
      console.error(error);
      return new Map();
    }
    const m = new Map();
    (data || []).forEach((u) => m.set(String(u.id), u));
    return m;
  }

  /* ========== Loaders ========== */
  const loadEmployeeQuestions = async () => {
    // show open or answered (still active)
    const { data, error } = await supabase
      .from("user_questions")
      .select("id, employee_id, question_text, answer_text, status, created_at, updated_at")
      .in("status", ["open", "answered"])
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setEmployeeQuestions([]);
      return;
    }

    const usersById = await fetchUsersForEmployeeIds(
      (data || []).map((r) => r.employee_id)
    );
    setEmployeeQuestions(mapUsers(data, usersById));
  };

  const loadAnsweredArchive = async () => {
    const { data, error } = await supabase
      .from("user_questions")
      .select(
        "id, employee_id, question_text, answer_text, status, created_at, updated_at"
      )
      .eq("status", "closed")
      .order("updated_at", { ascending: false })
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setAnsweredGroups([]);
      return;
    }
    const usersById = await fetchUsersForEmployeeIds(
      (data || []).map((r) => r.employee_id)
    );
    const rows = mapUsers(data, usersById);
    setAnsweredGroups(groupByDay(rows));
  };

  const loadFaqs = async () => {
    const { data, error } = await supabase
      .from("faqs")
      .select("id, question, answer, is_published, created_at")
      .order("created_at", { ascending: false });
    if (error) {
      console.error(error);
      setFaqs([]);
      return;
    }
    setFaqs(data || []);
  };

  // initial + on tab switch
  useEffect(() => {
    if (tab === "employee") loadEmployeeQuestions();
    if (tab === "archive") loadAnsweredArchive();
    if (tab === "faqs") loadFaqs();

    // realtime refetch on changes
    const ch = supabase
      .channel("manage-questions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_questions" },
        () => {
          if (tab === "employee") loadEmployeeQuestions();
          if (tab === "archive") loadAnsweredArchive();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faqs" },
        () => tab === "faqs" && loadFaqs()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [tab]);

  /* ========== Employee actions ========== */
  const saveAnswer = async () => {
    if (!answeringQ) return;
    const id = answeringQ.id;
    const adminId = localStorage.getItem("profile_id") || null;

    const { error } = await supabase
      .from("user_questions")
      .update({
        answer_text: answerText.trim(),
        status: "answered",
        answered_by: adminId,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return alert(error.message);

    // optimistic UI
    setEmployeeQuestions((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, answer: answerText.trim(), status: "answered" } : r
      )
    );
    setAnsweringQ(null);
    setAnswerText("");
  };

  const moveToArchive = async (id) => {
    const { error } = await supabase
      .from("user_questions")
      .update({ status: "closed", updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return alert(error.message);
    setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
    // archive list will refresh via realtime/loader when the tab is opened
  };

  const deleteQuestion = async (id) => {
    if (!confirm("Delete this question?")) return;
    const { error } = await supabase.from("user_questions").delete().eq("id", id);
    if (error) return alert(error.message);
    setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
    setAnsweredGroups((prev) =>
      prev.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) })).filter((g) => g.items.length)
    );
  };

  /* ========== FAQ actions ========== */
  const addFaq = async () => {
    const q = newQ.trim();
    const a = newA.trim();
    if (!q || !a) return;

    const { data, error } = await supabase
      .from("faqs")
      .insert({ question: q, answer: a, is_published: true })
      .select("id, question, answer, is_published, created_at")
      .single();

    if (error) return alert(error.message);
    setFaqs((prev) => [data, ...prev]);
    setNewQ("");
    setNewA("");
  };

  const saveEditFaq = async () => {
    if (!editingFaq) return;
    const { id, question, answer } = editingFaq;
    const { error } = await supabase
      .from("faqs")
      .update({ question, answer })
      .eq("id", id);
    if (error) return alert(error.message);
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, question, answer } : f)));
    setEditingFaq(null);
  };

  const deleteFaq = async (id) => {
    if (!confirm("Delete this FAQ?")) return;
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) return alert(error.message);
    setFaqs((prev) => prev.filter((f) => f.id !== id));
  };

  /* ========== Render ========== */
  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={roleId} active="manage-questions" />

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <span className="text-emerald-950 font-semibold">
            Admin Panel – Manage Questions
          </span>
        </div>

        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE QUESTIONS
        </div>

        <div className="flex gap-2 mb-6">
          <Tab label="Employee Questions" active={tab === "employee"} onClick={() => setTab("employee")} />
          <Tab label="Answered Archive" active={tab === "archive"} onClick={() => setTab("archive")} />
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
        </div>

        {tab === "employee" && (
          <EmployeeQuestionsTab
            employeeQuestions={employeeQuestions}
            onAnswer={(row) => {
              setAnsweringQ(row);
              setAnswerText(row.answer || "");
            }}
            onCloseQuestion={moveToArchive}
            onDeleteQuestion={deleteQuestion}
          />
        )}

        {tab === "archive" && <AnsweredArchiveTab groups={answeredGroups} />}

        {tab === "faqs" && (
          <FaqsTab
            faqs={faqs}
            newQ={newQ}
            newA={newA}
            setNewQ={setNewQ}
            setNewA={setNewA}
            addFaq={addFaq}
            deleteFaq={deleteFaq}
            setEditingFaq={setEditingFaq}
          />
        )}
      </div>

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
            placeholder="Type your answer here…"
            className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/60 text-white"
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */

function EmployeeQuestionsTab({ employeeQuestions, onAnswer, onCloseQuestion, onDeleteQuestion }) {
  if ((employeeQuestions || []).length === 0) {
    return (
      <div className="px-4 py-3 rounded-md bg-white border border-emerald-200 text-gray-600 italic">
        No employee questions yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
      <table className="min-w-[720px] w-full border-collapse" aria-label="Employee Questions">
        <thead>
          <tr className="bg-emerald-900/95 text-left text-emerald-100">
            <Th>Employee</Th>
            <Th>Question</Th>
            <Th>Answer</Th>
            <Th>Status</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {employeeQuestions.map((r, idx) => (
            <tr
              key={r.id}
              className={`text-emerald-950 text-sm ${
                idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
              }`}
            >
              <td className="px-4 py-3">
                {r.name} <span className="text-xs text-gray-500">({r.email})</span>
              </td>
              <td className="px-4 py-3">{r.question}</td>
              <td className="px-4 py-3">{r.answer || <i className="text-gray-400">—</i>}</td>
              <td className="px-4 py-3">{r.status}</td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  <button
                    onClick={() => onAnswer(r)}
                    className="px-2 py-1 rounded-md bg-emerald-700 text-white hover:bg-emerald-600"
                    title="Answer / Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onCloseQuestion(r.id)}
                    className="px-2 py-1 rounded-md bg-blue-700 text-white hover:bg-blue-600"
                    title="Move to archive (close)"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(r.id)}
                    className="px-2 py-1 rounded-md bg-red-600 text-white hover:bg-red-500"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </td>
            </tr>
          ))}
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
                    className={`text-emerald-950 text-sm ${
                      idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                    }`}
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
function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-emerald-950/95 text-white rounded-xl shadow-lg border border-emerald-700 backdrop-blur-xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full bg-emerald-700/50 hover:bg-emerald-600">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold mb-4">{title}</h2>
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600/70 hover:bg-gray-500">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 flex items-center gap-2">
            <Send size={16} /> Save
          </button>
        </div>
      </div>
    </div>
  );
}
