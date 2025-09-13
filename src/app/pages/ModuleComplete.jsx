import { useParams, useNavigate } from "react-router-dom";

export default function ModuleComplete() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/60 z-50"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="bg-white p-12 rounded-2xl shadow-2xl text-center w-[500px] max-w-xl">
        <h1 className="text-3xl font-bold text-emerald-900 mb-4">
          🎉 Congratulations!
        </h1>
        <p className="text-lg text-gray-700 mb-8">
          You have completed <span className="font-semibold italic">Module {id}</span>!
        </p>

        <div className="flex flex-col gap-4">
          <button
            onClick={() => navigate(`/feedback/${id}`)}
            className="px-5 py-3 rounded-lg bg-emerald-700 text-white font-semibold hover:bg-emerald-800"
          >
            Create Feedback
          </button>

          <button
            onClick={() => navigate(`/certificate/${id}`)}
            className="px-5 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700"
          >
            See Certificate of Completion
          </button>

          <button
            onClick={() => navigate("/modules")}
            className="px-5 py-3 border border-gray-400 rounded-lg font-semibold hover:bg-gray-100"
          >
            Back to Modules
          </button>
        </div>
      </div>
    </div>
  );
}