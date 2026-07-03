import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { toCardProps } from "./Roster";

const TRAIT_LABELS = {
    "iron-chin": "Iron Chin", "suspect-chin": "Suspect Chin", "killer-instinct": "Killer Instinct",
    coachable: "Coachable", "gym-rat": "Gym Rat", "slow-starter": "Slow Starter",
    "fast-starter": "Fast Starter", hothead: "Hothead", passive: "Passive",
    "cardio-machine": "Cardio Machine", "fragile-hands": "Fragile Hands",
    "big-fight-nerves": "Big Fight Nerves", showman: "Showman", spoiler: "Spoiler",
};

export default function FighterDetail() {
    const { id } = useParams();
    const [fighter, setFighter] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        api(`/fighters/${id}`).then((d) => setFighter(d.fighter)).catch((e) => setError(e.message));
    }, [id]);

    if (error) return <div className="form-error">{error}</div>;
    if (!fighter) return <p style={{ color: "var(--ink-secondary)" }}>Loading fighter…</p>;

    const hiddenTraits = Math.max(0, fighter.traitCount - fighter.discoveredTraits.length);

    return (
        <>
            <Link to="/roster" style={{ fontSize: 13, color: "var(--ember-strong)", textDecoration: "none", fontWeight: 500 }}>← Roster</Link>
            <div style={{ marginTop: "var(--space-3)", display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
                <FighterCard variant="detail" {...toCardProps(fighter)} />

                <div className="card">
                    <div className="section-label">Background</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--ink-secondary)" }}>Region</span>
                            <span>{fighter.regionLabel}</span>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "var(--ink-secondary)" }}>Signed</span>
                            <span className="mono" style={{ fontSize: 12 }}>{new Date(fighter.signedAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                </div>

                <div className="card">
                    <div className="section-label">Traits</div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {fighter.discoveredTraits.map((t) => (
                            <span key={t} style={{ fontSize: 12, fontWeight: 600, color: "var(--ember-strong)", background: "var(--ember-tint)", padding: "4px 10px", borderRadius: "var(--radius-chip)" }}>
                                {TRAIT_LABELS[t] || t}
                            </span>
                        ))}
                        {Array.from({ length: hiddenTraits }, (_, i) => (
                            <span key={`hidden-${i}`} style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-muted)", background: "var(--surface-sunken)", padding: "4px 10px", borderRadius: "var(--radius-chip)" }}>
                                ? Undiscovered
                            </span>
                        ))}
                    </div>
                    <p style={{ fontSize: 11, color: "var(--ink-muted)", margin: "8px 0 0" }}>
                        Traits reveal themselves through camps and fights — a suspect chin shows after a bad knockdown, a killer instinct after an early finish.
                    </p>
                </div>
            </div>
        </>
    );
}
