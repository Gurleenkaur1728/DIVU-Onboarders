import { useState, useEffect } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { Send, RefreshCcw, XCircle } from "lucide-react";
import { useRole } from "../../../../src/lib/hooks/useRole.js";
import { supabase } from "../../../../src/lib/supabaseClient.js";

// ✅ Helper: Add Audit Log
const addAuditLog = async (employeeEmail, employeeName, action, performedBy) => {
  const { error } = await supabase.from("audit_logs").insert([
    {
      employee_email: employeeEmail,
      employee_name: employeeName,
      action,
      performed_by: performedBy,
    },
  ]);
  if (error) console.error("Audit log error:", error);
};

// ✅ Styled Email Template
const buildEmailHTML = ({ firstName, position, token_hash }) => `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(16,185,129,0.12);">
      <div style="background:linear-gradient(90deg,#065f46 60%,#34d399 100%);padding:24px;text-align:center;">
        <img src="https://zhnulozkwqzycapxvsxk.supabase.co/storage/v1/object/public/assets/divu-logo.png"
             alt="Divu Logo" style="height:80px;margin-bottom:12px;" />
        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;">Welcome to Divu</h1>
      </div>
      <div style="background:#fff;padding:32px 28px;color:#222;">
        <p style="font-size:1.15rem;font-weight:600;margin-bottom:18px;">
          Hello <span style="color:#10b981;">${firstName}</span>,
        </p>
        <p style="font-size:1.05rem;margin-bottom:18px;">
          You’ve been invited to join as <strong>${position || "Employee"}</strong>.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://divu-client01.vercel.app/activate?token=${token_hash}"
             style="background:linear-gradient(90deg,#10b981 60%,#34d399 100%);
                    color:#fff;text-decoration:none;padding:16px 36px;border-radius:10px;
                    font-size:1.1rem;font-weight:700;box-shadow:0 2px 8px rgba(16,185,129,0.10);">
            Set Up Your Account
          </a>
        </div>
      </div>
    </div>
  </body>
  </html>
`;

// ✅ Email Sender
const sendEmail = async ({ email, firstName, lastName, position, token_hash }) => {
  try {
    const res = await fetch("https://divu-server.vercel.app/send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        to: email,
        subject: "You’ve been invited to set up your Divu account!",
        text: `Welcome ${firstName} ${lastName}, invited as ${position}.`,
        html: buildEmailHTML({ firstName, position, token_hash }),
      }),
    });
    return res;
  } catch (err) {
    console.error("Email error:", err);
    throw new Error("Unable to connect to email server.");
  }
};

