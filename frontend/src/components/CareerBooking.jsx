import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { offerPurpose, suggestedOffer } from "../careerOffers.mjs";
import { Action, Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import { calendarDate, daysUntil } from "../careerCalendar.mjs";
import { readiness, skillLabel } from "../trainingPlans.mjs";
import {
  ContractFacts,
  FightIntel,
  FightPoster,
  fightMoney,
} from "./FightMatchup";

export function FighterSelector({ s, selected, onSelect }) {
  return (
    <div
      className="fight-fighter-switch"
      role="group"
      aria-label="Choose your fighter"
    >
      {s.fighters
        .filter((f) => !f.retired && !f.released)
        .map((f) => {
          const booked = s.fights.find(
            (b) => b.fighterId === f.id && b.status !== "resolved",
          );
          return (
            <button
              type="button"
              key={f.id}
              aria-pressed={f.id === selected}
              onClick={() => onSelect(f.id)}
            >
              <Face fighter={f} compact />
              <span>
                <strong>{f.name}</strong>
                <small>
                  {skillLabel(f.weightClass)} ·{" "}
                  {booked ? "Fight signed" : readiness(f) + "% ready"}
                </small>
              </span>
            </button>
          );
        })}
    </div>
  );
}

export default function FightBooking({
  s,
  f,
  command,
  disabled,
  onBooked,
  onSelect,
  preferredCircuit = null,
}) {
  const requestedCircuit = preferredCircuit;
  const existing = s.fights.find(
    (b) => b.fighterId === f.id && b.status !== "resolved",
  );
  const offers = f.offers || [];
  const team = s.fighters.filter(
    (member) => !member.retired && !member.released,
  );
  const recoveryWeek = f.nextBoutWeek || 0;
  const recovering = recoveryWeek > s.week;
  const blockedReason = (offer) =>
    recovering && offer.eventWeek < recoveryWeek
      ? "Too soon after the last fight. Choose a date from " +
        calendarDate(s, recoveryWeek) +
        "."
      : offer.unavailable;
  const available = offers.filter((offer) => !blockedReason(offer));
  const suggested =
    suggestedOffer(s, f, available, requestedCircuit) || offers[0];
  const [selection, setSelection] = useState(null);
  const selected =
    selection?.circuit === requestedCircuit ? selection.offerId : null;
  const [working, setWorking] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const offer = offers.find((entry) => entry.offerId === selected) || suggested;
  const purpose = offer && offerPurpose(s, f, offer);
  async function book() {
    if (!offer || disabled || lock.current || blockedReason(offer)) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      const result = await command({
        type: "accept-offer",
        fighterId: f.id,
        offerId: offer.offerId,
      });
      const booked = result?.career?.fights.find(
        (b) =>
          b.fighterId === f.id &&
          b.offerId === offer.offerId &&
          b.status !== "resolved",
      );
      if (booked) onBooked(booked.id);
      else
        setError(
          "The fight wasn’t booked. Check the save message and try again.",
        );
    } catch (failure) {
      setError(failure.message || "Could not book this fight. Try again.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  return (
    <div className="fight-planning fight-booking-workspace">
      <div className="fight-planning-toolbar">
        <Link to="/career/fights">All fights</Link>
        <span>Pick your opponent. Review the deal. Sign the fight.</span>
      </div>
      {team.length > 1 && (
        <FighterSelector s={s} selected={f.id} onSelect={onSelect} />
      )}
      {recovering && (
        <p className="fight-planning-note">
          <strong>Next fight from {calendarDate(s, recoveryWeek)}.</strong> You
          can sign a later fight now while {f.name} recovers.
        </p>
      )}
      {existing ? (
        <section className="fight-planning-panel fight-signed-notice">
          <span className="career-eyebrow">ALREADY ON THE CARD</span>
          <h2>{f.name} has a fight signed.</h2>
          <p>
            {calendarDate(s, existing.eventWeek)} ·{" "}
            {daysUntil(s, existing.eventWeek)}. Select another fighter to see
            their offers.
          </p>
          <Action onClick={() => onBooked(existing.id)}>View this fight</Action>
        </section>
      ) : !offers.length ? (
        <section className="fight-planning-panel">
          <span className="career-eyebrow">THE MATCHMAKER</span>
          <h2>No offers right now.</h2>
          <p>
            Finish any mentoring commitment, choose another fighter, or End week
            to refresh the board.
          </p>
          <Link className="career-action secondary" to="/career/gym">
            Review training
          </Link>
        </section>
      ) : (
        <>
          <section
            className="fight-offer-picker"
            aria-label="Choose an opponent"
          >
            <header className="fight-planning-heading">
              <div>
                <span className="career-eyebrow">
                  01 · CHOOSE YOUR OPPONENT
                </span>
                <h2>Who’s next for {f.name}?</h2>
              </div>
              <span>
                {skillLabel(f.style)} · {skillLabel(f.weightClass)}
              </span>
            </header>
            <div className="fight-offer-grid">
              {offers.map((entry) => (
                <button
                  type="button"
                  className="fight-offer-choice"
                  key={entry.offerId}
                  aria-label={"Review offer against " + entry.opponent.name}
                  aria-pressed={entry.offerId === offer.offerId}
                  aria-controls="fight-selected-contract"
                  disabled={working || disabled}
                  onClick={() => {
                    setSelection({
                      offerId: entry.offerId,
                      circuit: requestedCircuit,
                    });
                    setError("");
                  }}
                >
                  <div className="fight-offer-identity">
                    <Face fighter={entry.opponent} compact />
                    <div>
                      <RarityBadge rarity={entry.opponent.rarity} />
                      <strong>{entry.opponent.name}</strong>
                      <small>
                        {skillLabel(entry.opponent.style)} ·{" "}
                        {entry.opponent.record.wins}W ·{" "}
                        {entry.opponent.record.losses}L
                      </small>
                    </div>
                  </div>
                  <div className="fight-offer-terms">
                    <span>
                      {calendarDate(s, entry.eventWeek)}
                      <small>
                        {entry.notice} {entry.notice === 1 ? "week" : "weeks"}{" "}
                        to prepare
                      </small>
                    </span>
                    <strong>
                      {fightMoney(entry.show + entry.winBonus)} for a win
                      <small>
                        {fightMoney(entry.show)} guaranteed +{" "}
                        {fightMoney(entry.winBonus)} win bonus
                      </small>
                    </strong>
                  </div>
                  <span className="fight-offer-purpose">
                    <strong>{offerPurpose(s, f, entry).label}</strong>
                    <small>{offerPurpose(s, f, entry).matchup}</small>
                  </span>
                  <span
                    className="fight-offer-tag"
                    data-blocked={!!blockedReason(entry)}
                  >
                    {entry.qualification && !entry.qualification.qualified
                      ? `${entry.qualification.wins}/${entry.qualification.required} career wins · earn your place`
                      : blockedReason(entry)
                        ? "Unavailable · review why"
                        : entry.title
                          ? "Title fight"
                          : entry.challengeReward
                            ? "Challenge trophy"
                            : entry.shortNotice
                              ? "Short notice"
                              : entry.rematch
                                ? "Rematch"
                                : "Main card"}
                    {entry.offerId === offer.offerId
                      ? " · Selected"
                      : entry.offerId === suggested?.offerId &&
                          !blockedReason(entry)
                        ? " · Suggested"
                        : ""}
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section
            className="fight-purpose-brief"
            aria-label="What this fight earns"
          >
            <div>
              <span className="career-eyebrow">WHAT A WIN EARNS</span>
              <h3>{purpose.label}</h3>
              <p>{purpose.description}</p>
            </div>
            <strong>
              {purpose.matchup}
              <small>Compare skills and tactics below.</small>
            </strong>
          </section>
          <section
            id="fight-selected-contract"
            className="fight-selected-contract"
            aria-label={"Selected offer against " + offer.opponent.name}
          >
            <FightPoster
              s={s}
              f={f}
              opponent={offer.opponent}
              bout={offer}
              eyebrow="02 · REVIEW THE DEAL"
            >
              <footer className="fight-contract-footer">
                <ContractFacts s={s} bout={offer} />
                <div className="fight-contract-action">
                  {blockedReason(offer) && (
                    <p
                      className="fight-booking-blocked"
                      id="fight-booking-blocked"
                    >
                      {blockedReason(offer)}
                    </p>
                  )}
                  <Action
                    disabled={disabled || working || !!blockedReason(offer)}
                    aria-label={"Book fight against " + offer.opponent.name}
                    aria-describedby={
                      blockedReason(offer)
                        ? "fight-booking-blocked"
                        : "fight-booking-consequence"
                    }
                    onClick={book}
                  >
                    {working ? "Signing fight…" : "Book fight"}
                  </Action>
                  <p id="fight-booking-consequence">
                    Saves this fight. Time moves only when you End week.
                  </p>
                  {error && <p role="alert">{error}</p>}
                </div>
              </footer>
            </FightPoster>
            <div className="fight-booking-intel-grid">
              <FightIntel
                s={s}
                f={f}
                opponent={offer.opponent}
                bout={offer}
                story={offer.story}
              />
              <section
                className="fight-planning-panel fight-contract-notes"
                aria-label="Contract details"
              >
                <span className="career-eyebrow">THE CONTRACT</span>
                <h2>What’s on the line</h2>
                <p>
                  {offer.eventName}
                  {offer.circuit?.name ? " · " + offer.circuit.name : ""}.{" "}
                  {offer.title
                    ? "Five rounds for the regional title."
                    : "Three rounds."}
                </p>
                {offer.purseVersion >= 2 && (
                  <div className="fight-contract-callout">
                    <strong>Win the bout for the full purse</strong>
                    <p>
                      {fightMoney(offer.show)} guaranteed ·{" "}
                      {fightMoney(offer.show + offer.winBonus)} total if you
                      win. Bigger circuits put more of the purse into the
                      sporting result. Regional offers remain available for
                      rebuilding.
                    </p>
                  </div>
                )}
                {offer.qualification && (
                  <div className="fight-contract-callout">
                    <strong>
                      {offer.qualification.qualified
                        ? "Fighter qualified"
                        : "Earn your place"}
                    </strong>
                    <p>
                      {offer.qualification.qualified
                        ? `${f.name} has earned entry at this level. Your gym promotion unlocks the circuit; each fighter earns their own place.`
                        : offer.qualification.description}
                    </p>
                  </div>
                )}
                {offer.titlePurse && (
                  <div className="fight-contract-callout">
                    <strong>
                      {offer.titlePurse.development
                        ? "Development title purse"
                        : "Competitive title premium"}
                    </strong>
                    <p>
                      {offer.titlePurse.description} {fightMoney(offer.show)}{" "}
                      guaranteed · {fightMoney(offer.show + offer.winBonus)}{" "}
                      total for a win.
                    </p>
                  </div>
                )}
                {offer.honorReward && (
                  <div className="fight-contract-callout">
                    <strong>
                      First circuit honor · {fightMoney(offer.honorReward.cash)}
                    </strong>
                    <p>
                      Win this proving night to earn your permanent club honor
                      and a one-off prize. Awarded once per gym, separate from
                      the bout purse.
                    </p>
                  </div>
                )}
                {offer.shortNoticePremium && (
                  <div className="fight-contract-callout">
                    <strong>Short-notice premium included</strong>
                    <p>
                      +
                      {fightMoney(
                        Math.round(
                          offer.shortNoticePremium.show *
                            (offer.demand?.multiplier ?? 1),
                        ),
                      )}{" "}
                      guaranteed · +
                      {fightMoney(
                        Math.round(
                          offer.shortNoticePremium.winBonus *
                            (offer.demand?.multiplier ?? 1),
                        ),
                      )}{" "}
                      win bonus compared with this opponent’s standard deal.
                      Less time to train and recover.
                    </p>
                  </div>
                )}
                {offer.demand && (
                  <div className="fight-contract-callout">
                    <strong>{offer.demand.description}</strong>
                    {offer.demand.scope === "club-archetype" && (
                      <p>
                        {offer.circuit.name} ·{" "}
                        {offer.circuitOpponentId.replaceAll("-", " ")} ·{" "}
                        {Math.min(2, offer.demand.booked)}/2 full-purse club
                        bookings used. Refreshes{" "}
                        {calendarDate(s, offer.demand.resetsWeek)}.
                      </p>
                    )}
                    {offer.demand.multiplier < 1 && (
                      <p>
                        Standard: {fightMoney(offer.standardShow)} show +{" "}
                        {fightMoney(offer.standardWinBonus)} for a win. Demand
                        refreshes {calendarDate(s, offer.demand.resetsWeek)}.
                      </p>
                    )}
                  </div>
                )}
                {offer.challengeReward && (
                  <div className="fight-contract-callout">
                    <strong>
                      Challenge trophy: {offer.challengeReward.trophy}
                    </strong>
                    <p>
                      +{offer.challengeReward.legacy} career reputation for a
                      win.
                      {offer.challengeReward.cash > 0 &&
                        ` ${fightMoney(offer.challengeReward.cash)} first-victory prize, separate from the bout purse. Awarded once per gym.`}
                    </p>
                  </div>
                )}
                <div className="fight-contract-callout">
                  <strong>Make the time count</strong>
                  <p>
                    Longer notice gives you more room to train and recover, with
                    gym upkeep paid each week. Your camp and opening tactics are
                    next.
                  </p>
                </div>
              </section>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
