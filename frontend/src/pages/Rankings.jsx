import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";

const TIER_LABELS = { regional: "Regional", national: "National", contender: "Contender" };

/** Per-weight-class ladders (GDD §8.2) — the track a manager watches week to
 *  week: "my lightweight is three wins from a title shot." */
export default function Rankings() {
    const [data, setData] = useState(null);

    useEffect(() => {
        api("/rankings").then(setData).catch(() => setData({ classes: [] }));
    }, []);

    if (!data) return <p style={{ color: "var(--ink-secondary)" }}>Loading rankings…</p>;

    return (
        <>
            <h1 className="page-title">Rankings</h1>
            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {data.classes.map((c) => (
                    <div key={c.weightClass} className="card">
                        <div className="section-label">{c.label}</div>

                        {c.champion && (
                            <div style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "10px 12px", marginBottom: 8 }}>
                                <span style={{ fontSize: 16, color: "var(--gold)" }} aria-hidden="true">◆</span>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontFamily: "var(--font-display)", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.03em", color: "var(--ink)" }}>
                                        {c.champion.name}
                                    </div>
                                    <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>
                                        Champion · {c.champion.isYours ? "your gym" : c.champion.gym}
                                    </div>
                                </div>
                                <span className="mono" style={{ fontSize: 12, color: "var(--ink)" }}>
                                    {c.champion.record.wins}–{c.champion.record.losses}
                                </span>
                            </div>
                        )}

                        {c.yourFighters.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {c.yourFighters.map((f) => (
                                    <Link key={f.id} to={`/roster/${f.id}`} style={{ textDecoration: "none" }}>
                                        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 4px", borderBottom: "1px solid var(--line)" }}>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{f.name}</span>
                                                {f.isChampion && <span style={{ color: "var(--gold)", marginLeft: 6 }} aria-label="Champion">◆</span>}
                                                {f.titleShot && (
                                                    <span style={{ fontSize: 10, fontWeight: 700, color: "var(--gold)", background: "var(--gold-tint)", padding: "2px 6px", borderRadius: "var(--radius-chip)", marginLeft: 6 }}>
                                                        TITLE SHOT
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 11, color: "var(--ink-secondary)" }}>{TIER_LABELS[f.tier] || f.tier}</span>
                                            <span className="mono" style={{ fontSize: 12, color: "var(--ink)", width: 56, textAlign: "right" }}>{f.rankingPoints} pts</span>
                                        </div>
                                    </Link>
                                ))}
                            </div>
                        ) : (
                            <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0 }}>No fighters in this division.</p>
                        )}
                    </div>
                ))}
            </div>
        </>
    );
}
