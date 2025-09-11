import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { Lock, CheckCircle, PlayCircle, Timer, AppWindow } from "lucide-react";

export default function Modules() {
  const navigate = useNavigate();

  const [modules] = useState([
    { id: 1, title: "Name of Module 1", description: "Short intro to our culture and ways of working.", assigned: "00-00-0000", duration: "10 min", status: "completed", progress: 100 },
    { id: 2, title: "Name of Module 2", description: "Security basics and acceptable use policy.", assigned: "00-00-0000", duration: "15 min", status: "available", progress: 0 },
    { id: 3, title: "Name of Module 3", description: "Tools you’ll use daily and how to access them.", assigned: "00-00-0000", duration: "12 min", status: "in-progress", progress: 45 },
    { id: 4, title: "Name of Module 4", description: "HR handbooks and benefits overview.", assigned: "00-00-0000", duration: "8 min", status: "completed", progress: 100 },
    { id: 5, title: "Name of Module 5", description: "Health & safety training.", assigned: "00-00-0000", duration: "20 min", status: "available", progress: 0 },
    { id: 6, title: "Name of Module 6", description: "Team-specific onboarding.", assigned: "00-00-0000", duration: "25 min", status: "locked", progress: 0 },
  ]);

  const nextActionLabel = (m) => {
    if (m.status === "locked") return "Locked";
    if (m.status === "completed") return "View";
    if (m.status === "in-progress") return "Resume";
    return "Start";
  };

  const goToFeedback = (m) => {
    navigate(`/modules/${m.id}/feedback`, { state: { title: m.title } });
  };

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar */}
      <Sidebar />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <span className="text-emerald-950 font-semibold">Welcome &lt;name&gt; to DIVU!</span>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title + Tabs */}
        <div className="flex items-center justify-between bg-emerald-950/90 rounded-md px-4 py-3 mb-4 shadow">
          <h1 className="text-lg font-bold text-white">ONBOARDING CHECKLIST</h1>
          <div className="flex gap-2">
            <Link to="/checklist" className="px-3 py-1.5 rounded bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-600">Checklist</Link>
            <button className="px-3 py-1.5 rounded bg-emerald-300 text-emerald-950 text-sm font-bold">Modules</button>
          </div>
        </div>

        {/* List */}
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
                <span><span className="font-semibold">Assigned:</span> {m.assigned}</span>
                <span><span className="font-semibold">Duration:</span> {m.duration}</span>
              </div>

              {/* Progress bar */}
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-2 rounded-full bg-gray-200 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      m.status === "completed" ? "bg-emerald-500" : m.status === "locked" ? "bg-gray-400" : "bg-emerald-700"
                    }`}
                    style={{ width: `${m.progress}%` }}
                  />
                </div>
                <span className="text-sm font-semibold text-emerald-950">{m.progress}%</span>
              </div>

              {/* Actions */}
              <div className="flex flex-wrap gap-2 mt-auto">
                <button
                  disabled={m.status === "locked"}
                  className={`px-4 py-2 rounded-md font-bold text-white shadow ${
                    m.status === "locked" ? "bg-gray-400 cursor-not-allowed" : "bg-emerald-700 hover:bg-emerald-800"
                  }`}
                >
                  {nextActionLabel(m)}
                </button>

                <Link to={`/modules/${m.id}`} className="px-3 py-2 rounded-md border border-gray-300 text-emerald-900 text-sm font-semibold hover:bg-emerald-50">
                  View module
                </Link>

                {m.status !== "completed" && m.status !== "locked" && (
                  <button
                    onClick={() => goToFeedback(m)}
                    className="px-3 py-2 rounded-md border border-gray-300 text-emerald-900 text-sm font-semibold hover:bg-emerald-50"
                  >
                    Complete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const info =
    status === "completed" ? { color: "text-emerald-600", label: "Completed", icon: CheckCircle }
    : status === "in-progress" ? { color: "text-amber-500", label: "In progress", icon: Timer }
    : status === "available" ? { color: "text-emerald-700", label: "Available", icon: PlayCircle }
    : { color: "text-gray-500", label: "Locked", icon: Lock };

  const Icon = info.icon;
  return (
    <div className={`flex items-center gap-1.5 border px-2 py-0.5 rounded-full text-xs font-bold border-current ${info.color}`}>
      <Icon className="w-4 h-4" /> {info.label}
    </div>
  );
}
