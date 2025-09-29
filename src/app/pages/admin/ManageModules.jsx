import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Edit, Trash2, Plus, CheckCircle, Lock, PlayCircle, Timer, X } from "lucide-react";

export default function ManageModules() {
  // Dynamically detect role from localStorage (fallback to ADMIN)
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.ADMIN;
  });
  useEffect(() => {
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
  }, []);

  const [modules, setModules] = useState([
    { id: 1, title: "Orientation Module", description: "Short intro to our culture and ways of working.", duration: "10 min", status: "completed", progress: 100 },
    { id: 2, title: "HR Policies", description: "Security basics and acceptable use policy.", duration: "15 min", status: "available", progress: 0 },
    { id: 3, title: "Security Training", description: "Tools you’ll use daily and how to access them.", duration: "20 min", status: "in-progress", progress: 45 },
  ]);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [formData, setFormData] = useState({ title: "", description: "", duration: "", status: "available", progress: 0 });

  const openModal = (module = null) => {
    setEditing(module);
    setFormData(
      module
        ? { ...module }
        : { title: "", description: "", duration: "", status: "available", progress: 0 }
    );
    setModalOpen(true);
  };

  const saveModule = () => {
    if (editing) {
      setModules((prev) =>
        prev.map((m) => (m.id === editing.id ? { ...m, ...formData } : m))
      );
    } else {
      setModules((prev) => [...prev, { id: prev.length + 1, ...formData }]);
    }
    setModalOpen(false);
  };

  const deleteModule = (id) => {
    setModules((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      {/* Sidebar now uses detected role */}
      <Sidebar active="manage-modules" role={role} />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow mb-4">
          <span className="text-emerald-950 font-semibold">
            Admin Panel – Manage Modules
          </span>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 px-3 py-1.5 rounded bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
          >
            <Plus size={16} /> Add Module
          </button>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          MANAGE MODULES
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((m) => (
            <div key={m.id} className="bg-white/95 rounded-lg shadow border border-gray-200 p-5 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-emerald-950">{m.title}</h2>
                <StatusPill status={m.status} />
              </div>

              {/* Description */}
              <p className="text-sm text-emerald-950/80 mb-3">{m.description}</p>

              {/* Meta */}
              <div className="flex gap-6 text-xs text-emerald-700 mb-4">
                <span><span className="font-semibold">Duration:</span> {m.duration}</span>
                <span><span className="font-semibold">Progress:</span> {m.progress}%</span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      m.status === "completed"
                        ? "bg-emerald-500"
                        : m.status === "locked"
                        ? "bg-gray-400"
                        : "bg-emerald-700"
                    }`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2 mt-auto">
                <button
                  onClick={() => openModal(m)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600"
                >
                  <Edit size={14} /> Edit
                </button>
                <button
                  onClick={() => deleteModule(m.id)}
                  className="flex items-center gap-1 px-3 py-1.5 rounded bg-red-500 text-white text-sm font-semibold hover:bg-red-600"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-emerald-950/95 text-white rounded-xl shadow-lg border border-emerald-700 backdrop-blur-xl p-6 relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-full bg-emerald-700/50 hover:bg-emerald-600"
            >
              <X size={18} />
            </button>
            <h2 className="text-lg font-bold mb-4">
              {editing ? "Edit Module" : "Add Module"}
            </h2>

            {/* Fields */}
            <div className="space-y-4">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <textarea
                placeholder="Description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <input
                type="text"
                placeholder="Duration"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full rounded-lg border border-emerald-700 bg-emerald-900/60 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                <option value="available">Available</option>
                <option value="in-progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="locked">Locked</option>
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 rounded-lg bg-gray-600/70 text-white text-sm font-semibold hover:bg-gray-500"
              >
                Cancel
              </button>
              <button
                onClick={saveModule}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* --- StatusPill Subcomponent --- */
function StatusPill({ status }) {
  const info =
    status === "completed"
      ? { color: "text-emerald-600", label: "Completed", icon: CheckCircle }
      : status === "in-progress"
      ? { color: "text-amber-500", label: "In progress", icon: Timer }
      : status === "available"
      ? { color: "text-emerald-700", label: "Available", icon: PlayCircle }
      : { color: "text-gray-500", label: "Locked", icon: Lock };

  const Icon = info.icon;

  return (
    <div
      className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-xs font-bold border-current ${info.color}`}
    >
      <Icon className="w-4 h-4" /> {info.label}
    </div>
  );
}