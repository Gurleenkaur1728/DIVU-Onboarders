import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Pencil, Trash2, User, PlusCircle, X, MessageSquare } from "lucide-react";
import { supabase } from "../../../src/lib/supabaseClient";

export default function ManageQuestions() {
  // detect role for sidebar (doesn't affect RLS)
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });
  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [tab, setTab] = useState("employee");

  // ---- FAQs state ----
  const [faqs, setFaqs] = useState([]);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingFaq, setEditingFaq] = useState(null);

  // ---- Employee questions state ----
  const [employeeQuestions, setEmployeeQuestions] = useState([]);
  const [answeringQ, setAnsweringQ] = useState(null);
  const [answerText, setAnswerText] = useState("");

  /* ================= FAQs ================ */
  useEffect(() => {
    let ignore = false;

    const loadFaqs = async () => {
      const { data, error } = await supabase
        .from("faqs")
        .select("id, question, answer, is_published, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) console.error(error);
      if (!ignore) setFaqs(data ?? []);
    };

    loadFaqs();

    const ch = supabase
      .channel("faqs-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "faqs" },
        loadFaqs
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

  /* ============== Employee Questions ============== */
  useEffect(() => {
    let ignore = false;

    const load = async () => {
      // joins users via foreignTable to show name/email
      const { data, error } = await supabase
        .from("user_questions")
        .select(`
          id,
          question_text,
          answer_text,
          status,
          created_at,
          answered_by,
          users:user_id (
            name,
            email
          )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        if (!ignore) setEmployeeQuestions([]);
        return;
      }

      if (!ignore) {
        setEmployeeQuestions(
          (data ?? []).map((r) => ({
            id: r.id,
            name: r.users?.name ?? "Employee",
            email: r.users?.email ?? "",
            question: r.question_text,
            answer: r.answer_text,
            status: r.status,
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
        load
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      ignore = true;
    };
  }, []);

  const saveAnswer = async () => {
    if (!answeringQ) return;

    const { data: auth } = await supabase.auth.getUser();
    const payload = {
      answer_text: answerText.trim(),
      status: "answered",
      answered_by: auth?.user?.id ?? null, // safe if session missing
    };

    const { data, error } = await supabase
      .from("user_questions")
      .update(payload)
      .eq("id", answeringQ.id)
      .select("id, answer_text, status")
      .single();

    if (error) return alert(error.message);

    // local update; realtime will also refresh
    setEmployeeQuestions((prev) =>
      prev.map((q) =>
        q.id === data.id ? { ...q, answer: data.answer_text, status: data.status } : q
      )
    );
    setAnswerText("");
    setAnsweringQ(null);
  };

  const deleteQuestion = async (id) => {
    const ok = confirm("Delete this question?");
    if (!ok) return;
    const { error } = await supabase.from("user_questions").delete().eq("id", id);
    if (error) return alert(error.message);
    setEmployeeQuestions((prev) => prev.filter((q) => q.id !== id));
  };

  /* ================= Render ================= */
  return (
    <div className="flex min-h-dvh bg-cover bg-center" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar role={role} active="manage-questions" />

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
        </div>

        {tab === "faqs" ? (
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
        ) : (
          <EmployeeQuestionsTab
            employeeQuestions={employeeQuestions}
            setAnsweringQ={setAnsweringQ}
            deleteQuestion={deleteQuestion}
          />
        )}
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
        <Modal title={`Answer: ${answeringQ.question}`} onClose={() => setAnsweringQ(null)} onSave={saveAnswer}>
          <textarea
            value={answerText}
            onChange={(e) => setAnswerText(e.target.value)}
            rows={4}
            placeholder="Type your answer here..."
            className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/60 text-white"
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */
function FaqsTab({
  faqs, newQ, newA, setNewQ, setNewA, addFaq, deleteFaq, setEditingFaq,
}) {
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
          <div key={faq.id} className="bg-emerald-900/80 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/40">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-bold">{faq.question}</h3>
                <p className="text-sm text-emerald-200/80 mt-1">{faq.answer}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEditingFaq({ ...faq })} className="p-2 rounded-md bg-emerald-700 hover:bg-emerald-600">
                  <Pencil size={16} />
                </button>
                <button onClick={() => deleteFaq(faq.id)} className="p-2 rounded-md bg-red-600 hover:bg-red-500">
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

function EmployeeQuestionsTab({ employeeQuestions, setAnsweringQ, deleteQuestion }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
      <table className="min-w-[700px] w-full border-collapse">
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
            <tr><td className="px-4 py-4 text-gray-500 italic" colSpan={4}>No employee questions yet.</td></tr>
          ) : employeeQuestions.map((q, idx) => (
            <tr key={q.id} className={`text-emerald-950 text-sm ${idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}`}>
              <td className="px-4 py-3 flex items-center gap-2">
                <User size={16} className="text-emerald-300" />
                <div className="leading-tight">
                  <div className="font-medium">{q.name}</div>
                  <div className="text-xs text-gray-500">{q.email}</div>
                </div>
              </td>
              <td className="px-4 py-3">{q.question}</td>
              <td className="px-4 py-3">
                {q.answer ? <span className="text-emerald-700 font-medium">{q.answer}</span> : <span className="text-gray-400 italic">No answer yet</span>}
              </td>
              <td className="px-4 py-3 flex gap-2">
                <button
                  onClick={() => setAnsweringQ(q)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white"
                >
                  <MessageSquare size={14} /> Answer
                </button>
                <button
                  onClick={() => deleteQuestion(q.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-600 hover:bg-red-500 text-xs font-semibold text-white"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- tiny bits ---------- */
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
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-gray-600/70 hover:bg-gray-500">Cancel</button>
          <button onClick={onSave} className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500">Save</button>
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
