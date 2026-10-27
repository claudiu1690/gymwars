import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { Button } from "../components/ds/Button.jsx";
import CampSetup from "../components/CampSetup.jsx";
import GameplanEditor from "../components/GameplanEditor.jsx";
import BookFight from "../components/BookFight.jsx";
import SparCard from "../components/SparCard.jsx";
import { useCountdown, formatRemaining } from "../hooks/useCountdown";
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

/** The prep window at a glance: camp (ember) → taper (green) → FIGHT.
 *  Makes the causality visible — the notice period IS the camp window. */
function PrepTimeline({ camp, fightAt }) {
    const now = Date.now();
    const end = new Date(fightAt).getTime();
    if (end <= now) return null;
    const total = end - now;
    const campEnd = camp ? new Date(camp.endsAt).getTime() : now;
    const campMs = Math.max(0, Math.min(campEnd, end) - now);
    const taperMs = end - now - campMs;
    const overruns = camp && campEnd > end;

    return (
        <div style={{ marginTop: 10 }}>
            <div style={{ display: "flex", height: 8, borderRadius: "var(--radius-full)", overflow: "hidden", background: "var(--surface-sunken)" }}>
                {campMs > 0 && <div style={{ width: `${(campMs / total) * 100}%`, background: "var(--ember)", transition: "width var(--duration-xslow) var(--ease-out)" }} />}
                {taperMs > 0 && <div style={{ flex: 1, background: "var(--win-tint)" }} />}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--ink-muted)", marginTop: 4 }}>
                <span>{camp ? <>camp <span className="mono" style={{ color: "var(--ember-strong)" }}>{formatRemaining(campMs)}</span></> : "no camp running"}</span>
                {camp && !overruns && taperMs > 0 && <span>taper <span className="mono" style={{ color: "var(--win)" }}>{formatRemaining(taperMs)}</span></span>}
                <span style={{ fontWeight: 700, color: "var(--ink-secondary)" }}>FIGHT <span className="mono">{formatRemaining(total)}</span></span>
            </div>
            {overruns && (
                <p style={{ fontSize: 11, color: "var(--warn)", margin: "6px 0 0" }}>
                    This camp runs past fight night — he steps in mid-camp: no taper, full fatigue.
                </p>
            )}
        </div>
    );
}

