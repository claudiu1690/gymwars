# Playtest report: fresh account, first session (31 Oct 2026)

Fresh local account on a disposable staging instance (`output/local-staging/playtest-claude`), desktop 1280×800 plus a phone-width check. Muay Thai starter.

Session played: register → starter style → book Miguel Flores (wrestler, 6-1) → 4-week grappling camp with midpoint check-in → fight 1, called round by round: **lost the decision** → chose signature → scouted and signed a featherweight → booked the rematch → 2-week camp + rest, second fighter on all-round camp → fight 2, coach auto-finished: **won the decision** → career weeks at **0**, session over.

## Verdict

The core loop is good and readable: **Book → Camp → End week → Call the rounds → Result.** The "Your next move" card, the always-visible End week bar, autosave and the per-round gas trade-off all work. Most of the confusion comes from three things:

1. **The fight doesn't explain its result.** Rounds are decided by a score the player never sees.
2. **There are too many systems and numbers at once.** At least 12 progression tracks, two energy meters and two calendars appear in the first session.
3. **The first session stops before the game's namesake mode.** You run out of career weeks after two fights, while Gym Wars needs four fighters.

---

## P0: biggest hits to clarity and fun

### 1. "I hit harder and lost": hidden round scoring
- **Seen:** Fight 1 was lost 1–2 by decision even though Devon dealt **38.4 damage vs 19.6** and finished at 80% health vs the opponent's 62%. In round 3 Devon dealt 12 and took 8, but lost the round. In fight 2, round 3 was even on damage (7 vs 7) and was also "lost."
- **Cause:** `scoreRound` adds hidden `roundControl` to damage (`engine/fightEngine.js:863`). Each takedown adds 1.5 plus style bonuses (`consts/fightConfig.js:32`). The UI shows health, gas and damage but never shows control.
- **The result text makes it worse:** "takedowns alone do not decide the fight" is shown right after takedowns decided the fight.
- **Fix:**
  - After each round, show a mini scorecard: `Damage 12 – 8 · Control 0 – 4.5 → Flores takes the round`.
  - During the fight, add a "control" bar next to health and gas.
  - Start the takeaway with one plain sentence: *"Why you lost: Flores took you down 4 times. Top control scores rounds even when you land more."* Then suggest one action: "Train grappling" or "Choose Keep it standing".

### 2. Two calendars, one of them in real time, both with real-looking dates
- **Seen:** The header shows `GAME DATE · Mon, 30 Nov 2026`. The next line says `Real-time refill: +4 weeks on Nov 1, 3:52 PM`, which looks like a date in the past. Both use the same year format as the real date.
- **Fix:**
  - Give game time a game format, such as **"Season 1 · Week 9"** or a fictional year.
  - Show the refill as a countdown: **"+4 weeks in 18 h"**.
  - Never show both as plain calendar dates side by side.

### 3. The first session ends after two fights and never reaches Gym Wars
- **Seen:** You start with 8 weeks. Fight 1 used 4 weeks (camp plus fight date) and the turnaround after each fight is 4 weeks, so the bank was at **0 after fight 2**. Gym Wars needs four fighters, and its own token meter shows "1 ready." I had 2/4 fighters when I ran out.
- **Rule today:** 8 to start, +4 per real day, banking cap 12 (`docs/design-review-2026-10-09/REVIEW-15-IMPLEMENTATION.md`).
- **Fix (design decision):** Let a first session reach at least one Gym Wars battle. Options:
  - the first chapter doesn't spend weeks
  - a 16-week starting bank
  - a one-time "opening week" grant when the fourth division is filled
  - lending the player starter fighters for their first Gym Wars card

### 4. Too many progression tracks
In the first 20 minutes the player sees all of these:
- Career Path milestones (5)
- Club reputation levels (6)
- Gym tier (6), a different track from club level that uses the same numbering
- Regional ranking points
- "title-eligibility points"
- "reputation", "Career reputation" and "Club reputation", three different labels
- legacy
- pennants (National Showcase, Next Generation, World Open)
- club cups (tier 4–6 rivals)
- staff ranks (coach, scout)
- pinned club goal
- Talent Book
- achievements and club deeds
- Career Invitational (3 fighters)
- Gym Wars league (4v4)

- **Fix:**
  - Home shows **one** goal and one button.
  - Introduce each system when it first matters: hide pennants, cups, staff ranks, the Talent Book and pinned goals until the player reaches them.
  - Merge or rename overlapping names. Pick one meaning for "reputation", and make "Gym tier" clearly about the building and "Circuit" clearly about opponents.
  - Before the first fight, the sidebar should show only Home, Roster and Fights. Unlock Gym after fight 1, and Gym Wars, Shop and Achievements later.

---

## P1: confusing mechanics

