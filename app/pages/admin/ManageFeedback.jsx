import { useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Trash2, Star } from "lucide-react";

export default function ManageFeedback() {
  const [feedbacks, setFeedbacks] = useState([
    {
      id: 1,
      employee: "John Doe",
      module: "Orientation Module",
      rating: 5,
      comment: "Great introduction, very clear and engaging.",
      date: "2025-09-01",
    },
    {
      id: 2,
      employee: "Jane Smith",
      module: "HR Policies",
      rating: 4,
      comment: "Good coverage but could use more examples.",
      date: "2025-09-05",
    },
    {
      id: 3,
      employee: "David Lee",
      module: "Security Training",
      rating: 3,
      comment: "A bit too long. Some sections felt repetitive.",
      date: "2025-09-08",
    },
  ]);

  const deleteFeedback = (id) => {
    setFeedbacks((prev) => prev.filter((f) => f.id !== id));
  };

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 relative">
      {/* Sidebar */}
      <Sidebar active="manage-feedback" role={ROLES.ADMIN} />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Admin Panel – View Feedback
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-950/90 text-emerald-100 font-bold px-4 py-2 rounded-md shadow mb-4">
          FEEDBACK LIST
        </div>

        {/* Feedback Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-800/50 shadow-lg">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-emerald-700/70 text-left">
                <Th>Employee</Th>
                <Th>Module</Th>
                <Th>Rating</Th>
                <Th>Comments</Th>
                <Th>Date</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {feedbacks.map((f, idx) => (
                <tr
                  key={f.id}
                  className={`text-emerald-950 text-sm ${
                    idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                  }`}
                >
                  <td className="px-4 py-3">{f.employee}</td>
                  <td className="px-4 py-3">{f.module}</td>
                  <td className="px-4 py-3 flex">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        size={16}
                        className={`${
                          i < f.rating
                            ? "text-yellow-400 fill-yellow-400"
                            : "text-gray-400"
                        }`}
                      />
                    ))}
                  </td>
                  <td className="px-4 py-3">{f.comment}</td>
                  <td className="px-4 py-3">{f.date}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => deleteFeedback(f.id)}
                      className="flex items-center gap-1 px-2 py-1.5 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600"
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponent ---------- */
function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold text-emerald-50 border-r border-emerald-800/50">
      {children}
    </th>
  );
}
