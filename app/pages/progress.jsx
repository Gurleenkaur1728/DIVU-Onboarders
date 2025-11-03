import { useState, useEffect } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabaseClient.js";
import { motion } from "framer-motion";


export default function Progress() {
  const [activeTab, setActiveTab] = useState("progress");
  const [chartData, setChartData] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [userXP, setUserXP] = useState(0);
  const [userLevel, setUserLevel] = useState(1);
  const [streakDays, setStreakDays] = useState(0);
  const [achievements, setAchievements] = useState([]);

  const COLORS = ["#22c55e", "#3b82f6", "#ef4444"]; // green, blue, red

  useEffect(() => {
    loadProgress();
    const interval = setInterval(loadProgress, 15000); // Auto refresh every 15 seconds
    return () => clearInterval(interval);
  }, []);
  useEffect(() => {
  async function getAuthUser() {
    const { data, error } = await supabase.auth.getUser();
    console.log("Auth UID:", data?.user?.id, "Error:", error);
  }
  getAuthUser();
}, []);


  async function loadProgress() {
    try {
      const userId = localStorage.getItem("profile_id");
      if (!userId) {
        console.warn("⚠️ No user ID found in localStorage.");
        return;
      }

      // ✅ Fetch completed modules (certificates)
      const { data: certs, error: certError } = await supabase
        .from("certificates")
        .select("id, title, issue_date")
        .eq("user_id", userId);

      if (certError) throw certError;
      setCertificates(certs || []);

      // ✅ Fetch checklist progress (completed tasks)
      const { data: tasks, error: taskError } = await supabase
        .from("assigned_checklist_item")
        .select("done")
        .eq("user_id", userId);

      if (taskError) throw taskError;
      const completedTasks = tasks?.filter((t) => t.done)?.length || 0;
      const totalTasks = tasks?.length || 0;

      // ✅ Fetch XP, Level, and Streak from users
      const { data: user, error: userError } = await supabase
        .from("users")
        .select("xp, level, streak_days, last_login") // ✅ UPDATED (fetch last_login)
        .eq("id", userId)
        .single();

      if (userError) console.warn("User data fetch error:", userError);

      // ✅ Updated logic to calculate streak dynamically (in case backend didn't update)
      let streak = user?.streak_days || 0;
      if (user?.last_login) {
        const lastLogin = new Date(user.last_login);
        const diffDays = Math.floor((new Date() - lastLogin) / (1000 * 60 * 60 * 24));
        if (diffDays === 0) {
          streak = user?.streak_days;
        } else if (diffDays === 1) {
          streak = user?.streak_days + 1;
        } else if (diffDays > 1) {
          streak = 1;
        }
      }

      setUserXP(user?.xp || 0);
      setUserLevel(user?.level || 1);
      setStreakDays(streak); // ✅ UPDATED

      // ✅ Calculate totals
      const totalModules = 10; // Static total (or replace with dynamic if needed)
      const completedModules = certs?.length || 0;
      const overallIncomplete =
        totalTasks + totalModules - (completedTasks + completedModules);

      // ✅ Update chart data
      setChartData([
        { name: "Completed Tasks", value: completedTasks, color: "#22c55e" },
        { name: "Completed Modules", value: completedModules, color: "#3b82f6" },
        { name: "Overall Incomplete", value: overallIncomplete, color: "#ef4444" },
      ]);

      // ✅ Updated Achievements logic
      const badges = [];
      if (completedModules >= 1)
        badges.push({
          id: 1,
          badge_name: "First Module Complete",
          earned_at: new Date(),
        });
      if (completedModules >= 5)
        badges.push({
          id: 2,
          badge_name: "Fast Learner",
          earned_at: new Date(),
        });
      if (streak >= 3)
        badges.push({
          id: 3,
          badge_name: "3-Day Streak",
          earned_at: new Date(),
        });
      setAchievements(badges);
    } catch (err) {
      console.error("❌ Error loading progress:", err.message);
    }
  }

  const xpPercent = ((userXP % 100) / 100) * 100;

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
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
              activeTab === "progress"
                ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                : "bg-white text-emerald-800 hover:bg-gray-100"
            }`}
          >
            Progress Rate
          </button>
          <button
            onClick={() => setActiveTab("certificates")}
            className={`px-6 py-2 rounded-full font-semibold transition-all duration-200 ${
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
          <>
            {/* Chart Section */}
            <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
              <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
                Total Tasks and Modules:{" "}
                {chartData.reduce((a, b) => a + b.value, 0)}
              </h2>

              <div className="flex flex-col md:flex-row items-center justify-center gap-10">
                {/* Legend */}
                <div className="space-y-3 text-emerald-900 text-base">
                  {chartData.map((item, idx) => (
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
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </div>
              </div>
            </div>

            {/* Gamification Summary */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* XP + Level */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl shadow-lg p-6 text-center border border-emerald-200">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">
                  Your XP Level
                </h3>
                <p className="text-2xl font-extrabold text-emerald-700">
                  {userXP} XP
                </p>
                <div className="w-full mt-3 bg-gray-200 h-2 rounded-full overflow-hidden">
  <motion.div
    className="bg-emerald-600 h-2 rounded-full"
    initial={{ width: 0 }}
    animate={{ width: `${xpPercent}%` }}
    transition={{ duration: 1.2, ease: "easeOut" }}
  />
</div>

                <p className="text-sm text-gray-500 mt-2">
                  Level {userLevel} — {100 - (userXP % 100)} XP to next level
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">
                  Achievements
                </h3>
                {achievements.length === 0 ? (
                  <p className="text-gray-500 text-sm">
                    No badges yet. Keep going!
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {achievements.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 bg-white p-3 rounded-md border border-emerald-200 hover:shadow transition-all"
                      >
                        <span role="img" aria-label="badge">
                          🏅
                        </span>
                        <div>
                          <p className="text-sm font-semibold">{a.badge_name}</p>
                          <p className="text-xs text-gray-500">
                            {new Date(a.earned_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Streak */}
              <div className="bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl shadow-lg p-6 text-center border border-emerald-200">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">
                  Streak
                </h3>
                <p className="text-4xl font-extrabold text-emerald-600">
                  🔥 {streakDays} Days
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  You’ve logged in consistently for {streakDays} days!
                </p>
              </div>
            </div>
          </>
        )}

        {/* 🟩 Certificates Tab */}
        {activeTab === "certificates" && (
          <div className="bg-gradient-to-br from-emerald-50 via-green-50 to-emerald-100 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
            <h2 className="text-2xl md:text-3xl font-extrabold text-emerald-950 mb-8 flex items-center gap-3">
              <span>🏅</span> Certificates of Completion
            </h2>

            {certificates.length === 0 ? (
              <div className="text-center text-gray-600 py-12">
                <p className="text-lg font-medium">
                  You haven’t earned any certificates yet.
                </p>
                <p className="text-sm text-gray-500 mt-1">
                  Complete your onboarding modules to unlock them!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {certificates.map((cert) => (
                  <div
                    key={cert.id}
                    className="bg-white rounded-xl border border-emerald-200 p-6 shadow-md hover:shadow-lg transition-all duration-300 hover:scale-[1.02]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold text-emerald-900 text-lg">
                        {cert.title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-4">
                      🎓 Congratulations! You’ve successfully completed this
                      module.
                    </p>
                    <Link
                      to={`/certificate/${cert.id}`}
                      className="inline-block mt-2 px-4 py-2 bg-emerald-600 text-white font-semibold rounded-md hover:bg-emerald-700 transition-all duration-300"
                    >
                      View Certificate
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
