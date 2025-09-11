import { createBrowserRouter } from "react-router-dom";

// Auth pages
import Login from "../app/(auth)/Login.jsx";
import ForgotPassword from "../app/(auth)/ForgotPassword.jsx";
import SignUp from "../app/(auth)/SignUp.jsx";

// Main pages
import Home from "../app/pages/Home.jsx";
import Checklist from "../app/pages/Checklist.jsx";
import Account from "../app/pages/Account.jsx";
import Modules from "../app/pages/Modules.jsx";
import ModuleFeedback from "../app/pages/Feedback.jsx";
import Culture from "../app/pages/Culture.jsx";
import About from "../app/pages/About.jsx";

// Admin pages
import AdminDashboard from "../app/pages/admin/AdminDashboard.jsx";
import ManageContent from "../app/pages/admin/ManageContent.jsx";
import ManageChecklist from "../app/pages/admin/ManageChecklist.jsx";
import ManageModules from "../app/pages/admin/ManageModules.jsx";
import ViewFeedback from "../app/pages/admin/ManageFeedback.jsx";
import ViewProgress from "../app/pages/admin/ManageProgress.jsx";
import ManageQuestions from "../app/pages/admin/ManageQuestions.jsx";

export const router = createBrowserRouter([
  // Auth
  { path: "/", element: <Login /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/signup", element: <SignUp /> },

  // Main user pages
  { path: "/home", element: <Home /> },
  { path: "/checklist", element: <Checklist /> },
  { path: "/account", element: <Account /> },
  { path: "/modules", element: <Modules /> },
  { path: "/feedback", element: <ModuleFeedback /> },
  { path: "/culture", element: <Culture /> },
  { path: "/about", element: <About /> },

  // Admin pages
  { path: "/admin/dashboard", element: <AdminDashboard /> },
  { path: "/admin/content", element: <ManageContent /> },
  { path: "/admin/checklist", element: <ManageChecklist /> },
  { path: "/admin/modules", element: <ManageModules /> },
  { path: "/admin/feedback", element: <ViewFeedback /> },
  { path: "/admin/progress", element: <ViewProgress /> },
  { path: "/admin/manage-questions", element: <ManageQuestions /> },
]);
