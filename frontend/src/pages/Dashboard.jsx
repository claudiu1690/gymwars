import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { FighterCard } from "../components/ds/FighterCard.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { WeightClassChip } from "../components/ds/WeightClassChip.jsx";
import { useCountdown, formatRemaining } from "../hooks/useCountdown";
import { toCardProps } from "./Roster";

const RECENT_MS = 48 * 60 * 60 * 1000;

const TASK_LINKS = {
  scout: "/scouting",
  sign: "/scouting",
  gameplan: "/roster",
  spar: "/roster",
  camp: "/roster",
  book: "/roster",
};

/** First Fight Week — the opening checklist. Each step pays purse instantly. */
function OnboardingChecklist({ onboarding }) {
  const navigate = useNavigate();
  const doneCount = onboarding.tasks.filter((t) => t.done).length;
  return (
    <div
      className="card"
      style={{
        border: "1.5px solid var(--ember)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: 8,
        }}
      >
        <div
          className="section-label"
          style={{ margin: 0, color: "var(--ember-strong)" }}
        >
          First Fight Week
        </div>
        <span
          className="mono"
          style={{ fontSize: 11, color: "var(--ink-muted)" }}
        >
          {doneCount}/{onboarding.tasks.length}
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {onboarding.tasks.map((t) => (
          <button
            key={t.key}
            onClick={() => !t.done && navigate(TASK_LINKS[t.key] || "/")}
            className="pressable"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              textAlign: "left",
              width: "100%",
              background: "none",
              border: "none",
              padding: "2px 0",
              cursor: t.done ? "default" : "pointer",
            }}
          >
            <span
              style={{
                color: t.done ? "var(--win)" : "var(--ink-muted)",
                width: 14,
                flexShrink: 0,
              }}
              aria-hidden="true"
            >
              {t.done ? "●" : "○"}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                color: t.done ? "var(--ink-muted)" : "var(--ink)",
                textDecoration: t.done ? "line-through" : "none",
                fontWeight: t.done ? 400 : 500,
              }}
            >
              {t.label}
              {!t.done && (
                <span
                  style={{
                    display: "block",
                    fontSize: 11,
                    color: "var(--ink-muted)",
                    fontWeight: 400,
                  }}
                >
                  {t.hint}
                </span>
              )}
            </span>
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: t.done ? "var(--ink-muted)" : "var(--win)",
                flexShrink: 0,
              }}
            >
              +${t.reward}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Next up — every timer reframed as an appointment with a decision attached. */
