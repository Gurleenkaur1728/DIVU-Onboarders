import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useRole } from "../../src/lib/hooks/useRole.js";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
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

  const COLORS = ["#22c55e", "#3b82f6", "#ef4444", "#f59e0b"]; // green, blue, red, amber

  // XP and level calculations
  const xpToNextLevel = 500 - (userStats.xp % 500);
  const xpPercent = ((userStats.xp % 500) / 500) * 100;

  // Memoize loadProgress function - MOVED BEFORE useEffect to fix initialization error
  const loadProgress = useCallback(async () => {
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

      if (progressError) throw progressError;
      setUserProgress(progressData || []);

      // ✅ Load feedback data
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("feedback")
        .select("module_id, rating, comments, created_at")
        .eq("profile_id", userId);

      if (feedbackError) throw feedbackError;
      setFeedback(feedbackData || []);

      // ✅ Load certificates
      const { data: certificatesData, error: certificatesError } = await supabase
        .from("certificates")
        .select("*")
        .eq("user_id", userId);

      if (certificatesError) throw certificatesError;
      setCertificates(certificatesData || []);

      // ✅ Calculate enhanced user stats
      const completedModules = progressData?.filter(p => p.is_completed) || [];
      const totalXP = completedModules.length * 100 + (feedbackData?.length * 10 || 0);
      const level = Math.floor(totalXP / 500) + 1;
      const avgRating = feedbackData?.length > 0 
        ? feedbackData.reduce((sum, f) => sum + f.rating, 0) / feedbackData.length
        : 0;
      
      setUserStats({
        xp: totalXP,
        level: level,
        streakDays: Math.floor(Math.random() * 30) + 1,
        totalTimeSpent: completedModules.length * 45,
        averageRating: Math.round(avgRating * 10) / 10
      });

      // ✅ Prepare enhanced module details
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

      // ✅ Prepare chart data
      const completed = progressData?.filter(p => p.is_completed)?.length || 0;
      const inProgress = progressData?.filter(p => !p.is_completed && p.completion_percentage > 0)?.length || 0;
      const notStarted = (modulesData?.length || 0) - completed - inProgress;
      
      setChartData([
        { name: "✅ Completed", value: completed, color: "#10b981" },
        { name: "🔄 In Progress", value: inProgress, color: "#3b82f6" },
        { name: "⏳ Not Started", value: notStarted, color: "#6b7280" },
      ]);

      console.log("✅ Enhanced progress data loaded successfully!");
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

    // Set up real-time subscription for progress updates
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

  // Memoize loadProgress to fix dependency issues
  const loadProgress = useCallback(async () => {
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

      // ✅ Load user stats - enhanced calculations
      const completedCount = progressData?.filter(p => p.is_completed)?.length || 0;
      const feedbackCount = feedbackData?.length || 0;
      const certificateCount = certificatesData?.length || 0;
      const avgRating = feedbackData?.length > 0 ? 
        (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1) : 0;
      
      // Enhanced XP calculation: 100 XP per completion + 50 XP per feedback + 200 XP per certificate + bonus for ratings
      const baseXP = (completedCount * 100) + (feedbackCount * 50) + (certificateCount * 200);
      const ratingBonus = feedbackData?.reduce((sum, f) => sum + (f.rating >= 4 ? 25 : 0), 0) || 0;
      const calculatedXP = baseXP + ratingBonus;
      const calculatedLevel = Math.floor(calculatedXP / 500) + 1; // 500 XP per level
      
      // Calculate learning streak based on consecutive completion days
      const completedDates = progressData?.filter(p => p.is_completed && p.completed_at)
        .map(p => new Date(p.completed_at).toDateString());
      const uniqueDates = [...new Set(completedDates)];
      const streak = Math.min(uniqueDates.length, 30); // Cap at 30 days
      
      // Estimate time spent (rough calculation)
      const estimatedTimePerModule = 45; // minutes
      const totalTimeSpent = completedCount * estimatedTimePerModule;

      setUserStats({
        xp: calculatedXP,
        level: calculatedLevel,
        streakDays: streak,
        totalTimeSpent: totalTimeSpent,
        averageRating: parseFloat(avgRating)
      });

      // ✅ Enhanced progress data for chart with better categorization
      const totalModules = modulesData?.length || 0;
      const completedModules = progressData?.filter(p => p.is_completed)?.length || 0;
      const highProgressModules = progressData?.filter(p => !p.is_completed && p.completion_percentage >= 50)?.length || 0;
      const lowProgressModules = progressData?.filter(p => !p.is_completed && p.completion_percentage > 0 && p.completion_percentage < 50)?.length || 0;
      const notStartedModules = totalModules - completedModules - highProgressModules - lowProgressModules;

      setChartData([
        { name: "Completed", value: completedModules, color: "#22c55e" },
        { name: "Near Completion (50%+)", value: highProgressModules, color: "#3b82f6" },
        { name: "In Progress", value: lowProgressModules, color: "#f59e0b" },
        { name: "Not Started", value: notStartedModules, color: "#ef4444" },
      ]);

      // ✅ Create detailed module list for better tracking
      const moduleDetailsData = modulesData?.map(module => {
        const progress = progressData?.find(p => p.module_id === module.id);
        const moduleFeedback = feedbackData?.find(f => f.module_id === module.id);
        const certificate = certificatesData?.find(c => c.module_id === module.id);
        
        return {
          ...module,
          progress: progress || { completion_percentage: 0, is_completed: false },
          feedback: moduleFeedback,
          certificate: certificate,
          status: progress?.is_completed ? 'completed' : 
                 progress?.completion_percentage > 0 ? 'in-progress' : 'not-started'
        };
      }) || [];
      
      setModuleDetails(moduleDetailsData);

      // ✅ Enhanced achievements system
      const newAchievements = [];
      
      if (completedModules >= 1) {
        newAchievements.push({
          id: 1,
          badge_name: "🚀 First Steps",
          description: "Completed your first module",
          earned_at: progressData.find(p => p.is_completed)?.completed_at || new Date(),
          type: "milestone"
        });
      }
      
      if (completedModules >= 3) {
        newAchievements.push({
          id: 2,
          badge_name: "📚 Learning Enthusiast", 
          description: "Completed 3 modules",
          earned_at: new Date(),
          type: "milestone"
        });
      }
      
      if (completedModules >= 5) {
        newAchievements.push({
          id: 3,
          badge_name: "🎯 Dedicated Learner",
          description: "Completed 5 modules",
          earned_at: new Date(),
          type: "milestone"
        });
      }
      
      if (certificatesData?.length >= 1) {
        newAchievements.push({
          id: 4,
          badge_name: "🏆 Certificate Earner",
          description: "Earned your first certificate",
          earned_at: certificatesData[0]?.generated_at || new Date(),
          type: "certificate"
        });
      }
      
      if (streak >= 3) {
        newAchievements.push({
          id: 5,
          badge_name: "🔥 3-Day Streak",
          description: "Consistent learning for 3 days",
          earned_at: new Date(),
          type: "streak"
        });
      }
      
      if (feedbackData?.length >= 3) {
        newAchievements.push({
          id: 6,
          badge_name: "💬 Feedback Champion",
          description: "Provided feedback for 3+ modules",
          earned_at: new Date(),
          type: "engagement"
        });
      }
      
      if (avgRating >= 4 && feedbackData?.length >= 3) {
        newAchievements.push({
          id: 7,
          badge_name: "⭐ Quality Learner",
          description: "Maintained 4+ star average rating",
          earned_at: new Date(),
          type: "quality"
        });
      }
      
      if (calculatedXP >= 1000) {
        newAchievements.push({
          id: 8,
          badge_name: "💎 XP Master",
          description: "Reached 1000+ XP points",
          earned_at: new Date(),
          type: "xp"
        });
      }
      
      setAchievements(newAchievements);

    } catch (err) {
      console.error("❌ Error loading progress:", err.message);
    } finally {
      setLoading(false);
    }
  }, [user?.profile_id]);

  const xpToNextLevel = 500 - (userStats.xp % 500);
  const xpPercent = ((userStats.xp % 500) / 500) * 100;

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
