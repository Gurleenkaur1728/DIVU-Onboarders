import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { supabase } from "../../src/lib/supabaseClient.js";

export default function Account() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [userId, setUserId] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const [activeTab, setActiveTab] = useState("employment");
  const [profileImage, setProfileImage] = useState(null);
  const fileInputRef = useRef(null);

  const nav = useNavigate();
  const isSmall = typeof window !== "undefined" ? window.innerWidth < 900 : false;

  // Dynamically detect role from localStorage (fallback to USER)
  const [role, setRole] = useState(() => {
    const stored = localStorage.getItem("role_id");
    return stored !== null ? parseInt(stored, 10) : ROLES.USER;
  });

  useEffect(() => {
    fetchUserData();
    // Also update role from localStorage in case it changes
    const stored = localStorage.getItem("role_id");
    if (stored !== null) setRole(parseInt(stored, 10));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchUserData = async () => {
    try {
      setLoading(true);

      // who is logged in?
      const { data: { user: authUser }, error: auErr } = await supabase.auth.getUser();
      if (auErr || !authUser) throw new Error("Not signed in");

      // profile row for THIS user (join by email since public.users is your legacy table)
      const { data: profile, error: profErr } = await supabase
        .from("users")
        .select("id, name, email, employee_id")
        .eq("email", authUser.email)
        .maybeSingle();
      if (profErr) throw profErr;

      if (profile) {
        setUserId(profile.id);
        setName(profile.name || "");
        setEmail(profile.email || "");
        setEmployeeId(profile.employee_id || "");
      }

      // get effective role from user_roles (source of truth)
      const { data: roleRow } = await supabase
        .from("user_roles")
        .select("role_id, role")
        .eq("user_id", authUser.id)
        .maybeSingle();

      const rid = Number(roleRow?.role_id ?? Number(localStorage.getItem("role_id") ?? 0));
      setRole(rid === 2 ? ROLES.SUPER_ADMIN : rid === 1 ? ROLES.ADMIN : ROLES.USER);
    } catch (e) {
      alert("Error fetching user data: " + e.message);
    } finally {
      setLoading(false);
    }
  };


  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProfileImage(URL.createObjectURL(file));
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const save = async () => {
    try {
      setBusy(true);
      // Put your save logic here; e.g., update the user in Supabase
      // await supabase.from("users").update({ name }).eq("id", userId);
      console.log("Save clicked");
      alert("Changes saved (stub). Add your Supabase update here.");
    } catch (e) {
      alert("Failed to save: " + e.message);
    } finally {
      setBusy(false);
    }
  };

  const signOut = () => {
    nav("/"); // Simplified → just go back to login
  };

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
        <p className="text-emerald-100 text-lg">Loading...</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-dvh"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <Sidebar role={role} />

      <div className="flex-1 p-8">
        {/* Header row: Title (left) + Sign out (right) */}
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-white">Account</h1>
          <button
            onClick={signOut}
            className="px-4 py-2 rounded-lg font-semibold border-2 border-red-500 text-red-600 bg-red-50 hover:bg-red-100 transition"
          >
            Sign out
          </button>
        </div>

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

        {/* Content Card */}
        <div className="bg-white/95 rounded-2xl p-6 shadow-lg">
          {/* SETTINGS (editable) */}
          {activeTab === "settings" && (
            <div className="flex flex-col gap-8 max-w-3xl">
              {/* Profile image upload is EDITABLE, so it belongs only in settings */}
              <div
                onClick={triggerFileInput}
                className="w-32 h-32 bg-gray-200 rounded-md flex items-center justify-center text-gray-500 font-semibold cursor-pointer hover:bg-gray-300 transition"
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
                    Full name
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
                    value={
                      role === ROLES.ADMIN
                        ? "Admin"
                        : role === ROLES.SUPER_ADMIN
                        ? "Super Admin"
                        : "User"
                    }
                    disabled
                    className="w-full rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2 text-emerald-800 cursor-not-allowed"
                  />
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={save}
                  disabled={busy}
                  className="px-6 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-emerald-500 to-green-600 shadow-md hover:from-emerald-400 hover:to-green-500 transition"
                >
                  {busy ? "Saving…" : "Save changes"}
                </button>
                {/* You already have Sign out in header; keep only one primary sign-out */}
              </div>
            </div>
          )}

          {/* EMPLOYMENT (read-only) */}
          {activeTab === "employment" && (
            <div className="flex-1 space-y-2 text-gray-800">
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
                {role === ROLES.ADMIN
                  ? "Admin"
                  : role === ROLES.SUPER_ADMIN
                  ? "Super Admin"
                  : "User"}
              </p>
              <p>
                <span className="font-semibold">Pay Type:</span> Salary
              </p>
              <p>
                <span className="font-semibold">Salary:</span> $70,000/year
              </p>
            </div>
          )}

          {/* ROLE (read-only) */}
          {activeTab === "role" && (
            <div className="flex-1 space-y-2 text-gray-800">
              <p>
                <span className="font-semibold">Role Name:</span> Frontend Engineer
              </p>
              <p>
                <span className="font-semibold">Role Details:</span> Responsible for UI
                development using React & Tailwind
              </p>
              <p>
                <span className="font-semibold">Role Specifications:</span> Works closely with UX
                team and backend developers
              </p>
              <p>
                <span className="font-semibold">Hire Date:</span> 01-06-2025
              </p>
              <p>
                <span className="font-semibold">Role Duration:</span> Permanent
              </p>
            </div>
          )}

          {/* DEPARTMENT (read-only) */}
          {activeTab === "department" && (
            <div className="flex-1 space-y-2 text-gray-800">
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
