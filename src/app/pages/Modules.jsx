import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar, {ROLES}  from "../components/Sidebar.jsx";
import { AppWindow, CheckCircle2, Circle, Clock } from "lucide-react";
import modulesData from "../../lib/modulesData";

export default function Modules() {
  // initialize modules with dummy assigned dates etc.
  const [modules] = useState(
    modulesData.map((m, index) => ({
      ...m,
      assigned: "00-00-0000",
      completed: index === 0 ? "00-00-0000" : "-", // mock one completed
      feedback: index === 0 ? "Yes" : "-",
      status: index === 0 ? "completed" : index === 1 ? "in-progress" : "pending",
    }))
  );

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar role={ROLES.USER} />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6 bg-white/90 backdrop-blur-sm rounded-l-2xl">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-6 shadow">
          <span className="text-emerald-950 font-semibold text-lg">
            Welcome &lt;name&gt; to DIVU!
          </span>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-emerald-900 mb-4 tracking-wide">
          CULTURE MODULES
        </h1>

        {/* Table */}
        <div className="overflow-hidden rounded-xl shadow-lg bg-white/95">
          <table className="w-full text-left border-collapse">
            <thead className="bg-emerald-700 text-white">
              <tr>
                <th className="p-3 text-sm font-semibold">Status</th>
                <th className="p-3 text-sm font-semibold">Module</th>
                <th className="p-3 text-sm font-semibold">Date Assigned</th>
                <th className="p-3 text-sm font-semibold">Date Completed</th>
                <th className="p-3 text-sm font-semibold">Feedback</th>
              </tr>
            </thead>
            <tbody>
              {modules.map((m, idx) => (
                <tr
                  key={m.id}
                  className={`transition-colors ${
                    idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                  } hover:bg-gray-100`}
                >
                  {/* Status */}
                  <td className="p-3 text-center">
                    {m.status === "completed" ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    ) : m.status === "in-progress" ? (
                      <Clock className="w-5 h-5 text-amber-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-gray-400" />
                    )}
                  </td>

                  {/* Title */}
                  <td className="p-3 font-medium">
                    <Link
                      to={`/modules/${m.id}`}
                      className="text-emerald-700 hover:text-emerald-900 hover:underline transition"
                    >
                      {m.title}
                    </Link>
                  </td>

                  {/* Dates + Feedback */}
                  <td className="p-3 text-sm text-gray-700">{m.assigned}</td>
                  <td className="p-3 text-sm text-gray-700">{m.completed}</td>
                  <td
                    className={`p-3 text-sm font-semibold ${
                      m.feedback === "Yes" ? "text-emerald-600" : "text-gray-500"
                    }`}
                  >
                    {m.feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
} //modules.jsx