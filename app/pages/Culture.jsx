import { useState } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Play, Pause, Menu, AppWindow } from "lucide-react";

export default function Culture() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [playing, setPlaying] = useState(false);

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 relative">
      {/* Sidebar (desktop) */}
      <Sidebar active="home" />

      {/* Main content */}
      <div className="flex-1 flex flex-col p-6 z-10">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;name&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title */}
        <div className="bg-emerald-950/80 rounded-md px-4 py-2 text-white font-bold tracking-wide shadow">
          HOME PAGE
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          <Tab label="Welcome" to="/home" />
          <Tab label="Culture" active />
          <Tab label="About" to="/about" />
        </div>

        {/* Body */}
        <div className="mt-4 space-y-6">
          {/* Row 1 */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1 bg-emerald-50/90 rounded-lg p-4 shadow">
              <p className="text-emerald-950/90 leading-relaxed text-sm">
                Lorem ipsum dolor sit amet consectetur. Donec nulla at vel
                lobortis sed fames elit. In pellentesque lacinia enim quisque.
                Duis velit gravida mauris senectus.
              </p>
              <p className="text-emerald-950/90 leading-relaxed text-sm mt-2">
                Etiam quis ante laoreet congue mi turpis. Elit risus sapien
                mauris arcu libero volutpat.
              </p>
              <p className="mt-3 font-bold text-emerald-900">- DIVU</p>
            </div>
            <div className="w-full md:w-80 h-48 rounded-lg overflow-hidden shadow">
              <img
                src="/team-meeting.jpg"
                alt="Team meeting"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          {/* Row 2: Video */}
          <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow">
            <video
              src="/culture.mp4"
              className="w-full h-full object-cover"
              loop
              muted
              controls
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
            />
            <button
              onClick={() => setPlaying(!playing)}
              className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-1.5 bg-black/60 text-white text-xs font-semibold rounded-full shadow"
            >
              {playing ? <Pause size={14} /> : <Play size={14} />}
              {playing ? "Pause" : "Play"}
            </button>
          </div>

          {/* More text blocks */}
          <div className="bg-emerald-50/90 rounded-lg p-4 shadow">
            <p className="text-emerald-950/90 text-sm leading-relaxed">
              Lorem ipsum dolor sit amet consectetur. Accumsan ipsum vitae amet
              cursus ornare aliquet. Sit faucibus viverra sagittis mattis.
            </p>
          </div>
          <div className="bg-emerald-50/90 rounded-lg p-4 shadow">
            <p className="text-emerald-950/90 text-sm leading-relaxed">
              Volutpat donec orci tortor vitae blandit diam porta urna at.
              Imperdiet cursus urna donec nec in venenatis.
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
        ${active
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
