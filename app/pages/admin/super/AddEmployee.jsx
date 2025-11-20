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

  const hrEmail = localStorage.getItem("profile_email") || "HR Admin";

  useEffect(() => {
    fetchInvitations();
  }, []);

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
    {/* // <div className="flex min-h-dvh bg-cover bg-center relative" style={{ backgroundImage: "url('/bg.png')" }}>
    //   <Sidebar active="add-employee" role={roleId} /> */}
      <div className="flex-1 flex flex-col p-6">
        <div className="bg-DivuDarkGreen px-6 py-4 rounded-xl mb-6 text-emerald-100 font-extrabold border border-emerald-400/70 text-2xl">ADD EMPLOYEE</div>

        <div className="flex gap-2 mb-6">
          <Tab label="Add Employee" active={activeTab === "form"} onClick={() => setActiveTab("form")} />
          <Tab label="Recent Invitations" active={activeTab === "recent"} onClick={() => setActiveTab("recent")} />
        </div>

        {notification && (
          <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-emerald-700 text-white px-6 py-3 rounded-xl">
            {notification}
          </div>
        )}

        {activeTab === "form" && (
          <div className="bg-white rounded-xl p-6 shadow-lg max-w-2xl space-y-4">
            <input name="employeeId" placeholder="Employee ID" value={formData.employeeId} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="firstName" placeholder="First Name" value={formData.firstName} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="lastName" placeholder="Last Name" value={formData.lastName} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="email" placeholder="Email" value={formData.email} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <input name="position" placeholder="Position" value={formData.position} onChange={handleChange} className="border rounded px-3 py-2 w-full" />
            <button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2 px-4 py-2 rounded bg-DivuDarkGreen text-white font-semibold hover:bg-DivuLightGreen hover:text-black disabled:bg-gray-400">
              <Send size={16} /> {loading ? "Sending..." : "Send Invitation"}
            </button>
            {message && <p className={`mt-3 text-sm ${isError ? "text-red-600" : "text-green-600"}`}>{message}</p>}
          </div>
        )}

        {activeTab === "recent" && (
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="min-w-[800px] w-full border-collapse">
              <thead>
                <tr className="bg-DivuLightGreen text-Black">
                  <Th>Name</Th><Th>Email</Th><Th>Position</Th><Th>Status</Th><Th>Created</Th><Th>Actions</Th>
                </tr>
              </thead>
              <tbody>
                {recentInvites.map((inv, idx) => (
                  <tr key={inv.id} className={idx % 2 === 0 ? "bg-emerald-50/90" : "bg-emerald-100/80"}>
                    <td className="px-4 py-3">{inv.first_name} {inv.last_name}</td>
                    <td className="px-4 py-3">{inv.email}</td>
                    <td className="px-4 py-3">{inv.position}</td>
                    <td className="px-4 py-3">{inv.status}</td>
                    <td className="px-4 py-3">{new Date(inv.created_at).toLocaleString()}</td>
                    <td className="px-4 py-3 flex gap-2">
                      <button onClick={() => handleResend(inv)} className="p-2 bg-DivuBlue text-white rounded"><RefreshCcw size={16} /></button>
                      <button onClick={() => handleRevoke(inv)} className="p-2 bg-red-500 text-white rounded"><XCircle size={16} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button onClick={onClick} className={`px-4 py-2 rounded-lg text-sm font-semibold ${active ? "bg-DivuLightGreen hover:bg-DivuBlue" : "bg-DivuDarkGreen/90 text-white hover:bg-DivuBlue hover:text-black"}`}>
      {label}
    </button>
  );
}

function Th({ children }) {
  return <th className="px-4 py-3 font-bold border-r border-emerald-800/50">{children}</th>;
}
