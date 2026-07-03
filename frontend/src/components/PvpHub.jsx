import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatRemaining } from "../hooks/useCountdown";

const CLASS_LABELS = { featherweight: "FTH", lightweight: "LW", middleweight: "MW", heavyweight: "HW" };

/**
 * Gym Wars hub (design brief §5 P1) — rating, shield, coverage, attack
 * actions, and the standing defense lineup. Lives on the night surface.
 */
export default function PvpHub({ fighters }) {
    const navigate = useNavigate();
    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [pickerOpen, setPickerOpen] = useState(false);
    const [lineupOpen, setLineupOpen] = useState(false);

    const load = useCallback(() => {
        api("/pvp/state").then(setState).catch((e) => setError(e.message));
    }, []);
    useEffect(() => { load(); }, [load]);

    async function callout(fighterId) {
        setBusy(true);
        setError(null);
        try {
            const d = await api("/pvp/callout", { method: "POST", body: { fighterId } });
            navigate(`/pvp/${d.event.id}`);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    async function gymWar() {
        setBusy(true);
        setError(null);
        try {
            const d = await api("/pvp/gymwar", { method: "POST", body: {} });
            navigate(`/pvp/${d.event.id}`);
        } catch (err) {
            setError(err.message);
            setBusy(false);
        }
    }

    async function setLineup(weightClass, fighterId) {
        try {
            await api("/pvp/defense", { method: "PUT", body: { lineup: { [weightClass]: fighterId || null } } });
            load();
        } catch (err) {
            setError(err.message);
        }
    }

    if (!state) return null;

    const warReady = state.classesCovered >= state.minClassesForWar && state.gymWarsLeft > 0;
    const eligible = fighters.filter((f) => !f.retired);

    return (
        <div style={{ background: "var(--night-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--night-line)", padding: 14, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)" }}>Gym vs Gym</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {state.shieldUntil && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: "var(--night-muted)", background: "rgba(140,128,103,0.2)", padding: "2px 8px", borderRadius: "var(--radius-chip)" }}>
                            SHIELDED {formatRemaining(new Date(state.shieldUntil).getTime() - Date.now())}
                        </span>
                    )}
                    <span className="mono" style={{ fontSize: 16, fontWeight: 600, color: "var(--ember)" }}>{state.rating}</span>
                    <span style={{ fontSize: 10, color: "var(--night-muted)" }}>RATING</span>
                </div>
            </div>

            <p style={{ fontSize: 11, color: "var(--night-muted)", margin: "0 0 10px" }}>
                Attack rival gyms for rating and purse — resolves instantly, separate from your fighters' booked ladder fights. Records never at stake.
            </p>
            {error && <div style={{ fontSize: 12, color: "var(--corner-red)", background: "rgba(198,50,62,0.12)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 10 }}>{error}</div>}

            {/* Coverage strip — full class coverage is a competitive necessity (GDD §9.2) */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
                {Object.entries(state.coverage).map(([wc, pick]) => (
                    <div key={wc} style={{ flex: 1, textAlign: "center", padding: "6px 2px", borderRadius: "var(--radius-md)", background: pick ? "rgba(255,90,41,0.12)" : "rgba(140,128,103,0.12)", border: `1px solid ${pick ? "var(--ember)" : "var(--night-line)"}` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: pick ? "var(--ember)" : "var(--night-muted)", letterSpacing: "0.06em" }}>{CLASS_LABELS[wc]}</div>
                        <div style={{ fontSize: 9, color: "var(--night-muted)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            {pick ? pick.name.split(" ").pop() : "forfeit"}
                        </div>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
                <button
                    onClick={() => setPickerOpen(!pickerOpen)}
                    disabled={busy || state.calloutsLeft <= 0}
                    style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: "transparent", color: state.calloutsLeft > 0 ? "var(--ember)" : "var(--night-muted)", border: "1.5px solid currentColor", borderRadius: "var(--radius-button)", opacity: busy ? 0.5 : 1 }}
                >
                    Callout ({state.calloutsLeft} left)
                </button>
                <button
                    onClick={gymWar}
                    disabled={busy || !warReady}
                    style={{ flex: 1, padding: "9px", fontSize: 13, fontWeight: 600, cursor: "pointer", background: warReady ? "var(--ember)" : "rgba(140,128,103,0.2)", color: warReady ? "#fff" : "var(--night-muted)", border: "none", borderRadius: "var(--radius-button)", opacity: busy ? 0.5 : 1 }}
                >
                    {busy ? "Fighting…" : state.gymWarsLeft > 0 ? "Start Gym War" : "War fought today"}
                </button>
            </div>
            {state.classesCovered < state.minClassesForWar && (
                <p style={{ fontSize: 11, color: "var(--night-muted)", margin: "8px 0 0" }}>
                    Gym Wars need {state.minClassesForWar} weight classes covered — you have {state.classesCovered}. Sign into another division.
                </p>
            )}

            {/* Callout fighter picker */}
            {pickerOpen && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--night-line)" }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 6 }}>Who makes the callout?</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {eligible.map((f) => (
                            <button key={f.id} onClick={() => callout(f.id)} disabled={busy}
                                style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", fontSize: 13, cursor: "pointer", background: "transparent", color: "var(--night-text)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-md)" }}>
                                <span style={{ fontWeight: 600 }}>{f.name}</span>
                                <span style={{ color: "var(--night-muted)", fontSize: 11 }}>{CLASS_LABELS[f.weightClass]}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Defense lineup editor (GDD §9.6) */}
            <button onClick={() => setLineupOpen(!lineupOpen)}
                style={{ marginTop: 10, padding: 0, fontSize: 11, fontWeight: 600, cursor: "pointer", background: "none", border: "none", color: "var(--night-muted)" }}>
                {lineupOpen ? "▾" : "▸"} Standing defense lineup
            </button>
            {lineupOpen && (
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                    {Object.entries(state.coverage).map(([wc, pick]) => {
                        const options = eligible.filter((f) => f.weightClass === wc);
                        return (
                            <div key={wc} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ fontSize: 10, fontWeight: 700, color: "var(--night-muted)", width: 32 }}>{CLASS_LABELS[wc]}</span>
                                {options.length > 0 ? (
                                    <select
                                        value={pick?.isLineupPick ? String(pick.fighterId) : ""}
                                        onChange={(e) => setLineup(wc, e.target.value || null)}
                                        style={{ flex: 1, padding: "6px 8px", fontSize: 12, background: "var(--night)", color: "var(--night-text)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-md)" }}
                                    >
                                        <option value="">Auto (best available{pick ? `: ${pick.name}` : ""})</option>
                                        {options.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                                    </select>
                                ) : (
                                    <span style={{ fontSize: 11, color: "var(--night-muted)" }}>No fighter — this class forfeits</span>
                                )}
                            </div>
                        );
                    })}
                    <p style={{ fontSize: 10, color: "var(--night-muted)", margin: "4px 0 0" }}>
                        Defenders fight with their saved gameplans while you're offline.
                    </p>
                </div>
            )}
        </div>
    );
}
