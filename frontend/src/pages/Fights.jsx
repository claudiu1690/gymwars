import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { formatRemaining } from "../hooks/useCountdown";
import PvpHub from "../components/PvpHub.jsx";

/** Fights index — the Gym Wars hub, upcoming bouts, and results. */
export default function Fights() {
    const [fights, setFights] = useState(null);
    const [fighters, setFighters] = useState([]);
    const [pvpEvents, setPvpEvents] = useState([]);

    useEffect(() => {
        api("/fights").then((d) => setFights(d.fights)).catch(() => setFights([]));
        api("/fighters").then((d) => setFighters(d.fighters)).catch(() => {});
        api("/pvp/events").then((d) => setPvpEvents(d.events)).catch(() => {});
        const t = setInterval(() => {
            api("/fights").then((d) => setFights(d.fights)).catch(() => {});
            api("/pvp/events").then((d) => setPvpEvents(d.events)).catch(() => {});
        }, 15000);
        return () => clearInterval(t);
    }, []);

    if (fights === null) {
        return <p style={{ color: "var(--night-muted)", padding: "24px 16px" }}>Loading fight card…</p>;
    }

    const upcoming = fights.filter((f) => f.status === "scheduled");
    const past = fights.filter((f) => f.status === "resolved");

    return (
        <div style={{ padding: "16px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 18, color: "var(--night-text)", margin: "0 0 14px" }}>Fights</h1>

            <PvpHub fighters={fighters} />

            {pvpEvents.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Gym War History</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pvpEvents.map((e) => {
                            const won = e.winner === "you";
                            const draw = e.winner === "draw";
                            return (
                                <Link key={e.id} to={`/pvp/${e.id}`} style={{ textDecoration: "none" }}>
                                    <div style={{ background: "var(--night-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--night-line)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{
                                            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, flexShrink: 0,
                                            color: draw ? "var(--night-muted)" : won ? "var(--win)" : "var(--corner-red)",
                                            border: `1.5px solid ${draw ? "var(--night-line)" : won ? "var(--win)" : "var(--corner-red)"}`,
                                            borderRadius: "var(--radius-chip)", padding: "2px 8px",
                                        }}>
                                            {draw ? "D" : won ? "W" : "L"}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--night-text)" }}>
                                                {e.type === "gymwar" ? "Gym War" : "Callout"} {e.role === "attacker" ? "vs" : "from"} {e.them}
                                                {e.revengeOf && <span style={{ color: "var(--ember)", fontSize: 10, marginLeft: 6 }}>REVENGE</span>}
                                            </div>
                                            <div className="mono" style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 1 }}>
                                                {e.tally.you}–{e.tally.them} · {e.ratingDelta >= 0 ? "+" : ""}{e.ratingDelta} rating
                                            </div>
                                        </div>
                                        <span className="mono" style={{ fontSize: 11, color: e.purseDelta >= 0 ? "var(--win)" : "var(--corner-red)", flexShrink: 0 }}>
                                            {e.purseDelta >= 0 ? "+" : "−"}${Math.abs(e.purseDelta)}
                                        </span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}

            {upcoming.length === 0 && past.length === 0 && pvpEvents.length === 0 && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--night-muted)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--night-text)" }}>No fights yet</div>
                    <p style={{ fontSize: 13 }}>Book a fight from a fighter's page — results land here.</p>
                </div>
            )}

            {upcoming.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Upcoming</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {upcoming.map((f) => (
                            <div key={f.id} style={{ background: "var(--night-surface)", borderRadius: "var(--radius-lg)", border: `1px solid ${f.title ? "var(--gold)" : "var(--night-line)"}`, padding: 14 }}>
                                {f.title && <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--gold)", marginBottom: 6 }}>TITLE FIGHT</div>}
                                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16 }}>
                                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--ember)", textTransform: "uppercase" }}>{f.you.name}</span>
                                    <span style={{ fontFamily: "var(--font-display)", fontSize: 11, color: "var(--night-muted)" }}>VS</span>
                                    <span style={{ fontFamily: "var(--font-display)", fontSize: 15, color: "var(--corner-red)", textTransform: "uppercase" }}>{f.them.name}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--night-line)", fontSize: 11, color: "var(--night-muted)" }}>
                                    <span>{f.them.gym} · {f.tier} · {f.rounds} rds</span>
                                    <span className="mono" style={{ color: "var(--ember)" }}>{formatRemaining(new Date(f.scheduledAt).getTime() - Date.now())}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {past.length > 0 && (
                <div>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Results</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {past.map((f) => {
                            const won = f.result.winner === "you";
                            const draw = f.result.winner === "draw";
                            return (
                                <Link key={f.id} to={`/fights/${f.id}`} style={{ textDecoration: "none" }}>
                                    <div style={{ background: "var(--night-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--night-line)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
                                        <span style={{
                                            fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 600, flexShrink: 0,
                                            color: draw ? "var(--night-muted)" : won ? "var(--win)" : "var(--corner-red)",
                                            border: `1.5px solid ${draw ? "var(--night-line)" : won ? "var(--win)" : "var(--corner-red)"}`,
                                            borderRadius: "var(--radius-chip)", padding: "2px 8px",
                                        }}>
                                            {draw ? "D" : won ? "W" : "L"}
                                        </span>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--night-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {f.you.name} vs {f.them.name}
                                                {f.title && <span style={{ color: "var(--gold)", marginLeft: 6, fontSize: 11 }}>◆ title</span>}
                                            </div>
                                            <div style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 1 }} className="mono">
                                                {f.result.method} · R{f.result.round} {f.result.time}
                                            </div>
                                        </div>
                                        <span className="mono" style={{ fontSize: 11, color: "var(--win)", flexShrink: 0 }}>${(f.purse ?? 0).toLocaleString()}</span>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}
