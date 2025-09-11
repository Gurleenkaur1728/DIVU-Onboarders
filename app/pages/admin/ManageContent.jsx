import { useState } from "react";
import Sidebar, { ROLES } from "../../components/Sidebar.jsx";
import { Menu, AppWindow } from "lucide-react";

export default function ManageContent() {
  const [activeTab, setActiveTab] = useState("welcome");

  return (
    <div className="flex min-h-dvh bg-gradient-to-br from-emerald-950 via-emerald-900 to-emerald-950">
      {/* Sidebar */}
      <Sidebar active="manage-content" role={ROLES.ADMIN} />

      {/* Main */}
      <div className="flex-1 flex flex-col p-6">
        {/* Ribbon */}
        <div className="flex items-center justify-between bg-emerald-100/90 rounded-md px-4 py-2 mb-3 shadow">
          <div className="flex items-center gap-2">
            <Menu className="w-5 h-5 text-emerald-900" />
            <span className="text-emerald-950 font-semibold">
              Welcome &lt;Admin&gt; to DIVU!
            </span>
          </div>
          <AppWindow className="w-5 h-5 text-emerald-900" />
        </div>

        {/* Title */}
        <div className="bg-emerald-950/80 text-white font-bold rounded-md px-4 py-2 shadow">
          MANAGE CONTENT
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          <Tab label="Welcome" active={activeTab === "welcome"} onClick={() => setActiveTab("welcome")} />
          <Tab label="Culture" active={activeTab === "culture"} onClick={() => setActiveTab("culture")} />
          <Tab label="About" active={activeTab === "about"} onClick={() => setActiveTab("about")} />
        </div>

        {/* Body */}
        <div className="mt-6">
          {activeTab === "welcome" && <WelcomeEditor />}
          {activeTab === "culture" && <CultureEditor />}
          {activeTab === "about" && <AboutEditor />}
        </div>
      </div>
    </div>
  );
}

/* -------- TABS -------- */
function Tab({ label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-300
        ${active
          ? "bg-gradient-to-r from-emerald-400 to-green-500 text-emerald-950 shadow-md scale-105"
          : "bg-emerald-800/70 text-emerald-100 hover:bg-emerald-700"}
      `}
    >
      {label}
    </button>
  );
}

/* -------- WELCOME TAB -------- */
function WelcomeEditor() {
  const [title, setTitle] = useState("Welcome to DIVU");
  const [subtitle, setSubtitle] = useState("Your onboarding journey starts here.");
  const [backgroundImage, setBackgroundImage] = useState("/bg.png");

  return (
    <div className="bg-emerald-50/90 rounded-lg p-6 shadow space-y-4">
      <h2 className="text-lg font-bold text-emerald-900 mb-2">Edit Welcome Section</h2>

      <label className="block text-sm font-medium text-emerald-800">Title</label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">Subtitle</label>
      <input
        type="text"
        value={subtitle}
        onChange={(e) => setSubtitle(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">Background Image</label>
      <input
        type="text"
        value={backgroundImage}
        onChange={(e) => setBackgroundImage(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700">
        Save Changes
      </button>
    </div>
  );
}

/* -------- CULTURE TAB -------- */
function CultureEditor() {
  const [heading, setHeading] = useState("Our Culture");
  const [description, setDescription] = useState("Lorem ipsum dolor sit amet...");
  const [videoUrl, setVideoUrl] = useState("/culture.mp4");

  return (
    <div className="bg-emerald-50/90 rounded-lg p-6 shadow space-y-4">
      <h2 className="text-lg font-bold text-emerald-900 mb-2">Edit Culture Section</h2>

      <label className="block text-sm font-medium text-emerald-800">Heading</label>
      <input
        type="text"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">Description</label>
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        rows="4"
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">Video URL</label>
      <input
        type="text"
        value={videoUrl}
        onChange={(e) => setVideoUrl(e.target.value)}
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700">
        Save Changes
      </button>
    </div>
  );
}

/* -------- ABOUT TAB -------- */
function AboutEditor() {
  const [mission, setMission] = useState("Deliver outstanding employee experiences...");
  const [values, setValues] = useState("Put people first, Communicate clearly, Own the outcome...");
  const [howWeWork, setHowWeWork] = useState("We bias toward action, document decisions, and keep feedback loops short...");

  return (
    <div className="bg-emerald-50/90 rounded-lg p-6 shadow space-y-4">
      <h2 className="text-lg font-bold text-emerald-900 mb-2">Edit About Section</h2>

      <label className="block text-sm font-medium text-emerald-800">Mission</label>
      <textarea
        value={mission}
        onChange={(e) => setMission(e.target.value)}
        rows="2"
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">Values</label>
      <textarea
        value={values}
        onChange={(e) => setValues(e.target.value)}
        rows="2"
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <label className="block text-sm font-medium text-emerald-800">How We Work</label>
      <textarea
        value={howWeWork}
        onChange={(e) => setHowWeWork(e.target.value)}
        rows="3"
        className="w-full rounded-md border border-emerald-300 px-3 py-2"
      />

      <button className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-md shadow hover:bg-emerald-700">
        Save Changes
      </button>
    </div>
  );
}
