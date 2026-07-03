import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { useCountdown } from "../hooks/useCountdown";

const TRAIT_QUALITY_COLORS = { budget: "var(--ink-muted)", solid: "var(--ember-strong)", premium: "var(--gold)" };
const CLASS_SHORT = { featherweight: "FTH", lightweight: "LW", middleweight: "MW", heavyweight: "HW" };

function AttrRow({ label, value }) {
    return (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 90, flexShrink: 0 }}>{label}</span>
            <div style={{ flex: 1, height: 4, background: "var(--surface-sunken)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
                <div style={{ width: `${value}%`, height: "100%", background: "var(--ember)", borderRadius: "var(--radius-full)" }} />
            </div>
            <span className="mono" style={{ fontSize: 11, width: 24, textAlign: "right" }}>{value}</span>
        </div>
    );
}

export default function Gym() {
    const { reloadGym } = useAuth();
    const [data, setData] = useState(null);
    const [market, setMarket] = useState([]);
    const [hof, setHof] = useState([]);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const [mentorPick, setMentorPick] = useState("");
    const [juniorPick, setJuniorPick] = useState("");
    const upgradeCountdown = useCountdown(data?.facility?.upgrade?.endsAt);

    const load = useCallback(() => {
        api("/gyms/overview").then(setData).catch((e) => setError(e.message));
        api("/gyms/staff/market").then((d) => setMarket(d.market)).catch(() => {});
        api("/gyms/hall-of-fame").then((d) => setHof(d.hallOfFame)).catch(() => {});
    }, []);
    useEffect(() => { load(); }, [load]);

    // Upgrade finished while the page is open — refetch to apply.
    useEffect(() => {
        if (data?.facility?.upgrade && upgradeCountdown.done) {
            const t = setTimeout(() => { load(); reloadGym(); }, 1500);
            return () => clearTimeout(t);
        }
    }, [data, upgradeCountdown.done, load, reloadGym]);

    async function act(fn) {
        setBusy(true);
        setError(null);
        try {
            await fn();
            await load();
            reloadGym();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    if (!data && !error) return <p style={{ color: "var(--ink-secondary)" }}>Loading the gym…</p>;
    if (!data) return <div className="form-error">{error}</div>;

    const { facility, staff, mentoring } = data;
    const coach = staff.find((s) => s.role === "coach");
    const scout = staff.find((s) => s.role === "scout");
    const activePairs = mentoring.pairs.filter((p) => p.status === "active");
    const pastPairs = mentoring.pairs.filter((p) => p.status !== "active");
    const mentors = mentoring.candidates.filter((c) => c.age >= mentoring.mentorMinAge);

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h1 className="page-title">Gym</h1>
                <div style={{ display: "flex", gap: 14, fontSize: 12 }}>
                    <span style={{ color: "var(--ink-secondary)" }}>Reputation <strong className="mono" style={{ color: "var(--ink)" }}>{data.reputation}</strong></span>
                    <span style={{ color: "var(--ink-secondary)" }}>Legacy <strong className="mono" style={{ color: "var(--gold)" }}>{data.legacyScore}</strong></span>
                </div>
            </div>
            {error && <div className="form-error">{error}</div>}

            <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                {/* Facility */}
                <div className="card">
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <div className="section-label" style={{ margin: 0 }}>Facility — {facility.spec.label}</div>
                        {facility.upgrade && <TimerBadge value={upgradeCountdown.text || "…"} size="sm" label="Upgrading" complete={upgradeCountdown.done} />}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-secondary)", display: "flex", gap: 14, flexWrap: "wrap" }}>
                        <span>{facility.spec.rosterSlots} roster slots</span>
                        <span>{2 + facility.spec.scoutBonus} scouts/day</span>
                        {facility.spec.fatigueRecoveryMult > 1 && <span>+{Math.round((facility.spec.fatigueRecoveryMult - 1) * 100)}% recovery</span>}
                        <span>{facility.spec.mentoringCapacity} mentoring pair{facility.spec.mentoringCapacity === 1 ? "" : "s"}</span>
                    </div>
                    {facility.nextTier && !facility.upgrade && (
                        <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                            <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                                Next: <strong style={{ color: "var(--ink)" }}>{facility.nextTier.label}</strong> — ${facility.nextTier.cost.toLocaleString()} · {facility.nextTier.upgradeWeeks} game-weeks
                                {facility.nextTier.winMilestone && (
                                    <span style={{ color: facility.nextTier.winMilestoneMet ? "var(--win)" : "var(--warn)" }}>
                                        {" "}· {facility.nextTier.gymWins}/{facility.nextTier.winMilestone} wins
                                    </span>
                                )}
                            </div>
                            <Button variant="primary" size="sm" disabled={busy} onClick={() => act(() => api("/gyms/upgrade", { method: "POST" }))}>
                                Start upgrade
                            </Button>
                        </div>
                    )}
                </div>

                {/* Staff */}
                <div className="card">
                    <div className="section-label">Staff</div>
                    {[coach, scout].map((s, i) => s && (
                        <div key={s.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: "1px solid var(--line)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                                <div>
                                    <span style={{ fontSize: 13, fontWeight: 600 }}>{s.name}</span>
                                    <span style={{ fontSize: 11, color: TRAIT_QUALITY_COLORS[s.quality], marginLeft: 6, textTransform: "capitalize" }}>{s.quality} {s.role}</span>
                                    {s.specialty && <span style={{ fontSize: 11, color: "var(--ink-muted)", marginLeft: 6 }}>· {s.specialty} specialist</span>}
                                </div>
                                <Button variant="ghost" size="sm" disabled={busy} onClick={() => act(() => api(`/gyms/staff/${s.id}`, { method: "DELETE" }))}>Release</Button>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                                {s.role === "coach" ? (
                                    <>
                                        <AttrRow label="Motivation" value={s.motivation} />
                                        <AttrRow label="Tactical IQ" value={s.tacticalIq} />
                                        <AttrRow label="Prospect Dev" value={s.prospectDev} />
                                    </>
                                ) : (
                                    <AttrRow label="Accuracy" value={s.accuracy} />
                                )}
                            </div>
                        </div>
                    ))}
                    <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}>Today's market{!coach || !scout ? "" : " (roles filled)"}:</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        {market.filter((c) => (c.role === "coach" ? !coach : !scout)).map((c) => (
                            <div key={c.candidateId} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 8px", background: "var(--surface-sunken)", borderRadius: "var(--radius-md)" }}>
                                <div style={{ flex: 1, fontSize: 12 }}>
                                    <strong>{c.name}</strong>
                                    <span style={{ color: TRAIT_QUALITY_COLORS[c.quality], marginLeft: 5, textTransform: "capitalize" }}>{c.quality} {c.role}</span>
                                    <span style={{ color: "var(--ink-muted)", marginLeft: 5 }}>
                                        {c.role === "coach" ? `Mot ${c.motivation} · IQ ${c.tacticalIq} · Dev ${c.prospectDev} · ${c.specialty}` : `Accuracy ${c.accuracy}`}
                                    </span>
                                </div>
                                <span className="mono" style={{ fontSize: 12 }}>${c.fee.toLocaleString()}</span>
                                <Button variant="tint" size="sm" disabled={busy} onClick={() => act(() => api("/gyms/staff/hire", { method: "POST", body: { candidateId: c.candidateId } }))}>Hire</Button>
                            </div>
                        ))}
                        {market.filter((c) => (c.role === "coach" ? !coach : !scout)).length === 0 && (
                            <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>Both roles filled — release someone to browse the market.</span>
                        )}
                    </div>
                </div>

                {/* Mentoring */}
                <div className="card">
                    <div className="section-label">Mentoring — {activePairs.length}/{mentoring.capacity} pairs</div>
                    {activePairs.map((p) => (
                        <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--ember-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 8 }}>
                            <div style={{ fontSize: 12 }}>
                                <strong>{p.mentorName}</strong> is mentoring <strong>{p.juniorName}</strong>
                                <span style={{ color: "var(--ink-muted)" }}> · {p.compatible ? "same family — smooth" : "cross-family — slower"}</span>
                            </div>
                            <span className="mono" style={{ fontSize: 11, color: "var(--ember-strong)" }}>
                                {Math.max(0, Math.ceil((new Date(p.endsAt) - Date.now()) / 86400000))}d left
                            </span>
                        </div>
                    ))}
                    {activePairs.length < mentoring.capacity && (
                        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={mentorPick} onChange={(e) => setMentorPick(e.target.value)} style={{ flex: 1, minWidth: 130, padding: "7px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: "var(--radius-md)", background: "var(--surface)" }}>
                                <option value="">Mentor (age {mentoring.mentorMinAge}+)…</option>
                                {mentors.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.age} · {CLASS_SHORT[c.weightClass]}</option>)}
                            </select>
                            <select value={juniorPick} onChange={(e) => setJuniorPick(e.target.value)} style={{ flex: 1, minWidth: 130, padding: "7px 8px", fontSize: 12, border: "1px solid var(--line)", borderRadius: "var(--radius-md)", background: "var(--surface)" }}>
                                <option value="">Junior…</option>
                                {mentoring.candidates.filter((c) => c.id !== mentorPick).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.age} · {CLASS_SHORT[c.weightClass]}</option>)}
                            </select>
                            <Button variant="primary" size="sm" disabled={busy || !mentorPick || !juniorPick}
                                onClick={() => act(async () => { await api("/gyms/mentoring", { method: "POST", body: { mentorId: mentorPick, juniorId: juniorPick } }); setMentorPick(""); setJuniorPick(""); })}>
                                Pair up
                            </Button>
                        </div>
                    )}
                    {mentors.length === 0 && activePairs.length === 0 && (
                        <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "6px 0 0" }}>
                            No fighter is {mentoring.mentorMinAge}+ yet — mentors need the miles. A veteran's last camps can pass a trait to whoever replaces them.
                        </p>
                    )}
                    {pastPairs.length > 0 && (
                        <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                            {pastPairs.map((p) => (
                                <div key={p.id} style={{ fontSize: 11, color: p.status === "succeeded" ? "var(--win)" : "var(--ink-muted)", marginBottom: 2 }}>
                                    {p.status === "succeeded"
                                        ? `${p.mentorName} passed ${p.trait} to ${p.juniorName}`
                                        : `${p.mentorName} × ${p.juniorName} — the lessons didn't stick`}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Hall of Fame */}
                <div className="card">
                    <div className="section-label">Hall of Fame</div>
                    {hof.length === 0 ? (
                        <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0 }}>
                            Empty for now. Every fighter who retires out of this gym gets a plaque — their record outlives their career.
                        </p>
                    ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                            {hof.map((f) => (
                                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 10, background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px" }}>
                                    <span style={{ color: "var(--gold)" }} aria-hidden="true">◆</span>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontFamily: "var(--font-display)", fontSize: 13, textTransform: "uppercase" }}>{f.name}</div>
                                        <div style={{ fontSize: 11, color: "var(--ink-secondary)" }}>
                                            {f.regionLabel} · {CLASS_SHORT[f.weightClass]} · {new Date(f.signedAt).getFullYear()}–{new Date(f.retiredAt).getFullYear()}
                                        </div>
                                    </div>
                                    <span className="mono" style={{ fontSize: 12 }}>{f.record.wins}–{f.record.losses}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