function NextUp({ fighters, fights, scouting, gym }) {
  const now = Date.now();
  const events = [];
  for (const f of fighters) {
    if (f.camp?.endsAt && new Date(f.camp.endsAt) > now) {
      events.push({
        at: new Date(f.camp.endsAt),
        label: `${f.name.split(" ").pop()}'s camp completes`,
        then: "gains land — book or taper",
      });
    }
  }
  for (const f of fights) {
    if (f.status === "scheduled" && new Date(f.scheduledAt) > now) {
      events.push({
        at: new Date(f.scheduledAt),
        label: `Fight night — ${f.you.name.split(" ").pop()} vs ${f.them.name.split(" ").pop()}`,
        then: "result + purse waiting",
      });
    }
  }
  if (scouting?.refreshAt && new Date(scouting.refreshAt) > now) {
    events.push({
      at: new Date(scouting.refreshAt),
      label: "New scouting board",
      then: "fresh prospects to investigate",
    });
  }
  if (gym?.shieldUntil && new Date(gym.shieldUntil) > now) {
    events.push({
      at: new Date(gym.shieldUntil),
      label: "Beginner shield ends",
      then: "other gyms can call you out",
    });
  }
  events.sort((a, b) => a.at - b.at);
  if (events.length === 0) return null;
  return (
    <div>
      <div className="section-label">Next Up</div>
      <div className="card" style={{ padding: "6px 12px" }}>
        {events.slice(0, 5).map((e, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: 10,
              padding: "7px 0",
              borderTop: i > 0 ? "1px solid var(--line)" : "none",
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 11,
                color: "var(--ember-strong)",
                width: 64,
                flexShrink: 0,
              }}
            >
              {formatRemaining(e.at.getTime() - now)}
            </span>
            <span style={{ fontSize: 13, color: "var(--ink)" }}>
              {e.label}
              <span style={{ color: "var(--ink-muted)", fontSize: 11 }}>
                {" "}
                — {e.then}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { gym, loading, reloadGym } = useAuth();
  const navigate = useNavigate();
  const [scouting, setScouting] = useState(null);
  const [fighters, setFighters] = useState([]);
  const [fights, setFights] = useState([]);
  const refresh = useCountdown(scouting?.refreshAt);

  useEffect(() => {
    api("/scouting/state")
      .then(setScouting)
      .catch(() => {});
    api("/fighters")
      .then((d) => setFighters(d.fighters))
      .catch(() => {});
    // Fights may have resolved while away — refresh purse after they load.
    api("/fights")
      .then((d) => {
        setFights(d.fights);
        reloadGym();
      })
      .catch(() => {});
  }, [reloadGym]);

  if (loading)
    return <p style={{ color: "var(--ink-secondary)" }}>Loading your gym…</p>;
  if (!gym)
    return (
      <p style={{ color: "var(--ink-secondary)" }}>
        Couldn't load your gym. Try refreshing.
      </p>
    );

  const pity = scouting?.pity?.contender;
  const attemptsLeft = scouting
    ? scouting.attemptsTotal - scouting.attemptsUsed
    : 0;
  const nextFight = fights
    .filter((f) => f.status === "scheduled")
    .sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))[0];
  const recentResults = fights
    .filter(
      (f) =>
        f.status === "resolved" &&
        Date.now() - new Date(f.resolvedAt).getTime() < RECENT_MS,
    )
    .slice(0, 3);

  return (
    <div
      className="stagger"
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {/* First Fight Week — the opening checklist */}
      {gym.onboarding && !gym.onboarding.complete && (
        <OnboardingChecklist onboarding={gym.onboarding} />
      )}

      {/* Next up — appointments, not timers */}
      <NextUp
        fighters={fighters}
        fights={fights}
        scouting={scouting}
        gym={gym}
      />

      {/* While you were away — recent resolved fights */}
      {recentResults.length > 0 && (
        <div
          style={{
            background: "var(--ember-tint)",
            borderRadius: "var(--radius-md)",
            padding: "10px 12px",
          }}
        >
          <div
            className="section-label"
            style={{ color: "var(--ember-strong)", marginBottom: 5 }}
          >
            While You Were Away
          </div>
          {recentResults.map((f) => (
            <div
              key={f.id}
              style={{
                fontSize: 13,
                marginBottom: 3,
                color:
                  f.result.winner === "you"
                    ? "var(--ink)"
                    : "var(--corner-red)",
                fontWeight: f.result.winner === "you" ? 400 : 500,
              }}
            >
              {f.result.winner === "you"
                ? "Win"
                : f.result.winner === "draw"
                  ? "Draw"
                  : "Loss"}{" "}
              — <strong>{f.you.name.split(" ").pop().toUpperCase()}</strong> vs{" "}
              {f.them.name} · {f.result.method}
            </div>
          ))}
          <button
            onClick={() => navigate("/fights")}
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 12,
              fontWeight: 600,
              color: "var(--ember-strong)",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 0,
            }}
          >
            View fight results
          </button>
        </div>
      )}

      {/* Your fighters */}
      <div>
        <div className="section-label">Your Fighters</div>
        {fighters.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {fighters.map((f) => (
              <Link
                key={f.id}
                to={`/roster/${f.id}`}
                style={{ textDecoration: "none" }}
              >
                <FighterCard variant="compact" {...toCardProps(f)} />
              </Link>
            ))}
          </div>
        ) : (
          <div className="card empty-state">
            <div className="display">No fighters yet</div>
            <p style={{ margin: 0, fontSize: 13 }}>
              Your first prospect is out there — run a scout.
            </p>
          </div>
        )}
      </div>

      {/* Scouting */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <div className="section-label" style={{ margin: 0 }}>
            Scouting
          </div>
          {scouting && (
            <TimerBadge value={refresh.text || "…"} size="sm" label="Refresh" />
          )}
        </div>
        <div className="card" style={{ padding: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ display: "flex", gap: 6, marginBottom: 5 }}>
                {Array.from(
                  { length: scouting?.attemptsTotal ?? 2 },
                  (_, i) => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background:
                          i < (scouting?.attemptsUsed ?? 0)
                            ? "var(--ember)"
                            : "var(--line)",
                        transition:
                          "background var(--duration-slow) var(--ease-out)",
                      }}
                    />
                  ),
                )}
              </div>
              <div style={{ fontSize: 12, color: "var(--ink-secondary)" }}>
                {scouting
                  ? `${scouting.attemptsUsed} of ${scouting.attemptsTotal} attempts used`
                  : "Loading…"}
              </div>
              {pity && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-muted)",
                    marginTop: 2,
                  }}
                >
                  Guaranteed Contender+ within {pity.remaining} scout
                  {pity.remaining === 1 ? "" : "s"}
                </div>
              )}
            </div>
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate("/scouting")}
            >
              {attemptsLeft > 0 ? "Scout Now" : "Scouting"}
            </Button>
          </div>
          {scouting?.reports?.length > 0 && (
            <div
              style={{
                fontSize: 12,
                color: "var(--ember-strong)",
                fontWeight: 600,
                marginTop: 8,
                paddingTop: 8,
                borderTop: "1px solid var(--line)",
              }}
            >
              {scouting.reports.length} pending report
              {scouting.reports.length === 1 ? "" : "s"} awaiting a decision →
            </div>
          )}
        </div>
      </div>

      {/* Next fight */}
      {nextFight && (
        <div>
          <div className="section-label">Next Fight</div>
          <Link to="/fights" style={{ textDecoration: "none" }}>
            <div className="card" style={{ padding: 12 }}>
              {nextFight.title && (
                <div
                  style={{
                    textAlign: "center",
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    color: "var(--gold)",
                    marginBottom: 6,
                  }}
                >
                  TITLE FIGHT
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 20,
                  marginBottom: 10,
                }}
              >
                <div style={{ textAlign: "right" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      color: "var(--ember-strong)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {nextFight.you.name.split(" ").pop()}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      marginTop: 2,
                    }}
                  >
                    {nextFight.you.record.wins}–{nextFight.you.record.losses}
                  </div>
                </div>
                <span
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 13,
                    color: "var(--ink-muted)",
                    letterSpacing: "0.04em",
                  }}
                >
                  VS
                </span>
                <div style={{ textAlign: "left" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: 17,
                      color: "var(--corner-red)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                      lineHeight: 1,
                    }}
                  >
                    {nextFight.them.name.split(" ").pop()}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 11,
                      color: "var(--ink-muted)",
                      marginTop: 2,
                    }}
                  >
                    {nextFight.them.record.wins}–{nextFight.them.record.losses}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingTop: 8,
                  borderTop: "1px solid var(--line)",
                }}
              >
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <WeightClassChip weightClass={nextFight.weightClass} />
                  <span style={{ fontSize: 11, color: "var(--ink-muted)" }}>
                    {nextFight.tier} · {nextFight.rounds} rds
                  </span>
                </div>
                <TimerBadge
                  value={formatRemaining(
                    new Date(nextFight.scheduledAt).getTime() - Date.now(),
                  )}
                  size="sm"
                />
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
