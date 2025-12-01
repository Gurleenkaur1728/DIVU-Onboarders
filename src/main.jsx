import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "../src/routes.jsx";
import { AuthProvider } from "../app/context/AuthContext.jsx";
import "./index.css";
import App from "./App.jsx";
import { ToastProvider } from "../app/context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ToastProvider>
    <AuthProvider>
      <RouterProvider router={router} />
    </AuthProvider>
    </ToastProvider>
  </React.StrictMode>
);
