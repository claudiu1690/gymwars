import { useState } from "react";
import { api } from "../api";

const OPTIONS = {
    approach: [
        { value: "strike", label: "Strike" },
        { value: "balanced", label: "Balanced" },
        { value: "grapple", label: "Grapple" },
    ],
    pace: [
        { value: "high", label: "High pace" },
        { value: "measured", label: "Measured" },
        { value: "cautious", label: "Cautious" },
    ],
    finish: [
        { value: "hunt-finish", label: "Hunt the finish" },
        { value: "play-safe", label: "Play it safe" },
    ],
};

const LABELS = { approach: "Approach", pace: "Pace", finish: "Finish" };

/** Corner instructions (GDD §5.4). This same gameplan runs automatically
 *  when the fighter defends the gym while you're offline (Phase 4). */
export default function GameplanEditor({ fighterId, gameplan, onSaved }) {
    const [plan, setPlan] = useState(gameplan);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);

    async function set(key, value) {
        const next = { ...plan, [key]: value };
        setPlan(next);
        setSaving(true);
        setError(null);
        try {
            await api(`/fighters/${fighterId}/gameplan`, { method: "PUT", body: next });
            onSaved?.(next);
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <div className="section-label" style={{ margin: 0 }}>Gameplan</div>
                <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>{saving ? "Saving…" : "Saved"}</span>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {Object.entries(OPTIONS).map(([key, opts]) => (
                    <div key={key} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontSize: 11, color: "var(--ink-muted)", textTransform: "uppercase", letterSpacing: "0.04em", width: 96, flexShrink: 0 }}>{LABELS[key]}</span>
                        <div style={{ display: "flex", gap: 6, flex: 1 }}>
                            {opts.map((o) => (
                                <button
                                    key={o.value}
                                    onClick={() => set(key, o.value)}
                                    style={{
                                        flex: 1, padding: "6px 4px", fontSize: 12, fontWeight: 600, cursor: "pointer",
                                        background: plan[key] === o.value ? "var(--ember-tint)" : "transparent",
                                        color: plan[key] === o.value ? "var(--ember-strong)" : "var(--ink-secondary)",
                                        border: `1.5px solid ${plan[key] === o.value ? "var(--ember)" : "var(--line)"}`,
                                        borderRadius: "var(--radius-md)",
                                    }}
                                >
                                    {o.label}
                                </button>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
            <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "10px 0 0" }}>
                The saved gameplan is what runs in the corner on fight night — set it before the fight resolves.
            </p>
        </div>
    );
}
