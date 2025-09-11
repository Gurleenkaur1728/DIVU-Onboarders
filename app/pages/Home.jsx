import Sidebar from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";

export default function Home() {
  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }} // ✅ using your uploaded bg.png
    >
      {/* Sidebar */}
      <Sidebar active="home" />

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;name&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <Tab label="Welcome" to="/home" active />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" />
        </div>

        {/* Content Card */}
        <div className="bg-white/95 rounded-2xl shadow-2xl p-16 max-w-5xl mx-auto relative overflow-hidden">
          {/* Decorative logo watermark */}
          <img
            src="/divu-logo.png"
            alt="DIVU Logo"
            className="absolute opacity-10 right-10 bottom-10 w-48"
          />

          <h1 className="text-4xl font-extrabold text-emerald-900 mb-6 text-center">
            Welcome to DIVU
          </h1>
          <div className="w-28 h-1 bg-emerald-500 mx-auto mb-8 rounded-full"></div>

          <p className="text-xl text-gray-700 leading-relaxed mb-6 text-center">
            We are excited to have you join our team of curious, driven, and
            forward-thinking professionals! At DIVU, we believe in precision with
            purpose, ownership in every role, and innovation that lasts.
          </p>
          <p className="text-xl text-gray-700 leading-relaxed mb-6 text-center">
            Your journey here is more than a job; it is an opportunity to grow,
            contribute, and shape meaningful solutions for clients across Canada,
            Austria, and beyond. This onboarding experience is designed to guide
            you smoothly into our culture, tools, and ways of working.
          </p>
          <p className="text-2xl text-emerald-700 font-semibold italic text-center">
            We look forward to seeing the impact you will create with us!
          </p>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition shadow
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
            : "bg-gray-200 text-gray-800 hover:bg-gray-300"
        }`}
    >
      {label}
    </Link>
  );
}
