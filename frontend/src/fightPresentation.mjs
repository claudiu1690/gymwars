const finishTypes = new Set(["ko", "tko", "sub", "submission"]);

export function fightCompetition(b) {
  return b.competition === "invitational"
    ? b.eventName || "Gym Invitational"
    : b.title
      ? "Regional championship"
      : "Regional fight night";
}

// Locked, public pre-fight stats survive camp-bonus consumption and later
// roster changes. Never reconstruct an old bonus from today's fighter.
export function fightStatDisplay(b, fighter, side = "A") {
  const prepared = b.preparation?.[side === "A" ? "you" : "them"];
  const stats = prepared?.effectiveStats || fighter.stats;
  const bonuses =
    prepared?.bonuses ||
    (prepared?.stat && prepared?.value
      ? [{ stat: prepared.stat, value: prepared.value, source: "camp" }]
      : []);
  return Object.entries(stats).map(([key, value]) => ({
    key,
    value,
    bonus: bonuses
      .filter((bonus) => bonus.stat === key)
      .reduce((n, bonus) => n + bonus.value, 0),
    sources: [
      ...new Set(
        bonuses
          .filter((bonus) => bonus.stat === key)
          .map((bonus) => bonus.source || "camp"),
      ),
    ],
  }));
}

export function fightRewardSummary(b) {
  const rewards = b.rewards;
  const invitational =
    (rewards?.competition || b.competition) === "invitational";
  const delta = rewards?.rankingDelta;
  const ranking = Number.isFinite(delta)
    ? `${delta > 0 ? "+" : delta < 0 ? "−" : ""}${Math.abs(delta)} points`
    : invitational
      ? "No regional ranking change"
      : b.result?.winner === "A"
        ? "Win rule: +25 points"
        : b.result?.winner === "B"
          ? "Loss rule: up to 8 points removed"
          : "Draw rule: +5 points";
  return {
    purse: rewards?.purse ?? b.purse ?? null,
    ranking,
    rankingRecorded: Number.isFinite(delta),
    readiness: Number.isFinite(rewards?.readinessAfter)
      ? rewards.readinessAfter
      : null,
    legacy: Number.isFinite(rewards?.legacyDelta) ? rewards.legacyDelta : null,
    card: rewards?.card || null,
    trophy: rewards?.trophy || null,
  };
}

/** True recorded round endpoints, not damage guessed from narration. Old
 * saves can show scored totals, but never acquire invented round deltas. */
export function roundFeedback(b, names = { A: "You", B: "Opponent" }) {
  const latest = (b.roundSummaries || b.result?.roundSummaries || []).at(-1);
  const snapshot = b.snapshot;
  const totals = b.result?.totals;
  const score =
    latest?.roundsScored ||
    (snapshot
      ? { A: snapshot.A?.roundsWon, B: snapshot.B?.roundsWon }
      : totals
        ? { A: totals.A.roundsWon, B: totals.B.roundsWon }
        : null);
  const round = latest?.round || b.decisions?.length || b.result?.round || 0;
  if (!round) return null;
  const finish =
    latest?.finish ||
    (b.status === "resolved" && ["KO", "TKO", "SUB"].includes(b.result?.method)
      ? { winner: b.result.winner, method: b.result.method }
      : null);
  const title = finish
    ? `${names[finish.winner]} finishes by ${finish.method}`
    : latest?.winner
      ? `Round ${round} ${latest.winner === "A" ? "won" : "lost"}`
      : `Round ${round} completed`;
  let observation = null;
  if (latest) {
    if (latest.A.gasAfter < 30)
      observation = `Your gas is ${latest.A.gasAfter}%. Cautious pace slows further gas loss; it does not refill the tank.`;
    else if (latest.B.takedowns >= 2)
      observation = `${names.B} completed ${latest.B.takedowns} takedowns this round.`;
    else if (latest.B.subAttempts > 0)
      observation = `${names.B} attempted ${latest.B.subAttempts} submission${latest.B.subAttempts === 1 ? "" : "s"} this round.`;
    else if (latest.A.takedowns >= 2)
      observation = `You completed ${latest.A.takedowns} takedowns this round.`;
    else
      observation = `Damage dealt this round: you ${latest.A.damageDealt}, ${names.B} ${latest.B.damageDealt}.`;
  }
  return {
    round,
    title,
    score,
    A: latest?.A || null,
    B: latest?.B || null,
    observation,
    recorded: !!latest,
  };
}

