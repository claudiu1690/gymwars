import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { WeightClassChip } from "../components/ds/WeightClassChip.jsx";
import { DEMO_MODE, DEMO_FIGHTERS, DEMO_FIGHT, DEMO_SCOUTING } from "../demoData";

export default function Dashboard() {
    const { gym, loading } = useAuth();
    const navigate = useNavigate();

    if (loading) return <p style={{ color: "var(--ink-secondary)" }}>Loading your gym…</p>;
    if (!gym) return <p style={{ color: "var(--ink-secondary)" }}>Couldn't load your gym. Try refreshing.</p>;

    const inCamp = DEMO_MODE ? DEMO_FIGHTERS.filter((f) => f.status.type === "in-camp" || f.status.type === "fight-ready") : [];
    const scouting = DEMO_MODE ? DEMO_SCOUTING : { attemptsUsed: 0, attemptsTotal: 2, refreshIn: null, pity: null };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* While you were away — digest */}
            {DEMO_MODE && (
                <div style={{ background: "var(--ember-tint)", borderRadius: "var(--radius-md)", padding: "10px 12px" }}>
                    <div className="section-label" style={{ color: "var(--ember-strong)", marginBottom: 5 }}>While You Were Away</div>
                    <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 3 }}>
                        Camp complete — <strong>RIVAS</strong> gained 3 stat points.
                    </div>
                    <div style={{ fontSize: 13, color: "var(--corner-red)", fontWeight: 500, marginBottom: 6 }}>
                        You were attacked by STEEL CITY GYM.
                    </div>
                    <button
                        onClick={() => navigate("/fights")}
                        style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600, color: "var(--ember-strong)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                        View fight results →
                    </button>
                </div>
            )}

            {/* Active camps */}
            <div>
                <div className="section-label">Active Camps</div>
                {inCamp.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {inCamp.map((f) => <FighterCard key={f.id} variant="compact" {...f} />)}
                    </div>
                ) : (
                    <div className="card empty-state">
                        <div className="display">No active camps</div>
                        <p style={{ margin: 0, fontSize: 13 }}>Sign a fighter and start a camp to see it here.</p>
                    </div>
                )}
            </div>

            {/* Scouting */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div className="section-label" style={{ margin: 0 }}>Scouting</div>
                    {scouting.refreshIn && <TimerBadge value={scouting.refreshIn} size="sm" label="Refresh" />}
                </div>
                <div className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                                {Array.from({ length: scouting.attemptsTotal }, (_, i) => (
                                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < scouting.attemptsUsed ? "var(--ember)" : "var(--line)" }} />
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                                {scouting.attemptsUsed} of {scouting.attemptsTotal} attempts used
                            </div>
                            {scouting.pity && <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{scouting.pity}</div>}
                        </div>
                        <Button variant="primary" size="sm" onClick={() => navigate("/roster")}>Scout Now</Button>
                    </div>
                </div>
            </div>

            {/* Next fight */}
            {DEMO_MODE && (
                <div>
                    <div className="section-label">Next Fight</div>
                    <div className="card" style={{ padding: 12 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, marginBottom: 10 }}>
                            <div style={{ textAlign: "right" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--ember-strong)", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1 }}>{DEMO_FIGHT.you.short}</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{DEMO_FIGHT.you.record}</div>
                            </div>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: 13, color: "var(--ink-muted)", letterSpacing: "0.04em" }}>VS</span>
                            <div style={{ textAlign: "left" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 17, color: "var(--corner-red)", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1 }}>{DEMO_FIGHT.them.short}</div>
                                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{DEMO_FIGHT.them.record}</div>
                            </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                                <WeightClassChip weightClass="lightweight" />
                                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{DEMO_FIGHT.circuit} · {DEMO_FIGHT.rounds} rds</span>
                            </div>
                            <TimerBadge value="2d 6h" size="sm" />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
