import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { api } from "../api";

/**
 * Live Fight — the Model B payoff. You read the opponent, pick an opening game
 * plan, watch each round stream blow-by-blow, and make between-round corner
 * calls that swing the next round. The fight is something you play, not a log
 * you're handed.
 */

const PLAN = {
    approach: { label: "Approach", opts: [["strike", "Strike"], ["balanced", "Balanced"], ["grapple", "Grapple"]] },
    pace:     { label: "Pace",     opts: [["high", "Push"], ["measured", "Measured"], ["cautious", "Conserve"]] },
    finish:   { label: "Intent",   opts: [["hunt-finish", "Hunt finish"], ["play-safe", "Play safe"]] },
};

const REVEAL_MS = 620;      // base beat between blow-by-blow lines
const FINISH_HOLD_MS = 900; // extra hold after a finish

export default function LiveFight() {
    const { fighterId } = useParams();
    const navigate = useNavigate();

    const [card, setCard] = useState(null);          // { fightId, you, them }
    const [error, setError] = useState(null);
    const [plan, setPlan] = useState({ approach: "balanced", pace: "measured", finish: "hunt-finish" });

    const [phase, setPhase] = useState("prefight");  // prefight | streaming | corner | done
    const [roundNo, setRoundNo] = useState(0);
    const [shown, setShown] = useState([]);          // events revealed so far this round
    const [snapshot, setSnapshot] = useState({ A: { health: 100, gas: 100 }, B: { health: 100, gas: 100 } });
    const [options, setOptions] = useState([]);
    const [result, setResult] = useState(null);
    const timers = useRef([]);

    useEffect(() => {
        api("/livefight/start", { method: "POST", body: { fighterId } })
            .then(setCard)
            .catch((e) => setError(e.message));
        return () => timers.current.forEach(clearTimeout);
    }, [fighterId]);

    // Stream a round's events one beat at a time, then hand off to corner/result.
    const streamRound = useCallback((data) => {
        setPhase("streaming");
        setRoundNo(data.round);
        setShown([]);
        const lines = data.events.filter((e) => e.text);
        let t = 300;
        lines.forEach((e, i) => {
            const id = setTimeout(() => setShown((s) => [...s, e]), t);
            timers.current.push(id);
            t += e.finish ? REVEAL_MS + FINISH_HOLD_MS : REVEAL_MS;
        });
        const done = setTimeout(() => {
            setSnapshot(data.snapshot);
            if (data.ended) { setResult(data.result); setPhase("done"); }
            else { setOptions(data.options); setPhase("corner"); }
        }, t + 200);
        timers.current.push(done);
    }, []);

    async function begin() {
        setError(null);
        try {
            const data = await api(`/livefight/${card.fightId}/round`, { method: "POST", body: { openingPlan: plan } });
            streamRound(data);
        } catch (e) { setError(e.message); }
    }

    async function corner(decisionId) {
        setPhase("streaming");
        try {
            const data = await api(`/livefight/${card.fightId}/round`, { method: "POST", body: { decisionId } });
            streamRound(data);
        } catch (e) { setError(e.message); }
    }

    if (error) return <div style={{ padding: 20 }}><div className="form-error">{error}</div><Link to="/roster" style={{ color: "var(--ember)" }}>Roster</Link></div>;
    if (!card) return <p style={{ color: "var(--night-muted)", padding: "24px 16px" }}>Walking to the cage…</p>;

    const { you, them } = card;

    return (
        <div style={{ padding: "8px 0 40px", maxWidth: 640, margin: "0 auto" }}>
            {/* Tale of the tape — always visible up top */}
            <div style={{ display: "flex", alignItems: "stretch", gap: 10, padding: "10px 16px 14px" }}>
                <Corner c={you} color="var(--ember)" tag="YOUR CORNER" align="right" />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0, gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-display)", fontSize: 14, color: "var(--night-muted)" }}>VS</span>
                    {roundNo > 0 && <span className="mono" style={{ fontSize: 10, color: "var(--night-muted)" }}>RD {roundNo}/{card.rounds}</span>}
                </div>
                <Corner c={them} color="var(--corner-red)" tag={them.gym || "OPPONENT"} align="left" />
            </div>

            {/* Live vitals */}
            {phase !== "prefight" && (
                <div style={{ display: "flex", gap: 10, padding: "0 16px 14px" }}>
                    <Vitals snap={snapshot.A} color="var(--ember)" align="right" />
                    <Vitals snap={snapshot.B} color="var(--corner-red)" align="left" />
                </div>
            )}

            {/* ── Pre-fight: the read + the plan ── */}
            {phase === "prefight" && (
                <div className="anim-rise" style={{ margin: "0 16px" }}>
                    <div style={{ background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-lg)", padding: 16, marginBottom: 14 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--corner-red)", textTransform: "uppercase", marginBottom: 8 }}>Corner report — {them.name}</div>
                        <ReadLine k="Style" v={`${them.read.style} · ${them.read.family}`} />
                        <ReadLine k="Danger" v={them.read.danger} />
                        <ReadLine k="Opening" v={them.read.opening} />
                        {them.read.counter && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--night-line)", fontSize: 13, color: "var(--ember)" }}>💡 {them.read.counter}</div>}
                    </div>

                    <div style={{ background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-lg)", padding: 16 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", color: "var(--night-muted)", textTransform: "uppercase", marginBottom: 12 }}>Your opening game plan</div>
                        {Object.entries(PLAN).map(([key, { label, opts }]) => (
                            <div key={key} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                                <span style={{ fontSize: 11, color: "var(--night-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 72, flexShrink: 0 }}>{label}</span>
                                <div style={{ display: "flex", gap: 6, flex: 1 }}>
                                    {opts.map(([v, l]) => (
                                        <button key={v} onClick={() => setPlan((p) => ({ ...p, [key]: v }))} className="pressable"
                                            style={{ flex: 1, padding: "8px 4px", fontSize: 12, fontWeight: 600, cursor: "pointer", borderRadius: "var(--radius-md)",
                                                background: plan[key] === v ? "var(--ember)" : "transparent",
                                                color: plan[key] === v ? "#fff" : "var(--night-muted)",
                                                border: `1.5px solid ${plan[key] === v ? "var(--ember)" : "var(--night-line)"}` }}>
                                            {l}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <button onClick={begin} className="pressable"
                            style={{ width: "100%", marginTop: 8, padding: "13px", fontFamily: "var(--font-display)", fontSize: 17, letterSpacing: "0.06em", textTransform: "uppercase", color: "#fff", background: "var(--ember)", border: "none", borderRadius: "var(--radius-button)", cursor: "pointer" }}>
                            Touch gloves
                        </button>
                    </div>
                </div>
            )}

            {/* ── Live round: streamed blow-by-blow ── */}
            {(phase === "streaming" || phase === "corner") && (
                <div style={{ margin: "0 16px" }}>
                    <div style={{ background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-lg)", padding: "12px 14px", minHeight: 160 }}>
                        {shown.map((e, i) => (
                            <div key={i} className="anim-line" style={{ "--i": 0, display: "flex", gap: 8, alignItems: "flex-start", padding: e.finish ? "6px 8px" : "3px 0", margin: e.finish ? "4px -8px" : 0, background: e.finish ? "rgba(255,90,41,0.12)" : "transparent", borderRadius: e.finish ? 6 : 0 }}>
                                <span className="mono" style={{ fontSize: 11, color: "var(--night-muted)", flexShrink: 0, lineHeight: 1.6, whiteSpace: "nowrap" }}>R{e.round} {e.time}</span>
                                <span className="mono" style={{ fontSize: e.finish ? 13 : 12, fontWeight: e.finish ? 700 : 400, lineHeight: 1.6, color: e.actor === "A" ? "var(--ember)" : e.actor === "B" ? "var(--corner-red)" : "var(--night-muted)" }}>{e.text}</span>
                            </div>
                        ))}
                        {phase === "streaming" && <div className="mono" style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 8, animation: "mo-pulse 1s var(--ease-in-out) infinite" }}>● live</div>}
                    </div>
                </div>
            )}

            {/* ── Corner: the decision that swings the next round ── */}
            {phase === "corner" && (
                <div className="anim-rise" style={{ margin: "14px 16px 0" }}>
                    <div style={{ textAlign: "center", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--night-text)", marginBottom: 4 }}>Between rounds — the corner</div>
                    <div style={{ textAlign: "center", fontSize: 11, color: "var(--night-muted)", marginBottom: 12 }}>Make the call. It changes round {roundNo + 1}.</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {options.map((o) => (
                            <button key={o.id} onClick={() => corner(o.id)} className="pressable"
                                style={{ textAlign: "left", padding: "12px 14px", background: "var(--night-surface)", border: "1px solid var(--night-line)", borderRadius: "var(--radius-md)", cursor: "pointer" }}>
                                <div style={{ fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--ember)" }}>{o.label}</div>
                                <div style={{ fontSize: 12, color: "var(--night-muted)", marginTop: 2 }}>{o.detail}</div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── Result ── */}
            {phase === "done" && result && (
                <div className="anim-rise" style={{ margin: "16px 16px 0", textAlign: "center" }}>
                    <div className="anim-punch" style={{ fontFamily: "var(--font-display)", fontSize: 34, letterSpacing: "0.04em", textTransform: "uppercase", lineHeight: 1, color: result.winner === "you" ? "var(--ember)" : result.winner === "them" ? "var(--corner-red)" : "var(--night-text)" }}>
                        {result.winner === "draw" ? "Draw" : result.winner === "you" ? `${you.name.split(" ").pop()} wins` : `${them.name.split(" ").pop()} wins`}
                    </div>
                    <div className="mono anim-fade" style={{ fontSize: 14, color: "var(--night-text)", marginTop: 8, animationDelay: "300ms" }}>
                        {result.method} · Round {result.round}, {result.time}
                    </div>
                    <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 22 }}>
                        <button onClick={() => navigate(0)} className="pressable"
                            style={{ padding: "11px 20px", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: "#fff", background: "var(--ember)", border: "none", borderRadius: "var(--radius-button)", cursor: "pointer" }}>
                            Run it back
                        </button>
                        <Link to={`/roster/${fighterId}`} style={{ padding: "11px 20px", fontFamily: "var(--font-display)", fontSize: 14, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--night-muted)", border: "1.5px solid var(--night-line)", borderRadius: "var(--radius-button)", textDecoration: "none" }}>
                            Done
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}

function Corner({ c, color, tag, align }) {
    return (
        <div style={{ flex: 1, textAlign: align, minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-display)", fontSize: 20, color, textTransform: "uppercase", lineHeight: 1.05, wordBreak: "break-word" }}>{c.name}</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--night-muted)", marginTop: 3 }}>{c.record.wins}–{c.record.losses} · {c.style}</div>
            <div style={{ marginTop: 5, display: "flex", justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.06em", color, background: `color-mix(in srgb, ${color} 16%, transparent)`, padding: "2px 7px", borderRadius: "var(--radius-chip)" }}>{tag}</span>
            </div>
        </div>
    );
}

function Vitals({ snap, color, align }) {
    const Bar = ({ label, value, tint }) => (
        <div style={{ marginBottom: 5 }}>
            <div style={{ display: "flex", justifyContent: align === "right" ? "flex-end" : "flex-start", gap: 6, fontSize: 9, color: "var(--night-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                <span>{label}</span><span className="mono">{value}</span>
            </div>
            <div style={{ height: 5, background: "var(--night-line)", borderRadius: "var(--radius-full)", overflow: "hidden", transform: align === "right" ? "scaleX(-1)" : "none" }}>
                <div style={{ width: `${value}%`, height: "100%", background: tint, borderRadius: "var(--radius-full)", transition: "width 700ms var(--ease-out)" }} />
            </div>
        </div>
    );
    return (
        <div style={{ flex: 1 }}>
            <Bar label="Health" value={snap.health} tint={color} />
            <Bar label="Gas" value={snap.gas} tint="var(--warn)" />
        </div>
    );
}

function ReadLine({ k, v }) {
    return (
        <div style={{ display: "flex", gap: 10, marginBottom: 5, fontSize: 13 }}>
            <span style={{ color: "var(--night-muted)", width: 60, flexShrink: 0, textTransform: "uppercase", fontSize: 10, letterSpacing: "0.06em", paddingTop: 3 }}>{k}</span>
            <span style={{ color: "var(--night-text)" }}>{v}</span>
        </div>
    );
}
