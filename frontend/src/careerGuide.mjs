import { calendarDate } from "./careerCalendar.mjs";
import { divisionCoverage, divisionLabel } from "./careerCompetition.mjs";
// Advice is derived from the actual save, so returning players and reloads
// resume at the right action without a separate tutorial progress flag.
export function advanceEstimate(s, untilEvent = true) {
  if (!untilEvent) return 1;
  const dates = [s.week + 8];
  for (const b of s.fights)
    if (b.status === "scheduled") dates.push(b.eventWeek);
  for (const f of s.fighters)
    if (f.camp) {
      const c = f.camp;
      dates.push(c.endWeek);
      if (c.weeks > 1 && !c.reviewed)
        dates.push(c.startedWeek + Math.floor(c.weeks / 2));
    }
  if (s.upgrade) dates.push(s.upgrade.endWeek);
  for (const p of s.mentoring) if (p.status === "active") dates.push(p.endWeek);
  const fundedWeeks = Math.max(1, Math.floor(s.cash / s.weeklyCost));
  return Math.min(
    fundedWeeks,
    ...dates.filter((w) => w > s.week).map((w) => w - s.week),
  );
}

export function careerGuide(s) {
  const team = s.fighters.filter((f) => !f.retired && !f.released);
  const due = s.fights.find((b) => ["ready", "live"].includes(b.status));
  if (due)
    return {
      kind: "fight",
      step: 3,
      id: due.id,
      title: "It’s fight night.",
      body: "Your preparation is done. Enter the fight, play a round at a time, or let your coach handle the whole bout.",
      cta: due.status === "live" ? "Resume the fight" : "Go to fight night",
    };
  const review = team.find((f) => f.camp?.needsReview);
  if (review)
    return {
      kind: "camp-review",
      step: 1,
      id: review.id,
      title: `Review ${review.name}’s camp.`,
      body: "You’re halfway through. Keep training for more skill growth, or stop now and recover for the fight.",
      cta: "Make the camp decision",
    };
  if (!team.length)
    return {
      kind: "rebuild",
      step: 0,
      title: "Start a new generation.",
      body: "Your fighters have retired. A free local prospect can help you rebuild the gym.",
      cta: "Recruit a free prospect",
    };
  const bout = s.fights
    .filter((b) => b.status === "scheduled")
    .sort((a, b) => a.eventWeek - b.eventWeek)[0];
  if (bout) {
    const f = team.find((f) => f.id === bout.fighterId);
    if (f?.camp)
      return {
        kind: "advance",
        id: f.id,
        step: 1,
        untilEvent: false,
        title: "Put the training into practice.",
        body: `${f.name}’s camp is assigned. Press End week when the whole team is ready. Each click plays one week of training and recovery.`,
        cta: "End week",
        advanceTitle: "End week",
      };
    const lastBoutWeek = Math.max(
      -1,
      ...s.fights
        .filter((b) => b.fighterId === f?.id && b.status === "resolved")
        .map((b) => b.resolvedWeek),
    );
    const trained =
      f?.lastCamp &&
      !f.lastCamp.interrupted &&
      f.lastCamp.endedWeek > lastBoutWeek;
    if (
      f &&
      !trained &&
      bout.eventWeek - s.week >= 2 &&
      s.cash >= s.weeklyCost &&
      f.fatigue <= 35
    )
      return {
        kind: "train",
        step: 1,
        id: f.id,
        title: `Prepare ${f.name} for the bout.`,
        body: "Assign a one-week camp, then press End week when your team is ready. Training improves skills but adds fatigue; leave time to recover before fight night.",
        cta: "Plan training",
      };
    return {
      kind: "advance",
      step: 2,
      id: f?.id,
      untilEvent: false,
      title: "Arrive fresh on fight night.",
      body: `The bout is on ${calendarDate(s, bout.eventWeek)}. ${trained ? "Training is complete. " : ""}Fighters outside camp recover when you press End week.`,
      cta: "End week",
      intent: "recover",
      advanceTitle: "Recover and reach fight night",
    };
  }
  if (
    s.journey?.invitational.unlocked &&
    !s.journey.complete &&
    (s.journey.invitational.canEnter ||
      team.length < s.journey.invitational.teamSize)
  )
    return {
      kind: "journey",
      step: 4,
      title:
        team.length < s.journey.invitational.teamSize
          ? "A champion needs a team."
          : "Your invitation has arrived.",
      body:
        team.length < s.journey.invitational.teamSize
          ? "The regional belt opens the Career Invitational. Recruit three fighters, choose their matchups and win two bouts to bring home the team trophy."
          : "Take three fighters into the Invitational. Compare the opponents, choose your lineup and prepare together for the final team card.",
      href: s.journey.nextAction.href,
      cta: s.journey.nextAction.label,
    };
  const free = team.filter(
    (f) =>
      !f.camp &&
      !s.mentoring.some(
        (p) => p.status === "active" && [p.mentorId, p.juniorId].includes(f.id),
      ),
  );
  if (!free.length)
    return {
      kind: "advance",
      step: 1,
      untilEvent: false,
      title: "Let the team finish its work.",
      body: "Your fighters are training or mentoring. Press End week to play the next week for the team.",
      cta: "End week",
      advanceTitle: "Finish the next team commitment",
    };
  const fit = [...free].sort((a, b) => a.fatigue - b.fatigue)[0];
  if (fit.fatigue >= s.rules.recoveryPerWeek && s.cash >= s.weeklyCost)
    return {
      kind: "advance",
      step: 2,
      untilEvent: false,
      title:
        s.boutsCompleted === 1
          ? "First fight finished. Now recover."
          : "Give your fighters a recovery week.",
      body: `${fit.name} needs recovery. Fighters outside camp rest when you press End week; assigned teammates train during the same week.`,
      id: fit.id,
      cta: "End week",
      intent: "recover",
      advanceTitle: "Recover for one week",
    };
  const coverage = divisionCoverage(team);
  if (s.boutsCompleted > 0 && !coverage.complete) {
    const division = coverage.missing[0];
    const room = team.length < s.rules.facilities[s.facilityTier].slots;
    const report = s.board?.find((candidate) => !candidate.signed && coverage.missing.includes(candidate.fighter.weightClass) &&
      (candidate.investigated ? candidate.fee <= s.cash : s.scoutsUsed < s.rules.scoutsPerWeek));
    if (!room || report) return {
      kind: "recruit-team", step: 4,
      title: team.length === 1 ? "Bring someone into your corner." : `Build your corner · ${coverage.covered}/4 divisions.`,
      body: !room ? `Your roster is full, but ${divisionLabel(division)} is missing. Review your reserves or expand the gym to make room.` :
        `Your debut is done. Recruit one fighter in each division for Gym Wars. ${divisionLabel(report.fighter.weightClass)} is available on this week’s board; any rarity qualifies.`,
      href: room ? `/career/scouting?division=${report.fighter.weightClass}` : "/career/roster",
      cta: room ? `Find a ${divisionLabel(report.fighter.weightClass).toLowerCase()}` : "Manage team spaces",
    };
    const unaffordable = s.board?.filter((candidate) => !candidate.signed && candidate.investigated &&
      coverage.missing.includes(candidate.fighter.weightClass) && candidate.fee > s.cash)
      .sort((a, b) => a.fee - b.fee)[0];
    if (unaffordable && fit.offers?.length) return {
      kind: "book", step: 4, id: fit.id,
      title: "Fight for your next teammate.",
      body: `The investigated ${divisionLabel(unaffordable.fighter.weightClass).toLowerCase()} costs $${unaffordable.fee}; your gym has $${s.cash}. Book ${fit.name} for a career purse, then return to recruitment.`,
      cta: "Choose a paying bout",
    };
    return {
      kind: "advance", step: 4, untilEvent: false,
      title: "Your next teammate arrives next week.",
      body: `${s.scoutsUsed >= s.rules.scoutsPerWeek ? "This week’s investigations are used." : "This board has no affordable, available prospect for your missing divisions."} Check the team’s training or rest plans, then End week to meet new prospects.`,
      cta: "End week", advanceTitle: "Meet the next prospects",
    };
  }
  if (s.journey?.careerComplete && s.journey?.completion?.nextAction) return {
    kind: "optional-goal", step: 0,
    title: s.journey.completion.label,
    body: s.journey.completion.description,
    href: s.journey.completion.nextAction.href,
    cta: s.journey.completion.nextAction.label,
  };
  if (!fit.offers?.length)
    return {
      kind: "advance",
      step: 0,
      untilEvent: false,
      title: "Refresh your fight opportunities.",
      body: "No compatible opponent is available for this fighter this week. Press End week to refresh the regional circuit.",
      cta: "End week",
      advanceTitle: "Refresh fight opportunities",
    };
  const challenge = s.journey?.postInvitationalChallenge;
  const challenger = challenge && free.find((fighter) => fighter.offers?.some((offer) => offer.challengeId === challenge.id));
  if (challenger) return {
    kind: "book", step: 4, id: challenger.id,
    title: `Take on the ${challenge.name}.`,
    body: `${challenger.name} can enter your club’s next earned challenge. Read the matchup, prepare, and fight for its permanent trophy.`,
    cta: "Choose the challenge bout",
  };
  return {
    kind: "book",
    step: 0,
    id: fit.id,
    title: s.boutsCompleted
      ? "Choose your next matchup."
      : "First, book your opening fight.",
    body: s.boutsCompleted
      ? `${fit.name} is available. Pick an opponent, then we’ll prepare and recover before the bout.`
      : `${fit.name} is your first fighter. Pick an opponent; we’ll guide you through preparation next. Scouting and upgrades can wait.`,
    cta: s.boutsCompleted ? "Choose an opponent" : "Choose my first opponent",
  };
}

export function bookingWeeks(s, f) {
  return Math.min(
    8,
    Math.max(
      2,
      (f.nextBoutWeek || 0) - s.week,
      (f.camp?.endWeek || 0) - s.week + 1,
    ),
  );
}
