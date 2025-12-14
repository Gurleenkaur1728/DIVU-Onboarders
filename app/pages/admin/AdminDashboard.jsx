import { useEffect, useState } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useToast } from "../../context/ToastContext.jsx";

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
import { Bold } from "lucide-react";

const COLORS = ["#61e965", "#6060e1", "#f59e0b"];

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

  const { showToast } = useToast(); // ⭐ REQUIRED for toast system

  useEffect(() => {
    loadAnalytics();
  }, []);

  // ⭐⭐ SEND REMINDERS FUNCTION (added)
  const sendReminders = async () => {
    try {
      const res = await fetch("/api/reminders/sendNow", {
        method: "POST",
      });

      const data = await res.json();

      if (res.ok) {
        showToast(`Sent ${data.sent} reminders!`, "success");
      } else {
        showToast(`Error: ${data.error}`, "error");
      }
    } catch (err) {
      showToast("Backend unreachable", "error");
    }
  };

  // 🔹 Main loader — pulls everything from Supabase
  async function loadAnalytics() {
    try {
      setLoading(true);

      const { data: users, error: usersError } = await supabase
        .from("users")
        .select("id, first_name, last_name, email, role_id, is_active");

      if (usersError) throw usersError;

      const activeUsers = (users || []).filter(
        (u) => u.is_active !== false
      );

      const userIds = activeUsers.map((u) => u.id);

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

      const { data: moduleData, error: moduleError } = await supabase
        .from("user_module_progress")
        .select("user_id, is_completed, completion_percentage, completed_at")
        .in("user_id", userIds);

      if (moduleError) throw moduleError;

      const { data: checklistData, error: checklistError } = await supabase
        .from("assigned_checklist_item")
        .select("user_id, done, is_overdue, completed_at")
        .in("user_id", userIds);

      if (checklistError) throw checklistError;

      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("user_id, rating")
        .in("user_id", userIds);

      if (feedbackError) throw feedbackError;

      setEmployees(activeUsers);
      setModules(moduleData || []);
      setChecklist(checklistData || []);
      setFeedback(feedbackData || []);

      computeStats(activeUsers, moduleData || [], checklistData || [], feedbackData || []);
      computeCharts(moduleData || [], checklistData || []);
    } catch (error) {
      console.error("❌ Error loading admin analytics:", error);

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

  function computeCharts(modules, checklist) {
    const byDate = {};

    checklist.forEach((row) => {
      if (!row.done || !row.completed_at) return;
      const d = row.completed_at.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + 1;
    });

    modules.forEach((row) => {
      if (!row.is_completed || !row.completed_at) return;
      const d = row.completed_at.slice(0, 10);
      byDate[d] = (byDate[d] || 0) + 1;
    });

    const completionsOverTime = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

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
        body: JSON.stringify(payload)
      });


      if (!res.ok) throw new Error(`API returned ${res.status}`);

      const data = await res.json();
      setAiSummary(data.summary || "⚠️ No AI summary returned.");
    } catch (err) {
      console.error("❌ AI Summary Error:", err);
      setAiSummary("⚠️ Failed to generate AI summary.");
    } finally {
      setAiLoading(false);
    }
  }

  function exportChartsCSV() {
  const rows = [];

  // --- Section 1: Completions Over Time ---
  rows.push(["Completions Over Time"]);
  rows.push(["Date", "Count"]);

  charts.completionsOverTime.forEach((item) => {
    rows.push([item.date, item.count]);
  });

  rows.push([]); // blank line to separate sections

  // --- Section 2: Module Completion Breakdown ---
  rows.push(["Module Completion Breakdown"]);
  rows.push(["Status", "Value"]);

  charts.modulePie.forEach((item) => {
    rows.push([item.name, item.value]);
  });

  // Convert to CSV text
  const csvContent =
    "data:text/csv;charset=utf-8," +
    rows.map((r) => r.join(",")).join("\n");

  // Trigger download
  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "divu_charts_export.csv";
  link.click();
}


  return (
    <AppLayout>
      <main
        className="flex-1 min-h-dvh p-6 space-y-6 "
      >
      <div
        className="
          rounded-lg shadow-sm border px-6 py-4 mb-6 flex items-center justify-between transition
          bg-white border-gray-300 text-gray-900
          dark:bg-black/30 dark:border-black dark:text-white
        "
      >
          
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Admin Dashboard - Overview
          </h1>

          {/* Export CSV Button (same styling as ManageProgress) */}
            <button
              onClick={exportChartsCSV}
              className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border 
                        bg-black text-white border-DivuDarkGreen 
                        hover:bg-DivuBlue hover:text-black transition-all"
            >
              Export CSV
            </button>
        </div>

        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard label="Total Employees" value={loading ? "…" : stats.totalEmployees} />
          <StatCard label="Completed Modules" value={loading ? "…" : stats.completedModules} />
          <StatCard label="Overdue Tasks" value={loading ? "…" : stats.overdueTasks} />
          <StatCard label="Avg. Feedback" value={loading ? "…" : stats.avgRating} />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ChartCard title="Completions Over Time">
            {loading ? (
              <p className="text-gray-600 italic">Loading chart…</p>
            ) : charts.completionsOverTime.length === 0 ? (
              <p className="text-gray-600 italic">No completions recorded yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={charts.completionsOverTime}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "grey",
                      border: "1px solid #e5e7eb",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="count" fill="#61e965" stroke="#223b34" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>

          <ChartCard title="Module Completion Breakdown">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={charts.modulePie} dataKey="value" cx="50%" cy="50%" outerRadius={80} label>
                  {charts.modulePie.map((entry, index) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} stroke="#223b34" fontWeight="bold" />
                  ))}
                </Pie>
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* AI Summary */}
        <div
          className="
            p-6 rounded-lg shadow-sm border transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/60 dark:border-DivuLightGreen dark:text-white
          "
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">AI Summary</h2>
          <button
            onClick={generateAISummary}
            disabled={aiLoading || loading}
            className="px-4 py-2 bg-DivuDarkGreen hover:bg-DivuBlue disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg mb-4 transition-colors"
          >
            {aiLoading ? "Analyzing…" : "Generate AI Summary"}
          </button>

          {aiSummary ? (
            <div
              className="prose max-w-none text-gray-900 dark:text-white"
              dangerouslySetInnerHTML={{ __html: aiSummary }}
            />
          ) : (
            <p className="text-gray-600 dark:text-gray-300 italic">
              {loading
                ? "Loading data…"
                : "No AI summary generated yet. Click the button above to create one."}
            </p>
          )}
        </div>

        {/* ⭐⭐ SEND REMINDERS BUTTON SECTION ⭐⭐ */}
        <div
          className="
            p-6 rounded-lg shadow-sm border transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/60 dark:border-DivuLightGreen dark:text-white
          "
        >
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Send Email Reminders</h2>

          <button
            onClick={sendReminders}
            className="bg-DivuDarkGreen hover:bg-DivuBlue px-5 py-2 rounded-lg text-white shadow-sm transition-colors"
          >
            Send Reminders Now
          </button>
        </div>
      </main>
    </AppLayout>
  );
}

// Small reusable components
function StatCard({ label, value }) {
  return (
    <div
      className="
        rounded-lg p-5 shadow-sm border transition
        bg-white border-gray-300 text-gray-900
        dark:bg-DivuDarkGreen/70 dark:border-black dark:text-white
      "
    >
      <h2 className="text-sm font-bold mb-1 text-gray-900 dark:text-white">{label}</h2> 
      <p className="text-3xl font-bold text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}


function ChartCard({ title, children }) {
  return (
    <div
      className="
        rounded-lg p-6 shadow-sm border transition
        bg-white border-gray-300 text-gray-900
        dark:bg-black/60 dark:border-DivuDarkGreen dark:text-white
      "
    >
      <h2 className="font-semibold mb-4">{title}</h2>
      {children}
    </div>
  );
}
