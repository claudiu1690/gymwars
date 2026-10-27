# Feature Brief — <feature name>

> Fill this only for the recommended/approved feature. Use observed evidence or label assumptions.

**Status:** Idea / Prototyping / Implementing / Tested / Released
**Player segment:**
**Player problem:**
**Player-facing promise:** "I can ___, decide ___, and as a result ___."
**Connection to core loop:**
**Hypothesis and evidence:**

## Experience

**Discovery / entry point:**
**Prerequisites / exact unlock:**
**Actions and player choices:**
**Outcome and feedback:**
**Failure, cancellation, and retry:**
**One example playthrough:**
**Next meaningful goal:**

## System rules

| Rule | Description |
| --- | --- |
| Inputs | |
| Authoritative state | |
| Configurable parameters | |
| Reward/cost | |
| Preconditions | |
| State transitions | |
| Completion and replay | |
| Save format and migration | |
| Offline / reconnect | |
| Repeated action / double claim | |

## UX and production

**UI states:** Hidden / Locked / Available / In progress / Completed / Error
**Accessibility considerations:**
**Required art, animation, audio and text:**
**Content authoring cost:**
**Performance / web constraints:**
**Server and privacy considerations:**

## Measurable result

**Primary behavioral event/measure:**
**Guardrails:**
**How to playtest:**
**What disproves the hypothesis:**

## MVP scope

**Build now:**
**Explicitly exclude:**
**Dependencies:**

## Acceptance tests

- [ ] Prerequisites correctly control entry.
- [ ] Intended interaction changes game state and is visibly acknowledged.
- [ ] Reward can be claimed exactly once, or recurrence is explicitly correct.
- [ ] State persists correctly through refresh/reload/return.
- [ ] Older save data is handled safely.
- [ ] Failure/cancel paths return to a valid state.
- [ ] Relevant telemetry fires once per logical transition when permitted.
- [ ] Relevant engine tests and a representative browser playthrough pass.