5. **Tactics use different words before and during the fight.**
   - Before the fight the options are *Keep it standing / Mix it up / Take it to the ground*, plus *Push the pace / Stay measured / Slow it down*, plus *Hunt the finish / Stay composed*, plus a gas threshold labelled "Hold the plan / 20–50% gas".
   - On fight night the options become *Work the feet / Take it down / Save your gas*, plus "Set custom tactics" and "Use saved fight plan".
   - **Fix:** use one vocabulary. Each fight-night preset should show which of the three dials it sets.
6. **Two kinds of training gain with many rules.**
   - The two kinds are permanent skill growth (+1.1) and a temporary "fight bonus" (+4). The bonus expires after 8 weeks, replaces the previous one, doesn't stack, gets a +1 commitment bonus for 4- and 6-week camps, and the camp ends with a recovery week. All of this is in one paragraph.
   - The training page's matchup shows grappling **43.2 vs 49** while fight night shows **47.2 (includes +4 camp)**.
   - **Fix:** show the fight-night number (base + bonus) everywhere, with the bonus as a chip. Keep the rules to one line plus a "?" link.
7. **The camp check-in asks for a choice without the numbers.** *Continue camp* vs *Finish camp early* should each show "readiness on fight night" and the bonus you keep or lose.
8. **Tactics need a manual Save.** "Changes are not saved yet" appears only near the bottom. Everything else autosaves, so autosave this too.
9. **Fight night is the secondary button.** On the week report, "Continue planning" is primary and "Go to fight night" is grey. On fight week, make fight night the primary action.
10. **The opponent uses the player fighter's portrait.** On Fight Night and in the VS banner, Miguel Flores used Devon's portrait.
11. **The week report is inconsistent.** It opens automatically only in weeks with events. Otherwise there's just a small "Week report" link. Always show a short summary, for example a toast: "+1.1 grappling · readiness 91%".
12. **Fights lack drama.** Each round resolves instantly into a long text log. Reveal the exchanges over 5–10 s with a skip button, animate the health and gas bars, and pin knockdowns as big moments. This is where the fun is.

## P2: copy, polish, small bugs

- **Onboarding promises a coach that never appears.** "Your coach will walk you through the first fight" (`frontend/src/pages/Career.jsx:939`), but there is no coach guide, and you can't hire a coach until after the opening bout.
- **Signature abilities feel tiny and use jargon:** "+2% standing attack contest", "Save up to 1 raw gas per round", "ordinary measured-pace charge". Describe them in player terms and make the effect noticeable in fights ("Signature fired 1×" is already logged, so show it in the round summary).
- **The post-fight takeaway contradicts itself.** It says "Striking · cautious pace" and also "You hunted the finish, committing more gas" (`frontend/src/fightPresentation.mjs:318-319`). After a loss it also says "Your pace left fuel for the late exchanges."
- **Scouting copy is wrong after signing.** The report still says "Sign to see exact numbers" and shows estimated ranges. The first featherweight changes from "Opens another division" to "Adds depth to your division."
- **Developer wording shows in the UI:** "Fight skills · valid preparation included" (`frontend/src/components/FightMatchup.jsx:173`), "Competitive skills", "contest", "raw gas".
- **Gym expansion affordability is hard to read.** It shows "Cash remaining **$-1,300** · 0 weeks covered". Use "Need $1,300 more". The cost of **4 career weeks** sits in a small line and is easy to miss.
- **Scouting shows gacha pity counters** ("Legend within 200 investigations", base odds). This is heavy for a gym sim's first visit, so put it behind a "How rarity works" link.
- **The starter style choice doesn't say what it changes,** such as starting skills or the matchups it favours.
- **Mobile:** the "Week plans" button is cut to "plans", the gym name is truncated, and the "Your next move" button is about two screens below the gym art.
- **Accessibility:** the tactic cards on the fight-prep page didn't appear as interactive controls in the accessibility tree (they do on fight night).
- **Booking:** the second offer in fight 2 was "Unavailable", so the "choice" was a forced rematch. Show at least two bookable offers, labelled **Easier / Even / Harder**.

## What's working (keep it)
- "Your next move" plus the End week bar always tells you what to do next.
- "Your edge / Watch out for" on the matchup screen is instantly useful.
- Calling rounds with a visible gas cost is a real decision. Switching to "Save your gas" in round 2 lost that round, which was clear and fair.
- The midpoint check-in and the week report are the right ideas. They just need numbers and consistency.
- The art and tone are strong and consistent.

## Suggested order of work
1. Round scorecard with control, plus a "why you won or lost" line (P0-1). This is small, contained in the UI, and has the highest impact.
2. Copy fixes from P2, the fight-night primary button, opponent portraits and tactics autosave.
3. A single tactics vocabulary and the fight-night number shown everywhere (P1-5, P1-6).
4. Progressive disclosure of systems and the sidebar (P0-4).
5. Design decisions for the owner: calendar format (P0-2) and the first-session week budget (P0-3).
6. Animated round playback (P1-12).
