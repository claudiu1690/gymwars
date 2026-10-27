import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  ambitionCommand,
  ambitionKey,
  signatureSummary,
} from "../careerIdentity.mjs";
import "./career-identity.css";
import { GameDialog } from "./GameUI";
import { signatureFits } from "./SignatureEmblem";
import { signatureOptions } from "../signatureChoices.mjs";
import "./signature-abilities.css";

export function SignatureLine({ fighter, definitions, caption = "Signature" }) {
  const text = signatureSummary(fighter, definitions);
  return text ? (
    <small className="gw-signature-line">
      {caption === "Signature" ? text : text.replace(/^Signature/, caption)}
    </small>
  ) : null;
}

export function SignaturePicker({ s, f, command, disabled }) {
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirming, setConfirming] = useState(null);
  const lock = useRef(false);
  const access = f.signatureAccess;
  if (!access) return null;
  const chosen = !!f.signatureId;
  const frozen =
    !chosen &&
    (access.locked ||
      s.fights.some(
        (bout) =>
          bout.fighterId === f.id && ["ready", "live"].includes(bout.status),
      ));
  const unavailable =
    disabled ||
    working ||
    chosen ||
    frozen ||
    f.retired ||
    f.released ||
    !access.eligible;
  const options = signatureOptions(f, s.rules.signatures);
  const styleName =
    f.style === "bjj"
      ? "BJJ"
      : (f.style || "fighting")
          .replaceAll("-", " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());
  const equippedStyles = options[0]?.[1]?.styles;
  const retainedOffStyle =
    chosen &&
    equippedStyles &&
    !equippedStyles.includes("*") &&
    !equippedStyles.includes(f.style);
  const AbilityCard = chosen ? "article" : "button";
  const pendingAbility = options.find(([id]) => id === confirming)?.[1];
  const booked = s.fights.find(
    (bout) =>
      bout.fighterId === f.id &&
      ["scheduled", "ready", "live"].includes(bout.status),
  );
  async function equip(signatureId) {
    if (lock.current || unavailable || signatureId === f.signatureId) return;
    lock.current = true;
    setWorking(true);
    setSaveError("");
    try {
      const saved = await command({
        type: "signature",
        fighterId: f.id,
        signatureId,
      });
      if (saved === false)
        setSaveError(
          "Signature was not saved. Check the save message and try again.",
        );
      else setConfirming(null);
    } catch (error) {
      setSaveError(
        error.message || "Could not save this signature. Try again.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  return (
    <section
      className="gw-signature-picker signature-ability-board"
      aria-label="Fighter signature"
      data-chosen={chosen}
    >
      <header className="signature-board-heading">
        <div className="signature-board-emblem">
          <img
            src={`/art/abilities/${f.signatureId || options[0]?.[0] || "pace-keeper"}.webp`}
            width="68"
            height="68"
            alt=""
          />
        </div>
        <div>
          <span className="career-eyebrow">MAKE IT THEIR OWN</span>
          <h3>{chosen ? "Permanent signature" : `${styleName} specialties`}</h3>
          <p>
            {chosen
              ? `${f.name.split(" ")[0]}'s permanent fighting edge.`
              : `Only ${styleName} specialties or shared Pace Keeper. Choose one permanently.`}
          </p>
        </div>
        <span className="signature-slot-count">
          {chosen ? "PERMANENT" : "CHOOSE ONCE"}
        </span>
      </header>
      <div className="signature-equipped-strip" aria-live="polite">
        <span>
          {working
            ? "SAVING ABILITY"
            : f.signatureId
              ? "PERMANENT SIGNATURE"
              : access.eligible
                ? "CHOOSE YOUR EDGE"
                : "EARN YOUR SIGNATURE"}
        </span>
        <strong className="gw-signature-status">
          {signatureSummary(f, s.rules.signatures)}
        </strong>
      </div>
      {retainedOffStyle && (
        <p className="signature-booked-note">
          Chosen before style specialties were introduced.{" "}
          {f.name.split(" ")[0]} keeps this ability permanently. New choices are
          limited by fighting style.
        </p>
      )}
      {!chosen && !access.eligible && (
        <>
          <p>
            Unlock a signature by doing both with {f.name.split(" ")[0]}, in
            either order:
          </p>
          <ul className="gw-signature-unlocks">
            <li data-complete={!!access.campComplete}>
              <span aria-hidden="true">1</span>
              <div>
                <strong>Finish one training camp</strong>
                <span>Any camp length counts.</span>
              </div>
              {access.campComplete ? (
                <b>Done</b>
              ) : (
                !f.retired &&
                !f.released && (
                  <Link to={`/career/gym/training/${f.id}`}>Train</Link>
                )
              )}
            </li>
            <li data-complete={!!access.boutComplete}>
              <span aria-hidden="true">2</span>
              <div>
                <strong>Finish one career fight</strong>
                <span>Win or lose. Practice fights do not count.</span>
              </div>
              {access.boutComplete ? (
                <b>Done</b>
              ) : (
                !f.retired &&
                !f.released && (
                  <Link
                    to={
                      booked
                        ? `/career/bout/${booked.id}`
                        : `/career/booking/${f.id}`
                    }
                  >
                    {booked ? "View fight" : "Book fight"}
                  </Link>
                )
              )}
            </li>
          </ul>
        </>
      )}
      {!chosen && (frozen || (access.eligible && access.blockedReason)) && (
        <p role="status">
          {frozen
            ? "Fight inputs are locked. This bout keeps its saved signature; choose your permanent ability after it ends."
            : access.blockedReason}
        </p>
      )}
      {!chosen && Object.keys(access.choiceBlocks || {}).length > 0 && (
        <p className="signature-booked-note">
          Your booked fight keeps its original abilities. New specialties become
          available after fight night.
        </p>
      )}
      {access.previousBalance && (
        <p className="signature-booked-note">
          Your booked fight keeps its original signature bonuses, shown here.
          Future bookings use the updated balance. Your chosen ability stays the
          same.
        </p>
      )}
      <div
        className="gw-signature-choices"
        role={chosen ? undefined : "group"}
        aria-label={`${f.name} signature`}
      >
        {options.map(([id, option]) => (
          <AbilityCard
            type={chosen ? undefined : "button"}
            key={id}
            className="signature-ability-card"
            data-ability={id}
            data-equipped={f.signatureId === id}
            aria-pressed={chosen ? undefined : false}
            disabled={
              chosen ? undefined : unavailable || !!access.choiceBlocks?.[id]
            }
            onClick={
              chosen
                ? undefined
                : () => {
                    setSaveError("");
                    setConfirming(id);
                  }
            }
          >
            <div className="signature-card-art">
              <img
                src={`/art/abilities/${id}.webp`}
                width="112"
                height="112"
                alt=""
                loading="lazy"
              />
              {f.signatureId === id && <span>EQUIPPED</span>}
            </div>
            <div className="signature-card-body">
              {!chosen && (
                <span className="signature-style-label">
                  {id === "pace-keeper"
                    ? "Every fighting style"
                    : `${f.style === "bjj" ? "BJJ" : (f.style || "").replaceAll("-", " ")} specialty`}
                </span>
              )}
              <strong>{option.name}</strong>
              <b className="signature-card-effect">{option.effect}</b>
              <div className="signature-card-trigger">
                <span>ACTIVATES WHEN</span>
                <strong>{option.trigger}</strong>
              </div>
              <small>{option.description || option.counterplay}</small>
            </div>
            <div className="signature-card-footer">
              <span>
                {chosen
                  ? "Permanent choice"
                  : !access.eligible
                    ? "Unlock to equip"
                    : frozen || access.choiceBlocks?.[id]
                      ? "Choose after this fight"
                      : "Choose ability"}
              </span>
              {signatureFits(id, f.gameplan, access.combatVersion) && (
                <small>Fits career tactics</small>
              )}
            </div>
          </AbilityCard>
        ))}
      </div>
      <div className="signature-board-notice">
        <p className="signature-board-help">
          Activates automatically when its conditions are met. Every rarity can
          earn its style’s two specialties or Pace Keeper. You can’t change or
          remove a signature once chosen.
          {chosen &&
            " Save your Gym Wars team again to publish this signature."}
        </p>
      </div>
      <GameDialog
        open={!!pendingAbility && !chosen}
        onClose={() => {
          if (!lock.current) {
            setConfirming(null);
            setSaveError("");
          }
        }}
        title="Choose your permanent signature"
      >
        {pendingAbility && (
          <div className="signature-confirmation">
            <div className="signature-confirmation-ability">
              <img
                src={`/art/abilities/${confirming}.webp`}
                width="88"
                height="88"
                alt=""
              />
              <div>
                <h3>{pendingAbility.name}</h3>
                <strong>{pendingAbility.effect}</strong>
                <p>{pendingAbility.trigger}</p>
              </div>
            </div>
            <p>
              This becomes {f.name}’s signature for their entire career. You
              cannot change or remove it.
            </p>
            <div className="signature-confirmation-actions">
              <button
                type="button"
                className="career-action secondary"
                disabled={working}
                onClick={() => setConfirming(null)}
              >
                Keep choosing
              </button>
              <button
                type="button"
                className="career-action"
                disabled={unavailable}
                onClick={() => equip(confirming)}
              >
                {working ? "Saving signature…" : "Confirm signature"}
              </button>
            </div>
            {saveError && (
              <p className="career-error" role="alert">
                {saveError}
              </p>
            )}
          </div>
        )}
      </GameDialog>
      {working && <p role="status">Saving signature…</p>}
      {saveError && !pendingAbility && (
        <p className="career-error" role="alert">
          {saveError}
        </p>
      )}
    </section>
  );
}

export function AmbitionPanel({ s, command, disabled, compact = false }) {
  const [choosing, setChoosing] = useState(false);
  const [working, setWorking] = useState(false);
  const [saveError, setSaveError] = useState("");
  const lock = useRef(false);
  const ambition = s.ambition;
  const options = s.ambitionOptions || [];
  if (!ambition && !options.length) return null;
  async function select(option) {
    if (!command || disabled || lock.current) return;
    lock.current = true;
    setWorking(true);
    setSaveError("");
    try {
      const saved = await command(
        option ? ambitionCommand(option) : { type: "clear-ambition" },
      );
      if (saved === false) {
        setSaveError(
          "Save not confirmed. Check the save message and try again when the connection is ready.",
        );
      } else setChoosing(false);
    } catch (failure) {
      setSaveError(
        failure.message ||
          "Could not confirm this club goal. Please try again.",
      );
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  const progress = ambition?.progress;
  return (
    <section
      className={`gw-ambition${compact ? " compact" : ""}`}
      id="club-goals"
      aria-label="Your club goal"
    >
      <span className="career-eyebrow">
        {ambition?.status === "complete"
          ? "CLUB GOAL · ACHIEVED"
          : "YOUR PINNED CLUB GOAL"}
      </span>
      <h2>{ambition?.label || "Pick something to work toward"}</h2>
      {!compact && (
        <p className="club-goal-explainer">
          Pin one optional goal to follow across your gym. Progress comes from
          normal play; pinning a goal adds no extra reward or bonus. Switch
          whenever you want without losing achievements.
        </p>
      )}
      {ambition ? (
        <>
          {ambition.description && (
            <p className="gw-ambition-description">{ambition.description}</p>
          )}
          {ambition.payoff && (
            <p className="gw-ambition-payoff">
              <strong>Payoff: </strong>
              {ambition.payoff}
            </p>
          )}
          {progress?.label && <p>{progress.label}</p>}
          {progress?.target > 0 && (
            <meter
              min="0"
              max={progress.target}
              value={Math.max(0, Math.min(progress.current, progress.target))}
              aria-label={progress.label || ambition.label}
            />
          )}
          {ambition.blockedReason && <p>{ambition.blockedReason}</p>}
          {ambition.status === "unavailable" && (
            <p>
              This goal stays in your club history. Choose another subject or
              goal below.
            </p>
          )}
          {ambition.nextAction?.href && (
            <Link
              className="career-action secondary"
              to={ambition.nextAction.href}
            >
              {ambition.nextAction.label}
            </Link>
          )}
        </>
      ) : (
        <p>
          Pick one fighter or team goal to follow. Its achievements and unlocks
          count automatically, and you keep your progress when you change goals.
        </p>
      )}
      {command && (
        <>
          <button
            type="button"
            className="career-action secondary"
            onClick={() => setChoosing(true)}
          >
            {ambition ? "Change club goal" : "Choose a club goal · optional"}
          </button>
          <GameDialog
            open={choosing}
            onClose={() => setChoosing(false)}
            title="Choose your club goal"
          >
            <div className="gw-ambition-chooser">
              <div
                className="gw-ambition-options"
                role="group"
                aria-label="Choose your club goal"
              >
                {options.map((option) => (
                  <div key={ambitionKey(option)}>
                    <button
                      type="button"
                      aria-pressed={Boolean(
                        ambition &&
                        ambitionKey(option) === ambitionKey(ambition),
                      )}
                      disabled={disabled || working || !option.canSelect}
                      onClick={() => select(option)}
                    >
                      <strong>{option.label}</strong>
                      {option.description && (
                        <span className="gw-ambition-description">
                          {option.description}
                        </span>
                      )}
                      {option.payoff && (
                        <span className="gw-ambition-payoff">
                          <b>Payoff: </b>
                          {option.payoff}
                        </span>
                      )}
                      {option.blockedReason && (
                        <span className="club-goal-prerequisite">
                          First: {option.blockedReason}
                        </span>
                      )}
                      {option.progress?.label && (
                        <span>{option.progress.label}</span>
                      )}
                    </button>
                    {!option.canSelect && option.blockedReason && (
                      <small>{option.blockedReason}</small>
                    )}
                  </div>
                ))}
              </div>
              {ambition && (
                <button
                  type="button"
                  className="gw-identity-text-button"
                  disabled={disabled || working}
                  onClick={() => select(null)}
                >
                  Unpin club goal
                </button>
              )}
              {saveError && (
                <p className="career-error" role="alert">
                  {saveError}
                </p>
              )}
            </div>
          </GameDialog>
        </>
      )}
      {working && <p role="status">Saving club goal…</p>}
    </section>
  );
}

export function ClubGoalTracker({ s, fighterId }) {
  const goal = s.ambition;
  if (fighterId && (!goal || (goal.fighterId && goal.fighterId !== fighterId)))
    return null;
  return (
    <section className="club-goal-tracker" aria-label="Pinned club goal">
      <div>
        <span className="career-eyebrow">
          {goal?.status === "complete"
            ? "CLUB GOAL · ACHIEVED"
            : "YOUR CLUB GOAL"}
        </span>
        <h3>{goal?.label || "What’s your next target?"}</h3>
        <p>
          {goal?.description ||
            "Pin an optional goal on Career Path and track it here as you play."}
        </p>
        {goal?.progress?.target > 0 && (
          <>
            <progress
              value={goal.progress.current}
              max={goal.progress.target}
              aria-label={goal.progress.label}
            />
            <strong>{goal.progress.label}</strong>
          </>
        )}
        {goal?.blockedReason && (
          <p className="club-goal-prerequisite">
            Before this goal: {goal.blockedReason}
          </p>
        )}
      </div>
      <Link to="/career/campaign#club-goals">
        {goal ? "View goal & rewards" : "Choose a club goal"}
      </Link>
    </section>
  );
}

export function CircuitPayoff({ s }) {
  const circuit = s.careerCircuit;
  if (!circuit) return null;
  return (
    <div className="gw-circuit-payoff">
      <span className="career-eyebrow">
        CLUB REPUTATION · LEVEL {circuit.level}
      </span>
      <strong>{circuit.name.replace(" circuit", "")}</strong>
      <p>
        {circuit.name} opponents pay ${circuit.show.toLocaleString("en-US")} to
        fight + ${circuit.winBonus.toLocaleString("en-US")} for a win. Each
        offer shows its own prize money.
      </p>
      {circuit.next ? (
        <p>
          Next: {circuit.next.name} · {circuit.next.requirement}
        </p>
      ) : (
        <p>Your club has earned the top career circuit.</p>
      )}
      <Link to="/career/fights">Find your next fight</Link>
    </div>
  );
}
