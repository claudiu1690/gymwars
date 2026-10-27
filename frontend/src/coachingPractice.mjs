const basePlan = {
  approach: "balanced",
  pace: "measured",
  finish: "hunt-finish",
  conserveBelow: 30,
};

export function coachingCalls({ film, bout, fighter }) {
  return Array.from({ length: 5 }, (_, index) => ({
    ...basePlan,
    ...(film
      ? bout?.decisions?.[index]?.a || bout?.savedPlan
      : fighter?.gameplan),
  }));
}

export function coachingRequest({
  film,
  revision,
  fighterId,
  fightId,
  calls,
  rounds,
  callsChanged,
  roomId = "striking",
}) {
  return {
    revision,
    ...(film ? { fightId } : { fighterId, roomId }),
    ...(!film || callsChanged ? { roundCalls: calls.slice(0, rounds) } : {}),
  };
}
