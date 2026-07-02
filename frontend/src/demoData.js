/**
 * DEMO DATA — placeholder content from the design system's mobile-app kit.
 *
 * The backend has no fighter/fight/scouting systems yet (they land in
 * Phases 1–3 of DEVELOPMENT_PLAN.md). Until then, DEMO_MODE fills the
 * designed screens with this data so the UI is complete and reviewable.
 * Real gym data (name, purse, slots) always comes from the API.
 *
 * When a phase ships its real API, delete its slice here and flip the
 * screen to live data.
 */
export const DEMO_MODE = true;

export const DEMO_FIGHTERS = [
    { id: 1, name: "MARCUS VEGA", weightClass: "lightweight", style: "boxer", age: 26, careerPhase: "Prime", stats: { striking: 76, grappling: 61, submissions: 44, conditioning: 68 }, record: { wins: 12, losses: 3 }, rarity: "contender", status: { type: "in-camp", countdown: "3d 12h" } },
    { id: 2, name: "ANA RIVAS", weightClass: "featherweight", style: "wrestler", age: 22, careerPhase: "Rising", stats: { striking: 58, grappling: 79, submissions: 55, conditioning: 88 }, record: { wins: 5, losses: 0 }, rarity: "elite", status: { type: "fight-ready" } },
    { id: 3, name: "LEON MBEKI", weightClass: "middleweight", style: "bjj", age: 33, careerPhase: "Declining", stats: { striking: 51, grappling: 68, submissions: 74, conditioning: 42 }, record: { wins: 18, losses: 9 }, rarity: "prospect", status: { type: "fatigued" } },
];

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

export const DEMO_SCOUTING = {
    attemptsUsed: 2,
    attemptsTotal: 3,
    refreshIn: "3h 45m",
    pity: "Guaranteed Contender+ in 3 scouts",
};
