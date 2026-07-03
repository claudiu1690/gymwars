import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth";
import Shell from "./components/Shell";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Roster from "./pages/Roster";
import FighterDetail from "./pages/FighterDetail";
import Scouting from "./pages/Scouting";
import Fights from "./pages/Fights";
import FightDetail from "./pages/FightDetail";
import PvpEvent from "./pages/PvpEvent";
import Rankings from "./pages/Rankings";
import Gym from "./pages/Gym";

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
                                <Route path="/fights" element={<Fights />} />
                                <Route path="/fights/:id" element={<FightDetail />} />
                                <Route path="/pvp/:id" element={<PvpEvent />} />
                                <Route path="/rankings" element={<Rankings />} />
                                <Route path="/gym" element={<Gym />} />
                                <Route path="*" element={<Navigate to="/" replace />} />
                            </Routes>
                        </Shell>
                    </RequireAuth>
                }
            />
        </Routes>
    );
}
