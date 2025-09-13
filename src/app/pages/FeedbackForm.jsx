import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";

export default function FeedbackForm() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    clarity: "",
    difficulty: "",
    relevance: "",
    challenges: "",
    suggestions: "",
  });

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Submitted Feedback:", formData);

    // Show optional confirmation
    alert("✅ Feedback submitted!");

    // Redirect back to Feedback dashboard
    navigate("/feedback");
  };

  return (
    <div
      className="min-h-screen flex justify-center items-start p-10"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl p-10 w-full max-w-3xl">
        {/* Header */}
        <h1 className="text-3xl font-bold text-emerald-900 text-center mb-8">
          Feedback for Module {id}:{" "}
          <span className="italic">How We Work Together</span>
        </h1>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Question 1 */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">
              How clear were the instructions?
            </p>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <label key={num} className="flex flex-col items-center">
                  <input
                    type="radio"
                    name="clarity"
                    value={num}
                    checked={formData.clarity === String(num)}
                    onChange={(e) => handleChange("clarity", e.target.value)}
                    className="accent-emerald-600 w-5 h-5"
                  />
                  <span className="text-sm">{num}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1 = Unclear, 5 = Very Clear
            </p>
          </div>

          {/* Question 2 */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">
              How easy or difficult was this task?
            </p>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <label key={num} className="flex flex-col items-center">
                  <input
                    type="radio"
                    name="difficulty"
                    value={num}
                    checked={formData.difficulty === String(num)}
                    onChange={(e) => handleChange("difficulty", e.target.value)}
                    className="accent-emerald-600 w-5 h-5"
                  />
                  <span className="text-sm">{num}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1 = Very Difficult, 5 = Very Easy
            </p>
          </div>

          {/* Question 3 */}
          <div>
            <p className="font-semibold text-gray-800 mb-2">
              How relevant was this task to your role?
            </p>
            <div className="flex gap-4">
              {[1, 2, 3, 4, 5].map((num) => (
                <label key={num} className="flex flex-col items-center">
                  <input
                    type="radio"
                    name="relevance"
                    value={num}
                    checked={formData.relevance === String(num)}
                    onChange={(e) => handleChange("relevance", e.target.value)}
                    className="accent-emerald-600 w-5 h-5"
                  />
                  <span className="text-sm">{num}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              1 = Not Relevant, 5 = Very Relevant
            </p>
          </div>

          {/* Open-ended Questions */}
          <div>
            <label className="font-semibold text-gray-800 mb-2 block">
              What challenges did you face while completing this task?
            </label>
            <textarea
              className="w-full border rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-emerald-500"
              rows="3"
              value={formData.challenges}
              onChange={(e) => handleChange("challenges", e.target.value)}
            />
          </div>

          <div>
            <label className="font-semibold text-gray-800 mb-2 block">
              Do you have suggestions for improving this task or module?
            </label>
            <textarea
              className="w-full border rounded-lg p-3 text-gray-700 focus:ring-2 focus:ring-emerald-500"
              rows="3"
              value={formData.suggestions}
              onChange={(e) => handleChange("suggestions", e.target.value)}
            />
          </div>

          {/* Submit */}
          <div className="text-center">
            <button
              type="submit"
              className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-md"
            >
              Submit Feedback
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}