import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
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
      className="flex min-h-dvh"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Progress</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab("progress")}
            className={`px-6 py-2 rounded font-semibold ${
              activeTab === "progress"
                ? "bg-emerald-600 text-white"
                : "bg-white text-emerald-700 hover:bg-gray-100"
            }`}
          >
            Progress Rate
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-6 py-2 rounded font-semibold ${
              activeTab === "certificates"
                ? "bg-emerald-600 text-white"
                : "bg-white text-emerald-700 hover:bg-gray-100"
            }`}
          >
            Certificates
          </button>
        </div>

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Total Tasks and Modules: 10</h2>

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Legend */}
              <div className="space-y-2 text-gray-800">
                {data.map((item, idx) => (
                  <p key={idx}>
                    <span
                      className="inline-block w-4 h-4 mr-2 rounded-sm"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    {item.name}: {item.value}
                  </p>
                ))}
              </div>

              {/* Pie Chart */}
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
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-semibold mb-4">Certificate of Completion</h2>
            <table className="w-full text-left border-collapse">
              <thead className="bg-emerald-700 text-white">
                <tr>
                  <th className="p-3">Name</th>
                  <th className="p-3">View Certificate</th>
                </tr>
              </thead>
              <tbody>
                {certificates.map((cert) => (
                  <tr key={cert.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-800">{cert.name}</td>
                    <td className="p-3">
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
        )}
      </div>
    </div>
  );
}
