import catalog from "../../consts/fighterPortraits.json" with { type: "json" };

// Old saves and immutable fight/team snapshots can contain an art ID from any
// division. Resolve those at display time without changing their saved inputs.
function resolvePortrait(fighter = {}) {
  const requested = catalog.find((art) => art.id === fighter.portrait);
  const candidates = catalog.filter((art) =>
    art.weightClasses.includes(fighter.weightClass),
  );
  if (!candidates.length) return { art: requested || catalog[0], pool: catalog };
  if (candidates.includes(requested)) return { art: requested, pool: candidates };
  // Age limits guide new generation only. Aging must never change a saved face;
  // legacy fallbacks use the same non-veteran pool throughout a career.
  const general = candidates.filter((art) => !art.minAge);
  const pool = general.length ? general : candidates;
  // Identity, not rarity, stats, fatigue or array position, selects a fallback.
  const identity = String(fighter.id ?? fighter._id ?? fighter.name ?? "fighter");
  let hash = 2166136261;
  for (const char of identity) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return { art: pool[hash % pool.length], pool };
}

// `avoid` is the fighter across the cage: two corners never share one face.
// Only the display changes; saved portrait IDs are never rewritten.
export function fighterPortrait(fighter = {}, avoid = null) {
  const { art, pool } = resolvePortrait(fighter);
  if (!avoid || resolvePortrait(avoid).art !== art) return art;
  const others = pool.filter((option) => option !== art);
  const fallback = others.length
    ? others
    : catalog.filter((option) => option !== art);
  return fallback.length ? fallback[pool.indexOf(art) % fallback.length] : art;
}

export { catalog as fighterPortraitCatalog };
