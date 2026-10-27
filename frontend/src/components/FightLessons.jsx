import { Link } from "react-router-dom";
import { api } from "../api";
import { requestId } from "../careerRequest.mjs";
import { useState, useRef } from "react";
import { fightLessons } from "../fightPresentation.mjs";
export function ResultFeedback({ reference, screen = "fight-night" }) {
  const [status, setStatus] = useState(""),
    [working, setWorking] = useState(false);
  const request = useRef(null),
    lock = useRef(false);
  async function answer(clear) {
    if (lock.current || status.startsWith("Saved")) return;
    lock.current = true;
    setWorking(true);
    request.current ||= {
      requestId: requestId(),
      category: "playtest",
      message: clear
        ? "Fight result feedback: I understood what happened."
        : "Fight result feedback: the outcome or preparation explanation was confusing.",
      context: { screen, reference },
    };
    try {
      const value = await api("/account/reports", {
        method: "POST",
        body: request.current,
      });
      setStatus("Saved · " + value.reference);
    } catch {
      setStatus("Feedback not confirmed. Try again.");
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  return (
    <div className="result-feedback">
      <span>Did the result make sense?</span>
      {status.startsWith("Saved") ? (
        <strong role="status">{status}</strong>
      ) : status ? (
        <>
          <button type="button" disabled={working} onClick={() => answer(true)}>
            Retry feedback
          </button>
          <small role="alert">{status}</small>
        </>
      ) : (
        <>
          <button type="button" disabled={working} onClick={() => answer(true)}>
            Yes, clear
          </button>
          <button
            type="button"
            disabled={working}
            onClick={() => answer(false)}
          >
            Still confusing
          </button>
          {status && <small role="alert">{status}</small>}
        </>
      )}
    </div>
  );
}
export default function FightLessons({ bout, fighterId, side = "A" }) {
  const lessons = fightLessons(bout, side);
  return lessons.length ? (
    <section
      className="fight-lessons"
      aria-label="What your preparation changed"
    >
      <header>
        <span className="career-eyebrow">YOUR CORNER’S TAKEAWAY</span>
        <h3>What to take into the next fight</h3>
      </header>
      <div>
        {lessons.map((item) => (
          <article key={item.id}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
            <p>{item.detail}</p>
          </article>
        ))}
      </div>
      <p className="fight-lesson-note">
        Recorded facts from this bout. The full matchup determines the result.
      </p>
      {fighterId && (
        <Link to={`/career/gym/training/${fighterId}`}>Plan the next camp</Link>
      )}
    </section>
  ) : null;
}
