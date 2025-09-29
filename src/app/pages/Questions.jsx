import { useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { HelpCircle, Send, User, MessageSquare } from "lucide-react";

export default function Questions() {
  const [tab, setTab] = useState("faqs");

  // Dummy FAQs (replace with Supabase fetch)
  const [faqs] = useState([
    { id: 1, question: "How do I reset my password?", answer: "Go to your account settings and click reset password." },
    { id: 2, question: "Where can I find the employee handbook?", answer: "It is available under the 'Resources' section on the home page." },
    { id: 3, question: "What is the probation period?", answer: "The probation period is 3 months from your joining date." },
  ]);

  // Dummy user questions (replace with user-specific fetch)
  const [myQuestions, setMyQuestions] = useState([
    { id: 1, question: "Will there be training for the new software?", answer: null },
    { id: 2, question: "Can I take leave during probation?", answer: "Yes, but it needs manager approval." },
  ]);

  const [newQ, setNewQ] = useState("");

  const askQuestion = () => {
    if (!newQ.trim()) return;
    const newEntry = { id: myQuestions.length + 1, question: newQ, answer: null };
    setMyQuestions((prev) => [...prev, newEntry]);
    setNewQ("");
  };

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar role={ROLES.USER} active="questions" />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <span className="text-emerald-950 font-semibold">
            Questions & FAQs
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          QUESTIONS
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
          <Tab label="Ask Question" active={tab === "ask"} onClick={() => setTab("ask")} />
        </div>

        {/* Content */}
        {tab === "faqs" ? (
          <FaqsTab faqs={faqs} />
        ) : (
          <AskQuestionTab
            myQuestions={myQuestions}
            newQ={newQ}
            setNewQ={setNewQ}
            askQuestion={askQuestion}
          />
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */
function FaqsTab({ faqs }) {
  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div
          key={faq.id}
          className="bg-emerald-900/80 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/40"
        >
          <h3 className="font-bold flex items-center gap-2">
            <HelpCircle size={16} className="text-emerald-300" /> {faq.question}
          </h3>
          <p className="text-sm text-emerald-200/80 mt-1">{faq.answer}</p>
        </div>
      ))}
    </div>
  );
}

function AskQuestionTab({ myQuestions, newQ, setNewQ, askQuestion }) {
  return (
    <div className="space-y-6">
      {/* Ask form */}
      <div className="bg-emerald-900/90 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/60 space-y-3">
        <h3 className="font-bold flex items-center gap-2">
          <MessageSquare size={18} className="text-emerald-300" /> Ask a New Question
        </h3>
        <textarea
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Type your question here..."
          rows={3}
          className="w-full px-3 py-2 rounded-md border border-emerald-700 bg-emerald-900/40 text-white"
        />
        <button
          onClick={askQuestion}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow hover:scale-105 transition"
        >
          <Send size={16} className="inline mr-1" /> Submit
        </button>
      </div>

      {/* My Questions */}
      <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
        <table className="min-w-[500px] w-full border-collapse">
          <thead>
            <tr className="bg-emerald-900/95 text-left text-emerald-100">
              <Th>Question</Th>
              <Th>Answer</Th>
            </tr>
          </thead>
          <tbody>
            {myQuestions.map((q, idx) => (
              <tr
                key={q.id}
                className={`text-emerald-950 text-sm ${
                  idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                }`}
              >
                <td className="px-4 py-3">{q.question}</td>
                <td className="px-4 py-3">
                  {q.answer ? (
                    <span className="text-emerald-700 font-medium">{q.answer}</span>
                  ) : (
                    <span className="text-gray-400 italic">No answer yet</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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