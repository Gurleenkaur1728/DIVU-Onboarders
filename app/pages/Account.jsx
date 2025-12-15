import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { useAuth } from "../context/AuthContext.jsx";
import { supabase } from "../../src/lib/supabaseClient";
import SiteTranslator from "../../src/SiteTranslator.jsx";
import AppLayout from "../../src/AppLayout.jsx";
import ROLES from "../components/Sidebar.jsx";


export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [profileImage, setProfileImage] = useState(null);
  const [profileImagePath, setProfileImagePath] = useState("");
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

  const { roleId } = useRole();
  const { user, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      nav("/", { replace: true });
      return;
    }

    loadUserData();
  }, [authLoading, user, nav]);

  const loadUserData = async () => {
    try {
      setLoading(true);
      const userId = user?.profile_id;

      if (!userId) {
        console.warn("No user ID found");
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
        console.warn("User data error:", userError);
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
          setProfileImage(data.publicUrl);
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
    } catch (error) {
      console.error("Error loading user data:", error);
    } finally {
      setLoading(false);
    }
  };

  const markNotificationAsRead = (notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Show preview immediately
      setProfileImage(URL.createObjectURL(file));

      // Upload to Supabase storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.profile_id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('profile_photo')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('profile_photo')
        .getPublicUrl(filePath);

      // Update state with storage path
      setProfileImagePath(filePath);
      setProfileImage(data.publicUrl);

      console.log('✅ Image uploaded to storage:', filePath);
    } catch (error) {
      console.error('❌ Error uploading image:', error);
      alert('Failed to upload image: ' + error.message);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const save = async () => {
    if (!user?.profile_id) {
      alert("❌ User not authenticated");
      return;
    }

    try {
      setBusy(true);
      const updates = {
        name,
      };

      // Add profile image if uploaded
      if (profileImagePath) {
        updates.profile_image = profileImagePath;
      }

      const { error } = await supabase
        .from("users")
        .update(updates)
        .eq("id", user.profile_id);

      if (error) throw error;

      // Update localStorage to keep auth context in sync
      localStorage.setItem("user_name", name);

      alert("✅ Changes saved successfully!");
    } catch (e) {
      console.error("Save error:", e);
      alert("❌ Failed to save: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    nav("/", { replace: true });
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
    <AppLayout>
    <div
      className="flex-1 min-h-dvh p-6 space-y-6">

        {/* Header */}
        <div
          className="
            mb-6 px-6 py-4 rounded-lg border shadow-sm
            flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          {/* LEFT */}
          <div>
            <h1 className="text-2xl font-bold">Account</h1>
            <p className="text-gray-600 dark:text-gray-300">
              Manage your profile, preferences, and activity
            </p>
          </div>

          {/* RIGHT — TABS */}
          <div className="flex flex-wrap gap-2">
            {[
              ["dashboard", " Dashboard"],
              ["notifications", " Notifications"],
              ["employment", " Employment"],
              ["role", " Role"],
              ["department", " Department"],
              ["language", " Language"],
              ["settings", " Settings"],
            ].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  px-4 py-2 rounded-md text-sm font-medium border transition
                  ${
                    activeTab === key
                      ? "bg-DivuDarkGreen text-white border-DivuDarkGreen"
                      : "bg-transparent border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-DivuBlue"
                  }
                `}
              >
                {label}
                {key === "notifications" &&
                  notifications.filter((n) => !n.read).length > 0 && (
                    <span className="ml-2 inline-flex items-center justify-center text-xs bg-red-500 text-white rounded-full px-2">
                      {notifications.filter((n) => !n.read).length}
                    </span>
                  )}
              </button>
            ))}
            <button
              onClick={signOut}
              className="px-4 py-2 rounded-md text-sm font-medium border transition bg-transparent border-gray-300 text-gray-700 dark:text-gray-200 hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-600 dark:hover:text-white"
            >
              Sign Out
            </button>
          </div>
        </div>


        {/* Content Card */}
        <div
          className="
            rounded-xl border shadow-sm transition
            bg-white/90 text-gray-900 border-gray-300
            dark:bg-black/40 dark:text-gray-100 dark:border-black
            p-5
          "
        >

          {/* DASHBOARD */}
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Welcome Section */}
              <div className="mb-6">
                <h2 className="text-2xl font-bold  mb-2">
                  Welcome back, {name}! 👋
                </h2>
                <p className="text-gray-600">
                  Here's your learning progress overview
                </p>
              </div>

              {/* Stats Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                {/* XP Card */}
                <div className="text-white rounded-xl p-4 shadow-lg 
                  bg-gradient-to-r from-purple-500 to-purple-600
                dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
                 
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium opacity-90">
                        Total XP
                      </h3>
                      <p className="text-2xl font-bold">{userStats.xp}</p>
                      <p className="text-xs opacity-80">
                        Level {userStats.level}
                      </p>
                    </div>
                    <div className="text-3xl opacity-80">⚡</div>
                  </div>
                </div>

                {/* Modules Card */}
                <div className=" text-white rounded-xl p-4 shadow-lg
                  bg-gradient-to-r from-green-500 to-emerald-600
                  dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium opacity-90">
                        Modules
                      </h3>
                      <p className="text-2xl font-bold">
                        {userStats.completedModules}/{userStats.totalModules}
                      </p>
                      <p className="text-xs opacity-80">
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
                    <div className="text-3xl opacity-80">📚</div>
                  </div>
                </div>

                {/* Certificates Card */}
                <div className=" text-white rounded-xl p-4 shadow-lg
                  bg-gradient-to-r from-orange-500 to-orange-600
                  dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium opacity-90">
                        Certificates
                      </h3>
                      <p className="text-2xl font-bold">
                        {userStats.certificates}
                      </p>
                      <p className="text-xs opacity-80">Earned</p>
                    </div>
                    <div className="text-3xl opacity-80">🏆</div>
                  </div>
                </div>

                {/* Streak Card */}
                <div className=" text-white rounded-xl p-4 shadow-lg
                  bg-gradient-to-r from-red-500 to-pink-600 
                  dark:bg-DivuDarkGreen/70 dark:from-transparent dark:to-transparent dark:border-black">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-medium opacity-90">Streak</h3>
                      <p className="text-2xl font-bold">
                        {userStats.streak_days}
                      </p>
                      <p className="text-xs opacity-80">Days</p>
                    </div>
                    <div className="text-3xl opacity-80">🔥</div>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Overall Progress</h3>
                  <span className="text-sm text-gray-600 dark:text-gray-300">
                    {userStats.totalModules > 0
                      ? Math.round(
                          (userStats.completedModules / userStats.totalModules) *
                            100
                        )
                      : 0}
                    %
                  </span>
                </div>

                <div className="h-2 rounded-full bg-gray-200 dark:bg-white/10 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all"
                    style={{
                      width: `${
                        userStats.totalModules > 0
                          ? Math.min(
                              (userStats.completedModules /
                                userStats.totalModules) *
                                100,
                              100
                            )
                          : 0
                      }%`,
                    }}
                  />
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
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🔔</span>
                </div>
                <h2 className="text-2xl font-bold">
                  Notifications
                </h2>
                {notifications.filter((n) => !n.read).length > 0 && (
                  <span className="bg-red-100 text-red-800 text-sm font-medium px-2 py-1 rounded-full">
                    {notifications.filter((n) => !n.read).length} unread
                  </span>
                )}
              </div>

              {/* Notifications List */}
              <div className="space-y-3">
                {notifications.length > 0 ? (
                  notifications.map((notification) => {
                    const getTypeColor = (type) => {
                      switch (type) {
                        case "achievement":
                          return "from-yellow-50 to-orange-50 border-yellow-200";
                        case "module":
                          return "from-blue-50 to-indigo-50 border-blue-200";
                        case "reminder":
                          return "from-orange-50 to-red-50 border-orange-200";
                        case "system":
                          return "from-gray-50 to-slate-50 border-gray-200";
                        default:
                          return "from-emerald-50 to-green-50 border-emerald-200";
                      }
                    };

                    return (
                      <div
                        key={notification.id}
                        onClick={() => markNotificationAsRead(notification.id)}
                        className={`bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition cursor-pointer ${
                          !notification.read
                            ? "border-l-4 border-l-emerald-600"
                            : ""
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0 mt-1">
                            {notification.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <h3 className="font-semibold text-gray-900">
                                {notification.title}
                              </h3>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-500">
                                  {new Date(
                                    notification.date
                                  ).toLocaleDateString()}
                                </span>
                                {!notification.read && (
                                  <span className="w-2 h-2 bg-emerald-600 rounded-full"></span>
                                )}
                              </div>
                            </div>
                            <p className="text-gray-700 text-sm">
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
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">🌐</span>
                </div>
                <h2 className="text-2xl font-bold">
                  Language Settings
                </h2>
              </div>

              <label className="block max-w-sm">
                <span className="block text-sm font-semibold mb-1">
                  Choose Language
                </span>
                <select
                  value={language}
                  onChange={handleLanguageChange}
                  className="w-full rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 shadow-sm focus:border-emerald-400 focus:ring focus:ring-emerald-300/50 text-black"
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
            <div className="flex flex-col gap-8 max-w-3xl">
              {/* Profile Image */}
              <div
                onClick={triggerFileInput}
                className="w-32 h-32 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-600 font-medium cursor-pointer hover:bg-gray-100 hover:border-gray-400 transition"
                title="Click to upload profile image"
              >
                {profileImage ? (
                  <img
                    src={profileImage}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  "Upload"
                )}
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 max-w-lg">
                <label className="block">
                  <span className="block text-sm font-semibold  mb-1">
                    Display Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2 text-gray-900 focus:ring-2 focus:ring-emerald-600 focus:border-emerald-600 focus:outline-none"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold  mb-1">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold  mb-1">
                    Employee ID
                  </span>
                  <input
                    type="text"
                    value={employeeId}
                    disabled
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold  mb-1">
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
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 px-4 py-2 text-gray-600 cursor-not-allowed"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={save}
                  disabled={busy}
                  className="px-6 py-3 rounded-lg font-medium text-white bg-DivuDarkGreen 
                   hover:bg-DivuLightGreen hover:text-black
                   transition disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2"
                >
                  {busy ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* EMPLOYMENT */}
          {activeTab === "employment" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xl">💼</span>
                </div>
                <h2 className="text-2xl font-bold">
                  Employment Details
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">🆔</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Employee ID
                    </label>
                  </div>
                  <p className="text-lg font-medium text-emerald-900">
                    {employeeId || "Not assigned"}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">🏢</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Department
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {userProfile.department}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">👨‍💻</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Position
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {userProfile.position}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">👔</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Manager
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {userProfile.manager}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">📅</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Hire Date
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
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

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">📈</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Status
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <span className="w-3 h-3 bg-emerald-600 rounded-full animate-pulse"></span>
                    Active
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">👤</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Employee Name
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {name || "Not provided"}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">🔄</span>
                    <label className="block text-sm font-semibold text-gray-900">
                      Employment Type
                    </label>
                  </div>
                  <p className="text-lg font-medium text-gray-900">
                    {userProfile.employment_type}
                  </p>
                </div>

                {userProfile.salary && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-emerald-600">💰</span>
                      <label className="block text-sm font-semibold text-gray-900">
                        Salary
                      </label>
                    </div>
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
                  <div className="flex items-center gap-2 text-gray-600">
                    <span>🕐</span>
                    <span className="text-sm">
                      Last login:{" "}
                      {new Date(userProfile.last_login).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ROLE */}
          {activeTab === "role" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">👤</span>
                </div>
                <h2 className="text-2xl font-bold">
                  Role Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600">🏆</span>
                    <label className="block text-sm font-semibold text-blue-800">
                      Role Name
                    </label>
                  </div>
                  <p className="text-lg font-medium text-blue-900">
                    {userProfile.position}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-600">🛡️</span>
                    <label className="block text-sm font-semibold text-purple-800">
                      System Role
                    </label>
                  </div>
                  <p className="text-lg font-medium text-purple-900">
                    {roleId === ROLES.ADMIN
                      ? "Admin"
                      : roleId === ROLES.SUPER_ADMIN
                      ? "Super Admin"
                      : "User"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-green-600">🏢</span>
                    <label className="block text-sm font-semibold text-green-800">
                      Department
                    </label>
                  </div>
                  <p className="text-lg font-medium text-green-900">
                    {userProfile.department}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-600">👔</span>
                    <label className="block text-sm font-semibold text-orange-800">
                      Reports To
                    </label>
                  </div>
                  <p className="text-lg font-medium text-orange-900">
                    {userProfile.manager}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-yellow-600">📅</span>
                    <label className="block text-sm font-semibold text-yellow-800">
                      Start Date
                    </label>
                  </div>
                  <p className="text-lg font-medium text-yellow-900">
                    {userProfile.hire_date
                      ? new Date(userProfile.hire_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Not specified"}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 border border-teal-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-teal-600">⏱️</span>
                    <label className="block text-sm font-semibold text-teal-800">
                      Duration
                    </label>
                  </div>
                  <p className="text-lg font-medium text-teal-900">
                    {userProfile.hire_date
                      ? Math.floor(
                          (new Date() - new Date(userProfile.hire_date)) /
                            (1000 * 60 * 60 * 24 * 30)
                        ) + " months"
                      : userProfile.employment_type || "Not specified"}
                  </p>
                </div>
              </div>

              {/* Role Description */}
              <div className="bg-gray-50 rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>📝</span> Role Summary
                </h3>
                <div className="text-gray-700 space-y-2">
                  <p>
                    <span className="font-medium">Position:</span>{" "}
                    {userProfile.position}
                  </p>
                  <p>
                    <span className="font-medium">Department:</span>{" "}
                    {userProfile.department}
                  </p>
                  <p>
                    <span className="font-medium">Manager:</span>{" "}
                    {userProfile.manager}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> Active employee
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* DEPARTMENT */}
          {activeTab === "department" && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🏢</span>
                </div>
                <h2 className="text-2xl font-bold">
                  Department Information
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-emerald-600">🏢</span>
                    <label className="block text-sm font-semibold text-emerald-800">
                      Department
                    </label>
                  </div>
                  <p className="text-lg font-medium text-emerald-900">
                    {userProfile.department}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-600">👥</span>
                    <label className="block text-sm font-semibold text-blue-800">
                      Team
                    </label>
                  </div>
                  <p className="text-lg font-medium text-blue-900">
                    {userProfile.department} Team
                  </p>
                </div>

                <div className="bg-gradient-to-br from-purple-50 to-violet-50 border border-purple-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-purple-600">👔</span>
                    <label className="block text-sm font-semibold text-purple-800">
                      Manager
                    </label>
                  </div>
                  <p className="text-lg font-medium text-purple-900">
                    {userProfile.manager}
                  </p>
                </div>

                <div className="bg-gradient-to-br from-orange-50 to-red-50 border border-orange-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-orange-600">📅</span>
                    <label className="block text-sm font-semibold text-orange-800">
                      Department Since
                    </label>
                  </div>
                  <p className="text-lg font-medium text-orange-900">
                    {userProfile.hire_date
                      ? new Date(userProfile.hire_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                          }
                        )
                      : "Not specified"}
                  </p>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-6 mt-6">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span>🎯</span> Department Information
                </h3>
                <div className="text-gray-700 space-y-2">
                  <p>
                    <span className="font-medium">Department:</span>{" "}
                    {userProfile.department}
                  </p>
                  <p>
                    <span className="font-medium">Manager:</span>{" "}
                    {userProfile.manager}
                  </p>
                  <p>
                    <span className="font-medium">Your Role:</span>{" "}
                    {userProfile.position}
                  </p>
                  <p>
                    <span className="font-medium">Start Date:</span>{" "}
                    {userProfile.hire_date
                      ? new Date(userProfile.hire_date).toLocaleDateString(
                          "en-US",
                          {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )
                      : "Not specified"}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}