/** At most three meaningful whole exchanges, ordered as they happened. */
export function significantExchanges(events = [], names, limit = 3) {
  const priority = (e) =>
    finishTypes.has(e.type)
      ? 6
      : e.type === "knockdown"
        ? 5
        : ["sub-attempt", "strike", "takedown"].includes(e.type)
          ? 4
          : [
                "counter",
                "td-stuffed",
                "ground-strikes",
                "signature-active",
              ].includes(e.type)
            ? 3
            : e.type === "light-strike"
              ? 1
              : 0;
  const groups = roundRecap(events, names);
  const selected = groups
    .map((g, index) => ({
      g,
      index,
      priority: Math.max(0, ...g.events.map(priority)),
    }))
    .filter((g) => g.priority > 0)
    .sort((a, b) => b.priority - a.priority || b.index - a.index)
    .slice(0, Math.max(0, Math.min(3, limit)))
    .sort((a, b) => a.index - b.index);
  return selected.map((g) => g.g);
}

// Older saved knockouts kept pre-knockout health. The verdict is authoritative;
// normalize that terminal display without rewriting the save or replaying it.
// TKO and submission can stop a fighter with health remaining.
export function fightCornerState(b, side) {
  const snapshot = b.snapshot?.[side];
  const result = b.status === "resolved" ? b.result : null;
  const lost = ["A", "B"].includes(result?.winner) && result.winner !== side;
  const knockout = lost && result.method === "KO";
  const opening = !result && !b.decisions?.length;
  return {
    health: knockout ? 0 : (snapshot?.health ?? (opening ? 100 : null)),
    gas: snapshot?.gas ?? (opening ? 100 : null),
    finishLabel: !lost
      ? null
      : result.method === "KO"
        ? "Knocked out · KO"
        : result.method === "TKO"
          ? "Referee stoppage · TKO"
          : result.method === "SUB"
            ? "Submitted"
            : null,
  };
}

