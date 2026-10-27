import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { formatRemaining } from "../hooks/useCountdown";
import PvpHub from "../components/PvpHub.jsx";

/** Two worlds, one screen, never mixed: Career (your fighters vs the AI
 *  ladder — records and belts) and Rival Gyms (async PvP vs other managers —
 *  rating and purse). A segmented switch keeps the mental models apart. */
const TABS = [
    { key: "career", label: "Career", sub: "vs the ladder" },
    { key: "rivals", label: "Rival Gyms", sub: "vs managers" },
];

export default function Fights() {
    const [tab, setTab] = useState("career");
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

    const careerEmpty = upcoming.length === 0 && past.length === 0;

    return (
        <div className="stagger" style={{ padding: "16px" }}>
            <h1 style={{ fontFamily: "var(--font-display)", textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 18, color: "var(--night-text)", margin: "0 0 12px" }}>Fights</h1>

            {/* World switch — Career (PvE) vs Rival Gyms (PvP) */}
            <div style={{ display: "flex", gap: 6, marginBottom: 8, background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-lg)", padding: 4 }}>
                {TABS.map((t) => (
                    <button
                        key={t.key}
                        onClick={() => setTab(t.key)}
                        className="pressable"
                        style={{
                            flex: 1, padding: "8px 6px", cursor: "pointer", textAlign: "center", border: "none",
                            background: tab === t.key ? "var(--ember)" : "transparent",
                            borderRadius: "var(--radius-md)",
                        }}
                    >
                        <div style={{ fontSize: 13, fontWeight: 700, color: tab === t.key ? "#fff" : "var(--night-muted)" }}>{t.label}</div>
                        <div style={{ fontSize: 10, color: tab === t.key ? "rgba(255,255,255,0.75)" : "var(--night-muted)", marginTop: 1 }}>{t.sub}</div>
                    </button>
                ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--night-muted)", margin: "0 0 14px" }}>
                {tab === "career"
                    ? "The ladder — your fighters vs AI-run gyms. Wins, records, rankings, and belts live here."
                    : "Other managers' gyms. Attacks resolve instantly — their saved defense fights for them. Stakes: rating and purse, never records."}
            </p>

            {tab === "rivals" && <PvpHub fighters={fighters} />}

            {tab === "rivals" && pvpEvents.length === 0 && (
                <div style={{ textAlign: "center", padding: "32px 24px", color: "var(--night-muted)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 18, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--night-text)" }}>No beefs yet</div>
                    <p style={{ fontSize: 13 }}>Call out a rival fighter or start a Gym War above — results land here.</p>
                </div>
            )}

            {tab === "rivals" && pvpEvents.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Raid History</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {pvpEvents.map((e) => {
                            const won = e.winner === "you";
                            const draw = e.winner === "draw";
                            return (
                                <Link key={e.id} to={`/pvp/${e.id}`} style={{ textDecoration: "none" }}>
                                    <div className="card-lift" style={{ background: "var(--night-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--night-line)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
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

            {tab === "career" && careerEmpty && (
                <div style={{ textAlign: "center", padding: "48px 24px", color: "var(--night-muted)" }}>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 20, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--night-text)" }}>No fights yet</div>
                    <p style={{ fontSize: 13 }}>Book a fight or spar from a fighter's page — results land here.</p>
                </div>
            )}

            {tab === "career" && upcoming.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Upcoming Ladder Fights</div>
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
                                <div style={{ fontSize: 10, color: "var(--night-muted)", marginTop: 6 }}>
                                    The notice window is camp time — train and taper before it resolves. Sparring pays out instantly while you wait.
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {tab === "career" && past.length > 0 && (
                <div>
                    <div style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)", marginBottom: 8 }}>Results</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        {past.map((f) => {
                            const won = f.result.winner === "you";
                            const draw = f.result.winner === "draw";
                            return (
                                <Link key={f.id} to={`/fights/${f.id}`} style={{ textDecoration: "none" }}>
                                    <div className="card-lift" style={{ background: "var(--night-surface)", borderRadius: "var(--radius-md)", border: "1px solid var(--night-line)", padding: "10px 12px", display: "flex", alignItems: "center", gap: 10 }}>
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
                                                {f.exhibition && <span style={{ color: "var(--night-muted)", marginLeft: 6, fontSize: 10, letterSpacing: "0.06em" }}>SPAR</span>}
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
