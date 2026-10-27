/**
 * First Fight Week — the Taskmaster-style opening checklist (genre consensus:
 * Travian tasks, Torn new-player missions, MMA Manager 2 quests). Each step
 * teaches one beat of the loop and pays instantly; rewards deliberately
 * overpay so the first session ends holding money to spend, not a timer.
 */
const ONBOARDING_TASKS = [
    { key: "scout",    label: "Send a scout",         reward: 200, hint: "The board turns over daily — investigate a prospect." },
    { key: "sign",     label: "Sign a fighter",       reward: 300, hint: "Like the report? Put them in a roster slot." },
    { key: "gameplan", label: "Set a gameplan",       reward: 200, hint: "It works the corner on fight night — and defends the gym offline." },
    { key: "spar",     label: "Spar an exhibition",   reward: 300, hint: "Instant fight, no record stakes. See the cage tonight." },
    { key: "camp",     label: "Run a training camp",  reward: 300, hint: "Four sliders, one deadline. Amateur camps run fast." },
    { key: "book",     label: "Book a real fight",    reward: 600, hint: "Matchmaking proposes — you sign. The purse is real now." },
];

module.exports = { ONBOARDING_TASKS };
