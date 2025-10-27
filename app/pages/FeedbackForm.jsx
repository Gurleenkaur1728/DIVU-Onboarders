import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function FeedbackForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [itemUUID, setItemUUID] = useState(null);
  const [formData, setFormData] = useState({
    clarity: "",
    difficulty: "",
    relevance: "",
    challenges: "",
    suggestions: "",
  });

  // ✅ Fetch UUID for this module if numeric
  useEffect(() => {
    const fetchItemUUID = async () => {
      if (id && id.includes("-")) {
        setItemUUID(id);
        return;
      }

      const { data, error } = await supabase
        .from("checklist_item")
        .select("item_id")
        .limit(1);

      if (!error && data?.length > 0) setItemUUID(data[0].item_id);
      else if (error) console.error("Error fetching checklist_item:", error);
    };
    fetchItemUUID();
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      alert("⚠️ You must be logged in to submit feedback.");
      setLoading(false);
      return;
    }

    if (!itemUUID) {
      alert("❌ Could not find matching module item UUID. Please try again.");
      setLoading(false);
      return;
    }

    const newFeedback = {
      item_id: itemUUID,
      user_id: user.id,
      clarity: parseInt(formData.clarity) || null,
      difficulty: parseInt(formData.difficulty) || null,
      relevance: parseInt(formData.relevance) || null,
      challenges: formData.challenges?.trim() || null,
      suggestions: formData.suggestions?.trim() || null,
    };

    const { error } = await supabase.from("feedback").insert([newFeedback]).select();
    if (error) {
      alert("❌ Feedback submission failed: " + error.message);
    } else {
      alert("✅ Feedback submitted successfully!");
      navigate("/feedback");
    }
    setLoading(false);
  };

  return (
    <div
      className="min-h-screen flex justify-center items-start p-4 sm:p-8 md:p-10 bg-gradient-to-br from-emerald-50 to-green-100/60"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white/95 rounded-2xl shadow-xl p-6 sm:p-10 w-full max-w-3xl border border-emerald-200">
        <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900 text-center mb-8">
          Feedback for Module <span className="italic">{id}</span>
        </h1>

        <form onSubmit={handleSubmit} className="space-y-8">
          {["clarity", "difficulty", "relevance"].map((field) => (
            <div key={field}>
              <p className="font-semibold text-emerald-900 mb-2 capitalize">
                {field === "clarity"
                  ? "How clear were the instructions?"
                  : field === "difficulty"
                  ? "How easy or difficult was this task?"
                  : "How relevant was this task to your role?"}
              </p>
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <label key={num} className="flex flex-col items-center">
                    <input
                      type="radio"
                      name={field}
                      value={num}
                      checked={formData[field] === String(num)}
                      onChange={(e) => handleChange(field, e.target.value)}
                      className="accent-emerald-600 w-5 h-5"
                    />
                    <span className="text-sm">{num}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="font-semibold text-emerald-900 mb-2 block">
              What challenges did you face while completing this task?
            </label>
            <textarea
              value={formData.challenges}
              onChange={(e) => handleChange("challenges", e.target.value)}
              className="w-full border rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 resize-none"
              rows="3"
            />
          </div>

          <div>
            <label className="font-semibold text-emerald-900 mb-2 block">
              Suggestions for improving this module?
            </label>
            <textarea
              value={formData.suggestions}
              onChange={(e) => handleChange("suggestions", e.target.value)}
              className="w-full border rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 resize-none"
              rows="3"
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {loading ? "Submitting..." : "Submit Feedback"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
