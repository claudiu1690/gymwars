import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { useCountUp } from "../hooks/useCountUp";
import { Ico, TAB_ICONS } from "./Icons";
import NotificationsBell from "./NotificationsBell.jsx";

const TABS = [
    { to: "/realtime", label: "Home", ico: TAB_ICONS.home },
    { to: "/roster", label: "Roster", ico: TAB_ICONS.roster },
    { to: "/fights", label: "Fights", ico: TAB_ICONS.fights },
    { to: "/gym", label: "Gym", ico: TAB_ICONS.gym },
    { to: "/rankings", label: "Rankings", ico: TAB_ICONS.rankings },
];

export default function Shell({ children }) {
    const { gym, logout } = useAuth();
    const location = useLocation();
    const purse = useCountUp(gym?.purse ?? 0, { fromZero: true });
    // Fight Night inversion — fight and PvP screens flip the shell to night.
    const night = location.pathname.startsWith("/fights") || location.pathname.startsWith("/pvp") || location.pathname.startsWith("/livefight");

    return (
        <div className={night ? "shell night" : "shell"}>
            <nav className="tabbar" aria-label="Main navigation">
                {TABS.map((t) => (
                    <NavLink key={t.to} to={t.to} end={t.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                        <Ico d={t.ico} size={19} />
                        {t.label}
                    </NavLink>
                ))}
            </nav>
            <div className="shell-col">
                <header className="topbar">
                    <div>
                        <div className="gym-name">{gym ? gym.name : "Gym Wars"}</div>
                        {gym && <div className="purse">${Math.round(purse).toLocaleString()}</div>}
                    </div>
                    <div className="topbar-actions">
                        <NavLink className="btn btn-ghost" to="/career">Player-paced career</NavLink>
                        <NotificationsBell />
                        <button className="btn btn-ghost" onClick={logout}>Log out</button>
                    </div>
                </header>
                <main className="shell-main">
                    <div key={location.pathname} className="page-enter">{children}</div>
                </main>
            </div>
        </div>
    );
}
