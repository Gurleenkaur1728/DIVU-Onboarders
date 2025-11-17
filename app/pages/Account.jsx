import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AppLayout from "../../src/AppLayout.jsx";
import { useRole } from "../../src/lib/hooks/useRole.js";
import { useAuth } from "../context/AuthContext.jsx";

export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("employment");
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);
  const nav = useNavigate();

  const { roleId } = useRole();
  const { user, loading: authLoading, logout } = useAuth();

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      nav("/", { replace: true });
      return;
    }

    setName(user.name || "");
    setEmail(user.email || "");
    setEmployeeId(localStorage.getItem("employee_id") || "");
    setLoading(false);
  }, [authLoading, user, nav]);

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) setProfileImage(URL.createObjectURL(file));
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const save = async () => {
    try {
      setBusy(true);
      alert("Changes saved (stub). Add your Supabase update here.");
    } catch (e) {
      alert("Failed to save: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    logout();
    nav("/", { replace: true });
  };

  if (loading || authLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
        <p className="text-emerald-100 text-lg animate-pulse">Loading...</p>
      </div>
    );
  }

  return (
    <AppLayout>

    {/* // <div
    //   className="flex min-h-dvh bg-gradient-to-br from-emerald-50 to-green-100/60"
    //   style={{
    //     backgroundImage: "url('/bg.png')",
    //     backgroundSize: "cover",
    //     backgroundPosition: "center",
    //   }}
    // >
    //   <Sidebar role={roleId} /> */}

      <div className="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
        {/* Header */}
        <div className="mb-6 flex flex-wrap items-center justify-between bg-emerald-100/90 rounded-lg px-4 py-3 shadow-sm border border-emerald-200/50">
          <h1 className="text-2xl md:text-3xl font-extrabold text-emerald-950">
            Account
          </h1>
          <button
            onClick={signOut}
            className="px-5 py-2 rounded-lg font-semibold border-2 border-red-500 text-red-600 bg-red-50 hover:bg-red-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-400"
          >
            Sign Out
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-3 flex-wrap mb-6">
          {["employment", "role", "department", "settings"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-full font-semibold capitalize transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400
                ${
                  activeTab === tab
                    ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
                    : "bg-white text-emerald-800 hover:bg-gray-100"
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

        {/* Content Card */}
        <div className="bg-white/95 rounded-2xl p-6 sm:p-8 shadow-lg border border-emerald-200">
          {/* SETTINGS */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-8 max-w-3xl">
              {/* Profile Image */}
              <div
                onClick={triggerFileInput}
                className="w-32 h-32 bg-emerald-50 border border-emerald-200 rounded-md flex items-center justify-center text-emerald-700 font-semibold cursor-pointer hover:bg-emerald-100 transition-all duration-200"
                title="Click to upload profile image"
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

              <div className="grid grid-cols-1 gap-4 max-w-lg">
                <label className="block">
                  <span className="block text-sm font-semibold text-emerald-900 mb-1">
                    Full Name
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-lg border border-emerald-200 bg-white/90 px-3 py-2 text-emerald-900 shadow-sm focus:border-emerald-400 focus:ring focus:ring-emerald-300/50"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-emerald-900 mb-1">
                    Email
                  </span>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-emerald-900 mb-1">
                    Employee ID
                  </span>
                  <input
                    type="text"
                    value={employeeId}
                    disabled
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
                  />
                </label>

                <label className="block">
                  <span className="block text-sm font-semibold text-emerald-900 mb-1">
                    Role
                  </span>
                  <input
                    type="text"
                    // value={
                    //   roleId === ROLES.ADMIN
                    //     ? "Admin"
                    //     : roleId === ROLES.SUPER_ADMIN
                    //     ? "Super Admin"
                    //     : "User"
                    // }
                    disabled
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={save}
                  disabled={busy}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-md hover:from-emerald-400 hover:to-green-500 transition disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {busy ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </div>
          )}

          {/* EMPLOYMENT */}
          {activeTab === "employment" && (
            <div className="space-y-2 text-emerald-900 leading-relaxed">
              <p>
                <span className="font-semibold">Employee Name:</span> {name || "—"}
              </p>
              <p>
                <span className="font-semibold">Employee ID:</span>{" "}
                {employeeId || "—"}
              </p>
              <p>
                <span className="font-semibold">Employment Term:</span> Full-Time
              </p>
              <p>
                <span className="font-semibold">Employment Role:</span>{" "}
                {/* {roleId === ROLES.ADMIN
                  ? "Admin"
                  : roleId === ROLES.SUPER_ADMIN
                  ? "Super Admin"
                  : "User"} */}
              </p>
              <p>
                <span className="font-semibold">Pay Type:</span> Salary
              </p>
              <p>
                <span className="font-semibold">Salary:</span> $70,000/year
              </p>
            </div>
          )}

          {/* ROLE */}
          {activeTab === "role" && (
            <div className="space-y-2 text-emerald-900 leading-relaxed">
              <p>
                <span className="font-semibold">Role Name:</span> Frontend Engineer
              </p>
              <p>
                <span className="font-semibold">Role Details:</span> Responsible for UI
                development using React & Tailwind
              </p>
              <p>
                <span className="font-semibold">Specifications:</span> Works closely
                with UX and backend teams
              </p>
              <p>
                <span className="font-semibold">Hire Date:</span> 01-06-2025
              </p>
              <p>
                <span className="font-semibold">Role Duration:</span> Permanent
              </p>
            </div>
          )}

          {/* DEPARTMENT */}
          {activeTab === "department" && (
            <div className="space-y-2 text-emerald-900 leading-relaxed">
              <p>
                <span className="font-semibold">Department:</span> Technology
              </p>
              <p>
                <span className="font-semibold">Team:</span> Web Development
              </p>
              <p>
                <span className="font-semibold">Manager:</span> John Smith
              </p>
              <p>
                <span className="font-semibold">Supervisor:</span> Jane Doe
              </p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
//Account.jsx