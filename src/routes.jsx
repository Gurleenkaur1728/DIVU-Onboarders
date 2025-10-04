import { createBrowserRouter } from "react-router-dom";

// Auth pages
import Login from "./app/(auth)/Login.jsx";
import ForgotPassword from "./app/(auth)/ForgotPassword.jsx";

// Main pages
import Home from "./app/pages/Home.jsx";
import Checklist from "./app/pages/Checklist.jsx";
import Account from "./app/pages/Account.jsx";
import Modules from "./app/pages/Modules.jsx";
import Culture from "./app/pages/Culture.jsx";
import About from "./app/pages/About.jsx";
import ModuleDetail from "./app/pages/ModuleDetail.jsx";
import ModuleComplete from "./app/pages/ModuleComplete.jsx";
import Feedback from "./app/pages/Feedback.jsx";
import FeedbackForm from "./app/pages/FeedbackForm.jsx";
import Progress from "./app/pages/progress.jsx";
import Certificate from "./app/pages/certificate.jsx";
import Questions from "./app/pages/Questions.jsx";

// Admin pages
import AdminDashboard from "./app/pages/admin/AdminDashboard.jsx";
import ManageContent from "./app/pages/admin/ManageContent.jsx";
import ManageChecklist from "./app/pages/admin/ManageChecklist.jsx";
import ManageModules from "./app/pages/admin/ManageModules.jsx";
import ViewFeedback from "./app/pages/admin/ManageFeedback.jsx";
import ViewProgress from "./app/pages/admin/ManageProgress.jsx";
import ManageQuestions from "./app/pages/admin/ManageQuestions.jsx";

// Super Admin pages
import ManageEmployees from "./app/pages/admin/super/ManageEmployees.jsx";
import AddEmployee from "./app/pages/admin/super/AddEmployee.jsx";
import ManageAdmins from "./app/pages/admin/super/ManageAdmins.jsx";
import AdminRequests from "./app/pages/admin/super/AdminRequests.jsx";

export const router = createBrowserRouter([
  // Auth
  { path: "/", element: <Login /> },
  { path: "/forgot", element: <ForgotPassword /> },

  // Main user pages
  { path: "/home", element: <Home /> },
  { path: "/checklist", element: <Checklist /> },
  { path: "/account", element: <Account /> },
  { path: "/modules", element: <Modules /> },
  { path: "/modules/:id", element: <ModuleDetail /> },
  { path: "/modules/:id/complete", element: <ModuleComplete /> },

  { path: "/feedback", element: <Feedback /> },
  { path: "/feedback/:id", element: <FeedbackForm /> },

  { path: "/progress", element: <Progress /> },
  { path: "/certificate/:id", element: <Certificate /> },

  { path: "/culture", element: <Culture /> },
  { path: "/about", element: <About /> },
  { path: "/questions", element: <Questions /> },

  // Admin pages
  { path: "/admin/dashboard", element: <AdminDashboard /> },
  { path: "/admin/content", element: <ManageContent /> },
  { path: "/admin/checklist", element: <ManageChecklist /> },
  { path: "/admin/modules", element: <ManageModules /> },
  { path: "/admin/feedback", element: <ViewFeedback /> },
  { path: "/admin/progress", element: <ViewProgress /> },
  { path: "/admin/manage-questions", element: <ManageQuestions /> },

  // Super Admin pages
  { path: "/admin/super/manage-employees", element: <ManageEmployees /> },
  { path: "/admin/super/add-employee", element: <AddEmployee /> },
  { path: "/admin/super/manage-admins", element: <ManageAdmins /> },
  { path: "/admin/super/admin-requests", element: <AdminRequests /> },
]);