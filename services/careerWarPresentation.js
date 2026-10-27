// Presentation is reconstructed from accepted inputs, never today's roster.
// Only public identity/art fields are exposed; private traits stay server-side.
const { signatureFor } = require("../consts/signatures");
function publicWarResult(result, inputs) {
  if (!inputs?.attacker?.lineup || !inputs?.defender?.lineup) return result;
  const team = (snapshot) => ({
    name: snapshot.name,
    lineup: snapshot.lineup.map(
      ({
        id,
        name,
        weightClass,
        portrait,
        rarity,
        style,
        gameplan,
        signatureId,
      }) => ({
        id,
        name,
        weightClass,
        portrait,
        rarity,
        style,
        signatureCombatVersion:
          snapshot.combatVersion || result.combatVersion || 1,
        signatureId:
          signatureFor(signatureId)?.minCombatVersion <=
          (snapshot.combatVersion || result.combatVersion || 1)
            ? signatureId
            : null,
        ...(gameplan
          ? {
              gameplan: {
                approach: gameplan.approach,
                pace: gameplan.pace,
                finish: gameplan.finish,
                conserveBelow: gameplan.conserveBelow,
              },
            }
          : {}),
      }),
    ),
  });
  return {
    ...result,
    teams: { A: team(inputs.attacker), B: team(inputs.defender) },
  };
}
module.exports = { publicWarResult };
