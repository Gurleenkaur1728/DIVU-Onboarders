// components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  // During initial load, show loading state
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>;
  }

  // If no user or not fully authenticated, redirect to login
  if (!user?.isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  // Check role-based access
  if (roles && !roles.includes(user.role_id)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
