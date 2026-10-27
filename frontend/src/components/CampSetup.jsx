import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "./ds/Button.jsx";

const STATS = [
  { key: "striking", label: "Striking" },
  { key: "grappling", label: "Grappling" },
  { key: "submissions", label: "Submissions" },
  { key: "conditioning", label: "Conditioning" },
];

const LENGTHS = [
  { weeks: 1, label: "Short notice", detail: "1 game-week · minimal gains" },
  { weeks: 4, label: "Standard camp", detail: "4 game-weeks · moderate gains" },
  { weeks: 6, label: "Full camp", detail: "6 game-weeks · maximum gains" },
];

const NEGLECT_FLOOR = 15;
const FATIGUE_PER_WEEK = 9;

/** Camp setup — GDD §5.1: four sliders totalling 100%, neglect warning below
 *  15%, length choice with real-time equivalents. When a fight is booked,
 *  `noticeWeeksLeft` frames the camp inside that window: lengths that finish
 *  after fight night are flagged and the default picks the longest that fits. */
export default function CampSetup({
  fighterId,
  fatigue,
  noticeWeeksLeft = null,
  coaching = null,
  onStarted,
}) {
  const { gym } = useAuth();
  const [alloc, setAlloc] = useState({
    striking: 25,
    grappling: 25,
    submissions: 25,
    conditioning: 25,
  });
  const [weeks, setWeeks] = useState(4);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  // Amateur circuit: rookie gyms' camps run compressed — fit math follows.
  const speedMult = gym?.rookie?.active ? gym.rookie.campSpeedMult : 1;
  const forFight = noticeWeeksLeft != null;
  const fits = (w) => !forFight || w / speedMult <= noticeWeeksLeft;

  // Default to the longest camp that still finishes before fight night.
  useEffect(() => {
    if (!forFight) return;
    const best = [...LENGTHS]
      .reverse()
      .find((l) => l.weeks / speedMult <= noticeWeeksLeft);
    setWeeks(best ? best.weeks : LENGTHS[0].weeks);
  }, [forFight, noticeWeeksLeft, speedMult]);

  const sum = useMemo(
    () => STATS.reduce((s, { key }) => s + alloc[key], 0),
    [alloc],
  );
  const neglected = STATS.filter(({ key }) => alloc[key] < NEGLECT_FLOOR);
  const projectedFatigue = Math.min(100, fatigue + weeks * FATIGUE_PER_WEEK);

  // Projected stat change per category (uncapped estimate — hidden potential
  // may cut gains short; the post-camp note reveals that). Neglected stats
  // atrophy. Mirrors the server's camp math via the coaching payload.
  const projGain = (key) => {
    if (!coaching) return null;
    if (alloc[key] < NEGLECT_FLOOR) {
      const severity = 1 - alloc[key] / NEGLECT_FLOOR;
      return -(coaching.atrophyPerWeek * weeks * severity);
    }
    return coaching.basePerWeek * weeks * (alloc[key] / 100);
  };
  const coachPct = coaching?.hasCoach
    ? Math.round((coaching.gainMult - 1) * 100)
    : 0;

  function set(key, value) {
    setAlloc((a) => ({ ...a, [key]: Number(value) }));
  }

  async function start() {
    setBusy(true);
    setError(null);
    try {
      await api("/camps", {
        method: "POST",
        body: { fighterId, allocations: alloc, weeks },
      });
      onStarted();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="section-label">
        {forFight ? "Fight Camp" : "Training Camp"}
      </div>
      <p
        style={{
          fontSize: 11,
          color: "var(--ink-secondary)",
          margin: "0 0 10px",
        }}
      >
        {forFight
          ? `Fight night is ~${Math.max(1, Math.floor(noticeWeeksLeft))} game-week${Math.floor(noticeWeeksLeft) === 1 ? "" : "s"} out — a camp that fits ends with time to taper.`
          : "No fight booked — this is maintenance work. Book a bout to give the camp a deadline."}
        {speedMult > 1 && (
          <span style={{ color: "var(--ember-strong)", fontWeight: 600 }}>
            {" "}
            Amateur circuit: camps run {speedMult}× faster until the gym's first{" "}
            {gym.rookie.winsThreshold} wins.
          </span>
        )}
      </p>
      {/* Coach — the effect on THIS fighter's camp, projected below */}
      {coaching &&
        (coaching.hasCoach ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              background: "var(--ember-tint)",
              borderRadius: "var(--radius-md)",
              padding: "7px 10px",
              marginBottom: 10,
              fontSize: 11,
              flexWrap: "wrap",
            }}
          >
            <span style={{ color: "var(--win)" }} aria-hidden="true">
              ✦
            </span>
            <span style={{ color: "var(--ink)" }}>
              Coach <strong>{coaching.coachName}</strong>:{" "}
              <strong
                style={{
                  color: coachPct >= 0 ? "var(--win)" : "var(--corner-red)",
                }}
              >
                {coachPct >= 0 ? "+" : ""}
                {coachPct}%
              </strong>{" "}
              camp gains
            </span>
            <span style={{ color: "var(--ink-muted)" }}>
              · {coaching.specialtyMatch ? "style chemistry" : "off-specialty"}
              {coaching.rising ? " · young-fighter bonus" : ""}
            </span>
          </div>
        ) : (
          <div
            style={{
              fontSize: 11,
              color: "var(--ink-muted)",
              background: "var(--surface-sunken)",
              borderRadius: "var(--radius-md)",
              padding: "7px 10px",
              marginBottom: 10,
            }}
          >
            No coach hired — camps gain the base rate.{" "}
            <Link
              to="/gym"
              style={{ color: "var(--ember-strong)", fontWeight: 600 }}
            >
              Hire a coach
            </Link>{" "}
            for bigger gains.
          </div>
        ))}
      {error && <div className="form-error">{error}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {STATS.map(({ key, label }) => (
          <div
            key={key}
            style={{ display: "flex", alignItems: "center", gap: 10 }}
          >
            <span
              style={{
                fontSize: 11,
                color:
                  alloc[key] < NEGLECT_FLOOR
                    ? "var(--warn)"
                    : "var(--ink-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
                width: 96,
                flexShrink: 0,
              }}
            >
              {label}
            </span>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={alloc[key]}
              onChange={(e) => set(key, e.target.value)}
              style={{
                flex: 1,
                accentColor:
                  alloc[key] < NEGLECT_FLOOR ? "var(--warn)" : "var(--ember)",
              }}
              aria-label={`${label} allocation`}
            />
            <span
              className="mono"
              style={{
                fontSize: 12,
                width: 38,
                textAlign: "right",
                color: "var(--ink)",
              }}
            >
              {alloc[key]}%
            </span>
            {coaching &&
              (() => {
                const g = projGain(key);
                const pos = g >= 0;
                return (
                  <span
                    className="mono"
                    title="Projected change this camp (estimate — a hidden potential ceiling can cut it short)"
                    style={{
                      fontSize: 12,
                      width: 42,
                      textAlign: "right",
                      flexShrink: 0,
                      color: pos ? "var(--win)" : "var(--corner-red)",
                    }}
                  >
                    {pos ? "+" : "−"}
                    {Math.abs(g).toFixed(1)}
                  </span>
                );
              })()}
          </div>
        ))}
      </div>
      {coaching && (
        <div
          style={{
            fontSize: 10,
            color: "var(--ink-muted)",
            marginTop: 6,
            textAlign: "right",
          }}
        >
          Projected stat change over the camp · estimate
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: 10,
          paddingTop: 8,
          borderTop: "1px solid var(--line)",
          fontSize: 12,
        }}
      >
        <span
          style={{
            color: sum === 100 ? "var(--win)" : "var(--corner-red)",
            fontWeight: 600,
          }}
        >
          Total: {sum}% {sum !== 100 && "— must equal 100%"}
        </span>
        {neglected.length > 0 && (
          <span style={{ color: "var(--warn)" }}>
            Below 15% atrophies: {neglected.map((s) => s.label).join(", ")}
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        {LENGTHS.map((l) => (
          <button
            key={l.weeks}
            onClick={() => setWeeks(l.weeks)}
            className="pressable"
            style={{
              flex: 1,
              padding: "8px 6px",
              cursor: "pointer",
              textAlign: "center",
              background:
                weeks === l.weeks ? "var(--ember-tint)" : "transparent",
              border: `1.5px solid ${weeks === l.weeks ? "var(--ember)" : fits(l.weeks) ? "var(--line)" : "var(--warn)"}`,
              borderRadius: "var(--radius-md)",
              opacity: fits(l.weeks) ? 1 : 0.8,
            }}
          >
            <div
              style={{
                fontSize: 12,
                fontWeight: 600,
                color: weeks === l.weeks ? "var(--ember-strong)" : "var(--ink)",
              }}
            >
              {l.label}
            </div>
            <div
              style={{
                fontSize: 10,
                color: fits(l.weeks) ? "var(--ink-muted)" : "var(--warn)",
                marginTop: 2,
              }}
            >
              {fits(l.weeks) ? l.detail : "ends after fight night"}
            </div>
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginTop: 12,
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: projectedFatigue >= 50 ? "var(--warn)" : "var(--ink-muted)",
          }}
        >
          Projected fatigue after camp:{" "}
          <span className="mono">{projectedFatigue}</span>/100
        </span>
        <Button
          variant="primary"
          size="sm"
          disabled={busy || sum !== 100}
          onClick={start}
        >
          {busy ? "Starting…" : `Start ${weeks}-week camp`}
        </Button>
      </div>
    </div>
  );
}
