import { useEffect, useState } from "react";
import AppLayout from "../../../../src/AppLayout.jsx";
import { useRole } from "../../../../src/lib/hooks/useRole.js";
import { X } from "lucide-react";
import { supabase } from "../../../../src/lib/supabaseClient.js";

// ✅ Shared mail template
function divuMailTemplate({ title, body, buttonText, buttonLink }) {
  return `
  <!DOCTYPE html>
  <html>
  <body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
    <div style="max-width:600px;margin:auto;border:1px solid #e5e7eb;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(16,185,129,0.12);">
      
      <!-- Header -->
      <div style="background:linear-gradient(90deg,#065f46 60%,#34d399 100%);padding:24px;text-align:center;">
        <img src="https://zhnulozkwqzycapxvsxk.supabase.co/storage/v1/object/public/assets/divu-logo.png" 
             alt="Divu Logo" style="height:80px;margin-bottom:12px;" />
        <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:1px;">
          ${title}
        </h1>
      </div>

      <!-- Body -->
      <div style="background:#fff;padding:32px 28px;color:#222;">
        ${body}
        ${
          buttonText && buttonLink
            ? `
              <div style="text-align:center;margin:32px 0;">
                <a href="${buttonLink}"
                   style="background:linear-gradient(90deg,#10b981 60%,#34d399 100%);
                          color:#fff;text-decoration:none;padding:16px 36px;border-radius:10px;
                          font-size:1.1rem;font-weight:700;box-shadow:0 2px 8px rgba(16,185,129,0.10);
                          letter-spacing:0.5px;display:inline-block;">
                  ${buttonText}
                </a>
              </div>
            `
            : ""
        }
      </div>

      <!-- Footer -->
      <div style="background:#f9fafb;padding:18px;text-align:center;font-size:0.95rem;color:#065f46;border-top:1px solid #e5e7eb;">
        <span style="font-weight:600;">© ${new Date().getFullYear()} Divu Inc.</span> All rights reserved.
      </div>
    </div>
  </body>
  </html>
  `;
}

