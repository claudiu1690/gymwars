import { Link } from "react-router-dom";
import { Action } from "./CareerControls";
import "./session-pause.css";

// The end of a session, told as a pause: what comes back, what is booked,
// how close Gym Wars is, and one thing still worth doing now.
export default function SessionPause({ pause, onAction, onDone, disabled }) {
  if (!pause) return null;
  const { refill, fight, gymWars, next } = pause;
  const ready = gymWars.covered >= gymWars.total;
  return (
    <div className="session-pause">
      <span className="career-eyebrow">UNTIL NEXT TIME</span>
      <h2>Your weeks are spent. The gym waits for you.</h2>
      <dl>
        <div>
          <dt>Weeks return</dt>
          <dd>{refill || "Soon"}</dd>
        </div>
        <div>
          <dt>Next fight</dt>
          <dd>
            {fight ? (
              <>
                {fight.text} <small>· {fight.when}</small>
              </>
            ) : (
              "None booked yet"
            )}
          </dd>
        </div>
        <div>
          <dt>Gym Wars</dt>
          <dd>
            {ready ? (
              "Your 4-division team is ready"
            ) : (
              <>
                {gymWars.covered} / {gymWars.total} divisions{" "}
                <small>· need {gymWars.missing.join(", ")}</small>
              </>
            )}
          </dd>
        </div>
      </dl>
      <p className="session-pause-now">
        Booking, scouting and tactics still work. Only End week needs weeks.
      </p>
      <div className="session-pause-actions">
        {next.guide ? (
          <Action
            disabled={disabled}
            onClick={() => {
              onDone?.();
              onAction(next.guide);
            }}
          >
            {next.label}
          </Action>
        ) : (
          <Link className="career-action" to={next.href} onClick={onDone}>
            {next.label}
          </Link>
        )}
        {onDone && (
          <Action secondary onClick={onDone}>
            Done for now
          </Action>
        )}
      </div>
    </div>
  );
}
