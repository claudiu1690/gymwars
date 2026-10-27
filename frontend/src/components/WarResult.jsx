import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { fightReport } from "../fightPresentation.mjs";
import {
  boutFighter,
  finishLabel,
  warLabel,
  warView,
} from "../warPresentation.mjs";
import { ClubCrest, WarAthlete, WarMiniFace } from "./GymWarVisuals";
import SignatureBadge from "./SignatureBadge";
import "./career-wars.css";
import { reducedMotion, playSound } from "../gameExperience.mjs";
import FightLessons, { ResultFeedback } from "./FightLessons";

export default function WarResult({
  result,
  s,
  onClose,
  onRematch,
  clubProgress,
  animate = false,
}) {
  const bouts = result.bouts || [];
  const [revealed, setRevealed] = useState(animate ? 0 : bouts.length);
  const [active, setActive] = useState(0);
  const [replay, setReplay] = useState(0);
  const panel = useRef(null),
    timer = useRef(null);
  useEffect(() => {
    const reduced = reducedMotion();
    const watch = (animate || replay > 0) && !reduced && bouts.length > 0;
    setRevealed(watch ? 0 : bouts.length);
    setActive(0);
    panel.current?.focus({ preventScroll: true });
    panel.current?.scrollIntoView({
      block: "start",
      behavior: reduced ? "auto" : "smooth",
    });
    if (watch) {
      let shown = 0;
      timer.current = setInterval(() => {
        shown++;
        setRevealed(shown);
        setActive(shown - 1);
        if (shown >= bouts.length) clearInterval(timer.current);
      }, 1500);
    }
    return () => clearInterval(timer.current);
  }, [result, animate, replay, s?.uiPreferences?.reduceMotion]);
  const view = warView(result, revealed),
    bout = bouts[active],
    done = active < revealed;
  const own =
    bout && boutFighter(result, bout, view.ownSide, s?.fighters || []);
  const other =
    bout && boutFighter(result, bout, view.otherSide, s?.fighters || []);
  const won = bout?.result.winner === view.ownSide,
    drawn = bout?.result.winner === "draw";
  const defense = result.direction === "defense";
  useEffect(() => {
    if ((animate || replay > 0) && revealed > 0)
      playSound(
        revealed === bouts.length
          ? view.wins > view.losses
            ? "win"
            : view.wins < view.losses
              ? "loss"
              : "draw"
          : "impact",
      );
  }, [revealed, replay]);
  const pointsCopy = `+${result.pointsEarned || 0} club points${result.pointsReason?.trim() ? ` · ${result.pointsReason.trim()}` : ""}`;
  const showAll = () => {
    clearInterval(timer.current);
    setRevealed(bouts.length);
  };
  const report = bout?.result?.totals
    ? fightReport({ result: bout.result }, { A: bout.you, B: bout.them })
    : null;
  const title = !view.complete
    ? "Your corner is up."
    : view.wins > view.losses
      ? "Your gym wins!"
      : view.wins < view.losses
        ? "The rival takes this card."
        : "Honors even.";
  return (
    <section
      className="war-league-result gw-battle-result"
      tabIndex={-1}
      ref={panel}
      aria-label="Gym Wars result"
      data-complete={view.complete}
    >
      <header className="gw-result-heading">
        <div>
          <span className="career-eyebrow">
            {!view.complete
              ? "REVEALING YOUR 4V4 CARD"
              : defense
                ? "YOUR DEFENSE RESULT"
                : "RANKED CARD COMPLETE"}
          </span>
          <h2>{title}</h2>
        </div>
        <div className="gw-result-controls">
          {!view.complete ? (
            <button type="button" onClick={showAll}>
              Show all {bouts.length} results · Skip reveal
            </button>
          ) : (
            bouts.length > 0 && (
              <button
                type="button"
                onClick={() => setReplay((value) => value + 1)}
              >
                Watch card again
              </button>
            )
          )}
          {onClose && (
            <button type="button" onClick={onClose}>
              Back to gyms
            </button>
          )}
          {onRematch && (
            <button type="button" onClick={onRematch}>
              Review rematch
            </button>
          )}
        </div>
      </header>
      {view.complete && result.challenge && (
        <p className="war-notice">
          {result.challenge.rewardName}:{" "}
          {result.outcome === "win"
            ? "Crest earned permanently. Equip it in Achievements."
            : "Win this 4v4 card to earn the crest. Your recorded result and normal points are kept."}{" "}
          <Link to="/career/achievements">View achievements</Link>
        </p>
      )}
      <div className="gw-scoreboard" role="status" aria-label="Gym score">
        <div>
          <ClubCrest name={view.yourGym} look={s?.shopIdentity} />
          <span>YOUR GYM</span>
          <strong>{view.yourGym}</strong>
        </div>
        <div className="gw-score-numbers">
          <b key={`a-${view.wins}`}>{view.wins}</b>
          <span>–</span>
          <b key={`b-${view.losses}`}>{view.losses}</b>
          <small>
            {view.complete
              ? "FINAL SCORE"
              : `${revealed} OF ${bouts.length} BOUTS`}
          </small>
        </div>
        <div>
          <ClubCrest name={view.theirGym} rival />
          <span>RIVAL GYM</span>
          <strong>{view.theirGym}</strong>
        </div>
      </div>
      <span className="gw-sr-only war-verdict-score">
        {view.yourGym} {view.wins}–{view.losses} {view.theirGym}
      </span>
      {view.complete && (
        <div className="gw-card-reward">
          <span aria-hidden="true">{view.wins > view.losses ? "★" : "◆"}</span>
          <div>
            <p>
              {defense
                ? "Defense results build your club story. Your own ranked cards earn points."
                : `${pointsCopy}${/[.!?]$/.test(pointsCopy) ? "" : "."}`}
            </p>
            {clubProgress && (
              <small>
                <strong>Current club honors:</strong>{" "}
                {clubProgress.nextMilestone
                  ? `${clubProgress.points}/${clubProgress.nextMilestone.points} permanent points · next: ${clubProgress.nextMilestone.title || clubProgress.nextMilestone.name}`
                  : `${clubProgress.points} permanent points · all club honors earned.`}
              </small>
            )}
          </div>
        </div>
      )}
      {view.complete && (
        <ResultFeedback reference={result.id || "gym-war"} screen="gym-wars" />
      )}
      {bout && (
        <>
          <div
            className="gw-recap-stage"
            data-verdict={
              done ? (drawn ? "draw" : won ? "win" : "loss") : "pending"
            }
            key={`${result.id || "card"}-${active}`}
          >
            <div className="gw-recap-topline">
              <span>
                BOUT {active + 1} / {bouts.length}
              </span>
              <strong>{warLabel(bout.weightClass)}</strong>
              <span>GYM WARS</span>
            </div>
            <div
              className={`gw-recap-athlete ${done && won ? "is-winner" : ""}`}
            >
              <WarAthlete fighter={own} eager />
              <SignatureBadge fighter={own} />
              <div>
                <small>YOUR CORNER</small>
                <strong>{own.name}</strong>
                {done && <b>{drawn ? "DRAW" : won ? "WINNER" : "DEFEAT"}</b>}
              </div>
            </div>
            <div className="gw-finish-stamp" aria-live="polite">
              {done ? (
                <>
                  <small>
                    {drawn
                      ? "HONORS EVEN"
                      : won
                        ? "YOUR CORNER TAKES IT"
                        : "RIVAL CORNER TAKES IT"}
                  </small>
                  <strong>{finishLabel(bout.result.method)}</strong>
                  <span>
                    {bout.result.round ? `ROUND ${bout.result.round}` : ""}
                    {bout.result.time ? ` · ${bout.result.time}` : ""}
                  </span>
                </>
              ) : (
                <>
                  <small>THE NEXT DIVISION</small>
                  <strong>VS</strong>
                  <span>One division. One bout.</span>
                </>
              )}
            </div>
            <div
              className={`gw-recap-athlete is-rival ${done && !won && !drawn ? "is-winner" : ""}`}
            >
              <WarAthlete fighter={other} eager />
              <SignatureBadge fighter={other} />
              <div>
                <small>RIVAL CORNER</small>
                <strong>{other.name}</strong>
                {done && <b>{drawn ? "DRAW" : won ? "DEFEAT" : "WINNER"}</b>}
              </div>
            </div>
          </div>
          <div
            className="war-bout-reveal"
            role="group"
            aria-label="The four division results"
          >
            {bouts.map((item, index) => {
              const shown = index < revealed;
              const outcome =
                item.result.winner === "draw"
                  ? "draw"
                  : item.result.winner === view.ownSide
                    ? "win"
                    : "loss";
              return (
                <article
                  key={item.weightClass}
                  data-outcome={shown ? outcome : "pending"}
                >
                  <button
                    type="button"
                    aria-pressed={active === index}
                    onClick={() => {
                      if (!view.complete) showAll();
                      setActive(index);
                    }}
                  >
                    <span className="gw-bout-number">0{index + 1}</span>
                    <span>
                      <strong>{warLabel(item.weightClass)}</strong>
                      <small>
                        {shown
                          ? finishLabel(item.result.method)
                          : "Awaiting result"}
                      </small>
                    </span>
                    <b>
                      {shown
                        ? outcome === "win"
                          ? "W"
                          : outcome === "loss"
                            ? "L"
                            : "D"
                        : "•"}
                    </b>
                    <div className="gw-bout-faces">
                      <WarMiniFace
                        fighter={boutFighter(
                          result,
                          item,
                          view.ownSide,
                          s?.fighters || [],
                        )}
                      />
                      <span>VS</span>
                      <WarMiniFace
                        fighter={boutFighter(
                          result,
                          item,
                          view.otherSide,
                          s?.fighters || [],
                        )}
                      />
                    </div>
                  </button>
                </article>
              );
            })}
          </div>
          {done && (
            <div className="gw-bout-breakdown">
              <FightLessons
                side={view.ownSide}
                bout={{
                  status: "resolved",
                  result: bout.result,
                  roundSummaries: bout.result.roundSummaries,
                  savedPlan: result.teams?.[view.ownSide]?.lineup?.find(
                    (fighter) => fighter.id === own.id,
                  )?.gameplan,
                }}
              />
              <p>
                {report?.explanation ||
                  `${own.name} vs ${other.name} · ${finishLabel(bout.result.method)}`}
              </p>
              {bout.result.totals && (
                <div
                  className="gw-bout-stats"
                  aria-label="Recorded bout statistics"
                >
                  {[
                    ["damage", "Damage dealt"],
                    ["takedowns", "Takedowns"],
                    ["subAttempts", "Submission attempts"],
                  ].map(([key, label]) => {
                    const a = bout.result.totals[view.ownSide]?.[key],
                      b = bout.result.totals[view.otherSide]?.[key];
                    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
                    return (
                      <div key={key}>
                        <b>{a}</b>
                        <span>
                          {label}
                          <i>
                            <em
                              style={{
                                width: `${a + b ? (a / (a + b)) * 100 : 50}%`,
                              }}
                            />
                          </i>
                        </span>
                        <b>{b}</b>
                      </div>
                    );
                  })}
                </div>
              )}
              {report?.momentGroups?.length > 0 && (
                <section
                  className="gw-key-exchanges"
                  aria-label="Key exchanges from this bout"
                >
                  <h3>Key exchanges</h3>
                  {report.momentGroups.map((group) => (
                    <p key={group.id}>
                      <b>
                        Round {group.round} · {group.time}
                      </b>{" "}
                      {group.lines.map((line) => line.text).join(" ")}
                    </p>
                  ))}
                </section>
              )}
              {s?.fighters?.some(
                (f) => f.id === own.id && !f.retired && !f.released,
              ) && (
                <Link to={`/career/fighter/${own.id}`}>
                  Review {own.name}’s tactics
                </Link>
              )}
            </div>
          )}
        </>
      )}
      {view.complete && (
        <footer className="gw-result-footer">
          {onClose && (
            <button className="career-action" type="button" onClick={onClose}>
              Choose another gym
            </button>
          )}
          <small>
            Club points belong to Gym Wars. Career records, cash and game date
            stay unchanged.
          </small>
        </footer>
      )}
    </section>
  );
}
