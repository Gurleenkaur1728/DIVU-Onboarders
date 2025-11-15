import { useEffect, useMemo, useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { supabase } from "../../../src/lib/supabaseClient.js";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

const TABS = {
  OVERVIEW: "overview",
  COMPLETION: "completion",
  ENGAGEMENT: "engagement",
  FEEDBACK: "feedback",
};

const COLORS = ["#10b981", "#22c55e", "#06b6d4", "#f97316", "#6366f1"];

export default function Analytics() {
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);

  // shared state
  const [loadingProgress, setLoadingProgress] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);
  const [progressData, setProgressData] = useState([]); // rows from user_module_progress
  const [feedbackData, setFeedbackData] = useState([]); // rows from feedback
  const [notice, setNotice] = useState("");

  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);
  const [hasLoadedFeedback, setHasLoadedFeedback] = useState(false);

  const [roleId] = useState(() => {
    const r = localStorage.getItem("role_id");
    return r ? Number(r) : ROLES.SUPER_ADMIN;
  });

  // --- LOADERS -------------------------------------------------------------

  const loadProgress = async () => {
    if (loadingProgress || hasLoadedProgress) return;
    setLoadingProgress(true);
    setNotice("");

    const { data, error } = await supabase
      .from("user_module_progress")
      .select(
        "id, user_id, module_id, completion_percentage, is_completed, created_at, completed_at"
      );

    if (error) {
      console.error(error);
      setNotice(`Could not load progress data: ${error.message}`);
    } else {
      setProgressData(data || []);
      setHasLoadedProgress(true);
    }

    setLoadingProgress(false);
  };

  const loadFeedback = async () => {
    if (loadingFeedback || hasLoadedFeedback) return;
    setLoadingFeedback(true);
    setNotice("");

    const { data, error } = await supabase
      .from("feedback")
      .select(
        "feedback_id, user_id, module_id, module_name, rating, clarity, difficulty, relevance, submitted_at"
      );

    if (error) {
      console.error(error);
      setNotice(`Could not load feedback data: ${error.message}`);
    } else {
      setFeedbackData(data || []);
      setHasLoadedFeedback(true);
    }

    setLoadingFeedback(false);
  };

  // Lazy-load based on active tab
  useEffect(() => {
    if (
      [TABS.OVERVIEW, TABS.COMPLETION, TABS.ENGAGEMENT].includes(activeTab) &&
      !hasLoadedProgress
    ) {
      loadProgress();
    }

    if (activeTab === TABS.FEEDBACK && !hasLoadedFeedback) {
      loadFeedback();
    }
  }, [activeTab]);

  // --- DERIVED METRICS (useMemo) ------------------------------------------

  const overviewStats = useMemo(() => {
    if (!progressData.length) {
      return {
        totalRecords: 0,
        uniqueUsers: 0,
        uniqueModules: 0,
        avgCompletion: 0,
        completedCount: 0,
        inProgressCount: 0,
      };
    }

    const totalRecords = progressData.length;
    const userSet = new Set(progressData.map((p) => p.user_id));
    const moduleSet = new Set(progressData.map((p) => p.module_id));

    const completedCount = progressData.filter((p) => p.is_completed).length;
    const inProgressCount = totalRecords - completedCount;

    const avgCompletion =
      totalRecords === 0
        ? 0
        : progressData.reduce(
            (sum, p) => sum + (Number(p.completion_percentage) || 0),
            0
          ) / totalRecords;

    return {
      totalRecords,
      uniqueUsers: userSet.size,
      uniqueModules: moduleSet.size,
      avgCompletion: Number(avgCompletion.toFixed(1)),
      completedCount,
      inProgressCount,
    };
  }, [progressData]);

  const completionByModule = useMemo(() => {
    if (!progressData.length) return [];

    const byModule = new Map();
    for (const row of progressData) {
      const key = row.module_id || "Unknown";
      if (!byModule.has(key)) {
        byModule.set(key, {
          module_id: key,
          records: 0,
          sumCompletion: 0,
          completedCount: 0,
        });
      }
      const entry = byModule.get(key);
      entry.records += 1;
      entry.sumCompletion += Number(row.completion_percentage) || 0;
      if (row.is_completed) entry.completedCount += 1;
    }

    return Array.from(byModule.values()).map((m, idx) => ({
      name: `Module ${idx + 1}`, // you can swap for real module name later
      avgCompletion: Number((m.sumCompletion / m.records).toFixed(1)),
      completedCount: m.completedCount,
    }));
  }, [progressData]);

  const completionOverTime = useMemo(() => {
    if (!progressData.length) return [];

    const byDay = new Map(); // date (YYYY-MM-DD) -> count
    for (const row of progressData) {
      if (!row.completed_at) continue;
      const d = new Date(row.completed_at);
      if (Number.isNaN(d.getTime())) continue;
      const key = d.toISOString().slice(0, 10);
      byDay.set(key, (byDay.get(key) || 0) + 1);
    }

    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, count]) => ({ date, completed: count }));
  }, [progressData]);

  const feedbackSummary = useMemo(() => {
    if (!feedbackData.length) {
      return {
        count: 0,
        avgRating: 0,
        clarity: 0,
        difficulty: 0,
        relevance: 0,
      };
    }

    const n = feedbackData.length;
    const sum = feedbackData.reduce(
      (acc, f) => {
        acc.rating += f.rating || 0;
        acc.clarity += f.clarity || 0;
        acc.difficulty += f.difficulty || 0;
        acc.relevance += f.relevance || 0;
        return acc;
      },
      { rating: 0, clarity: 0, difficulty: 0, relevance: 0 }
    );

    return {
      count: n,
      avgRating: Number((sum.rating / n).toFixed(1)),
      clarity: Number((sum.clarity / n).toFixed(1)),
      difficulty: Number((sum.difficulty / n).toFixed(1)),
      relevance: Number((sum.relevance / n).toFixed(1)),
    };
  }, [feedbackData]);

  const avgFeedbackPerModule = useMemo(() => {
    if (!feedbackData.length) return [];
    const byModule = new Map();

    for (const f of feedbackData) {
      const key = f.module_name || f.module_id || "Unknown module";
      if (!byModule.has(key)) {
        byModule.set(key, { module: key, sumRating: 0, count: 0 });
      }
      const entry = byModule.get(key);
      entry.sumRating += f.rating || 0;
      entry.count += 1;
    }

    return Array.from(byModule.values())
      .map((m) => ({
        module: m.module,
        avgRating: Number((m.sumRating / m.count).toFixed(1)),
      }))
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [feedbackData]);

  // --- RENDER --------------------------------------------------------------

  const isLoadingCurrentTab =
    (loadingProgress &&
      [TABS.OVERVIEW, TABS.COMPLETION, TABS.ENGAGEMENT].includes(
        activeTab
      )) ||
    (loadingFeedback && activeTab === TABS.FEEDBACK);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={roleId} active="analytics" />

      <div className="flex-1 flex flex-col p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 shadow">
          <span className="text-emerald-950 font-semibold">
            Analytics & Reports
          </span>
        </div>

        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl shadow text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          ANALYSIS DASHBOARD
        </div>

        {notice && (
          <div className="px-4 py-2 bg-amber-50 text-amber-900 border border-amber-300 rounded">
            {notice}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-2">
          <TabButton
            label="Overview"
            active={activeTab === TABS.OVERVIEW}
            onClick={() => setActiveTab(TABS.OVERVIEW)}
          />
          <TabButton
            label="Completion"
            active={activeTab === TABS.COMPLETION}
            onClick={() => setActiveTab(TABS.COMPLETION)}
          />
          <TabButton
            label="Engagement"
            active={activeTab === TABS.ENGAGEMENT}
            onClick={() => setActiveTab(TABS.ENGAGEMENT)}
          />
          <TabButton
            label="Feedback"
            active={activeTab === TABS.FEEDBACK}
            onClick={() => setActiveTab(TABS.FEEDBACK)}
          />
        </div>

        {isLoadingCurrentTab && (
          <div className="text-sm text-emerald-900 bg-emerald-50 border border-emerald-200 rounded px-3 py-2 inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Loading data…
          </div>
        )}

        {/* Tab content */}
        <div className="flex-1">
          {activeTab === TABS.OVERVIEW && (
            <OverviewTab
              overviewStats={overviewStats}
              feedbackSummary={feedbackSummary}
            />
          )}

          {activeTab === TABS.COMPLETION && (
            <CompletionTab
              overviewStats={overviewStats}
              completionByModule={completionByModule}
            />
          )}

          {activeTab === TABS.ENGAGEMENT && (
            <EngagementTab completionOverTime={completionOverTime} />
          )}

          {activeTab === TABS.FEEDBACK && (
            <FeedbackTab
              feedbackSummary={feedbackSummary}
              avgFeedbackPerModule={avgFeedbackPerModule}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* TABS CONTENT                                                       */
/* ------------------------------------------------------------------ */

function OverviewTab({ overviewStats, feedbackSummary }) {
  const pieData = [
    { name: "Completed", value: overviewStats.completedCount },
    { name: "In Progress", value: overviewStats.inProgressCount },
  ];

  return (
    <div className="space-y-6 mt-2">
      {/* AI Summary placeholder */}
      <section className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
        <h3 className="font-semibold text-emerald-900 mb-1">Summary</h3>
        <p className="text-sm text-emerald-800/90 leading-relaxed">
          This is a placeholder for the future AI-generated summary. It will
          highlight key insights such as completion trends, modules that need
          attention, and patterns in employee feedback.
        </p>
      </section>

      {/* KPI cards */}
      <section className="grid md:grid-cols-4 gap-4">
        <KpiCard
          label="Employees with activity"
          value={overviewStats.uniqueUsers}
        />
        <KpiCard
          label="Modules tracked"
          value={overviewStats.uniqueModules}
        />
        <KpiCard
          label="Avg. completion %"
          value={`${overviewStats.avgCompletion}%`}
        />
        <KpiCard
          label="Feedback entries"
          value={feedbackSummary.count}
        />
      </section>

      {/* Completion pie + rating bar */}
      <section className="grid md:grid-cols-2 gap-6">
        <div className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
          <h3 className="font-semibold text-emerald-900 mb-3">
            Completion Status Split
          </h3>
          {overviewStats.completedCount + overviewStats.inProgressCount ===
          0 ? (
            <p className="text-sm text-gray-500">No progress data yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    innerRadius={60}
                    outerRadius={85}
                    dataKey="value"
                    paddingAngle={3}
                  >
                    {pieData.map((_, idx) => (
                      <Cell
                        key={idx}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
          <h3 className="font-semibold text-emerald-900 mb-3">
            Average Feedback (1–5)
          </h3>
          {feedbackSummary.count === 0 ? (
            <p className="text-sm text-gray-500">No feedback yet.</p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    {
                      metric: "Overall rating",
                      value: feedbackSummary.avgRating,
                    },
                    {
                      metric: "Clarity",
                      value: feedbackSummary.clarity,
                    },
                    {
                      metric: "Difficulty",
                      value: feedbackSummary.difficulty,
                    },
                    {
                      metric: "Relevance",
                      value: feedbackSummary.relevance,
                    },
                  ]}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="metric" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function CompletionTab({ overviewStats, completionByModule }) {
  return (
    <div className="space-y-6 mt-2">
      {/* quick stats */}
      <section className="grid md:grid-cols-3 gap-4">
        <KpiCard
          label="Total records"
          value={overviewStats.totalRecords}
        />
        <KpiCard
          label="Completed checklists"
          value={overviewStats.completedCount}
        />
        <KpiCard
          label="In-progress checklists"
          value={overviewStats.inProgressCount}
        />
      </section>

      {/* completion by module */}
      <section className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
        <h3 className="font-semibold text-emerald-900 mb-3">
          Average Completion by Module
        </h3>
        {completionByModule.length === 0 ? (
          <p className="text-sm text-gray-500">No module data yet.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={completionByModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Bar
                  dataKey="avgCompletion"
                  name="Avg % complete"
                  fill="#10b981"
                />
                <Bar
                  dataKey="completedCount"
                  name="# completed"
                  fill="#06b6d4"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function EngagementTab({ completionOverTime }) {
  return (
    <div className="space-y-6 mt-2">
      <section className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
        <h3 className="font-semibold text-emerald-900 mb-3">
          Completions Over Time
        </h3>
        {completionOverTime.length === 0 ? (
          <p className="text-sm text-gray-500">
            No completion dates recorded yet.
          </p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionOverTime}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="completed"
                  name="Completed"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

function FeedbackTab({ feedbackSummary, avgFeedbackPerModule }) {
  return (
    <div className="space-y-6 mt-2">
      {/* top-line cards */}
      <section className="grid md:grid-cols-4 gap-4">
        <KpiCard label="Feedback entries" value={feedbackSummary.count} />
        <KpiCard
          label="Avg rating"
          value={feedbackSummary.avgRating || "-"}
        />
        <KpiCard
          label="Avg clarity"
          value={feedbackSummary.clarity || "-"}
        />
        <KpiCard
          label="Avg relevance"
          value={feedbackSummary.relevance || "-"}
        />
      </section>

      {/* module ratings */}
      <section className="bg-white/95 rounded-xl shadow border border-emerald-100 p-5">
        <h3 className="font-semibold text-emerald-900 mb-3">
          Average Rating by Module
        </h3>
        {avgFeedbackPerModule.length === 0 ? (
          <p className="text-sm text-gray-500">No feedback data yet.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={avgFeedbackPerModule}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="module"
                  tick={{ fontSize: 10 }}
                  interval={0}
                />
                <YAxis domain={[0, 5]} />
                <Tooltip />
                <Bar dataKey="avgRating" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* SMALL COMPONENTS                                                   */
/* ------------------------------------------------------------------ */

function TabButton({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all duration-200 ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700/80 hover:scale-105"
      }`}
    >
      {label}
    </button>
  );
}

function KpiCard({ label, value }) {
  return (
    <div className="bg-white/95 border border-emerald-100 rounded-xl shadow-sm px-4 py-3 flex flex-col gap-1">
      <span className="text-xs uppercase tracking-wide text-emerald-500">
        {label}
      </span>
      <span className="text-xl font-semibold text-emerald-950">
        {value}
      </span>
    </div>
  );
}
