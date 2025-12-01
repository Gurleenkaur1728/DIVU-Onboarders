import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../../src/AppLayout.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import { useRole } from "../../../src/lib/hooks/useRole.js";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Gauge,
  SmilePlus,
  Search,
} from "lucide-react";


const COMPLETION_BUCKETS = [
  { key: "0-25", label: "0–25%" },
  { key: "25-50", label: "25–50%" },
  { key: "50-75", label: "50–75%" },
  { key: "75-100", label: "75–100%" },
];

const PIE_COLORS = ["#61e965", "#223b34", "#6060e1",];

/**
 * Helper to get ISO date string N days ago
 */
function daysAgo(num) {
  const d = new Date();
  d.setDate(d.getDate() - num);
  return d.toISOString();
}


export default function ManageProgress() {
  const navigate = useNavigate();
  const { isAdmin } = useRole();

  const [loading, setLoading] = useState(true);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Filters
  const [timeRange, setTimeRange] = useState("30"); // "30" | "90" | "365" | "all"
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);

  // Raw data from Supabase
  const [employees, setEmployees] = useState([]); // users
  const [groupsById, setGroupsById] = useState({});
  const [checklistItems, setChecklistItems] = useState([]); // assigned_checklist_item
  const [moduleProgress, setModuleProgress] = useState([]); // user_module_progress
  const [feedbackRows, setFeedbackRows] = useState([]);

  // Derived analytics
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeEmployees: 0,
    totalTasks: 0,
    completedTasks: 0,
    overdueTasks: 0,
    completionRate: 0,
    avgModuleCompletion: 0,
    completedModules: 0,
    avgFeedback: null,
  });

  const [chartData, setChartData] = useState({
    checklistByGroup: [],
    moduleStatus: [],
    completionBuckets: [],
    completionsOverTime: [],
  });

  // ---- AI Consts ----
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);


  // ---- Role gate ----
  useEffect(() => {
    if (!isAdmin) navigate("/");
  }, [isAdmin, navigate]);

  // ---- Fetch raw data whenever time range changes ----
  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);

      try {
        // time window
        const since =
          timeRange === "all"
            ? null
            : timeRange === "30"
            ? daysAgo(30)
            : timeRange === "90"
            ? daysAgo(90)
            : daysAgo(365);

        // 1) Employees
        const { data: usersData, error: usersError } = await supabase
          .from("users")
          .select(
            "id, first_name, last_name, email, department, position, is_active"
          )
          .order("first_name", { ascending: true });

        if (usersError) throw usersError;

        // 2) Checklist groups (for names)
        const { data: groupsData, error: groupsError } = await supabase
          .from("checklist_groups")
          .select("id, name");

        if (groupsError) throw groupsError;

        // 3) Assigned checklist items (optionally filtered by date)
        let checklistQuery = supabase
          .from("assigned_checklist_item")
          .select(
            "id, user_id, group_id, done, is_overdue, assigned_on, completed_at"
          );

        if (since) {
          checklistQuery = checklistQuery.gte("assigned_on", since);
        }

        const { data: checklistData, error: checklistError } =
          await checklistQuery;

        if (checklistError) throw checklistError;

        // 4) User module progress
        let moduleQuery = supabase
          .from("user_module_progress")
          .select(
            "id, user_id, module_id, completion_percentage, is_completed, completed_at, created_at"
          );

        if (since) {
          moduleQuery = moduleQuery.gte("created_at", since);
        }

        const { data: moduleData, error: moduleError } = await moduleQuery;
        if (moduleError) throw moduleError;

        // 5) Feedback rows
        let feedbackQuery = supabase
          .from("feedback")
          .select(
            "feedback_id, user_id, rating, clarity, difficulty, relevance, submitted_at"
          );

        if (since) {
          feedbackQuery = feedbackQuery.gte("submitted_at", since);
        }

        const { data: feedbackData, error: feedbackError } =
          await feedbackQuery;
        if (feedbackError) throw feedbackError;

        if (cancelled) return;

        setEmployees(usersData || []);
        setGroupsById(
          (groupsData || []).reduce((acc, g) => {
            acc[g.id] = g.name;
            return acc;
          }, {})
        );
        setChecklistItems(checklistData || []);
        setModuleProgress(moduleData || []);
        setFeedbackRows(feedbackData || []);
      } catch (err) {
        console.error("Error loading progress analytics:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    
    loadAll();

    return () => {
      cancelled = true;
    };
  }, [timeRange]);

  // ---- Convenience: filtered employees list for the left panel ----
  const filteredEmployees = useMemo(() => {
    let list = employees;

    if (deptFilter !== "all") {
      list = list.filter((e) => (e.department || "") === deptFilter);
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((e) => {
        const fullName = `${e.first_name || ""} ${e.last_name || ""}`.trim();
        return (
          fullName.toLowerCase().includes(q) ||
          (e.email || "").toLowerCase().includes(q)
        );
      });
    }

    return list;
  }, [employees, deptFilter, search]);

  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // ---- Compute analytics whenever raw data OR selected employee changes ----
  useEffect(() => {
    if (loading) return;
    setLoadingAnalytics(true);

    const scopeUserIds =
      selectedEmployeeId && employees.some((e) => e.id === selectedEmployeeId)
        ? new Set([selectedEmployeeId])
        : new Set(employees.map((e) => e.id));

    // scoped helpers
    const scopedChecklist = checklistItems.filter((c) =>
      scopeUserIds.has(c.user_id)
    );
    const scopedModules = moduleProgress.filter((m) =>
      scopeUserIds.has(m.user_id)
    );
    const scopedFeedback = feedbackRows.filter((f) =>
      scopeUserIds.has(f.user_id)
    );

    // ---- Summary numbers ----
    const totalEmployees = scopeUserIds.size;
    const activeEmployees = employees.filter(
      (e) => scopeUserIds.has(e.id) && e.is_active
    ).length;

    const totalTasks = scopedChecklist.length;
    const completedTasks = scopedChecklist.filter((c) => c.done).length;
    const overdueTasks = scopedChecklist.filter((c) => c.is_overdue).length;
    const completionRate =
      totalTasks === 0
        ? 0
        : Math.round((completedTasks / totalTasks) * 100);

    const completedModules = scopedModules.filter((m) => m.is_completed).length;
    const avgModuleCompletion =
      scopedModules.length === 0
        ? 0
        : Math.round(
            scopedModules.reduce(
              (sum, m) => sum + (m.completion_percentage || 0),
              0
            ) / scopedModules.length
          );

    const avgFeedback =
      scopedFeedback.length === 0
        ? null
        : (
            scopedFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) /
            scopedFeedback.length
          ).toFixed(1);

    setSummary({
      totalEmployees,
      activeEmployees,
      totalTasks,
      completedTasks,
      overdueTasks,
      completionRate,
      avgModuleCompletion,
      completedModules,
      avgFeedback,
    });

    // ---- Checklist by group (stacked bar) ----
    const groupStats = {};
    scopedChecklist.forEach((row) => {
      const groupName = groupsById[row.group_id] || "Other";
      if (!groupStats[groupName]) {
        groupStats[groupName] = {
          group: groupName,
          completed: 0,
          remaining: 0,
          overdue: 0,
        };
      }
      groupStats[groupName].remaining += 1;
      if (row.done) {
        groupStats[groupName].completed += 1;
      }
      if (row.is_overdue) {
        groupStats[groupName].overdue += 1;
      }
    });

    const checklistByGroup = Object.values(groupStats).map((g) => ({
      ...g,
      remaining: Math.max(g.remaining - g.completed, 0),
    }));

    // ---- Module status per module ----
    const moduleStatsMap = {};
    scopedModules.forEach((row) => {
      const key = row.module_id || "Unknown";
      if (!moduleStatsMap[key]) {
        moduleStatsMap[key] = {
          module: String(key).slice(0, 8), // short label; can be replaced with module title if you join modules table
          completed: 0,
          inProgress: 0,
          notStarted: 0,
        };
      }

      if (row.is_completed) {
        moduleStatsMap[key].completed += 1;
      } else if ((row.completion_percentage || 0) > 0) {
        moduleStatsMap[key].inProgress += 1;
      } else {
        moduleStatsMap[key].notStarted += 1;
      }
    });

    const moduleStatus = Object.values(moduleStatsMap);

    // ---- Completion buckets (per employee) ----
    const perUserCompletion = new Map();
    scopedModules.forEach((row) => {
      if (!perUserCompletion.has(row.user_id)) {
        perUserCompletion.set(row.user_id, []);
      }
      perUserCompletion.get(row.user_id).push(row.completion_percentage || 0);
    });

    const bucketCounts = {
      "0-25": 0,
      "25-50": 0,
      "50-75": 0,
      "75-100": 0,
    };

    perUserCompletion.forEach((list) => {
      if (list.length === 0) return;
      const avg =
        list.reduce((sum, v) => sum + v, 0) / Math.max(list.length, 1);

      if (avg < 25) bucketCounts["0-25"] += 1;
      else if (avg < 50) bucketCounts["25-50"] += 1;
      else if (avg < 75) bucketCounts["50-75"] += 1;
      else bucketCounts["75-100"] += 1;
    });

    const completionBuckets = COMPLETION_BUCKETS.map((b, idx) => ({
      range: b.label,
      users: bucketCounts[b.key],
      fill: PIE_COLORS[idx % PIE_COLORS.length],
    }));

    // ---- Completions over time (line) ----
    const byDate = {};

    scopedChecklist.forEach((row) => {
      if (!row.done || !row.completed_at) return;
      const d = new Date(row.completed_at);
      const key = d.toISOString().slice(0, 10);
      byDate[key] = (byDate[key] || 0) + 1;
    });

    scopedModules.forEach((row) => {
      if (!row.is_completed || !row.completed_at) return;
      const d = new Date(row.completed_at);
      const key = d.toISOString().slice(0, 10);
      byDate[key] = (byDate[key] || 0) + 1;
    });

    const completionsOverTime = Object.entries(byDate)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, count }));

    setChartData({
      checklistByGroup,
      moduleStatus,
      completionBuckets,
      completionsOverTime,
    });

    setLoadingAnalytics(false);
  }, [
    loading,
    employees,
    checklistItems,
    moduleProgress,
    feedbackRows,
    groupsById,
    selectedEmployeeId,
  ]);

  const selectedEmployee = employees.find((e) => e.id === selectedEmployeeId);


  
    // AI Module
    async function generateAISummary() {
    try {
      setAiLoading(true);

      const payload = {
        summary,
        selectedEmployee: selectedEmployee
          ? {
              name: `${selectedEmployee.first_name} ${selectedEmployee.last_name}`,
              email: selectedEmployee.email,
              department: selectedEmployee.department,
            }
          : null,
        timeRange,
      };

      // AI Summary backend placeholder call
      const res = await fetch("http://localhost:5050/api/ai/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary, selectedEmployee, timeRange }),
      });

      const data = await res.json();
      setAiSummary(data.summary || "No summary returned.");
    } catch (err) {
      setAiSummary("⚠️ AI summary generation failed.");
      console.error(err);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <AppLayout>
      <div className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 relative">
        <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10 space-y-6">
          {/* Header + filters */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-950 tracking-wide mb-1">
                Employee Progress & Analytics
              </h1>
              <p className="text-emerald-900/80 text-sm md:text-base">
                {selectedEmployee
                  ? `Viewing progress for ${selectedEmployee.first_name} ${selectedEmployee.last_name}`
                  : "Overview across all employees"}
              </p>
            </div>

            <div className="flex flex-wrap gap-2 md:gap-3">
              <TimeRangeButton
                label="Last 30 days"
                value="30"
                current={timeRange}
                onChange={setTimeRange}
              />
              <TimeRangeButton
                label="Last 90 days"
                value="90"
                current={timeRange}
                onChange={setTimeRange}
              />
              <TimeRangeButton
                label="Last year"
                value="365"
                current={timeRange}
                onChange={setTimeRange}
              />
              <TimeRangeButton
                label="All time"
                value="all"
                current={timeRange}
                onChange={setTimeRange}
              />
            </div>
          </div>

          {/* Top summary cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <SummaryCard
              icon={Users}
              label="Employees in view"
              value={summary.totalEmployees}
              helper={`${summary.activeEmployees} active`}
            />
            <SummaryCard
              icon={CheckCircle2}
              label="Checklist completion"
              value={`${summary.completionRate}%`}
              helper={`${summary.completedTasks}/${summary.totalTasks} tasks`}
            />
            <SummaryCard
              icon={AlertTriangle}
              label="Overdue tasks"
              value={summary.overdueTasks}
              helper="Needs attention"
              emphasis="warning"
            />
            <SummaryCard
              icon={Gauge}
              label="Module progress"
              value={`${summary.avgModuleCompletion}%`}
              helper={`${summary.completedModules} modules completed`}
            />
            <SummaryCard
              icon={Activity}
              label="Scope"
              value={selectedEmployee ? "Per-employee" : "All employees"}
              helper={
                selectedEmployee
                  ? selectedEmployee.email
                  : "Click an employee to drill in"
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[320px,minmax(0,1fr)] gap-6">
            {/* Left: Employee selector */}
            <div className="bg-white/95 rounded-2xl shadow-lg border border-emerald-200 flex flex-col">
              <div className="px-4 py-3 border-b border-emerald-100 flex items-center justify-between">
                <h2 className="font-semibold text-emerald-900 text-sm">
                  Employees
                </h2>
                {selectedEmployee && (
                  <button
                    onClick={() => setSelectedEmployeeId(null)}
                    className="text-xs text-emerald-700 hover:underline"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              <div className="p-3 space-y-3">
                {/* Search */}
                <div className="relative">
                  <Search className="w-4 h-4 text-emerald-500 absolute left-2 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm rounded-md border border-emerald-200 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                  />
                </div>

                {/* Department filter */}
                <select
                  value={deptFilter}
                  onChange={(e) => setDeptFilter(e.target.value)}
                  className="w-full text-sm rounded-md border border-emerald-200 px-3 py-1.5 focus:ring-2 focus:ring-emerald-400 focus:outline-none bg-white"
                >
                  <option value="all">All departments</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-emerald-100 flex-1 overflow-y-auto custom-scrollbar max-h-[calc(100vh-260px)]">
                {filteredEmployees.length === 0 ? (
                  <div className="p-4 text-xs text-gray-500 italic">
                    No employees match your filters.
                  </div>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isSelected = emp.id === selectedEmployeeId;
                    const name = `${emp.first_name || ""} ${
                      emp.last_name || ""
                    }`.trim();

                    return (
                      <button
                        key={emp.id}
                        onClick={() =>
                          setSelectedEmployeeId(
                            isSelected ? null : emp.id
                          )
                        }
                        className={`w-full text-left px-4 py-2.5 text-sm border-b border-emerald-50 hover:bg-emerald-50/70 transition flex flex-col gap-0.5 ${
                          isSelected
                            ? "bg-emerald-100/80"
                            : "bg-transparent"
                        }`}
                      >
                        <span className="font-medium text-emerald-900 line-clamp-1">
                          {name || emp.email}
                        </span>
                        <span className="text-xs text-emerald-900/70 line-clamp-1">
                          {emp.email}
                        </span>
                        {emp.department && (
                          <span className="text-[11px] text-emerald-700/80">
                            {emp.department} • {emp.position || "Employee"}
                          </span>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right: charts */}
            <div className="space-y-6">
              {/* Checklist vs modules */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Checklist by group */}
                <AnalyticsCard title="Checklist Completion by Group">
                  {chartData.checklistByGroup.length === 0 ? (
                    <EmptyChartState loading={loadingAnalytics} />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData.checklistByGroup}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#d1fae5"
                        />
                        <XAxis dataKey="group" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="completed"
                          stackId="a"
                          name="Completed"
                          fill="#61e965"
                        />
                        <Bar
                          dataKey="remaining"
                          stackId="a"
                          name="Remaining"  
                          fill="#6060e1"
                        />
                        <Bar
                          dataKey="overdue"
                          stackId="a"
                          name="Overdue"
                          fill="#f97316"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsCard>

                {/* Module statuses */}
                <AnalyticsCard title="Module Status by Module">
                  {chartData.moduleStatus.length === 0 ? (
                    <EmptyChartState loading={loadingAnalytics} />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={chartData.moduleStatus}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#d1fae5"
                        />
                        <XAxis dataKey="module" tick={{ fontSize: 11 }} />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar
                          dataKey="completed"
                          name="Completed"
                          fill="#22c55e"
                        />
                        <Bar
                          dataKey="inProgress"
                          name="In progress"
                          fill="#3b82f6"
                        />
                        <Bar
                          dataKey="notStarted"
                          name="Not started"
                          fill="#e5e7eb"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsCard>
              </div>

              {/* Completion buckets + time series */}
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                {/* Completion distribution */}
                <AnalyticsCard title="Employees by Average Module Completion">
                  {chartData.completionBuckets.length === 0 ? (
                    <EmptyChartState loading={loadingAnalytics} />
                  ) : (
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                      <div className="w-full md:w-1/2 h-56">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={chartData.completionBuckets}
                              dataKey="users"
                              nameKey="range"
                              cx="50%"
                              cy="50%"
                              outerRadius={70}
                              label
                            >
                              {chartData.completionBuckets.map(
                                (e, idx) => (
                                  <Cell
                                    key={e.range}
                                    fill={
                                      PIE_COLORS[idx % PIE_COLORS.length]
                                    }
                                  />
                                )
                              )}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="flex-1 space-y-1">
                        {chartData.completionBuckets.map((b, idx) => (
                          <div
                            key={b.range}
                            className="flex items-center justify-between text-xs text-emerald-950"
                          >
                            <div className="flex items-center gap-2">
                              <span
                                className="inline-block w-3 h-3 rounded-sm"
                                style={{
                                  backgroundColor:
                                    PIE_COLORS[idx % PIE_COLORS.length],
                                }}
                              />
                              <span>{b.range}</span>
                            </div>
                            <span className="font-semibold">
                              {b.users}{" "}
                              <span className="font-normal text-gray-500">
                                employees
                              </span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </AnalyticsCard>

                {/* Completions over time */}
                <AnalyticsCard title="Checklist & Module Completions Over Time">
                  {chartData.completionsOverTime.length === 0 ? (
                    <EmptyChartState loading={loadingAnalytics} />
                  ) : (
                    <ResponsiveContainer width="100%" height={260}>
                      <LineChart data={chartData.completionsOverTime}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#d1fae5"
                        />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 11 }}
                          minTickGap={12}
                        />
                        <YAxis />
                        <Tooltip />
                        <Line
                          type="monotone"
                          dataKey="count"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                          activeDot={{ r: 4 }}
                          name="Completions"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  )}
                </AnalyticsCard>
              </div>

              {/* AI summary placeholder */}
              <AnalyticsCard title="AI Summary">
                <button
                  onClick={generateAISummary}
                  disabled={aiLoading}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm mb-4 hover:bg-emerald-700 disabled:bg-gray-300"
                >
                  {aiLoading ? "Analyzing…" : "Generate AI Summary"}
                </button>

                {aiSummary ? (
                  <div
                    className="prose prose-emerald max-w-none text-gray-800 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: aiSummary }}
                  />
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    No AI summary generated yet.
                  </p>
                )}
              </AnalyticsCard>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

/* ---------- Small components ---------- */

function TimeRangeButton({ label, value, current, onChange }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={() => onChange(value)}
      className={`px-3 py-1.5 rounded-full text-xs md:text-sm font-medium border transition-all ${
        active
          ? "bg-DivuLightGreen text-black border-emerald-700 shadow-sm"
          : "bg-white/90 text-emerald-900 border-emerald-200 hover:bg-DivuBlue hover:text-black"
      }`}
    >
      {label}
    </button>
  );
}

function SummaryCard({ icon: Icon, label, value, helper, emphasis }) {
  const base =
    "rounded-2xl bg-DivuDarkGreen text-emerald-50 px-4 py-3 shadow-md border";
  const border =
    emphasis === "warning"
      ? "border-amber-400/70"
      : "border-emerald-400/70";

  return (
    <div className={`${base} ${border} flex items-center gap-3`}>
      <div className="w-9 h-9 rounded-full bg-DivuLightGreen flex items-center justify-center">
        <Icon className="w-5 h-5 text-black" />
      </div>
      <div className="flex flex-col">
        <span className="text-xs font-semibold text-emerald-100/90">
          {label}
        </span>
        <span className="text-lg font-bold leading-snug">{value}</span>
        {helper && (
          <span className="text-[11px] text-emerald-100/70">{helper}</span>
        )}
      </div>
    </div>
  );
}

function AnalyticsCard({ title, children }) {
  return (
    <div className="bg-white/60 rounded-2xl shadow-lg border border-emerald-200 p-4 md:p-5">
      <h2 className="text-sm md:text-base font-semibold text-emerald-950 mb-3">
        {title}
      </h2>
      {children}
    </div>
  );
}

function EmptyChartState({ loading }) {
  return (
    <div className="flex items-center justify-center h-40 text-sm text-gray-500 italic">
      {loading ? "Computing analytics..." : "Not enough data to display."}
    </div>
  );
}