export default function FighterDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { reloadGym } = useAuth();
    const [data, setData] = useState(null);
    const [upcomingFight, setUpcomingFight] = useState(null);
    const [error, setError] = useState(null);
    const [confirmRelease, setConfirmRelease] = useState(false);
    const [releasing, setReleasing] = useState(false);

    const load = useCallback(() => {
        api(`/fighters/${id}`).then(setData).catch((e) => setError(e.message));
        api("/fights").then((d) => {
            setUpcomingFight(d.fights.find((f) => f.status === "scheduled" && f.you?.fighterId === id) || null);
        }).catch(() => {});
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

    async function release() {
        setReleasing(true);
        setError(null);
        try {
            await api(`/fighters/${id}`, { method: "DELETE" });
            reloadGym();
            navigate("/roster");
        } catch (err) {
            setError(err.message);
            setReleasing(false);
            setConfirmRelease(false);
        }
    }

    if (error) return <div className="form-error">{error}</div>;
    if (!fighter) return <p style={{ color: "var(--ink-secondary)" }}>Loading fighter…</p>;

    const canRelease = !fighter.retired && !fighter.camp && !upcomingFight;

    const hiddenTraits = Math.max(0, fighter.traitCount - fighter.discoveredTraits.length);
    const lastCamp = data.lastCamp;

    return (
        <>
            <Link to="/roster" style={{ fontSize: 13, color: "var(--ember-strong)", textDecoration: "none", fontWeight: 500 }}>Roster</Link>
            <div className="stagger" style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <FighterCard variant="detail" {...toCardProps(fighter)} />

                {/* ── Fight prep — the loop, in order ── */}
                {!fighter.retired && (
                    <div style={{ margin: "0 0 -6px" }}>
                        <div className="section-label" style={{ margin: 0 }}>Fight Prep</div>
                        <div style={{ fontSize: 11, color: "var(--ink-muted)" }}>Book the bout → camp inside the notice window → the gameplan works the corner.</div>
                    </div>
                )}

                {/* Live fight — you work the corner, round by round */}
                {!fighter.retired && (
                    <button
                        onClick={() => navigate(`/livefight/${fighter.id}`)}
                        className="pressable"
                        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left",
                            background: "var(--night)", color: "var(--night-text)", border: "none", borderRadius: "var(--radius-card)", padding: "16px 18px", cursor: "pointer" }}
                    >
                        <div>
                            <div style={{ fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--ember)" }}>▶ Fight Live</div>
                            <div style={{ fontSize: 12, color: "var(--night-muted)", marginTop: 2 }}>Read the opponent, call the corner, live every round. No stakes — a real test of the plan.</div>
                        </div>
                        <span style={{ fontFamily: "var(--font-display)", fontSize: 22, color: "var(--night-muted)", flexShrink: 0 }}>›</span>
                    </button>
                )}

                {/* Competition: upcoming fight or the offer desk */}
                {upcomingFight ? (
                    <div className="card">
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div className="section-label" style={{ margin: 0 }}>
                                {upcomingFight.title ? "Title Fight Booked" : "Fight Booked"}
                            </div>
                            <span className="mono" style={{ fontSize: 12, color: "var(--ember-strong)" }}>
                                {formatRemaining(new Date(upcomingFight.scheduledAt).getTime() - Date.now())}
                            </span>
                        </div>
                        <div style={{ fontSize: 13, color: "var(--ink)" }}>
                            vs <strong>{upcomingFight.them.name}</strong>
                            <span style={{ color: "var(--ink-muted)" }}> · {upcomingFight.them.gym} · {upcomingFight.them.record.wins}–{upcomingFight.them.record.losses} · {upcomingFight.rounds} rds</span>
                        </div>
                        <PrepTimeline camp={fighter.camp} fightAt={upcomingFight.scheduledAt} />
                    </div>
                ) : (
                    !fighter.retired && <BookFight fighter={fighter} onBooked={load} />
                )}

                {/* Sparring — the instant lane, always available */}
                {!fighter.retired && <SparCard fighter={fighter} />}

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
                                        <div style={{ width: `${v}%`, height: "100%", background: v < 15 ? "var(--warn)" : "var(--ember)", borderRadius: "var(--radius-full)", transition: "width var(--duration-xslow) var(--ease-out)" }} />
                                    </div>
                                    <span className="mono" style={{ fontSize: 12, width: 38, textAlign: "right" }}>{v}%</span>
                                </div>
                            ))}
                        </div>
                        {campCountdown.done && <p style={{ fontSize: 12, color: "var(--win)", margin: "10px 0 0" }}>Camp complete — applying results…</p>}
                    </div>
                ) : (
                    !fighter.retired && (
                        <CampSetup
                            fighterId={fighter.id}
                            fatigue={fighter.fatigue}
                            noticeWeeksLeft={upcomingFight?.noticeWeeksLeft ?? null}
                            coaching={data.coaching}
                            onStarted={load}
                        />
                    )
                )}

                {/* Corner instructions */}
                {!fighter.retired && <GameplanEditor fighterId={fighter.id} gameplan={fighter.gameplan} />}

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

                {/* ── Career — the reading material ── */}
                <div className="section-label" style={{ margin: "0 0 -6px" }}>Career</div>

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

                {/* Profile — traits + background */}
                <div className="card">
                    <div className="section-label">Profile</div>
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
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
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

                {/* Release — permanent cut, frees the roster slot */}
                {!fighter.retired && (
                    <div className="card" style={{ border: "1px solid var(--corner-red-tint)" }}>
                        {!confirmRelease ? (
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                                <div>
                                    <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Release fighter</div>
                                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                        {canRelease
                                            ? "Cut them loose and free the roster slot. Permanent — no Hall of Fame plaque."
                                            : fighter.camp ? "Can't release mid-camp — wait for camp to finish."
                                            : "Can't release with a fight booked — the bout has to resolve first."}
                                    </div>
                                </div>
                                <Button variant="ghost" size="sm" disabled={!canRelease} onClick={() => setConfirmRelease(true)}>Release</Button>
                            </div>
                        ) : (
                            <div>
                                <div style={{ fontSize: 13, color: "var(--ink)", marginBottom: 10 }}>
                                    Release <strong>{fighter.name}</strong> for good? This can't be undone — they leave with no plaque.
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                    <Button variant="danger" size="sm" disabled={releasing} onClick={release}>
                                        {releasing ? "Releasing…" : "Yes, release"}
                                    </Button>
                                    <Button variant="ghost" size="sm" disabled={releasing} onClick={() => setConfirmRelease(false)}>Keep</Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
