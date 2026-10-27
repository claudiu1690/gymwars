import { useState } from "react";
import { Link } from "react-router-dom";
import { calendarDate, daysUntil } from "../careerCalendar.mjs";
import { readiness, skillLabel } from "../trainingPlans.mjs";
import { PosterFighter } from "./FightMatchup";
import { assignmentFor } from "../careerAssignment.mjs";
import { Face } from "./CareerControls";
import { RarityBadge } from "./FighterRarity";
import { GameTabs } from "./GameUI";
import "./career-fights.css";

const fightReady = (bout) => ["ready", "live"].includes(bout.status);
const money = (value) => `$${value.toLocaleString("en-US")}`;
const fighterRecord = (fighter) =>
  `${fighter.record.wins}W · ${fighter.record.losses}L${fighter.record.draws ? ` · ${fighter.record.draws}D` : ""}`;
const resultName = (bout) =>
  bout.result?.winner === "A"
    ? "Win"
    : bout.result?.winner === "B"
      ? "Loss"
      : "Draw";
const fightLink = (bout, fighter) =>
  fightReady(bout)
    ? `/career/fight-night/${bout.id}`
    : fighter?.camp?.needsReview
      ? `/career/gym/training/${fighter.id}`
      : `/career/bout/${bout.id}`;
const fightAction = (bout, fighter) =>
  bout.status === "live"
    ? "Resume fight"
    : bout.status === "ready"
      ? "Fight now"
      : fighter?.camp?.needsReview
        ? "Review camp"
        : "Prepare fight";
const opponentFor = (s, bout) =>
  s.rivals.find((f) => f.id === bout.opponentId) ||
  bout.opponentSnapshot ||
  bout.inputs?.b;

function FeaturedFight({ s, bout }) {
  const fighter = s.fighters.find((f) => f.id === bout.fighterId);
  const opponent = opponentFor(s, bout);
  const ready = fightReady(bout);
  const assignment = fighter && assignmentFor(s, fighter);
  return (
    <article className="fight-event-poster" aria-label="Your next fight">
      <header className="fight-event-heading">
        <div>
          <span className="career-eyebrow">
            {bout.status === "live"
              ? "YOUR FIGHT IS IN PROGRESS"
              : ready
                ? "IT’S FIGHT NIGHT"
                : "YOUR NEXT FIGHT"}
          </span>
          <h2>{bout.eventName || "Regional fight night"}</h2>
          <p>
            {skillLabel(
              fighter?.weightClass || opponent?.weightClass || "Open weight",
            )}
            {bout.title
              ? " · Championship bout"
              : bout.circuit?.id && bout.circuit.id !== "regional"
                ? ` · ${bout.circuit.name} bout`
                : " · Regional bout"}{" "}
            · {bout.rounds || 3} rounds
          </p>
        </div>
        <span className={`fight-event-stamp${ready ? " is-ready" : ""}`}>
          {ready
            ? bout.status === "live"
              ? "LIVE"
              : "READY"
            : daysUntil(s, bout.eventWeek)}
        </span>
      </header>
      <div className="fight-event-versus">
        <PosterFighter fighter={fighter} bout={bout} />
        <span className="fight-event-vs" aria-hidden="true">
          VS
        </span>
        <PosterFighter fighter={opponent} rival bout={bout} />
      </div>
      <footer className="fight-event-footer">
        <div className="fight-event-facts">
          <div>
            <span>FIGHT DATE</span>
            <strong>{calendarDate(s, bout.eventWeek)}</strong>
          </div>
          {Number.isFinite(bout.show) && (
            <div>
              <span>SHOW MONEY</span>
              <strong>
                {money(bout.show)}
                {Number.isFinite(bout.winBonus) && bout.winBonus > 0 && (
                  <small>+ {money(bout.winBonus)} for a win</small>
                )}
              </strong>
            </div>
          )}
          <div>
            <span>YOUR FIGHTER</span>
            <strong>
              {fighter ? `${readiness(fighter)}% ready` : "View fight brief"}
            </strong>
          </div>
        </div>
        <div className="fight-event-play">
          {!ready && (
            <p>
              {assignment?.detail ||
                "Prepare your fighter, then use End week to reach fight night."}
            </p>
          )}
          <Link
            className="career-action fight-event-cta"
            to={fightLink(bout, fighter)}
          >
            {fightAction(bout, fighter)}
          </Link>
        </div>
      </footer>
    </article>
  );
}

