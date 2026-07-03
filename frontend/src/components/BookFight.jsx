import { useState } from "react";
import { api } from "../api";
import { Button } from "./ds/Button.jsx";

const NOTICE = [
    { weeks: 1, label: "Short notice", detail: "1 game-week out" },
    { weeks: 4, label: "Standard", detail: "4 game-weeks out" },
    { weeks: 6, label: "Full camp", detail: "6 game-weeks out" },
];

/** Book a ladder fight (GDD §8). The notice period is the window you have
 *  to run a camp and set the gameplan before it resolves. */
export default function BookFight({ fighter, onBooked }) {
    const [weeks, setWeeks] = useState(4);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    async function book() {
        setBusy(true);
        setError(null);
        try {
            await api("/fights/book", { method: "POST", body: { fighterId: fighter.id, weeks } });
            onBooked();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card">
            <div className="section-label">Book a Fight</div>
            {error && <div className="form-error">{error}</div>}
            {fighter.titleShot && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 10 }}>
                    Title shot earned — the next booking is a 5-round championship fight.
                </div>
            )}
            {fighter.isChampion && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 10 }}>
                    Champion — bookings are 5-round title defenses.
                </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
                {NOTICE.map((n) => (
                    <button
                        key={n.weeks}
                        onClick={() => setWeeks(n.weeks)}
                        style={{
                            flex: 1, padding: "8px 6px", cursor: "pointer", textAlign: "center",
                            background: weeks === n.weeks ? "var(--ember-tint)" : "transparent",
                            border: `1.5px solid ${weeks === n.weeks ? "var(--ember)" : "var(--line)"}`,
                            borderRadius: "var(--radius-md)",
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 600, color: weeks === n.weeks ? "var(--ember-strong)" : "var(--ink)" }}>{n.label}</div>
                        <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>{n.detail}</div>
                    </button>
                ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    Time to camp and taper before it resolves.
                </span>
                <Button variant="primary" size="sm" disabled={busy} onClick={book}>
                    {busy ? "Matching…" : "Find opponent"}
                </Button>
            </div>
        </div>
    );
}
