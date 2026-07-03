import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import CampSetup from "../components/CampSetup.jsx";
import { useCountdown } from "../hooks/useCountdown";
import { toCardProps } from "./Roster";

const TRAIT_LABELS = {
    "iron-chin": "Iron Chin", "suspect-chin": "Suspect Chin", "killer-instinct": "Killer Instinct",
    coachable: "Coachable", "gym-rat": "Gym Rat", "slow-starter": "Slow Starter",
    "fast-starter": "Fast Starter", hothead: "Hothead", passive: "Passive",
    "cardio-machine": "Cardio Machine", "fragile-hands": "Fragile Hands",
    "big-fight-nerves": "Big Fight Nerves", showman: "Showman", spoiler: "Spoiler",
};

const STAT_LABELS = { striking: "Striking", grappling: "Grappling", submissions: "Submissions", conditioning: "Conditioning" };

function Delta({ value }) {
    const color = value > 0 ? "var(--win)" : value < 0 ? "var(--corner-red)" : "var(--ink-muted)";
    return <span className="mono" style={{ color, fontWeight: 600 }}>{value > 0 ? `+${value}` : value}</span>;
}

export default function FighterDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [error, setError] = useState(null);

    const load = useCallback(() => {
        api(`/fighters/${id}`).then(setData).catch((e) => setError(e.message));
    }, [id]);
    useEffect(() => { load(); }, [load]);

    const fighter = data?.fighter;
    const campCountdown = useCountdown(fighter?.camp?.endsAt);

    // Camp finished while the page is open — refetch to apply gains.
    useEffect(() => {
        if (fighter?.camp && campCountdown.done) {
            const t = setTimeout(load, 1500);
            return () => clearTimeout(t);
        }
    }, [fighter, campCountdown.done, load]);

    if (error) return <div className="form-error">{error}</div>;
    if (!fighter) return <p style={{ color: "var(--ink-secondary)" }}>Loading fighter…</p>;

    const hiddenTraits = Math.max(0, fighter.traitCount - fighter.discoveredTraits.length);
    const lastCamp = data.lastCamp;

    return (
        <>
            <Link to="/roster" style={{ fontSize: 13, color: "var(--ember-strong)", textDecoration: "none", fontWeight: 500 }}>← Roster</Link>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <FighterCard variant="detail" {...toCardProps(fighter)} />

                {/* Condition */}
                <div className="card">
                    <div className="section-label">Condition</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 96, flexShrink: 0 }}>Fatigue</span>
                        <div style={{ flex: 1, height: 6, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                            <div style={{ width: `${fighter.fatigue}%`, height: "100%", background: fighter.fatigue >= 50 ? "var(--warn)" : "var(--win)", borderRadius: "var(--radius-full)", transition: "width 400ms var(--ease-out)" }} />
                        </div>
                        <span className="mono" style={{ fontSize: 12, width: 56, textAlign: "right" }}>{fighter.fatigue}/100</span>
                    </div>
                    {fighter.fatigue >= 50 && (
                        <p style={{ fontSize: 11, color: "var(--warn)", margin: "6px 0 0" }}>Fatigued — rest before competing.</p>
                    )}
                </div>

                {/* Camp: active panel or setup form */}
                {fighter.camp ? (
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                            <div className="section-label" style={{ margin: 0 }}>In Camp — {fighter.camp.weeks} game-week{fighter.camp.weeks === 1 ? "" : "s"}</div>
                            <TimerBadge value={campCountdown.text || "…"} size="sm" label="Completes" complete={campCountdown.done} />
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {Object.entries(fighter.camp.allocations).map(([k, v]) => (
                                <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                                    <span style={{ fontSize: 11, color: v < 15 ? "var(--warn)" : "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 96, flexShrink: 0 }}>{STAT_LABELS[k]}</span>
                                    <div style={{ flex: 1, height: 5, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                                        <div style={{ width: `${v}%`, height: "100%", background: v < 15 ? "var(--warn)" : "var(--ember)", borderRadius: "var(--radius-full)" }} />
                                    </div>
                                    <span className="mono" style={{ fontSize: 12, width: 38, textAlign: "right" }}>{v}%</span>
                                </div>
                            ))}
                        </div>
                        {campCountdown.done && <p style={{ fontSize: 12, color: "var(--win)", margin: "10px 0 0" }}>Camp complete — applying results…</p>}
                    </div>
                ) : (
                    !fighter.retired && <CampSetup fighterId={fighter.id} fatigue={fighter.fatigue} onStarted={load} />
                )}

                {/* Last camp results */}
                {lastCamp?.results && (
                    <div className="card">
                        <div className="section-label">Last Camp — {lastCamp.weeks} game-week{lastCamp.weeks === 1 ? "" : "s"}</div>
                        <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
                            {Object.entries(lastCamp.results.gains).map(([k, v]) => (
                                <div key={k} style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                                    {STAT_LABELS[k]} <Delta value={v} />
                                </div>
                            ))}
                        </div>
                        {lastCamp.results.cappedAtPotential?.length > 0 && (
                            <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>
                                {lastCamp.results.cappedAtPotential.map((k) => STAT_LABELS[k]).join(", ")} hit a ceiling — this fighter may be near their potential there.
                            </p>
                        )}
                    </div>
                )}

                {/* Background */}
                <div className="card">
                    <div className="section-label">Background</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--ink-secondary)" }}>Region</span>
                            <span>{fighter.regionLabel}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--ink-secondary)" }}>Signed</span>
                            <span className="mono" style={{ fontSize: 12 }}>{new Date(fighter.signedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                {/* Traits */}
                <div className="card">
                    <div className="section-label">Traits</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {fighter.discoveredTraits.map((t) => (
                            <span key={t} style={{ fontSize: 12, fontWeight: 600, color: "var(--ember-strong)", background: "var(--ember-tint)", padding: "4px 10px", borderRadius: "var(--radius-chip)" }}>
                                {TRAIT_LABELS[t] || t}
                            </span>
                        ))}
                        {Array.from({ length: hiddenTraits }, (_, i) => (
                            <span key={`hidden-${i}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", background: "var(--surface-sunken)", padding: "4px 10px", borderRadius: "var(--radius-chip)" }}>
                                ? Undiscovered
                            </span>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>
                        Traits reveal themselves through camps and fights — a suspect chin shows after a bad knockdown, a killer instinct after an early finish.
                    </p>
                </div>
            </div>
        </>
    );
}