function BookingCard({ s, fighter }) {
  const recovering = (fighter.nextBoutWeek || 0) > s.week;
  return (
    <Link
      className="fight-booking-card"
      data-rarity={fighter.rarity}
      to={`/career/booking/${fighter.id}`}
    >
      <Face fighter={fighter} compact />
      <div>
        <RarityBadge rarity={fighter.rarity} />
        <h3>{fighter.name}</h3>
        <p>
          {skillLabel(fighter.weightClass)} · {skillLabel(fighter.style)}
        </p>
        <span>
          {recovering
            ? `Next fight from ${calendarDate(s, fighter.nextBoutWeek)}`
            : `${readiness(fighter)}% ready · ${fighterRecord(fighter)}`}
        </span>
        <strong className="fight-booking-action">Find a fight</strong>
      </div>
    </Link>
  );
}

function OtherFights({ s, bouts }) {
  if (!bouts.length) return null;
  return (
    <section className="fight-next-cards" aria-label="Other signed fights">
      <header className="fight-section-heading">
        <div>
          <span className="career-eyebrow">ALSO ON THE CARD</span>
          <h2>Your other bookings</h2>
        </div>
        <span>{bouts.length} signed</span>
      </header>
      <div className="fight-signed-grid">
        {bouts.map((bout) => {
          const fighter = s.fighters.find((f) => f.id === bout.fighterId),
            opponent = opponentFor(s, bout);
          return (
            <Link
              className="fight-signed-card"
              key={bout.id}
              to={fightLink(bout, fighter)}
            >
              <div className="fight-signed-top">
                <span>
                  {fightReady(bout)
                    ? "Ready to fight"
                    : calendarDate(s, bout.eventWeek)}
                </span>
                {bout.title && <b>TITLE FIGHT</b>}
              </div>
              <div className="fight-signed-matchup">
                {fighter && <Face fighter={fighter} compact />}
                <div>
                  <strong>{fighter?.name || "Your fighter"}</strong>
                  <span>vs {opponent?.name || "Booked opponent"}</span>
                </div>
              </div>
              <div className="fight-signed-action">
                <span>{bout.eventName || "Regional fight night"}</span>
                <strong>{fightAction(bout, fighter)}</strong>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function FightResults({ s, results, onUpcoming }) {
  const wins = results.filter((bout) => resultName(bout) === "Win").length;
  const losses = results.filter((bout) => resultName(bout) === "Loss").length;
  return (
    <div className="fight-results">
      <header className="fight-results-header">
        <div>
          <span className="career-eyebrow">YOUR GYM’S RECORD</span>
          <h2>Every fight leaves a mark.</h2>
          <p>
            {results.length
              ? "Revisit the result, the rewards and your corner decisions."
              : "Your story starts with the first bell."}
          </p>
        </div>
        <div
          className="fight-record-score"
          aria-label="Gym career fight record"
        >
          <span>
            <b>{wins}</b> WINS
          </span>
          <span>
            <b>{losses}</b> LOSSES
          </span>
          <span>
            <b>{results.length - wins - losses}</b> DRAWS
          </span>
        </div>
      </header>
      {results.length ? (
        <div className="fight-result-cards">
          {results.map((bout) => {
            const fighter = s.fighters.find((f) => f.id === bout.fighterId),
              opponent = opponentFor(s, bout),
              outcome = resultName(bout);
            return (
              <Link
                className="fight-result-card"
                data-outcome={outcome.toLowerCase()}
                key={bout.id}
                to={`/career/bout/${bout.id}`}
              >
                <span className="fight-result-badge">{outcome}</span>
                {fighter && <Face fighter={fighter} compact />}
                <div>
                  <h3>
                    {fighter?.name || "Your fighter"} <small>vs</small>{" "}
                    {opponent?.name || "Opponent"}
                  </h3>
                  <p>
                    {bout.result?.method || "Decision"} ·{" "}
                    {calendarDate(s, bout.eventWeek)}
                    {Number.isFinite(bout.purse)
                      ? ` · ${money(bout.purse)} earned`
                      : ""}
                  </p>
                </div>
                <strong>View result</strong>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="fight-results-empty">
          <h3>The first result is yours to make.</h3>
          <p>Sign a fight, prepare your corner and step into the arena.</p>
          <button type="button" className="career-action" onClick={onUpcoming}>
            Go to upcoming fights
          </button>
        </div>
      )}
    </div>
  );
}

export default function CareerSchedule({ s }) {
  const [tab, setTab] = useState("upcoming");
  const team = s.fighters.filter((f) => !f.retired && !f.released);
  const bouts = s.fights
    .filter((b) => b.status !== "resolved")
    .sort(
      (a, b) =>
        Number(b.status === "live") - Number(a.status === "live") ||
        Number(fightReady(b)) - Number(fightReady(a)) ||
        a.eventWeek - b.eventWeek,
    );
  const results = [...s.fights]
    .filter((b) => b.status === "resolved")
    .reverse();
  const available = team.filter(
    (f) => !bouts.some((b) => b.fighterId === f.id),
  );
  return (
    <div className="career-fights">
      <div className="fight-screen-toolbar">
        <GameTabs
          label="Career fight screens"
          prefix="career-fights"
          tabs={[
            { id: "upcoming", label: "Upcoming" },
            {
              id: "results",
              label: `Results${results.length ? ` · ${results.length}` : ""}`,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <Link className="fight-rankings-link" to="/career/rankings">
          Regional rankings
        </Link>
      </div>
      <section
        className="fight-upcoming"
        id="career-fights-upcoming-panel"
        role="tabpanel"
        aria-labelledby="career-fights-upcoming-tab"
        hidden={tab !== "upcoming"}
      >
        {bouts.length ? (
          <FeaturedFight s={s} bout={bouts[0]} />
        ) : (
          <article className="fight-event-empty">
            <span className="career-eyebrow">THE LIGHTS ARE WAITING</span>
            <h2>
              Put your gym
              <br />
              on the poster.
            </h2>
            <p>Choose your fighter. Pick a rival. Own your corner.</p>
            {!team.length ? (
              <Link className="career-action" to="/career/scouting">
                Recruit a fighter
              </Link>
            ) : available.length === 1 ? (
              <Link
                className="career-action"
                to={`/career/booking/${available[0].id}`}
              >
                Find a fight for {available[0].name}
              </Link>
            ) : null}
            <span className="fight-empty-caption">
              YOUR CLUB. THE NEXT BIG NIGHT.
            </span>
          </article>
        )}
        <OtherFights s={s} bouts={bouts.slice(1)} />
        {!!available.length && (
          <section className="fight-booking">
            <header className="fight-section-heading">
              <div>
                <span className="career-eyebrow">CHOOSE YOUR FIGHTER</span>
                <h2>Book the next fight</h2>
              </div>
              <Link to="/career/gym">Training plans</Link>
            </header>
            <div className="fight-booking-grid">
              {available.map((fighter) => (
                <BookingCard key={fighter.id} s={s} fighter={fighter} />
              ))}
            </div>
          </section>
        )}
        {!!bouts.length && !available.length && (
          <p className="fight-all-booked">
            All {team.length}{" "}
            {team.length === 1 ? "fighter has" : "fighters have"} a fight
            signed. <Link to="/career/gym">Review training plans</Link>
          </p>
        )}
      </section>
      <section
        id="career-fights-results-panel"
        role="tabpanel"
        aria-labelledby="career-fights-results-tab"
        hidden={tab !== "results"}
      >
        <FightResults
          s={s}
          results={results}
          onUpcoming={() => setTab("upcoming")}
        />
      </section>
    </div>
  );
}
