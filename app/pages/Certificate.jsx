import { useParams, useNavigate } from "react-router-dom";

export default function Certificate() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-gray-200 via-white to-gray-200">
      <div className="bg-white p-12 rounded-lg shadow-2xl text-center w-[800px] border-8 border-yellow-400 relative">
        {/* Certificate Heading */}
        <h1 className="text-4xl font-bold text-blue-900 mb-2">
          Certificate of Achievement
        </h1>
        <p className="mb-6 text-gray-700">This certifies that</p>

        {/* Name placeholder (later dynamic from user profile) */}
        <h2 className="text-3xl font-semibold text-emerald-700 mb-2">
          [Employee Name]
        </h2>

        <p className="mb-6 text-gray-700">has successfully completed</p>

        <h3 className="text-2xl font-bold text-gray-900 mb-6">
          Module {id}
        </h3>

        {/* Date + Signature Row */}
        <div className="flex justify-between mt-12 px-12 text-lg text-gray-800">
          <div>
            <p>Date</p>
            <p className="border-b border-gray-600 w-40 mx-auto">00/00/0000</p>
          </div>
          <div>
            <p>Signature</p>
            <p className="border-b border-gray-600 w-40 mx-auto">Authorized</p>
          </div>
        </div>

        {/* Back Button */}
        <div className="mt-10">
          <button
            onClick={() => navigate("/modules")}
            className="px-6 py-2 bg-emerald-700 text-white rounded-md font-semibold hover:bg-emerald-800"
          >
            Back to Modules
          </button>
        </div>

        {/* Seal (fake for now) */}
        <div className="absolute bottom-6 right-6 w-24 h-24 rounded-full border-4 border-yellow-500 flex items-center justify-center text-yellow-600 font-bold">
          DIVU
        </div>
      </div>
    </div>
  );
}
