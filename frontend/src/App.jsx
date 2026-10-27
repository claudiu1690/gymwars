import { Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
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
import LiveFight from "./pages/LiveFight";
import PvpEvent from "./pages/PvpEvent";
import Rankings from "./pages/Rankings";
import Gym from "./pages/Gym";
const Career = lazy(() => import("./pages/Career"));
import PasswordRecovery from "./pages/PasswordRecovery";
import Landing from "./pages/Landing";
const PublicInfo = lazy(() => import("./pages/PublicInfo"));

function RequireAuth({ children }) {
  const { authed } = useAuth();
  if (!authed) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { authed } = useAuth();
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      {["support", "privacy", "terms"].map((kind) => (
        <Route
          key={kind}
          path={`/${kind}`}
          element={
            <Suspense
              fallback={
                <div className="route-loading" role="status">
                  Opening game information…
                </div>
              }
            >
              <PublicInfo kind={kind} />
            </Suspense>
          }
        />
      ))}
      <Route
        path="/career/*"
        element={
          <RequireAuth>
            <Suspense
              fallback={
                <div className="route-loading" role="status">
                  Opening your gym…
                </div>
              }
            >
              <Career />
            </Suspense>
          </RequireAuth>
        }
      />
      <Route
        path="/login"
        element={authed ? <Navigate to="/career" replace /> : <Login />}
      />
      <Route
        path="/register"
        element={authed ? <Navigate to="/career" replace /> : <Register />}
      />
      <Route path="/forgot-password" element={<PasswordRecovery />} />
      <Route path="/reset-password" element={<PasswordRecovery reset />} />
      <Route
        path="/*"
        element={
          import.meta.env.DEV &&
          import.meta.env.VITE_ENABLE_REALTIME_COMPARISON === "true" ? (
            <RequireAuth>
              <Shell>
                <Routes>
                  <Route path="/realtime" element={<Dashboard />} />
                  <Route path="/roster" element={<Roster />} />
                  <Route path="/roster/:id" element={<FighterDetail />} />
                  <Route path="/scouting" element={<Scouting />} />
                  <Route path="/fights" element={<Fights />} />
                  <Route path="/fights/:id" element={<FightDetail />} />
                  <Route path="/livefight/:fighterId" element={<LiveFight />} />
                  <Route path="/pvp/:id" element={<PvpEvent />} />
                  <Route path="/rankings" element={<Rankings />} />
                  <Route path="/gym" element={<Gym />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Shell>
            </RequireAuth>
          ) : (
            <Navigate to="/career" replace />
          )
        }
      />
    </Routes>
  );
}
