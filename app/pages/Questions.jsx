import { useEffect, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { HelpCircle, Send, MessageSquare } from "lucide-react";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
 
export default function Questions() {
  const { user, loading: authLoading } = useAuth();
  const { roleId } = useRole();
  const [tab, setTab] = useState("faqs");
  const [faqs, setFaqs] = useState([]);
  const [myQuestions, setMyQuestions] = useState([]);
  const [newQ, setNewQ] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
 
  // Load FAQs (published) + my questions
  useEffect(() => {
    const load = async () => {
      setNotice("");
     
      // Load FAQs from database
      try {
        const { data: faqData, error: faqError } = await supabase
          .from("faqs")
          .select("id, question, answer")
          .eq("is_published", true)
          .order("created_at", { ascending: false });
 
        if (faqError) {
          console.error("FAQ Error:", faqError);
        } else {
          setFaqs(faqData || []);
        }
      } catch (error) {
        console.error("Error loading FAQs:", error);
      }
 
      // Load my questions from database
      const profileId = user?.profile_id;
      if (!profileId) {
        setNotice("You must be signed in to view your questions.");
        return;
      }
 
      try {
        const { data: questionData, error: questionError } = await supabase
          .from("user_questions")
          .select("employee_id, question_text, answer_text, status, created_at")
          .eq("employee_id", profileId)
          .order("created_at", { ascending: false });
 
        if (questionError) {
          console.error("Questions Error:", questionError);
          setNotice("Failed to load your questions.");
        } else {
          const formattedQuestions = (questionData || []).map(q => ({
            id: q.employee_id,
            question: q.question_text,
            answer: q.answer_text,
            status: q.status,
            created_at: q.created_at
          }));
          setMyQuestions(formattedQuestions);
        }
      } catch (error) {
        console.error("Error loading questions:", error);
        setNotice("Failed to load your questions.");
      }
    };
 
    if (user) {
      load();
    }
  }, [user]);
 
  // Wait for auth to load before showing content
  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Create a new question
  const askQuestion = async () => {
    const text = newQ.trim();
    if (!text) return;

    setLoading(true);
    setNotice("");

    const profileId = user?.profile_id;
    if (!profileId) {
      setLoading(false);
      setNotice("You must be signed in to ask a question.");
      return;
    }

    try {
      // Insert question into database
      const { data, error } = await supabase
        .from("user_questions")
        .insert({
          employee_id: profileId,
          question_text: text,
          status: "open"
        })
        .select("employee_id, question_text, answer_text, status, created_at")
        .single();
 
      if (error) {
        console.error("Insert Error:", error);
        setNotice("Failed to save question. Please try again.");
      } else {
        // Add to local state
        const newQuestion = {
          id: data.id,
          question: data.question_text,
          answer: data.answer_text,
          status: data.status,
          created_at: data.created_at
        };
       
        setMyQuestions(prev => [newQuestion, ...prev]);
        setNewQ("");
        setNotice("Question submitted successfully!");
       
        // Clear success message after 3 seconds
        setTimeout(() => setNotice(""), 3000);
      }
    } catch (error) {
      console.error("Error submitting question:", error);
      setNotice("Failed to save question. Please try again.");
    } finally {
      setLoading(false);
    }
  };
 
  return (
    <AppLayout>
      <div className="bg-white min-h-screen p-8">
        {/* Header */}
        <h1 className="text-3xl font-bold text-emerald-950 mb-6">Questions & FAQs</h1>
 
        {notice && (
          <div className="mb-6 px-4 py-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-lg">
            {notice}
          </div>
        )}
 
        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="FAQs" active={tab === "faqs"} onClick={() => setTab("faqs")} />
          <Tab label="Ask Question" active={tab === "ask"} onClick={() => setTab("ask")} />
        </div>
 
        {/* Tabs Content */}
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
    </AppLayout>
  );
}
 
/* ---------- Subcomponents ---------- */
function FaqsTab({ faqs }) {
  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div
          key={faq.id}
          className="bg-white border border-gray-200 rounded-lg shadow-sm p-5 hover:shadow-md transition-shadow"
        >
          <h3 className="font-semibold flex items-center gap-2 text-gray-900 text-lg">
            <HelpCircle size={18} className="text-emerald-600" /> {faq.question}
          </h3>
          <p className="text-gray-700 mt-3 leading-relaxed">
            {faq.answer || <span className="italic text-gray-400">No answer yet.</span>}
          </p>
        </div>
      ))}
      {faqs.length === 0 && (
        <div className="text-gray-500 italic text-center py-8">No FAQs yet.</div>
      )}
    </div>
  );
}
 
function AskQuestionTab({ myQuestions, newQ, setNewQ, askQuestion, loading }) {
  return (
    <div className="space-y-6">
      <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
        <h3 className="font-semibold flex items-center gap-2 text-gray-900 text-lg mb-4">
          <MessageSquare size={18} className="text-emerald-600" /> Ask a New Question
        </h3>
        <textarea
          value={newQ}
          onChange={(e) => setNewQ(e.target.value)}
          placeholder="Type your question here..."
          rows={4}
          className="w-full px-4 py-3 rounded-lg border border-gray-300 text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none"
        />
        <button
          onClick={askQuestion}
          disabled={loading}
          className="mt-3 px-6 py-2 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
        >
          <Send size={16} className="inline mr-2" /> {loading ? "Submitting..." : "Submit Question"}
        </button>
      </div>
 
      <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg shadow-sm">
        <table className="min-w-[500px] w-full border-collapse text-sm md:text-base" aria-label="My questions">
          <thead>
            <tr className="bg-emerald-800 text-left text-white">
              <Th>Question</Th>
              <Th>Answer</Th>
              <Th>Status</Th>
            </tr>
          </thead>
          <tbody>
            {myQuestions.map((q, idx) => (
              <tr
                key={q.id}
                className={`text-emerald-950 ${
                  idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                } hover:bg-emerald-200/60 transition-colors duration-200`}
              >
                <td className="px-4 py-3">{q.question}</td>
                <td className="px-4 py-3">
                  {q.answer ? (
                    <span className="text-emerald-700 font-medium">{q.answer}</span>
                  ) : (
                    <span className="text-gray-400 italic">No answer yet</span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize">{q.status ?? "-"}</td>
              </tr>
            ))}
            {myQuestions.length === 0 && (
              <tr>
                <td className="px-4 py-4 text-gray-500 italic text-center" colSpan={3}>
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
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-emerald-600 ${
        active
          ? "bg-emerald-600 text-white shadow-sm"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
 
function Th({ children }) {
  return (
    <th className="px-4 py-3 font-semibold text-gray-700">{children}</th>
  );
}
 