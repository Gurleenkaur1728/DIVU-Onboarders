import { useParams, useNavigate } from "react-router-dom";

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();

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

        {/* Employee Name Placeholder */}
        <h2 className="text-2xl sm:text-3xl font-semibold text-emerald-700 mb-2">
          [Employee Name]
        </h2>

        <p className="mb-6 text-emerald-800 text-base sm:text-lg">
          has successfully completed
        </p>

        <h3 className="text-xl sm:text-2xl font-bold text-emerald-950 mb-8">
          Module {id}
        </h3>

        {/* Date + Signature Row */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-12 sm:mt-16 px-4 sm:px-12 text-base sm:text-lg text-gray-800 gap-8 sm:gap-0">
          <div className="text-center">
            <p className="font-medium">Date</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">00/00/0000</p>
          </div>
          <div className="text-center">
            <p className="font-medium">Signature</p>
            <p className="border-b border-gray-600 w-40 mx-auto mt-1">Authorized</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-10">
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
