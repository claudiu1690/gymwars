export const gymEnvironment = (tier) =>
  tier >= 4
    ? `/art/headquarters-tier-${Math.min(6, tier)}.webp`
    : tier === 3
      ? "/art/cartoon-club-headquarters.webp"
      : tier === 2
        ? "/art/cartoon-gym-contender.webp"
        : "/art/gym-v2/starter.webp";

export const roomIllustration = (room, thumbnail = false) =>
  `/art/gym-v2/${room}${thumbnail ? "-thumb" : ""}.webp`;
