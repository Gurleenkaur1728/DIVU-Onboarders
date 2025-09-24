import { useState } from "react";
import Sidebar, { ROLES } from "../../../components/Sidebar.jsx";
import { Send } from "lucide-react";

export default function AddEmployee() {
  const [formData, setFormData] = useState({
    employeeId: "",
    email: "",
    position: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!formData.email) {
      setMessage("Email is required");
      return;
    }
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("http://localhost:5050/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: formData.email,
          subject: "You’ve been invited to join Divu!",
          text: `Hello, you’ve been invited to join Divu as ${formData.position}. Please click the link below to complete your registration.`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width:600px; margin:auto; border:1px solid #e0e0e0; border-radius:12px; overflow:hidden; box-shadow:0 4px 12px rgba(0,0,0,0.1);">
              <!-- Header -->
              <div style="background-color:#064e3b; padding:20px; text-align:center;">
                <img src="https://zhnulozkwqzycapxvsxk.supabase.co/storage/v1/object/public/assets/divu-logo.png" alt="Divu Logo" style="height:50px;" />
                <h1 style="color:#ffffff; margin:10px 0 0; font-size:20px;">Welcome to Divu</h1>
              </div>

              <!-- Body -->
              <div style="padding:30px; color:#333;">
                <p style="font-size:16px; margin-bottom:20px;">Hello,</p>
                <p style="font-size:16px; margin-bottom:20px;">
                  You’ve been invited to join <strong>Divu</strong> as <strong>${formData.position || "Employee"}</strong>.
                </p>
                <p style="font-size:16px; margin-bottom:20px;">
                  Click the button below to complete your registration and access your account.
                </p>

                <div style="text-align:center; margin:30px 0;">
                  <a href="https://divu.app/onboarding?email=${formData.email}" 
                     style="background:#10b981; color:#fff; text-decoration:none; padding:14px 28px; border-radius:8px; font-size:16px; font-weight:bold;">
                     Accept Invitation
                  </a>
                </div>

                <p style="font-size:14px; color:#666;">
                  If you didn’t expect this invitation, you can safely ignore this email.
                </p>
              </div>

              <!-- Footer -->
              <div style="background:#f9fafb; padding:15px; text-align:center; font-size:12px; color:#777;">
                © ${new Date().getFullYear()} Divu Inc. All rights reserved.
              </div>
            </div>
          `,
        }),
      });

      if (res.ok) {
        setMessage("Invitation sent successfully ✅");
      } else {
        setMessage("Failed to send invitation ❌");
      }
    } catch (err) {
      console.error(err);
      setMessage("Error sending email ❌");
    } finally {
      setLoading(false);
    }
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

        {/* Form */}
        <div className="bg-white/95 rounded-xl p-6 shadow-lg max-w-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              name="employeeId"
              placeholder="Employee ID"
              value={formData.employeeId}
              onChange={handleChange}
              className="border rounded px-3 py-2"
            />
            <input
              name="email"
              placeholder="Email"
              value={formData.email}
              onChange={handleChange}
              className="border rounded px-3 py-2"
            />
            <input
              name="position"
              placeholder="Position"
              value={formData.position}
              onChange={handleChange}
              className="border rounded px-3 py-2"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded bg-emerald-600 text-white font-semibold hover:bg-emerald-500 disabled:bg-gray-400"
          >
            <Send size={16} /> {loading ? "Sending..." : "Send Invitation Link"}
          </button>

          {message && (
            <p className="mt-3 text-sm font-medium text-emerald-800">{message}</p>
          )}
        </div>
      </div>
    </div>
  );
}
