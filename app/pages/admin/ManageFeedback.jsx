import { useState, useEffect } from "react";
import Sidebar from "../../components/Sidebar.jsx";
import { Trash2, Star, Eye, Filter } from "lucide-react";
import { useRole } from "../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../src/lib/supabaseClient.js";

export default function ManageFeedback() {
  const { roleId } = useRole();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Load all feedback with user and module details
  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      setLoading(true);
      
      // Get feedback data first
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('module_feedback')
        .select('*')
        .order('created_at', { ascending: false });

      if (feedbackError) {
        console.error('Error loading feedback:', feedbackError);
        return;
      }

      if (!feedbackData || feedbackData.length === 0) {
        console.log('No feedback found');
        setFeedbacks([]);
        return;
      }

      // Get user details for each feedback
      const userIds = [...new Set(feedbackData.map(f => f.user_id).filter(Boolean))];
      const moduleIds = [...new Set(feedbackData.map(f => f.module_id).filter(Boolean))];

      // Fetch users and modules separately
      const [usersResponse, modulesResponse] = await Promise.all([
        supabase.from('users').select('id, name, email').in('id', userIds),
        supabase.from('modules').select('id, title').in('id', moduleIds)
      ]);

      const usersMap = {};
      const modulesMap = {};

      if (usersResponse.data) {
        usersResponse.data.forEach(user => {
          usersMap[user.id] = user;
        });
      }

      if (modulesResponse.data) {
        modulesResponse.data.forEach(module => {
          modulesMap[module.id] = module;
        });
      }

      // Combine the data
      const enrichedFeedback = feedbackData.map(feedback => ({
        ...feedback,
        users: usersMap[feedback.user_id] || { name: 'Unknown User', email: '' },
        modules: modulesMap[feedback.module_id] || { title: 'Unknown Module' }
      }));

      console.log('Loaded feedback data:', enrichedFeedback);
      setFeedbacks(enrichedFeedback);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFeedback = async (feedbackId) => {
    if (!confirm('Are you sure you want to delete this feedback?')) return;

    try {
      const { error } = await supabase
        .from('module_feedback')
        .delete()
        .eq('id', feedbackId);

      if (error) {
        alert('Error deleting feedback: ' + error.message);
        return;
      }

      setFeedbacks(prev => prev.filter(f => f.id !== feedbackId));
      alert('Feedback deleted successfully!');
    } catch (err) {
      alert('Error deleting feedback: ' + err.message);
    }
  };

  const viewFeedbackDetails = (feedback) => {
    setSelectedFeedback(feedback);
  };

  // Filter and search logic
  const filteredFeedbacks = feedbacks.filter(feedback => {
    // Filter by rating
    if (filterRating !== 'all' && feedback.rating !== parseInt(filterRating)) {
      return false;
    }
    
    // Search by user name or module title
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      const userName = feedback.users?.name?.toLowerCase() || '';
      const moduleTitle = feedback.modules?.title?.toLowerCase() || '';
      if (!userName.includes(searchLower) && !moduleTitle.includes(searchLower)) {
        return false;
      }
    }
    
    return true;
  });

  const getDifficultyText = (level) => {
    const levels = {
      1: 'Very Easy',
      2: 'Easy', 
      3: 'Medium',
      4: 'Hard',
      5: 'Very Hard'
    };
    return levels[level] || 'Not specified';
  };

  return (
    <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
      <Sidebar active="manage-feedback" role={roleId} />

      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Admin Panel – Employee Feedback Management
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg">
          EMPLOYEE FEEDBACK ({feedbacks.length} total)
        </div>

        {/* Filters */}
        <div className="bg-white/95 rounded-xl shadow-lg p-4 mb-6 border border-emerald-200">
          <div className="flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <Filter size={18} className="text-emerald-600" />
              <span className="font-medium text-emerald-800">Filters:</span>
            </div>
            
            {/* Search */}
            <input
              type="text"
              placeholder="Search by employee or module..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            />
            
            {/* Rating filter */}
            <select
              value={filterRating}
              onChange={(e) => setFilterRating(e.target.value)}
              className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            >
              <option value="all">All Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>

            <div className="text-sm text-emerald-600">
              Showing {filteredFeedbacks.length} of {feedbacks.length} feedback entries
            </div>
          </div>
        </div>

        {/* Feedback Table */}
        <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
          {loading ? (
            <div className="p-8 text-center text-emerald-600">
              Loading feedback...
            </div>
          ) : filteredFeedbacks.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {feedbacks.length === 0 ? 'No feedback submitted yet.' : 'No feedback matches your filters.'}
            </div>
          ) : (
            <table className="min-w-[980px] w-full border-collapse">
              <thead>
                <tr className="bg-emerald-900/95 text-left text-emerald-100">
                  <Th>Employee</Th>
                  <Th>Module</Th>
                  <Th>Rating</Th>
                  <Th>Difficulty</Th>
                  <Th>Date</Th>
                  <Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {filteredFeedbacks.map((feedback, idx) => (
                  <tr
                    key={feedback.id}
                    className={`text-emerald-950 text-sm ${
                      idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                    } hover:bg-emerald-200/60 transition-colors`}
                  >
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium">{feedback.users?.name || 'Unknown User'}</div>
                        <div className="text-xs text-gray-600">{feedback.users?.email || ''}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{feedback.modules?.title || 'Unknown Module'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            size={16}
                            className={`${
                              i < feedback.rating
                                ? "text-yellow-400 fill-yellow-400"
                                : "text-gray-300"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-sm font-medium">({feedback.rating}/5)</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">{getDifficultyText(feedback.difficulty_level)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {feedback.created_at ? new Date(feedback.created_at).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => viewFeedbackDetails(feedback)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded bg-blue-500 text-white text-xs font-semibold hover:bg-blue-600 transition-colors"
                        >
                          <Eye size={14} /> View
                        </button>
                        <button
                          onClick={() => deleteFeedback(feedback.id)}
                          className="flex items-center gap-1 px-2 py-1.5 rounded bg-red-500 text-white text-xs font-semibold hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Feedback Details Modal */}
        {selectedFeedback && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-emerald-800">Feedback Details</h3>
                <button
                  onClick={() => setSelectedFeedback(null)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-emerald-800">Employee:</label>
                    <p className="text-gray-700">{selectedFeedback.users?.name || 'Unknown'}</p>
                    <p className="text-sm text-gray-500">{selectedFeedback.users?.email || ''}</p>
                  </div>
                  <div>
                    <label className="font-medium text-emerald-800">Module:</label>
                    <p className="text-gray-700">{selectedFeedback.modules?.title || 'Unknown Module'}</p>
                  </div>
                </div>
                
                <div className="grid md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-medium text-emerald-800">Rating:</label>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          size={18}
                          className={`${
                            i < selectedFeedback.rating
                              ? "text-yellow-400 fill-yellow-400"
                              : "text-gray-300"
                          }`}
                        />
                      ))}
                      <span className="ml-2">({selectedFeedback.rating}/5)</span>
                    </div>
                  </div>
                  <div>
                    <label className="font-medium text-emerald-800">Difficulty:</label>
                    <p className="text-gray-700">{getDifficultyText(selectedFeedback.difficulty_level)}</p>
                  </div>
                  <div>
                    <label className="font-medium text-emerald-800">Date:</label>
                    <p className="text-gray-700">
                      {selectedFeedback.created_at ? new Date(selectedFeedback.created_at).toLocaleString() : 'N/A'}
                    </p>
                  </div>
                </div>
                
                {selectedFeedback.feedback_text && (
                  <div>
                    <label className="font-medium text-emerald-800">Feedback:</label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedFeedback.feedback_text}
                    </p>
                  </div>
                )}
                
                {selectedFeedback.suggestions && (
                  <div>
                    <label className="font-medium text-emerald-800">Suggestions for Improvement:</label>
                    <p className="text-gray-700 bg-gray-50 p-3 rounded-lg whitespace-pre-wrap">
                      {selectedFeedback.suggestions}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Subcomponent ---------- */
function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold text-emerald-50 border-r border-emerald-800/50">
      {children}
    </th>
  );
}
