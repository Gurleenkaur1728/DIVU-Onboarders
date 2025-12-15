import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import AppLayout from "../../src/AppLayout.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";
import { useAuth } from "../context/AuthContext.jsx";

// Smart image component that tries multiple path variations
function PhotoDisplay({ mediaPath, caption }) {
  const [currentSrc, setCurrentSrc] = useState('');
  const [hasError, setHasError] = useState(false);
  const [tryIndex, setTryIndex] = useState(0);

  // List of possible image paths to try
  const getPossiblePaths = (originalPath) => {
    if (!originalPath) return [];
    
    // If it's already a full URL, use it directly (MOST COMMON CASE NOW)
    if (originalPath.startsWith('http://') || originalPath.startsWith('https://')) {
      return [originalPath];
    }
    
    // Otherwise build the URL from the path
    const publicUrl = supabase.storage.from("module-content").getPublicUrl(originalPath).data.publicUrl;
    return [publicUrl];
  };

  useEffect(() => {
    const paths = getPossiblePaths(mediaPath);
    if (paths.length > 0) {
      setCurrentSrc(paths[0]);
      setTryIndex(0);
      setHasError(false);
    }
  }, [mediaPath]);

  const handleImageError = () => {
    const paths = getPossiblePaths(mediaPath);
    const nextIndex = tryIndex + 1;
    if (nextIndex < paths.length) {
      console.log(`Image failed to load: ${currentSrc}. Trying: ${paths[nextIndex]}`);
      setCurrentSrc(paths[nextIndex]);
      setTryIndex(nextIndex);
    } else {
      console.log(`All image paths failed for: ${mediaPath}`);
      console.log('Tried paths:', paths);
      setHasError(true);
    }
  };

  const handleImageLoad = () => {
    console.log(`Image loaded successfully: ${currentSrc}`);
    setHasError(false);
  };

  if (hasError) {
    const paths = getPossiblePaths(mediaPath);
    return (
      <div className="flex justify-center">
        <div className="max-w-md p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-gray-500">
          <div className="text-sm">Image not found</div>
          <div className="text-xs text-gray-400 mt-2">
            Original path: {mediaPath}
          </div>
          <div className="text-xs text-gray-400">
            Tried {paths.length} different paths
          </div>
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
        onLoad={handleImageLoad}
        onError={handleImageError}
      />
    </div>
  );
}

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [flippedCards, setFlippedCards] = useState(new Set()); // Track which flashcards are flipped

  // Initialize or update progress tracking
  const initializeProgress = useCallback(async (moduleId) => {
    try {
      const userId = user?.profile_id;
      if (!userId) return;

      // Check if progress already exists
      const { data: existingProgress, error: checkError } = await supabase
        .from("user_module_progress")
        .select("id, current_page")
        .eq("user_id", userId)
        .eq("module_id", moduleId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (!existingProgress) {
        // Create new progress record
        const { error: insertError } = await supabase
          .from("user_module_progress")
          .insert({
            user_id: userId,
            module_id: moduleId,
            current_page: 0,
            completion_percentage: 0,
            is_completed: false,
            completed_sections: []
          });

        if (insertError) throw insertError;
        console.log("✅ Progress tracking initialized for module:", moduleId);
      } else {
        console.log("📊 Progress already exists for module:", moduleId);
      }
    } catch (error) {
      console.error("❌ Error initializing progress:", error);
    }
  }, [user?.profile_id]);

  useEffect(() => {
    const loadModule = async () => {
      try {
        setLoading(true);
        console.log("Loading module with ID:", id, "Type:", typeof id);
        
        const { data, error } = await supabase
          .from("modules")
          .select("*")
          .eq("id", id) // Don't convert to Number - ID might be UUID
          .maybeSingle();

        console.log("Module query result:", { data, error });

        if (error) throw error;
        
        if (data) {
          console.log("Module found:", data);
          setModule(data);
          
          // Initialize or update user progress when module is loaded
          if (user?.profile_id) {
            await initializeProgress(data.id);
          }
        } else {
          console.log("No module found with ID:", id);
        }
      } catch (error) {
        console.error("Error loading module:", error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadModule();
    }
  }, [id, user?.profile_id, initializeProgress]);

  // Update progress when page changes
  useEffect(() => {
    const updateProgress = async () => {
      if (!user?.profile_id || !module?.id) return;

      try {
        const totalPages = module.pages?.length || 1;
        const completionPercentage = Math.round(((page + 1) / totalPages) * 100);

        await supabase
          .from("user_module_progress")
          .update({
            current_page: page,
            completion_percentage: completionPercentage,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.profile_id)
          .eq("module_id", module.id);

        console.log(`📈 Progress updated: Page ${page + 1}/${totalPages} (${completionPercentage}%)`);
      } catch (error) {
        console.error("Error updating progress:", error);
      }
    };

    updateProgress();
  }, [page, module?.id, module?.pages?.length, user?.profile_id]);

  if (loading) {
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

  // Handle module content structure - load pages data directly from pages column
  const modulePages = module.pages || [];
  console.log("Module pages loaded from database:", modulePages);
  
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
  
  console.log("Final pages structure:", pages);
  const currentPage = pages[page];

  const renderSection = (section) => {
    switch (section.type) {
      case 'text':
        return (
          <div key={section.id} className="space-y-4">
            {section.title && (
              <h3 className="font-semibold text-xl text-emerald-800">
                {section.title}
              </h3>
            )}
            {section.body && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {section.body}
              </div>
            )}
          </div>
        );
      
      case 'photo':
        console.log('Photo section data:', section);
        return (
          <div key={section.id} className="space-y-4">
            {(section.media_url || section.media_path) && (
              <PhotoDisplay mediaPath={section.media_url || section.media_path} caption={section.caption} />
            )}
            {!section.media_url && !section.media_path && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <p className="text-yellow-800">Debug: No media_url or media_path found</p>
                <pre className="text-xs mt-2">{JSON.stringify(section, null, 2)}</pre>
              </div>
            )}
            {section.caption && (
              <p className="text-gray-600 text-center italic">{section.caption}</p>
            )}
          </div>
        );
      
      case 'video':
        return (
          <div key={section.id} className="space-y-4">
            {(section.media_url || section.media_path) && (
              <video 
                src={section.media_url || section.media_path} 
                controls 
                className="w-full max-w-md mx-auto rounded-lg shadow-md"
              />
            )}
            {section.transcript && (
              <div className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                <h4 className="font-semibold text-emerald-800 mb-2">Transcript:</h4>
                {section.transcript}
              </div>
            )}
          </div>
        );
      
      case 'checklist':
        return (
          <div key={section.id} className="space-y-4">
            <h3 className="font-semibold text-xl text-emerald-800">Checklist</h3>
            <ul className="space-y-2">
              {(section.items || []).map((item, idx) => (
                <li key={item.id || idx} className="flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                  />
                  <span className="text-gray-700">{item.text}</span>
                  {item.required && (
                    <span className="text-red-500 text-sm">*</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        );

      case 'dropdowns':
        return (
          <div key={section.id} className="space-y-4">
            <h3 className="font-semibold text-xl text-emerald-800">Information</h3>
            <div className="space-y-3">
              {(section.items || []).map((item, idx) => (
                <details key={item.id || idx} className="border border-gray-200 rounded-lg">
                  <summary className="cursor-pointer px-4 py-3 font-medium text-gray-800 hover:bg-gray-50">
                    {item.header || `Item ${idx + 1}`}
                  </summary>
                  <div className="px-4 py-3 text-gray-700 bg-gray-50">
                    {item.info || "No information provided"}
                  </div>
                </details>
              ))}
            </div>
          </div>
        );

      case 'questionnaire':
        return (
          <div key={section.id} className="space-y-4">
            <h3 className="font-semibold text-xl text-emerald-800">Quiz Questions</h3>
            <div className="space-y-4">
              {(section.questions || []).map((question, idx) => (
                <div key={question.id || idx} className="space-y-2">
                  <label className="block text-gray-700 font-medium">
                    {idx + 1}. {question.q || question.text}
                  </label>
                  {question.kind === 'mcq' && (
                    <div className="space-y-2">
                      {(question.options || []).map((option, optIdx) => (
                        <label key={optIdx} className="flex items-center space-x-2">
                          <input 
                            type="radio" 
                            name={`question-${question.id}`}
                            value={option}
                            className="text-emerald-600 focus:ring-emerald-500"
                          />
                          <span className="text-gray-700">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {(question.kind === 'text' || question.type === 'text') && (
                    <input 
                      type="text" 
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Your answer..."
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        );

      case 'flashcards':
        return (
          <div key={section.id} className="space-y-4">
            <h3 className="font-semibold text-xl text-emerald-800">Flashcards</h3>
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

      case 'embed':
        return (
          <div key={section.id} className="space-y-4">
            <h3 className="font-semibold text-xl text-emerald-800">Embedded Link</h3>
            {section.url && (
              <div className="border border-gray-300 rounded-lg p-4">
                <a 
                  href={section.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline break-all"
                >
                  {section.url}
                </a>
                <p className="text-xs text-gray-500 mt-2">Click to open in new tab</p>
              </div>
            )}
            {section.note && (
              <p className="text-gray-600 text-sm">{section.note}</p>
            )}
          </div>
        );
      
      default:
        console.warn('Unsupported section type:', section.type, section);
        return (
          <div key={section.id} className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 font-medium">Section type "{section.type}" not fully supported yet.</p>
              <p className="text-sm text-gray-600 mt-2">Section data:</p>
              <pre className="text-xs text-gray-600 bg-white p-2 rounded mt-1 overflow-auto max-h-40">
                {JSON.stringify(section, null, 2)}
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <AppLayout>
      <div className="flex-1 flex justify-center items-start p-10">
        <div className="bg-white rounded-2xl shadow-2xl w-4/5 max-w-5xl p-12 text-gray-800">
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-emerald-900">
              {module.title}
            </h1>
            <span className="text-sm text-gray-500">Complete By: xx-xx-xxxx</span>
          </div>

          {/* Goal */}
          <p className="italic text-gray-600 mb-8 text-lg">
            {module.description || "No description available"}
          </p>

          {/* Content */}
          <div className="space-y-6 mb-10">
            <h2 className="font-semibold text-xl text-emerald-800">
              {currentPage?.name || `Page ${page + 1}`}
            </h2>
            
            {/* Render all sections for current page */}
            {currentPage?.sections?.length > 0 ? (
              currentPage.sections.map(renderSection)
            ) : (
              <p className="text-gray-500 italic">No content available for this page.</p>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-4">
            {page > 0 && (
              <button
                onClick={() => setPage((p) => p - 1)}
                className="px-6 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium"
              >
                Back
              </button>
            )}

            {page < pages.length - 1 ? (
              <button
                onClick={() => setPage((p) => p + 1)}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Next
              </button>
            ) : (
              <button
                onClick={() => navigate(`/modules/${id}/complete`)}
                className="px-6 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                Complete
              </button>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
