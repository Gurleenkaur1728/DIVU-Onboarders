import { createBrowserRouter } from "react-router-dom";

// Auth pages
import Login from "../app/(auth)/Login.jsx";
import ForgotPassword from "../app/(auth)/ForgotPassword.jsx";
import SignUp from "../app/(auth)/SignUp.jsx";

// Main pages
import Home from "../app/pages/Home.jsx";
import Checklist from "../app/pages/Checklist.jsx";
import Account from "../app/pages/Account.jsx";

export const router = createBrowserRouter([
  { path: "/", element: <Login /> },
  { path: "/forgot", element: <ForgotPassword /> },
  { path: "/signup", element: <SignUp /> },

  { path: "/home", element: <Home /> },
  { path: "/checklist", element: <Checklist /> },
  { path: "/account", element: <Account /> },
]);