// Presentation only: never replay, reroll or alter a saved combat result.
// The simulator resolves discrete exchanges, starting each new exchange on
// the feet. Group their timestamps so a ground exchange cannot read as one
// continuous sequence with the next standing exchange.
export function roundRecap(events = [], names = { A: "You", B: "Opponent" }) {
  const groups = [];
  for (const event of events) {
    let group = groups.at(-1);
    if (!group || group.time !== event.time || group.round !== event.round) {
      group = {
        id: `r${event.round}-${event.time}`,
        time: event.time,
        round: event.round,
        events: [],
        lines: [],
      };
      groups.push(group);
    }
    group.events.push(event);
  }
  let previousGround = null;
  const counts = new Map();
  for (const group of groups) {
    const boundary = group.events.every((e) =>
      ["round-start", "round-end"].includes(e.type),
    );
    if (previousGround && !boundary)
      group.lines.push({
        type: "reset",
        text: `Back on the feet: ${names[previousGround]} has stood up. A new exchange begins.`,
      });
    let down = null;
    let ground = null;
    for (const [index, event] of group.events.entries()) {
      const actor = event.actor;
      const other = actor === "A" ? "B" : "A";
      const countKey = `${event.round}-${event.type}-${actor}`;
      const count = counts.get(countKey) || 0;
      counts.set(countKey, count + 1);
      if (down && !finishTypes.has(event.type)) {
        group.lines.push({
          type: "reset",
          text: `${names[down]} recovers to standing; the exchange continues.`,
        });
        down = null;
      }
      let text = event.text;
      if (event.type === "takedown") {
        ground = actor;
        text =
          count % 2 === 0
            ? `${names[actor]} completes the takedown and settles on top of ${names[other]}.`
            : `${names[actor]} takes ${names[other]} back to the mat and establishes top control.`;
      } else if (event.type === "td-stuffed") {
        const hasCounter = group.events.some(
          (e) => e.type === "counter" && e.actor === actor,
        );
        text = `${names[actor]} stops ${names[other]}’s takedown${hasCounter ? "." : " and lands a counter."}`;
      } else if (event.type === "counter") {
        text = `${names[actor]} counters on the feet after stopping the shot, landing on ${names[other]}.`;
      } else if (event.type === "ground-strikes") {
        ground = actor;
        text =
          count % 2 === 0
            ? `${names[actor]} lands ground strikes from top position. ${names[other]} takes damage.`
            : `${names[actor]} follows the takedown with strikes on the mat, adding damage from the top.`;
      } else if (event.type === "active-guard") {
        text = `${names[actor]} works an active guard from the bottom, limiting ${names[other]}’s control.`;
      } else if (event.type === "sub-attempt") {
        text = `${names[actor]} threatens a submission${ground && actor !== ground ? " from the bottom" : " from top position"}; ${names[other]} breaks the hold. The ground exchange continues.`;
      } else if (event.type === "knockdown") {
        down = other;
        text = `${names[actor]} lands a heavy standing strike and knocks ${names[other]} down.`;
      } else if (event.type === "strike") {
        text =
          count % 2 === 0
            ? `${names[actor]} lands a clean standing strike on ${names[other]}.`
            : `${names[actor]} finds an opening on the feet and connects against ${names[other]}.`;
      } else if (event.type === "light-strike") {
        text =
          count % 2 === 0
            ? `${names[actor]} lands a short standing strike on ${names[other]}.`
            : `${names[actor]} connects on the feet, doing a little damage to ${names[other]}.`;
      } else if (event.type === "strike-defended") {
        text = `${names[actor]} keeps ${names[other]}’s standing attack from landing cleanly.`;
      } else if (event.type === "tko" && ground) {
        text = `${names[actor]} finishes with ground strikes. The referee stops the fight.`;
      } else if (event.type === "sub" || event.type === "submission") {
        text = `${names[actor]} secures the submission${ground && actor !== ground ? " from the bottom" : " from top position"}. ${names[other]} taps. The fight is over.`;
      } else if (event.type === "ko") {
        text = `${names[actor]} finishes the exchange with a knockout. ${names[other]} cannot continue.`;
      } else if (event.type === "tko") {
        text = `${names[other]} cannot defend the follow-up strikes. The referee stops it: ${names[actor]} wins by TKO.`;
      }
      group.lines.push({ ...event, id: `${group.id}-${index}`, text });
      if (finishTypes.has(event.type)) down = null;
    }
    if (down)
      group.lines.push({
        type: "reset",
        text: `${names[down]} survives the knockdown and recovers to standing.`,
      });
    previousGround =
      ground && !group.events.some((e) => finishTypes.has(e.type))
        ? ground === "A"
          ? "B"
          : "A"
        : null;
  }
  return groups;
}

