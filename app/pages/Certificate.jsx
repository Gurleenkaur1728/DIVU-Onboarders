import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../../src/lib/supabaseClient";

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [module, setModule] = useState(null);
  const [completionData, setCompletionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    loadCertificateData();
  }, [id, user]);

  const loadCertificateData = async () => {
    if (!user?.profile_id || !id) return;

    try {
      // Load module details
      const { data: moduleData, error: moduleError } = await supabase
        .from('modules')
        .select('*')
        .eq('id', id)
        .single();

      if (moduleError) throw moduleError;
      setModule(moduleData);

      // Load completion data
      const { data: progressData, error: progressError } = await supabase
        .from('user_module_progress')
        .select('*')
        .eq('user_id', user.profile_id)
        .eq('module_id', id)
        .single();

      if (progressError && progressError.code !== 'PGRST116') {
        throw progressError;
      }

      // Load feedback data to ensure feedback was submitted
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('module_feedback')
        .select('*')
        .eq('user_id', user.profile_id)
        .eq('module_id', id)
        .single();

      if (feedbackError && feedbackError.code !== 'PGRST116') {
        console.log('No feedback found, but not an error');
      }

      console.log('Certificate data loaded:', {
        progressData,
        feedbackData,
        isCompleted: progressData?.is_completed,
        hasFeedback: !!feedbackData
      });

      // Set completion data if both module is completed AND feedback exists
      if (progressData && progressData.is_completed && feedbackData) {
        setCompletionData(progressData);
      } else {
        setCompletionData(null);
      }
    } catch (error) {
      console.error('Error loading certificate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    setGenerating(true);
    
    try {
      // Record certificate generation in database
      await recordCertificateGeneration();
      
      // Use browser's print functionality to generate PDF
      const printWindow = window.open('', '_blank');
      const certificateHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Certificate - ${module?.title}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
            .certificate { 
              max-width: 800px; 
              margin: 0 auto; 
              border: 10px solid #f59e0b; 
              padding: 40px; 
              text-align: center;
              background: linear-gradient(to bottom right, #ecfdf5, #ffffff, #f0fdf4);
              position: relative;
            }
            .title { font-size: 36px; font-weight: bold; color: #065f46; margin-bottom: 20px; }
            .subtitle { font-size: 18px; color: #047857; margin-bottom: 30px; }
            .name { font-size: 32px; font-weight: bold; color: #047857; margin: 20px 0; }
            .module-title { font-size: 24px; font-weight: bold; color: #064e3b; margin: 30px 0; }
            .completion-info { 
              background: #ecfdf5; 
              padding: 15px; 
              border-radius: 8px; 
              margin: 20px 0; 
              font-size: 14px; 
              color: #047857; 
            }
            .signature-section { display: flex; justify-content: space-between; margin-top: 60px; }
            .signature { text-align: center; }
            .signature-line { border-bottom: 2px solid #374151; width: 200px; margin: 10px auto; }
            .seal { 
              position: absolute; 
              bottom: 30px; 
              right: 30px; 
              width: 80px; 
              height: 80px; 
              border: 4px solid #f59e0b; 
              border-radius: 50%; 
              display: flex; 
              align-items: center; 
              justify-content: center; 
              background: rgba(254, 243, 199, 0.7);
              font-weight: bold;
              color: #d97706;
            }
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="certificate">
            <h1 class="title">Certificate of Achievement</h1>
            <p class="subtitle">This certifies that</p>
            <h2 class="name">${user?.name || 'Employee'}</h2>
            <p class="subtitle">has successfully completed</p>
            <h3 class="module-title">${module?.title || `Module ${id}`}</h3>
            ${completionData ? `
              <div class="completion-info">
                <p>Completed on: ${new Date(completionData.updated_at).toLocaleDateString()}</p>
                <p>Progress: ${Math.round(completionData.completion_percentage)}%</p>
                <p>Certificate ID: DIVU-${user?.profile_id?.substring(0, 8)}-${id?.substring(0, 8)}</p>
              </div>
            ` : ''}
            <div class="signature-section">
              <div class="signature">
                <p>Date</p>
                <div class="signature-line"></div>
                <p>${new Date().toLocaleDateString()}</p>
              </div>
              <div class="signature">
                <p>Signature</p>
                <div class="signature-line"></div>
                <p>Authorized Representative</p>
              </div>
            </div>
            <div class="seal">DIVU</div>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 1000);
            }
          </script>
        </body>
        </html>
      `;
      
      printWindow.document.write(certificateHTML);
      printWindow.document.close();
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error generating certificate. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const recordCertificateGeneration = async () => {
    if (!user?.profile_id || !id || !module || !completionData) return;

    try {
      const { error } = await supabase
        .from('certificates')
        .upsert({
          user_id: user.profile_id,
          module_id: id,
          user_name: user.name,
          module_title: module.title,
          completion_date: completionData.updated_at
        }, {
          onConflict: 'user_id,module_id'
        });

      if (error) {
        console.error('Error recording certificate generation:', error);
      }
    } catch (error) {
      console.error('Error recording certificate:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading certificate...</p>
        </div>
      </div>
    );
  }

  if (!completionData) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-red-50 to-red-100">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-red-700 mb-4">Certificate Not Available</h2>
          <p className="text-gray-600 mb-6">
            To access your certificate, you need to:
            <br />
            1. Complete all module sections
            <br />
            2. Submit feedback with a rating
          </p>
          <button
            onClick={() => navigate(`/modules/${id}`)}
            className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold"
          >
            Go to Module
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 relative"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white/95 p-10 sm:p-12 rounded-2xl shadow-2xl text-center w-[90%] max-w-3xl border-[10px] border-yellow-400 relative">
        {/* Certificate Heading */}
        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900 mb-3 tracking-wide">
          Certificate of Achievement
        </h1>
        <p className="mb-6 text-emerald-800 text-base sm:text-lg">This certifies that</p>

        {/* Employee Name */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-emerald-700 mb-2">
          {user?.name || 'Employee'}
        </h2>

        <p className="mb-6 text-emerald-800 text-base sm:text-lg">
          has successfully completed
        </p>

        <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 mb-8">
          {module?.title || `Module ${id}`}
        </h3>

        {/* Completion Details */}
        {completionData && (
          <div className="bg-emerald-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-emerald-700">
              Completed on: {new Date(completionData.updated_at).toLocaleDateString()}
            </p>
            <p className="text-sm text-emerald-700">
              Progress: {Math.round(completionData.completion_percentage)}%
            </p>
          </div>
        )}

        {/* Date + Signature Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 sm:mt-16 px-4 sm:px-12 text-base sm:text-lg text-gray-800 gap-8 sm:gap-0">
          <div className="text-center">
            <p className="font-medium">Date</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">
              {new Date().toLocaleDateString()}
            </p>
          </div>
          <div className="text-center">
            <p className="font-medium">Signature</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">Authorized</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={generatePDF}
            disabled={generating}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
          >
            {generating ? 'Generating...' : '📄 Download PDF'}
          </button>
          <button
            onClick={() => navigate("/modules")}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Back to Modules
          </button>
        </div>

        {/* Seal */}
        <div className="absolute bottom-6 right-6 sm:w-24 sm:h-24 w-20 h-20 rounded-full border-4 border-yellow-500 flex items-center justify-center text-yellow-600 font-bold bg-yellow-50/70 shadow-inner">
          DIVU
        </div>
      </div>
    </div>
  );
}
