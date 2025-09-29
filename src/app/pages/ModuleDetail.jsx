import { useParams, useNavigate } from "react-router-dom";
import { useState } from "react";
import Sidebar, {ROLES}  from "../components/Sidebar.jsx";
import modulesData from "../../lib/modulesData";

export default function ModuleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const module = modulesData.find((m) => m.id === Number(id));

  const [page, setPage] = useState(0);

  if (!module) return <div className="p-6">Module not found</div>;

  const pages = module.pages || [{ heading: module.title, tasks: module.tasks }];
  const pageContent = pages[page];

  return (
    <div
      className="flex min-h-dvh"
      style={{
        backgroundImage: "url(${'/bg.png'})",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar role={ROLES.USER} />

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
          <p className="italic text-gray-600 mb-8 text-lg">{module.goal}</p>

          {/* Content */}
          <div className="space-y-4 mb-10">
            <h2 className="font-semibold text-xl text-emerald-800">
              {pageContent.heading}
            </h2>
            <ul className="list-disc pl-6 space-y-3">
              {pageContent.tasks.map((task, idx) => (
                <li key={idx} className="text-gray-700 leading-relaxed">
                  {task}
                </li>
              ))}
            </ul>

            {/* Extra placeholder text for richer content */}
            <p className="text-gray-700 leading-relaxed">
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
              posuere, nulla ac commodo fringilla, nunc est bibendum justo, nec
              tristique risus purus a risus. Praesent congue nisi sit amet purus
              efficitur, sed commodo lacus pharetra.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Etiam vitae ultrices nibh. Suspendisse potenti. Proin non massa a
              magna consequat varius. Integer et purus eu ligula suscipit
              facilisis. Donec dapibus, arcu vel tincidunt pellentesque, magna
              sem finibus justo, in ullamcorper eros magna in nisl.
            </p>
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
    </div>
  );
}