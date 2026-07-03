import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";

const CLASS_LABELS = { featherweight: "Featherweight", lightweight: "Lightweight", middleweight: "Middleweight", heavyweight: "Heavyweight" };

/** Gym War / Callout result — card tally + per-bout logs on the night surface. */
export default function PvpEvent() {
    const { id } = useParams();
    const [event, setEvent] = useState(null);
    const [error, setError] = useState(null);
    const [openBout, setOpenBout] = useState(0);

    useEffect(() => {
        api(`/pvp/events/${id}`).then((d) => setEvent(d.event)).catch((e) => setError(e.message));
    }, [id]);

    if (error) return <div style={{ padding: 16 }}><div className="form-error">{error}</div></div>;
    if (!event) return <p style={{ color: "var(--night-muted)", padding: "24px 16px" }}>Loading result…</p>;

    const won = event.winner === "you";
    const draw = event.winner === "draw";

    return (
        <div style={{ padding: "0 0 20px" }}>
            <div style={{ textAlign: "center", padding: "22px 16px 14px" }}>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--night-muted)", marginBottom: 14 }}>
                    {event.type === "gymwar" ? "Gym War" : "Callout"}{event.revengeOf ? " · Revenge" : ""} · {event.role === "attacker" ? "You attacked" : "You were attacked"}
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
                    <div style={{ flex: 1, textAlign: "right" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--ember)", textTransform: "uppercase", lineHeight: 1.1 }}>{event.you}</div>
                    </div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 26, color: "var(--night-text)", flexShrink: 0 }} className="mono">
                        {event.tally.you}–{event.tally.them}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                        <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color: "var(--corner-red)", textTransform: "uppercase", lineHeight: 1.1 }}>{event.them}</div>
                    </div>
                </div>
                <div style={{ marginTop: 10, fontFamily: "var(--font-display)", fontSize: 22, letterSpacing: "0.04em", textTransform: "uppercase", color: draw ? "var(--night-text)" : won ? "var(--win)" : "var(--corner-red)" }}>
                    {draw ? "DRAW" : won ? "VICTORY" : "DEFEAT"}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 8 }}>
                    <span className="mono" style={{ fontSize: 13, color: event.ratingDelta >= 0 ? "var(--win)" : "var(--corner-red)" }}>
                        {event.ratingDelta >= 0 ? "+" : ""}{event.ratingDelta} rating
                    </span>
                    <span className="mono" style={{ fontSize: 13, color: event.purseDelta >= 0 ? "var(--win)" : "var(--corner-red)" }}>
                        {event.purseDelta >= 0 ? "+" : "−"}${Math.abs(event.purseDelta).toLocaleString()}
                    </span>
                </div>
            </div>

            {/* Card */}
            <div style={{ margin: "0 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {event.bouts.map((b, i) => (
                    <div key={i} style={{ background: "var(--night-surface)", borderRadius: "var(--radius-lg)", border: "1px solid var(--night-line)", padding: 12 }}>
                        <button onClick={() => setOpenBout(openBout === i ? -1 : i)} style={{ width: "100%", background: "none", border: "none", cursor: "pointer", padding: 0, textAlign: "left" }}>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                                <span style={{ fontSize: 10, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.08em", color: "var(--night-muted)" }}>{CLASS_LABELS[b.weightClass]}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: b.winner === "you" ? "var(--win)" : b.winner === "them" ? "var(--corner-red)" : "var(--night-muted)" }}>
                                    {b.forfeit ? (b.forfeit === "them" ? "WIN · FORFEIT" : "LOSS · FORFEIT") : b.winner === "you" ? "WIN" : b.winner === "them" ? "LOSS" : "DRAW"}
                                </span>
                            </div>
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 6 }}>
                                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--ember)", textTransform: "uppercase", textAlign: "right", flex: 1 }}>
                                    {b.you ? b.you.name : "No fighter"}
                                </span>
                                <span style={{ fontSize: 10, color: "var(--night-muted)" }}>VS</span>
                                <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--corner-red)", textTransform: "uppercase", textAlign: "left", flex: 1 }}>
                                    {b.them ? b.them.name : "No fighter"}
                                </span>
                            </div>
                            {!b.forfeit && (
                                <div className="mono" style={{ textAlign: "center", fontSize: 11, color: "var(--night-muted)", marginTop: 4 }}>
                                    {b.method} · R{b.round} {b.time}
                                </div>
                            )}
                        </button>
                        {openBout === i && b.log?.length > 0 && (
                            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--night-line)", display: "flex", flexDirection: "column", gap: 4 }}>
                                {b.log.map((e, j) => (
                                    <div key={j} style={{ display: "flex", gap: 8, background: e.finish ? "rgba(255,90,41,0.1)" : "transparent", borderRadius: e.finish ? 4 : 0, padding: e.finish ? "3px 5px" : 0 }}>
                                        <span className="mono" style={{ fontSize: 11, color: "var(--night-muted)", flexShrink: 0 }}>R{e.round} {e.time}</span>
                                        <span className="mono" style={{ fontSize: 11, fontWeight: e.finish ? 600 : 400, color: e.actor === "you" ? "var(--ember)" : e.actor === "them" ? "var(--corner-red)" : "var(--night-muted)" }}>{e.text}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            <div style={{ margin: "16px 16px 0" }}>
                <Link to="/fights" style={{ fontSize: 13, color: "var(--ember)", textDecoration: "none", fontWeight: 600 }}>← All fights</Link>
            </div>
        </div>
    );
}
