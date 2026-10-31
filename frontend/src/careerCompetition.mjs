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

export function refillText(allowance, noun = "weeks", now = Date.now()) {
  if (!allowance) return "";
  if (!allowance.nextRefillAt)
    return `Bank full · up to ${allowance.maximum} ${noun}`;
  const date = new Date(allowance.nextRefillAt);
  if (!Number.isFinite(date.getTime())) return "";
  // A countdown, never a calendar date: the career has its own calendar,
  // and a real date beside it reads like a game date in the past.
  return `+${allowance.refill} ${noun} ${countdown(date.getTime() - now)}`;
}

export function countdown(ms) {
  const minutes = Math.ceil(ms / 60000);
  if (minutes <= 1) return "any moment now";
  if (minutes < 60) return `in ${minutes} min`;
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  if (hours < 2) return `in ${hours} h${rest ? ` ${rest} min` : ""}`;
  if (hours < 48) return `in ${Math.round(minutes / 60)} h`;
  return `in ${Math.round(minutes / 1440)} days`;
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