export default function AccessRequests() {
  const { roleId } = useRole();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [message, setMessage] = useState(null);

  // ✅ Fetch submitted requests
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const { data } = await supabase
        .from("employee_invitations")
        .select(
          "id, email, extra_data, first_name, last_name, password_hash, token_hash, status"
        )
        .eq("status", "submitted");
      setRequests(data || []);
      setLoading(false);
    };

    fetchData();
  }, []);

  // ✅ Realtime listener
  useEffect(() => {
    const channel = supabase
      .channel("employee-invitations")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "employee_invitations" },
        (payload) => {
          if (payload.new.status === "submitted") {
            setRequests((prev) => [...prev, payload.new]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  // ✅ Approve
  const handleApprove = async (req) => {
    try {
      const fullName = `${req.first_name} ${req.last_name}`.trim();

      // 1. Check if user already exists
      const { data: existingUser } = await supabase
        .from("users")
        .select("id")
        .eq("email", req.email)
        .single();

      if (existingUser) {
        // User exists, update their info
        const { error: updateError } = await supabase
          .from("users")
          .update({
            name: fullName,
            password: req.password_hash,
            employee_id: req.id,
          })
          .eq("email", req.email);
        if (updateError) throw updateError;
      } else {
        // New user, insert
        const { error: insertError } = await supabase.from("users").insert([
          {
            name: fullName,
            email: req.email,
            password: req.password_hash,
            employee_id: req.id,
          },
        ]);
        if (insertError) throw insertError;
      }

      // 2. Update invitation
      await supabase
        .from("employee_invitations")
        .update({ status: "completed" })
        .eq("id", req.id);

      // 3. Send welcome mail
      await fetch("https://divu-server.vercel.app/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: req.email,
          subject: "Welcome Aboard – DIVU Smart Onboarding",
          html: divuMailTemplate({
            title: "Welcome Aboard to DIVU!",
            body: `
              <p style="font-size:1.15rem;font-weight:600;margin-bottom:18px;">
                Hello <span style="color:#10b981;">${fullName}</span>,
              </p>
              <p style="font-size:1.05rem;margin-bottom:18px;">
                Welcome to <strong>DIVU’s Smart Onboarding App</strong>!  
                Your account is now active.
              </p>
              <p style="font-size:0.95rem;color:#666;margin-top:24px;">
                Let's get started on your onboarding journey.
              </p>
            `,
            buttonText: "Open App",
            buttonLink: "https://divu-onboarders.vercel.app/",
          }),
        }),
      });

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setSelected(null);
      setMessage({
        type: "success",
        text: "Access granted and welcome mail sent.",
      });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Error approving request: " + err.message,
      });
    }
  };

  // ❌ Reject
  const handleReject = async (req) => {
    try {
      if (!rejectReason.trim()) {
        setRejectMode(true);
        return;
      }

      // 1. Update status
      await supabase
        .from("employee_invitations")
        .update({ status: "pending" })
        .eq("id", req.id);

      // 2. Send rejection mail
      await fetch("https://divu-server.vercel.app/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: req.email,
          subject: "Access Request Rejected – DIVU Smart Onboarding",
          html: divuMailTemplate({
            title: "Access Request Rejected",
            body: `
              <p style="font-size:1.15rem;font-weight:600;margin-bottom:18px;">
                Hello <span style="color:#10b981;">${req.first_name}</span>,
              </p>
              <p style="font-size:1.05rem;margin-bottom:18px;">
                Your request for access to <strong>DIVU’s Smart Onboarding App</strong> has been rejected.
              </p>
              <p style="font-size:1.05rem;margin-bottom:18px;">
                <strong>Reason:</strong> ${rejectReason}
              </p>
            `,
            // ❌ no button for rejection
          }),
        }),
      });

      setRequests((prev) => prev.filter((r) => r.id !== req.id));
      setSelected(null);
      setRejectMode(false);
      setRejectReason("");
      setMessage({ type: "info", text: "Rejection sent to employee." });
    } catch (err) {
      setMessage({
        type: "error",
        text: "Error rejecting request: " + err.message,
      });
    }
  };

  return (
    <AppLayout>
      <div className=" lex-1 min-h-dvh p-6 space-y-6">
        <div
          className="
            rounded-lg shadow-sm border px-6 py-4 mb-6 transition
            bg-white border-gray-300 text-gray-900
            dark:bg-black/30 dark:border-black dark:text-white
          "
        >
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            Employee Requests
          </h1>

          <p className="text-gray-600 dark:text-gray-300">
            Review and approve access requests from new employees
          </p>
        </div>

        {message && (
          <div
            className={`mb-6 px-4 py-3 rounded-lg ${
              message.type === "success"
                ? "bg-green-50 text-green-800 border border-green-200"
                : message.type === "error"
                ? "bg-red-50 text-red-800 border border-red-200"
                : "bg-yellow-50 text-yellow-800 border border-yellow-200"
            }`}
          >
            {message.text}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading requests...</p>
            </div>
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
            <p className="text-gray-600">No pending requests.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {requests.map((req) => (
              <li
                key={req.id}
                className="p-4 bg-white border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:border-emerald-600 hover:shadow-md transition"
                onClick={() => setSelected(req)}
              >
                <span className="font-semibold text-gray-900">
                  {req.first_name} {req.last_name}
                </span>{" "}
                <span className="text-gray-600">
                  is requesting access to DIVU's Smart Onboarding App
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal */}
      {selected && (
        <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full relative">
            {/* Close Button */}
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-900 transition"
              onClick={() => {
                setSelected(null);
                setRejectMode(false);
                setRejectReason("");
              }}
            >
              <X size={20} />
            </button>

            <h2 className="text-xl font-bold text-gray-900 mb-4">Employee Details</h2>

            <div className="grid gap-2 text-sm text-gray-700">
              <p>
                <strong className="text-gray-900">Name:</strong> {selected.first_name}{" "}
                {selected.last_name}
              </p>
              <p>
                <strong className="text-gray-900">Email:</strong> {selected.email}
              </p>
              <p>
                <strong className="text-gray-900">Preferred Name:</strong>{" "}
                {selected.extra_data?.preferred_name || "—"}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 mt-6">
              <button
                className="w-full px-4 py-2 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                onClick={() => handleApprove(selected)}
              >
                Confirm & Grant Access
              </button>

              {!rejectMode ? (
                <button
                  className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-red-600 hover:text-white font-semibold transition"
                  onClick={() => setRejectMode(true)}
                >
                  Reject Access
                </button>
              ) : (
                <>
                  <textarea
                    placeholder="Enter rejection reason..."
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    rows="3"
                  />
                  <button
                    className="w-full px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                    onClick={() => handleReject(selected)}
                  >
                    Send Rejection
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
