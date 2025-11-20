import { useEffect, useState } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";

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

const COLORS = ["#61e965", "#3b82f6", "#ff3f34"];

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState("");

  const [employees, setEmployees] = useState([]);
  const [modules, setModules] = useState([]);
  const [checklist, setChecklist] = useState([]);
  const [feedback, setFeedback] = useState([]);

  const [stats, setStats] = useState({
    totalEmployees: 0,
    completedModules: 0,
    overdueTasks: 0,
    avgRating: 0,
  });

  const [charts, setCharts] = useState({
    completionsOverTime: [],
    modulePie: [],
  });

  useEffect(() => {
    loadAnalytics();
  }, []);

  // 🔹 Main loader – pulls everything from Supabase
  async function loadAnalytics() {
    try {
      setLoading(true);

      // 1️⃣ Employees (non-admin users)
      // Your users table has `role_id`, not `role`. We'll just grab everyone
      // and let you filter by role_id later if needed. :contentReference[oaicite:1]{index=1}
      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role_id, is_active");

      if (usersError) throw usersError;

      // (Optional) only active employees
      const activeUsers = (users || []).filter(
        (u) => u.is_active !== false // treat null as active
      );

      const userIds = activeUsers.map((u) => u.id);

      // If there are no employees yet, bail early with zeros
      if (userIds.length === 0) {
        setEmployees([]);
        setModules([]);
        setChecklist([]);
        setFeedback([]);
        setStats({
          totalEmployees: 0,
          completedModules: 0,
          overdueTasks: 0,
          avgRating: 0,
        });
        setCharts({ completionsOverTime: [], modulePie: [] });
        return;
      }

      // 2️⃣ Module progress
      const { data: moduleData, error: moduleError } = await supabase
        .from("user_module_progress")
        .select("user_id, is_completed, completion_percentage, completed_at")
        .in("user_id", userIds);

      if (moduleError) throw moduleError;

      // 3️⃣ Checklist items
      const { data: checklistData, error: checklistError } = await supabase
        .from("assigned_checklist_item")
        .select("user_id, done, is_overdue, completed_at")
        .in("user_id", userIds);

      if (checklistError) throw checklistError;

      // 4️⃣ Feedback (per-item ratings)
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("user_id, rating")
        .in("user_id", userIds);

      if (feedbackError) throw feedbackError;

      // Store raw data
      setEmployees(activeUsers);
      setModules(moduleData || []);
      setChecklist(checklistData || []);
      setFeedback(feedbackData || []);

      // Derive stats + charts
      computeStats(activeUsers, moduleData || [], checklistData || [], feedbackData || []);
      computeCharts(moduleData || [], checklistData || []);
    } catch (error) {
      console.error("❌ Error loading admin analytics:", error);
      // On error, keep zeros to avoid crashing UI
      setEmployees([]);
      setModules([]);
      setChecklist([]);
      setFeedback([]);
      setStats({
        totalEmployees: 0,
        completedModules: 0,
        overdueTasks: 0,
        avgRating: 0,
      });
      setCharts({ completionsOverTime: [], modulePie: [] });
    } finally {
      setLoading(false);
    }
  }

  // 🔹 High-level KPI numbers
  function computeStats(users, modules, checklist, feedback) {
    const totalEmployees = users.length;

    const completedModules = modules.filter((m) => m.is_completed).length;

    const overdueTasks = checklist.filter((c) => c.is_overdue).length;

    const ratings = feedback
      .map((f) => f.rating)
      .filter((r) => typeof r === "number" && !Number.isNaN(r));

    const avgRating =
      ratings.length > 0
        ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1)
        : 0;

    setStats({ totalEmployees, completedModules, overdueTasks, avgRating });
  }

  // 🔹 Chart data (time series + pie breakdown)
  function computeCharts(modules, checklist) {
    const byDate = {};

    // Checklist completions per day
    checklist.forEach((row) => {
      if (!row.done || !row.completed_at) return;
      const d = row.completed_at.slice(0, 10); // YYYY-MM-DD
      byDate[d] = (byDate[d] || 0) + 1;
    });

    // Module completions per day
    modules.forEach((row) => {
      if (!row.is_completed || !row.completed_at) return;
      const d = row.completed_at.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + 1;
    });

    const completionsOverTime = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    // Pie: completed / in-progress / pending modules
    const completed = modules.filter((m) => m.is_completed).length;
    const inProgress = modules.filter(
      (m) => !m.is_completed && (m.completion_percentage || 0) > 0
    ).length;
    const pending = modules.filter(
      (m) => (m.completion_percentage || 0) === 0
    ).length;

    const modulePie = [
      { name: "Completed", value: completed },
      { name: "In Progress", value: inProgress },
      { name: "Pending", value: pending },
    ];

    setCharts({ completionsOverTime, modulePie });
  }

  // 🔹 AI summary based on live stats/charts
  async function generateAISummary() {
    try {
      setAiLoading(true);

      const payload = {
        stats,
        charts,
        employeeCount: employees.length,
        context: "admin_global_summary",
      };

      const res = await fetch("http://localhost:5050/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      setAiSummary(data.summary || "⚠️ No AI summary returned.");
    } catch (err) {
      console.error("❌ AI Summary Error:", err);
      setAiSummary("⚠️ Failed to generate AI summary.");
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <AppLayout>
      <main
        className="flex-1 min-h-dvh p-6 space-y-6 bg-gradient-to-br 
        from-emerald-50 to-green-100/60 bg-cover bg-center"
        style={{ backgroundImage: "url('/bg.png')" }}
      >
        <h1 className="text-3xl font-extrabold text-white bg-DivuDarkGreen border border-DivuLightGreen rounded-xl px-6 py-4 shadow-lg tracking-wide">
          Admin Dashboard
        </h1>

        {/* Top-level stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Employees"
            value={loading ? "…" : stats.totalEmployees}
          />
          <StatCard
            label="Completed Modules"
            value={loading ? "…" : stats.completedModules}
          />
          <StatCard
            label="Overdue Tasks"
            value={loading ? "…" : stats.overdueTasks}
          />
          <StatCard
            label="Avg. Feedback"
            value={loading ? "…" : stats.avgRating}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Completions Over Time">
            {loading ? (
              <p className="text-emerald-100 italic">Loading chart…</p>
            ) : charts.completionsOverTime.length === 0 ? (
              <p className="text-emerald-100 italic">
                No completions recorded yet.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.completionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#065f46" />
                  <XAxis dataKey="date" stroke="#d1fae5" />
                  <YAxis stroke="#d1fae5" />
                  <Tooltip />
                  <Bar dataKey="count" fill="#61e965" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Module Completion Breakdown">
            {loading ? (
              <p className="text-emerald-100 italic">Loading chart…</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={charts.modulePie}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label
                  >
                    {charts.modulePie.map((entry, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* AI Summary */}
        <div className="bg-DivuBlue p-6 rounded-lg shadow-lg text-black border border-emerald-400/60">
          <h2 className="text-xl font-semibold mb-4">AI Summary</h2>
          <button
            onClick={generateAISummary}
            disabled={aiLoading || loading}
            className="px-4 py-2 bg-DivuLightGreen hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-black rounded-lg mb-4"
          >
            {aiLoading ? "Analyzing…" : "Generate AI Summary"}
          </button>

          {aiSummary ? (
            <div
              className="prose prose-invert max-w-none text-emerald-50"
              dangerouslySetInnerHTML={{ __html: aiSummary }}
            />
          ) : (
            <p className="text-white italic">
              {loading
                ? "Loading data…"
                : "No AI summary generated yet. Click the button above to create one."}
            </p>
          )}
        </div>
      </main>
    </AppLayout>
  );
}

// Small reusable components
function StatCard({ label, value }) {
  return (
    <div className="bg-DivuLightGreen/60 rounded-2xl shadow-lg border border-emerald-200 p-4 md:p-5">
      <h2 className="text-lg font-semibold">{label}</h2>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="bg-DivuDarkGreen p-4 rounded-lg shadow-lg text-emerald-100 border border-emerald-400/60">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}
