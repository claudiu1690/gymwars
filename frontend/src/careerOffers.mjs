const skills = ["striking", "grappling", "submissions", "conditioning"];
const average = (fighter) =>
  skills.reduce((total, skill) => total + fighter.stats[skill], 0) /
  skills.length;

// Advice uses public skills, records and earned honors. It never predicts a win,
// changes an offer, or books on the player's behalf.
export function offerPurpose(s, f, offer) {
  const gap = average(f) - average(offer.opponent);
  const matchup =
    gap < -12
      ? "Stronger opponent"
      : gap > 12
        ? "Favorable skills"
        : "Competitive skills";
  let kind = "record",
    label = "Build your record",
    priority = 20;
  let description =
    "A career result and the quoted purse. A win earns the win bonus.";
  if (offer.challengeReward) {
    kind = "challenge";
    label = offer.challengeReward.trophy;
    description = `Win to earn ${label}${offer.challengeReward.cash > 0 ? ` and the $${offer.challengeReward.cash.toLocaleString("en-US")} first-victory prize` : ""}. The prize is separate from the bout purse.`;
    priority = 180;
  } else if (offer.honorReward) {
    kind = "honor";
    label = offer.honorReward.trophy;
    description = `Win this capstone for the permanent honor and $${offer.honorReward.cash.toLocaleString("en-US")} first-victory prize, awarded once per gym and separate from the bout purse.`;
    priority = 160;
  } else if (offer.circuitOpponentId) {
    const beaten = new Set(
      s.fights
        .filter(
          (bout) =>
            bout.status === "resolved" &&
            bout.result?.winner === "A" &&
            bout.circuit?.id === offer.circuit.id,
        )
        .map((bout) => bout.circuitOpponentId),
    );
    const honored = !!s.circuitHonors?.[offer.circuit.id];
    if (!honored && !offer.capstone && !beaten.has(offer.circuitOpponentId)) {
      kind = "invitation";
      label = "Earn the capstone invitation";
      const styles =
        s.rules.circuitPacks
          .find((pack) => pack.circuitId === offer.circuit.id)
          ?.opponents.filter((opponent) => !opponent.capstone) || [];
      const current = styles.filter((opponent) =>
        beaten.has(opponent.id),
      ).length;
      description = `Win this new ${offer.circuit.name} style test. Your gym has beaten ${current}/${styles.length} styles; beat both to open its capstone.`;
      priority = 100;
    } else {
      kind = "rematch";
      label = "Record & purse";
      description = honored
        ? "Your gym already owns this circuit honor. Compete for your fighter’s record and the quoted purse; there is no repeat honor prize."
        : "Your gym has already beaten this style. The win bonus still pays; beating the other style moves the capstone invitation forward.";
    }
  } else if (offer.title) {
    kind = "title";
    label = f.isChampion ? "Defend the regional belt" : "Win the regional belt";
    description = f.isChampion
      ? "A successful defense keeps the belt and earns the quoted win bonus. Choose a competitive challenger for the title premium."
      : "Win to become regional champion and earn the quoted win bonus.";
    priority = f.isChampion ? 40 : 90;
  } else {
    const entry = f.offers?.find(
      (next) => next.qualification && !next.qualification.qualified,
    )?.qualification;
    if (entry)
      description = `A win counts toward this fighter’s next circuit entry: ${entry.wins}/${entry.required} career wins. The gym’s promotion stays earned.`;
  }
  // A reachable sporting step comes before an overmatched trophy attempt.
  const score =
    (gap >= -12 ? 300 : 0) +
    priority -
    Math.abs(gap) * 4 +
    (offer.notice >= 3 ? 15 : 0) -
    (offer.demand?.multiplier < 1 ? 20 : 0);
  return { kind, label, description, matchup, gap, score };
}

export function suggestedOffer(s, f, offers, circuitId = null) {
  const requested = offers.filter((offer) => offer.circuit?.id === circuitId);
  return [...(requested.length ? requested : offers)].sort(
    (a, b) => offerPurpose(s, f, b).score - offerPurpose(s, f, a).score,
  )[0];
}
