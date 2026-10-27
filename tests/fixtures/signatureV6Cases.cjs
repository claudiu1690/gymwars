// Frozen v6 definitions keep these pre-tuning inputs independent of v7 data.
const definitions = require("../../consts/signatures-v6.json");
module.exports = () =>
  definitions
    .flatMap((def, index) =>
      Array.from({ length: 8 }, (_, i) => {
        const fighter = (name, style, signatureId, plan, shift) => ({
          name,
          style,
          signatureId,
          gameplan: {
            approach: "balanced",
            pace: "measured",
            finish: "play-safe",
            conserveBelow: i % 2 ? 30 : 0,
            ...plan,
          },
          stats: {
            striking: 45 + i * 5 + shift,
            grappling: 62 + shift,
            submissions: 66 - shift,
            conditioning: 65,
          },
          fatigue: i * 6,
          traits: i % 3 ? [] : ["iron-chin", "cardio-machine"],
        });
        const opponent = definitions[(index + i + 3) % definitions.length];
        return {
          a: fighter(
            "A",
            def.styles[0] === "*" ? "boxing" : def.styles[0],
            def.id,
            def.conditions,
            0,
          ),
          b: fighter(
            "B",
            opponent.styles[0] === "*" ? "bjj" : opponent.styles[0],
            opponent.id,
            opponent.conditions,
            3,
          ),
          engineVersion: 6,
          seed: `v6-signature-frozen:${def.id}:${i}`,
          rounds: i % 2 ? 5 : 3,
        };
      }),
    )
    .concat(
      ["chain-wrestling", "escape-artist"].flatMap((id) =>
        Array.from({ length: 8 }, (_, i) => ({
          a: {
            name: "Old off-style choice",
            style: "boxing",
            signatureId: id,
            stats: {
              striking: 63,
              grappling: 58,
              submissions: 61,
              conditioning: 65,
            },
            gameplan: {
              approach: "grapple",
              pace: "high",
              finish: "play-safe",
            },
          },
          b: {
            name: "Hunter",
            style: "bjj",
            signatureId: "submission-hunter",
            stats: {
              striking: 55,
              grappling: 63,
              submissions: 68,
              conditioning: 60,
            },
            gameplan: {
              approach: "grapple",
              pace: "measured",
              finish: "hunt-finish",
            },
          },
          engineVersion: 6,
          seed: `v6-kept:${id}:${i}`,
          rounds: 5,
        })),
      ),
    );
