import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../app/components/ProtectedRoutes.jsx";
 
// Auth pages
import Login from "../app/(auth)/Login.jsx";
import ForgotPassword from "../app/(auth)/ForgotPassword.jsx";
 
// Main user pages
import Home from "../app/pages/Home.jsx";
import Checklist from "../app/pages/Checklist.jsx";
import Account from "../app/pages/Account.jsx";
import Modules from "../app/pages/Modules.jsx";
import Culture from "../app/pages/Culture.jsx";
import About from "../app/pages/About.jsx";
import ModuleDetail from "../app/pages/ModuleDetail.jsx";
import EnhancedModuleDetail from "../app/components/EnhancedModuleDetail.jsx";
import ModuleComplete from "../app/pages/ModuleComplete.jsx";
import Feedback from "../app/pages/Feedback.jsx";
import FeedbackForm from "../app/pages/FeedbackForm.jsx";
import Progress from "../app/pages/progress.jsx";
import Certificate from "../app/pages/certificate.jsx";
import Questions from "../app/pages/Questions.jsx";
import Events from "../app/pages/Events.jsx";
 
// Admin pages
import AdminDashboard from "../app/pages/admin/AdminDashboard.jsx";
import ManageContent from "../app/pages/admin/ManageContent.jsx";
import ManageChecklist from "../app/pages/admin/ManageChecklist.jsx";
import ManageModules from "../app/pages/admin/ManageModules.jsx";
import ViewFeedback from "../app/pages/admin/ManageFeedback.jsx";
import ViewProgress from "../app/pages/admin/ManageProgress.jsx";
import ManageQuestions from "../app/pages/admin/ManageQuestions.jsx";
import AssignTemplates from "../app/pages/admin/AssignTemplates.jsx";
import ManageEvents from "../app/pages/admin/ManageEvents.jsx";
import ManageCertificates from "../app/pages/admin/ManageCertificates.jsx";
 
// Super Admin pages
import ManageEmployees from "../app/pages/admin/super/ManageEmployees.jsx";
import AddEmployee from "../app/pages/admin/super/AddEmployee.jsx";
import ManageAdmins from "../app/pages/admin/super/ManageAdmins.jsx";
import AdminRequests from "../app/pages/admin/super/AdminRequests.jsx";
import AccessRequests from "../app/pages/admin/super/EmployeeRequests.jsx";
import Records from "../app/pages/admin/super/Records.jsx";
import ManageEmployment from "../app/pages/admin/ManageEmployment.jsx";
 
import PublicRoute from "../app/components/PublicRoute.jsx";

export const router = createBrowserRouter([
  // ✅ Auth pages (wrapped in PublicRoute)
  { path: "/", element: <PublicRoute><Login /></PublicRoute> },
  { path: "/forgot", element: <PublicRoute><ForgotPassword /></PublicRoute> },
 
  // ✅ Main user pages
  { path: "/home", element: <ProtectedRoute><Home /></ProtectedRoute> },
  { path: "/checklist", element: <ProtectedRoute><Checklist /></ProtectedRoute> },
  { path: "/events", element: <ProtectedRoute><Events /></ProtectedRoute> },
  { path: "/account", element: <ProtectedRoute><Account /></ProtectedRoute> },
  { path: "/modules", element: <ProtectedRoute><Modules /></ProtectedRoute> },
  { path: "/modules/:id", element: <ProtectedRoute><EnhancedModuleDetail /></ProtectedRoute> },
  { path: "/modules/:id/complete", element: <ProtectedRoute><ModuleComplete /></ProtectedRoute> },
 
  // ✅ Feedback routes
  { path: "/feedback", element: <ProtectedRoute><Feedback /></ProtectedRoute> }, // Feedback dashboard
  { path: "/feedback/:id", element: <ProtectedRoute><FeedbackForm /></ProtectedRoute> }, // Create/View feedback form
 
  // ✅ Other user pages
  { path: "/progress", element: <ProtectedRoute><Progress /></ProtectedRoute> },
  { path: "/certificate/:id", element: <ProtectedRoute><Certificate /></ProtectedRoute> },
  { path: "/culture", element: <ProtectedRoute><Culture /></ProtectedRoute> },
  { path: "/about", element: <ProtectedRoute><About /></ProtectedRoute> },
  { path: "/questions", element: <ProtectedRoute><Questions /></ProtectedRoute> },
 
  // ✅ Admin pages
  { path: "/admin/dashboard", element: <ProtectedRoute roles={[1, 2]}><AdminDashboard /></ProtectedRoute> },
  { path: "/admin/content", element: <ProtectedRoute roles={[1, 2]}><ManageContent /></ProtectedRoute> },
  { path: "/admin/checklist", element: <ProtectedRoute roles={[1, 2]}><ManageChecklist /></ProtectedRoute> },
  { path: "/admin/manage-employment", element: <ProtectedRoute roles={[1, 2]}><ManageEmployment /></ProtectedRoute> },
  { path: "/admin/modules", element: <ProtectedRoute roles={[1, 2]}><ManageModules /></ProtectedRoute> },
  { path: "/admin/feedback", element: <ProtectedRoute roles={[1, 2]}><ViewFeedback /></ProtectedRoute> },
  { path: "/admin/progress", element: <ProtectedRoute roles={[1, 2]}><ViewProgress /></ProtectedRoute> },
  { path: "/admin/manage-questions", element: <ProtectedRoute roles={[1, 2]}><ManageQuestions /></ProtectedRoute> },
  { path: "/admin/assign-templates", element: <ProtectedRoute roles={[1, 2]}><AssignTemplates /></ProtectedRoute> },
  { path: "/admin/manage-events", element: <ProtectedRoute roles={[1, 2]}><ManageEvents /></ProtectedRoute> },
  { path: "/admin/certificates", element: <ProtectedRoute roles={[1, 2]}><ManageCertificates /></ProtectedRoute> },
 
  // ✅ Super Admin pages
  { path: "/admin/super/manage-employees", element: <ProtectedRoute roles={[2]}><ManageEmployees /></ProtectedRoute> },
  { path: "/admin/super/add-employee", element: <ProtectedRoute roles={[2]}><AddEmployee /></ProtectedRoute> },
  { path: "/admin/super/manage-admins", element: <ProtectedRoute roles={[2]}><ManageAdmins /></ProtectedRoute> },
  { path: "/admin/super/admin-requests", element: <ProtectedRoute roles={[2]}><AdminRequests /></ProtectedRoute> },
  { path: "/admin/super/access-requests", element: <ProtectedRoute roles={[2]}><AccessRequests /></ProtectedRoute> },
  { path: "/admin/super/records", element: <ProtectedRoute roles={[2]}><Records /></ProtectedRoute> },
]);
//routes.jsx