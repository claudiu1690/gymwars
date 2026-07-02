import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { Ico, ICONS } from "../components/Icons";
import { DEMO_MODE, DEMO_FIGHTERS } from "../demoData";

const MAX_SLOTS = 8; // roster cap ceiling (GDD §4.1: grows to 8–10)

function EmptySlot() {
    return (
        <div style={{ background: "var(--surface)", borderRadius: "var(--radius-md)", padding: "12px 14px", border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--surface-sunken)", border: "1.5px dashed var(--line)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: "var(--ink-muted)" }}>
                <Ico d={ICONS.plus} size={16} />
            </div>
            <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)" }}>Empty slot</div>
                <div style={{ fontSize: 11, color: "var(--ink-muted)", marginTop: 1 }}>Scout a fighter to fill this slot</div>
            </div>
            <Button variant="tint" size="sm">Scout</Button>
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
    const fighters = DEMO_MODE ? DEMO_FIGHTERS : [];
    // Demo data outnumbers a fresh gym's 2 real slots — pad so the slot
    // count stays coherent while the roster is placeholder content.
    const slots = DEMO_MODE ? Math.max(gym?.rosterSlots ?? 2, fighters.length + 1) : (gym?.rosterSlots ?? 2);
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
                {fighters.map((f) => <FighterCard key={f.id} variant="compact" {...f} />)}
                {Array.from({ length: emptyCount }, (_, i) => <EmptySlot key={`empty-${i}`} />)}
                {lockedCount > 0 && <LockedSlot tier={(gym?.facilityTier ?? 1) + 1} />}
            </div>
        </>
    );
}
