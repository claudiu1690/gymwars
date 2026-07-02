import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Placeholder from "./pages/Placeholder";

function RequireAuth({ children }) {
    const { authed } = useAuth();
    if (!authed) return <Navigate to="/login" replace />;
    return children;
}

export default function App() {
    const { authed } = useAuth();
    return (
        <Routes>
            <Route path="/login" element={authed ? <Navigate to="/" replace /> : <Login />} />
            <Route path="/register" element={authed ? <Navigate to="/" replace /> : <Register />} />
            <Route
                path="/*"
                element={
                    <RequireAuth>
                        <Shell>
                            <Routes>
                                <Route path="/" element={<Dashboard />} />
                                <Route path="/roster" element={<Placeholder title="Roster" note="Fighter cards land in Phase 1 — scouting and signing." />} />
                                <Route path="/fights" element={<Placeholder title="Fights" note="Fight Night arrives in Phase 3 — the engine and the ladder." />} />
                                <Route path="/gym" element={<Placeholder title="Gym" note="Facility tiers, staff, and mentoring arrive in Phase 5." />} />
                                <Route path="/rankings" element={<Placeholder title="Rankings" note="Per-weight-class ladders arrive in Phase 3." />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Shell>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
