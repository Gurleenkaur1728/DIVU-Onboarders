import { useEffect, useState } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { Link } from "react-router-dom";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";
import { H1, Text } from "../components/ui/Typography.jsx";

export default function Feedback() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("submitted");
  const [feedbacks, setFeedbacks] = useState([]);
  const [modules, setModules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  // Load modules and user progress
  useEffect(() => {
    if (user?.profile_id) {
      loadModulesAndProgress();
    }
  }, [user]);

  const viewFeedbackDetails = (feedback) => {
    const module = modules.find(m => m.id === feedback.module_id);
    setSelectedFeedback(feedback);
    setSelectedModule(module);
  };

  const loadModulesAndProgress = async () => {
    try {
      setLoading(true);
      
      // Load all modules
      const { data: modulesData, error: modulesError } = await supabase
        .from("modules")
        .select("id, title, description")
        .order("created_at", { ascending: true });

      if (modulesError) {
        console.error("Error loading modules:", modulesError);
        return;
      }

      // Load user progress to see which modules are completed
      const { data: progressData, error: progressError } = await supabase
        .from("user_module_progress")
        .select("module_id, is_completed, completed_at")
        .eq("user_id", user.profile_id);

      if (progressError) {
        console.error("Error loading progress:", progressError);
      }

      // Load existing feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from("module_feedback")
        .select("*")
        .eq("user_id", user.profile_id)
        .order("created_at", { ascending: false });

      if (feedbackError) {
        console.error("Error loading feedback:", feedbackError);
      }

      // Combine data - set modules and feedbacks
      setModules(modulesData || []);
      setFeedbacks(feedbackData || []);

    } catch (error) {
      console.error("Error in loadModulesAndProgress:", error);
    } finally {
      setLoading(false);
    }
  };

  // Get completed modules (those that have feedback submitted)
  const getCompletedModules = () => {
    if (!feedbacks || feedbacks.length === 0) return [];
    
    return modules.filter(module => {
      return feedbacks.some(f => f.module_id === module.id);
    });
  };

  // Get modules that are completed but don't have feedback yet
  const getModulesNeedingFeedback = () => {
    // This would ideally check user_progress, but for now we'll return empty
    // since feedback is submitted during module completion
    return [];
  };

  const submittedModules = getCompletedModules();
  const pendingModules = getModulesNeedingFeedback();

  return (
    <AppLayout>
      <div className="ds-container ds-p-6">
        {/* Header */}
        <div className="ds-mb-8">
          <H1>Feedback Center</H1>
          <Text className="ds-text-muted ds-mt-2">
            Share your thoughts and view your submitted feedback
          </Text>
        </div>

        {/* Tabs */}
        <div className="ds-mb-6" style={{borderBottom: '2px solid var(--ds-border)'}}>
          <div className="flex gap-1">
            <button
              onClick={() => setActiveTab("submitted")}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "submitted"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-600 hover:text-emerald-600"
              }`}
            >
              Feedback Submitted
            </button>
            <button
              <button
              onClick={() => setActiveTab("create")}
              className={`px-6 py-3 font-semibold transition-all duration-200 border-b-2 ${
                activeTab === "create"
                  ? "border-emerald-600 text-emerald-600"
                  : "border-transparent text-gray-600 hover:text-emerald-600"
              }`}
            >
              Create Feedback
            </button>
          </div>
        </div>

        {/* ✅ Submitted Feedback Table */}
        {activeTab === "submitted" && (
          <div className="overflow-x-auto">
            {loading ? (
              <div className="ds-loading">
                <div className="ds-spinner"></div>
              </div>
            ) : (
              <table className="ds-table">
                <thead>
                  <tr>
                    <th style={{color: 'var(--ds-primary)'}}>Module Name</th>
                    <th style={{color: 'var(--ds-primary)'}}>Rating</th>
                    <th style={{color: 'var(--ds-primary)'}}>Difficulty</th>
                    <th style={{color: 'var(--ds-primary)'}}>Feedback Date</th>
                    <th style={{color: 'var(--ds-primary)'}}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {submittedModules.length > 0 ? (
                    submittedModules.map((module) => {
                      const feedback = feedbacks.find((f) => f.module_id === module.id);
                      return (
                        <tr
                          key={module.id}
                          className="border-b last:border-0 hover:bg-emerald-50 transition-colors duration-200"
                        >
                          <td className="p-4 text-emerald-900 font-medium">{module.title}</td>
                          <td className="p-4 text-emerald-800">
                            <div className="flex items-center">
                              {'⭐'.repeat(feedback?.rating || 0)}
                              <span className="ml-2 text-sm">({feedback?.rating || 0}/5)</span>
                            </div>
                          </td>
                          <td className="p-4 text-emerald-800">
                            {feedback?.difficulty_level ? `${feedback.difficulty_level}/5` : '-'}
                          </td>
                          <td className="p-4 text-emerald-800">
                            {feedback?.created_at ? new Date(feedback.created_at).toLocaleDateString() : "-"}
                          </td>
                          <td className="p-4">
                            <button
                              onClick={() => viewFeedbackDetails(feedback)}
                              className="text-emerald-700 font-medium hover:underline"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="p-6 text-center text-gray-500">
                        No feedback submitted yet. Complete a module to provide feedback!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* ✅ Create Feedback Table */}
        {activeTab === "create" && (
          <div className="bg-white/95 rounded-2xl shadow-lg overflow-hidden border border-emerald-200">
            {loading ? (
              <div className="p-8 text-center text-gray-600">Loading modules...</div>
            ) : (
              <table className="w-full text-left border-collapse text-sm md:text-base">
                <thead className="bg-emerald-800 text-white">
                  <tr>
                    <th className="p-4 font-semibold">Module Name</th>
                    <th className="p-4 font-semibold">Status</th>
                    <th className="p-4 font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingModules.length > 0 ? (
                    pendingModules.map((module) => (
                      <tr
                        key={module.id}
                        className="border-b last:border-0 hover:bg-emerald-50 transition-colors duration-200"
                      >
                        <td className="p-4 text-emerald-900 font-medium">{module.title}</td>
                        <td className="p-4 text-amber-600">Completed - Feedback Pending</td>
                        <td className="p-4">
                          <Link
                            to={`/modules/${module.id}`}
                            className="text-blue-600 font-medium hover:underline"
                          >
                            Provide Feedback
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-6 text-center text-gray-500">
                        No modules awaiting feedback. Feedback is provided when you complete a module!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Feedback Details Modal */}
        {selectedFeedback && (
          <FeedbackDetailsModal 
            feedback={selectedFeedback} 
            module={selectedModule}
            onClose={() => setSelectedFeedback(null)}
          />
        )}
      </div>
    </AppLayout>
  );
}

// Feedback Details Modal Component
function FeedbackDetailsModal({ feedback, module, onClose }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-emerald-900">{module?.title} - Feedback Details</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl"
          >
            ×
          </button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Overall Rating</label>
            <div className="flex items-center">
              {'⭐'.repeat(feedback.rating)}
              <span className="ml-2 text-sm text-gray-600">({feedback.rating}/5)</span>
            </div>
          </div>
          
          {feedback.difficulty_level && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Difficulty Level</label>
              <div className="text-emerald-800">{feedback.difficulty_level}/5</div>
            </div>
          )}
          
          {feedback.feedback_text && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Feedback</label>
              <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{feedback.feedback_text}</p>
            </div>
          )}
          
          {feedback.suggestions && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Suggestions</label>
              <p className="text-gray-800 bg-gray-50 p-3 rounded-lg">{feedback.suggestions}</p>
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Submitted Date</label>
            <p className="text-gray-600">{new Date(feedback.created_at).toLocaleString()}</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
