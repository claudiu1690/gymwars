import { useMemo, useState } from "react";
import { api } from "../api";
import { Button } from "./ds/Button.jsx";

const STATS = [
    { key: "striking", label: "Striking" },
    { key: "grappling", label: "Grappling" },
    { key: "submissions", label: "Submissions" },
    { key: "conditioning", label: "Conditioning" },
];

const LENGTHS = [
    { weeks: 1, label: "Short notice", detail: "1 game-week · minimal gains" },
    { weeks: 4, label: "Standard camp", detail: "4 game-weeks · moderate gains" },
    { weeks: 6, label: "Full camp", detail: "6 game-weeks · maximum gains" },
];

const NEGLECT_FLOOR = 15;
const FATIGUE_PER_WEEK = 9;

/** Camp setup — GDD §5.1: four sliders totalling 100%, neglect warning below
 *  15%, length choice with real-time equivalents. */
export default function CampSetup({ fighterId, fatigue, onStarted }) {
    const [alloc, setAlloc] = useState({ striking: 25, grappling: 25, submissions: 25, conditioning: 25 });
    const [weeks, setWeeks] = useState(4);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);

    const sum = useMemo(() => STATS.reduce((s, { key }) => s + alloc[key], 0), [alloc]);
    const neglected = STATS.filter(({ key }) => alloc[key] < NEGLECT_FLOOR);
    const projectedFatigue = Math.min(100, fatigue + weeks * FATIGUE_PER_WEEK);

    function set(key, value) {
        setAlloc((a) => ({ ...a, [key]: Number(value) }));
    }

    async function start() {
        setBusy(true);
        setError(null);
        try {
            await api("/camps", { method: "POST", body: { fighterId, allocations: alloc, weeks } });
            onStarted();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    return (
        <div className="card">
            <div className="section-label">Start Training Camp</div>
            {error && <div className="form-error">{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {STATS.map(({ key, label }) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: alloc[key] < NEGLECT_FLOOR ? "var(--warn)" : "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 96, flexShrink: 0 }}>
                            {label}
                        </span>
                        <input
                            type="range" min="0" max="100" step="5" value={alloc[key]}
                            onChange={(e) => set(key, e.target.value)}
                            style={{ flex: 1, accentColor: alloc[key] < NEGLECT_FLOOR ? "var(--warn)" : "var(--ember)" }}
                            aria-label={`${label} allocation`}
                        />
                        <span className="mono" style={{ fontSize: 12, width: 38, textAlign: "right", color: "var(--ink)" }}>{alloc[key]}%</span>
                    </div>
                ))}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line)", fontSize: 12 }}>
                <span style={{ color: sum === 100 ? "var(--win)" : "var(--corner-red)", fontWeight: 600 }}>
                    Total: {sum}% {sum !== 100 && "— must equal 100%"}
                </span>
                {neglected.length > 0 && (
                    <span style={{ color: "var(--warn)" }}>
                        Below 15% atrophies: {neglected.map((s) => s.label).join(", ")}
                    </span>
                )}
            </div>

            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {LENGTHS.map((l) => (
                    <button
                        key={l.weeks}
                        onClick={() => setWeeks(l.weeks)}
                        style={{
                            flex: 1, padding: "8px 6px", cursor: "pointer", textAlign: "center",
                            background: weeks === l.weeks ? "var(--ember-tint)" : "transparent",
                            border: `1.5px solid ${weeks === l.weeks ? "var(--ember)" : "var(--line)"}`,
                            borderRadius: "var(--radius-md)",
                        }}
                    >
                        <div style={{ fontSize: 12, fontWeight: 600, color: weeks === l.weeks ? "var(--ember-strong)" : "var(--ink)" }}>{l.label}</div>
                        <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>{l.detail}</div>
                    </button>
                ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12 }}>
                <span style={{ fontSize: 11, color: projectedFatigue >= 50 ? "var(--warn)" : "var(--ink-muted)" }}>
                    Projected fatigue after camp: <span className="mono">{projectedFatigue}</span>/100
                </span>
                <Button variant="primary" size="sm" disabled={busy || sum !== 100} onClick={start}>
                    {busy ? "Starting…" : `Start ${weeks}-week camp`}
                </Button>
            </div>
        </div>
    );
}
