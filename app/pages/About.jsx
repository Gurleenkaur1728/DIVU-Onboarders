import { useEffect, useState } from "react";
import Sidebar, { ROLES } from "../components/Sidebar.jsx";
import { Link } from "react-router-dom";
import { Menu, AppWindow } from "lucide-react";
import { fetchContent } from "../utils/fetchContent.js";

export default function About() {
  const [content, setContent] = useState(null);

  useEffect(() => {
    fetchContent("about").then(setContent);
  }, []);

  return (
    <div
      className="flex min-h-dvh bg-cover bg-center relative"
      style={{ backgroundImage: "url('/bg.png')" }}
    >
      <Sidebar role={ROLES.USER} active="about" />

      <div className="flex-1 flex flex-col p-6 z-10">
        <Header />
        <Tabs active="about" />

        <div className="bg-white/95 rounded-2xl shadow-2xl p-10 max-w-6xl mx-auto grid md:grid-cols-2 gap-8 items-center">
          {/* Image Left */}
          <div className="flex justify-center order-2 md:order-1">
            <img
              src={content?.media_url || "/aboutdivu.jpg"}
              alt="About DIVU"
              className="rounded-xl shadow-lg w-full object-cover max-h-[400px]"
            />
          </div>

          {/* Text Right */}
          <div className="order-1 md:order-2">
            <h1 className="text-4xl font-extrabold text-emerald-900 mb-6">
              {content?.title || "About DIVU"}
            </h1>
            <p className="text-lg text-gray-700 leading-relaxed whitespace-pre-line">
              {content?.description ||
                "DIVU delivers outstanding employee experiences through innovation, trust, and clear communication."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Header() {
  return (
    <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-4 shadow">
      <div className="flex items-center gap-2">
        <Menu className="w-5 h-5 text-emerald-900 cursor-pointer md:hidden" />
        <span className="text-emerald-950 font-semibold">
          Welcome &lt;name&gt; to DIVU!
        </span>
      </div>
      <AppWindow className="w-5 h-5 text-emerald-900" />
    </div>
  );
}

function Tabs({ active }) {
  return (
    <div className="flex gap-2 mb-6">
      <Tab label="Welcome" to="/home" active={active === "home"} />
      <Tab label="Culture" to="/culture" active={active === "culture"} />
      <Tab label="About" to="/about" active={active === "about"} />
    </div>
  );
}

function Tab({ label, to, active }) {
  return (
    <Link
      to={to}
      className={`px-5 py-2 rounded-lg text-sm font-semibold transition shadow ${
        active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950"
          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
      }`}
    >
      {label}
    </Link>
  );
}
