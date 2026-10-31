import { useEffect, useRef, useState } from "react";
import { roundPlayback } from "../fightPresentation.mjs";
import "./fight-playback.css";

const reducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function Bar({ label, from, to, progress, fighterName }) {
  const value = Math.round(from + (to - from) * progress);
  return (
    <div className={`fp-bar ${label.toLowerCase()}`}>
      <span>{label}</span>
      <div
        className="fp-track"
        role="meter"
        aria-label={`${fighterName} ${label.toLowerCase()}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={value}
      >
        <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
      </div>
      <b>{value}%</b>
    </div>
  );
}

/** Replays recorded rounds a few seconds at a time: exchanges appear in
 * order, health and gas fall with them, and knockdowns or finishes land as
 * big moments. Nothing here changes the fight; it only reveals the record. */
export default function FightPlayback({ bout, names, first, last, onDone }) {
  const [round, setRound] = useState(first);
  const [step, setStep] = useState(0);
  const feed = useRef(null);
  const play = roundPlayback(bout, round, names);
  const total = play?.groups.length || 0;
  const done = step >= total;
  const pace = Math.min(1100, Math.max(500, 6000 / Math.max(1, total)));

  // A round without recorded exchanges has nothing to replay.
  useEffect(() => {
    if (!play) round < last ? setRound(round + 1) : onDone();
  }, [play, round, last]);
  useEffect(() => {
    if (!play || done) return;
    const timer = setTimeout(() => setStep((n) => n + 1), step ? pace : 350);
    return () => clearTimeout(timer);
  }, [play, step, done, pace]);
  useEffect(() => {
    const list = feed.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [step]);
  // Between rounds of a multi-round replay, move on by itself.
  useEffect(() => {
    if (!done || round >= last || play?.finish) return;
    const timer = setTimeout(next, 1800);
    return () => clearTimeout(timer);
  }, [done, round, last]);

  function next() {
    if (round < last && !play?.finish) {
      setRound(round + 1);
      setStep(0);
    } else onDone();
  }
  if (!play) return null;
  const progress = total ? Math.min(1, step / total) : 1;
  const shown = play.groups.slice(0, step);
  const moment = shown.at(-1)?.moment;
  const final = round >= last || play.finish;
  return (
    <section
      className="fight-playback"
      aria-label={`Round ${round} replay`}
      data-moment={moment || undefined}
    >
      <header>
        <span className="fn-eyebrow">
          Round {round} of {bout.rounds} · live from the cage
        </span>
        <button type="button" className="fp-skip" onClick={onDone}>
          Skip replay
        </button>
      </header>
      {play.condition && (
        <div className="fp-corners">
          {["A", "B"].map((side) => (
            <div key={side} className={`fp-corner ${side}`}>
              <strong>{names[side]}</strong>
              <Bar
                label="Health"
                from={play.condition[side].health[0]}
                to={play.condition[side].health[1]}
                progress={progress}
                fighterName={names[side]}
              />
              <Bar
                label="Gas"
                from={play.condition[side].gas[0]}
                to={play.condition[side].gas[1]}
                progress={progress}
                fighterName={names[side]}
              />
            </div>
          ))}
        </div>
      )}
      {moment && !reducedMotion() && (
        <p
          key={`${round}-${step}`}
          className="fp-moment"
          data-actor={shown.at(-1).actor}
          aria-hidden="true"
        >
          {moment}
        </p>
      )}
      <ol className="fp-feed" ref={feed} aria-live="polite">
        {shown.map((group) => (
          <li key={group.id} data-moment={group.moment || undefined}>
            <time>{group.time}</time>
            <div>
              {group.moment && <strong>{group.moment}</strong>}
              {group.lines.map((line, i) => (
                <p key={i} data-actor={line.actor}>
                  {line.text}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {done && (
        <footer className="fp-end">
          {play.card && !play.finish ? (
            <p className="fp-card" data-winner={play.card.winner}>
              <strong>Round {round} → {names[play.card.winner]}</strong>
              <span>
                Damage {play.card.A.damage} – {play.card.B.damage} · Control{" "}
                {play.card.A.control} – {play.card.B.control}
              </span>
            </p>
          ) : play.finish ? (
            <p className="fp-card" data-winner={play.finish.winner}>
              <strong>
                {names[play.finish.winner]} wins by {play.finish.method}
              </strong>
            </p>
          ) : null}
          <button type="button" className="career-action" onClick={next}>
            {!final
              ? `Round ${round + 1}`
              : bout.status === "resolved"
                ? "See the result"
                : "Back to the corner"}
          </button>
        </footer>
      )}
    </section>
  );
}
