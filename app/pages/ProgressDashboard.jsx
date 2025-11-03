import { useEffect, useState } from "react";
import { supabase } from "../../../src/lib/supabaseClient.js";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import { Award, BarChart2 } from "lucide-react";

export default function ProgressDashboard() {
  const [progressData, setProgressData] = useState(null);
  const [xp, setXp] = useState(0);
  const [level, setLevel] = useState(1);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  const userId = localStorage.getItem("profile_id");

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      // Fetch user XP + Level
      const { data: userData } = await supabase
        .from("users")
        .select("xp, level")
        .eq("id", userId)
        .single();

      if (userData) {
        setXp(userData.xp);
        setLevel(userData.level);
      }

      // Fetch module progress (example: count completed modules)
      const { data: sections } = await supabase
        .from("module_sections")
        .select("id, content_type, is_mandatory")
        .limit(10);

      setProgressData({
        completed: Math.floor(Math.random() * 10), // Replace with real logic
        total: 10,
      });

      // Fetch achievements
      const { data: ach } = await supabase
        .from("achievements")
        .select("*")
        .eq("user_id", userId)
        .order("earned_at", { ascending: false });

      setAchievements(ach || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const completionPercent = progressData
    ? Math.round((progressData.completed / progressData.total) * 100)
    : 0;

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={ROLES.USER} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            My Progress Dashboard
          </span>
        </div>

        {/* Header Section */}
        <div className="bg-emerald-900/95 p-6 rounded-xl text-white mb-6">
          <h2 className="text-2xl font-bold mb-2">Welcome Back!</h2>
          <p className="text-emerald-200">
            Track your onboarding progress, achievements, and XP level.
          </p>
        </div>

        {loading ? (
          <p>Loading...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Progress Overview */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-emerald-800 mb-3">
                Overall Progress
              </h3>
              <div className="flex flex-col items-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="55"
                      stroke="#e2e8f0"
                      strokeWidth="10"
                      fill="none"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="55"
                      stroke="#059669"
                      strokeWidth="10"
                      fill="none"
                      strokeDasharray="345"
                      strokeDashoffset={345 - (completionPercent / 100) * 345}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-bold text-2xl text-emerald-800">
                    {completionPercent}%
                  </div>
                </div>
                <p className="mt-2 text-sm text-gray-600">
                  {progressData.completed} of {progressData.total} modules
                  completed
                </p>
              </div>
            </div>

            {/* XP and Level */}
            <div className="bg-white rounded-xl shadow-lg p-6 flex flex-col justify-center items-center">
              <BarChart2 size={40} className="text-emerald-600 mb-2" />
              <h3 className="text-lg font-bold text-emerald-800">
                Level {level}
              </h3>
              <p className="text-gray-700 font-medium">{xp} XP</p>
              <div className="w-full mt-3 bg-gray-200 h-2 rounded-full">
                <div
                  className="bg-emerald-600 h-2 rounded-full transition-all"
                  style={{ width: `${(xp % 100) || 10}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {100 - (xp % 100)} XP to next level
              </p>
            </div>

            {/* Achievements */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-emerald-800 mb-3">
                Achievements
              </h3>
              {achievements.length === 0 ? (
                <p className="text-gray-500 text-sm">
                  No badges earned yet. Keep going!
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center gap-2 bg-emerald-50 p-2 rounded-md"
                    >
                      <Award className="text-emerald-600" size={20} />
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
          </div>
        )}
      </div>
    </div>
  );
}
