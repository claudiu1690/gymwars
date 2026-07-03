import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { WeightClassChip } from "../components/ds/WeightClassChip.jsx";
import { useCountdown } from "../hooks/useCountdown";
import { toCardProps } from "./Roster";
import { DEMO_MODE, DEMO_FIGHT } from "../demoData";

export default function Dashboard() {
    const { gym, loading } = useAuth();
    const navigate = useNavigate();
    const [scouting, setScouting] = useState(null);
    const [fighters, setFighters] = useState([]);
    const refresh = useCountdown(scouting?.refreshAt);

    useEffect(() => {
        api("/scouting/state").then(setScouting).catch(() => {});
        api("/fighters").then((d) => setFighters(d.fighters)).catch(() => {});
    }, []);

    if (loading) return <p style={{ color: "var(--ink-secondary)" }}>Loading your gym…</p>;
    if (!gym) return <p style={{ color: "var(--ink-secondary)" }}>Couldn't load your gym. Try refreshing.</p>;

    const pity = scouting?.pity?.contender;
    const attemptsLeft = scouting ? scouting.attemptsTotal - scouting.attemptsUsed : 0;

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
            {/* While you were away — DEMO until fights exist (Phase 3+) */}
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

            {/* Your fighters (camps arrive in Phase 2) */}
            <div>
                <div className="section-label">Your Fighters</div>
                {fighters.length > 0 ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {fighters.map((f) => (
                            <Link key={f.id} to={`/roster/${f.id}`} style={{ textDecoration: "none" }}>
                                <FighterCard variant="compact" {...toCardProps(f)} />
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="card empty-state">
                        <div className="display">No fighters yet</div>
                        <p style={{ margin: 0, fontSize: 13 }}>Your first prospect is out there — run a scout.</p>
                    </div>
                )}
            </div>

            {/* Scouting — live */}
            <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <div className="section-label" style={{ margin: 0 }}>Scouting</div>
                    {scouting && <TimerBadge value={refresh.text || "…"} size="sm" label="Refresh" />}
                </div>
                <div className="card" style={{ padding: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                                {Array.from({ length: scouting?.attemptsTotal ?? 2 }, (_, i) => (
                                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < (scouting?.attemptsUsed ?? 0) ? "var(--ember)" : "var(--line)" }} />
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                                {scouting ? `${scouting.attemptsUsed} of ${scouting.attemptsTotal} attempts used` : "Loading…"}
                            </div>
                            {pity && (
                                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                    Guaranteed Contender+ within {pity.remaining} scout{pity.remaining === 1 ? "" : "s"}
                                </div>
                            )}
                        </div>
                        <Button variant="primary" size="sm" onClick={() => navigate("/scouting")}>
                            {attemptsLeft > 0 ? "Scout Now" : "Scouting"}
                        </Button>
                    </div>
                    {scouting?.reports?.length > 0 && (
                        <div style={{ fontSize: 12, color: "var(--ember-strong)", fontWeight: 600, marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                            {scouting.reports.length} pending report{scouting.reports.length === 1 ? "" : "s"} awaiting a decision →
                        </div>
                    )}
                </div>
            </div>

            {/* Next fight — DEMO until the fight engine lands (Phase 3) */}
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
