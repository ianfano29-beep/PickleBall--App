import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Loader() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-950">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-slate-500 text-sm">Loading...</p>
            </div>
        </div>
    );
}

export function ProtectedRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();
    if (loading) return <Loader />;
    if (!user || isAdmin) return <Navigate to="/login" replace />;
    return children;
}

export function AdminRoute({ children }) {
    const { user, loading, isAdmin } = useAuth();
    if (loading) return <Loader />;
    if (!user || !isAdmin) return <Navigate to="/" replace />;
    return children;
}