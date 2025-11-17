import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import AppLayout from "../../src/AppLayout.jsx";
import { AppWindow, CheckCircle2, Circle, Clock } from "lucide-react";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function Modules() {
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load published modules from Supabase
  useEffect(() => {
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      setLoading(true);
      
      // Fetch all published modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("*")
        .order("created_at", { ascending: true });

      if (modulesError) throw modulesError;

      // For now, set all modules as pending until we implement user progress tracking
      const modulesWithStatus = (modulesData || []).map((module) => ({
        ...module,
        assigned: "-",
        completed: "-",
        feedback: "-",
        status: "pending", // Default status until progress tracking is implemented
        progress_percent: 0
      }));

      setModules(modulesWithStatus);
    } catch (error) {
      console.error("Error loading modules:", error);
      // Fallback to empty array if error
      setModules([]);
    } finally {
      setLoading(false);
    }
  };

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
                {modules.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 italic">
                      No modules available yet. Check back later!
                    </td>
                  </tr>
                ) : (
                  modules.map((m, idx) => (
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
                      <td
                        className={`p-3 text-sm font-semibold ${
                          m.feedback === "Yes"
                            ? "text-emerald-600"
                            : "text-gray-500 italic"
                        }`}
                      >
                        {m.feedback}
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
