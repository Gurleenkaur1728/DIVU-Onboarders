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
import Culture from "../app/pages/Culture.jsx";
import About from "../app/pages/About.jsx";
import ModuleDetail from "../app/pages/ModuleDetail.jsx";
import ModuleComplete from "../app/pages/ModuleComplete.jsx";
import Feedback from "../app/pages/Feedback.jsx";
import FeedbackForm from "../app/pages/FeedbackForm.jsx";
import Progress from "../app/pages/progress.jsx";
import Certificate from "../app/pages/certificate.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/signup", element: <SignUp /> },

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
]);
