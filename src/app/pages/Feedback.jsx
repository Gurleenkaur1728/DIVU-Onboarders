import { useState } from "react";
import Sidebar, {ROLES}  from "../components/Sidebar.jsx";
import modulesData from "../../src/lib/modulesData";
import { Link } from "react-router-dom";

export default function Feedback() {
  // Mock data: module 1 already has feedback
  const [submitted] = useState([1]);
  const [activeTab, setActiveTab] = useState("submitted");

  const submittedModules = modulesData.filter((m) => submitted.includes(m.id));
  const notSubmittedModules = modulesData.filter((m) => !submitted.includes(m.id));

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
        {/* Title */}
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

        {/* Submitted Feedback Table */}
        {activeTab === "submitted" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-4">Module Name</th>
                  <th className="p-4">Date Completed</th>
                  <th className="p-4">Date of Feedback</th>
                  <th className="p-4">View</th>
                </tr>
              </thead>
              <tbody>
                {submittedModules.length > 0 ? (
                  submittedModules.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-gray-800">{m.title}</td>
                      <td className="p-4 text-gray-600">01-02-2025</td>
                      <td className="p-4 text-gray-600">03-02-2025</td>
                      <td className="p-4">
                        <Link
                          to={`/feedback/${m.id}`}
                          className="text-emerald-700 font-medium hover:underline"
                        >
                          View Feedback
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="p-6 text-center text-gray-500">
                      No feedback submitted yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Create Feedback Table */}
        {activeTab === "create" && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-4">Module Name</th>
                  <th className="p-4">Date Completed</th>
                  <th className="p-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {notSubmittedModules.length > 0 ? (
                  notSubmittedModules.map((m) => (
                    <tr key={m.id} className="border-b hover:bg-gray-50">
                      <td className="p-4 text-gray-800">{m.title}</td>
                      <td className="p-4 text-gray-600">05-02-2025</td>
                      <td className="p-4">
                        <Link
                          to={`/feedback/${m.id}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          Create Feedback
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="p-6 text-center text-gray-500">
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