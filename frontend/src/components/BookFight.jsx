import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "./ds/Button.jsx";

const NOTICE = [
    { key: "1", weeks: 1, label: "Rush it", detail: "fight in 1 game-week" },
    { key: "4", weeks: 4, label: "Standard notice", detail: "fight in 4 game-weeks" },
    { key: "6", weeks: 6, label: "Long buildup", detail: "fight in 6 game-weeks" },
];
const ROOKIE_NOTICE = { key: "rush", rush: true, label: "Small hall show", detail: "tonight — hours out" };

const TIER_LABELS = { regional: "Regional", national: "National", contender: "Contender", title: "Championship" };
const STYLE_LABELS = { boxing: "Boxing", "muay-thai": "Muay Thai", wrestling: "Wrestling", judo: "Judo", bjj: "BJJ", sambo: "Sambo" };

/**
 * Fight booking as a two-step negotiation (GDD §8): matchmaking proposes an
 * opponent, the manager signs only if they like the matchup. Passing is
 * rationed per day so nobody re-rolls into a soft touch. The notice period
 * chosen at signing is the camp window.
 */
export default function BookFight({ fighter, onBooked }) {
    const { gym } = useAuth();
    const rookie = gym?.rookie?.active;
    const noticeOptions = rookie ? [ROOKIE_NOTICE, ...NOTICE] : NOTICE;
    const [offer, setOffer] = useState(null);
    const [passesLeft, setPassesLeft] = useState(null);
    const [notice, setNotice] = useState(rookie ? "rush" : "4");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        api(`/fights/offer/${fighter.id}`)
            .then((d) => { setOffer(d.offer); setPassesLeft(d.passesLeft); })
            .catch(() => {});
    }, [fighter.id]);

    async function run(fn) {
        setBusy(true);
        setError(null);
        try {
            await fn();
        } catch (err) {
            setError(err.message);
        } finally {
            setBusy(false);
        }
    }

    const findOpponent = () => run(async () => {
        const d = await api("/fights/offer", { method: "POST", body: { fighterId: fighter.id } });
        setOffer(d.offer);
        setPassesLeft(d.passesLeft);
    });

    const pass = () => run(async () => {
        const d = await api("/fights/offer/pass", { method: "POST", body: { fighterId: fighter.id } });
        setOffer(d.offer);
        setPassesLeft(d.passesLeft);
    });

    const accept = () => run(async () => {
        const picked = noticeOptions.find((n) => n.key === notice);
        const body = picked?.rush
            ? { fighterId: fighter.id, rush: true }
            : { fighterId: fighter.id, weeks: picked?.weeks ?? 4 };
        await api("/fights/book", { method: "POST", body });
        onBooked();
    });

    return (
        <div className="card">
            <div className="section-label">Next Fight</div>
            {error && <div className="form-error">{error}</div>}

            {fighter.titleShot && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 10 }}>
                    Title shot earned — matchmaking will put the champion on the table.
                </div>
            )}
            {fighter.isChampion && (
                <div style={{ fontSize: 12, fontWeight: 600, color: "var(--gold)", background: "var(--gold-tint)", borderRadius: "var(--radius-md)", padding: "8px 10px", marginBottom: 10 }}>
                    Champion — every offer is a 5-round title defense.
                </div>
            )}

            {!offer ? (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                        No bout on the table. Matchmaking proposes an opponent — you sign only if you like the matchup.
                    </span>
                    <Button variant="primary" size="sm" disabled={busy} onClick={findOpponent}>
                        {busy ? "Matching…" : "Find opponent"}
                    </Button>
                </div>
            ) : (
                <div className="anim-pop">
                    {/* The offer — who's across the cage */}
                    <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "12px 14px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: offer.title ? "var(--gold)" : "var(--ink-muted)" }}>
                                {offer.title ? "◆ " : ""}{TIER_LABELS[offer.tier] || offer.tier} · {offer.rounds} rounds
                            </span>
                            <span className="mono" style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                                win <span style={{ color: "var(--win)", fontWeight: 600 }}>${offer.purse.win.toLocaleString()}</span>
                                {" · "}show <span style={{ fontWeight: 600 }}>${offer.purse.lose.toLocaleString()}</span>
                            </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
                            <div style={{ flex: 1, textAlign: "right" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--ember-strong)", textTransform: "uppercase", lineHeight: 1.1 }}>{fighter.name}</div>
                                <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>{fighter.record.wins}–{fighter.record.losses}</div>
                            </div>
                            <span style={{ fontFamily: "var(--font-display)", fontSize: 12, color: "var(--ink-muted)" }}>VS</span>
                            <div style={{ flex: 1, textAlign: "left" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 16, color: "var(--corner-red)", textTransform: "uppercase", lineHeight: 1.1 }}>
                                    {offer.opponent.name}{offer.opponent.isChampion ? <span style={{ color: "var(--gold)" }}> ◆</span> : null}
                                </div>
                                <div className="mono" style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>
                                    {offer.opponent.record.wins}–{offer.opponent.record.losses}
                                </div>
                                <div style={{ fontSize: 11, color: "var(--ink-secondary)", marginTop: 2 }}>
                                    {STYLE_LABELS[offer.opponent.style] || offer.opponent.style} · Age {offer.opponent.age} · {offer.opponent.gym}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Notice period — this is the camp window */}
                    <div style={{ fontSize: 11, color: "var(--ink-secondary)", margin: "12px 0 6px" }}>
                        Pick the date. The notice period is your camp window — longer notice, longer camp.
                        {rookie && " Amateur circuit: same-day shows are on the table."}
                    </div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        {noticeOptions.map((n) => (
                            <button
                                key={n.key}
                                onClick={() => setNotice(n.key)}
                                className="pressable"
                                style={{
                                    flex: 1, minWidth: 110, padding: "8px 6px", cursor: "pointer", textAlign: "center",
                                    background: notice === n.key ? "var(--ember-tint)" : "transparent",
                                    border: `1.5px solid ${notice === n.key ? "var(--ember)" : "var(--line)"}`,
                                    borderRadius: "var(--radius-md)",
                                }}
                            >
                                <div style={{ fontSize: 12, fontWeight: 600, color: notice === n.key ? "var(--ember-strong)" : "var(--ink)" }}>{n.label}</div>
                                <div style={{ fontSize: 10, color: "var(--ink-muted)", marginTop: 2 }}>{n.detail}</div>
                            </button>
                        ))}
                    </div>

                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <Button variant="primary" size="sm" disabled={busy} onClick={accept}>
                            {busy ? "Signing…" : "Accept bout"}
                        </Button>
                        <Button variant="ghost" size="sm" disabled={busy || passesLeft <= 0} onClick={pass}>
                            Pass{passesLeft != null ? ` (${passesLeft} left today)` : ""}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
