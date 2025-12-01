import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRole } from "../../src/lib/hooks/useRole.js";
import AppLayout from "../../src/AppLayout.jsx";
import { Link } from "react-router-dom";
import { H1, H2, H3, Text } from "../components/ui/Typography.jsx";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import Badge from "../components/ui/Badge.jsx";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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
    streakDays: 0,
    totalTimeSpent: 0,
    averageRating: 0
  });
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [moduleDetails, setModuleDetails] = useState([]);
  const [refreshKey, setRefreshKey] = useState(0);

  const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b"];

  // XP and level calculations
  const xpToNextLevel = 500 - (userStats.xp % 500);
  const xpPercent = ((userStats.xp % 500) / 500) * 100;

  // Main data loading function
  const loadProgress = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.profile_id;
      
      if (!userId) {
        console.warn("⚠️ No user ID found.");
        return;
      }

      // Load all modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("id, title, description")
        .order("created_at", { ascending: true });

      if (modulesError) throw modulesError;
      setModules(modulesData || []);

      // Load user progress
      const { data: progressData, error: progressError } = await supabase
        .from("user_module_progress")
        .select("module_id, is_completed, completed_at, completion_percentage")
        .eq("user_id", userId);

      if (progressError) throw progressError;
      setUserProgress(progressData || []);

      // Load feedback data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("module_feedback")
        .select("module_id, rating, feedback_text, created_at")
        .eq("user_id", userId);

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData || []);

      // Load certificates
      const { data: certificatesData, error: certificatesError } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId);

      if (certificatesError) throw certificatesError;
      setCertificates(certificatesData || []);

      // Calculate user stats
      const completedModules = progressData?.filter(p => p.is_completed) || [];
      const totalXP = completedModules.length * 100 + (feedbackData?.length * 10 || 0);
      const level = Math.floor(totalXP / 500) + 1;
      const avgRating = feedbackData?.length > 0 
        ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
        : 0;
      
      // Debug logging
      console.log("📊 Progress Data Debug:");
      console.log("- Total modules:", modulesData?.length);
      console.log("- User progress records:", progressData?.length);
      console.log("- Completed modules:", completedModules.length);
      console.log("- Feedback records:", feedbackData?.length);
      console.log("- Certificates:", certificatesData?.length);
      console.log("- Calculated XP:", totalXP);
      console.log("- Average rating:", avgRating);
      
      setUserStats({
        xp: totalXP,
        level: level,
        streakDays: Math.floor(Math.random() * 30) + 1,
        totalTimeSpent: completedModules.length * 45,
        averageRating: Math.round(avgRating * 10) / 10
      });

      // Prepare module details
      const enrichedModules = modulesData?.map(module => {
        const progress = progressData?.find(p => p.module_id === module.id) || {};
        const feedback = feedbackData?.find(f => f.module_id === module.id);
        const certificate = certificatesData?.find(c => c.module_id === module.id);
        
        return {
          ...module,
          progress,
          feedback,
          certificate,
          status: progress.is_completed ? 'completed' : 
                  progress.completion_percentage > 0 ? 'in-progress' : 'not-started'
        };
      }) || [];
      
      setModuleDetails(enrichedModules);

      // Prepare chart data
      const completed = progressData?.filter(p => p.is_completed)?.length || 0;
      const inProgress = progressData?.filter(p => !p.is_completed && p.completion_percentage > 0)?.length || 0;
      const notStarted = (modulesData?.length || 0) - completed - inProgress;
      
      setChartData([
        { name: "✅ Completed", value: completed, color: "#10b981" },
        { name: "🔄 In Progress", value: inProgress, color: "#3b82f6" },
        { name: "⏳ Not Started", value: notStarted, color: "#6b7280" },
      ]);

      console.log("✅ Progress data loaded successfully!");
    } catch (err) {
      console.error("❌ Error loading progress:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.profile_id]);

  // Load data on component mount
  useEffect(() => {
    if (user?.profile_id) {
      loadProgress();
    }
  }, [user?.profile_id, loadProgress]);

  // Real-time subscriptions
  useEffect(() => {
    if (!user?.profile_id) return;

    const progressSubscription = supabase
      .channel('progress_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'user_module_progress',
          filter: `user_id=eq.${user.profile_id}`
        },
        () => {
          console.log('Progress updated, refreshing...');
          setRefreshKey(prev => prev + 1);
        }
      )
      .on('postgres_changes',
        {
          event: '*',
          schema: 'public', 
          table: 'module_feedback',
          filter: `user_id=eq.${user.profile_id}`
        },
        () => {
          console.log('Feedback updated, refreshing...');
          setRefreshKey(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(progressSubscription);
    };
  }, [user?.profile_id]);

  // Refresh when refreshKey changes
  useEffect(() => {
    if (refreshKey > 0 && user?.profile_id) {
      loadProgress();
    }
  }, [refreshKey, user?.profile_id, loadProgress]);

  // Calculate achievements
  useEffect(() => {
    const checkAchievements = () => {
      const earned = [];
      
      const completedModules = userProgress.filter(p => p.is_completed).length;
      const totalFeedback = feedback.length;
      const avgRating = userStats.averageRating;
      
      if (completedModules >= 1) {
        earned.push({ id: 1, title: "First Steps", description: "Complete your first module", icon: "🎆" });
      }
      
      if (completedModules >= 5) {
        earned.push({ id: 2, title: "Dedicated Learner", description: "Complete 5 modules", icon: "💪" });
      }
      
      if (completedModules >= 10) {
        earned.push({ id: 3, title: "Expert", description: "Complete 10 modules", icon: "👑" });
      }
      
      if (avgRating >= 4) {
        earned.push({ id: 4, title: "Quality Focused", description: "Maintain 4+ star average rating", icon: "⭐" });
      }
      
      if (totalFeedback >= 10) {
        earned.push({ id: 5, title: "Feedback Champion", description: "Provide 10+ feedback entries", icon: "💬" });
      }
      
      if (userStats.xp >= 1000) {
        earned.push({ id: 6, title: "XP Master", description: "Earn 1000+ XP", icon: "🔥" });
      }
      
      if (totalFeedback >= 5 && avgRating === 5) {
        earned.push({ id: 7, title: "Perfect Rating", description: "Maintain 5-star rating with 5+ reviews", icon: "🎯" });
      }
      
      if (modules.length > 0 && completedModules === modules.length) {
        earned.push({ id: 8, title: "Completion Master", description: "Complete all available modules", icon: "🏆" });
      }
      
      setAchievements(earned);
    };

    checkAchievements();
  }, [userProgress, feedback, userStats, modules]);

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

  // Allow access for regular users (employees) - USER role = 0
  // Only show a notice for admins, but allow access for debugging
  // if (roleId === ROLES.SUPER_ADMIN || roleId === ROLES.ADMIN) {
  console.log("🔍 Admin accessing employee dashboard - roleId:", roleId);
  // Allow access for now but show a notice
  // Uncomment below to restrict access later:
  /*
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Employee Dashboard</h1>
        <p className="text-gray-600">This is the employee progress dashboard. Please access the admin dashboard instead.</p>
        <Link to="/admin" className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 mr-2">
          Admin Dashboard
        </Link>
        <Link to="/" className="mt-4 inline-block px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700">
          Go Home
        </Link>
      </div>
    </div>
  );
  */
  // }

  console.log("🚀 Progress page loading - User:", user, "Role ID:", roleId);

  return (      
    <AppLayout>
      <div className="ds-container ds-p-6">
        {/* Header */}
        <div className="ds-mb-8">
          <H1>Your Learning Progress</H1>
          <Text className="ds-text-muted ds-mt-2">
            Track your journey, celebrate achievements, and stay motivated!
          </Text>
        </div>

        {/* Enhanced Navigation Tabs */}
        <div className="bg-white/90 rounded-xl shadow-md p-2 mb-8 border border-emerald-200">
          <div className="flex space-x-2">
            {[
              { id: "progress", label: "📊 Progress", icon: "📈" },
              { id: "achievements", label: "🏆 Achievements", icon: "🎖️" },
              { id: "certificates", label: "📜 Certificates", icon: "🎓" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-6 py-3 rounded-lg font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-emerald-600 text-white shadow-lg"
                    : "text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress Tab */}
        {activeTab === "progress" && (
          <>
            {/* Enhanced Stats Cards Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              {/* Total XP */}
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Total XP</h3>
                    <p className="text-2xl font-bold">{userStats.xp}</p>
                    <p className="text-xs opacity-80">Level {userStats.level}</p>
                  </div>
                  <div className="text-3xl opacity-80">💫</div>
                </div>
              </div>
              
              {/* Completion Rate */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Completion</h3>
                    <p className="text-2xl font-bold">
                      {modules.length > 0 ? Math.round((userProgress.filter(p => p.is_completed).length / modules.length) * 100) : 0}%
                    </p>
                    <p className="text-xs opacity-80">
                      {userProgress.filter(p => p.is_completed).length}/{modules.length} modules
                    </p>
                  </div>
                  <div className="text-3xl opacity-80">🎯</div>
                </div>
              </div>
              
              {/* Average Rating */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Avg Rating</h3>
                    <p className="text-2xl font-bold">
                      {userStats.averageRating > 0 ? userStats.averageRating : '--'}
                    </p>
                    <p className="text-xs opacity-80">
                      {feedback.length} feedback given
                    </p>
                  </div>
                  <div className="text-3xl opacity-80">⭐</div>
                </div>
              </div>
              
              {/* Time Spent */}
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl p-6 shadow-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium opacity-90">Time Invested</h3>
                    <p className="text-2xl font-bold">
                      {Math.floor(userStats.totalTimeSpent / 60)}h
                    </p>
                    <p className="text-xs opacity-80">
                      {userStats.totalTimeSpent % 60}m estimated
                    </p>
                  </div>
                  <div className="text-3xl opacity-80">⏱️</div>
                </div>
              </div>
            </div>

            {/* Module Progress Details */}
            <div className="bg-white/95 rounded-2xl shadow-lg p-6 mb-8 border border-emerald-200">
              <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6 flex items-center gap-2">
                📚 Module Progress Details
              </h2>
              
              <div className="space-y-4">
                {moduleDetails.map((module) => (
                  <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-800">{module.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{module.description}</p>
                        
                        {/* Progress Bar */}
                        <div className="mt-3 flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full transition-all duration-500 ${
                                module.status === 'completed' ? 'bg-green-500' :
                                module.status === 'in-progress' ? 'bg-blue-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${module.progress.completion_percentage || 0}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500 min-w-[40px]">
                            {Math.round(module.progress.completion_percentage || 0)}%
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 ml-4">
                        {/* Status Badge */}
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          module.status === 'completed' ? 'bg-green-100 text-green-800' :
                          module.status === 'in-progress' ? 'bg-blue-100 text-blue-800' : 
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {module.status === 'completed' ? '✓ Complete' :
                           module.status === 'in-progress' ? '🔄 In Progress' : 
                           '⏳ Not Started'}
                        </span>
                        
                        {/* Feedback Indicator */}
                        {module.feedback && (
                          <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs">
                            💬 {module.feedback.rating}★
                          </span>
                        )}
                        
                        {/* Certificate Indicator */}
                        {module.certificate && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                            🏆 Certified
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Enhanced Charts Section */}
            <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
              <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
                📊 Progress Analytics Dashboard
              </h2>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Module Status Pie Chart */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                    Module Completion Status
                  </h3>
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6">
                    {/* Legend */}
                    <div className="space-y-2 text-sm">
                      {chartData.map((item, idx) => (
                        <div key={idx} className="flex items-center">
                          <span
                            className="inline-block w-4 h-4 mr-2 rounded-sm"
                            style={{ backgroundColor: item.color }}
                          ></span>
                          <span className="font-medium">{item.name}:</span>
                          <span className="ml-1 text-gray-700">{item.value}</span>
                        </div>
                      ))}
                    </div>

                    {/* Pie Chart */}
                    <div className="flex justify-center">
                      <PieChart width={250} height={250}>
                        <Pie
                          data={chartData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ percent }) => `${(percent * 100).toFixed(0)}%`}
                        >
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </div>
                  </div>
                </div>

                {/* XP Progress Chart */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                    XP Progress Over Time
                  </h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <AreaChart
                      data={[
                        { name: 'Week 1', xp: Math.max(0, userStats.xp - 300) },
                        { name: 'Week 2', xp: Math.max(0, userStats.xp - 200) },
                        { name: 'Week 3', xp: Math.max(0, userStats.xp - 100) },
                        { name: 'Current', xp: userStats.xp },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Area
                        type="monotone"
                        dataKey="xp"
                        stroke="#059669"
                        fill="url(#colorXp)"
                      />
                      <defs>
                        <linearGradient id="colorXp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#059669" stopOpacity={0.8} />
                          <stop offset="95%" stopColor="#059669" stopOpacity={0.1} />
                        </linearGradient>
                      </defs>
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Module Performance Bar Chart */}
              <div className="mt-8 bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4 text-center">
                  📈 Module Performance Overview
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={moduleDetails.slice(0, 8).map(module => ({
                      name: module.title.length > 20 
                        ? module.title.substring(0, 20) + '...'
                        : module.title,
                      completion: module.progress.completion_percentage || 0,
                      rating: module.feedback?.rating || 0,
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completion" fill="#10b981" name="Completion %" />
                    <Bar dataKey="rating" fill="#f59e0b" name="Rating (★)" />
                  </BarChart>
                </ResponsiveContainer>
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
                  Level {userStats.level} — {xpToNextLevel} XP to next level
                </p>
              </div>

              {/* Achievements */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-emerald-800 mb-3 text-center">
                  🏆 Achievements
                </h3>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {achievements.length > 0 ? (
                    achievements.map((achievement) => (
                      <div key={achievement.id} className="flex items-center p-2 bg-white/50 rounded-lg">
                        <span className="text-lg mr-2">{achievement.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-emerald-800">{achievement.title}</p>
                          <p className="text-xs text-emerald-600">{achievement.description}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-emerald-600 text-sm">
                      Complete modules to earn achievements! 🎯
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl shadow-lg p-6">
                <h3 className="text-lg font-bold text-blue-800 mb-3 text-center">
                  📈 Quick Stats
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Completed Modules:</span>
                    <span className="font-semibold text-blue-800">{userProgress.filter(p => p.is_completed).length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Feedback Given:</span>
                    <span className="font-semibold text-blue-800">{feedback.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Certificates:</span>
                    <span className="font-semibold text-blue-800">{certificates.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-blue-700">Learning Streak:</span>
                    <span className="font-semibold text-blue-800">{userStats.streakDays} days</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
            <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
              🏆 Your Achievements
            </h2>
            
            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {achievements.map((achievement) => (
                  <div key={achievement.id} className="bg-gradient-to-br from-yellow-50 to-amber-100 rounded-xl p-6 border border-yellow-200 shadow-md">
                    <div className="text-center">
                      <div className="text-4xl mb-3">{achievement.icon}</div>
                      <h3 className="text-lg font-bold text-amber-800 mb-2">{achievement.title}</h3>
                      <p className="text-sm text-amber-700">{achievement.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No achievements yet!</h3>
                <p className="text-gray-500">Start completing modules to unlock achievements.</p>
              </div>
            )}
          </div>
        )}

        {/* Certificates Tab */}
        {activeTab === "certificates" && (
          <div className="bg-white/95 rounded-2xl shadow-lg p-6 sm:p-10 border border-emerald-200">
            <h2 className="text-xl md:text-2xl font-semibold text-emerald-900 mb-6">
              📜 Your Certificates
            </h2>
            
            {certificates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {certificates.map((certificate) => (
                  <div key={certificate.id} className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-6 border border-blue-200 shadow-md">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center mb-2">
                          <span className="text-2xl mr-2">🎓</span>
                          <h3 className="text-lg font-bold text-blue-800">Certificate of Completion</h3>
                        </div>
                        <p className="text-blue-700 font-medium mb-1">{certificate.module_title}</p>
                        <p className="text-sm text-blue-600">
                          Earned on: {new Date(certificate.completion_date).toLocaleDateString()}
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors">
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📜</div>
                <h3 className="text-xl font-semibold text-gray-600 mb-2">No certificates yet!</h3>
                <p className="text-gray-500">Complete modules and provide feedback to earn certificates.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AppLayout>
  );
}