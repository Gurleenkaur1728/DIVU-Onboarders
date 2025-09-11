import { useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";

export default function Culture() {
  const [menuOpen, setMenuOpen] = useState(false);
  const nav = useNavigate();

  const isSmall = window.innerWidth < 820;

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950 relative overflow-hidden">
      {/* glowing emerald background shapes */}
      <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-green-400/20 rounded-full blur-3xl animate-ping" />

      {/* Sidebar (inline for desktop) */}
      {!isSmall && <Sidebar active="home" />}

      {/* Main content */}
      <div className="flex-1 flex flex-col p-4 md:p-6 z-10">
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
        <div className="flex flex-wrap gap-3 mt-4">
          <Tab label="Welcome" onClick={() => nav("/home")} />
          <Tab label="Culture" active onClick={() => nav("/culture")} />
          <Tab label="About" onClick={() => nav("/about")} />
        </div>

        {/* Body */}
        <div className="flex flex-1 gap-4 mt-4 flex-col md:flex-row">
          {/* Hero section */}
          <div className="flex-1 flex items-center justify-center min-h-[200px] md:min-h-[360px] rounded-lg bg-gradient-to-br from-emerald-600 to-green-700 text-white text-4xl font-extrabold tracking-wider shadow-lg animate-fade-in">
            IMAGE
          </div>

          {/* Copy section */}
          <div className="flex-1 rounded-lg bg-emerald-50/95 p-6 shadow-lg backdrop-blur">
            <h2 className="text-lg font-bold text-emerald-950 mb-2">Our Culture</h2>
            <p className="text-emerald-900">
              Placeholder content — will add cards/videos later.
            </p>
          </div>
        </div>

        {/* Bottom line accent */}
        <div className="h-2 mt-4 rounded bg-emerald-200/70" />
      </div>

      {/* Sidebar overlay for mobile */}
      {isSmall && menuOpen && (
        <>
          <div
            onClick={() => setMenuOpen(false)}
            className="absolute inset-0 bg-black/50"
          />
          <Sidebar
            active="home"
            variant="overlay"
            width={Math.min(280, window.innerWidth * 0.85)}
            onClose={() => setMenuOpen(false)}
          />
        </>
      )}
    </div>
  );
}

function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-5 py-2 rounded-lg font-medium text-sm shadow-md
        transition-all duration-300
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 font-extrabold scale-105"
          : "bg-emerald-800/80 text-emerald-100 hover:bg-emerald-700/90 hover:scale-105"
        }
      `}
    >
      {label}
    </button>
  );
}

function Paragraph() {
  return (
    <>
      <p className="text-emerald-950/90 leading-relaxed text-sm">
        Lorem ipsum dolor sit amet consectetur. Donec nulla at vel lobortis sed fames elit. In pellentesque laicina
        enim quisque. Duis velit gravida mauris senectus. Scelerisque dignissim facilisis sem nunc lacus augue sem
        sit eros. Faucibus molestie sed sed nam magna enim ac purus.
      </p>
      <div className="h-3" />
    </>
  );
}