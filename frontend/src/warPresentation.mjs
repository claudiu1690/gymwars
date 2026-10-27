export const warDivisions = [
  "featherweight",
  "lightweight",
  "middleweight",
  "heavyweight",
];
export const warLabel = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());

export function warView(result, revealed = result.bouts?.length || 0) {
  const ownSide = result.direction === "defense" ? "B" : "A";
  const otherSide = ownSide === "A" ? "B" : "A";
  const bouts = result.bouts || [];
  const complete = revealed >= bouts.length;
  const wins = complete
    ? (ownSide === "A" ? result.wins : result.losses) || 0
    : bouts.slice(0, revealed).filter((b) => b.result.winner === ownSide)
        .length;
  const losses = complete
    ? (ownSide === "A" ? result.losses : result.wins) || 0
    : bouts.slice(0, revealed).filter((b) => b.result.winner === otherSide)
        .length;
  return {
    ownSide,
    otherSide,
    wins,
    losses,
    complete,
    yourGym: ownSide === "A" ? result.yourGym : result.opponent,
    theirGym: ownSide === "A" ? result.opponent : result.yourGym,
  };
}

export function boutFighter(result, bout, side, roster = []) {
  const name = side === "A" ? bout.you : bout.them;
  const id =
    side === "A"
      ? bout.youId || bout.yourFighterId
      : bout.themId || bout.opponentFighterId;
  const frozen = result.teams?.[side]?.lineup?.find((f) =>
    id ? f.id === id : f.weightClass === bout.weightClass,
  );
  if (frozen) return frozen;
  const ownedSide = result.direction === "defense" ? "B" : "A";
  const owned = side === ownedSide && roster.find((f) => f.id === id);
  // Legacy cards with no accepted portrait show a silhouette, not an invented face.
  return owned
    ? { ...owned, name }
    : { id, name, weightClass: bout.weightClass, missingPortrait: true };
}

export function finishLabel(method) {
  return (
    {
      KO: "KNOCKOUT",
      TKO: "STOPPAGE",
      SUB: "SUBMISSION",
      DEC: "DECISION",
      "UNAN-DEC": "DECISION",
      "SPLIT-DEC": "SPLIT DECISION",
      "MAJ-DEC": "DECISION",
      DRAW: "DRAW",
    }[method] ||
    method ||
    "RESULT"
  );
}
