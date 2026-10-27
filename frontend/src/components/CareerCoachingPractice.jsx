import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Action, PlanFields } from "./CareerControls";
import { calendarDate } from "../careerCalendar.mjs";
import { coachingCalls, coachingRequest } from "../coachingPractice.mjs";
import "./career-identity.css";
import { ChoiceCards, GameDialog } from "./GameUI";

const verdict = (result, inputs) =>
  result.winner === "draw"
    ? "Draw"
    : `${inputs[result.winner === "A" ? "a" : "b"].name} wins`;

export default function CareerCoachingPractice({
  s,
  revision,
  roomId,
  disabled,
}) {
  const film = roomId === "film";
  const [open, setOpen] = useState(false);
  const drill = {
    striking: ["striking", "a pressure striker"],
    grappling: ["grappling", "a chain wrestler"],
    conditioning: ["conditioning", "a durable distance fighter"],
  }[roomId] || ["striking", "a pressure striker"];
  const fighters = s.fighters.filter(
    (fighter) => !fighter.retired && !fighter.released,
  );
  const replays = s.fights.filter((bout) => bout.replayAvailable);
  const [fighterId, setFighterId] = useState(fighters[0]?.id || "");
  const [fightId, setFightId] = useState(replays.at(-1)?.id || "");
  const fighter = fighters.find((entry) => entry.id === fighterId);
  const bout = replays.find((entry) => entry.id === fightId);
  const originalCalls = () => coachingCalls({ film, bout, fighter });
  const [round, setRound] = useState(0);
  const [calls, setCalls] = useState(originalCalls);
  const [callsChanged, setCallsChanged] = useState(false);
  const [result, setResult] = useState(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const lock = useRef(false),
    output = useRef(null);
  const rounds = film ? bout?.rounds || 3 : 3;
  useEffect(() => {
    setCalls(originalCalls());
    setCallsChanged(false);
    setRound(0);
    setResult(null);
    setError("");
  }, [fighterId, fightId, film]);
  useEffect(() => {
    if (result) output.current?.focus({ preventScroll: true });
  }, [result]);
  async function play() {
    if (
      lock.current ||
      disabled ||
      revision == null ||
      (film ? !bout : !fighter)
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const value = await api(`/career/practice/${film ? "replay" : "room"}`, {
        method: "POST",
        body: coachingRequest({
          film,
          revision,
          fightId,
          fighterId,
          calls,
          rounds,
          callsChanged,
          roomId,
        }),
      });
      setResult({ ...value, alternativeReplay: film && callsChanged });
    } catch (failure) {
      setError(failure.message);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="gw-coaching-practice">
      <button
        type="button"
        className="career-action secondary"
        onClick={() => setOpen(true)}
      >
        {film
          ? "Replay a recorded encounter"
          : `Try the ${drill[0]} coaching drill`}{" "}
        · optional practice
      </button>
      <GameDialog
        open={open}
        onClose={() => setOpen(false)}
        title={
          film
            ? "Replay a recorded encounter"
            : `${drill[0][0].toUpperCase()}${drill[0].slice(1)} coaching drill`
        }
      >
        <p>
          {film
            ? "Keep the saved fighters, seed and original fight rules. Change your calls and compare an actual replay; one result does not guarantee a tactic."
            : `Practice against ${drill[1]} using fresh, isolated fighters. Try different calls and see what happens to health and gas.`}
        </p>
        <p className="gw-identity-note">
          No career time, cash, permanent skills, records or ranked points
          change.
        </p>
        {film ? (
          replays.length ? (
            <ChoiceCards
              label="Recorded encounter"
              value={fightId}
              disabled={busy}
              onChange={setFightId}
              options={replays.map((entry) => ({
                value: entry.id,
                label: `${s.fighters.find((f) => f.id === entry.fighterId)?.name || "Former fighter"} vs ${s.rivals.find((f) => f.id === entry.opponentId)?.name || "Recorded opponent"} · ${calendarDate(s, entry.eventWeek)}`,
              }))}
            />
          ) : (
            <p>
              There is no faithful replay available yet. Finish a bout with
              retained combat inputs; older or pruned encounters cannot be
              recreated with current roster stats.
            </p>
          )
        ) : (
          <ChoiceCards
            label="Your practice fighter"
            value={fighterId}
            disabled={busy}
            onChange={setFighterId}
            options={fighters.map((entry) => ({
              value: entry.id,
              label: entry.name,
            }))}
          />
        )}
        {(film ? !!bout : !!fighter) && (
          <>
            <section className="gw-practice-calls" aria-label="Round calls">
              <h3>Set calls for each round</h3>
              <div
                className="gw-practice-rounds"
                role="group"
                aria-label="Choose practice round"
              >
                {Array.from({ length: rounds }, (_, index) => (
                  <button
                    type="button"
                    key={index}
                    aria-pressed={round === index}
                    disabled={busy}
                    onClick={() => setRound(index)}
                  >
                    Round {index + 1}
                  </button>
                ))}
              </div>
              <PlanFields
                value={calls[round]}
                onChange={(value) => {
                  setCallsChanged(true);
                  setCalls((previous) =>
                    previous.map((entry, index) =>
                      index === round ? value : entry,
                    ),
                  );
                }}
                disabled={busy}
              />
              {film && callsChanged && (
                <button
                  type="button"
                  className="gw-identity-text-button"
                  disabled={busy}
                  onClick={() => {
                    setCalls(originalCalls());
                    setCallsChanged(false);
                  }}
                >
                  Restore recorded calls
                </button>
              )}
            </section>
            <Action
              disabled={disabled || busy || revision == null}
              onClick={play}
            >
              {busy
                ? "Playing practice…"
                : film
                  ? callsChanged
                    ? "Test alternative calls"
                    : "Replay recorded fight"
                  : result
                    ? "Replay with these calls"
                    : "Play coaching drill"}
            </Action>
          </>
        )}
        {error && (
          <p className="career-error" role="alert">
            {error}
          </p>
        )}
        {result && (
          <section
            className="gw-practice-result"
            tabIndex="-1"
            ref={output}
            aria-label="Coaching practice result"
          >
            <span className="career-eyebrow">
              {result.alternativeReplay
                ? "ALTERNATIVE CALLS · PRACTICE"
                : film
                  ? "RECORDED CALLS · FILM REPLAY"
                  : "COACHING DRILL"}
            </span>
            <h4>
              {verdict(result.result, result.inputs)} · {result.result.method}
            </h4>
            {result.alternativeReplay && result.originalResult && (
              <p>
                Recorded result: {verdict(result.originalResult, result.inputs)}{" "}
                · {result.originalResult.method}.
              </p>
            )}
            <p>
              Round {result.result.round} · {result.result.time}. Practice
              result only.
            </p>
            <strong>{result.lesson.title}</strong>
            <p>{result.lesson.description}</p>
            <ul>
              {result.lesson.observations.map((observation, index) => (
                <li key={index}>{observation}</li>
              ))}
            </ul>
            <section aria-label="Recorded round exchanges">
              <h3>Recorded round exchanges</h3>
              {result.result.rounds?.map((entry) => (
                <section key={entry.round}>
                  <h4>Round {entry.round}</h4>
                  {entry.events?.map((event, index) => (
                    <p key={index}>{event.text}</p>
                  ))}
                </section>
              ))}
            </section>
          </section>
        )}
      </GameDialog>
    </div>
  );
}
