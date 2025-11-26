import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useRole } from "../../src/lib/hooks/useRole.js";

// Progress tracking hook
function useModuleProgress(userId, moduleId) {
  const [progress, setProgress] = useState({
    currentPage: 0,
    completedSections: [],
    answers: {},
    completionPercentage: 0,
    isCompleted: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProgress();
  }, [userId, moduleId]);

  const loadProgress = async () => {
    if (!userId || !moduleId) {
      console.log('Missing userId or moduleId:', { userId, moduleId });
      return;
    }
    
    console.log('🔄 Loading progress for user:', userId, 'module:', moduleId);
    
    try {
      const { data, error } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', moduleId)
        .single();

      if (error) {
        console.log('Progress query error:', error);
      }

      if (data) {
        console.log('✅ Progress found:', data);
        setProgress({
          currentPage: data.current_page || 0,
          completedSections: data.completed_sections || [],
          answers: data.answers || {},
          completionPercentage: data.completion_percentage || 0,
          isCompleted: data.is_completed || false
        });
      } else {
        console.log('No progress data found, starting fresh');
      }
    } catch (error) {
      console.log('No existing progress found, starting fresh:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProgress = async (updates) => {
    if (!userId || !moduleId) {
      console.error('❌ Missing userId or moduleId:', { userId, moduleId });
      return;
    }

    const newProgress = { ...progress, ...updates };
    setProgress(newProgress);

    try {
      const updateData = {
        user_id: userId,
        module_id: moduleId,
        current_page: newProgress.currentPage,
        completed_sections: newProgress.completedSections,
        answers: newProgress.answers,
        completion_percentage: newProgress.completionPercentage,
        is_completed: newProgress.isCompleted,
        updated_at: new Date().toISOString()
      };

      // Add completed_at if module is completed
      if (newProgress.isCompleted && updates.completed_at) {
        updateData.completed_at = updates.completed_at;
      }

      console.log('🔄 Updating progress in database:', updateData);
      
      const { data, error } = await supabase
        .from('user_module_progress')
        .upsert(updateData, { 
          onConflict: 'user_id,module_id'
        })
        .select();

      if (error) {
        console.error('❌ Database update error:', error);
        alert('Error saving progress: ' + error.message);
      } else {
        console.log('✅ Progress saved successfully!', data);
        
        // If module completed, refresh the page data to update UI
        if (newProgress.isCompleted) {
          console.log('🎉 Module completed! Refreshing data...');
          setTimeout(() => {
            window.location.reload(); // Force reload to ensure fresh data
          }, 2000);
        }
      }
    } catch (error) {
      console.error('❌ Failed to save progress:', error);
      alert('Failed to save progress. Please try again.');
    }
  };

  return { progress, updateProgress, loading };
}

// Smart image component
import { useAuth } from '../context/AuthContext';

// Photo display component with smart path resolution
function PhotoDisplay({ photoPath, moduleId, pageIndex, caption }) {
  const [currentSrc, setCurrentSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const [tryIndex, setTryIndex] = useState(0);

  const getPossiblePaths = (originalPath) => {
    if (!originalPath) return [];
    const filename = originalPath.split(/[/\\]/).pop();
    return [
      supabase.storage.from("modules_assets").getPublicUrl(originalPath).data.publicUrl,
      originalPath,
      `/${originalPath}`,
      `/assets/images/${filename}`,
      `/${filename}`,
    ].filter(Boolean);
  };

  useEffect(() => {
    const paths = getPossiblePaths(photoPath);
    if (paths.length > 0) {
      setCurrentSrc(paths[0]);
      setTryIndex(0);
      setHasError(false);
    }
  }, [photoPath]);

  const handleImageError = () => {
    const paths = getPossiblePaths(photoPath);
    const nextIndex = tryIndex + 1;
    if (nextIndex < paths.length) {
      setCurrentSrc(paths[nextIndex]);
      setTryIndex(nextIndex);
    } else {
      setHasError(true);
    }
  };

  if (hasError) {
    return (
      <div className="flex justify-center">
        <div className="max-w-md p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
          <div className="text-sm">Image not found</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center">
      <img 
        src={currentSrc}
        alt={caption || "Module image"} 
        className="max-w-full h-auto rounded-lg shadow-md"
        onError={handleImageError}
      />
    </div>
  );
}

// Progress bar component
function ProgressBar({ percentage, className = "" }) {
  return (
    <div className={`w-full bg-gray-200 rounded-full h-3 ${className}`}>
      <div 
        className="bg-gradient-to-r from-emerald-500 to-emerald-600 h-3 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${Math.min(100, Math.max(0, percentage))}%` }}
      />
    </div>
  );
}

// Section completion badge
function CompletionBadge({ isCompleted, isLocked }) {
  if (isLocked) {
    return (
      <div className="w-6 h-6 rounded-full bg-gray-300 flex items-center justify-center">
        <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
      </div>
    );
  }

  return (
    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
      isCompleted ? 'bg-emerald-500' : 'bg-gray-300'
    }`}>
      {isCompleted ? (
        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
      ) : (
        <div className="w-3 h-3 rounded-full bg-white"></div>
      )}
    </div>
  );
}

export default function EnhancedModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { roleId } = useRole();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [flippedCards, setFlippedCards] = useState(new Set());
  const [checkedItems, setCheckedItems] = useState(new Set());
  const [answers, setAnswers] = useState({});
  const [quizStates, setQuizStates] = useState({});
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedback, setFeedback] = useState({
    rating: 0,
    feedback_text: '',
    suggestions: '',
    difficulty_level: 0
  });
  const [sectionFeedbacks, setSectionFeedbacks] = useState({});
  const [showSectionFeedback, setShowSectionFeedback] = useState(null);
  const [currentSectionFeedback, setCurrentSectionFeedback] = useState({
    helpful: null,
    clarity: 0,
    difficulty: 0,
    comments: ''
  });
  const [existingFeedback, setExistingFeedback] = useState(null);
  const [hasGeneratedCertificate, setHasGeneratedCertificate] = useState(false);
  
  // Get user ID from auth context
  const userId = user?.profile_id;
  
  // Use progress tracking
  const { progress, updateProgress, loading: progressLoading } = useModuleProgress(userId, id);

  useEffect(() => {
    loadModule();
    if (userId) {
      loadExistingFeedback();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, userId]);

  useEffect(() => {
    setCurrentPage(progress.currentPage);
    setAnswers(progress.answers);
  }, [progress]);

  const loadModule = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("modules")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setModule(data);
      }
    } catch (error) {
      console.error("Error loading module:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadExistingFeedback = async () => {
    if (!userId || !id) return;
    
    try {
      // Load feedback
      const { data: feedbackData } = await supabase
        .from('module_feedback')
        .select('*')
        .eq('user_id', userId)
        .eq('module_id', id)
        .single();

      if (feedbackData) {
        setExistingFeedback(feedbackData);
      }

      // Check if certificate has been generated
      const { data: certificateData } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', userId)
        .eq('module_id', id)
        .maybeSingle();

      if (certificateData) {
        setHasGeneratedCertificate(true);
      }
    } catch (error) {
      console.log('No existing feedback/certificate found:', error);
    }
  };

  const submitFeedback = async () => {
    if (!userId || !id) {
      alert('User not authenticated. Please log in again.');
      return;
    }
    
    if (feedback.rating === 0) {
      alert('Please provide a rating!');
      return;
    }

    try {
      console.log('Submitting feedback with userId:', userId, 'moduleId:', id);
      console.log('userId type:', typeof userId, 'id type:', typeof id);
      
      // Ensure we're using the correct data types for the database
      const feedbackData = {
        user_id: String(userId), // user_id column is text type
        module_id: id, // module_id column is uuid type - keep as string UUID
        rating: parseInt(feedback.rating), // Ensure rating is integer
        feedback_text: feedback.feedback_text || null,
        suggestions: feedback.suggestions || null,
        difficulty_level: feedback.difficulty_level === 0 ? null : parseInt(feedback.difficulty_level)
      };
      
      console.log('Final feedback data:', feedbackData);
      
      const { data, error } = await supabase
        .from('module_feedback')
        .insert(feedbackData)
        .select();

      if (error) {
        console.error('Database error:', error);
        alert('Error submitting feedback: ' + error.message);
        return;
      }

      console.log('Feedback submitted successfully:', data);

      // Simple notification: Log to audit_logs table directly from the app
      try {
        await supabase.from('audit_logs').insert({
          action: `Feedback submitted: ${feedback.rating}/5 stars for module ${id}`,
          employee_email: user?.email || 'unknown@email.com',
          employee_name: user?.name || 'Unknown User'
          // Removed created_at - let database auto-generate it
        });
      } catch (auditError) {
        console.log('Audit log failed (non-critical):', auditError);
      }

      setShowFeedbackModal(false);
      setExistingFeedback({ ...feedback, created_at: new Date().toISOString() });
      alert('Thank you for your feedback!');
    } catch (err) {
      console.error('Error submitting feedback:', err);
      alert('Error submitting feedback. Please try again.');
    }
  };

  const calculateProgress = (pages, completedSections) => {
    if (!pages || pages.length === 0) return 0;
    
    const totalSections = pages.reduce((total, page) => total + (page.sections?.length || 0), 0);
    const completedCount = completedSections.length;
    
    return totalSections > 0 ? Math.round((completedCount / totalSections) * 100) : 0;
  };

  const markSectionComplete = async (sectionId) => {
    console.log('🎯 Marking section complete:', sectionId);
    console.log('Current progress before update:', progress);
    
    const newCompletedSections = [...progress.completedSections];
    if (!newCompletedSections.includes(sectionId)) {
      newCompletedSections.push(sectionId);
    }

    const newProgress = calculateProgress(pages, newCompletedSections);
    const isModuleComplete = newProgress >= 100;

    console.log('New progress calculation:', {
      newCompletedSections,
      newProgress,
      isModuleComplete,
      allPages: pages?.length,
      totalSections: pages?.reduce((total, page) => total + (page.sections?.length || 0), 0)
    });

    const updateData = {
      completedSections: newCompletedSections,
      completionPercentage: newProgress,
      isCompleted: isModuleComplete,
      ...(isModuleComplete && { completed_at: new Date().toISOString() })
    };

    console.log('About to update with data:', updateData);
    await updateProgress(updateData);
    
    // Show section feedback prompt after completing a section (randomly 30% of the time)
    if (Math.random() < 0.3 && !sectionFeedbacks[sectionId]) {
      setTimeout(() => {
        setShowSectionFeedback(sectionId);
        setCurrentSectionFeedback({
          helpful: null,
          clarity: 0,
          difficulty: 0,
          comments: ''
        });
      }, 500); // Small delay for better UX
    }
    
    if (isModuleComplete) {
      console.log('🎉 MODULE COMPLETED! Checking feedback status...');
      // Reload feedback status to update button
      setTimeout(() => {
        if (userId && id) loadExistingFeedback();
      }, 1000);
    }
  };

  const submitSectionFeedback = async (sectionId) => {
    // Store section feedback locally
    setSectionFeedbacks(prev => ({
      ...prev,
      [sectionId]: currentSectionFeedback
    }));
    
    // Save to database (optional - can be used for detailed analytics)
    try {
      await supabase.from('section_feedback').insert({
        user_id: String(userId),
        module_id: id,
        section_id: sectionId,
        helpful: currentSectionFeedback.helpful,
        clarity_rating: currentSectionFeedback.clarity,
        difficulty_rating: currentSectionFeedback.difficulty,
        comments: currentSectionFeedback.comments || null
      });
    } catch (error) {
      console.log('Section feedback save failed (non-critical):', error);
    }
    
    setShowSectionFeedback(null);
  };

  const saveAnswer = async (questionId, answer) => {
    const newAnswers = { ...answers, [questionId]: answer };
    setAnswers(newAnswers);
    await updateProgress({ answers: newAnswers });
  };

  const toggleChecklistItem = (sectionId, itemId) => {
    const key = `${sectionId}-${itemId}`;
    const newChecked = new Set(checkedItems);
    if (newChecked.has(key)) {
      newChecked.delete(key);
    } else {
      newChecked.add(key);
    }
    setCheckedItems(newChecked);
  };

  const goToPage = async (pageIndex) => {
    // Check if page is unlocked
    if (pageIndex > 0) {
      const previousPageSections = pages[pageIndex - 1]?.sections || [];
      const allPreviousCompleted = previousPageSections.every(section => 
        progress.completedSections.includes(section.id)
      );
      
      if (!allPreviousCompleted) {
        alert("Please complete the previous page before proceeding.");
        return;
      }
    }

    setCurrentPage(pageIndex);
    await updateProgress({ currentPage: pageIndex });
  };

  if (loading || progressLoading) {
    return (
      <div className="flex min-h-dvh justify-center items-center">
        <div className="text-emerald-700 text-lg">Loading module...</div>
      </div>
    );
  }

  if (!module) {
    return (
      <div className="flex min-h-dvh justify-center items-center">
        <div className="text-gray-500 text-lg">Module not found</div>
      </div>
    );
  }

  // Handle module content structure
  const modulePages = module.pages || [];
  const pages = modulePages.length > 0 
    ? modulePages 
    : [{ 
        id: 'default', 
        name: module.title, 
        sections: [{
          id: 'default-section',
          type: 'text',
          title: module.title,
          body: module.description || "No content available"
        }]
      }];

  const currentPageData = pages[currentPage] || pages[0];
  const totalPages = pages.length;

  // Check if sections are locked
  const isSectionLocked = (sectionIndex, pageIndex) => {
    if (pageIndex === 0 && sectionIndex === 0) return false; // First section is always unlocked
    
    // Check if previous sections in current page are completed
    const currentPageSections = pages[pageIndex]?.sections || [];
    for (let i = 0; i < sectionIndex; i++) {
      const sectionId = currentPageSections[i]?.id;
      if (!progress.completedSections.includes(sectionId)) {
        return true;
      }
    }
    
    return false;
  };

  const renderSection = (section, sectionIndex) => {
    const isCompleted = progress.completedSections.includes(section.id);
    const isLocked = isSectionLocked(sectionIndex, currentPage);

    return (
      <div key={section.id} className={`bg-white rounded-xl shadow-lg p-6 border-l-4 ${
        isCompleted ? 'border-emerald-500 bg-emerald-50' : 
        isLocked ? 'border-gray-300 bg-gray-50' : 'border-blue-500'
      } transition-all duration-300`}>
        
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <CompletionBadge isCompleted={isCompleted} isLocked={isLocked} />
            <h3 className={`font-semibold text-lg ${
              isLocked ? 'text-gray-500' : 'text-gray-800'
            }`}>
              {section.title || `Section ${sectionIndex + 1}`}
            </h3>
          </div>
          
          {isLocked && (
            <div className="text-sm text-gray-500 italic">
              Complete previous sections to unlock
            </div>
          )}
        </div>

        {/* Section Content */}
        {isLocked ? (
          <div className="text-gray-500 italic p-4 text-center">
            🔒 This section is locked. Complete the previous sections to continue.
          </div>
        ) : (
          <div className="space-y-4">
            {renderSectionContent(section, isCompleted)}
            
            {/* Complete Section Button with enhanced feedback */}
            {!isCompleted && (
              <div className="flex justify-end mt-6">
                <button
                  onClick={() => markSectionComplete(section.id)}
                  className="group bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg"
                >
                  <span className="flex items-center gap-2">
                    <span>Mark Complete</span>
                    <span className="group-hover:animate-bounce">✓</span>
                  </span>
                </button>
              </div>
            )}

            {isCompleted && (
              <div className="flex items-center justify-between mt-4 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <div className="flex items-center text-emerald-700">
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  ✅ Section Completed
                </div>
                {sectionFeedbacks[section.id] && (
                  <div className="text-xs text-emerald-600 bg-emerald-100 px-2 py-1 rounded">
                    💬 Feedback given
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderSectionContent = (section, isCompleted) => {
    switch (section.type) {
      case 'text':
        return (
          <div className="space-y-4">
            {section.body && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {section.body}
              </div>
            )}
          </div>
        );
      
      case 'photo':
        // Auto-complete photo sections after viewing
        if (!progress.completedSections.includes(section.id)) {
          setTimeout(() => {
            if (!progress.completedSections.includes(section.id)) {
              markSectionComplete(section.id);
            }
          }, 3000); // Auto-complete after 3 seconds
        }
        
        return (
          <div className="space-y-4">
            {(section.media_url || section.media_path) && (
              <PhotoDisplay photoPath={section.media_url || section.media_path} caption={section.caption} moduleId={id} pageIndex={currentPage} />
            )}
            {section.caption && (
              <p className="text-gray-600 text-center italic">{section.caption}</p>
            )}
          </div>
        );

      case 'questionnaire': {
        const allRequiredAnswered = (section.questions || []).every(q => 
          !q.required || (answers[q.id] && answers[q.id].toString().trim() !== '')
        );
        
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {(section.questions || []).map((question, idx) => (
                <div key={question.id || idx} className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    {question.q || question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {(question.kind || question.type) === 'text' && (
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Your answer..."
                      value={answers[question.id] || ''}
                      onChange={(e) => {
                        saveAnswer(question.id, e.target.value);
                        // Check completion after saving answer
                        setTimeout(() => {
                          const allAnswered = (section.questions || []).every(q => 
                            !q.required || (answers[q.id] && answers[q.id].toString().trim() !== '')
                          );
                          if (allAnswered && !progress.completedSections.includes(section.id)) {
                            markSectionComplete(section.id);
                          }
                        }, 100);
                      }}
                      disabled={isCompleted}
                    />
                  )}
                  
                  {(question.kind || question.type) === 'radio' && (
                    <div className="space-y-2">
                      {(question.options || []).map((option, optIdx) => (
                        <label key={optIdx} className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name={`question-${question.id}`}
                            value={option}
                            checked={answers[question.id] === option}
                            onChange={(e) => {
                              saveAnswer(question.id, e.target.value);
                              // Check completion after saving answer
                              setTimeout(() => {
                                const allAnswered = (section.questions || []).every(q => 
                                  !q.required || (answers[q.id] && answers[q.id].toString().trim() !== '')
                                );
                                if (allAnswered && !progress.completedSections.includes(section.id)) {
                                  markSectionComplete(section.id);
                                }
                              }, 100);
                            }}
                            disabled={isCompleted}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
            {allRequiredAnswered && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
                <div className="text-emerald-700 text-sm font-medium">
                  ✅ All required questions answered!
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'flashcards': {
        const totalCards = section.cards?.length || 0;
        const flippedCount = section.cards?.filter((_, idx) => 
          flippedCards.has(`${section.id}-${idx}`)
        ).length || 0;
        const allCardsFlipped = totalCards > 0 && flippedCount === totalCards;
        
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm text-gray-600">
                Progress: {flippedCount}/{totalCards} cards flipped
              </div>
              {allCardsFlipped && (
                <div className="text-emerald-600 text-sm font-medium">
                  ✅ All cards completed!
                </div>
              )}
            </div>
            <div className="grid gap-4">
              {(section.cards || []).map((card, idx) => {
                const cardKey = `${section.id}-${idx}`;
                const isFlipped = flippedCards.has(cardKey);
                
                return (
                  <div 
                    key={card.id || idx} 
                    className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-all cursor-pointer min-h-[100px] bg-white"
                    onClick={() => {
                      const newFlipped = new Set(flippedCards);
                      if (isFlipped) {
                        newFlipped.delete(cardKey);
                      } else {
                        newFlipped.add(cardKey);
                      }
                      setFlippedCards(newFlipped);
                      
                      // Check if all cards are now flipped
                      const newFlippedCount = section.cards?.filter((_, cardIdx) => 
                        newFlipped.has(`${section.id}-${cardIdx}`) || cardIdx === idx
                      ).length || 0;
                      
                      if (newFlippedCount === totalCards && totalCards > 0 && !progress.completedSections.includes(section.id)) {
                        setTimeout(() => markSectionComplete(section.id), 500);
                      }
                    }}
                  >
                    <div className="font-medium text-emerald-800 mb-2">
                      {card.front || `Card ${idx + 1}`}
                    </div>
                    {isFlipped ? (
                      <div className="text-gray-700 mt-3 p-3 bg-emerald-50 rounded border-l-4 border-emerald-500">
                        <div className="text-sm text-emerald-600 font-medium mb-1">Answer:</div>
                        {card.back || "No answer provided"}
                      </div>
                    ) : (
                      <div className="text-gray-500 text-sm italic">
                        Click to reveal answer
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      case 'quiz': {
        // Get or initialize quiz state for this section
        const getQuizState = () => {
          if (!quizStates[section.id]) {
            const saved = localStorage.getItem(`quiz-${section.id}-${userId}`);
            const initialState = saved ? JSON.parse(saved) : {
              started: false,
              currentQuestion: 0,
              userAnswers: {},
              submitted: false,
              score: null,
              startTime: null,
              endTime: null
            };
            return initialState;
          }
          return quizStates[section.id];
        };

        const quizState = getQuizState();

        const totalQuestions = section.questions?.length || 0;
        const totalPoints = (section.questions || []).reduce((sum, q) => sum + (q.points || 0), 0);
        const currentQ = section.questions?.[quizState.currentQuestion];

        // Save quiz state to localStorage
        const saveQuizState = (newState) => {
          setQuizStates(prev => ({ ...prev, [section.id]: newState }));
          localStorage.setItem(`quiz-${section.id}-${userId}`, JSON.stringify(newState));
        };

        // Start quiz
        const startQuiz = () => {
          saveQuizState({
            ...quizState,
            started: true,
            startTime: Date.now(),
            userAnswers: {}
          });
        };

        // Answer question
        const answerQuestion = (answer) => {
          saveQuizState({
            ...quizState,
            userAnswers: {
              ...quizState.userAnswers,
              [quizState.currentQuestion]: answer
            }
          });
        };

        // Calculate score
        const calculateScore = () => {
          let earnedPoints = 0;
          (section.questions || []).forEach((q, idx) => {
            const userAnswer = quizState.userAnswers[idx];
            let isCorrect = false;

            if (q.type === 'multiple-choice') {
              isCorrect = userAnswer === q.correctAnswer;
            } else if (q.type === 'multiple-select') {
              const correctSet = new Set(q.correctAnswers || []);
              const userSet = new Set(userAnswer || []);
              isCorrect = correctSet.size === userSet.size && 
                        [...correctSet].every(a => userSet.has(a));
            } else if (q.type === 'true-false') {
              isCorrect = userAnswer === q.correctAnswer;
            } else if (q.type === 'fill-blank') {
              isCorrect = (userAnswer || '').toLowerCase().trim() === 
                         (q.correctAnswer || '').toLowerCase().trim();
            }

            if (isCorrect) {
              earnedPoints += q.points || 0;
            }
          });

          return {
            points: earnedPoints,
            percentage: totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0
          };
        };

        // Submit quiz
        const submitQuiz = async () => {
          const score = calculateScore();
          const passed = score.percentage >= (section.settings?.passingScore || 70);
          const timeTaken = Math.floor((Date.now() - quizState.startTime) / 1000); // seconds
          
          // Save quiz state
          saveQuizState({
            ...quizState,
            submitted: true,
            score: score,
            endTime: Date.now()
          });

          // Save to database
          try {
            // Get previous attempt count
            const { data: previousAttempts } = await supabase
              .from('quiz_attempts')
              .select('attempt_number')
              .eq('user_id', userId)
              .eq('module_id', id)
              .eq('section_id', section.id)
              .order('attempt_number', { ascending: false })
              .limit(1);

            const attemptNumber = previousAttempts?.length > 0 
              ? previousAttempts[0].attempt_number + 1 
              : 1;

            // Insert quiz attempt
            const { error } = await supabase
              .from('quiz_attempts')
              .insert({
                user_id: userId,
                module_id: id,
                section_id: section.id,
                attempt_number: attemptNumber,
                score: score.points,
                max_score: totalPoints,
                percentage: score.percentage,
                passed: passed,
                answers: quizState.userAnswers,
                time_taken_seconds: timeTaken,
                started_at: new Date(quizState.startTime).toISOString(),
                completed_at: new Date().toISOString()
              });

            if (error) {
              console.error('Error saving quiz attempt:', error);
            } else {
              console.log('✅ Quiz attempt saved to database');
            }
          } catch (error) {
            console.error('Failed to save quiz attempt:', error);
          }

          // Mark section complete if passed
          if (passed && !progress.completedSections.includes(section.id)) {
            markSectionComplete(section.id);
          }
        };

        // Retake quiz
        const retakeQuiz = () => {
          localStorage.removeItem(`quiz-${section.id}-${userId}`);
          setQuizStates(prev => {
            const newStates = { ...prev };
            delete newStates[section.id];
            return newStates;
          });
        };

        // Not started view
        if (!quizState.started) {
          return (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-8 text-center">
              <div className="text-5xl mb-4">📝</div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">
                {section.title || "Quiz"}
              </h3>
              {section.description && (
                <p className="text-gray-600 mb-6">{section.description}</p>
              )}
              
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-6">
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
                  <div className="text-sm text-gray-600">Questions</div>
                </div>
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-blue-600">{totalPoints}</div>
                  <div className="text-sm text-gray-600">Total Points</div>
                </div>
                {section.settings?.timeLimit && (
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-2xl font-bold text-orange-600">
                      {section.settings.timeLimit}
                    </div>
                    <div className="text-sm text-gray-600">Minutes</div>
                  </div>
                )}
                <div className="bg-white rounded-lg p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {section.settings?.passingScore || 70}%
                  </div>
                  <div className="text-sm text-gray-600">Passing Score</div>
                </div>
              </div>

              <button
                onClick={startQuiz}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg"
              >
                Start Quiz
              </button>
            </div>
          );
        }

        // Results view
        if (quizState.submitted) {
          const passed = quizState.score.percentage >= (section.settings?.passingScore || 70);
          
          return (
            <div className="space-y-6">
              <div className={`rounded-xl p-8 text-center ${
                passed ? 'bg-gradient-to-br from-green-50 to-emerald-50' : 'bg-gradient-to-br from-red-50 to-orange-50'
              }`}>
                <div className="text-6xl mb-4">{passed ? '🎉' : '📚'}</div>
                <h3 className="text-3xl font-bold text-gray-900 mb-2">
                  {passed ? 'Congratulations!' : 'Keep Learning!'}
                </h3>
                <p className="text-gray-600 mb-6">
                  {passed ? 'You passed the quiz!' : `You need ${section.settings?.passingScore || 70}% to pass.`}
                </p>
                
                <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-3xl font-bold text-blue-600">
                      {quizState.score.percentage}%
                    </div>
                    <div className="text-sm text-gray-600">Score</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-3xl font-bold text-purple-600">
                      {quizState.score.points}/{totalPoints}
                    </div>
                    <div className="text-sm text-gray-600">Points</div>
                  </div>
                  <div className="bg-white rounded-lg p-4">
                    <div className="text-3xl font-bold text-green-600">
                      {Object.keys(quizState.userAnswers).length}/{totalQuestions}
                    </div>
                    <div className="text-sm text-gray-600">Answered</div>
                  </div>
                </div>

                {section.settings?.allowRetake && !passed && (
                  <button
                    onClick={retakeQuiz}
                    className="mt-6 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
                  >
                    Retake Quiz
                  </button>
                )}
              </div>

              {/* Review Answers */}
              {section.settings?.showCorrectAnswers && (
                <div className="space-y-4">
                  <h4 className="text-xl font-bold text-gray-900">Review Your Answers</h4>
                  {(section.questions || []).map((q, idx) => {
                    const userAnswer = quizState.userAnswers[idx];
                    let isCorrect = false;

                    if (q.type === 'multiple-choice') {
                      isCorrect = userAnswer === q.correctAnswer;
                    } else if (q.type === 'multiple-select') {
                      const correctSet = new Set(q.correctAnswers || []);
                      const userSet = new Set(userAnswer || []);
                      isCorrect = correctSet.size === userSet.size && 
                                [...correctSet].every(a => userSet.has(a));
                    } else if (q.type === 'true-false') {
                      isCorrect = userAnswer === q.correctAnswer;
                    } else if (q.type === 'fill-blank') {
                      isCorrect = (userAnswer || '').toLowerCase().trim() === 
                                 (q.correctAnswer || '').toLowerCase().trim();
                    }

                    return (
                      <div key={idx} className={`border-2 rounded-lg p-4 ${
                        isCorrect ? 'border-green-300 bg-green-50' : 'border-red-300 bg-red-50'
                      }`}>
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">
                            {isCorrect ? '✅' : '❌'}
                          </div>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900 mb-2">
                              Question {idx + 1}: {q.question}
                            </div>
                            
                            <div className="text-sm space-y-1">
                              <div>
                                <span className="font-medium">Your answer: </span>
                                {q.type === 'multiple-choice' && q.options?.[userAnswer]}
                                {q.type === 'multiple-select' && (userAnswer || []).map(i => q.options?.[i]).join(', ')}
                                {q.type === 'true-false' && String(userAnswer)}
                                {q.type === 'fill-blank' && userAnswer}
                              </div>
                              {!isCorrect && (
                                <div className="text-green-700">
                                  <span className="font-medium">Correct answer: </span>
                                  {q.type === 'multiple-choice' && q.options?.[q.correctAnswer]}
                                  {q.type === 'multiple-select' && (q.correctAnswers || []).map(i => q.options?.[i]).join(', ')}
                                  {q.type === 'true-false' && String(q.correctAnswer)}
                                  {q.type === 'fill-blank' && q.correctAnswer}
                                </div>
                              )}
                            </div>
                            
                            {q.explanation && (
                              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
                                <div className="text-sm font-medium text-blue-900 mb-1">Explanation:</div>
                                <div className="text-sm text-blue-800">{q.explanation}</div>
                              </div>
                            )}
                            
                            <div className="mt-2 text-xs text-gray-600">
                              Points: {isCorrect ? q.points : 0}/{q.points}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Taking quiz view
        return (
          <div className="space-y-6">
            {/* Progress bar */}
            <div className="bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${((quizState.currentQuestion + 1) / totalQuestions) * 100}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-sm text-gray-600">
              <span>Question {quizState.currentQuestion + 1} of {totalQuestions}</span>
              <span>{Object.keys(quizState.userAnswers).length} answered</span>
            </div>

            {/* Current Question */}
            {currentQ && (
              <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
                <div className="text-lg font-semibold text-gray-900 mb-4">
                  {currentQ.question}
                </div>

                {/* Multiple Choice */}
                {currentQ.type === 'multiple-choice' && (
                  <div className="space-y-2">
                    {(currentQ.options || []).map((opt, optIdx) => (
                      <label
                        key={optIdx}
                        className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                          quizState.userAnswers[quizState.currentQuestion] === optIdx
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${quizState.currentQuestion}`}
                          checked={quizState.userAnswers[quizState.currentQuestion] === optIdx}
                          onChange={() => answerQuestion(optIdx)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="flex-1">{opt}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Multiple Select */}
                {currentQ.type === 'multiple-select' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-3">Select all that apply:</p>
                    {(currentQ.options || []).map((opt, optIdx) => {
                      const selected = (quizState.userAnswers[quizState.currentQuestion] || []).includes(optIdx);
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer transition-all ${
                            selected ? 'border-blue-600 bg-blue-50' : 'border-gray-200 hover:border-blue-300'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(e) => {
                              const current = quizState.userAnswers[quizState.currentQuestion] || [];
                              const newAnswer = e.target.checked
                                ? [...current, optIdx]
                                : current.filter(i => i !== optIdx);
                              answerQuestion(newAnswer);
                            }}
                            className="w-5 h-5 text-blue-600 rounded"
                          />
                          <span className="flex-1">{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* True/False */}
                {currentQ.type === 'true-false' && (
                  <div className="grid grid-cols-2 gap-4">
                    {[true, false].map((value) => (
                      <label
                        key={String(value)}
                        className={`flex items-center justify-center gap-3 p-6 border-2 rounded-lg cursor-pointer transition-all ${
                          quizState.userAnswers[quizState.currentQuestion] === value
                            ? 'border-blue-600 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name={`question-${quizState.currentQuestion}`}
                          checked={quizState.userAnswers[quizState.currentQuestion] === value}
                          onChange={() => answerQuestion(value)}
                          className="w-5 h-5 text-blue-600"
                        />
                        <span className="text-lg font-semibold">{value ? 'True' : 'False'}</span>
                      </label>
                    ))}
                  </div>
                )}

                {/* Fill in the Blank */}
                {currentQ.type === 'fill-blank' && (
                  <input
                    type="text"
                    value={quizState.userAnswers[quizState.currentQuestion] || ''}
                    onChange={(e) => answerQuestion(e.target.value)}
                    placeholder="Type your answer here..."
                    className="w-full border-2 border-gray-300 rounded-lg px-4 py-3 text-lg focus:border-blue-600 focus:outline-none"
                  />
                )}

                <div className="mt-4 text-sm text-gray-600">
                  Points: {currentQ.points || 0}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => saveQuizState({ ...quizState, currentQuestion: quizState.currentQuestion - 1 })}
                disabled={quizState.currentQuestion === 0}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              {quizState.currentQuestion < totalQuestions - 1 ? (
                <button
                  onClick={() => saveQuizState({ ...quizState, currentQuestion: quizState.currentQuestion + 1 })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Next →
                </button>
              ) : (
                <button
                  onClick={submitQuiz}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold"
                >
                  Submit Quiz
                </button>
              )}
            </div>
          </div>
        );
      }

      case 'video':
        // Auto-complete video sections after viewing
        if (!progress.completedSections.includes(section.id)) {
          setTimeout(() => {
            if (!progress.completedSections.includes(section.id)) {
              markSectionComplete(section.id);
            }
          }, 5000); // Auto-complete after 5 seconds
        }
        
        return (
          <div className="space-y-4">
            {(section.media_url || section.media_path) && (
              <video 
                controls 
                className="w-full rounded-lg shadow-lg"
                src={section.media_url || section.media_path}
              >
                Your browser does not support the video tag.
              </video>
            )}
            {section.caption && (
              <p className="text-gray-600 text-center italic">{section.caption}</p>
            )}
          </div>
        );

      case 'dropdowns': {
        const allRequiredAnswered = (section.questions || []).every(q => 
          !q.required || (answers[q.id] && answers[q.id].toString().trim() !== '')
        );
        
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {(section.questions || []).map((question, idx) => (
                <div key={question.id || idx} className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    {question.q || question.text}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  <select
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    value={answers[question.id] || ''}
                    onChange={(e) => {
                      saveAnswer(question.id, e.target.value);
                      // Check completion after saving answer
                      setTimeout(() => {
                        const allAnswered = (section.questions || []).every(q => 
                          !q.required || (answers[q.id] && answers[q.id].toString().trim() !== '')
                        );
                        if (allAnswered && !progress.completedSections.includes(section.id)) {
                          markSectionComplete(section.id);
                        }
                      }, 100);
                    }}
                    disabled={isCompleted}
                  >
                    <option value="">Select an option...</option>
                    {(question.options || []).map((option, optIdx) => (
                      <option key={optIdx} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            {allRequiredAnswered && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mt-4">
                <div className="text-emerald-700 text-sm font-medium">
                  ✅ All required dropdowns answered!
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'checklist': {
        const totalItems = section.items?.length || 0;
        const checkedCount = section.items?.filter((item) => 
          checkedItems.has(`${section.id}-${item.id}`)
        ).length || 0;
        const allChecked = totalItems > 0 && checkedCount === totalItems;
        
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              {(section.items || []).map((item) => (
                <label 
                  key={item.id} 
                  className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={checkedItems.has(`${section.id}-${item.id}`)}
                    onChange={() => toggleChecklistItem(section.id, item.id)}
                    disabled={isCompleted}
                    className="mt-1 h-5 w-5 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <span className="text-gray-700 flex-1">{item.text || item.label}</span>
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">
                Progress: {checkedCount}/{totalItems} items checked
              </span>
              {allChecked && (
                <span className="text-emerald-600 font-medium">
                  ✅ All items completed!
                </span>
              )}
            </div>
          </div>
        );
      }

      case 'embed':
        // Auto-complete embed sections after viewing
        if (!progress.completedSections.includes(section.id)) {
          setTimeout(() => {
            if (!progress.completedSections.includes(section.id)) {
              markSectionComplete(section.id);
            }
          }, 3000); // Auto-complete after 3 seconds
        }
        
        return (
          <div className="space-y-4">
            {section.url ? (
              <div className="space-y-2">
                <iframe
                  src={section.url}
                  className="w-full h-96 rounded-lg shadow-lg border-2 border-gray-200"
                  title={section.title || section.note || 'Embedded Content'}
                  allowFullScreen
                />
                {section.note && (
                  <p className="text-gray-600 text-sm italic">{section.note}</p>
                )}
              </div>
            ) : (
              <div className="text-gray-500 italic">No URL provided for this embed</div>
            )}
            {section.caption && (
              <p className="text-gray-600 text-center italic">{section.caption}</p>
            )}
          </div>
        );

      default:
        return (
          <div className="text-gray-500 italic">
            Section type "{section.type}" not supported yet.
          </div>
        );
    }
  };

  return (
    <AppLayout>
    {/* // <div
    //   className="flex min-h-dvh"
    //   style={{
    //     backgroundImage: "url('/bg.png')",
    //     backgroundSize: "cover",
    //     backgroundPosition: "center",
    //   }}
    // >
    //   <Sidebar role={roleId} /> */}

      <div className="flex-1 p-6">
        {/* Header Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">{module.title}</h1>
              <p className="text-gray-600">{module.description}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-emerald-600">
                {progress.completionPercentage}%
              </div>
              <div className="text-sm text-gray-500">Complete</div>
            </div>
          </div>
          
          <ProgressBar percentage={progress.completionPercentage} className="mb-4" />
          
          <div className="flex items-center justify-between text-sm text-gray-600">
            <span>Page {currentPage + 1} of {totalPages}</span>
            <span>{progress.completedSections.length} sections completed</span>
          </div>
        </div>

        {/* Page Navigation */}
        <div className="bg-white rounded-xl shadow-lg p-4 mb-6">
          <div className="flex space-x-2 overflow-x-auto">
            {pages.map((page, index) => {
              const isCurrentPage = index === currentPage;
              const isPageUnlocked = index === 0 || (index > 0 && 
                pages[index - 1]?.sections?.every(s => progress.completedSections.includes(s.id))
              );
              
              return (
                <button
                  key={index}
                  onClick={() => goToPage(index)}
                  disabled={!isPageUnlocked}
                  className={`px-4 py-2 rounded-lg font-medium whitespace-nowrap transition-all duration-200 ${
                    isCurrentPage 
                      ? 'bg-emerald-600 text-white' 
                      : isPageUnlocked
                        ? 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                        : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  {isPageUnlocked ? '' : '🔒'} {page.name || `Page ${index + 1}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Current Page Content */}
        <div className="space-y-6">
          {currentPageData.sections?.map((section, sectionIndex) => 
            renderSection(section, sectionIndex)
          )}
        </div>

        {/* Module Complete Section */}
        {progress.isCompleted && (
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl p-6 mt-6 text-center">
            <div className="text-2xl font-bold mb-2">🎉 Module Completed!</div>
            <div className="text-emerald-100 mb-4">
              Congratulations! You've successfully completed this module.
            </div>
            
            {/* Show feedback status */}
            {existingFeedback ? (
              <div className="bg-white/20 rounded-lg p-4 mb-4">
                <div className="text-sm text-emerald-100 mb-2">✅ Feedback Submitted</div>
                <div className="text-xs text-emerald-200">
                  Rating: {existingFeedback.rating}/5 stars
                </div>
              </div>
            ) : (
              <div className="bg-white/20 rounded-lg p-4 mb-4">
                <div className="text-sm text-emerald-100 mb-2">⭐ Feedback Required</div>
                <div className="text-xs text-emerald-200">
                  Please provide feedback to get your certificate
                </div>
              </div>
            )}
            
            <div className="flex justify-center space-x-4">
              {!existingFeedback && (
                <button 
                  className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  onClick={() => setShowFeedbackModal(true)}
                >
                  Give Feedback ⭐
                </button>
              )}
              
              {existingFeedback && (
                <button 
                  className="bg-white text-emerald-600 px-6 py-2 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                  onClick={() => navigate(`/certificate/${id}`)}
                >
                  {hasGeneratedCertificate ? 'View Certificate 📜' : 'Get Certificate 🏆'}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Feedback Modal */}
        {showFeedbackModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-gray-800">📝 Module Feedback</h3>
                <button 
                  onClick={() => setShowFeedbackModal(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              
              {/* Section Feedback Summary */}
              {Object.keys(sectionFeedbacks).length > 0 && (
                <div className="mb-6 p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                  <h4 className="font-medium text-emerald-800 mb-2">📊 Section Feedback Summary</h4>
                  <div className="text-sm text-emerald-700">
                    You provided feedback for {Object.keys(sectionFeedbacks).length} section(s). 
                    <span className="font-medium">Thank you for the detailed input!</span>
                  </div>
                </div>
              )}
              
              {/* Rating with better visual feedback */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Overall Rating * 
                  {feedback.rating === 0 && <span className="text-red-500">(Required)</span>}
                </label>
                <div className="flex justify-center space-x-2 mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setFeedback(prev => ({ ...prev, rating: star }))}
                      className={`text-3xl hover:scale-110 transition-all duration-200 ${
                        star <= feedback.rating ? 'text-yellow-400 filter drop-shadow-lg' : 'text-gray-300 hover:text-yellow-200'
                      }`}
                    >
                      ⭐
                    </button>
                  ))}
                </div>
                {feedback.rating > 0 && (
                  <div className="text-center">
                    <div className="text-lg font-medium text-gray-800">
                      {feedback.rating === 1 && '😞 Poor'}
                      {feedback.rating === 2 && '🙁 Fair'}
                      {feedback.rating === 3 && '😐 Good'}
                      {feedback.rating === 4 && '😊 Very Good'}
                      {feedback.rating === 5 && '🤩 Excellent'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {feedback.rating} out of 5 stars
                    </div>
                  </div>
                )}
              </div>

              {/* Difficulty with better descriptions */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How challenging was this module?
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { value: 1, label: 'Very Easy', emoji: '😎' },
                    { value: 2, label: 'Easy', emoji: '🙂' },
                    { value: 3, label: 'Just Right', emoji: '😐' },
                    { value: 4, label: 'Challenging', emoji: '🤔' },
                    { value: 5, label: 'Very Hard', emoji: '😰' }
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFeedback(prev => ({ ...prev, difficulty_level: option.value }))}
                      className={`p-3 text-center rounded-lg border-2 transition-all ${
                        feedback.difficulty_level === option.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                          : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      <div className="text-lg">{option.emoji}</div>
                      <div className="text-xs font-medium">{option.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Smart feedback prompts based on rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {feedback.rating <= 2 ? 'What went wrong? Help us improve!' :
                   feedback.rating <= 3 ? 'What did you think of this module?' :
                   'What did you enjoy most about this module?'}
                </label>
                <textarea
                  value={feedback.feedback_text}
                  onChange={(e) => setFeedback(prev => ({ ...prev, feedback_text: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 h-24 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={feedback.rating <= 2 ? 
                    "Tell us what was confusing or difficult..." :
                    feedback.rating <= 3 ?
                    "Share your honest thoughts..." :
                    "What made this module great?"}
                />
              </div>

              {/* Suggestions with contextual prompts */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {feedback.rating <= 2 ? 'How can we make this better?' : 'Any suggestions for improvement?'}
                  <span className="text-gray-500 text-xs ml-1">(Optional)</span>
                </label>
                <textarea
                  value={feedback.suggestions}
                  onChange={(e) => setFeedback(prev => ({ ...prev, suggestions: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-3 h-20 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder={feedback.rating <= 2 ?
                    "What specific changes would help?" :
                    "Any ideas to make it even better?"}
                />
              </div>

              {/* Action buttons with better styling */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowFeedbackModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={submitFeedback}
                  disabled={feedback.rating === 0}
                  className={`flex-2 py-3 rounded-lg font-medium transition-colors ${
                    feedback.rating === 0
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-emerald-600 text-white hover:bg-emerald-700'
                  }`}
                >
                  Submit Feedback 🚀
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Section Feedback Modal */}
        {showSectionFeedback && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-800">💬 Quick Section Feedback</h3>
                <button 
                  onClick={() => setShowSectionFeedback(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">
                Help us improve! How was this section for you?
              </p>
              
              {/* Was it helpful? */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Was this section helpful?
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setCurrentSectionFeedback(prev => ({ ...prev, helpful: true }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      currentSectionFeedback.helpful === true
                        ? 'bg-green-100 text-green-800 border-2 border-green-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-green-50'
                    }`}
                  >
                    👍 Yes
                  </button>
                  <button
                    onClick={() => setCurrentSectionFeedback(prev => ({ ...prev, helpful: false }))}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      currentSectionFeedback.helpful === false
                        ? 'bg-red-100 text-red-800 border-2 border-red-300'
                        : 'bg-gray-100 text-gray-700 border border-gray-300 hover:bg-red-50'
                    }`}
                  >
                    👎 No
                  </button>
                </div>
              </div>
              
              {/* Clarity rating */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  How clear was the content? (1-5)
                </label>
                <div className="flex space-x-1">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setCurrentSectionFeedback(prev => ({ ...prev, clarity: rating }))}
                      className={`w-8 h-8 rounded-full text-sm font-medium ${
                        currentSectionFeedback.clarity >= rating
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-200 text-gray-600 hover:bg-blue-100'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Optional comments */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick comment (optional)
                </label>
                <textarea
                  value={currentSectionFeedback.comments}
                  onChange={(e) => setCurrentSectionFeedback(prev => ({ ...prev, comments: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 h-16 text-sm"
                  placeholder="Any quick thoughts?"
                />
              </div>
              
              {/* Action buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowSectionFeedback(null)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200"
                >
                  Skip
                </button>
                <button
                  onClick={() => submitSectionFeedback(showSectionFeedback)}
                  className="flex-1 bg-emerald-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
                >
                  Submit ✨
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
//EnhancedModuleDetail.jsx