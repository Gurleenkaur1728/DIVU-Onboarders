// components/ProtectedRoute.jsx
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) return <p>Loading...</p>;
  if (!user) return <Navigate to="/" replace />;

  // if roles prop is provided, check it
  if (roles && !roles.includes(user.role_id)) {
    return <Navigate to="/home" replace />;
  }

  return children;
}
