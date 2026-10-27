export const warDivisions = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
export const divisionLabel = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());

export function divisionCoverage(fighters = []) {
  const active = fighters.filter(
    (fighter) => !fighter.retired && !fighter.released,
  );
  const missing = warDivisions.filter(
    (division) => !active.some((fighter) => fighter.weightClass === division),
  );
  return {
    active,
    missing,
    complete: missing.length === 0,
    covered: warDivisions.length - missing.length,
  };
}

export function refillText(allowance, noun = "weeks") {
  if (!allowance) return "";
  if (!allowance.nextRefillAt)
    return `Bank full · up to ${allowance.maximum} ${noun}`;
  const date = new Date(allowance.nextRefillAt);
  if (!Number.isFinite(date.getTime())) return "";
  return `+${allowance.refill} ${noun} on ${new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }).format(date)}`;
}

export function defenseMatches(defense, fighters = []) {
  const stable = (value) =>
    JSON.stringify(
      value && typeof value === "object" && !Array.isArray(value)
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((key) => [key, value[key]]),
          )
        : value || {},
    );
  return Boolean(
    defense &&
    defense.lineup?.length === warDivisions.length &&
    fighters.length === warDivisions.length &&
    fighters.every(
      (fighter) =>
        fighter.defenseTraitsCurrent !== false &&
        defense.lineup.some(
          (saved) =>
            saved.id === fighter.id &&
            stable(saved.gameplan || saved.tactics) ===
              stable(fighter.gameplan || fighter.tactics) &&
            stable(saved.stats) === stable(fighter.stats) &&
            (saved.signatureId || null) === (fighter.signatureId || null),
        ),
    ),
  );
}
