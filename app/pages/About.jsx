import { useState } from "react";
import { Link } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import { Menu, AppWindow } from "lucide-react";

export default function About() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar (desktop) */}
      <Sidebar active="about" />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <div className="flex items-center gap-2">
            <Menu
              className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden"
              onClick={() => setMenuOpen(true)}
            />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;name&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title bar */}
        <div className="bg-emerald-950/80 text-white font-bold tracking-wide rounded-md px-4 py-2 shadow">
          HOME PAGE
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" to="/culture" />
          <Tab label="About" active />
        </div>

        {/* Body */}
        <div className="mt-4 space-y-6">
          {/* Row 1 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="w-full md:w-80 h-48 rounded-lg overflow-hidden shadow">
              <img
                src="/team-meeting.jpg"
                alt="Team meeting"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="flex-1 bg-emerald-50/90 rounded-lg p-4 shadow">
              <h2 className="text-lg font-extrabold text-emerald-900 mb-2">
                About DIVU
              </h2>
              <p className="text-emerald-950/90 text-sm leading-relaxed">
                DIVU is focused on building a thoughtful onboarding experience
                for every new team member. We value openness, craftsmanship, and
                steady iteration. This page gives you a quick overview of who we
                are and how we work.
              </p>
              <p className="text-emerald-950/90 text-sm leading-relaxed mt-3">
                You’ll find our mission, values, and the basics of how we
                collaborate below. If you have questions at any point, reach
                out—people are happy to help.
              </p>
            </div>
          </div>

          {/* Row 2 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-emerald-50/90 rounded-lg p-4 shadow">
              <h3 className="text-md font-bold text-emerald-900 mb-2">
                Mission
              </h3>
              <p className="text-emerald-950/90 text-sm leading-relaxed">
                Deliver outstanding employee experiences that enable people to
                do their best work from day one.
              </p>
            </div>
            <div className="flex-1 bg-emerald-50/90 rounded-lg p-4 shadow">
              <h3 className="text-md font-bold text-emerald-900 mb-2">
                Values
              </h3>
              <ul className="list-disc list-inside text-emerald-950/90 text-sm space-y-1">
                <li>Put people first</li>
                <li>Communicate clearly</li>
                <li>Own the outcome</li>
                <li>Improve a little every day</li>
              </ul>
            </div>
          </div>

          {/* Row 3 */}
          <div className="bg-emerald-50/90 rounded-lg p-4 shadow">
            <h3 className="text-md font-bold text-emerald-900 mb-2">
              How we work
            </h3>
            <p className="text-emerald-950/90 text-sm leading-relaxed">
              We bias toward action, document decisions, and keep feedback loops
              short. You’ll see checklists, lightweight rituals, and an emphasis
              on pairing to learn faster. This space will evolve as we grow.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tab({ label, to, active }) {
  return to ? (
    <Link
      to={to}
      className={`px-4 py-2 rounded-lg text-sm font-medium transition
        ${
          active
            ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
            : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"
        }`}
    >
      {label}
    </Link>
  ) : (
    <span className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 font-bold text-sm">
      {label}
    </span>
  );
}
