// A controlled cash-flow policy model, not an automated claim about player
// win rates, progression time, training decisions or a complete playthrough.
const { CAREER } = require("../consts/career");
const { createRng } = require("../utils/rng");

function operatingCost(tier) {
  return CAREER.facilities[tier].upkeep + Object.values(CAREER.staff).reduce((sum, role) => sum + role.ranks.filter((rank) => rank && rank.facilityTier <= tier).at(-1).upkeep, 0);
}
function usefulPurchase(tier) {
  // One usable room investment, rather than pretending every player saves
  // directly for the next expansion or buys every optional item.
  return tier >= 5 ? 2800 : tier >= 3 ? 1200 : 400;
}
function simulatePolicy({ tier, winRate, boutInterval = 4, weeks = 104, seed = "economy" }) {
  const rng = createRng(`${seed}:${tier}:${winRate}:${boutInterval}`);
  const circuit = CAREER.circuits[tier - 1];
  const cost = operatingCost(tier);
  const reserve = cost * 8;
  let cash = reserve, hardshipWeeks = 0, waived = 0, earnings = 0, wins = 0, bouts = 0, weeksToPurchase = null;
  const purchase = usefulPurchase(tier);
  for (let week = 1; week <= weeks; week++) {
    const paid = Math.min(cash, cost);
    cash -= paid;
    if (paid < cost) { hardshipWeeks++; waived += cost - paid; }
    if (week % boutInterval === 0) {
      for (let fighter = 0; fighter < 4; fighter++) {
        const won = rng() < winRate;
        bouts++;
        if (won) wins++;
        const purse = circuit.show + (won ? circuit.winBonus : 0);
        earnings += purse;
        cash += purse;
      }
    }
    if (weeksToPurchase == null && cash >= reserve + purchase) weeksToPurchase = week;
  }
  return { tier, circuit: circuit.name, winRate, boutInterval, weeklyCost: cost, weeklyNet: Math.round((earnings - cost * weeks) / weeks), hardshipWeeks, waived, bouts, wins, boutsPerFourWeekRefill: 16 / boutInterval, usefulPurchase: purchase, weeksToPurchase, refillIntervalsToPurchase: weeksToPurchase == null ? null : Math.ceil(Math.max(0, weeksToPurchase - 8) / 4), endCash: cash };
}
function runPolicies() {
  const result = [];
  for (let tier = 1; tier <= 6; tier++)
    for (const winRate of [0.3, 0.5, 0.7])
      for (const boutInterval of [4, 6]) {
        const samples = Array.from({ length: 100 }, (_, i) => simulatePolicy({ tier, winRate, boutInterval, seed: `policy-${i}` }));
        const average = (key) => Math.round(samples.reduce((sum, sample) => sum + sample[key], 0) / samples.length * 10) / 10;
        result.push({ ...samples[0], weeklyNet: average("weeklyNet"), hardshipWeeks: average("hardshipWeeks"), waived: average("waived"), weeksToPurchase: average("weeksToPurchase"), refillIntervalsToPurchase: average("refillIntervalsToPurchase"), endCash: average("endCash"), wins: average("wins") });
      }
  return { model: "Four ordinary fighters, earned matching circuit, highest staff available at each facility tier, 8-week operating reserve, independent prescribed outcomes, no titles/sponsorship/offline income. Purchases are measured against surplus; the model does not spend it. Camp timing, recruiting, growth, injuries and delays are not simulated.", weeks: 104, samplesPerPolicy: 100, results: result };
}
if (require.main === module) process.stdout.write(`${JSON.stringify(runPolicies(), null, 2)}\n`);
module.exports = { simulatePolicy, runPolicies, operatingCost };
