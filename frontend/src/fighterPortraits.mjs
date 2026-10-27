import catalog from "../../consts/fighterPortraits.json" with { type: "json" };

// Old saves and immutable fight/team snapshots can contain an art ID from any
// division. Resolve those at display time without changing their saved inputs.
export function fighterPortrait(fighter = {}) {
  const requested = catalog.find((art) => art.id === fighter.portrait);
  const candidates = catalog.filter((art) =>
    art.weightClasses.includes(fighter.weightClass),
  );
  if (!candidates.length) return requested || catalog[0];
  if (candidates.includes(requested)) return requested;
  // Age limits guide new generation only. Aging must never change a saved face;
  // legacy fallbacks use the same non-veteran pool throughout a career.
  const general = candidates.filter((art) => !art.minAge);
  const pool = general.length ? general : candidates;
  // Identity, not rarity, stats, fatigue or array position, selects a fallback.
  const identity = String(fighter.id ?? fighter._id ?? fighter.name ?? "fighter");
  let hash = 2166136261;
  for (const char of identity) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return pool[hash % pool.length];
}

export { catalog as fighterPortraitCatalog };
