import { useState } from "react";
import Sidebar, {ROLES}  from "../components/Sidebar";
import { CheckCircle, Circle } from "lucide-react";
import { Link } from "react-router-dom";

export default function Checklist() {
  const [rows, setRows] = useState([
    { id: 1, name: "Name of Module 1", assigned: "00-00-0000", completed: "00-00-0000", feedback: "-", done: true },
    { id: 2, name: "Name of Module 2", assigned: "00-00-0000", completed: "-", feedback: "-", done: false, link: true },
    { id: 3, name: "Name of Module 3", assigned: "00-00-0000", completed: "-", feedback: "-", done: false },
    { id: 4, name: "Name of Module 4", assigned: "00-00-0000", completed: "00-00-0000", feedback: "Yes", done: true },
    { id: 5, name: "Name of Module 5", assigned: "00-00-0000", completed: "00-00-0000", feedback: "-", done: true },
    { id: 6, name: "Name of Module 6", assigned: "00-00-0000", completed: "-", feedback: "-", done: false },
  ]);

  const toggle = (id) => {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id
          ? { ...r, done: !r.done, completed: !r.done ? formatToday() : "-" }
          : r
      )
    );
  };

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 relative">
      {/* glowing bg accents */}
      {/* <div className="absolute top-16 left-12 w-72 h-72 bg-emerald-500/20 blur-3xl rounded-full animate-pulse"></div>
      <div className="absolute bottom-24 right-12 w-96 h-96 bg-green-400/20 blur-3xl rounded-full animate-ping"></div> */}

      {/* Sidebar */}
      <Sidebar role={ROLES.USER} />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">Welcome &lt;name&gt; to DIVU!</span>
          <span className="material-icons text-emerald-950">apps</span>
        </div>

        {/* Title + Tabs */}
        <div className="flex items-center justify-between bg-emerald-950/90 px-4 py-3 rounded-md mb-4 shadow-md">
          <h2 className="text-lg md:text-xl font-bold text-emerald-100 tracking-wide">
            ONBOARDING CHECKLIST
          </h2>
          <div className="flex gap-2">
            <Tab label="Checklist" active />
            <Tab label="Modules" to="/modules" />
          </div>
        </div>

        <p className="italic text-emerald-100 mb-2">Modules List</p>

        {/* Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-800/50 shadow-lg">
          <table className="min-w-[980px] w-full border-collapse">
            <thead>
              <tr className="bg-emerald-700/70 text-left">
                <Th>Completed</Th>
                <Th>Modules to Complete</Th>
                <Th>Date Assigned</Th>
                <Th>Date Completed</Th>
                <Th>Feedback Given</Th>
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
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <Circle className="w-5 h-5 text-gray-400" />
                      )}
                    </button>
                  </td>

                  {/* Name / link */}
                  <td className="px-4 py-3">
                    {r.link ? (
                      <Link
                        to={`/modules/${r.id}`}
                        className="text-emerald-700 underline hover:text-emerald-500"
                      >
                        {r.name}
                      </Link>
                    ) : (
                      <span>{r.name}</span>
                    )}
                  </td>

                  {/* Assigned */}
                  <td className="px-4 py-3">{r.assigned}</td>

                  {/* Completed */}
                  <td className="px-4 py-3">{r.completed ?? "-"}</td>

                  {/* Feedback */}
                  <td className="px-4 py-3">{r.feedback ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, active, to }) {
  return to ? (
    <Link
      to={to}
      replace={false}
      className={`
        px-4 py-1 rounded-md text-sm font-semibold transition-all duration-300
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
        }
      `}
    >
      {label}
    </Link>
  ) : (
    <button
      className={`
        px-4 py-1 rounded-md text-sm font-semibold transition-all duration-300
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
        }
      `}
      disabled
    >
      {label}
    </button>
  );
}

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