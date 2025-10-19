import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { HelpCircle, Send, MessageSquare } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function Questions() {
  const [tab, setTab] = useState("faqs");
  const [faqs, setFaqs] = useState([]);
  const [myQuestions, setMyQuestions] = useState([]);
  const [newQ, setNewQ] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);

  // Load FAQs (published) + my questions
  useEffect(() => {
    let ignore = false;

    async function load() {
      setNotice("");
      // FAQs
      const { data: fData, error: fErr } = await supabase
        .from("faqs")
        .select("id, question, answer, is_published, created_at")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (!ignore) {
        if (fErr) console.error(fErr);
        setFaqs(fData ?? []);
      }

      // who am I?
      const { data: auth } = await supabase.auth.getUser();
      const userId = auth?.user?.id ?? null;
      if (!userId) {
        if (!ignore) setNotice("You must be signed in to view your questions.");
        return;
      }

      // My questions
      const { data: qData, error: qErr } = await supabase
        .from("user_questions")
        .select("id, question_text, answer_text, status, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });

      if (!ignore) {
        if (qErr) console.error(qErr);
        setMyQuestions(
          (qData ?? []).map((r) => ({
            id: r.id,
            question: r.question_text,
            answer: r.answer_text,
            status: r.status,
          }))
        );
      }
    }

    load();

    // realtime for FAQs + my questions
    const ch1 = supabase
      .channel("faqs-public")
      .on("postgres_changes", { event: "*", schema: "public", table: "faqs" }, load)
      .subscribe();

    const ch2 = supabase
      .channel("uq-self")
      .on("postgres_changes", { event: "*", schema: "public", table: "user_questions" }, load)
      .subscribe();

    return () => {
      ignore = true;
      supabase.removeChannel(ch1);
      supabase.removeChannel(ch2);
    };
  }, []);

  // Create a new question
  const askQuestion = async () => {
    const text = newQ.trim();
    if (!text) return;

    setLoading(true);
    setNotice("");

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id ?? null;
    if (!userId) {
      setLoading(false);
      setNotice("You must be signed in to ask a question.");
      return;
    }

    const { data, error } = await supabase
      .from("user_questions")
      .insert({
        user_id: userId,
        question_text: text,
        status: "open",
      })
      .select("id, question_text, answer_text, status")
      .single();

    setLoading(false);

    if (error) {
      console.error(error);
      setNotice(error.message);
      return;
    }

    // realtime will also refresh
    setMyQuestions((prev) => [
      {
        id: data.id,
        question: data.question_text,
        answer: data.answer_text,
        status: data.status,
      },
      ...prev,
    ]);
    setNewQ("");
  };

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar role={ROLES.USER} active="questions" />

      <div className="flex-1 flex flex-col p-6">
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <span className="text-emerald-950 font-semibold">Questions & FAQs</span>
        </div>

        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          QUESTIONS
        </div>

        {notice && (
          <div className="mb-4 px-4 py-2 bg-emerald-50 text-emerald-900 border border-emerald-300 rounded">
            {notice}
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
          <Tab label="Ask Question" active={tab === "ask"} onClick={() => setTab("ask")} />
        </div>

        {tab === "faqs" ? (
          <FaqsTab faqs={faqs} />
        ) : (
          <AskQuestionTab
            myQuestions={myQuestions}
            newQ={newQ}
            setNewQ={setNewQ}
            askQuestion={askQuestion}
            loading={loading}
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
        <div key={faq.id} className="bg-emerald-900/80 text-emerald-100 rounded-lg shadow-lg p-4 border border-emerald-400/40">
          <h3 className="font-bold flex items-center gap-2">
            <HelpCircle size={16} className="text-emerald-300" /> {faq.question}
          </h3>
          <p className="text-sm text-emerald-200/80 mt-1">{faq.answer}</p>
        </div>
      ))}
      {faqs.length === 0 && <div className="text-emerald-100/90 italic">No FAQs yet.</div>}
    </div>
  );
}

function AskQuestionTab({ myQuestions, newQ, setNewQ, askQuestion, loading }) {
  return (
    <div className="space-y-6">
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
          disabled={loading}
          className="px-4 py-2 rounded-md bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold shadow hover:scale-105 transition disabled:opacity-50"
        >
          <Send size={16} className="inline mr-1" /> {loading ? "Submitting..." : "Submit"}
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
        <table className="min-w-[500px] w-full border-collapse" aria-label="My questions">
          <thead>
            <tr className="bg-emerald-900/95 text-left text-emerald-100">
              <Th>Question</Th>
              <Th>Answer</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {myQuestions.map((q, idx) => (
              <tr key={q.id} className={`text-emerald-950 text-sm ${idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}`}>
                <td className="px-4 py-3">{q.question}</td>
                <td className="px-4 py-3">
                  {q.answer ? <span className="text-emerald-700 font-medium">{q.answer}</span> : <span className="text-gray-400 italic">No answer yet</span>}
                </td>
                <td className="px-4 py-3">{q.status ?? "-"}</td>
              </tr>
            ))}
            {myQuestions.length === 0 && (
              <tr>
                <td className="px-4 py-3 text-gray-500 italic" colSpan={3}>
                  You haven’t asked anything yet.
                </td>
              </tr>
            )}
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
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-300 ${
        active ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105" : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
      }`}
    >
      {label}
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold border-r border-emerald-800/50">{children}</th>;
}
