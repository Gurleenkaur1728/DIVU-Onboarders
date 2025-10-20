import React, { useState } from "react";
import { supabase } from "../../src/lib/supabaseClient.js";
import bcrypt from "bcryptjs";
import AuthCard from "../components/AuthCard.jsx";
import Logo from "../components/Logo.jsx";

export default function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [userName, setUserName] = useState("");

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const lowerEmail = email.trim().toLowerCase();

    // Check in USERS table
    const { data: user, error: fetchError } = await supabase
      .from("users")
      .select("name, email")
      .eq("email", lowerEmail)
      .maybeSingle();

    if (fetchError || !user) {
      setError("Email not found in our system.");
      return;
    }

    const nameToUse = user.name
      ? user.name.trim().split(" ")[0]
      : user.email.split("@")[0];
    setUserName(nameToUse);

    // Generate code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    setGeneratedCode(code);

    // Send Email
    try {
      const res = await fetch("https://divu-server.vercel.app/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: lowerEmail,
          subject: "Reset your Divu Password Securely",
          text: `Hello ${nameToUse}, your password reset code is ${code}.`,
          html: `
            <!DOCTYPE html>
            <html>
              <body style="margin:0;padding:0;background:#0c1214;font-family:Arial,sans-serif;">
                <div style="max-width:600px;margin:auto;border:1px solid #1f2937;border-radius:18px;overflow:hidden;box-shadow:0 6px 24px rgba(16,185,129,0.15);">
                  
                  <div style="background:linear-gradient(90deg,#065f46 60%,#34d399 100%);padding:24px;text-align:center;">
                    <img src="https://zhnulozkwqzycapxvsxk.supabase.co/storage/v1/object/public/assets/divu-logo.png"
                         alt="Divu Logo" style="height:80px;margin-bottom:12px;" />
                    <h1 style="color:#fff;margin:0;font-size:28px;font-weight:800;letter-spacing:1px;">
                      Password Reset Request
                    </h1>
                  </div>

                  <div style="background:#000;padding:32px 28px;color:#fff;">
                    <p style="font-size:1.15rem;font-weight:600;margin-bottom:18px;">
                      Hello <span style="color:#34d399;font-weight:700;">${nameToUse}</span>,
                    </p>

                    <p style="font-size:1.05rem;margin-bottom:18px;">
                      We received a request to reset your <strong>Divu account password</strong>.
                    </p>

                    <p style="font-size:1.05rem;margin-bottom:18px;color:#d8b4fe;">
                      Please use the verification code below to continue the reset process:
                    </p>

                    <div style="text-align:center;margin:32px 0;">
                      <h1 style="font-size:2.5rem;color:#34d399;letter-spacing:4px;">
                        ${code}
                      </h1>
                    </div>

                    <p style="font-size:1rem;margin-top:20px;color:#e5e7eb;">
                      This code will expire soon. If you didn’t request a password reset, you can safely ignore this email.
                    </p>
                  </div>

                  <div style="background:#111827;padding:18px;text-align:center;font-size:0.95rem;color:#34d399;border-top:1px solid #1f2937;">
                    <span style="font-weight:600;">© ${new Date().getFullYear()} Divu Inc.</span> All rights reserved.
                  </div>
                </div>
              </body>
            </html>
          `,
        }),
      });

      if (res.ok) {
        setSuccess("Verification code sent to your email!");
        setStep(2);
      } else {
        setError("Error sending email. Try again later.");
      }
    } catch (err) {
      console.error("Email error:", err);
      setError("Unable to connect to email server.");
    }
  };

  const handleCodeVerification = (e) => {
    e.preventDefault();
    if (verificationCode.trim() === generatedCode) {
      setStep(3);
      setError("");
    } else {
      setError("Invalid verification code.");
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match!");
      return;
    }

    try {
      const hashed = await bcrypt.hash(newPassword, 10);

      const { error: updateError } = await supabase
        .from("users")
        .update({ password: hashed })
        .eq("email", email.trim().toLowerCase());

      if (updateError) {
        setError("Error updating password. Try again.");
      } else {
        setSuccess("Password updated successfully! You can now log in.");
        setStep(1);
        setEmail("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch (err) {
      console.error(err);
      setError("Something went wrong during password reset.");
    }
  };

  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[#0c1214] bg-cover bg-center p-6"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <AuthCard>
        <div className="flex justify-center mb-4">
          <Logo />
        </div>

        {step === 1 && (
          <form onSubmit={handleEmailSubmit}>
            <h2 className="mb-4 text-center text-white font-semibold text-lg">
              Enter your registered Email
            </h2>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none"
              required
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700 transition"
            >
              Send Verification Code
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleCodeVerification}>
            <h2 className="mb-4 text-center text-white font-semibold text-lg">
              Enter the 6-digit Code sent to your Email
            </h2>
            <input
              type="text"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              placeholder="6-digit code"
              className="w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none"
              required
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-green-600 py-2 text-white font-semibold hover:bg-green-700 transition"
            >
              Verify Code
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handlePasswordReset}>
            <h2 className="mb-4 text-center text-white font-semibold text-lg">
              Reset Your Password
            </h2>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              className="w-full mb-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none"
              required
            />
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
              className="w-full mb-3 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-white placeholder-white/60 outline-none"
              required
            />
            <button
              type="submit"
              className="mt-4 w-full rounded-lg bg-blue-600 py-2 text-white font-semibold hover:bg-blue-700 transition"
            >
              Save New Password
            </button>
          </form>
        )}

        {error && <p className="text-red-400 mt-3 text-center">{error}</p>}
        {success && <p className="text-green-400 mt-3 text-center">{success}</p>}
      </AuthCard>
    </div>
  );
}
//forgetpassword