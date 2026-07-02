import { NavLink, useLocation } from "react-router-dom";
import { useAuth } from "../auth";
import { Ico, TAB_ICONS, ICONS } from "./Icons";

const TABS = [
    { to: "/", label: "Home", ico: TAB_ICONS.home },
    { to: "/roster", label: "Roster", ico: TAB_ICONS.roster },
    { to: "/fights", label: "Fights", ico: TAB_ICONS.fights },
    { to: "/gym", label: "Gym", ico: TAB_ICONS.gym },
    { to: "/rankings", label: "Rankings", ico: TAB_ICONS.rankings },
];

export default function Shell({ children }) {
    const { gym, logout } = useAuth();
    const location = useLocation();
    // Fight Night inversion — fight screens flip the whole shell to night.
    const night = location.pathname.startsWith("/fights");

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
                        {gym && <div className="purse">${(gym.purse ?? 0).toLocaleString()}</div>}
                    </div>
                    <div className="topbar-actions">
                        <button className="iconbtn" aria-label="Notifications">
                            <Ico d={ICONS.bell} extra={ICONS.bellClapper} size={22} />
                        </button>
                        <button className="btn btn-ghost" onClick={logout}>Log out</button>
                    </div>
                </header>
                <main className="shell-main">{children}</main>
            </div>
        </div>
    );
}
