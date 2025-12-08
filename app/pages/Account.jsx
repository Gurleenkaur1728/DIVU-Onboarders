import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { supabase } from "../../src/lib/supabaseClient";
import SiteTranslator from "../../src/SiteTranslator.jsx";
export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePath, setProfileImagePath] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [errors, setErrors] = useState({});
  const [language, setLanguage] = useState(
    localStorage.getItem("lang") || "en"
  );
  const handleLanguageChange = (e) => {
    const val = e.target.value;
    setLanguage(val);
localStorage.setItem("lang", val);
 // Instantly apply translation
  };

  const [userStats, setUserStats] = useState({
    xp: 0,
    level: 1,
    streak_days: 0,
    completedModules: 0,
    totalModules: 0,
    certificates: 0,
    feedbackGiven: 0,
  });
  const [userProfile, setUserProfile] = useState({
    hire_date: null,
    department: null,
    position: null,
    manager: null,
    employment_type: null,
    salary: null,
    last_login: null,
  });
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const fileInputRef = useRef(null);
  const nav = useNavigate();
  const { showToast } = useToast();
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);

  const { roleId } = useRole();
  const { user, loading: authLoading, logout } = useAuth();

  const loadUserData = useCallback(async () => {
    try {
      setLoading(true);
      const userId = user?.profile_id;

      if (!userId) {
        showToast("No user ID found. Please log in again.", "error");
        setLoading(false);
        return;
      }

      // Load basic user info from context
      setName(user.name || "");
      setEmail(user.email || "");
      setEmployeeId(
        localStorage.getItem("employee_id") || user.employee_id || ""
      );

      // Load user stats and profile data from database
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select(
          "xp, level, streak_days, last_login, profile_image, hire_date, department, position, manager, employment_type, salary"
        )
        .eq("id", userId)
        .single();

      if (userError) {
        showToast("Could not load some profile data", "warning");
        // Set default values if database query fails
        setUserProfile({
          hire_date: null,
          department: "Not Assigned",
          position: "Not Assigned",
          manager: "Not Assigned",
          employment_type: "Not Specified",
          salary: null,
          last_login: null,
        });
        setUserStats({
          xp: 0,
          level: 1,
          streak_days: 0,
          completedModules: 0,
          totalModules: 0,
          certificates: 0,
          feedbackGiven: 0,
        });
      } else {
        setUserProfile({
          hire_date: userData.hire_date,
          department: userData.department || "Not Assigned",
          position: userData.position || "Not Assigned",
          manager: userData.manager || "Not Assigned",
          employment_type: userData.employment_type || "Not Specified",
          salary: userData.salary,
          last_login: userData.last_login,
        });

        // Handle profile image
        if (userData.profile_image) {
          const { data } = supabase.storage
            .from("profile_photo")
            .getPublicUrl(userData.profile_image);
          // Add timestamp to prevent caching issues
          setProfileImage(`${data.publicUrl}?t=${Date.now()}`);
          setProfileImagePath(userData.profile_image);
        }

        // Set initial stats from user data
        setUserStats((prev) => ({
          ...prev,
          xp: userData?.xp || 0,
          level: userData?.level || 1,
          streak_days: userData?.streak_days || 0,
        }));
      }


      // Load module progress stats
      const { data: progressData, error: progressError } = await supabase
        .from("user_module_progress")
        .select("is_completed")
        .eq("user_id", userId);

      if (!progressError && progressData) {
        const completedCount =
          progressData.filter((p) => p.is_completed)?.length || 0;

        // Get total modules count
        const { data: modulesData } = await supabase
          .from("modules")
          .select("id");

        const totalCount = modulesData?.length || 0;

        setUserStats((prev) => ({
          ...prev,
          completedModules: completedCount,
          totalModules: totalCount,
        }));
      }

      // Load certificates count
      const { data: certificatesData } = await supabase
        .from("certificates")
        .select("id")
        .eq("user_id", userId);

      // Load feedback count
      const { data: feedbackData } = await supabase
        .from("module_feedback")
        .select("id")
        .eq("user_id", userId);

      setUserStats((prev) => ({
        ...prev,
        certificates: certificatesData?.length || 0,
        feedbackGiven: feedbackData?.length || 0,
      }));

      // Load recent activity
      const { data: activityData } = await supabase
        .from("user_module_progress")
        .select("completed_at, modules(title)")
        .eq("user_id", userId)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(5);

      setRecentActivity(activityData || []);

      // Load notifications from database based on user activity
      const notifications = [];

      // Add certificate notifications
      if (certificatesData && certificatesData.length > 0) {
        certificatesData.slice(-2).forEach((cert, index) => {
          notifications.push({
            id: `cert-${index}`,
            type: "achievement",
            title: "Certificate Earned!",
            message: "Congratulations! You've earned a new certificate.",
            date: new Date(
              Date.now() - (index + 1) * 24 * 60 * 60 * 1000
            ).toISOString(),
            read: index > 0,
            icon: "🏆",
          });
        });
      }

      // Add module completion notifications
      if (activityData && activityData.length > 0) {
        activityData.slice(0, 2).forEach((activity, index) => {
          notifications.push({
            id: `module-${index}`,
            type: "module",
            title: "Module Completed!",
            message: `You completed "${
              activity.modules?.title || "Unknown Module"
            }".`,
            date: activity.completed_at,
            read: true,
            icon: "📚",
          });
        });
      }

      // Add welcome notification if no other notifications
      if (notifications.length === 0) {
        notifications.push({
          id: "welcome",
          type: "system",
          title: "Welcome to DIVU!",
          message: "Complete your first module to start earning certificates.",
          date: new Date().toISOString(),
          read: false,
          icon: "👋",
        });
      }

      setNotifications(notifications);
    } catch {
      showToast("Failed to load user data", "error");
    } finally {
      setLoading(false);
    }
  }, [user, showToast]);

  const markNotificationAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      nav("/", { replace: true });
      return;
    }

    loadUserData();
  }, [authLoading, user, nav, loadUserData]);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setBusy(true);
      
      // Create a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.profile_id}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      // Upload to Supabase storage
      const { error: uploadError } = await supabase.storage
        .from('profile_photo')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile_photo')
        .getPublicUrl(filePath);

      // Update local state
      setProfileImage(data.publicUrl);
      setProfileImagePath(filePath);

      // Save to database
      const { error: dbError } = await supabase
        .from('users')
        .update({ profile_image: filePath })
        .eq('id', user.profile_id);

      if (dbError) {
        console.error("Database update error:", dbError);
        throw new Error(`Database error: ${dbError.message}`);
      }

      console.log("Profile image saved successfully:", filePath);
      alert("✅ Profile image uploaded successfully!");
    } catch (error) {
      console.error("Image upload error:", error);
      alert("❌ Failed to upload image: " + error.message);
    } finally {
      setBusy(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!name || name.trim() === "") {
      newErrors.name = "Name is required";
    }
    
    if (!email || email.trim() === "") {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email address";
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const save = async () => {
    if (!user?.profile_id) {
      showToast("User not authenticated", "error");
      return;
    }

    if (!validateForm()) {
      showToast("Please fix the errors before saving", "error");
      return;
    }

    try {
      setBusy(true);
      const updates = {
        name,
      };

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.profile_id);

      if (error) throw error;

      // Update localStorage to keep auth context in sync
      localStorage.setItem("user_name", name);

      setIsEditMode(false);
      showToast("Changes saved successfully!", "success");
    } catch (e) {
      showToast("Failed to save: " + e.message, "error");
    } finally {
      setBusy(false);
    }
  };
const [collapsed, setCollapsed] = useState(false);
  
  const handleSignOutClick = () => {
    setShowSignOutConfirm(true);
  };

  const confirmSignOut = () => {
    logout();
    nav("/", { replace: true });
    showToast("Signed out successfully", "success");
  };

  const cancelSignOut = () => {
    setShowSignOutConfirm(false);
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );  
  }

  return (
    <div
      className={`
        flex min-h-screen bg-gradient-to-br from-gray-50 via-white to-emerald-50
        ${collapsed ? "ml-20" : "ml-64"}
        transition-all duration-300
      `}
    >
      <Sidebar role={roleId} collapsed={collapsed} setCollapsed={setCollapsed} />

      <div className="flex-1 p-8">
        {/* Header with gradient */}
        <div className="mb-8 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl opacity-10"></div>
          <div className="relative flex flex-wrap items-center justify-between p-6 rounded-2xl bg-white/80 backdrop-blur-sm shadow-lg border border-emerald-100">
            <div>
              <h1 className="text-4xl font-bold text-emerald-950">
                My Account
              </h1>
              <p className="text-gray-600 mt-1">Manage your profile and preferences</p>
            </div>
            <button
              onClick={handleSignOutClick}
              className="px-6 py-3 rounded-xl font-medium border-2 border-red-300 text-red-600 bg-white hover:bg-red-50 hover:border-red-400 transition-all duration-200 shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
            >
              Sign Out
            </button>
          </div>
        </div>

        {/* Tabs with modern design */}
        <div className="flex gap-3 flex-wrap mb-8 bg-white p-2 rounded-2xl shadow-md border border-gray-100">
          {[
            "dashboard",
            "notifications",
            "work-info",
            "language",
            "settings",
          ].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 rounded-xl font-semibold capitalize transition-all duration-200 focus:outline-none relative group
                ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg scale-105"
                    : "bg-gray-50 text-gray-700 hover:bg-gray-100 hover:scale-105"
                }`}
            >
              {tab === "dashboard"
                ? "📊 Dashboard"
                : tab === "notifications"
                ? "🔔 Notifications"
                : tab === "work-info"
                ? "💼 Work Info"
                : tab === "language"
                ? "🌐 Language"
                : "⚙️ Settings"}
              {tab === "notifications" &&
                notifications.filter((n) => !n.read).length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                    {notifications.filter((n) => !n.read).length > 9
                      ? "9+"
                      : notifications.filter((n) => !n.read).length}
                  </span>
                )}
            </button>
          ))}
        </div>

        {/* Content Card with gradient border */}
        <div className="bg-white border-2 border-gray-100 rounded-2xl shadow-xl p-8 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-600 via-teal-600 to-blue-600"></div>
          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Welcome back, {name}! 👋
                </h2>
                <p className="text-gray-600">
                  Here's your learning progress overview
                </p>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* XP Card */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">
                        Total Experience
                      </h3>
                      <p className="text-3xl font-bold mt-2">{userStats.xp}</p>
                      <p className="text-sm opacity-80 mt-1">
                        Level {userStats.level}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Modules Card */}
                <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">
                        Modules Completed
                      </h3>
                      <p className="text-3xl font-bold mt-2">
                        {userStats.completedModules}/{userStats.totalModules}
                      </p>
                      <p className="text-sm opacity-80 mt-1">
                        {userStats.totalModules > 0
                          ? Math.round(
                              (userStats.completedModules /
                                userStats.totalModules) *
                                100
                            )
                          : 0}
                        % Complete
                      </p>
                    </div>
                  </div>
                </div>

                {/* Certificates Card */}
                <div className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">
                        Certificates
                      </h3>
                      <p className="text-3xl font-bold mt-2">
                        {userStats.certificates}
                      </p>
                      <p className="text-sm opacity-80 mt-1">Earned</p>
                    </div>
                  </div>
                </div>

                {/* Streak Card */}
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl p-6 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium opacity-90 uppercase tracking-wide">Active Streak</h3>
                      <p className="text-3xl font-bold mt-2">
                        {userStats.streak_days}
                      </p>
                      <p className="text-sm opacity-80 mt-1">Consecutive Days</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    Overall Progress
                  </h3>
                  <span className="text-sm text-gray-600">
                    {userStats.totalModules > 0
                      ? Math.round(
                          (userStats.completedModules /
                            userStats.totalModules) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-500"
                    style={{
                      width: `${
                        userStats.totalModules > 0
                          ? (userStats.completedModules /
                              userStats.totalModules) *
                            100
                          : 0
                      }%`,
                    }}
                  ></div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  Recent Activity 🎯
                </h3>
                {recentActivity.length > 0 ? (
                  <div className="space-y-2">
                    {recentActivity.map((activity, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between py-2 border-b border-gray-200 last:border-0"
                      >
                        <span className="text-sm text-gray-700">
                          ✅ Completed "
                          {activity.modules?.title || "Unknown Module"}"
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(activity.completed_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">
                    Start completing modules to see your activity here! 🚀
                  </p>
                )}
              </div>
            </div>
          )}

          {/* NOTIFICATIONS */}
          {activeTab === "notifications" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between flex-wrap gap-4 mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Notifications
                  </h2>
                  <p className="text-gray-600 mt-1">Stay updated with your activities</p>
                </div>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-sm font-bold px-4 py-2 rounded-full shadow-md">
                    {notifications.filter((n) => !n.read).length} unread
                  </span>
                )}
              </div>

              {/* Notifications List */}
              <div className="space-y-4">
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    return (
                      <div
                        key={notification.id}
                        onClick={() => markNotificationAsRead(notification.id)}
                        className={`bg-white border-2 rounded-2xl p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
                          !notification.read
                            ? "border-emerald-400 shadow-lg"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <h3 className="font-bold text-lg text-gray-900">
                                {notification.title}
                              </h3>
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <span className="text-sm text-gray-600 font-medium">
                                  {new Date(
                                    notification.date
                                  ).toLocaleDateString()}
                                </span>
                                {!notification.read && (
                                  <span className="w-3 h-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full animate-pulse shadow-md"></span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-700">
                              {notification.message}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔔</div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      No notifications yet
                    </h3>
                    <p className="text-gray-600">
                      You're all caught up! New notifications will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
          {activeTab === "language" && (
            <div className="space-y-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Language Settings
                </h2>
                <p className="text-gray-600 mt-1">Choose your preferred language</p>
              </div>

              <label className="block max-w-md">
                <span className="block text-sm font-semibold text-gray-900 mb-2">
                  Choose Language
                </span>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full rounded-xl border-2 border-gray-300 bg-white px-4 py-3 shadow-md focus:border-purple-500 focus:ring-4 focus:ring-purple-100 focus:outline-none transition-all duration-200 hover:border-purple-300 cursor-pointer"
                >
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="ar">Arabic</option>
                  <option value="zh-CN">Chinese</option>
                  <option value="hi">Hindi</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="ru">Russian</option>
                </select>
              </label>

              {/* Translator injected into page */}
              <SiteTranslator language={language} />
            </div>
          )}

          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="space-y-8">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-3xl font-bold text-gray-900">
                    Account Settings
                  </h2>
                  <p className="text-gray-600 mt-1">Update your profile information</p>
                </div>
                <button
                  onClick={() => setIsEditMode(!isEditMode)}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-200 focus:outline-none shadow-md hover:shadow-lg transform hover:-translate-y-0.5 ${
                    isEditMode
                      ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      : "bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-700 hover:to-teal-700"
                  }`}
                >
                  {isEditMode ? "Cancel" : "Edit Profile"}
                </button>
              </div>

              <div className="flex flex-col gap-8 max-w-3xl">
              {/* Profile Image */}
              <div className="flex items-center gap-6">
                <div
                  onClick={triggerFileInput}
                  className="relative group w-32 h-32 rounded-full overflow-hidden cursor-pointer shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
                  title="Click to upload profile image"
                >
                  {profileImage ? (
                    <>
                      <img
                        src={profileImage}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 flex items-center justify-center">
                        <svg className="w-10 h-10 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </div>
                    </>
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-emerald-100 to-teal-100 border-4 border-dashed border-emerald-300 flex items-center justify-center">
                      <span className="text-emerald-600 text-4xl">+</span>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
                  <p className="text-sm text-gray-600 mt-1">Click to upload a new photo</p>
                  <p className="text-xs text-gray-500 mt-1">JPG, PNG or GIF (Max 5MB)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 max-w-lg">
                <label className="block">
                  <span className="block text-sm font-semibold text-gray-900 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (errors.name) setErrors({ ...errors, name: "" });
                    }}
                    disabled={!isEditMode}
                    placeholder="Enter your full name"
                    className={`w-full rounded-xl border-2 px-4 py-3 text-gray-900 transition-all duration-200 focus:ring-4 focus:ring-emerald-100 focus:border-emerald-500 focus:outline-none ${
                      !isEditMode ? "bg-gray-50 cursor-not-allowed border-gray-200" : "border-gray-300 hover:border-emerald-300"
                    } ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="mt-2 text-sm text-red-600">
                      {errors.name}
                    </p>
                  )}
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-gray-900 mb-2">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-gray-900 mb-2">
                    Employee ID
                  </span>
                  <input
                    type="text"
                    value={employeeId}
                    disabled
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-gray-900 mb-2">
                    Role
                  </span>
                  <input
                    type="text"
                    value={
                      roleId === ROLES.ADMIN
                        ? "Admin"
                        : roleId === ROLES.SUPER_ADMIN
                        ? "Super Admin"
                        : "User"
                    }
                    disabled
                    className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-3 text-gray-600 cursor-not-allowed"
                  />
                </label>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={save}
                  disabled={busy || !isEditMode}
                  className="px-8 py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 flex items-center gap-3"
                >
                  {busy && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  )}
                  <span>{busy ? "Saving…" : "Save Changes"}</span>
                </button>
                {isEditMode && (
                  <button
                    onClick={() => {
                      setIsEditMode(false);
                      setErrors({});
                      loadUserData();
                    }}
                    disabled={busy}
                    className="px-8 py-3.5 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none shadow-md hover:shadow-lg"
                  >
                    Cancel
                  </button>
                )}
              </div>
              </div>
            </div>
          )}

          {/* WORK INFO - Combined Employment, Role, and Department */}
          {activeTab === "work-info" && (
            <div className="space-y-8">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-gray-900">
                  Work Information
                </h2>
                <p className="text-gray-600 mt-1">Your employment details and role</p>
              </div>

              {/* Employment & Role Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Employee ID</h3>
                  <p className="text-2xl font-bold text-blue-900">
                    {employeeId || "Not assigned"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Department</h3>
                  <p className="text-2xl font-bold text-green-900">
                    {userProfile.department}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Position</h3>
                  <p className="text-2xl font-bold text-purple-900">
                    {userProfile.position}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Manager</h3>
                  <p className="text-2xl font-bold text-orange-900">
                    {userProfile.manager}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border-2 border-teal-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Hire Date</h3>
                  <p className="text-lg font-bold text-teal-900">
                    {userProfile.hire_date
                      ? new Date(userProfile.hire_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "January 15, 2024"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-rose-50 to-red-50 border-2 border-rose-200 rounded-2xl p-6 shadow-md hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Status</h3>
                  <p className="text-2xl font-bold text-rose-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-600 rounded-full animate-pulse"></span>
                    Active
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Employee Name
                  </label>
                  <p className="text-lg font-medium text-gray-900">
                    {name || "Not provided"}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <label className="block text-sm font-semibold text-gray-900 mb-2">
                    Employment Type
                  </label>
                  <p className="text-lg font-medium text-gray-900">
                    {userProfile.employment_type}
                  </p>
                </div>

                {userProfile.salary && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <label className="block text-sm font-semibold text-gray-900 mb-2">
                      Salary
                    </label>
                    <p className="text-lg font-medium text-gray-900">
                      {typeof userProfile.salary === "number"
                        ? `$${userProfile.salary.toLocaleString()}/year`
                        : userProfile.salary}
                    </p>
                  </div>
                )}
              </div>

              {userProfile.last_login && (
                <div className="mt-6 bg-gray-50 rounded-xl p-4">
                  <span className="text-sm text-gray-600">
                    Last login: {new Date(userProfile.last_login).toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sign Out Confirmation Dialog */}
      {showSignOutConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Sign Out?</h3>
              <p className="text-gray-600 mb-6">
                Are you sure you want to sign out of your account?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={cancelSignOut}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmSignOut}
                  className="flex-1 px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 transition-all duration-200 shadow-md hover:shadow-lg"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
