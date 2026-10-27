// Assist repeated UI interactions in one organic save. Read public state only.
// No fixtures, direct career commands, outcome selection, purchases or resource grants.
module.exports = async function play(h, weeks) {
  const { page, state, checkpoint, mutation, train, book, log, act } = h;
  const { folder } = require("./playthroughConfig.cjs");
  const active = (s) => s.fighters.filter((f) => !f.retired && !f.released);
  const divisions = [
    "featherweight",
    "lightweight",
    "middleweight",
    "heavyweight",
  ];
  const grapplers = ["wrestling", "bjj", "judo", "sambo"];
  const planFor = (f) =>
    grapplers.includes(f.style) ? "Take it to the ground" : "Keep it standing";
  const history = [];
  let summitAttempted = false;
  const useSportingGoals = require("node:fs").existsSync(require("node:path").join(require("./playthroughConfig.cjs").folder, "prefer-sporting-goals"));
  let summitWon = false;
  let goalMet = false;
  const lessonCandidate = (s) => {
    const options=(s.mentoringOptions||[]).filter(o=>o.mentorId==="veteran" &&
      (o.canStart || o.blockedReason==="Both fighters need clear schedules for mentoring."));
    return options.find(o=>o.canStart)||options[0];
  };
  async function click(name) {
    return page.getByRole("button", { name, exact: true }).click();
  }
  async function recruit(s) {
    for (const division of divisions) {
      s = (await state()).career;
      if (active(s).some((f) => f.weightClass === division)) continue;
      if (active(s).length >= s.rules.facilities[s.facilityTier].slots) break;
      const r = s.board.find(
        (r) =>
          !r.signed &&
          r.fighter.weightClass === division &&
          (r.investigated || s.scoutsUsed < s.rules.scoutsPerWeek),
      );
      if (!r) continue;
      await page.goto("/career/scouting");
      await page
        .locator(".scout-prospect-card")
        .filter({ hasText: r.fighter.name })
        .click();
      if (!r.investigated)
        await mutation(() =>
          page.getByRole("button", { name: /^Investigate / }).click(),
        );
      s = (await state()).career;
      const investigated = s.board.find((v) => v.id === r.id);
      if (investigated.fee > s.cash - s.weeklyCost * 4) {
        log("decision", {
          reason: "Preserve four weeks of operating cash",
          report: r.id,
          fee: investigated.fee,
        });
        continue;
      }
      await page.getByRole("button", { name: /^Offer a place/ }).click();
      await mutation(() =>
        page.getByRole("button", { name: /^Confirm signing/ }).click(),
      );
      await checkpoint("recruited-" + division, true);
    }
  }
  async function signature(f) {
    if (!f.signatureAccess?.eligible || f.signatureId) return;
    await page.goto("/career/fighter/" + f.id);
    const card = page.locator(".signature-ability-card").filter({
      hasText: grapplers.includes(f.style)
        ? "Pace Keeper"
        : "Clean Combinations",
    });
    await card.click();
    await mutation(() => click("Confirm signature"));
    await checkpoint("signature-" + f.id, true);
  }
  async function facilities(s) {
    const e = s.gymDevelopment.expansion;
    if (
      e.canUpgrade &&
      !s.upgrade &&
      s.cash >= e.next.cost + 8 * (s.weeklyCost + e.next.upkeep)
    ) {
      await page.goto("/career/gym/facilities");
      await page
        .getByRole("button", {
          name: new RegExp("^Inspect tier " + e.nextTier + ":"),
        })
        .click();
      await page.getByRole("button", { name: /^Expand gym/ }).click();
      await mutation(() => click("Confirm expansion"));
      await checkpoint("expansion-" + e.nextTier, true);
    }
    s = (await state()).career;
    if (
      !s.staff.coach &&
      active(s).length === 4 &&
      s.cash >= 450 + s.weeklyCost * 8
    ) {
      await page.goto("/career/gym/staff");
      await mutation(() =>
        page
          .locator('.gym-staff-card[data-role="coach"]')
          .getByRole("button", { name: /^Hire ·/ })
          .click(),
      );
      await checkpoint("coach-hired", true);
    } else if (
      s.staff.coach &&
      s.staffOptions.coach.canUpgrade &&
      s.cash >= s.staffOptions.coach.next.fee + 8 * s.weeklyCost
    ) {
      await page.goto("/career/gym/staff");
      await mutation(() =>
        page
          .locator('.gym-staff-card[data-role="coach"]')
          .getByRole("button", { name: /^Promote ·/ })
          .click(),
      );
      await checkpoint("coach-promoted", true);
    }
    s = (await state()).career;
    for (const key of [
      "strikingBay",
      "grapplingLab",
      "recoverySuite",
      "conditioningStudio",
      "filmRoom",
    ]) {
      const room = s.departmentOptions[key];
      if (
        room?.level === 0 &&
        room.canUpgrade &&
        s.cash >= room.next.fee + s.weeklyCost * 10
      ) {
        await page.goto("/career/gym/facilities");
        await page
          .getByRole("button", { name: new RegExp("^" + room.name + ",") })
          .click();
        await page.getByRole("button", { name: /^Build room/ }).click();
        await mutation(() =>
          page
            .getByRole("button", {
              name: new RegExp("^Confirm · \\$" + room.next.fee + "$"),
            })
            .click(),
        );
        await checkpoint("room-" + key, true);
        break;
      }
    }
  }
  async function mentor(s) {
    if (s.facilityTier < 2 || s.mentoring.length) return;
    if (
      !s.veteranSigned &&
      active(s).length < s.rules.facilities[s.facilityTier].slots &&
      s.cash >= 180 + s.weeklyCost * 8
    ) {
      await page.goto("/career/gym/mentoring");
      await click("Sign veteran · $180");
      await mutation(() => click("Confirm · $180"));
      await checkpoint("veteran-signed", true);
      s = (await state()).career;
    }
    const option = lessonCandidate(s);
    if (option && !option.canStart) log("decision", {reason:"Clear the eligible junior's schedule for a visible mentoring lesson",junior:option.juniorId,blockedReason:option.blockedReason});
    if (option?.canStart) {
      await page.goto("/career/gym/mentoring");
      const junior = s.fighters.find((f) => f.id === option.juniorId);
      await page
        .locator(".mentor-lesson")
        .filter({ hasText: junior.name })
        .filter({ hasText: "Marco Silva" })
        .getByRole("button", { name: "Choose lesson", exact: true })
        .first()
        .click();
      await mutation(() => click("Start lesson"));
      await checkpoint("mentoring-started", true);
    }
  }
  async function invitational(s) {
    const competition = s.journey.invitational;
    if (!competition.canEnter || s.journey.complete) return;
    const ids = competition.fighters.filter((f) => f.eligible).map((f) => f.id),
      available = active(s).filter((f) => ids.includes(f.id));
    if (available.length < 3) return;
    const lineup = [];
    for (let i = 0; i < 3; i++) {
      const candidates = available.filter((f) => !lineup.includes(f.id));
      candidates.sort((a, b) => {
        const skill =
          i === 0 ? "grappling" : i === 2 ? "striking" : "conditioning";
        return b.stats[skill] - a.stats[skill];
      });
      lineup.push(candidates[0].id);
    }
    await page.goto("/career/campaign");
    for (let i = 0; i < 3; i++) {
      await page.locator(".campaign-match-slot").nth(i).click();
      const f = s.fighters.find((f) => f.id === lineup[i]);
      await page
        .getByRole("group", {
          name: "Choose fighter for bout " + (i + 1),
          exact: true,
        })
        .getByRole("button")
        .filter({ hasText: f.name })
        .click();
    }
    await click("Enter Invitational");
    await mutation(() => click("Confirm entry"));
    await checkpoint("organic-invitational-entry", true);
  }
  async function wars(view) {
    const s = view.career;
    if (
      divisions.some((d) => !active(s).some((f) => f.weightClass === d)) ||
      !view.allowances.leagueCards.available
    )
      return;
    await page.goto("/career/gym-wars");
    const lobby = await page.evaluate(async () => {
      const r = await fetch("/api/career/wars/lobby", {
        headers: {
          Authorization: "Bearer " + localStorage.getItem("gw_token"),
        },
      });
      return r.json();
    });
    summitWon ||= (lobby.challenges || []).some(c => c.challenge?.minTier === 6 && c.complete);
    if (
      await page
        .getByRole("button", { name: "Set team & tactics", exact: true })
        .isVisible()
    ) {
      await page.getByRole("tab", { name: "Team", exact: true }).click();
      await mutation(() =>
        page
          .getByRole("button", { name: "Save team & tactics", exact: true })
          .click(),
      );
    }
    await page.getByRole("tab", { name: "Battle", exact: true }).click();
    const refresh = page.getByRole("button", { name: /^(Update trained fighters|Update team for new rules)$/ });
    if (await refresh.isVisible()) await mutation(() => refresh.click());
    const rivals = [...lobby.opponents].sort(
      (a, b) =>
        a.lineup.reduce(
          (s, f) => s + Object.values(f.stats).reduce((a, b) => a + b, 0),
          0,
        ) -
        b.lineup.reduce(
          (s, f) => s + Object.values(f.stats).reduce((a, b) => a + b, 0),
          0,
        ),
    );
    const cup = (lobby.challenges || []).find(c=>!c.locked&&!c.complete);
    if (cup) {
      log("decision", { reason: "Pursue the visible earned gym cup", rival: cup.name });
      await page.locator(".gw-club-cups article").filter({hasText:cup.name}).getByRole("button").click();
      const adaptationFile = require("node:path").join(folder, "late-cup-tactics-applied.json");
      if (useSportingGoals && cup.challenge.minTier === 6 &&
          require("node:fs").existsSync(require("node:path").join(folder,"adapt-late-cup-tactics")) &&
          !require("node:fs").existsSync(adaptationFile)) {
        // A recorded post-loss strategy change, from visible stats only; no outcome sampling.
        const calls = lobby.mine.defense.lineup.map(old => {
          const you=lobby.mine.choices.find(f=>f.id===old.id),them=cup.lineup.find(f=>f.weightClass===old.weightClass);
          const standing=you.stats.striking-them.stats.striking;
          const ground=.65*(you.stats.grappling-them.stats.grappling)+.35*(you.stats.submissions-them.stats.submissions);
          return { id:old.id,name:old.name,approach:ground>standing?"Take it to the ground":"Keep it standing",pace:"Stay measured",finish:"Stay composed" };
        });
        log("decision",{reason:"After repeated Summit losses with capped training, adjust calls from the visible four matchups; keep all accepted outcomes",week:s.week,calls});
        await page.getByRole("tab",{name:"Team",exact:true}).click();
        for(const call of calls) {
          await page.getByRole("button",{name:`Set ${call.name}'s tactics`,exact:true}).click();
          for(const label of [call.approach,call.pace,call.finish])await page.getByRole("button",{name:label,exact:true}).click();
        }
        const save=page.getByRole("button",{name:"Save team & tactics",exact:true});
        if(await save.isEnabled())await mutation(()=>save.click());
        require("node:fs").writeFileSync(adaptationFile,JSON.stringify({week:s.week,calls,visibleStatsOnly:true,noRerolls:true},null,2));
        await checkpoint("late-cup-tactics-adjusted",true);
        await page.getByRole("tab",{name:"Battle",exact:true}).click();
        await page.locator(".gw-club-cups article").filter({hasText:cup.name}).getByRole("button").click();
      }
    } else if (rivals[0]) {
      const previous=(lobby.history||[]).filter(c=>c.direction!=="defense").map(c=>c.opponentId);
      const rival = rivals.find(r=>!previous.includes(r.id)) || rivals[0];
      log("decision", { reason:"Try a new visible rival, then the weakest scouted matchup", rival:rival.name });
      await page.locator(".war-league-rivals > button").filter({hasText:rival.name}).click();
    }
    const play = page.getByRole("button", {
      name: "Play 4v4 · 1 token",
      exact: true,
    });
    if (await play.isEnabled()) {
      const result = await mutation(() => play.click());
      if (cup?.challenge?.minTier === 6) summitAttempted = true;
      if (cup?.challenge?.minTier === 6 && result.outcome === "win") summitWon = true;
      await checkpoint("organic-gym-war", true);
    }
  }
  for (let n = 0; n < weeks; n++) {
    let view = await state(),
      s = view.career;
    for (const b of s.fights.filter((b) =>
      ["ready", "live"].includes(b.status),
    ))
      await act({ op: "finish", id: b.id });
    view = await state();
    s = view.career;
    await wars(view);
    view = await state();
    s = view.career;
    for (const f of active(s).filter((f) => f.camp?.needsReview)) {
      await page.goto("/career/gym/training/" + f.id);
      await mutation(() => click("Continue camp"));
    }
    s = (await state()).career;
    if (s.boutsCompleted > 0) await recruit(s);
    s = (await state()).career;
    for (const f of active(s)) await signature(f);
    s = (await state()).career;
    if (s.boutsCompleted > 0) await facilities(s);
    s = (await state()).career;
    await mentor(s);
    s = (await state()).career;
    await invitational(s);
    s = (await state()).career;
    // Prefer earned belts/challenges, then a fresh affordable matchup at four weeks' notice.
    for (const selectedFighter of active(s)) {
      s = (await state()).career;
      const f = s.fighters.find((f) => f.id === selectedFighter.id);
      if (
        s.journey.invitational.unlocked &&
        !s.journey.complete &&
        !["scheduled", "ready", "live"].includes(
          s.journey.invitational.attempt?.status,
        )
      )
        continue;
      if (
        s.veteranSigned &&
        !s.mentoring.length &&
        [lessonCandidate(s)?.juniorId, "veteran"].includes(f.id)
      )
        continue;
      if (s.fights.some((b) => b.fighterId === f.id && b.status !== "resolved"))
        continue;
      if (
        s.mentoring.some(
          (p) =>
            p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
        )
      )
        continue;
      const eligible = f.offers.filter(
        (o) => !o.unavailable && !o.blockedReason && o.notice >= 4,
      );
      const sportingGoal = useSportingGoals && s.journey.completion.complete &&
        s.gymDevelopment.sportingGoals.find(g => eligible.some(o => o.circuit.id === g.id && !o.challengeId) &&
          !s.fights.some(b => b.status !== "resolved" && b.circuit?.id === g.id));
      const o = s.journey.completion.complete
        ? sportingGoal ? eligible.find(o => o.circuit.id === sportingGoal.id && !o.challengeId)
          : eligible.sort((a, b) => b.show - a.show)[0]
        : eligible.find((o) => o.challengeId) ||
          eligible.find((o) => o.title) ||
          eligible.sort(
            (a, b) =>
              Object.values(a.opponent.stats).reduce((a, b) => a + b, 0) -
              Object.values(b.opponent.stats).reduce((a, b) => a + b, 0),
          )[0];
      if (o) {
        log("decision", {
          reason: sportingGoal ? "Pursue the visible unfinished circuit honor, one committed fighter per circuit"
            : s.journey.completion.complete
            ? "Post-career: choose the highest visible guaranteed purse to fund remaining upgrades"
            : "Earned objective or weakest scouted four-week matchup",
          fighter: f.id,
          offer: o.offerId,
          show: o.show,
          circuit: o.circuit.name,
        });
        await book({
          fighterId: f.id,
          offerId: o.offerId,
          approach: planFor(f),
        });
      }
    }
    s = (await state()).career;
    for (const f of active(s)) {
      const b = s.fights.find(
        (b) => b.fighterId === f.id && b.status === "scheduled",
      );
      if (
        f.camp ||
        f.fatigue > 20 ||
        s.mentoring.some(
          (p) =>
            p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
        )
      )
        continue;
      if (b && b.eventWeek - s.week < 2) continue;
      if (
        !b &&
        s.journey.invitational.unlocked &&
        !s.journey.complete &&
        !["scheduled", "ready", "live"].includes(
          s.journey.invitational.attempt?.status,
        )
      )
        continue;
      if (!b && f.offers.some((o) => !o.unavailable && !o.blockedReason))
        continue;
      if (
        s.veteranSigned &&
        !s.mentoring.length &&
        [lessonCandidate(s)?.juniorId, "veteran"].includes(f.id)
      )
        continue;
      const preset =
        s.week % 12 === 0 || (f.record.losses >= 3 && f.record.wins === 0)
          ? "All-round training"
          : grapplers.includes(f.style)
            ? "Grappling drills"
            : "Striking drills";
      const duration = b && b.eventWeek - s.week < 4 ? 1 : 4;
      log("decision", {
        reason:
          duration === 1
            ? "Tune up in the remaining preparation window after recovery"
            : "Four-week development camp with final recovery week",
        fighter: f.id,
        preset,
      });
      await train({ fighterId: f.id, weeks: duration, preset, fit: !!b });
    }
    view = await state();
    s = view.career;
    if (!view.allowances.careerWeeks.available) {
      await checkpoint("normal-return-gate", true);
      await act({ op: "return" });
    }
    await page.goto("/career");
    await act({ op: "end" });
    const after = await state();
    history.push({
      week: after.career.week,
      cash: after.career.cash,
      bouts: after.career.boutsCompleted,
      tier: after.career.facilityTier,
      complete: after.career.journey.completion.complete,
    });
    if (after.career.week % 8 === 0)
      await checkpoint("week-" + after.career.week, true);
    console.log(JSON.stringify({ progress: history.at(-1) }));
    if (after.career.facilityTier === 6 && after.career.staff.coach?.rank === 5 && (useSportingGoals ? summitWon : summitAttempted) &&
        require("node:fs").existsSync(require("node:path").join(require("./playthroughConfig.cjs").folder,"stop-at-hq"))) { goalMet = true; break; }
    if (
      after.career.journey.completion.complete &&
      !require("node:fs").existsSync(
        require("node:path").resolve(
          __dirname,
          require("./playthroughConfig.cjs").folder, "continue-postgame",
        ),
      )
    )
      break;
  }
  return { history, goalMet, save: await checkpoint("segment-end", true) };
};
