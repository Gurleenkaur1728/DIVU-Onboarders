import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import AppLayout from "../../src/AppLayout.jsx";

export default function FeedbackForm() {
  const { id } = useParams(); // module_id
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [moduleTitle, setModuleTitle] = useState("");
  const [formData, setFormData] = useState({
    rating: "",
    difficulty_level: "",
    feedback_text: "",
    suggestions: "",
  });

  // Fetch module title
  useEffect(() => {
    const fetchModuleTitle = async () => {
      try {
        const { data, error } = await supabase
          .from("modules")
          .select("title")
          .eq("id", id)
          .single();

        if (error) throw error;
        setModuleTitle(data.title);
      } catch (error) {
        console.error("Error fetching module title:", error);
        setModuleTitle(`Module ${id}`);
      }
    };

    if (id) {
      fetchModuleTitle();
    }
  }, [id]);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const userId = user?.profile_id;

    if (!userId) {
      alert("⚠️ You must be logged in to submit feedback.");
      setLoading(false);
      return;
    }

    if (!formData.rating) {
      alert("⚠️ Please provide a rating before submitting.");
      setLoading(false);
      return;
    }

    try {
      // Check if feedback already exists
      const { data: existingFeedback, error: checkError } = await supabase
        .from("module_feedback")
        .select("id")
        .eq("user_id", userId)
        .eq("module_id", id)
        .maybeSingle();

      if (checkError) throw checkError;

      const feedbackData = {
        user_id: userId,
        module_id: id,
        rating: parseInt(formData.rating),
        difficulty_level: formData.difficulty_level ? parseInt(formData.difficulty_level) : null,
        feedback_text: formData.feedback_text?.trim() || null,
        suggestions: formData.suggestions?.trim() || null,
      };

      if (existingFeedback) {
        // Update existing feedback
        const { error: updateError } = await supabase
          .from("module_feedback")
          .update(feedbackData)
          .eq("id", existingFeedback.id);

        if (updateError) throw updateError;
        alert("✅ Feedback updated successfully!");
      } else {
        // Insert new feedback
        const { error: insertError } = await supabase
          .from("module_feedback")
          .insert([feedbackData]);

        if (insertError) throw insertError;
        alert("✅ Feedback submitted successfully!");
      }

      navigate("/feedback");
    } catch (error) {
      console.error("Error submitting feedback:", error);
      alert("❌ Feedback submission failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="min-h-screen flex justify-center items-start p-4 sm:p-8 md:p-10">
        <div className="bg-white/95 rounded-2xl shadow-xl p-6 sm:p-10 w-full max-w-3xl border border-emerald-200">
          <h1 className="text-2xl sm:text-3xl font-bold text-emerald-900 text-center mb-4">
            Feedback for Module
          </h1>
          <p className="text-center text-emerald-700 mb-8 italic">
            {moduleTitle || `Module ${id}`}
          </p>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Overall Rating */}
            <div>
              <p className="font-semibold text-emerald-900 mb-3">
                Overall Rating <span className="text-red-500">*</span>
              </p>
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <label key={num} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="radio"
                      name="rating"
                      value={num}
                      checked={formData.rating === String(num)}
                      onChange={(e) => handleChange("rating", e.target.value)}
                      className="accent-emerald-600 w-5 h-5"
                      required
                    />
                    <span className="text-2xl mt-1">{"⭐".repeat(num)}</span>
                    <span className="text-sm text-gray-600">{num} star{num > 1 ? 's' : ''}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Difficulty Level */}
            <div>
              <p className="font-semibold text-emerald-900 mb-3">
                How difficult was this module? (Optional)
              </p>
              <div className="flex gap-4 flex-wrap">
                {[1, 2, 3, 4, 5].map((num) => (
                  <label key={num} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="radio"
                      name="difficulty_level"
                      value={num}
                      checked={formData.difficulty_level === String(num)}
                      onChange={(e) => handleChange("difficulty_level", e.target.value)}
                      className="accent-amber-600 w-5 h-5"
                    />
                    <span className="text-sm mt-1">{num}</span>
                    <span className="text-xs text-gray-500">
                      {num === 1 ? "Very Easy" : num === 5 ? "Very Hard" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Feedback Text */}
            <div>
              <label className="font-semibold text-emerald-900 mb-2 block">
                What did you think about this module?
              </label>
              <textarea
                value={formData.feedback_text}
                onChange={(e) => handleChange("feedback_text", e.target.value)}
                placeholder="Share your thoughts, what you learned, what was helpful..."
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="4"
              />
            </div>

            {/* Suggestions */}
            <div>
              <label className="font-semibold text-emerald-900 mb-2 block">
                Suggestions for improvement?
              </label>
              <textarea
                value={formData.suggestions}
                onChange={(e) => handleChange("suggestions", e.target.value)}
                placeholder="How can we make this module better?"
                className="w-full border border-gray-300 rounded-lg p-3 text-gray-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                rows="3"
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex gap-4 justify-center">
              <button
                type="button"
                onClick={() => navigate("/modules")}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg shadow-md transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Submitting..." : "Submit Feedback"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
