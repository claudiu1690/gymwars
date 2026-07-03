import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

/**
 * Fight Night — the dark broadcast screen (design system ui kit), fed by a
 * real engine breakdown. Your corner = ember, theirs = corner-red, gold for
 * title fights.
 */
export default function FightDetail() {
    const { id } = useParams();
    const [fight, setFight] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api(`/fights/${id}`).then((d) => setFight(d.fight)).catch((e) => setError(e.message));
    }, [id]);

    if (error) return <div style={{ padding: 16 }}><div className="form-error">{error}</div></div>;
    if (!fight) return <p style={{ color: "var(--night-muted)", padding: "24px 16px" }}>Loading fight…</p>;

    const won = fight.result?.winner === "you";
    const draw = fight.result?.winner === "draw";
    const winnerName = draw ? null : won ? fight.you.name : fight.them.name;
    const winnerColor = won ? "var(--ember)" : "var(--corner-red)";

    const consequences = [
        { value: `$${(fight.purse ?? 0).toLocaleString()}`, color: "var(--win)", label: "Purse" },
        { value: `${fight.pointsDelta >= 0 ? "+" : ""}${fight.pointsDelta}`, color: fight.pointsDelta >= 0 ? "var(--ember)" : "var(--corner-red)", label: "Ranking pts" },
        { value: `+25 Fatigue`, color: "var(--warn)", label: "Fatigue" },
    ];

    const stack = (name) => name.split(" ").map((w, i) => <span key={i}>{w}<br /></span>);

    return (
        <div style={{ padding: "0 0 20px" }}>
            {/* Matchup banner */}
            <div style={{ textAlign: "center", padding: "22px 16px 16px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: fight.title ? "var(--gold)" : "var(--night-muted)", marginBottom: 18 }}>
                    {fight.title ? "Championship · " : ""}{fight.weightClass} · {fight.tier} · {fight.rounds} Rounds
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--ember)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.05 }}>{stack(fight.you.name)}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--night-muted)", marginTop: 5 }}>{fight.you.record.wins}–{fight.you.record.losses}</div>
                        <div style={{ marginTop: 5, display: "flex", justifyContent: "flex-end" }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--ember)", background: "rgba(255,90,41,0.15)", padding: "2px 8px", borderRadius: "var(--radius-chip)", letterSpacing: "0.06em" }}>YOUR CORNER</span>
                        </div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--night-muted)", letterSpacing: "0.04em", flexShrink: 0, padding: "0 4px" }}>VS</div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 24, color: "var(--corner-red)", letterSpacing: "0.02em", textTransform: "uppercase", lineHeight: 1.05 }}>{stack(fight.them.name)}</div>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--night-muted)", marginTop: 5 }}>{fight.them.record.wins}–{fight.them.record.losses}</div>
                        <div style={{ marginTop: 5 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--corner-red)", background: "rgba(198,50,62,0.15)", padding: "2px 8px", borderRadius: "var(--radius-chip)", letterSpacing: "0.06em" }}>
                                {fight.them.gym ? fight.them.gym.toUpperCase() : "RED CORNER"}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {fight.status === "resolved" && (
                <>
                    {/* Result card */}
                    <div style={{ margin: "0 16px 14px", background: "var(--night-surface)", borderRadius: "var(--radius-lg)", padding: 16, border: `1px solid ${fight.title ? "var(--gold)" : "var(--night-line)"}` }}>
                        <div style={{ textAlign: "center", marginBottom: 12 }}>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 30, color: draw ? "var(--night-text)" : winnerColor, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1 }}>
                                {draw ? "DRAW" : `${winnerName.split(" ").pop()} WINS`}
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 14, color: "var(--night-text)", marginTop: 6 }}>
                                {fight.result.method} · Round {fight.result.round}, {fight.result.time}
                            </div>
                            {fight.titleChanged && (
                                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.1em", color: "var(--gold)", marginTop: 8 }}>
                                    {won ? "AND NEW — THE BELT CHANGES HANDS" : "THE BELT LEAVES THE GYM"}
                                </div>
                            )}
                            {fight.traitsDiscovered?.length > 0 && (
                                <div style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 8 }}>
                                    Trait revealed: <span style={{ color: "var(--ember)", fontWeight: 600 }}>{fight.traitsDiscovered.join(", ")}</span>
                                </div>
                            )}
                        </div>
                        <div style={{ display: "flex", borderTop: "1px solid var(--night-line)", paddingTop: 12 }}>
                            {consequences.map((c, i) => (
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
                            {fight.breakdown.rounds.flatMap((r) =>
                                r.events.map((e, i) => (
                                    <div key={`${r.round}-${i}`} style={{ display: "flex", gap: 8, alignItems: "flex-start", background: e.finish ? "rgba(255,90,41,0.1)" : "transparent", borderRadius: e.finish ? 4 : 0, padding: e.finish ? "3px 5px" : 0, margin: e.finish ? "0 -5px" : 0 }}>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--night-muted)", flexShrink: 0, lineHeight: 1.55, whiteSpace: "nowrap" }}>R{r.round} {e.time}</span>
                                        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, lineHeight: 1.55, fontWeight: e.finish ? 600 : 400, color: e.actor === "you" ? "var(--ember)" : e.actor === "them" ? "var(--corner-red)" : "var(--night-muted)" }}>{e.text}</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Totals strip */}
                    <div style={{ margin: "14px 16px 0", display: "flex", gap: 8 }}>
                        {[
                            ["Damage", fight.breakdown.totals.you.damage, fight.breakdown.totals.them.damage],
                            ["Takedowns", fight.breakdown.totals.you.takedowns, fight.breakdown.totals.them.takedowns],
                            ["Knockdowns", fight.breakdown.totals.you.knockdowns, fight.breakdown.totals.them.knockdowns],
                        ].map(([label, y, t]) => (
                            <div key={label} style={{ flex: 1, background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-md)", padding: "8px 10px", textAlign: "center" }}>
                                <div className="mono" style={{ fontSize: 13, color: "var(--night-text)" }}>
                                    <span style={{ color: "var(--ember)" }}>{y}</span>
                                    <span style={{ color: "var(--night-muted)" }}> – </span>
                                    <span style={{ color: "var(--corner-red)" }}>{t}</span>
                                </div>
                                <div style={{ fontSize: 10, color: "var(--night-muted)", marginTop: 2 }}>{label}</div>
                            </div>
                        ))}
                    </div>
                </>
            )}

            <div style={{ margin: "16px 16px 0" }}>
                <Link to="/fights" style={{ fontSize: 13, color: "var(--ember)", textDecoration: "none", fontWeight: 600 }}>← All fights</Link>
            </div>
        </div>
    );
}
