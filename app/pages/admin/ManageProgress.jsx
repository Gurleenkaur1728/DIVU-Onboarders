import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from "recharts";

export default function ManageProgress() {
  const summary = {
    totalModules: 6,
    completed: 4,
    inProgress: 1,
    notStarted: 1,
  };

  const barData = [
    { name: "John Doe", progress: 100 },
    { name: "Jane Smith", progress: 75 },
    { name: "David Lee", progress: 45 },
    { name: "Sophia Patel", progress: 20 },
  ];

  const pieData = [
    { name: "Completed", value: summary.completed },
    { name: "In Progress", value: summary.inProgress },
    { name: "Not Started", value: summary.notStarted },
  ];

  const COLORS = ["#34d399", "#fbbf24", "#f87171"];

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar */}
      <Sidebar active="manage-progress" role={ROLES.ADMIN} />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6 space-y-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 shadow">
          <span className="text-emerald-950 font-semibold">
            Admin Panel – View Progress
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-950/90 rounded-md px-4 py-2 text-white font-bold shadow">
          EMPLOYEE PROGRESS
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card label="Total Modules" value={summary.totalModules} />
          <Card label="Completed" value={summary.completed} />
          <Card label="In Progress" value={summary.inProgress} />
          <Card label="Not Started" value={summary.notStarted} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Bar Chart */}
          <div className="bg-emerald-800/60 rounded-lg p-4 shadow text-emerald-100">
            <h3 className="font-bold mb-4">Progress by Employee</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData}>
                <XAxis dataKey="name" stroke="#d1fae5" />
                <YAxis stroke="#d1fae5" />
                <Tooltip />
                <Legend />
                <Bar dataKey="progress" fill="#34d399" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Pie Chart */}
          <div className="bg-emerald-800/60 rounded-lg p-4 shadow text-emerald-100">
            <h3 className="font-bold mb-4">Module Completion Status</h3>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Subcomponents ---------- */
function Card({ label, value }) {
  return (
    <div className="bg-emerald-800/60 rounded-lg p-4 shadow text-center text-emerald-100">
      <p className="text-sm font-semibold text-emerald-200">{label}</p>
      <h2 className="text-2xl font-bold">{value}</h2>
    </div>
  );
}
