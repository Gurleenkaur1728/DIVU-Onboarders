import { useEffect, useState, useCallback } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useToast } from "../../context/ToastContext.jsx";
import {
  PlusCircle,
  Pencil,
  Trash2,
  Folder,
  CalendarDays,
  X,
  Send,
  Archive,
} from "lucide-react";


export default function ManageQuestions() {
  const [tab, setTab] = useState("employee"); // "employee" | "archive" | "faqs"
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
  
  // Toast and confirmModal
  const [confirmModal, setConfirmModal] = useState({ show: false, message: "", onConfirm: null });
  
  const { showToast } = useToast();

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
  const loadEmployeeQuestions = useCallback(async () => {
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
  }, []);

  const loadAnsweredArchive = useCallback(async () => {
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
  }, []);

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
  }, [tab, loadEmployeeQuestions, loadAnsweredArchive]);

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

    if (error) {
      showToast('Error: ' + error.message, 'error');
      return;
    }

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
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to move this question to archive?',
      onConfirm: async () => {
        const { error } = await supabase
          .from("user_questions")
          .update({ status: "closed", updated_at: new Date().toISOString() })
          .eq("id", id);
        if (error) {
          showToast('Error: ' + error.message, 'error');
        } else {
          setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
          showToast('Question moved to archive', 'success');
        }
        setConfirmModal({ show: false, message: "", onConfirm: null });
      }
    });
    // archive list will refresh via realtime/loader when the tab is opened
  };

  const deleteQuestion = async (id) => {
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to delete this question?',
      onConfirm: async () => {
        const { error } = await supabase.from("user_questions").delete().eq("id", id);
        if (error) {
          showToast('Error: ' + error.message, 'error');
        } else {
          setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
          setAnsweredGroups((prev) =>
            prev.map((g) => ({ ...g, items: g.items.filter((i) => i.id !== id) })).filter((g) => g.items.length)
          );
          showToast('Question deleted successfully', 'success');
        }
        setConfirmModal({ show: false, message: "", onConfirm: null });
      }
    });
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

    if (error) {
      showToast('Error: ' + error.message, 'error');
      return;
    }
    setFaqs((prev) => [data, ...prev]);
    setNewQ("");
    setNewA("");
    showToast('FAQ added successfully', 'success');
  };

  const saveEditFaq = async () => {
    if (!editingFaq) return;
    const { id, question, answer } = editingFaq;
    const { error } = await supabase
      .from("faqs")
      .update({ question, answer })
      .eq("id", id);
    if (error) {
      showToast('Error: ' + error.message, 'error');
      return;
    }
    setFaqs((prev) => prev.map((f) => (f.id === id ? { ...f, question, answer } : f)));
    setEditingFaq(null);
    showToast('FAQ updated successfully', 'success');
  };

  const deleteFaq = async (id) => {
    setConfirmModal({
      show: true,
      message: 'Are you sure you want to delete this FAQ?',
      onConfirm: async () => {
        const { error } = await supabase.from("faqs").delete().eq("id", id);
        if (error) {
          showToast('Error: ' + error.message, 'error');
        } else {
          setFaqs((prev) => prev.filter((f) => f.id !== id));
          showToast('FAQ deleted successfully', 'success');
        }
        setConfirmModal({ show: false, message: "", onConfirm: null });
      }
    });
  };

  /* ========== Render ========== */
  return (
    <AppLayout>
      <div className="flex-1 min-h-dvh p-6 space-y-6">
        <div
          className="
            mb-6 px-6 py-4 rounded-lg border shadow-sm
            flex flex-col gap-4 md:flex-row md:items-center md:justify-between transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          {/* LEFT — TITLE */}
          <div>
            <h1 className="text-2xl font-bold">
              Manage Questions
            </h1>
            <p className="text-gray-600 dark:text-gray-300">
              Review, answer, archive, and manage employee questions and FAQs
            </p>
          </div>

          {/* RIGHT — TABS */}
          <div className="flex items-center gap-2">
            <HeaderTab
              label="Employee"
              active={tab === "employee"}
              onClick={() => setTab("employee")}
            />
            <HeaderTab
              label="Archive"
              active={tab === "archive"}
              onClick={() => setTab("archive")}
            />
            <HeaderTab
              label="FAQs"
              active={tab === "faqs"}
              onClick={() => setTab("faqs")}
            />
          </div>
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
            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-black"
          />
        </Modal>
      )}

      {editingFaq && (
      <Modal
        title="Edit FAQ"
        onClose={() => setEditingFaq(null)}
        onSave={saveEditFaq}
      >
        <label className="block mb-1 text-sm font-medium text-gray-900">
          Question
        </label>
        <input
          type="text"
          value={editingFaq.question}
          onChange={(e) =>
            setEditingFaq({ ...editingFaq, question: e.target.value })
          }
          className="
            w-full mb-4 px-3 py-2 rounded-lg border border-gray-300
            bg-white  dark:border-black text-black
          "
        />

        <label className="block mb-1 text-sm font-medium text-gray-900">
          Answer
        </label>
        <textarea
          rows={4}
          value={editingFaq.answer}
          onChange={(e) =>
            setEditingFaq({ ...editingFaq, answer: e.target.value })
          }
          className="
            w-full mb-4 px-3 py-2 rounded-lg border border-gray-300
            bg-white  dark:border-black text-black
            focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500
          "
        />
      </Modal>
    )}


      {/* Confirmation Modal */}
      {confirmModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Action</h3>
              <p className="text-gray-700 mb-6">{confirmModal.message}</p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setConfirmModal({ show: false, message: "", onConfirm: null })}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmModal.onConfirm}
                  className={`px-4 py-2 rounded-lg text-white transition-colors ${
                    confirmModal.message.includes('archive') 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {confirmModal.message.includes('archive') ? 'Archive' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

/* ---------- Subcomponents ---------- */

function HeaderTab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-md text-sm font-medium border transition
        ${
          active
            ? "bg-DivuDarkGreen text-white border-DivuDarkGreen"
            : "bg-transparent border-gray-400 text-gray-700 dark:text-gray-200 hover:bg-DivuBlue"
        }
      `}
    >
      {label}
    </button>
  );
}


