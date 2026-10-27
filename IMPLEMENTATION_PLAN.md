# Gym Wars improvement implementation

Source: `output/pdf/Gym_Wars_Game_Improvement_Proposal.pdf` (6 October 2026).
Visual reference: approved stylized 3D gym/fighter concepts and dashboard mock.

## Scope and decisions

- Build a separate player-controlled career; retain the existing real-time mode for comparison.
- One saved weekly calendar governs the entire career. Security and shared-event timestamps remain real time.
- Prepared and attended corners use the same deterministic engine and legal decisions.
- Personal career progress does not enter the existing global ladder. New shared matches are unranked snapshots without career rewards.
- Use a single atomic career save with revision checks and command receipts so a retry, disconnect, or concurrent request cannot partly apply an outcome.
- Preserve existing uncommitted work. New image generation, if needed, uses Higgsfield MCP.

## Delivery sequence

1. **Protect progress** — recoverable legacy outcomes, atomic commitments/spending, consistent fatigue, AI owner index migration, historical championships.
2. **Career simulation** — starter/style choice, weekly scouting, two opponent offers, training/rest, operating costs, facilities, persistent regional rivals, event stops and a useful return summary.
3. **Fight participation** — saved conditional plans, persisted round decisions, identical auto/attended rules, resume and debrief.
4. **Development** — veteran opportunity, mentoring, traits with actual effects, milestone/title history, recoverable economy, full-career and strategy simulations.
5. **Shared competition** — immutable versioned snapshots, equal readiness, separate unranked results, no transferable rewards.
6. **Presentation** — slate navigation, neutral panels, coral actions, 3D portraits/gym art, portrait-led cards, contextual next actions, mobile layout and visible errors.
7. **Verification** — unit and integration checks for retries/concurrency/failures, seeded balance scenarios, economy/career simulations, production build and visual review.

## External validation (not a code completion claim)

Run observed sessions with 6–8 players, then a 2–3 week alpha. Measure first consequential fight within 15 minutes, understanding of tradeoffs, voluntary continuation, and recovery across interruptions. Decide ranked format only after this evidence; defer paid progression and skip sales.

## Progress

- [x] Read proposal and inspect current working tree.
- [x] Protect legacy progress and document required migrations.
- [x] Implement player-controlled career through retirement and rebuilding.
- [x] Implement persisted attended/automatic bouts and debrief.
- [x] Implement development, economy, rivals and snapshot exhibitions.
- [x] Apply approved UI and local Higgsfield art assets.
- [x] Run verification and record results/limitations.
- [x] Respond to first-session confusion with a coach-led opening, simple task panels and optional advanced controls.
- [x] Restore all five career rarity tiers and persistent investigation guarantees, with safe version-1 save upgrades.
- [x] Integrate the approved cartoon 3D assets and labeled rarity frames on fighter/scouting cards.
- [x] Verify scouting/reload behavior and three consequential bouts through the visible coaching flow; prepare the human playtest protocol.
- [x] Implement Design Review 1: shared contextual camp planning, fight briefs and tactics, deadline validation, stable forecasts, separate Scouting, clearer preview entry and focused fighter profiles.
- [x] Validate the revised fresh and returning flows, saved tactics, mobile layouts, scouting guarantees and long-camp midpoint decisions.
- [x] Implement Design Review 2: automatic fight-night arrival, dedicated event and result pages with new Higgsfield art, stable round updates, coherent recaps, outcome-led highlights and a visible title/legacy goal.
- [x] Verify round-page stability, reload/resume and three-fight progression; preserve the original preview save and open Design Review 3 for player feedback.

Completed implementation and evidence: [CAREER_IMPLEMENTATION.md](CAREER_IMPLEMENTATION.md).

The observed 6–8 player sessions and 2–3 week alpha remain external validation work. The implementation is a playable, tested alpha; the proposal's claims about player enjoyment and retention remain hypotheses.
