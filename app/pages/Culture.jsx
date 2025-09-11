import Sidebar, {ROLES}  from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";

export default function Culture() {
  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar active="culture" role={ROLES.USER} />

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
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" active />
          <Tab label="About" to="/about" />
        </div>

        {/* Content Card */}
        <div className="bg-white/95 rounded-xl shadow-lg p-10 max-w-5xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-6">
            DIVU Culture
          </h1>

          {/* Text + First Image in Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                Our culture is built on <span className="font-semibold">trust</span>,
                <span className="font-semibold"> inclusiveness</span>, and{" "}
                <span className="italic">shared responsibility</span>. We embrace
                diversity across borders and time zones, working as a remote-first
                company that thrives on collaboration and accountability.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                We believe that curiosity sparks better questions, and better
                questions lead to smarter solutions.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                At DIVU, everyone has the autonomy to take ownership, challenge
                ideas, and drive sustainable innovation.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed">
                Together we celebrate achievements, learn from setbacks, and
                continuously evolve as a team that values integrity and meaningful
                progress.
              </p>
            </div>
            <div className="flex items-start justify-center">
              <img
                src="/cultureglobe.jpg"
                alt="Culture globe"
                className="rounded-lg shadow-lg w-full object-cover"
              />
            </div>
          </div>

          {/* Second Image full width */}
          <div>
            <img
              src="/cultureWorkshop.jpg"
              alt="Workshop session"
              className="rounded-lg shadow-lg w-full object-cover"
            />
          </div>
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
            : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"
        }`}
    >
      {label}
    </Link>
  );
}
