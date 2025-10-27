import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function Feedback() {
  const [activeTab, setActiveTab] = useState("submitted");
  const [feedbacks, setFeedbacks] = useState([]);
  const [modules, setModules] = useState([]);
  const [userId, setUserId] = useState(null);

  // ✅ 1. Get logged-in user
  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) console.error("Auth error:", error);
      else setUserId(data?.user?.id);
    };
    fetchUser();
  }, []);

  // ✅ 2. Load checklist modules
  useEffect(() => {
    const loadModules = async () => {
      const { data, error } = await supabase
        .from("checklist_item")
        .select("item_id, title");

      if (error) console.error("❌ Modules load error:", error);
      else setModules(data || []);
    };
    loadModules();
  }, []);

  // ✅ 3. Load feedbacks for this user
  useEffect(() => {
    if (!userId) return;

    const loadFeedbacks = async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("item_id, submitted_at")
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      if (error) console.error("❌ Feedback load error:", error);
      else setFeedbacks(data || []);
    };

    loadFeedbacks();
  }, [userId]);

  // ✅ 4. Determine submitted vs not submitted
  const submittedIds = feedbacks.map((f) => f.item_id);
  const submittedModules = modules.filter((m) => submittedIds.includes(m.item_id));
  const notSubmittedModules = modules.filter((m) => !submittedIds.includes(m.item_id));

  return (
    <div
      className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 relative"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar role={ROLES.USER} />
      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
        {/* Header */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-lg px-4 py-3 mb-6 shadow-sm border border-emerald-200/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-950 tracking-wide">
            Feedback Center
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveTab("submitted")}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
              ${
                activeTab === "submitted"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                  : "bg-white text-emerald-800 hover:bg-gray-100"
              }`}
          >
            Feedback Submitted
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
              ${
                activeTab === "create"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                  : "bg-white text-emerald-800 hover:bg-gray-100"
              }`}
          >
            Create Feedback
          </button>
        </div>

        {/* ✅ Submitted Feedback Table */}
        {activeTab === "submitted" && (
          <div className="bg-white/95 rounded-2xl shadow-lg overflow-hidden border border-emerald-200">
            <table className="w-full text-left border-collapse text-sm md:text-base">
              <thead className="bg-emerald-800 text-white">
                <tr>
                  <th className="p-4 font-semibold">Module Name</th>
                  <th className="p-4 font-semibold">Feedback Date</th>
                  <th className="p-4 font-semibold">View</th>
                </tr>
              </thead>
              <tbody>
                {submittedModules.length > 0 ? (
                  submittedModules.map((m) => {
                    const fb = feedbacks.find((f) => f.item_id === m.item_id);
                    return (
                      <tr
                        key={m.item_id}
                        className="border-b last:border-0 hover:bg-emerald-50 transition-colors duration-200"
                      >
                        <td className="p-4 text-emerald-900">{m.title || "Untitled Module"}</td>
                        <td className="p-4 text-emerald-800">
                          {fb ? new Date(fb.submitted_at).toLocaleDateString() : "-"}
                        </td>
                        <td className="p-4">
                          <Link
                            to={`/feedback/${m.item_id}`}
                            className="text-emerald-700 font-medium hover:underline"
                          >
                            View Feedback
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-gray-500">
                      No feedback submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* ✅ Create Feedback Table */}
        {activeTab === "create" && (
          <div className="bg-white/95 rounded-2xl shadow-lg overflow-hidden border border-emerald-200">
            <table className="w-full text-left border-collapse text-sm md:text-base">
              <thead className="bg-emerald-800 text-white">
                <tr>
                  <th className="p-4 font-semibold">Module Name</th>
                  <th className="p-4 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {notSubmittedModules.length > 0 ? (
                  notSubmittedModules.map((m) => (
                    <tr
                      key={m.item_id}
                      className="border-b last:border-0 hover:bg-emerald-50 transition-colors duration-200"
                    >
                      <td className="p-4 text-emerald-900">{m.title || "Untitled Module"}</td>
                      <td className="p-4">
                        <Link
                          to={`/feedback/${m.item_id}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          Create Feedback
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="2" className="p-6 text-center text-gray-500">
                      All modules already have feedback.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
