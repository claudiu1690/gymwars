import { Button } from "../components/ds/Button.jsx";
import { DEMO_MODE, DEMO_FIGHT } from "../demoData";

/**
 * Fight Night — the dark broadcast screen. The Shell flips the whole app to
 * night mode on this route; everything here renders on --night surfaces.
 * Your corner = ember, opponent = corner-red, always.
 */
export default function FightNight() {
    if (!DEMO_MODE) {
        return (
            <div style={{ textAlign: "center", padding: "56px 24px", color: "var(--night-muted)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--night-text)" }}>No fights yet</div>
                <p style={{ fontSize: 13 }}>Fight results appear here once your first bout resolves.</p>
            </div>
        );
    }

    const f = DEMO_FIGHT;

    return (
        <div style={{ padding: "0 0 20px" }}>
            {/* Matchup banner */}
            <div style={{ textAlign: "center", padding: "22px 16px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--night-muted)", marginBottom: 18 }}>
                    {f.weightClass} · {f.circuit} · {f.rounds} Rounds
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ember)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.05 }}>
                            {f.you.name.split(" ").map((w, i) => <span key={i}>{w}<br /></span>)}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--night-muted)", marginTop: 5 }}>{f.you.record}</div>
                        <div style={{ marginTop: 5, display: "flex", justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ember)", background: "rgba(255,90,41,0.15)", padding: "2px 8px", borderRadius: "var(--radius-chip)", letterSpacing: "0.06em" }}>YOUR CORNER</span>
                        </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--night-muted)", letterSpacing: "0.04em", flexShrink: 0, padding: "0 4px" }}>VS</div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--corner-red)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.05 }}>
                            {f.them.name.split(" ").map((w, i) => <span key={i}>{w}<br /></span>)}
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--night-muted)", marginTop: 5 }}>{f.them.record}</div>
                        <div style={{ marginTop: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--corner-red)", background: "rgba(198,50,62,0.15)", padding: "2px 8px", borderRadius: "var(--radius-chip)", letterSpacing: "0.06em" }}>RED CORNER</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Result card */}
            <div style={{ margin: "0 16px 14px", background: "var(--night-surface)", borderRadius: "var(--radius-lg)", padding: 16, border: "1px solid var(--night-line)" }}>
                <div style={{ textAlign: "center", marginBottom: 12 }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: "var(--ember)", letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>{f.result.winner}</div>
                    <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--night-text)", marginTop: 6 }}>{f.result.method}</div>
                </div>
                <div style={{ display: "flex", borderTop: "1px solid var(--night-line)", paddingTop: 12 }}>
                    {f.consequences.map((c, i) => (
                        <div key={c.label} style={{ flex: 1, textAlign: "center", borderLeft: i > 0 ? "1px solid var(--night-line)" : "none" }}>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 600, color: c.color }}>{c.value}</div>
                            <div style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 3 }}>{c.label}</div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Fight log */}
            <div style={{ margin: "0 16px", background: "var(--night-surface)", borderRadius: "var(--radius-lg)", padding: 12, border: "1px solid var(--night-line)" }}>
                <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Fight Log</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                    {f.log.map((e, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: e.ko ? "rgba(255,90,41,0.1)" : "transparent", borderRadius: e.ko ? 4 : 0, padding: e.ko ? "3px 5px" : 0, margin: e.ko ? "0 -5px" : 0 }}>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--night-muted)", flexShrink: 0, lineHeight: 1.55, whiteSpace: "nowrap" }}>R{e.round} {e.time}</span>
                            <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.55, fontWeight: e.ko ? 600 : 400, color: e.corner === "you" ? "var(--ember)" : e.corner === "them" ? "var(--corner-red)" : "var(--night-muted)" }}>{e.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div style={{ margin: "14px 16px 0", display: "flex", gap: 8 }}>
                <Button variant="primary" size="md">Next Fight</Button>
                <Button variant="ghost" size="md">Full Breakdown</Button>
            </div>
        </div>
    );
}
