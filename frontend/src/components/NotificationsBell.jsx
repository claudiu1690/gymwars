import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Ico, ICONS } from "./Icons";

/** Notification bell — "someone hit my gym" pulls harder than any other
 *  notification (GDD §9.5), so attacked items carry a one-tap revenge. */
export default function NotificationsBell() {
    const navigate = useNavigate();
    const [items, setItems] = useState([]);
    const [unread, setUnread] = useState(0);
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(false);
    const panelRef = useRef(null);

    useEffect(() => {
        const load = () => api("/pvp/notifications").then((d) => { setItems(d.notifications); setUnread(d.unread); }).catch(() => {});
        load();
        const t = setInterval(load, 30000);
        return () => clearInterval(t);
    }, []);

    useEffect(() => {
        if (!open) return;
        const close = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, [open]);

    async function toggle() {
        const next = !open;
        setOpen(next);
        if (next && unread > 0) {
            api("/pvp/notifications/read", { method: "POST" }).then(() => setUnread(0)).catch(() => {});
        }
    }

    async function revenge(n) {
        setBusy(true);
        try {
            const d = await api("/pvp/gymwar", { method: "POST", body: { revengeOfEventId: n.data.eventId } });
            setOpen(false);
            navigate(`/pvp/${d.event.id}`);
        } catch (err) {
            alert(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div ref={panelRef} style={{ position: "relative" }}>
            <button className="iconbtn" aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ""}`} onClick={toggle}>
                <Ico d={ICONS.bell} extra={ICONS.bellClapper} size={22} />
                {unread > 0 && <span className="dot" />}
            </button>
            {open && (
                <div style={{
                    position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, maxHeight: 400, overflowY: "auto",
                    background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)",
                    boxShadow: "var(--shadow-lg)", zIndex: 40, padding: 8,
                }}>
                    {items.length === 0 && (
                        <p style={{ fontSize: 12, color: "var(--ink-muted)", textAlign: "center", padding: "16px 8px", margin: 0 }}>Nothing yet — quiet week at the gym.</p>
                    )}
                    {items.map((n) => (
                        <div key={n.id} style={{ padding: "10px 8px", borderBottom: "1px solid var(--line)" }}>
                            <div style={{ fontSize: 12, color: n.type === "attacked" ? "var(--corner-red)" : "var(--ink)", fontWeight: n.read ? 400 : 600 }}>
                                {n.message}
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}>
                                <span style={{ fontSize: 10, color: "var(--ink-muted)" }} className="mono">{new Date(n.createdAt).toLocaleString()}</span>
                                <div style={{ display: "flex", gap: 6 }}>
                                    {n.data?.eventId && (
                                        <button onClick={() => { setOpen(false); navigate(`/pvp/${n.data.eventId}`); }}
                                            style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-secondary)", background: "none", border: "1px solid var(--line)", borderRadius: "var(--radius-chip)", padding: "3px 8px", cursor: "pointer" }}>
                                            View
                                        </button>
                                    )}
                                    {n.type === "attacked" && n.data?.revengeAvailable && (
                                        <button onClick={() => revenge(n)} disabled={busy}
                                            style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "var(--corner-red)", border: "none", borderRadius: "var(--radius-chip)", padding: "3px 10px", cursor: "pointer" }}>
                                            Revenge
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
