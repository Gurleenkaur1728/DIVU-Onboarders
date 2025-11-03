import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [cert, setCert] = useState(null);
  const [userName, setUserName] = useState("Employee");

  useEffect(() => {
    loadCertificate();
    loadUserName();
  }, [id]);

  async function loadCertificate() {
    try {
      const { data, error } = await supabase
        .from("certificates")
        .select("title, issue_date")
        .eq("id", id)
        .single();

      if (error) throw error;
      setCert(data);
    } catch (err) {
      console.error("Error loading certificate:", err);
    }
  }

  async function loadUserName() {
    try {
      const profileId = localStorage.getItem("profile_id");
      if (!profileId) return;

      const { data, error } = await supabase
        .from("users")
        .select("name")
        .eq("id", profileId)
        .single();

      if (!error && data?.name) setUserName(data.name);
    } catch (err) {
      console.error("Error loading username:", err);
    }
  }

  // ✅ Proper issue date fallback
  const issueDate = cert?.issue_date
    ? new Date(cert.issue_date).toLocaleDateString()
    : new Date().toLocaleDateString();

  // ✅ Hide buttons during PDF export
  const handleDownload = async () => {
    const element = document.getElementById("certificate-container");
    const buttons = element.querySelectorAll(".exclude-pdf");
    buttons.forEach((btn) => (btn.style.display = "none"));

    const canvas = await html2canvas(element, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF("l", "mm", "a4");
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    pdf.addImage(imgData, "PNG", 0, 0, width, height);
    pdf.save(`${cert?.title || "certificate"}.pdf`);

    buttons.forEach((btn) => (btn.style.display = "inline-block"));
  };

  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-emerald-50 via-white to-green-100 relative"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div
        id="certificate-container"
        className="bg-white/95 p-10 sm:p-12 rounded-2xl shadow-2xl text-center w-[90%] max-w-3xl border-[10px] border-yellow-400 relative"
      >
        {/* Title */}
        <h1 className="text-3xl sm:text-4xl font-bold text-emerald-900 mb-3 tracking-wide">
          Certificate of Achievement
        </h1>

        <p className="mb-6 text-emerald-800 text-base sm:text-lg">
          This certifies that
        </p>

        {/* Recipient */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-emerald-700 mb-2">
          {userName}
        </h2>

        <p className="mb-6 text-emerald-800 text-base sm:text-lg">
          has successfully completed
        </p>

        {/* Module */}
        <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 mb-8">
          {cert?.title || "Module"}
        </h3>

        {/* Date + Signature */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 sm:mt-16 px-4 sm:px-12 text-base sm:text-lg text-gray-800 gap-8 sm:gap-0">
          <div className="text-center">
            <p className="font-medium">Date</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">
              {issueDate}
            </p>
          </div>
          <div className="text-center">
            <p className="font-medium">Signature</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">
              Authorized
            </p>
          </div>
        </div>

        {/* Buttons */}
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <button
            onClick={() => navigate("/progress")}
            className="exclude-pdf px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400"
          >
            Back to Progress
          </button>

          <button
            onClick={handleDownload}
            className="exclude-pdf px-6 py-2.5 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold shadow-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          >
            Download PDF
          </button>
        </div>

        {/* Gold DIVU Seal */}
        <div className="absolute bottom-6 right-6 sm:w-24 sm:h-24 w-20 h-20 rounded-full border-4 border-yellow-500 flex items-center justify-center text-yellow-600 font-bold bg-yellow-50/70 shadow-inner">
          DIVU
        </div>
      </div>
    </div>
  );
}
