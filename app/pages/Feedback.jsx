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

  // ✅ 2. Load checklist modules (remove module_name)
  useEffect(() => {
    const loadModules = async () => {
      const { data, error } = await supabase
        .from("checklist_item")
        .select("item_id, title"); // ✅ Only these two exist

      if (error) {
        console.error("❌ Modules load error:", error);
      } else {
        setModules(data || []);
        console.log("✅ Loaded checklist modules:", data);
      }
    };
    loadModules();
  }, []);

  // ✅ 3. Load feedbacks for this user (remove module_name)
  useEffect(() => {
    if (!userId) return;

    const loadFeedbacks = async () => {
      const { data, error } = await supabase
        .from("feedback")
        .select("item_id, submitted_at") // ✅ Only columns that exist
        .eq("user_id", userId)
        .order("submitted_at", { ascending: false });

      if (error) {
        console.error("❌ Feedback load error:", error);
      } else {
        console.log("✅ Loaded feedback records:", data);
        setFeedbacks(data || []);
      }
    };

    loadFeedbacks();
  }, [userId]);

  // ✅ 4. Determine submitted vs not submitted
  const submittedIds = feedbacks.map((f) => f.item_id);
  const submittedModules = modules.filter((m) =>
    submittedIds.includes(m.item_id)
  );
  const notSubmittedModules = modules.filter(
    (m) => !submittedIds.includes(m.item_id)
  );

  return (
    <div
      className="flex min-h-dvh"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar role={ROLES.USER} />

      <div className="flex-1 p-10">
        <h1 className="text-3xl font-bold text-white mb-8 tracking-wide">
          Feedback Center
        </h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <button
            onClick={() => setActiveTab("submitted")}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              activeTab === "submitted"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-emerald-700 hover:bg-gray-100"
            }`}
          >
            Feedback Submitted
          </button>
          <button
            onClick={() => setActiveTab("create")}
            className={`px-6 py-2 rounded-full font-semibold transition ${
              activeTab === "create"
                ? "bg-emerald-600 text-white shadow-md"
                : "bg-white text-emerald-700 hover:bg-gray-100"
            }`}
          >
            Create Feedback
          </button>
        </div>

        {/* ✅ Submitted Feedback Table */}
        {activeTab === "submitted" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-4">Module Name</th>
                  <th className="p-4">Feedback Date</th>
                  <th className="p-4">View</th>
                </tr>
              </thead>
              <tbody>
                {submittedModules.length > 0 ? (
                  submittedModules.map((m) => {
                    const fb = feedbacks.find((f) => f.item_id === m.item_id);
                    return (
                      <tr key={m.item_id} className="border-b hover:bg-gray-50">
                        <td className="p-4 text-gray-800">
                          {m.title || "Untitled Module"}
                        </td>
                        <td className="p-4 text-gray-600">
                          {fb
                            ? new Date(fb.submitted_at).toLocaleDateString()
                            : "-"}
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
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-4">Module Name</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {notSubmittedModules.length > 0 ? (
                  notSubmittedModules.map((m) => (
                    <tr key={m.item_id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-gray-800">
                        {m.title || "Untitled Module"}
                      </td>
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
