import { Link } from "react-router-dom";
import "./staff-development.css";

export default function StaffWork({ option, role, compact = false }) {
  const development = option?.development;
  if (!development || !option.currentRank || !option.next) return null;
  return (
    <section
      className={`staff-work ${compact ? "compact" : ""}`}
      aria-label={`${role} promotion requirements`}
    >
      {!compact && (
        <>
          <h4>Promotion quests</h4>
          <p>{development.description}</p>
        </>
      )}
      <ul>
        {development.requirements
          .filter((item) => item.target > 0)
          .map((item) => (
            <li key={item.id} data-complete={item.complete}>
              <div>
                <span>{item.label}</span>
                <strong>
                  {item.current} / {item.target}
                  {item.complete ? " · Done" : ""}
                </strong>
              </div>
              {!compact && <p className="staff-quest-detail">{item.detail}</p>}
              <progress
                value={Math.min(item.current, item.target)}
                max={item.target}
                aria-label={item.label}
              />
            </li>
          ))}
      </ul>
      {!compact && (
        <Link
          className="staff-work-action"
          to={role === "coach" ? "/career/gym" : "/career/scouting"}
        >
          {role === "coach" ? "Coach your next camp" : "Find your next recruit"}
        </Link>
      )}
    </section>
  );
}
