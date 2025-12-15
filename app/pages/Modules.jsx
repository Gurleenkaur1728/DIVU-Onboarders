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
  const [sortBy, setSortBy] = useState("moduleAscending");

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
        .order("order_index", { ascending: true });


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
          moduleOrder: getModuleOrder(module.title),
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
          
        case "completion": {
          const statusOrder = { "completed": 0, "in-progress": 1, "not-started": 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        }
        case "dateAssigned":
          // Sort by date assigned (newest first)
          if (a.assigned === "-") return 1;
          if (b.assigned === "-") return -1;
          return new Date(b.assigned) - new Date(a.assigned);
          case "serial":
    default:
      return a.order_index - b.order_index;
      }
    });

  return (
    <AppLayout>
      <div className="flex-1 min-h-dvh p-6 space-y-6 mt-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Culture Modules</h1>
          <p className="text-gray-600 mt-2">
            Welcome {localStorage.getItem("profile_name") || "there"}! Explore and complete your learning modules
          </p>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white/95 dark:bg-DivuDarkGreen/60 rounded-xl shadow-md p-4 mb-6 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search modules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
              />
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
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
              className="px-4 py-2 border border-emerald-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-black"
            >
              <option value="moduleAscending">Module Number Ascending</option>
              <option value="moduleDescending">Module Number Descending</option>
              <option value="dateAssigned">Sort by Date Assigned</option>
              <option value="alphabetical">Sort Alphabetically</option>
              <option value="completion">Sort by Completion</option>
            </select>
          </div>

          {/* Results count */}
          <div className="mt-3 text-sm text-gray-900 dark:text-gray-300">
            Showing {filteredModules.length} of {modules.length} modules
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-gray-700 text-lg">Loading modules...</div>
          </div>
        ) : (
          /* Table */
          <div className="overflow-x-auto rounded-xl shadow-lg bg-white border border-gray-200 dark:bg-black/40 dark:border-DivuBlue/20">
            <table className="w-full text-left border-collapse text-sm table-fixed">
              <thead className="bg-gray-100 border-b border-gray-200 dark:bg-DivuBlue/20">
                <tr>
                  <th className="p-4 font-semibold" style={{width: '80px'}}>Status</th>
                  <th className="p-4 font-semibold">Module</th>
                  <th className="p-4 font-semibold" style={{width: '150px'}}>Date Assigned</th>
                  <th className="p-4 font-semibold" style={{width: '150px'}}>Date Completed</th>
                  <th className="p-4 font-semibold text-center" style={{width: '150px'}}>Feedback</th>
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
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors duration-200"
                    >
                      {/* Status */}
                      <td className="p-4 text-center" style={{width: '80px'}}>
                        {m.status === "completed" ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-600 inline-block" />
                        ) : m.status === "in-progress" ? (
                          <Clock className="w-5 h-5 text-amber-500 inline-block" />
                        ) : (
                          <Circle className="w-5 h-5 text-gray-400 inline-block" />
                        )}
                      </td>

                      {/* Title */}
                      <td className="p-4 font-medium text-gray-900">
                        <Link
                          to={`/modules/${m.id}`}
                          className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors duration-200"
                        >
                          {m.title}
                        </Link>
                      </td>

                      {/* Dates */}
                      <td className="p-4 text-sm text-gray-700" style={{width: '150px'}}>{m.assigned}</td>
                      <td className="p-4 text-sm text-gray-700" style={{width: '150px'}}>{m.completed}</td>

                      {/* Feedback */}
                      <td className="p-4 text-center" style={{width: '150px'}}>
                        {m.hasFeedback ? (
                          <button
                            onClick={() => navigate('/feedback')}
                            className="text-emerald-600 font-medium hover:text-emerald-700 hover:underline"
                          >
                            View
                          </button>
                        ) : m.isCompleted ? (
                          <button
                            onClick={() => navigate(`/feedback/${m.id}`)}
                            className="text-orange-500 font-medium hover:text-orange-600 hover:underline"
                          >
                            Give Feedback
                          </button>
                        ) : (
                          <span className="text-gray-400">-</span>
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

/* -------------------- HELPERS -------------------- */

function getModuleOrder(title = "") {
  const match = title.match(/\d+/); // finds first number
  return match ? Number(match[0]) : Infinity;
}


