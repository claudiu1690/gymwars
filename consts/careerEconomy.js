const CONTRACT_DEMAND = Object.freeze({
  windowWeeks: 12,
  fullBookings: 2,
  thirdMultiplier: 0.6,
  laterMultiplier: 0.3,
});
// Individual sporting proof, in addition to the gym's circuit promotion.
const CIRCUIT_ENTRY = Object.freeze({ developmentWins: 2, upperWins: 4 });
const TITLE_DEMAND = Object.freeze({
  maxSkillGap: 12,
  repeatWins: 2,
  show: 300,
  winBonus: 450,
});
// First victories only, per gym. Accepted capstones store their prize terms.
const CIRCUIT_HONOR_PRIZES = Object.freeze({
  city: 1000,
  state: 1500,
  national: 2500,
  champions: 3500,
  world: 5000,
});
// Regional replacement calls compensate for the shorter preparation window.
// Added before contract-demand scaling; already signed contracts keep their fee.
const SHORT_NOTICE_PREMIUM = Object.freeze({
  maxWeeks: 2,
  show: 100,
  winBonus: 150,
});
const CLUB_LOOKS = Object.freeze([
  {
    id: "original",
    name: "Original corner",
    color: "#ed684e",
    mark: "GW",
    description: "The classic navy and coral club crest.",
  },
  {
    id: "blue-corner",
    name: "Blue corner",
    color: "#477eab",
    mark: "GW",
    description: "A cool blue club crest.",
  },
  {
    id: "evergreen",
    name: "Evergreen club",
    color: "#4f8268",
    mark: "GW",
    description: "Forest green colors for a patient corner.",
  },
  {
    id: "violet",
    name: "Night session",
    color: "#8662a2",
    mark: "GW",
    description: "Violet colors for your club crest.",
  },
  {
    id: "gold",
    name: "Golden corner",
    color: "#b98b35",
    mark: "★",
    description: "A gold star crest for your clubhouse.",
  },
  {
    id: "champion",
    name: "Laurel club",
    color: "#bc7653",
    mark: "❧",
    description: "A copper laurel crest.",
  },
  {
    id: "dynasty",
    name: "Dynasty banner",
    color: "#b3474e",
    mark: "◆",
    description: "A ruby diamond crest for a lasting club.",
  },
]);
module.exports = {
  CONTRACT_DEMAND,
  CLUB_LOOKS,
  SHORT_NOTICE_PREMIUM,
  CIRCUIT_ENTRY,
  TITLE_DEMAND,
  CIRCUIT_HONOR_PRIZES,
};
