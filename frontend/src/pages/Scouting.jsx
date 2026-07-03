import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { Button } from "../components/ds/Button.jsx";
import { ScoutReport } from "../components/ds/ScoutReport.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { useCountdown } from "../hooks/useCountdown";
import { useAuth } from "../auth";

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

    async function doScout() {
        setBusy(true);
        setError(null);
        try {
            await api("/scouting/scout", { method: "POST" });
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
                {state && <TimerBadge value={refresh.text || "…"} size="sm" label="Refresh" />}
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
                                {state.attemptsUsed} of {state.attemptsTotal} attempts used
                            </div>
                            {pity && (
                                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                    Guaranteed Contender+ within {pity.remaining} scout{pity.remaining === 1 ? "" : "s"}
                                </div>
                            )}
                        </div>
                        <Button variant="primary" size="sm" disabled={busy || attemptsLeft <= 0} onClick={doScout}>
                            {attemptsLeft > 0 ? "Scout Now" : "No attempts left"}
                        </Button>
                    </div>
                    {rosterFull && (
                        <div style={{ fontSize: 12, color: "var(--warn)", marginTop: 8, paddingTop: 8, borderTop: "1px solid var(--line)" }}>
                            Roster full ({state.rosterCount}/{state.rosterSlots}) — you can still scout, but signing needs a free slot.
                        </div>
                    )}
                </div>
            )}

            {state?.reports?.length > 0 && (
                <div>
                    <div className="section-label">Pending Reports</div>
                    <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                        {state.reports.map((r) => (
                            <ScoutReport
                                key={r.id}
                                region={r.regionLabel}
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

            {state && state.reports.length === 0 && (
                <div className="card empty-state">
                    <div className="display">No pending reports</div>
                    <p style={{ margin: 0, fontSize: 13 }}>
                        {attemptsLeft > 0 ? "Run a scout to find your next prospect." : `Your scouts are out until the refresh — back in ${refresh.text || "a while"}.`}
                    </p>
                </div>
            )}
        </>
    );
}
