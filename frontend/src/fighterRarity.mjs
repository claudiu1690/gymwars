// Presentation only. Rarity does not add a combat multiplier or expose a
// fighter's hidden, individual potential limits.
export const rarityPresentation = Object.freeze({
  journeyman: {
    label: "Journeyman",
    title: "Build from the basics",
    potential: "Standard development potential range",
  },
  prospect: {
    label: "Prospect",
    title: "Talent to develop",
    potential: "Improved development potential range",
  },
  contender: {
    label: "Contender",
    title: "A stronger foundation",
    potential: "Higher development potential range",
  },
  elite: {
    label: "Elite",
    title: "Standout talent",
    potential: "High development potential range",
  },
  legend: {
    label: "Legend",
    title: "Exceptional talent",
    potential: "Highest development potential range",
  },
});

export function rarityBenefits(fighter, signatures = {}) {
  const tier = rarityPresentation[fighter?.rarity];
  if (!tier) return null;
  const access = fighter.signatureAccess;
  const signature = signatures[fighter.signatureId];
  let signatureText;
  if (fighter.signatureId)
    signatureText = `${signature?.name || "Permanent signature"} · chosen`;
  else if (fighter.retired || fighter.released)
    signatureText = "Signature choice unavailable · former fighter";
  else if (access?.eligible && access.locked)
    signatureText = "Signature choice earned · available after this bout";
  else if (["elite", "legend"].includes(fighter.rarity))
    signatureText = "Signature choice ready immediately";
  else if (access?.eligible)
    signatureText = "Signature choice earned · ready now";
  else {
    const bout =
      access?.boutComplete || fighter.signatureProgress?.boutComplete;
    const camp =
      access?.campComplete || fighter.signatureProgress?.campComplete;
    signatureText = `Earn a signature: ${bout ? "complete one camp" : camp ? "complete one career bout" : "one career bout + one completed camp"}`;
  }
  return { ...tier, signature: signatureText };
}

export function rarityDiscovery(result, reportId) {
  if (!result || result.duplicate) return null;
  const report = result.career?.board?.find((entry) => entry.id === reportId);
  if (
    !report?.investigated ||
    !["elite", "legend"].includes(report.fighter?.rarity)
  )
    return null;
  return {
    reportId,
    rarity: report.fighter.rarity,
    label: rarityPresentation[report.fighter.rarity].label,
  };
}
