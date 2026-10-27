import "./career-coaching.css";
import "./fighter-rarity-backings.css";
import { fighterPortrait } from "../fighterPortraits.mjs";

export function Action({ children, secondary = false, ...props }) {
  return (
    <button
      type="button"
      className={`career-action ${secondary ? "secondary" : ""}`}
      {...props}
    >
      {children}
    </button>
  );
}
export function Badge({ children, tone = "" }) {
  return <span className={`career-badge ${tone}`}>{children}</span>;
}
export function Meter({ value, label: caption, tone = "" }) {
  return (
    <div className="career-meter">
      <div>
        <span>{caption}</span>
        <strong>{Math.round(value)}</strong>
      </div>
      <div
        className="career-track"
        role="meter"
        aria-label={caption}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value)}
      >
        <span
          className={tone}
          style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        />
      </div>
    </div>
  );
}
export function Face({ fighter, compact = false }) {
  const portrait = fighterPortrait(fighter);
  // Crop the existing approved art around the head for small team controls.
  // The SVG viewport clips the image itself, keeping its rarity backing intact.
  if (compact)
    return (
      <svg
        className="career-portrait career-face-crop"
        data-rarity={fighter.rarity || "unknown"}
        viewBox={portrait.faceCrop}
        preserveAspectRatio="xMidYMid slice"
        role="img"
        aria-label={`${fighter.name}, fighter portrait`}
      >
        <image
          href={portrait.src}
          width="600"
          height="832"
          preserveAspectRatio="xMidYMin meet"
        />
      </svg>
    );
  return (
    <img
      className="career-portrait"
      data-rarity={fighter.rarity || "unknown"}
      src={portrait.src}
      alt={`${fighter.name}, fighter portrait`}
      loading="lazy"
    />
  );
}
export function PlanFields({
  value,
  onChange,
  disabled,
  includeAutoRule = true,
  autoRuleDescription = "When you let the coach run a fight, switch to cautious pace below this gas level.",
}) {
  return (
    <div className="coach-board">
      {Object.entries(planChoices).map(([key, group], index) => (
        <fieldset key={key} className="coach-choice-group" disabled={disabled}>
          <legend>
            <span aria-hidden="true">0{index + 1}</span>
            {group.question}
          </legend>
          <div
            className="coach-choice-grid"
            role="group"
            aria-label={group.label}
          >
            {group.choices.map((choice) => (
              <button
                type="button"
                key={choice.value}
                aria-label={choice.title}
                aria-pressed={value[key] === choice.value}
                className="coach-choice"
                onClick={() => onChange({ ...value, [key]: choice.value })}
              >
                <strong>{choice.title}</strong>
                <span>{choice.description}</span>
                <small aria-hidden="true">
                  {value[key] === choice.value ? "Called" : "Choose"}
                </small>
              </button>
            ))}
          </div>
        </fieldset>
      ))}
      {includeAutoRule && (
        <fieldset
          className="coach-choice-group coach-gas-rule"
          disabled={disabled}
        >
          <legend>
            <span aria-hidden="true">04</span>When should the coach ease off?
          </legend>
          <p>{autoRuleDescription}</p>
          <div
            className="coach-gas-choices"
            role="group"
            aria-label="Conserve when gas falls below"
          >
            {[0, 20, 30, 40, 50].map((gas) => (
              <button
                type="button"
                key={gas}
                aria-pressed={value.conserveBelow === gas}
                onClick={() => onChange({ ...value, conserveBelow: gas })}
              >
                {gas ? `${gas}% gas` : "Hold the plan"}
              </button>
            ))}
          </div>
        </fieldset>
      )}
    </div>
  );
}

const planChoices = {
  approach: {
    question: "Where do we fight?",
    label: "Approach",
    choices: [
      {
        value: "strike",
        title: "Keep it standing",
        description: "Favor exchanges on the feet.",
      },
      {
        value: "balanced",
        title: "Mix it up",
        description: "Blend striking and takedowns.",
      },
      {
        value: "grapple",
        title: "Take it to the ground",
        description: "Seek more takedown opportunities.",
      },
    ],
  },
  pace: {
    question: "How hard do we push?",
    label: "Pace",
    choices: [
      {
        value: "high",
        title: "Push the pace",
        description: "More striking output. Burns gas faster.",
      },
      {
        value: "measured",
        title: "Stay measured",
        description: "Steady output and gas use.",
      },
      {
        value: "cautious",
        title: "Slow it down",
        description: "Lower output. Spend less gas.",
      },
    ],
  },
  finish: {
    question: "When the opening comes?",
    label: "Finishing intent",
    choices: [
      {
        value: "hunt-finish",
        title: "Hunt the finish",
        description: "Press an opening for a stoppage.",
      },
      {
        value: "play-safe",
        title: "Stay composed",
        description: "Less emphasis on forcing a finish.",
      },
    ],
  },
};

export function PlanSummary({ value, caption = "YOUR INSTRUCTIONS" }) {
  return (
    <div
      className="coach-plan-summary"
      aria-label="Current instructions"
      aria-live="polite"
    >
      <small>{caption}</small>
      <strong>
        {
          planChoices.approach.choices.find(
            (choice) => choice.value === value.approach,
          )?.title
        }
      </strong>
      <span>
        {
          planChoices.pace.choices.find((choice) => choice.value === value.pace)
            ?.title
        }
        {" · "}
        {
          planChoices.finish.choices.find(
            (choice) => choice.value === value.finish,
          )?.title
        }
      </span>
    </div>
  );
}
