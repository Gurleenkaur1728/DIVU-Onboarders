import { useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Link } from "react-router-dom";

export default function Progress() {
  const [activeTab, setActiveTab] = useState("progress");

  // Mock data for pie chart
  const data = [
    { name: "Completed Tasks", value: 3, color: "#22c55e" }, // green
    { name: "Completed Modules", value: 3, color: "#3b82f6" }, // blue
    { name: "Overall Incomplete", value: 4, color: "#ef4444" }, // red
  ];

  // Mock data for certificates
  const certificates = [
    { id: 1, name: "Attend welcome call with HR" },
    { id: 2, name: "Read and acknowledge employee handbook" },
    { id: 3, name: "Review payroll schedule, benefits enrollment, and time-off policy" },
    { id: 4, name: "Training Module 1" },
    { id: 5, name: "Training Module 2" },
    { id: 6, name: "Training Module 4" },
    { id: 7, name: "Training Module 5" },
  ];

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
            Progress Overview
          </h1>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-3 mb-8">
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
              ${
                activeTab === "progress"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                  : "bg-white text-emerald-800 hover:bg-gray-100"
              }`}
          >
            Progress Rate
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
              ${
                activeTab === "certificates"
                  ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                  : "bg-white text-emerald-800 hover:bg-gray-100"
              }`}
          >
            Certificates
          </button>
        </div>

        {/* 🟩 Progress Tab */}
        {activeTab === "progress" && (
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
            <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
              Total Tasks and Modules: 10
            </h2>

            <div className="flex flex-col md:flex-row items-center justify-center gap-10">
              {/* Legend */}
              <div className="space-y-3 text-emerald-900 text-base">
                {data.map((item, idx) => (
                  <p key={idx} className="flex items-center">
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="font-medium">{item.name}:</span>{" "}
                    <span className="ml-1 text-emerald-800">{item.value}</span>
                  </p>
                ))}
              </div>

              {/* Pie Chart */}
              <div className="flex justify-center items-center">
                <PieChart width={300} height={300}>
                  <Pie
                    data={data}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                  >
                    {data.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </div>
            </div>
          </div>
        )}

        {/* 🟩 Certificates Tab */}
        {activeTab === "certificates" && (
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
            <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
              Certificates of Completion
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm md:text-base">
                <thead className="bg-emerald-800 text-white">
                  <tr>
                    <th className="p-4 font-semibold">Name</th>
                    <th className="p-4 font-semibold">View Certificate</th>
                  </tr>
                </thead>
                <tbody>
                  {certificates.map((cert) => (
                    <tr
                      key={cert.id}
                      className="border-b last:border-0 hover:bg-emerald-50 transition-colors duration-200"
                    >
                      <td className="p-4 text-emerald-900">{cert.name}</td>
                      <td className="p-4">
                        <Link
                          to={`/certificate/${cert.id}`}
                          className="text-blue-600 font-medium hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
