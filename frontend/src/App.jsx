import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Roster from "./pages/Roster";
import FighterDetail from "./pages/FighterDetail";
import Scouting from "./pages/Scouting";
import FightNight from "./pages/FightNight";
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
                                <Route path="/roster" element={<Roster />} />
                                <Route path="/roster/:id" element={<FighterDetail />} />
                                <Route path="/scouting" element={<Scouting />} />
                                <Route path="/fights" element={<FightNight />} />
                                <Route path="/gym" element={<Placeholder title="Gym & Facilities" note="This screen is in scope for the Gym Wars app. See design brief §5 (P1/P2 screens) for wireframe priority." />} />
                                <Route path="/rankings" element={<Placeholder title="Rankings" note="This screen is in scope for the Gym Wars app. See design brief §5 (P1/P2 screens) for wireframe priority." />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Shell>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
