import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { CheckCircle, Circle, Edit, Trash2, Plus, X } from "lucide-react";

export default function ManageChecklist() {
  // Dynamically detect role from localStorage (fallback to ADMIN)
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });
  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [rows, setRows] = useState([
    { id: 1, name: "Orientation Module", assigned: "01-01-2025", completed: "01-05-2025", feedback: "Yes", done: true },
    { id: 2, name: "HR Policies", assigned: "01-10-2025", completed: "-", feedback: "-", done: false },
    { id: 3, name: "Security Training", assigned: "01-15-2025", completed: "-", feedback: "-", done: false },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [formData, setFormData] = useState({ name: "", assigned: "" });

  const toggle = (id) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, done: !r.done, completed: !r.done ? formatToday() : "-" }
          : r
      )
    );
  };

  const deleteRow = (id) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const openModal = (row = null) => {
    setEditingRow(row);
    setFormData(row ? { name: row.name, assigned: row.assigned } : { name: "", assigned: "" });
    setModalOpen(true);
  };

  const saveRow = () => {
    if (editingRow) {
      setRows((prev) =>
        prev.map((r) =>
          r.id === editingRow.id ? { ...r, ...formData } : r
        )
      );
    } else {
      setRows((prev) => [
        ...prev,
        {
          id: prev.length + 1,
          ...formData,
          completed: "-",
          feedback: "-",
          done: false,
        },
      ]);
    }
    setModalOpen(false);
  };

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Sidebar now uses detected role */}
      <Sidebar active="manage-checklist" role={role} />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Admin Panel – Manage Checklist
          </span>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-500 transition"
          >
            <Plus size={16} /> Add Checklist Item
          </button>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE CHECKLIST
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-emerald-900/95 text-left text-emerald-100">
                <Th>Completed</Th>
                <Th>Module</Th>
                <Th>Date Assigned</Th>
                <Th>Date Completed</Th>
                <Th>Feedback</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr
                  key={r.id}
                  className={`text-emerald-950 text-sm ${
                    idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                  }`}
                >
                  {/* Completed toggle */}
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(r.id)}>
                      {r.done ? (
                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>

                  {/* Module name */}
                  <td className="px-4 py-3">{r.name}</td>

                  {/* Assigned */}
                  <td className="px-4 py-3">{r.assigned}</td>

                  {/* Completed */}
                  <td className="px-4 py-3">{r.completed ?? "-"}</td>

                  {/* Feedback */}
                  <td className="px-4 py-3">{r.feedback ?? "-"}</td>

                  {/* Actions */}
                  <td className="px-4 py-3 flex gap-2">
                    <button
                      onClick={() => openModal(r)}
                      className="p-2 rounded bg-blue-500/80 text-white hover:bg-blue-500 transition"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => deleteRow(r.id)}
                      className="p-2 rounded bg-red-500/80 text-white hover:bg-red-500 transition"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="w-full max-w-md bg-emerald-950/95 text-white rounded-xl shadow-lg border border-emerald-700 backdrop-blur-xl p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-emerald-700/50 hover:bg-emerald-600"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold mb-4">
              {editingRow ? "Edit Checklist Item" : "Add Checklist Item"}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm mb-1">Module Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Enter module name"
                />
              </div>
              <div>
                <label className="block text-sm mb-1">Date Assigned</label>
                <input
                  type="text"
                  value={formData.assigned}
                  onChange={(e) => setFormData({ ...formData, assigned: e.target.value })}
                  className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="MM-DD-YYYY"
                />
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-gray-600/70 text-white text-sm font-semibold hover:bg-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={saveRow}
                  className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Subcomponents ---------- */
function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold text-emerald-50 border-r border-emerald-800/50">
      {children}
    </th>
  );
}

function pad(n) {
  return n < 10 ? `0${n}` : `${n}`;
}
function formatToday() {
  const d = new Date();
  return `${pad(d.getMonth() + 1)}-${pad(d.getDate())}-${d.getFullYear()}`;
}
