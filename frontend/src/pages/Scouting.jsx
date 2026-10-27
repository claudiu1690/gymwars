import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ds/Button.jsx";
import { ScoutReport } from "../components/ds/ScoutReport.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { WeightClassChip } from "../components/ds/WeightClassChip.jsx";
import { StyleBadge } from "../components/ds/StyleBadge.jsx";
import { useCountdown } from "../hooks/useCountdown";
import { useAuth } from "../auth";

/**
 * Scouting board — a daily rotating slate of shallow prospects. Spending an
 * attempt investigates one, producing the full report (rarity reveal + noisy
 * ranges). The decision moves BEFORE the spend: which prospect deserves your
 * scout today?
 */
export default function Scouting() {
    const { reloadGym } = useAuth();
    const [state, setState] = useState(null);
    const [error, setError] = useState(null);
    const [busy, setBusy] = useState(false);
    const refresh = useCountdown(state?.refreshAt);

    const load = useCallback(async () => {
        try {
            setState(await api("/scouting/state"));
        } catch (err) {
            setError(err.message);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    async function investigate(slot) {
        setBusy(true);
        setError(null);
        try {
            await api("/scouting/investigate", { method: "POST", body: { slot } });
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    async function resolve(id, action) {
        setError(null);
        try {
            await api(`/scouting/reports/${id}/${action}`, { method: "POST" });
            await Promise.all([load(), reloadGym()]);
        } catch (err) {
            setError(err.message);
        }
    }

    if (!state && !error) return <p style={{ color: "var(--ink-secondary)" }}>Loading scouting network…</p>;

    const attemptsLeft = state ? state.attemptsTotal - state.attemptsUsed : 0;
    const rosterFull = state && state.rosterCount >= state.rosterSlots;
    const pity = state?.pity?.contender;

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h1 className="page-title">Scouting</h1>
                {state && <TimerBadge value={refresh.text || "…"} size="sm" label="New board" />}
            </div>

            {error && <div className="form-error">{error}</div>}

            {state && (
                <div className="card" style={{ padding: 12, marginBottom: "var(--space-4)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <div>
                            <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                                {Array.from({ length: state.attemptsTotal }, (_, i) => (
                                    <div key={i} style={{ width: 10, height: 10, borderRadius: "50%", background: i < state.attemptsUsed ? "var(--ember)" : "var(--line)" }} />
                                ))}
                            </div>
                            <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                                {attemptsLeft} scout{attemptsLeft === 1 ? "" : "s"} available today — spend them on the board below
                            </div>
                            {pity && (
                                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                    Guaranteed Contender+ within {pity.remaining} scout{pity.remaining === 1 ? "" : "s"}
                                </div>
                            )}
                        </div>
                    </div>
                    {rosterFull && (
                        <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                            Roster full ({state.rosterCount}/{state.rosterSlots}) — you can still scout, but signing needs a free slot.
                        </div>
                    )}
                </div>
            )}

            {/* The board */}
            {state?.board && (
                <div style={{ marginBottom: "var(--space-4)" }}>
                    <div className="section-label">Today's Board</div>
                    <div className="stagger" style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))" }}>
                        {state.board.map((p) => (
                            <div key={p.slot} className="card" style={{ padding: 12, opacity: p.investigated && p.reportStatus !== "pending" ? 0.55 : 1 }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, textTransform: "uppercase", letterSpacing: "0.03em", marginBottom: 6 }}>
                                    {p.name}
                                </div>
                                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 6 }}>
                                    <WeightClassChip weightClass={p.weightClass} />
                                    <StyleBadge style={p.styleLean} />
                                </div>
                                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 10 }}>
                                    {p.regionLabel} · Age {p.age}
                                </div>
                                {p.investigated ? (
                                    <div style={{ fontSize: 11, fontWeight: 600, color: p.reportStatus === "pending" ? "var(--ember-strong)" : "var(--ink-muted)" }}>
                                        {p.reportStatus === "pending" ? "Report below ↓" : p.reportStatus === "signed" ? "Signed" : "Passed"}
                                    </div>
                                ) : (
                                    <Button variant="tint" size="sm" disabled={busy || attemptsLeft <= 0} onClick={() => investigate(p.slot)}>
                                        {attemptsLeft > 0 ? "Send scout" : "No scouts left"}
                                    </Button>
                                )}
                            </div>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>
                        The board turns over daily. Stats and rarity stay unknown until a scout takes a look.
                    </p>
                </div>
            )}

            {/* Pending reports */}
            {state?.reports?.length > 0 && (
                <div>
                    <div className="section-label">Reports on the Desk</div>
                    <div className="stagger" style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {state.reports.map((r) => (
                            <ScoutReport
                                key={r.id}
                                region={`${r.name} — ${r.regionLabel}`}
                                styleLean={r.styleLean}
                                rarityRevealed
                                rarityTier={r.rarity}
                                statRanges={r.statRanges}
                                pityCount={pity?.count ?? 0}
                                pityMax={pity?.threshold ?? 20}
                                guaranteedTier="Contender+"
                                onSign={() => resolve(r.id, "sign")}
                                onPass={() => resolve(r.id, "pass")}
                            />
                        ))}
                    </div>
                </div>
            )}
        </>
    );
}
