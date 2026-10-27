# Career Path — v2

13 October 2026. Replace the Invitational-only destination with a readable overview of the whole club career, using the approved trophy-room and arena art.

The page opens with one prominent next action. Due fights and camp check-ins take priority. Otherwise it follows the current title-run milestone, an active Invitational card, the next post-trophy challenge or full career completion. The selected action uses the real saved state; planning and navigation never advance time.

Show the regional title run as five visible milestones, then all six competition circuits with written status, promotion requirements, actual achievement progress and standard fight purses. Club promotion and buying a larger gym remain separate. Existing Invitational entry, matchup choices, fixed lineup confirmation, preparation links, bout play and rewards remain intact.

The Invitational is a three-fighter career event requiring two wins. Gym Wars remains a separate four-division ranked league. Remove the obsolete free-practice copy. An Invitational win does not imply the entire career is complete: show club challenges, the World promotion requirement and staff development as continuing goals.

Reuse the approved chunky cartoon trophy-room and fight-arena images. Use navy scenes, cream cards, coral primary actions and teal earned states. Write earned/current/later statuses explicitly. Keep descriptions and rewards visible without dropdowns or information disclosures, and retain plain button labels without decorative arrows.

The fight-booking cards now use “Find a fight” consistently. A recovering fighter's card separately shows the earliest fight date; it still opens the same contract selection screen.

For local leaderboard review, `scripts/seedPreviewLeaderboard.js` creates 20 reproducible test gym accounts with four valid weight classes, published defenses and 117 real simulated ranked cards. It accepts only a loopback `gymwars_preview` database. Re-running it reuses identities and command IDs. Existing player saves are verified unchanged. Test grants apply only to the new test gyms; no production leaderboard behavior or scoring rules are modified.

Validation completed: production build passed; 316 tests passed, 6 optional database tests skipped, no failures. Twelve browser scenarios passed at 320, 390, 768, 1024 and 1440 pixels, including fresh and complete careers, an active Invitational, retry and victory, due fights, staff work/earned promotion, consistent booking labels and the populated leaderboard. No browser errors, dropdowns or horizontal overflow were found. The repeat seed produced zero new cards. A full database snapshot comparison verified that all accounts, careers, receipts, test gyms and ranked results survived the local API reload unchanged. Evidence is in `output/career-path-2026-10-13/`.
