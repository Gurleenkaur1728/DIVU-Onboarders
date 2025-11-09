import { useState, useEffect } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabaseClient.js";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext.jsx";
import { useRole } from "../../src/lib/hooks/useRole.js";


export default function Progress() {
  const { user } = useAuth();
  const { roleId } = useRole();
  const [activeTab, setActiveTab] = useState("progress");
  const [chartData, setChartData] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [modules, setModules] = useState([]);
  const [userProgress, setUserProgress] = useState([]);
  const [feedback, setFeedback] = useState([]);
  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    streakDays: 0
  });
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const COLORS = ["#22c55e", "#3b82f6", "#ef4444"]; // green, blue, red

  useEffect(() => {
    if (user?.profile_id) {
      loadProgress();
    }
  }, [user]);

  async function loadProgress() {
    try {
      setLoading(true);
      const userId = user?.profile_id;
      
      if (!userId) {
        console.warn("⚠️ No user ID found.");
        return;
      }

      // ✅ Load all modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("id, title, description")
        .order("created_at", { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // ✅ Load user progress on modules  
      const { data: progressData, error: progressError } = await supabase
        .from("user_module_progress")
        .select("module_id, is_completed, completed_at, completion_percentage")
        .eq("user_id", userId);

      if (progressError) console.warn("Progress error:", progressError);
      setUserProgress(progressData || []);

      // ✅ Load certificates (generated from completed modules with feedback)
      const { data: certificatesData, error: certsError } = await supabase
        .from("certificates")
        .select("id, module_id, user_name, module_title, completion_date, generated_at")
        .eq("user_id", userId)
        .order("generated_at", { ascending: false });

      if (certsError) console.warn("Certificates error:", certsError);
      setCertificates(certificatesData || []);

      // ✅ Load feedback submitted by user
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("module_feedback")
        .select("module_id, rating, difficulty_level, created_at")
        .eq("user_id", userId);

      if (feedbackError) console.warn("Feedback error:", feedbackError);
      setFeedback(feedbackData || []);

      // ✅ Load user stats - simplified to use available data
      // Calculate XP based on completed modules and feedback
      const completedCount = progressData?.filter(p => p.is_completed)?.length || 0;
      const feedbackCount = feedbackData?.length || 0;
      const certificateCount = certificatesData?.length || 0;
      
      // Simple XP calculation: 50 XP per completion + 25 XP per feedback + 100 XP per certificate
      const calculatedXP = (completedCount * 50) + (feedbackCount * 25) + (certificateCount * 100);
      const calculatedLevel = Math.floor(calculatedXP / 100) + 1;
      
      // Calculate streak - simplified to just show 1 day for now
      const streak = completedCount > 0 ? Math.min(completedCount, 7) : 0;

      setUserStats({
        xp: calculatedXP,
        level: calculatedLevel,
        streakDays: streak
      });

      // ✅ Calculate progress data for chart
      const totalModules = modulesData?.length || 0;
      const completedModules = progressData?.filter(p => p.is_completed)?.length || 0;
      const inProgressModules = progressData?.filter(p => !p.is_completed && p.completion_percentage > 0)?.length || 0;
      const notStartedModules = totalModules - completedModules - inProgressModules;

      setChartData([
        { name: "Completed Modules", value: completedModules, color: "#22c55e" },
        { name: "In Progress", value: inProgressModules, color: "#3b82f6" },
        { name: "Not Started", value: notStartedModules, color: "#ef4444" },
      ]);

      // ✅ Generate achievements based on progress
      const newAchievements = [];
      if (completedModules >= 1) {
        newAchievements.push({
          id: 1,
          badge_name: "First Module Complete",
          description: "Completed your first module",
          earned_at: progressData.find(p => p.is_completed)?.completed_at || new Date(),
        });
      }
      if (completedModules >= 3) {
        newAchievements.push({
          id: 2,
          badge_name: "Learning Enthusiast",
          description: "Completed 3 modules",
          earned_at: new Date(),
        });
      }
      if (certificatesData?.length >= 1) {
        newAchievements.push({
          id: 3,
          badge_name: "Certificate Earned",
          description: "Earned your first certificate",
          earned_at: certificatesData[0]?.generated_at || new Date(),
        });
      }
      if (streak >= 3) {
        newAchievements.push({
          id: 4,
          badge_name: "3-Day Streak",
          description: "Logged in for 3 consecutive days",
          earned_at: new Date(),
        });
      }
      if (feedbackData?.length >= 5) {
        newAchievements.push({
          id: 5,
          badge_name: "Feedback Master",
          description: "Provided feedback for 5 modules",
          earned_at: new Date(),
        });
      }
      
      setAchievements(newAchievements);

    } catch (err) {
      console.error("❌ Error loading progress:", err.message);
    } finally {
      setLoading(false);
    }
  }

  const xpPercent = ((userStats.xp % 100) / 100) * 100;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading progress...</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 relative"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar role={roleId} />

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
                Module Progress Overview: {modules.length} Total Modules
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
                  {userStats.xp} XP
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
                  Level {userStats.level} — {100 - (userStats.xp % 100)} XP to next level
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-emerald-800 mb-3">
                  Achievements ({achievements.length})
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
                  🔥 {userStats.streakDays} Days
                </p>
                <p className="text-sm text-gray-600 mt-2">
                  You've logged in consistently for {userStats.streakDays} days!
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
                        {cert.module_title}
                      </h3>
                      <span className="text-xs text-gray-500">
                        {new Date(cert.generated_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mb-2">
                      <strong>Recipient:</strong> {cert.user_name}
                    </p>
                    <p className="text-sm text-gray-600 mb-4">
                      🎓 Congratulations! You've successfully completed this module and earned your certificate.
                    </p>
                    <p className="text-xs text-gray-500 mb-4">
                      Completed on: {new Date(cert.completion_date).toLocaleDateString()}
                    </p>
                    <Link
                      to={`/certificate/${cert.module_id}`}
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
