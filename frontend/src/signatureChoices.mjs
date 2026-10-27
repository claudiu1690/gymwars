import definitions from "../../consts/signatures.json" with { type: "json" };
import historical from "../../consts/signatures-v6.json" with { type: "json" };
export const signatureDefinitions = Object.fromEntries(
  definitions.map((def) => [def.id, def]),
);
const historicalDefinitions = Object.fromEntries(
  historical.map((def) => [def.id, def]),
);
export function signatureForVersion(id, combatVersion = 7) {
  return (
    (combatVersion < 7 ? historicalDefinitions : signatureDefinitions)[id] ||
    null
  );
}
export function signatureOptions(fighter, supplied = signatureDefinitions) {
  const definition = (id) =>
    fighter.signatureAccess?.combatVersion < 7
      ? signatureForVersion(id, fighter.signatureAccess.combatVersion)
      : supplied[id] || signatureDefinitions[id];
  if (fighter.signatureId) {
    const chosen = definition(fighter.signatureId);
    return chosen ? [[fighter.signatureId, chosen]] : [];
  }
  // A projected list can narrow the native pool, never broaden it. Older or
  // mismatched responses must not turn the full definition catalog into picks.
  const nativeIds = definitions
    .filter((def) => def.styles.includes(fighter.style))
    .map((def) => def.id)
    .concat("pace-keeper");
  const projectedIds = fighter.signatureAccess?.choiceIds;
  const ids = Array.isArray(projectedIds)
    ? nativeIds.filter((id) => projectedIds.includes(id))
    : nativeIds;
  return ids.map((id) => [id, definition(id)]).filter(([, def]) => def);
}
export function signaturePlanFits(id, plan, combatVersion) {
  const definition = signatureForVersion(id, combatVersion);
  return (
    !!plan &&
    !!definition &&
    Object.entries(definition.conditions).every(
      ([key, value]) => plan[key] === value,
    )
  );
}
