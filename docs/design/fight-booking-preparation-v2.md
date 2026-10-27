# Fight booking and preparation — v2

12 October 2026. Continue the approved event-poster direction across the career fight flow.

Booking should feel like choosing an opponent, not reading several contracts at once. Show every offer as a selectable card with opponent identity, date, preparation time and guaranteed pay. The selected offer gets a large arena matchup, one clear Book fight action, the full contract, visible skill comparison, signatures and scouting. Unavailable offers remain inspectable with the exact reason beside the disabled booking action. Changing fighters resets the opponent selection. A successful booking opens that fight’s preparation page; booking never advances time.

Preparation should answer three questions immediately: who am I fighting, how much time is left, and what is my next action? Use the same matchup poster, then show camp status, the training/recovery timeline, opponent scouting and opening tactics in visible sections. Keep all approach, pace, finish and gas-threshold choices. Label unsaved instructions and save explicitly. Training remains in the existing training workspace. Ready/live/completed bouts keep their correct actions and locked opening instructions.

Remove decorative arrows from action labels throughout the game while retaining arrows that explain numerical changes or calendar spans. Remove the Fights page’s redundant Choose a fighter scroll button; the fighter cards themselves perform booking navigation.

Validate booking selection and command payloads, recovery and unavailable offers, empty/already-booked states, camp/checkpoint/ready/live/completed states, preparation bonuses and tactic persistence. Exercise the flow with synthetic browser responses and check phone/desktop layouts without changing the real account.

Verification completed: production build succeeds; 305 tests passed, 6 optional database checks skipped and no failures. The browser run checked 17 fight/signature scenarios at 320, 390, 768, 1024 and 1440 pixels. Booking sent the selected contract, opened the correct preparation screen and did not advance the week. Tactic saves persisted all four instructions; rejected saves retained a retryable draft. Training, camp review, ready, live and completed actions navigated correctly. No horizontal overflow, dropdowns, information disclosures or browser errors were found. The real account was unchanged. Evidence: `output/fight-planning-2026-10-12/check.json`, `tests.log` and the accompanying screenshots.