export function fightLessons(b, side = "A") {
  if (b.status !== "resolved" || !b.result) return [];
  const other = side === "A" ? "B" : "A",
    prepared = b.preparation?.[side === "A" ? "you" : "them"],
    lessons = [];
  const readiness = b.readiness?.[side === "A" ? "you" : "them"];
  if (Number.isFinite(readiness))
    lessons.push({
      id: "readiness",
      label: "ENTERING THE CAGE",
      value: `${readiness}% ready`,
      detail:
        readiness < 80
          ? "Fatigue carried into this fight. Leave recovery weeks before the next date."
          : "You arrived rested enough to use your skills. Readiness alone does not decide the bout.",
    });
  if (prepared) {
    const bonuses = prepared.bonuses || (prepared.value ? [prepared] : []);
    lessons.push({
      id: "preparation",
      label: "SAVED FIGHT PREPARATION",
      value: bonuses.length
        ? bonuses.map((x) => `+${x.value} ${x.stat}`).join(" · ")
        : "No temporary bonus",
      detail: bonuses.length
        ? "These bonuses were present in the saved fight inputs. They are separate from permanent training growth."
        : "This bout had no recorded temporary camp or mentoring bonus. Permanent skills still applied.",
    });
  }
  const rounds = b.roundSummaries || b.result.roundSummaries || [],
    last = rounds.at(-1)?.[side];
  const plan = b.decisions?.at(-1)?.[side === "A" ? "a" : "b"] || b.savedPlan;
  if (plan?.approach && plan?.pace)
    lessons.push({
      id: "tactics",
      label: "SAVED CORNER CALL",
      value: `${{ strike: "Striking", grapple: "Grappling", balanced: "Mixed attack" }[plan.approach] || plan.approach} · ${plan.pace} pace`,
      detail: `${plan.finish === "hunt-finish" ? "You hunted the finish, committing more gas." : "You chose to stay composed rather than force a finish."}${Number.isFinite(last?.gasAfter) ? ` Last recorded gas: ${last.gasAfter}%. ${last.gasAfter < 30 ? "Compare a steadier pace or an earlier gas-saving rule next time." : "Your pace left fuel for the late exchanges."}` : " Compare the recorded rounds before changing your approach."}`,
    });
  if (!plan && Number.isFinite(last?.gasAfter))
    lessons.push({
      id: "gas",
      label: "FINAL RECORDED ROUND",
      value: `${last.gasAfter}% gas left`,
      detail:
        last.gasAfter < 30
          ? "Your tank ran low. Compare a steadier pace or earlier gas-saving rule next time; cautious pace slows spending rather than refilling gas."
          : "Your pace left fuel for the late exchanges. Keep weighing pressure against endurance.",
    });
  if (
    lessons.length < 3 &&
    b.result.totals?.[side] &&
    b.result.totals?.[other]
  ) {
    const a = b.result.totals[side].damage,
      o = b.result.totals[other].damage;
    if (Number.isFinite(a) && Number.isFinite(o))
      lessons.push({
        id: "damage",
        label: "RECORDED DAMAGE",
        value: `${Math.round(a)} dealt · ${Math.round(o)} received`,
        detail:
          "Damage is one part of the result alongside control, scored rounds and finishing exchanges. Compare the opponent before choosing your next training focus.",
      });
  }
  const discoveries = side === "A" ? b.rewards?.discoveredTraits || [] : [];
  for (const trait of discoveries)
    lessons.push({
      id: "trait-" + trait.id,
      label: "NEWLY DISCOVERED",
      value: trait.id.replaceAll("-", " "),
      detail:
        trait.description +
        " This trait was revealed after this bout; it is one part of the matchup.",
    });
  const decisive = (b.result.rounds || [])
    .flatMap((r) => r.events || [])
    .findLast((e) => finishTypes.has(e.type) || e.type === "knockdown");
  if (decisive)
    lessons.push({
      id: "decisive",
      label: "RECORDED EXCHANGE",
      value: `Round ${decisive.round} · ${decisive.time}`,
      detail: decisive.text,
    });
  return lessons;
}

