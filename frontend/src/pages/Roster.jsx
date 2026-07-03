import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { Ico, ICONS } from "../components/Icons";

const MAX_SLOTS = 8; // roster cap ceiling (GDD §4.1: grows to 8–10)

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
        status: { type: f.status },
    };
}

function EmptySlot({ onScout }) {
    return (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-sunken)", border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ink-muted)" }}>
                <Ico d={ICONS.plus} size={16} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)" }}>Empty slot</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 1 }}>Scout a fighter to fill this slot</div>
            </div>
            <Button variant="tint" size="sm" onClick={onScout}>Scout</Button>
        </div>
    );
}

function LockedSlot({ tier }) {
    return (
        <div style={{ background: "var(--surface-sunken)", borderRadius: "var(--radius-md)", padding: "12px 14px", display: "flex", alignItems: "center", gap: 10, opacity: 0.55 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ink-secondary)" }}>
                <Ico d={ICONS.lock} size={15} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)" }}>Locked — Tier {tier} gym</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 1 }}>Upgrade facility to unlock</div>
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

    return (
        <>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between" }}>
                <h1 className="page-title">Roster</h1>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 12, color: "var(--ink-muted)" }}>
                    {fighters.length} / {slots} slots
                </span>
            </div>
            <div className="roster-grid">
                {fighters.map((f) => (
                    <Link key={f.id} to={`/roster/${f.id}`} style={{ textDecoration: "none" }}>
                        <FighterCard variant="compact" {...toCardProps(f)} />
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
