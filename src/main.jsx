import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "../src/routes.jsx";
import { AuthProvider } from "../app/context/AuthContext.jsx";
import "./index.css";
import GoogleTranslateWidget from "../src/GoogleTranslateWidget.jsx";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <RouterProvider router={router} />
      <GoogleTranslateWidget />
    </AuthProvider>
  </React.StrictMode>
);