export function fightReport(b, names) {
  const result = b.result;
  if (!result) return null;
  const winner = result.winner;
  const decision = ["DEC", "SPLIT-DEC", "DRAW"].includes(result.method);
  const a = result.totals.A,
    other = result.totals.B;
  const explanation =
    winner === "draw"
      ? `Neither fighter took the decision: ${a.roundsWon}–${other.roundsWon} scored rounds, with no decisive damage advantage.`
      : decision
        ? `${names[winner]} wins the decision. Scored rounds: ${names.A} ${a.roundsWon}, ${names.B} ${other.roundsWon}. ${a.roundsWon === other.roundsWon ? "Damage breaks the tied rounds in this simulation." : "Damage and control decide each round; takedowns alone do not decide the fight."}`
        : `${names[winner]} wins by ${result.method} in round ${result.round} at ${result.time}.`;
  const events = (result.rounds || []).flatMap((r) => r.events);
  const ranked = events
    .map((e, i) => ({ ...e, index: i }))
    .filter((e) => e.actor === winner);
  const priority = (e) =>
    finishTypes.has(e.type)
      ? 5
      : e.type === "knockdown"
        ? 4
        : ["strike", "takedown"].includes(e.type)
          ? 3
          : ["td-stuffed", "counter", "ground-strikes"].includes(e.type)
            ? 2
            : e.type === "light-strike"
              ? 1
              : 0;
  const seenExchanges = new Set();
  const selected = ranked
    .filter((e) => priority(e))
    .sort((a, b) => priority(b) - priority(a) || b.index - a.index)
    .filter((e) => {
      const key = `${e.round}-${e.time}`;
      if (seenExchanges.has(key)) return false;
      seenExchanges.add(key);
      return true;
    })
    .slice(0, 3)
    .sort((a, b) => a.index - b.index);
  const groups = roundRecap(events, names);
  const translated = groups.flatMap((g) => g.lines);
  // Highlight whole exchanges, not disconnected lines. Both views use the
  // same canonical groups so standing resets and submission setups agree.
  const momentGroups = groups.filter((g) =>
    selected.some((e) => e.round === g.round && e.time === g.time),
  );
  return {
    groups,
    momentGroups,
    explanation,
    moments: selected.map(
      (e) =>
        translated.find(
          (x) =>
            x.round === e.round &&
            x.time === e.time &&
            x.type === e.type &&
            x.actor === e.actor,
        ) || e,
    ),
    momentTitle:
      winner === "draw"
        ? "An evenly contested result"
        : `${names[winner]}’s key moments`,
  };
}

export function careerGoal(s, preferred) {
  const team = s.fighters.filter((f) => !f.retired && !f.released);
  const f =
    preferred && team.some((f) => f.id === preferred.id)
      ? preferred
      : [...team].sort(
          (a, b) =>
            Number(!!b.isChampion) - Number(!!a.isChampion) ||
            b.rankingPoints - a.rankingPoints,
        )[0];
  const reigns = s.fighters.reduce(
    (n, f) => n + (f.championships?.length || 0),
    0,
  );
  const defenses = s.fighters.reduce(
    (n, f) =>
      n + (f.championships || []).reduce((sum, c) => sum + c.defenses, 0),
    0,
  );
  const points = f?.rankingPoints || 0;
  const stage = !f
    ? "rebuild"
    : f.isChampion
      ? "defend"
      : points >= 80
        ? "challenge"
        : "climb";
  return {
    fighter: f,
    points,
    reigns,
    defenses,
    stage,
    title:
      stage === "rebuild"
        ? "Raise the next generation"
        : stage === "defend"
          ? "Defend your regional title"
          : stage === "challenge"
            ? "Bring the belt home"
            : reigns
              ? "Build your next title contender"
              : "Earn your first regional title",
    next:
      stage === "rebuild"
        ? "Recruit a rebuilding prospect and develop the gym’s next contender. Your history stays in the Hall of Fame."
        : stage === "defend"
          ? `${f.name} holds the belt. A successful defense adds 20 legacy; train a successor to carry the gym forward.`
          : stage === "challenge"
            ? `${f.name} has reached 80 ranking points. Check offers for a championship bout; an available champion is guaranteed an offer.`
            : `${f.name}: ${points} / 80 ranking points to unlock championship opponents. A win adds 25, a draw adds 5, and a loss removes up to 8.`,
    // This is a visible summary of the existing career, not a new reward system.
    milestones: [
      s.boutsCompleted > 0,
      points >= 80 || reigns > 0,
      reigns > 0,
      defenses > 0,
    ],
  };
}
