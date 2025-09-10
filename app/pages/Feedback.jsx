import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { Star, ArrowLeft, AppWindow } from "lucide-react";

export default function ModuleFeedback() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [rating, setRating] = useState(0);
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!rating) {
      alert("Please add a star rating.");
      return;
    }
    try {
      setSubmitting(true);

      // TODO: Replace with real API call
      console.log("Submitting feedback:", { moduleId: id, rating, comments });

      setTimeout(() => {
        setSubmitting(false);
        navigate("/feedback?tab=submitted");
      }, 800);
    } catch (err) {
      setSubmitting(false);
      alert("Error submitting feedback: " + err.message);
    }
  };

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar (desktop) */}
      <Sidebar active="feedback" />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <span className="text-emerald-950 font-semibold">
            Welcome &lt;name&gt; to DIVU!
          </span>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title bar */}
        <div className="flex items-center justify-between bg-emerald-950/90 rounded-md px-4 py-3 mb-4 shadow">
          <h1 className="text-lg font-bold text-white">Feedback</h1>
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-white/20 text-white text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        </div>

        {/* Card */}
        <div className="bg-white/95 rounded-lg shadow p-6 max-w-2xl">
          <h2 className="text-sm font-bold text-emerald-950">Module</h2>
          <p className="mt-1 font-semibold text-emerald-950">
            Module {id}
          </p>

          {/* Rating */}
          <h2 className="mt-6 text-sm font-bold text-emerald-950">
            Your rating
          </h2>
          <div className="flex items-center gap-2 mt-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                onClick={() => setRating(n)}
                className="focus:outline-none"
              >
                <Star
                  className={`w-7 h-7 transition ${
                    n <= rating
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-400"
                  }`}
                />
              </button>
            ))}
          </div>

          {/* Comments */}
          <h2 className="mt-6 text-sm font-bold text-emerald-950">
            Comments (optional)
          </h2>
          <textarea
            value={comments}
            onChange={(e) => setComments(e.target.value)}
            placeholder="What worked well? Anything to improve?"
            className="w-full mt-2 min-h-[120px] rounded-md border border-gray-300 px-3 py-2 text-sm text-emerald-950 bg-white shadow-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />

          {/* Submit */}
          <button
            onClick={submit}
            disabled={submitting}
            className={`mt-6 w-full py-2.5 rounded-md font-bold text-white shadow
              ${submitting ? "bg-emerald-400" : "bg-emerald-600 hover:bg-emerald-700"}
            `}
          >
            {submitting ? "Submitting…" : "Submit feedback"}
          </button>

          {/* Back to Modules */}
          <Link
            to="/modules"
            className="block mt-4 text-center text-sm font-semibold text-emerald-700 hover:underline"
          >
            Back to Modules
          </Link>
        </div>
      </div>
    </div>
  );
}
