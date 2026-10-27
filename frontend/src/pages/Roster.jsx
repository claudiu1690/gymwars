import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { Ico, ICONS } from "../components/Icons";

const MAX_SLOTS = 10; // roster cap ceiling (GDD §4.1: grows to 8–10)
const CLASSES = [
    { key: "featherweight", label: "FTH" },
    { key: "lightweight", label: "LW" },
    { key: "middleweight", label: "MW" },
    { key: "heavyweight", label: "HW" },
];

import { formatRemaining } from "../hooks/useCountdown";

/** Map an API fighter to the FighterCard's prop shape. */
export function toCardProps(f) {
    return {
        name: f.name,
        weightClass: f.weightClass,
        style: f.style,
        age: f.age,
        careerPhase: f.careerPhase,
        stats: f.stats,
        record: f.record,
        rarity: f.rarity,
        status: {
            type: f.status,
            countdown: f.status === "in-camp" && f.camp
                ? formatRemaining(new Date(f.camp.endsAt).getTime() - Date.now())
                : undefined,
        },
    };
}

function EmptySlot({ onScout }) {
    return (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-card)", padding: 20, border: "1.5px dashed var(--line)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200, textAlign: "center" }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--surface-sunken)", border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-muted)" }}>
                <Ico d={ICONS.plus} size={18} />
            </div>
            <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)" }}>Empty slot</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>Scout a prospect to fill it</div>
            </div>
            <Button variant="tint" size="sm" onClick={onScout}>Scout</Button>
        </div>
    );
}

function LockedSlot({ tier }) {
    return (
        <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-card)", padding: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8, minHeight: 200, textAlign: "center", opacity: 0.65 }}>
            <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-secondary)" }}>
                <Ico d={ICONS.lock} size={17} />
            </div>
            <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-secondary)" }}>Locked — Tier {tier} gym</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 2 }}>Upgrade the facility to unlock</div>
            </div>
        </div>
    );
}

export default function Roster() {
    const { gym } = useAuth();
    const navigate = useNavigate();
    const [fighters, setFighters] = useState(null);

    useEffect(() => {
        api("/fighters").then((d) => setFighters(d.fighters)).catch(() => setFighters([]));
    }, []);

    if (fighters === null) return <p style={{ color: "var(--ink-secondary)" }}>Loading roster…</p>;

    const slots = gym?.rosterSlots ?? 2;
    const emptyCount = Math.max(0, slots - fighters.length);
    const lockedCount = Math.max(0, MAX_SLOTS - slots);
    const record = fighters.reduce((r, f) => ({ wins: r.wins + f.record.wins, losses: r.losses + f.record.losses }), { wins: 0, losses: 0 });
    const byClass = Object.fromEntries(CLASSES.map((c) => [c.key, fighters.filter((f) => f.weightClass === c.key && !f.retired)]));
    const covered = CLASSES.filter((c) => byClass[c.key].length > 0).length;

    return (
        <>
            <h1 className="page-title">Roster</h1>

            {/* The gym at a glance — the manager's desk */}
            <div className="card" style={{ marginBottom: "var(--space-4)", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                <div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{fighters.length}<span style={{ color: "var(--ink-muted)", fontSize: 13 }}>/{slots}</span></div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Fighters</div>
                </div>
                <div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>
                        <span style={{ color: "var(--win)" }}>{record.wins}W</span>
                        <span style={{ color: "var(--ink-muted)", fontSize: 13 }}>–</span>
                        <span style={{ color: "var(--corner-red)" }}>{record.losses}L</span>
                    </div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Combined record</div>
                </div>
                <div>
                    <div className="mono" style={{ fontSize: 18, fontWeight: 600 }}>{covered}<span style={{ color: "var(--ink-muted)", fontSize: 13 }}>/4</span></div>
                    <div style={{ fontSize: 10, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Divisions</div>
                </div>
                <div style={{ flex: 1, minWidth: 200, display: "flex", gap: 6 }} title="Division coverage — 2 of 4 needed for Gym Wars; full coverage means no forfeits.">
                    {CLASSES.map((c) => {
                        const have = byClass[c.key];
                        return (
                            <div key={c.key} style={{ flex: 1, textAlign: "center", padding: "5px 2px", borderRadius: "var(--radius-md)", background: have.length ? "var(--ember-tint)" : "var(--surface-sunken)", border: `1px solid ${have.length ? "var(--ember)" : "var(--line)"}` }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: have.length ? "var(--ember-strong)" : "var(--ink-muted)", letterSpacing: "0.06em" }}>{c.label}</div>
                                <div style={{ fontSize: 9, color: "var(--ink-muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {have.length ? have[0].name.split(" ").pop() : "open"}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="roster-grid stagger">
                {fighters.map((f) => (
                    <Link key={f.id} to={`/roster/${f.id}`} style={{ textDecoration: "none" }}>
                        <FighterCard variant="grid" {...toCardProps(f)} />
                    </Link>
                ))}
                {Array.from({ length: emptyCount }, (_, i) => (
                    <EmptySlot key={`empty-${i}`} onScout={() => navigate("/scouting")} />
                ))}
                {lockedCount > 0 && <LockedSlot tier={(gym?.facilityTier ?? 1) + 1} />}
            </div>
        </>
    );
}