function EmployeeQuestionsTab({ employeeQuestions, onAnswer, onCloseQuestion, onDeleteQuestion }) {
  if ((employeeQuestions || []).length === 0) {
    return (
      <div className="px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-600 italic">
        No employee questions yet.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200 shadow-sm bg-black/20">
      <table className="min-w-[720px] w-full border-collapse" aria-label="Employee Questions">
        <thead>
          <tr className="bg-gray-100 text-left  dark:bg-DivuBlue/20">
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
              className={`text-gray-900 text-sm ${
                idx % 2 === 0 ? "bg-white" : "bg-gray-50"
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
                    className="p-1.5 rounded hover:bg-gray-100 text-emerald-600"
                    title="Answer / Edit"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => onCloseQuestion(r.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-gray-600"
                    title="Move to archive"
                  >
                    <Archive size={16} />
                  </button>
                  <button
                    onClick={() => onDeleteQuestion(r.id)}
                    className="p-1.5 rounded hover:bg-gray-100 text-red-600"
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
      <div className="px-4 py-3 rounded-lg bg-white border border-gray-200 text-gray-600 italic">
        No answered questions yet.
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {groups.map(({ date, items }) => (
        <div key={date} className="rounded-lg border border-gray-200 bg-white shadow-sm dark:bg-black/20">
          <div className="flex items-center gap-2 px-4 py-3 bg-gray-100 dark:bg-DivuBlue/20
          border-b border-gray-200">
            <CalendarDays size={16} className="text-emerald-600" />
            <span className="font-semibold ">{date}</span>
            <span className="ml-2 text-gray-500 text-sm">({items.length} {items.length === 1 ? 'question' : 'questions'})</span>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[640px] w-full border-collapse">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-900">
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
                    className={`text-gray-900 text-sm ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <td className="px-4 py-3">
                      {r.name} <span className="text-xs text-gray-500">({r.email})</span>
                    </td>
                    <td className="px-4 py-3">{r.question}</td>
                    <td className="px-4 py-3 text-gray-700">{r.answer}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {new Date(r.updated_at || r.created_at).toLocaleString()}
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
      <div className="bg-white dark:bg-black/50
       rounded-lg shadow-sm border border-gray-200 p-6 space-y-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <PlusCircle size={18} className="text-emerald-600" /> Add New FAQ
        </h3>
        <input
          type="text"
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Enter FAQ question"
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 bg-transparent" 
        />
        <textarea
          value={newA}
          onChange={(e) => setNewA(e.target.value)}
          placeholder="Enter FAQ answer"
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-black"
        />
        <button
          onClick={addFaq}
          className="px-4 py-2 rounded-lg bg-DivuDarkGreen
           text-white font-semibold hover:bg-DivuLightGreen hover:text-black
            transition-colors"
        >
          Add FAQ
        </button>
      </div>

      <div className="space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.id}
            className="bg-white rounded-lg shadow-sm p-4 border border-gray-200 hover:border-emerald-300 transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h3 className="font-bold text-gray-900">{faq.question}</h3>
                <p className="text-sm text-gray-600 mt-1">{faq.answer}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setEditingFaq({ ...faq })}
                  className="p-1.5 rounded hover:bg-gray-100 text-emerald-600"
                >
                  <Pencil size={16} />
                </button>
                <button
                  onClick={() => deleteFaq(faq.id)}
                  className="p-1.5 rounded hover:bg-gray-100 text-red-600"
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

function Th({ children }) {
  return <th className="px-4 py-3 font-semibold  border-r dark:border-black/50
  ">{children}</th>;
}
function Modal({ title, onClose, onSave, children }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-xl p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-3 p-2 rounded-full hover:bg-gray-100">
          <X size={18} />
        </button>
        <h2 className="text-lg font-bold text-gray-900 mb-4">{title}</h2>
        {children}
        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200">
            Cancel
          </button>
          <button onClick={onSave} className="px-4 py-2 rounded-lg bg-DivuDarkGreen
           text-white hover:bg-DivuLightGreen flex items-center gap-2 hover:text-black
           ">
            <Send size={16} /> Save
          </button>
        </div>
      </div>
      
    </div>

    

  );
}
