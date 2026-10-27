const CATALOG_VERSION = 3;
const LIMITS = {
  careerWeeks: { perWindow: 4, maximumStored: 8 },
  leagueCards: { perWindow: 2, maximumStored: 4 },
};
const PRODUCTS = [
  {
    id: "career-weeks",
    name: "Training Pack",
    subtitle: "Build your next champion",
    priceMinor: 499,
    resource: "careerWeeks",
    quantity: 4,
    maximumPerWindow: 1,
    maximumStored: 8,
    art: "training-pack",
    tag: "TRAINING",
    grants: [{ resource: "careerWeeks", quantity: 4 }],
    description:
      "Four extra weeks to train, recover, mentor and prepare. You decide when to End week.",
    contents: [
      "4 extra career weeks",
      "Saved until you use them",
      "Shares the 4-week daily purchase limit",
      "Store up to 8 extra weeks",
    ],
  },
  {
    id: "gym-wars-token",
    name: "Gym Wars Pack",
    subtitle: "Take your four into the arena",
    priceMinor: 499,
    resource: "leagueCards",
    quantity: 2,
    maximumPerWindow: 1,
    maximumStored: 4,
    art: "war-pack",
    tag: "4V4 BATTLES",
    grants: [{ resource: "leagueCards", quantity: 2 }],
    description:
      "Two extra ranked gym battles. Bring your four fighters and their saved tactics.",
    contents: [
      "2 ranked 4v4 tokens",
      "Saved until you play",
      "Shares the 2-token daily purchase limit",
      "Store up to 4 extra tokens",
    ],
  },
  {
    id: "club-pack",
    name: "Club Pack",
    subtitle: "Train together. Fight together.",
    priceMinor: 899,
    maximumPerWindow: 1,
    art: "club-pack",
    tag: "TRAIN + BATTLE",
    grants: [
      { resource: "careerWeeks", quantity: 4 },
      { resource: "leagueCards", quantity: 2 },
    ],
    description:
      "The complete corner kit: prepare your fighters, then take your team into Gym Wars.",
    contents: [
      "4 extra career weeks",
      "2 ranked 4v4 tokens",
      "Save $0.99 versus the two individual packs",
      "Uses both daily purchase limits",
      "Store up to 8 extra weeks and 4 extra tokens",
    ],
  },
];
const productById = (id) => PRODUCTS.find((p) => p.id === id);
// Original accepted receipts used resource/quantity. Never rewrite those receipts.
const grantsOf = (item) =>
  item.grants ||
  (item.resource ? [{ resource: item.resource, quantity: item.quantity }] : []);
module.exports = { CATALOG_VERSION, PRODUCTS, LIMITS, productById, grantsOf };
