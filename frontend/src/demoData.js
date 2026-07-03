/**
 * DEMO DATA — placeholder content from the design system's mobile-app kit.
 *
 * Fighters and scouting went live with Phase 1; only FIGHT content remains
 * demo until the fight engine ships (Phase 3 of DEVELOPMENT_PLAN.md).
 * DEMO_MODE gates the fight sections (Fight Night screen, dashboard digest,
 * Next Fight card) so the designed screens stay reviewable.
 */
export const DEMO_MODE = true;

export const DEMO_FIGHT = {
    weightClass: "Lightweight",
    circuit: "Regional",
    rounds: 3,
    you: { name: "MARCUS VEGA", short: "VEGA", record: "12–3" },
    them: { name: "JAMES CHEN", short: "CHEN", record: "9–4" },
    result: { winner: "VEGA WINS", method: "KO · Round 2, 0:45" },
    consequences: [
        { value: "$2,400", color: "var(--win)", label: "Purse" },
        { value: "+12", color: "var(--ember)", label: "Ranking pts" },
        { value: "−15 Fatigue", color: "var(--warn)", label: "Fatigue" },
    ],
    log: [
        { round: 1, time: "0:42", corner: "you", text: "VEGA lands a heavy leg kick. Chen retreats." },
        { round: 1, time: "1:15", corner: "them", text: "CHEN shoots for a takedown. Vega defends." },
        { round: 1, time: "2:47", corner: "you", text: "VEGA lands a clean right hand. Chen stumbles." },
        { round: 1, time: "3:30", corner: "neutral", text: "End of Round 1." },
        { round: 2, time: "0:20", corner: "you", text: "VEGA opens with a left-right combination. Chen is hurt." },
        { round: 2, time: "0:45", corner: "you", text: "KO — VEGA lands the finishing right hook. Fight over.", ko: true },
    ],
};
