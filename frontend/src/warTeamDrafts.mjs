const fallbackPlan = {
  approach: "balanced",
  pace: "measured",
  finish: "hunt-finish",
  conserveBelow: 30,
};

// Keep each fighter's draft when switching divisions, reserves, or lobby tabs.
// Published Gym Wars tactics take precedence over separate career instructions.
export function teamPlanDrafts(mine, previous = {}) {
  return Object.fromEntries(
    (mine?.choices || []).map((fighter) => [
      fighter.id,
      {
        ...fallbackPlan,
        ...(previous[fighter.id] ||
          mine.gameplans?.[fighter.id] ||
          mine.defense?.lineup?.find((saved) => saved.id === fighter.id)
            ?.gameplan ||
          fighter.gameplan),
      },
    ]),
  );
}

export function selectedTeam(mine, lineup, gameplans) {
  return (mine?.lineup || []).map((fighter) => {
    const selected =
      mine.choices?.find(
        (choice) => choice.id === lineup[fighter.weightClass],
      ) || fighter;
    return {
      ...selected,
      gameplan:
        gameplans[selected.id] ||
        mine.gameplans?.[selected.id] ||
        mine.defense?.lineup?.find((saved) => saved.id === selected.id)
          ?.gameplan ||
        selected.gameplan,
    };
  });
}
