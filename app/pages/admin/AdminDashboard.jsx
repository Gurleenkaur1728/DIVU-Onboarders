// src/admin/AdminDashboard.jsx
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

export default function AdminDashboard() {
  // Dummy chart data
  const usersData = [
    { name: "Mon", users: 30 },
    { name: "Tue", users: 50 },
    { name: "Wed", users: 45 },
    { name: "Thu", users: 70 },
    { name: "Fri", users: 90 },
  ];

  const modulesData = [
    { name: "Completed", value: 65 },
    { name: "In Progress", value: 25 },
    { name: "Pending", value: 10 },
  ];
  const COLORS = ["#34d399", "#fbbf24", "#ef4444"];

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Use role constant instead of string */}
      <Sidebar active="admin-dashboard" role={ROLES.ADMIN} />

      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <h1 className="text-2xl font-bold text-emerald-100">Admin Dashboard</h1>

        {/* Stat cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-800/60 p-4 rounded-lg shadow text-emerald-100">
            <h2 className="text-lg font-semibold">Total Users</h2>
            <p className="text-2xl font-bold">120</p>
          </div>
          <div className="bg-emerald-800/60 p-4 rounded-lg shadow text-emerald-100">
            <h2 className="text-lg font-semibold">Completed Modules</h2>
            <p className="text-2xl font-bold">340</p>
          </div>
          <div className="bg-emerald-800/60 p-4 rounded-lg shadow text-emerald-100">
            <h2 className="text-lg font-semibold">Pending Feedback</h2>
            <p className="text-2xl font-bold">15</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Bar Chart */}
          <div className="bg-emerald-800/60 p-4 rounded-lg shadow text-emerald-100">
            <h2 className="font-semibold mb-2">Active Users (Last 5 Days)</h2>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={usersData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#065f46" />
                <XAxis dataKey="name" stroke="#d1fae5" />
                <YAxis stroke="#d1fae5" />
                <Tooltip />
                <Bar dataKey="users" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-emerald-800/60 p-4 rounded-lg shadow text-emerald-100">
            <h2 className="font-semibold mb-2">Modules Status</h2>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={modulesData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#10b981"
                  label
                >
                  {modulesData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORS[index % COLORS.length]}
                    />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* AI Summary */}
        <div className="bg-emerald-800/60 p-6 rounded-lg shadow text-emerald-100">
          <h2 className="text-xl font-semibold mb-2">AI Power Summary</h2>
          <p className="text-emerald-200">
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus vel
            lectus nec nulla convallis ultricies. Proin sit amet malesuada eros.
          </p>
        </div>
      </main>
    </div>
  );
}
