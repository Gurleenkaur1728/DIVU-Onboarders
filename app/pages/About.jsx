import Sidebar, {ROLES}  from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";

export default function About() {
  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      {/* Sidebar */}
      <Sidebar role={ROLES.USER} active="about" />

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
          <Tab label="Culture" to="/culture" />
          <Tab label="About" to="/about" active />
        </div>

        {/* Content Card */}
        <div className="bg-white/95 rounded-xl shadow-lg p-10 max-w-5xl mx-auto">
          {/* Title */}
          <h1 className="text-3xl font-extrabold text-emerald-900 mb-6">
            About DIVU
          </h1>

          {/* Text + Image in Grid */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Image left */}
            <div className="flex items-start justify-center">
              <img
                src="/aboutdivu.jpg"
                alt="About DIVU"
                className="rounded-lg shadow-lg w-full object-cover"
              />
            </div>

            {/* Text right */}
            <div>
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                DIVU is a data strategy and analytics company helping organizations
                transform complexity into clarity. We design and deliver solutions
                that empower businesses to make informed, confident decisions.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed mb-4">
                From data governance and engineering to advanced analytics, our
                mission is to unlock value through insights that last.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed">
                With teams operating from Calgary, Vienna/Graz, and partner
                locations across North America and Europe, we are international by
                design and united by purpose.
              </p>
              <p className="text-lg text-gray-800 leading-relaxed mt-4 font-medium">
                At DIVU, we build sustainable, data-driven futures for our clients
                and our people.
              </p>
            </div>
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
      className={`px-5 py-2 rounded-t-lg text-sm font-semibold transition
        ${
          active
            ? "bg-emerald-600 text-white border-b-4 border-emerald-800"
            : "bg-emerald-200 text-emerald-900 hover:bg-emerald-300"
        }`}
    >
      {label}
    </Link>
  );
}
