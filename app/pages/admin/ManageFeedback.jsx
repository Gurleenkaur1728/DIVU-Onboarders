import { useState, useEffect } from "react";
import AppLayout from "../../../src/AppLayout.jsx";
import { Trash2, Star, Eye, Filter, Download, BarChart3, TrendingUp, Users, Calendar, CheckCircle2, Bell, X } from "lucide-react";
import { useRole } from "../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../src/lib/supabaseClient.js";

export default function ManageFeedback() {
  const { roleId } = useRole();
  const [feedbacks, setFeedbacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [filterRating, setFilterRating] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [selectedItems, setSelectedItems] = useState([]);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState('desc');
  const [analytics, setAnalytics] = useState({
    avgRating: 0,
    totalFeedback: 0,
    ratingDistribution: {},
    difficultyDistribution: {},
    monthlyTrends: [],
    topModules: []
  });
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Load all feedback with user and module details
  useEffect(() => {
    loadFeedbacks();
    
    // Set up real-time subscription for new feedback
    const feedbackSubscription = supabase
      .channel('feedback_changes')
      .on('postgres_changes', 
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'module_feedback' 
        },
        (payload) => {
          console.log('New feedback received:', payload);
          handleNewFeedback(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(feedbackSubscription);
    };
  }, []);

  const handleNewFeedback = async (newFeedback) => {
    // Fetch user and module details for the new feedback
    const [userResponse, moduleResponse] = await Promise.all([
      supabase.from('users').select('id, name, email').eq('id', newFeedback.user_id).single(),
      supabase.from('modules').select('id, title').eq('id', newFeedback.module_id).single()
    ]);

    const enrichedFeedback = {
      ...newFeedback,
      users: userResponse.data || { name: 'Unknown User', email: '' },
      modules: moduleResponse.data || { title: 'Unknown Module' }
    };

    // Add to feedbacks list
    setFeedbacks(prev => [enrichedFeedback, ...prev]);

    // Create notification
    const notification = {
      id: Date.now(),
      type: 'new_feedback',
      message: `New feedback from ${enrichedFeedback.users.name} for "${enrichedFeedback.modules.title}"`,
      rating: enrichedFeedback.rating,
      timestamp: new Date(),
      feedbackId: enrichedFeedback.id
    };

    setNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep only 10 most recent
    
    // Show browser notification if permission granted
    if (Notification.permission === 'granted') {
      new Notification('New Feedback Received', {
        body: notification.message,
        icon: '/favicon.ico'
      });
    }
  };

  const requestNotificationPermission = async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission();
    }
  };

  const dismissNotification = (notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const viewNotificationFeedback = (feedbackId) => {
    const feedback = feedbacks.find(f => f.id === feedbackId);
    if (feedback) {
      setSelectedFeedback(feedback);
      setShowNotifications(false);
    }
  };

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

  const exportToCSV = () => {
    const dataToExport = selectedItems.length > 0 
      ? filteredFeedbacks.filter(f => selectedItems.includes(f.id))
      : filteredFeedbacks;

    const csvData = [
      ['Employee', 'Email', 'Module', 'Rating', 'Difficulty', 'Date', 'Feedback', 'Suggestions'],
      ...dataToExport.map(feedback => [
        feedback.users?.name || 'Unknown',
        feedback.users?.email || '',
        feedback.modules?.title || 'Unknown Module',
        feedback.rating || 0,
        getDifficultyText(feedback.difficulty_level),
        feedback.created_at ? new Date(feedback.created_at).toLocaleDateString() : '',
        (feedback.feedback_text || '').replace(/\n/g, ' '),
        (feedback.suggestions || '').replace(/\n/g, ' ')
      ])
    ];

    const csvContent = csvData.map(row => 
      row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `feedback_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    alert(`Exported ${dataToExport.length} feedback entries to CSV!`);
  };

  const toggleSelectAll = () => {
    if (selectedItems.length === filteredFeedbacks.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(filteredFeedbacks.map(f => f.id));
    }
  };

  const toggleSelectItem = (feedbackId) => {
    setSelectedItems(prev => 
      prev.includes(feedbackId)
        ? prev.filter(id => id !== feedbackId)
        : [...prev, feedbackId]
    );
  };

  const bulkDelete = async () => {
    if (selectedItems.length === 0) {
      alert('Please select items to delete');
      return;
    }

    if (!confirm(`Are you sure you want to delete ${selectedItems.length} feedback entries?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('module_feedback')
        .delete()
        .in('id', selectedItems);

      if (error) {
        alert('Error deleting feedback: ' + error.message);
        return;
      }

      setFeedbacks(prev => prev.filter(f => !selectedItems.includes(f.id)));
      setSelectedItems([]);
      alert('Selected feedback deleted successfully!');
    } catch (err) {
      alert('Error deleting feedback: ' + err.message);
    }
  };

  // Filter and search logic
  const filteredFeedbacks = feedbacks
    .filter(feedback => {
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
      
      // Filter by date range
      if (dateRange.start || dateRange.end) {
        const feedbackDate = new Date(feedback.created_at);
        if (dateRange.start && feedbackDate < new Date(dateRange.start)) {
          return false;
        }
        if (dateRange.end && feedbackDate > new Date(dateRange.end)) {
          return false;
        }
      }
      
      return true;
    })
    .sort((a, b) => {
      let aVal, bVal;
      
      switch (sortBy) {
        case 'created_at':
          aVal = new Date(a.created_at);
          bVal = new Date(b.created_at);
          break;
        case 'rating':
          aVal = a.rating;
          bVal = b.rating;
          break;
        case 'user_name':
          aVal = a.users?.name || '';
          bVal = b.users?.name || '';
          break;
        case 'module_title':
          aVal = a.modules?.title || '';
          bVal = b.modules?.title || '';
          break;
        default:
          aVal = a[sortBy];
          bVal = b[sortBy];
      }
      
      if (sortOrder === 'asc') {
        return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      } else {
        return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
      }
    });

  // Update analytics when feedbacks change
  useEffect(() => {
    const calculateAnalytics = (feedbackData) => {
      if (!feedbackData || feedbackData.length === 0) {
        setAnalytics({
          avgRating: 0,
          totalFeedback: 0,
          ratingDistribution: {},
          difficultyDistribution: {},
          monthlyTrends: [],
          topModules: []
        });
        return;
      }

      // Calculate average rating
      const avgRating = (feedbackData.reduce((sum, f) => sum + (f.rating || 0), 0) / feedbackData.length).toFixed(1);

      // Rating distribution
      const ratingDistribution = feedbackData.reduce((acc, f) => {
        acc[f.rating] = (acc[f.rating] || 0) + 1;
        return acc;
      }, {});

      // Difficulty distribution
      const difficultyDistribution = feedbackData.reduce((acc, f) => {
        const level = getDifficultyText(f.difficulty_level);
        acc[level] = (acc[level] || 0) + 1;
        return acc;
      }, {});

      // Monthly trends (last 6 months)
      const monthlyTrends = [];
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = month.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        const count = feedbackData.filter(f => {
          const feedbackDate = new Date(f.created_at);
          return feedbackDate.getMonth() === month.getMonth() && 
                 feedbackDate.getFullYear() === month.getFullYear();
        }).length;
        monthlyTrends.push({ month: monthName, count });
      }

      // Top modules by feedback count
      const moduleStats = feedbackData.reduce((acc, f) => {
        const moduleName = f.modules?.title || 'Unknown Module';
        if (!acc[moduleName]) {
          acc[moduleName] = { count: 0, avgRating: 0, totalRating: 0 };
        }
        acc[moduleName].count++;
        acc[moduleName].totalRating += f.rating || 0;
        acc[moduleName].avgRating = (acc[moduleName].totalRating / acc[moduleName].count).toFixed(1);
        return acc;
      }, {});

      const topModules = Object.entries(moduleStats)
        .map(([name, stats]) => ({ name, ...stats }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setAnalytics({
        avgRating: parseFloat(avgRating),
        totalFeedback: feedbackData.length,
        ratingDistribution,
        difficultyDistribution,
        monthlyTrends,
        topModules
      });
    };
    
    calculateAnalytics(feedbacks);
  }, [feedbacks]);

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
    <AppLayout>
    {/* // <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}> */}
      {/* <Sidebar active="manage-feedback" role={roleId} /> */}
    
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 shadow-md mb-4">
          <span className="font-semibold text-emerald-950">
            Admin Panel – Employee Feedback Management
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-4 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide drop-shadow-lg flex justify-between items-center">
          <span>EMPLOYEE FEEDBACK ({feedbacks.length} total)</span>
          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  requestNotificationPermission();
                }}
                className="relative p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors"
              >
                <Bell size={20} />
                {notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
              
              {/* Notifications Dropdown */}
              {showNotifications && (
                <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                  <div className="p-3 border-b border-gray-200 bg-gray-50">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Bell size={16} />
                      Recent Notifications
                    </h4>
                  </div>
                  
                  {notifications.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      No new notifications
                    </div>
                  ) : (
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(notification => (
                        <div key={notification.id} className="p-3 border-b border-gray-100 hover:bg-gray-50">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 cursor-pointer" onClick={() => viewNotificationFeedback(notification.feedbackId)}>
                              <p className="text-sm font-medium text-gray-800">
                                {notification.message}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: 5 }).map((_, i) => (
                                    <Star
                                      key={i}
                                      size={12}
                                      className={`${
                                        i < notification.rating
                                          ? "text-yellow-400 fill-yellow-400"
                                          : "text-gray-300"
                                      }`}
                                    />
                                  ))}
                                </div>
                                <span className="text-xs text-gray-500">
                                  {notification.timestamp.toLocaleTimeString()}
                                </span>
                              </div>
                            </div>
                            <button
                              onClick={() => dismissNotification(notification.id)}
                              className="text-gray-400 hover:text-gray-600 ml-2"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {notifications.length > 0 && (
                    <div className="p-2 border-t border-gray-200">
                      <button
                        onClick={() => setNotifications([])}
                        className="w-full text-center text-sm text-gray-600 hover:text-gray-800 py-2"
                      >
                        Clear all notifications
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              <BarChart3 size={16} />
              {showAnalytics ? 'Hide Analytics' : 'Show Analytics'}
            </button>
          </div>
        </div>

        {/* Analytics Dashboard */}
        {showAnalytics && (
          <div className="bg-white/95 rounded-xl shadow-lg p-6 mb-6 border border-emerald-200">
            <h3 className="text-xl font-bold text-emerald-800 mb-4 flex items-center gap-2">
              <TrendingUp size={20} />
              Analytics Dashboard
            </h3>
            
            {/* Key Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-sm">Total Feedback</p>
                    <p className="text-2xl font-bold">{analytics.totalFeedback}</p>
                  </div>
                  <Users size={24} className="text-blue-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Average Rating</p>
                    <p className="text-2xl font-bold">{analytics.avgRating}/5</p>
                  </div>
                  <Star size={24} className="text-green-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm">This Month</p>
                    <p className="text-2xl font-bold">{analytics.monthlyTrends[analytics.monthlyTrends.length - 1]?.count || 0}</p>
                  </div>
                  <Calendar size={24} className="text-purple-200" />
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-orange-100 text-sm">Positive Rate</p>
                    <p className="text-2xl font-bold">
                      {analytics.totalFeedback > 0 ? 
                        Math.round((Object.entries(analytics.ratingDistribution)
                          .filter(([rating]) => parseInt(rating) >= 4)
                          .reduce((sum, [, count]) => sum + count, 0) / analytics.totalFeedback) * 100)
                        : 0}%
                    </p>
                  </div>
                  <CheckCircle2 size={24} className="text-orange-200" />
                </div>
              </div>
            </div>
            
            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Rating Distribution */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Rating Distribution</h4>
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map(rating => {
                    const count = analytics.ratingDistribution[rating] || 0;
                    const percentage = analytics.totalFeedback > 0 ? (count / analytics.totalFeedback) * 100 : 0;
                    return (
                      <div key={rating} className="flex items-center gap-3">
                        <div className="flex items-center gap-1 w-16">
                          <span className="text-sm">{rating}</span>
                          <Star size={12} className="text-yellow-400 fill-yellow-400" />
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-500" 
                            style={{ width: `${percentage}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-gray-600 w-12">{count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
              
              {/* Top Modules */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-800 mb-3">Top Modules by Feedback</h4>
                <div className="space-y-2">
                  {analytics.topModules.map((module, idx) => (
                    <div key={module.name} className="flex items-center justify-between p-2 bg-white rounded border">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-500 text-white text-xs rounded-full flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span className="text-sm font-medium truncate">{module.name}</span>
                      </div>
                      <div className="text-right text-xs">
                        <div>{module.count} feedback</div>
                        <div className="text-gray-500">Avg: {module.avgRating}★</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white/95 rounded-xl shadow-lg p-4 mb-6 border border-emerald-200">
          <div className="space-y-4">
            {/* First row - Filters */}
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
              
              {/* Date range */}
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Start date"
              />
              
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="End date"
              />
              
              {/* Sort options */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="created_at">Sort by Date</option>
                <option value="rating">Sort by Rating</option>
                <option value="user_name">Sort by Employee</option>
                <option value="module_title">Sort by Module</option>
              </select>
              
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="px-3 py-2 border border-emerald-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
            
            {/* Second row - Actions */}
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="text-sm text-emerald-600">
                Showing {filteredFeedbacks.length} of {feedbacks.length} feedback entries
                {selectedItems.length > 0 && (
                  <span className="ml-2 text-blue-600 font-medium">
                    ({selectedItems.length} selected)
                  </span>
                )}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={exportToCSV}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Export CSV
                </button>
                
                {selectedItems.length > 0 && (
                  <button
                    onClick={bulkDelete}
                    className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                  >
                    <Trash2 size={16} />
                    Delete Selected ({selectedItems.length})
                  </button>
                )}
              </div>
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
                  <th className="px-4 py-3 font-bold text-emerald-50 border-r border-emerald-800/50 w-12">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === filteredFeedbacks.length && filteredFeedbacks.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-emerald-600 bg-white border-emerald-300 rounded focus:ring-emerald-500"
                    />
                  </th>
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
                    } hover:bg-emerald-200/60 transition-colors ${
                      selectedItems.includes(feedback.id) ? 'ring-2 ring-emerald-400' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedItems.includes(feedback.id)}
                        onChange={() => toggleSelectItem(feedback.id)}
                        className="w-4 h-4 text-emerald-600 bg-white border-emerald-300 rounded focus:ring-emerald-500"
                      />
                    </td>
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
    </AppLayout>
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
