import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { X } from "lucide-react";
import { Send, RefreshCcw, XCircle } from "lucide-react";


// ✅ Supabase client
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

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
          We’re excited to have you on board! This step will set up your profile and give you access to your onboarding dashboard.
        </p>
        <p style="font-size:1.05rem;margin-bottom:18px;">
          You’ve been invited to join as <span style="color:#065f46;font-weight:700;">${position || "Employee"}</span>.
        </p>
        <div style="text-align:center;margin:32px 0;">
          <a href="https://divu-client01.vercel.app/activate?token=${token_hash}"
             style="background:linear-gradient(90deg,#10b981 60%,#34d399 100%);
                    color:#fff;text-decoration:none;padding:16px 36px;border-radius:10px;
                    font-size:1.1rem;font-weight:700;box-shadow:0 2px 8px rgba(16,185,129,0.10);">
            Set Up Your Account
          </a>
        </div>
        <p style="font-size:0.95rem;color:#666;margin-top:24px;">
          If you didn’t expect this invitation, you can safely ignore it.
        </p>
      </div>
      <div style="background:#f9fafb;padding:18px;text-align:center;font-size:0.95rem;color:#065f46;border-top:1px solid #e5e7eb;">
        <span style="font-weight:600;">© ${new Date().getFullYear()} Divu Inc.</span> All rights reserved.
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
        text: `Welcome ${firstName} ${lastName}, you’ve been invited to join Divu as ${position}.`,
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

  const hrEmail = localStorage.getItem("profile_email") || "HR Admin";

  useEffect(() => {
    fetchInvitations();
  }, []);

  // ✅ Fetch recent invitations
  const fetchInvitations = async () => {
    const { data, error } = await supabase
      .from("employee_invitations")
      .select("id, email, position, status, created_at, first_name, last_name, token_hash")
      .order("created_at", { ascending: false })
      .limit(10);

    if (!error && data) {
      setRecentInvites(
        data.map((row) => ({
          id: row.id,
          email: row.email,
          position: row.position,
          status: row.status,
          created_at: row.created_at,
          firstName: row.first_name || "",
          lastName: row.last_name || "",
          token_hash: row.token_hash,
        }))
      );
    }
  };

  // ✅ Handle form input change
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ✅ Send Invitation
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
      if (insertError) throw new Error(`Database error: ${insertError.message}`);

      // Step 3: Log to audit_logs
      await addAuditLog(
        formData.email,
        `${formData.firstName} ${formData.lastName}`,
        "HR sent invitation email",
        hrEmail
      );

      setMessage(`✅ Invitation sent successfully to ${formData.email}`);
      setIsError(false);
      fetchInvitations();
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Unknown error while sending invitation.");
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Resend Invitation
  const handleResend = async (invite) => {
    const newToken = crypto.randomUUID();

    const { error: updateError } = await supabase
      .from("employee_invitations")
      .update({
        token_hash: newToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        status: "pending",
      })
      .eq("id", invite.id);

    if (updateError) {
      setNotification(`Failed to regenerate token for ${invite.email}`);
      return;
    }

    const res = await sendEmail({ ...invite, token_hash: newToken });

    if (res.ok) {
      setNotification(`New invitation link sent to ${invite.email}`);
      fetchInvitations();

      // Log action
      await addAuditLog(
        invite.email,
        `${invite.firstName} ${invite.lastName}`,
        "Invitation link resent",
        hrEmail
      );
    } else {
      setNotification(`Failed to send new link to ${invite.email}`);
    }

    setTimeout(() => setNotification(""), 3000);
  };

  // ✅ Revoke Invitation
  const handleRevoke = async (invite) => {
    const { error } = await supabase
      .from("employee_invitations")
      .update({ status: "revoked" })
      .eq("id", invite.id);

    if (error) {
      setNotification(`Failed to revoke invitation for ${invite.email}`);
    } else {
      setNotification(`Invitation for ${invite.email} revoked!`);
      fetchInvitations();

      // Log action
      await addAuditLog(
        invite.email,
        `${invite.firstName} ${invite.lastName}`,
        "Invitation revoked",
        hrEmail
      );
    }

    setTimeout(() => setNotification(""), 3000);
  };

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar active="add-employee" role={ROLES.SUPER_ADMIN} />

      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between h-12 rounded-md bg-emerald-100/90 px-4 mb-4 shadow">
          <span className="font-semibold text-emerald-950">
            Super Admin – Add Employee
          </span>
        </div>

        {/* Title */}
        <div className="bg-emerald-900/95 px-6 py-4 rounded-xl mb-6 shadow-lg text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl tracking-wide">
          ADD EMPLOYEE
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab
            label="Add Employee"
            active={activeTab === "form"}
            onClick={() => setActiveTab("form")}
          />
          <Tab
            label="Recent Invitations"
            active={activeTab === "recent"}
            onClick={() => setActiveTab("recent")}
          />
        </div>

        {/* Notification */}
        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-6 py-3 rounded-xl shadow-lg z-50 text-center font-semibold text-sm">
            {notification}
          </div>
        )}

        {/* Form */}
        {activeTab === "form" && (
          <div className="bg-white/95 rounded-xl p-6 shadow-lg max-w-2xl space-y-4">
            <input name="employeeId" placeholder="Employee ID" value={formData.employeeId} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="position" placeholder="Position" value={formData.position} onChange={handleChange} className="border rounded px-3 py-2 w-full" />

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:bg-gray-400"
            >
              <Send size={16} /> {loading ? "Sending..." : "Send Invitation Link"}
            </button>

            {message && (
              <p
                className={`mt-3 text-sm font-medium ${
                  isError ? "text-red-600" : "text-green-600"
                }`}
              >
                {message}
              </p>
            )}
          </div>
        )}

        {/* Recent Invitations */}
        {activeTab === "recent" && (
          <div className="mt-2">
            <h3 className="font-bold text-lg mb-4 text-emerald-900">
              Recent Invitations
            </h3>
            <div className="overflow-x-auto rounded-lg border border-emerald-400/70 shadow-lg bg-white">
              <table className="min-w-[800px] w-full border-collapse">
                <thead>
                  <tr className="bg-emerald-900/95 text-emerald-100">
                    <Th>Name</Th>
                    <Th>Email</Th>
                    <Th>Position</Th>
                    <Th>Status</Th>
                    <Th>Created</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {recentInvites.map((invite, idx) => (
                    <tr
                      key={invite.id}
                      className={
                        idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"
                      }
                    >
                      <td className="px-4 py-3">
                        {invite.firstName} {invite.lastName}
                      </td>
                      <td className="px-4 py-3">{invite.email}</td>
                      <td className="px-4 py-3">{invite.position}</td>
                      <td className="px-4 py-3 capitalize">{invite.status}</td>
                      <td className="px-4 py-3">
                        {new Date(invite.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 flex gap-2">
                        <button
                          onClick={() => handleResend(invite)}
                          className="p-2 rounded bg-blue-500 text-white hover:bg-blue-600"
                        >
                          <RefreshCcw size={16} />
                        </button>
                        <button
                          onClick={() => handleRevoke(invite)}
                          className="p-2 rounded bg-red-500 text-white hover:bg-red-600"
                        >
                          <XCircle size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300 ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"
      }`}
    >
      {label}
    </button>
  );
}

function Th({ children }) {
  return (
    <th className="px-4 py-3 font-bold border-r border-emerald-800/50">
      {children}
    </th>
  );
}
