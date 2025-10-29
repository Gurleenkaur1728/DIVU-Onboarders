import { useState } from "react";
import Sidebar from "../../components/Sidebar.jsx";
import { Trash2, Star } from "lucide-react";
import { useRole } from "../../../src/lib/hooks/useRole.js";

export default function ManageFeedback() {
  const { roleId } = useRole();

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
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Sidebar now uses detected role */}
      <Sidebar active="manage-feedback" role={roleId} />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Admin Panel – View Feedback
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          FEEDBACK LIST
        </div>

        {/* Feedback Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-emerald-900/95 text-left text-emerald-100">
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
