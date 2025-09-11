import { useState, useRef } from "react";
import Sidebar from "../components/Sidebar.jsx";

export default function Account() {
  const [activeTab, setActiveTab] = useState("employment");
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef();

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current.click();
  };

  return (
    <div
      className="flex min-h-dvh"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar />

      <div className="flex-1 p-8">
        <h1 className="text-3xl font-bold text-white mb-6">Account</h1>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 flex-wrap">
          {["employment", "role", "department", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded font-semibold capitalize ${
                activeTab === tab
                  ? "bg-emerald-600 text-white"
                  : "bg-white text-emerald-700 hover:bg-gray-100"
              }`}
            >
              {tab === "employment"
                ? "Employment Details"
                : tab === "role"
                ? "Role Information"
                : tab === "department"
                ? "Department"
                : "Account Settings"}
            </button>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8 flex gap-8">
          {/* Profile image (not in settings) */}
          {activeTab !== "settings" && (
            <div
              onClick={triggerFileInput}
              className="w-32 h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 font-semibold cursor-pointer hover:bg-gray-300 transition"
            >
              {profileImage ? (
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover rounded-md"
                />
              ) : (
                "Upload"
              )}
              <input
                type="file"
                accept="image/*"
                ref={fileInputRef}
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
          )}

          {/* Tab Content */}
          <div className="flex-1 space-y-4 text-gray-800">
            {/* Employment */}
            {activeTab === "employment" && (
              <>
                <p>
                  <span className="font-semibold">Employee Name:</span> Gurleen
                </p>
                <p>
                  <span className="font-semibold">Employee ID:</span> EMP-001
                </p>
                <p>
                  <span className="font-semibold">Employment Term:</span> Full-Time
                </p>
                <p>
                  <span className="font-semibold">Employment Role:</span> Software Developer
                </p>
                <p>
                  <span className="font-semibold">Pay Type:</span> Salary
                </p>
                <p>
                  <span className="font-semibold">Salary:</span> $70,000/year
                </p>
              </>
            )}

            {/* Role */}
            {activeTab === "role" && (
              <>
                <p>
                  <span className="font-semibold">Role Name:</span> Frontend Engineer
                </p>
                <p>
                  <span className="font-semibold">Role Details:</span> Responsible for UI development using React & Tailwind
                </p>
                <p>
                  <span className="font-semibold">Role Specifications:</span> Works closely with UX team and backend developers
                </p>
                <p>
                  <span className="font-semibold">Hire Date:</span> 01-06-2025
                </p>
                <p>
                  <span className="font-semibold">Role Duration:</span> Permanent
                </p>
              </>
            )}

            {/* Department */}
            {activeTab === "department" && (
              <>
                <p>
                  <span className="font-semibold">Department:</span> Technology
                </p>
                <p>
                  <span className="font-semibold">Department Team:</span> Web Development
                </p>
                <p>
                  <span className="font-semibold">Manager:</span> John Smith
                </p>
                <p>
                  <span className="font-semibold">Supervisor:</span> Jane Doe
                </p>
              </>
            )}

            {/* Settings */}
            {activeTab === "settings" && (
              <form className="space-y-6 w-full max-w-lg">
                <div>
                  <label className="block font-semibold mb-1">Full name</label>
                  <input
                    type="text"
                    defaultValue="Gurleen"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    defaultValue="gurleenkau07@edu.sait.ca"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Employee ID</label>
                  <input
                    type="text"
                    defaultValue="EMP-001"
                    className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="flex flex-col gap-3">
                  <button
                    type="submit"
                    className="px-6 py-3 bg-emerald-600 text-white font-semibold rounded-lg hover:bg-emerald-700"
                  >
                    Save changes
                  </button>
                  <button
                    type="button"
                    className="px-6 py-3 border border-red-500 text-red-600 font-semibold rounded-lg hover:bg-red-50"
                  >
                    Sign out
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
