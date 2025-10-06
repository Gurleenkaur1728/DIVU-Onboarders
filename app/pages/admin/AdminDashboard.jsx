import { useEffect, useState } from "react";
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
import { supabase } from "../../../src/supabaseClient.js";

export default function AdminDashboard() {
  const role = parseInt(localStorage.getItem("role_id")) || ROLES.ADMIN;

  // States
  const [userCount, setUserCount] = useState(0);
  const [completedModules, setCompletedModules] = useState(0);
  const [pendingFeedback, setPendingFeedback] = useState(0);
  const [loading, setLoading] = useState(true);

  // Dummy chart data (can later be replaced by Supabase queries)
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

  useEffect(() => {
    async function fetchStats() {
      try {
        setLoading(true);

        // Fetch users count
        const { count: userCount, error: userError } = await supabase
          .from("users")
          .select("*", { count: "exact", head: true });
        if (userError) throw userError;

        // Fetch completed modules count
        const { count: completedCount, error: moduleError } = await supabase
          .from("modules")
          .select("*", { count: "exact", head: true })
          .eq("status", "completed");
        if (moduleError) throw moduleError;

        // Fetch pending feedback count
        const { count: feedbackCount, error: feedbackError } = await supabase
          .from("feedback")
          .select("*", { count: "exact", head: true })
          .eq("status", "pending");
        if (feedbackError) throw feedbackError;

        setUserCount(userCount ?? 0);
        setCompletedModules(completedCount ?? 0);
        setPendingFeedback(feedbackCount ?? 0);
      } catch (err) {
        console.error("Error fetching stats:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar active="admin-dashboard" role={role} />

      <main className="flex-1 p-6 space-y-6">
        {/* Header */}
        <h1 className="text-3xl font-extrabold text-white bg-emerald-900/95 border border-emerald-400/70 rounded-xl px-6 py-4 shadow-lg mb-2 tracking-wide drop-shadow-lg">
          Admin Dashboard
        </h1>

        {loading ? (
          <p className="text-emerald-100 text-lg">Loading statistics...</p>
        ) : (
          <>
            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <StatCard title="Total Users" value={userCount} />
              <StatCard title="Completed Modules" value={completedModules} />
              <StatCard title="Pending Feedback" value={pendingFeedback} />
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Bar Chart */}
              <ChartCard title="Active Users (Last 5 Days)">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usersData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#065f46" />
                    <XAxis dataKey="name" stroke="#d1fae5" />
                    <YAxis stroke="#d1fae5" />
                    <Tooltip />
                    <Bar dataKey="users" fill="#34d399" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>

              {/* Pie Chart */}
              <ChartCard title="Modules Status">
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={modulesData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
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
              </ChartCard>
            </div>

            {/* Summary Section */}
            <div className="bg-emerald-900/90 p-6 rounded-lg shadow-lg text-emerald-100 border border-emerald-400/60">
              <h2 className="text-xl font-semibold mb-2">AI Summary</h2>
              <p className="text-emerald-200 leading-relaxed">
                DIVU continues to grow with strong engagement across all modules.
                Keep monitoring completion rates and ensure pending feedbacks
                are resolved promptly for optimal performance.
              </p>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

/* ---- Reusable Small Components ---- */
function StatCard({ title, value }) {
  return (
    <div className="bg-emerald-900/90 p-4 rounded-lg shadow-lg text-emerald-100 border border-emerald-400/60">
      <h2 className="text-lg font-semibold">{title}</h2>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-emerald-900/90 p-4 rounded-lg shadow-lg text-emerald-100 border border-emerald-400/60">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
