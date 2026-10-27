import { rarityBenefits, rarityPresentation } from "../fighterRarity.mjs";
import { Face } from "./CareerControls";

export const fighterTiers = Object.keys(rarityPresentation);

export function RarityEmblem({ rarity }) {
  const marks = {
    journeyman: <path d="m5 8 7-4 7 4v8l-7 4-7-4ZM8 12h8" />,
    prospect: (
      <path d="M12 21V10m0 6C4 16 3 11 4 7c5 0 8 3 8 7m0-3c0-5 3-8 8-8 1 5-2 9-8 10" />
    ),
    contender: <path d="m12 2 9 10-9 10L3 12ZM8 12h8m-4-4v8" />,
    elite: <path d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z" />,
    legend: <path d="m4 7 4 4 4-7 4 7 4-4-2 11H6ZM7 21h10" />,
  };
  return marks[rarity] ? (
    <svg
      className="fighter-rarity-emblem"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {marks[rarity]}
    </svg>
  ) : null;
}

export function RarityBadge({ rarity }) {
  const known = fighterTiers.includes(rarity);
  const tier = known ? rarity : "unknown";
  return (
    <span className="fighter-rarity" data-rarity={tier}>
      <RarityEmblem rarity={tier} />
      <span>{known ? rarityPresentation[tier].label : "Unscouted"}</span>
    </span>
  );
}

export function RarityBenefits({
  fighter,
  signatures,
  discovery,
  onSkip,
  animate = false,
}) {
  const benefits = rarityBenefits(fighter, signatures);
  if (!benefits) return null;
  return (
    <section
      className="fighter-rarity-benefits"
      data-rarity={fighter.rarity}
      data-revealing={animate || undefined}
      aria-label="What this fighter brings"
    >
      <div className="rarity-benefit-art">
        <Face fighter={fighter} />
      </div>
      <div className="rarity-benefit-copy">
        <span className="rarity-benefit-kicker">
          {discovery
            ? `${benefits.label} discovered`
            : "What this fighter brings"}
        </span>
        <h4>
          <RarityEmblem rarity={fighter.rarity} />
          {benefits.label} · {benefits.title}
        </h4>
        <ul>
          <li>{benefits.potential}</li>
          <li>{benefits.signature}</li>
        </ul>
        <small>
          Individual limits vary and stay hidden. Compare current skills below;
          training and matchups still matter.
        </small>
      </div>
      {animate && (
        <button type="button" className="rarity-skip" onClick={onSkip}>
          Skip reveal
        </button>
      )}
    </section>
  );
}

export function RarityGuide() {
  return (
    <section
      className="career-rarity-guide"
      aria-label="How fighter rarity works"
    >
      <h4>How fighter rarity works</h4>
      <div className="career-rarity-key">
        {fighterTiers.map((rarity) => (
          <RarityBadge key={rarity} rarity={rarity} />
        ))}
      </div>
      <p>
        The portrait background shows rarity: gray for Journeyman, green for
        Prospect, blue for Contender, purple for Elite, and gold for Legend.
        Unscouted fighters use neutral gray until investigated. The written
        label confirms the tier. Rarity influences starting ability and room to
        grow. Training, matchups and freshness still matter. A higher tier does
        not guarantee a win. Elite and Legend fighters arrive ready to choose a
        signature. Every other rarity earns the same single slot after one
        career bout and one completed camp. Each style offers two specialties
        and the shared Pace Keeper option.
      </p>
    </section>
  );
}
