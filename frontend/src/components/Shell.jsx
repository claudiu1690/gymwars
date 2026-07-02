import { NavLink } from "react-router-dom";
import { useAuth } from "../auth";

const TABS = [
    { to: "/", label: "Home", ico: "▦" },
    { to: "/roster", label: "Roster", ico: "▥" },
    { to: "/fights", label: "Fights", ico: "◆" },
    { to: "/gym", label: "Gym", ico: "⌂" },
    { to: "/rankings", label: "Rankings", ico: "≡" },
];

export default function Shell({ children }) {
    const { gym, logout } = useAuth();
    return (
        <div className="shell">
            <nav className="tabbar" aria-label="Main navigation">
                {TABS.map((t) => (
                    <NavLink key={t.to} to={t.to} end={t.to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
                        <span className="tab-ico" aria-hidden="true">{t.ico}</span>
                        {t.label}
                    </NavLink>
                ))}
            </nav>
            <div className="shell-col">
                <header className="topbar">
                    <div>
                        <div className="display">Gym Wars</div>
                        {gym && <div className="gym-name">{gym.name}</div>}
                    </div>
                    <button className="btn btn-ghost" onClick={logout}>Log out</button>
                </header>
                <main className="shell-main">{children}</main>
            </div>
        </div>
    );
}
