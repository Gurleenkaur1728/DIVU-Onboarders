import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function PublicRoute({ children }) {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
      <p>Loading...</p>
    </div>;
  }

  // Only redirect if user is fully authenticated
  if (user?.isAuthenticated) {
    const path = user.role_id === 1 || user.role_id === 2 ? "/admin/dashboard" : "/home";
    return <Navigate to={path} replace />;
  }

  return children;
}