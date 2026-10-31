import {
  signatureDefinitions as fullSignatureDefinitions,
  signatureForVersion,
} from "./signatureChoices.mjs";
const signatureDefinitions = Object.fromEntries(
  Object.entries(fullSignatureDefinitions).map(([id, def]) => [
    id,
    { name: def.name, effect: def.effect },
  ]),
);

export function signatureDefinition(id, definitions = {}, combatVersion) {
  if (combatVersion < 7) {
    const def = signatureForVersion(id, combatVersion);
    return def ? { name: def.name, effect: def.effect } : null;
  }
  return definitions[id] || signatureDefinitions[id] || null;
}

export function signatureName(id, definitions = {}) {
  return signatureDefinition(id, definitions)?.name || null;
}

export function signatureSummary(fighter, definitions = {}) {
  const name = signatureName(fighter.signatureId, definitions);
  if (name) return `Signature: ${name}`;
  const access = fighter.signatureAccess;
  if (!access) return null;
  if (access.locked && access.eligible)
    return "Signature choice available after this bout";
  if (access.eligible) return "Signature ready to choose";
  if (access.campComplete) return "Signature locked · finish one career fight";
  if (access.boutComplete) return "Signature locked · finish one training camp";
  return "Signature locked · finish a camp and a career fight";
}

export function ambitionKey(option) {
  return JSON.stringify([
    option.goalId,
    option.fighterId || null,
    option.challengeId || null,
  ]);
}

export function ambitionCommand(option) {
  return {
    type: "select-ambition",
    goalId: option.goalId,
    ...(option.fighterId ? { fighterId: option.fighterId } : {}),
    ...(option.challengeId ? { challengeId: option.challengeId } : {}),
  };
}

// Signature text is also the balance record, so it is translated for players
// only at display time; the saved definitions keep their exact wording.
const plainWords = [
  [/ attack contest/g, " attack chance"],
  [/ defense contest/g, " defense chance"],
  [/Save up to 1 raw gas per round/g, "Saves up to 1 gas each round"],
  [
    /Reduce the first eligible ordinary measured-pace charge by one gas\./g,
    "Your first measured-pace gas cost each round is 1 lower.",
  ],
  [/raw gas/g, "gas"],
  [/judging control/g, "scorecard control"],
];
export function plainSignatureText(text = "") {
  return plainWords.reduce(
    (out, [pattern, words]) => out.replace(pattern, words),
    String(text || ""),
  );
}
