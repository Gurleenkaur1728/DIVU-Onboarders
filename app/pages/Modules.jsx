import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import AppLayout from "../../src/AppLayout.jsx";
import { AppWindow, CheckCircle2, Circle, Clock, MessageSquare, Search } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Modules() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortBy, setSortBy] = useState("dateAssigned");

  // Load published modules from Supabase
  useEffect(() => {
    if (user?.profile_id) {
      loadModules();
    }
  }, [user?.profile_id]);

  const loadModules = async () => {
    try {
      setLoading(true);
      const userId = user?.profile_id;
      
      if (!userId) {
        console.warn("No user ID found");
        setModules([]);
        return;
      }

      // Fetch all active modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (modulesError) throw modulesError;

      // Fetch user progress for all modules
      const { data: progressData, error: progressError } = await supabase
        .from("user_module_progress")
        .select("module_id, is_completed, completed_at, created_at, completion_percentage")
        .eq("user_id", userId);

      if (progressError) throw progressError;

      // Fetch feedback for all modules
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("module_feedback")
        .select("module_id, rating, created_at")
        .eq("user_id", userId);

      if (feedbackError) throw feedbackError;

      // Combine data
      const modulesWithStatus = (modulesData || []).map((module) => {
        const progress = progressData?.find(p => p.module_id === module.id);
        const feedback = feedbackData?.find(f => f.module_id === module.id);
        
        // Date assigned = when user_module_progress was created (first interaction)
        const dateAssigned = progress?.created_at 
          ? new Date(progress.created_at).toLocaleDateString()
          : "-";
        
        // Date completed = when module was marked complete
        const dateCompleted = progress?.is_completed && progress?.completed_at
          ? new Date(progress.completed_at).toLocaleDateString()
          : "-";
        
        // Feedback status
        const feedbackStatus = feedback ? "Yes" : (progress?.is_completed ? "No" : "-");
        
        // Module status
        let status = "not-started";
        if (progress?.is_completed) {
          status = "completed";
        } else if (progress && progress.completion_percentage > 0) {
          status = "in-progress";
        }

        return {
          ...module,
          assigned: dateAssigned,
          completed: dateCompleted,
          feedback: feedbackStatus,
          hasFeedback: !!feedback,
          isCompleted: progress?.is_completed || false,
          status: status,
          progress_percent: progress?.completion_percentage || 0
        };
      });

      setModules(modulesWithStatus);
    } catch (error) {
      console.error("Error loading modules:", error);
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort modules
  const filteredModules = modules
    .filter(m => {
      // Search filter
      const matchesSearch = searchTerm === "" || 
        m.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.description?.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === "all" || m.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "alphabetical":
          return a.title.localeCompare(b.title);
        case "completion":
          const statusOrder = { "completed": 0, "in-progress": 1, "not-started": 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        case "dateAssigned":
        default:
          // Sort by date assigned (newest first)
          if (a.assigned === "-") return 1;
          if (b.assigned === "-") return -1;
          return new Date(b.assigned) - new Date(a.assigned);
      }
    });

  return (
    <AppLayout>
    {/* <div
      className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60 relative"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    > */}
      {/* Main */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-lg px-4 py-3 mb-6 shadow-sm border border-emerald-200/50">
          <span className="text-emerald-950 font-semibold text-base sm:text-lg">
            Welcome {localStorage.getItem("profile_name") || "<name>"} to DIVU!
          </span>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title */}
        <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-950 mb-6 tracking-wide">
          CULTURE MODULES
        </h1>

        {/* Search and Filter Section */}
        <div className="bg-white/95 rounded-xl shadow-md p-4 mb-6 border border-emerald-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">All Statuses</option>
              <option value="completed">Completed</option>
              <option value="in-progress">In Progress</option>
              <option value="not-started">Not Started</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="dateAssigned">Sort by Date Assigned</option>
              <option value="alphabetical">Sort Alphabetically</option>
              <option value="completion">Sort by Completion</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-600">
            Showing {filteredModules.length} of {modules.length} modules
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-emerald-700 text-lg">Loading modules...</div>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto rounded-2xl shadow-lg bg-white/95 border border-emerald-200">
            <table className="min-w-[700px] w-full text-left border-collapse text-sm md:text-base">
              <thead className="bg-emerald-800 text-white">
                <tr>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold">Module</th>
                  <th className="p-4 font-semibold">Date Assigned</th>
                  <th className="p-4 font-semibold">Date Completed</th>
                  <th className="p-4 font-semibold">Feedback</th>
                </tr>
              </thead>
              <tbody>
                {filteredModules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">
                      {modules.length === 0 
                        ? "No modules available yet. Check back later!"
                        : "No modules match your search or filter criteria."}
                    </td>
                  </tr>
                ) : (
                  filteredModules.map((m, idx) => (
                    <tr
                      key={m.id}
                      className={`transition-colors duration-200 ${
                        idx % 2 === 0
                          ? "bg-emerald-50/90 hover:bg-emerald-100/80"
                          : "bg-emerald-100/70 hover:bg-emerald-200/70"
                      }`}
                    >
                      {/* Status */}
                      <td className="p-3 text-center">
                        {m.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        ) : m.status === "in-progress" ? (
                          <Clock className="w-5 h-5 text-amber-500" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400" />
                        )}
                      </td>

                      {/* Title */}
                      <td className="p-3 font-medium text-emerald-900">
                        <Link
                          to={`/modules/${m.id}`}
                          className="text-emerald-700 hover:text-emerald-900 hover:underline transition-colors duration-200"
                        >
                          {m.title}
                        </Link>
                      </td>

                      {/* Dates */}
                      <td className="p-3 text-sm text-emerald-800">{m.assigned}</td>
                      <td className="p-3 text-sm text-emerald-800">{m.completed}</td>

                      {/* Feedback */}
                      <td className="p-3">
                        {m.hasFeedback ? (
                          <button
                            onClick={() => navigate('/feedback')}
                            className="text-emerald-600 font-semibold hover:underline flex items-center gap-1"
                          >
                            <MessageSquare className="w-4 h-4" />
                            View
                          </button>
                        ) : m.isCompleted ? (
                          <button
                            onClick={() => navigate(`/feedback/${m.id}`)}
                            className="text-amber-600 font-semibold hover:underline"
                          >
                            Give Feedback
                          </button>
                        ) : (
                          <span className="text-gray-400 italic">-</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
