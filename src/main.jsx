import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes.jsx";  // your updated router
import { AuthProvider } from "./app/context/AuthContext.jsx"; // Ensure correct path

import "./index.css"

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider> {/* Ensure AuthProvider wraps RouterProvider */}
      <RouterProvider router={router} />
    </AuthProvider>
  </React.StrictMode>
);