export default function AddEmployee() {
  const { roleId } = useRole();

  const [formData, setFormData] = useState({
    employeeId: "",
    firstName: "",
    lastName: "",
    email: "",
    position: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [recentInvites, setRecentInvites] = useState([]);
  const [activeTab, setActiveTab] = useState("form");
  const [notification, setNotification] = useState("");
  const [autoGenerateId, setAutoGenerateId] = useState(true);

  const hrEmail = localStorage.getItem("profile_email") || "HR Admin";

  useEffect(() => {
    fetchInvitations();
    if (autoGenerateId) {
      generateEmployeeId();
    }
  }, [autoGenerateId]);

  // ✅ Generate automatic employee ID
  const generateEmployeeId = async () => {
    try {
      // Get the count of all employee invitations
      const { count, error } = await supabase
        .from("employee_invitations")
        .select("*", { count: "exact", head: true });
      
      if (error) console.error("Error fetching employee count:", error);
      
      const nextNumber = (count || 0) + 1;
      const generatedId = String(nextNumber).padStart(3, "0");
      
      setFormData(prev => ({ ...prev, employeeId: generatedId }));
    } catch (err) {
      console.error("Error generating employee ID:", err);
    }
  };

  // ✅ Fetch recent invitations
  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from("employee_invitations")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    if (!error && data) setRecentInvites(data);
  };

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  // ✅ Handle Add Employee
  const handleSubmit = async () => {
    if (!formData.email) {
      setMessage("Email is required.");
      setIsError(true);
      return;
    }

    setLoading(true);
    setMessage("");
    setIsError(false);

    try {
      const newToken = crypto.randomUUID();

      // Step 1: Send email
      const res = await sendEmail({ ...formData, token_hash: newToken });
      if (!res.ok) throw new Error("Email service failed.");

      // Step 2: Save to Supabase
      const { error: insertError } = await supabase.from("employee_invitations").insert([
        {
          email: formData.email,
          position: formData.position,
          status: "pending",
          first_name: formData.firstName,
          last_name: formData.lastName,
          extra_data: { employee_id: formData.employeeId },
          expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          token_hash: newToken,
        },
      ]);
      if (insertError) throw new Error(insertError.message);

      // Step 3: Log action
      await addAuditLog(
        formData.email,
        `${formData.firstName} ${formData.lastName}`,
        "HR sent invitation email",
        hrEmail
      );

      setMessage(`✅ Invitation sent successfully to ${formData.email}`);
      fetchInvitations();
    } catch (err) {
      console.error(err);
      setIsError(true);
      setMessage(err.message || "Error while sending invitation.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend Invitation
  const handleResend = async (invite) => {
    const newToken = crypto.randomUUID();
    await supabase
      .from("employee_invitations")
      .update({
        token_hash: newToken,
        status: "pending",
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq("id", invite.id);
    await sendEmail({ ...invite, token_hash: newToken });
    await addAuditLog(invite.email, `${invite.first_name} ${invite.last_name}`, "Invitation resent", hrEmail);
    setNotification(`Invitation resent to ${invite.email}`);
    fetchInvitations();
  };

  // ✅ Revoke Invitation
  const handleRevoke = async (invite) => {
    await supabase.from("employee_invitations").update({ status: "revoked" }).eq("id", invite.id);
    await addAuditLog(invite.email, `${invite.first_name} ${invite.last_name}`, "Invitation revoked", hrEmail);
    setNotification(`Invitation revoked for ${invite.email}`);
    fetchInvitations();
  };

  return (
    <AppLayout>
      <div className="bg-url/ flex-1 min-h-dvh p-6 space-y-6">
      <div
        className="
          rounded-lg shadow-sm border px-6 py-4 mb-6
          flex items-center justify-between transition
          bg-white border-gray-300 text-gray-900
          dark:bg-black/30 dark:border-black dark:text-white
        "
      >
        {/* Left Side — Page Title */}
        <h1 className="text-2xl font-bold">
          Add Employees
        </h1>

        {/* Right Side — Tabs */}
        <div className="flex items-center gap-3">

          {/* Add Employee Tab */}
          <button
            onClick={() => setActiveTab("form")}
            className={`
              px-4 py-2 rounded-md text-sm font-medium border transition
              ${activeTab === "form"
                ? "bg-DivuDarkGreen text-white border-DivuDarkGreen"
                : "bg-transparent border-black border hover:bg-DivuBlue"
              }
            `}
          >
            Add Employee
          </button>

          {/* Recent Invitations Tab */}
          <button
            onClick={() => setActiveTab("recent")}
            className={`
              px-4 py-2 rounded-md text-sm font-medium border transition
              ${activeTab === "recent"
                ? "bg-DivuDarkGreen text-white border-DivuDarkGreen"
                : "bg-transparent border-black border hover:bg-DivuBlue"
              }
            `}
          >
            Recent Invitations
          </button>
        </div>
      </div>

        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-600 text-white px-6 py-3 rounded-lg shadow-lg">
            {notification}
          </div>
        )}

        {activeTab === "form" && (
          <div className=" border border-gray-400 bg-white/30 dark:bg-white 
           rounded-lg shadow-sm p-6 space-y-4">
            {/* Auto-generate toggle */}
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
              <input 
                type="checkbox" 
                id="autoGenerate" 
                checked={autoGenerateId} 
                onChange={(e) => setAutoGenerateId(e.target.checked)}
                className="w-4 h-4 rounded focus:ring-emerald-500" 
              />
              <label htmlFor="autoGenerate" className="text-sm font-medium text-gray-700 cursor-pointer">
                Auto-generate Employee ID (Format: 001, 002, 003, ...)
              </label>
            </div>

            {/* Employee ID */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Employee ID {!autoGenerateId && <span className="text-red-500">*</span>}
              </label>
              <input 
                name="employeeId" 
                placeholder={autoGenerateId ? "Auto-generated" : "Enter employee ID"} 
                value={formData.employeeId} 
                onChange={handleChange} 
                disabled={autoGenerateId}
                className={`border border-gray-300 rounded-lg px-3 py-2 w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 ${
                  autoGenerateId ? "bg-gray-100 cursor-not-allowed text-black"
                   : ""
                }`}
              />
              {autoGenerateId && (
                <p className="text-xs text-gray-500 mt-1">
                  ✓ Next available ID: {formData.employeeId}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input 
                name="firstName" 
                placeholder="Enter first name" 
                value={formData.firstName} 
                onChange={handleChange} 
                className="border border-gray-300 rounded-lg px-3 py-2 dark:placeholder-slate-600 text-black
                w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input 
                name="lastName" 
                placeholder="Enter last name" 
                value={formData.lastName} 
                onChange={handleChange} 
                className="border border-gray-300 rounded-lg px-3 py-2 dark:placeholder-slate-600 text-black
                 w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input 
                name="email" 
                placeholder="Enter email address" 
                value={formData.email} 
                onChange={handleChange} 
                className="border border-gray-300 rounded-lg px-3 py-2 dark:placeholder-slate-600 text-black
                w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Position</label>
              <input 
                name="position" 
                placeholder="Enter position" 
                value={formData.position} 
                onChange={handleChange} 
                className="border border-gray-300 rounded-lg px-3 py-2 dark:placeholder-slate-600 text-black
                 w-full focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" 
              />
            </div>
            <button 
              onClick={handleSubmit} 
              disabled={loading} 
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-DivuDarkGreen hover:bg-DivuLightGreen hover:text-black
               text-white font-semibold disabled:bg-gray-400 transition-colors"
            >
              <Send size={16} /> {loading ? "Sending..." : "Send Invitation"}
            </button>
            {message && <p className={`mt-3 text-sm ${isError ? "text-red-600" : "text-green-600"}`}>{message}</p>}
          </div>
        )}

        {activeTab === "recent" && (
          <div className="border border-gray-400 bg-white/30 dark:bg-black/20 dark:border-black
           rounded-lg shadow-sm p-6 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200
                 dark:bg-black/60 dark:border-gray-700 dark:text-white">
                  <tr>
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Position</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((inv, idx) => (
                    <tr key={inv.id} className="border-b border-gray-200 hover:bg-DivuBlue
                    transition-colors">
                      <td className="px-4 py-3 text-gray-900 dark:text-emerald-200 font-bold">{inv.first_name} {inv.last_name}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{inv.email}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-white">{inv.position}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          inv.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          inv.status === 'accepted' ? 'bg-green-100 text-green-800' :
                          inv.status === 'revoked' ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">{new Date(inv.created_at).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleResend(inv)} 
                            className="p-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                            title="Resend invitation"
                          >
                            <RefreshCcw size={16} />
                          </button>
                          <button 
                            onClick={() => handleRevoke(inv)} 
                            className="p-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            title="Revoke invitation"
                          >
                            <XCircle size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button 
      onClick={onClick} 
      className={`px-5 py-2 rounded-lg text-sm font-medium transition ${
        active 
          ? "bg-emerald-600 text-white shadow-sm" 
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      }`}
    >
      {label}
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 text-left font-semibold bg-DivuBlue/20 dark:bg-DivuBlue/20
  ">{children}</th>;
}
