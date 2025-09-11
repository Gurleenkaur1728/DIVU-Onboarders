import { useState } from "react";
import Sidebar, {ROLES} from "../../components/Sidebar.jsx";
import { Pencil, Trash2, User, PlusCircle, X, MessageSquare } from "lucide-react";

export default function ManageQuestions() {
  const [tab, setTab] = useState("faqs");
  const [faqs, setFaqs] = useState([
    { id: 1, question: "How do I reset my password?", answer: "Go to your account settings and click reset password." },
    { id: 2, question: "Where can I find the employee handbook?", answer: "It is available under the 'Resources' section on the home page." },
    { id: 3, question: "What is the probation period?", answer: "The probation period is 3 months from your joining date." },
  ]);

  const [employeeQuestions, setEmployeeQuestions] = useState([
    { id: 1, name: "John Doe", question: "Will there be training for the new software?", answer: null },
    { id: 2, name: "Jane Smith", question: "Can I take leave during probation?", answer: null },
    { id: 3, name: "Michael Lee", question: "Who should I contact for payroll issues?", answer: null },
  ]);

  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");
  const [editingFaq, setEditingFaq] = useState(null);

  // Answer modal state
  const [answeringQ, setAnsweringQ] = useState(null);
  const [answerText, setAnswerText] = useState("");

  /* ----- FAQ Functions ----- */
  const addFaq = () => {
    if (!newQ.trim() || !newA.trim()) return;
    const newFaq = { id: faqs.length + 1, question: newQ, answer: newA };
    setFaqs((prev) => [...prev, newFaq]);
    setNewQ(""); setNewA("");
  };

  const deleteFaq = (id) => setFaqs((prev) => prev.filter((f) => f.id !== id));

  const saveEditFaq = () => {
    if (editingFaq) {
      setFaqs((prev) => prev.map((f) => (f.id === editingFaq.id ? editingFaq : f)));
      setEditingFaq(null);
    }
  };

  /* ----- Employee Question Answer ----- */
  const saveAnswer = () => {
    if (answeringQ) {
      setEmployeeQuestions((prev) =>
        prev.map((q) => (q.id === answeringQ.id ? { ...q, answer: answerText } : q))
      );
      setAnsweringQ(null);
      setAnswerText("");
    }
  };

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar */}
      <Sidebar role={ROLES.ADMIN} active="manage-questions" />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <span className="text-emerald-950 font-semibold">
            Admin Panel – Manage Questions
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-950/90 rounded-md px-4 py-2 mb-6 text-white font-bold shadow">
          MANAGE QUESTIONS
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
          <Tab label="Employee Questions" active={tab === "employee"} onClick={() => setTab("employee")} />
        </div>

        {/* Content */}
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
          />
        )}
      </div>

      {/* Edit FAQ Modal */}
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

      {/* Answer Question Modal */}
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
function FaqsTab({ faqs, newQ, newA, setNewQ, setNewA, addFaq, deleteFaq, editingFaq, setEditingFaq, saveEditFaq }) {
  return (
    <div className="space-y-6">
      {/* Add new FAQ form */}
      <div className="bg-emerald-800/60 text-emerald-100 rounded-lg shadow p-4 space-y-3">
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

      {/* Existing FAQs */}
      <div className="space-y-4">
        {faqs.map((faq) => (
          <div key={faq.id} className="bg-emerald-800/40 text-emerald-100 rounded-lg shadow p-4">
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

function EmployeeQuestionsTab({ employeeQuestions, setAnsweringQ }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-emerald-800/50 shadow">
      <table className="min-w-[600px] w-full border-collapse">
        <thead>
          <tr className="bg-emerald-700/70 text-left text-emerald-50">
            <Th>Employee</Th>
            <Th>Question</Th>
            <Th>Answer</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {employeeQuestions.map((q, idx) => (
            <tr
              key={q.id}
              className={`text-emerald-100 text-sm ${
                idx % 2 === 0 ? "bg-emerald-800/40" : "bg-emerald-900/40"
              }`}
            >
              <td className="px-4 py-3 flex items-center gap-2">
                <User size={16} className="text-emerald-300" /> {q.name}
              </td>
              <td className="px-4 py-3">{q.question}</td>
              <td className="px-4 py-3">
                {q.answer ? (
                  <span className="text-emerald-300 font-medium">{q.answer}</span>
                ) : (
                  <span className="text-gray-400 italic">No answer yet</span>
                )}
              </td>
              <td className="px-4 py-3">
                <button
                  onClick={() => setAnsweringQ(q)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold"
                >
                  <MessageSquare size={14} /> Answer
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-gray-600/70 hover:bg-gray-500"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500"
          >
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
      className={`
        px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
        }
      `}
    >
      {label}
    </button>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold border-r border-emerald-800/50">
      {children}
    </th>
  );
}
