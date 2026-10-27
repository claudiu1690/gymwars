// Shared data also drives the frontend. Existing choices remain valid even
// outside their new recruitment style pool. Accepted versions 1–6 stay frozen.
const SIGNATURE_BALANCE_VERSION = 7;
const SIGNATURES = Object.freeze(
  require("./signatures.json").map((def) =>
    Object.freeze({
      ...def,
      styles: Object.freeze(def.styles),
      conditions: Object.freeze(def.conditions),
    }),
  ),
);
const SIGNATURE_BY_ID = Object.freeze(
  Object.fromEntries(SIGNATURES.map((signature) => [signature.id, signature])),
);
const HISTORICAL_SIGNATURE_BY_ID = Object.freeze(
  Object.fromEntries(
    require("./signatures-v6.json").map((def) => [
      def.id,
      Object.freeze({
        ...def,
        styles: Object.freeze(def.styles),
        conditions: Object.freeze(def.conditions),
      }),
    ]),
  ),
);
const isSignatureId = (id) =>
  typeof id === "string" && Object.hasOwn(SIGNATURE_BY_ID, id);
const signatureFor = (id, combatVersion = SIGNATURE_BALANCE_VERSION) =>
  isSignatureId(id)
    ? combatVersion < SIGNATURE_BALANCE_VERSION
      ? HISTORICAL_SIGNATURE_BY_ID[id]
      : SIGNATURE_BY_ID[id]
    : null;
const normalizeSignature = (id) => (isSignatureId(id) ? id : null);
const LEGACY_SIGNATURE_IDS = Object.freeze(
  SIGNATURES.filter((def) => def.minCombatVersion < 6).map((def) => def.id),
);
const signatureChoicesFor = (style) =>
  SIGNATURES.filter((def) => def.styles.includes(style))
    .map((def) => def.id)
    .concat("pace-keeper");
const signaturePlanFits = (id, plan, combatVersion) =>
  !!plan &&
  !!signatureFor(id, combatVersion) &&
  Object.entries(signatureFor(id, combatVersion).conditions).every(
    ([key, value]) => plan[key] === value,
  );
module.exports = {
  SIGNATURE_BALANCE_VERSION,
  SIGNATURES,
  SIGNATURE_BY_ID,
  LEGACY_SIGNATURE_IDS,
  isSignatureId,
  signatureFor,
  normalizeSignature,
  signatureChoicesFor,
  signaturePlanFits,
};
