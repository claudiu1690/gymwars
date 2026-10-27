import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { formatRemaining } from "../hooks/useCountdown";
import { ChoiceCards } from "./GameUI";

const CLASS_LABELS = {
  featherweight: "FTH",
  lightweight: "LW",
  middleweight: "MW",
  heavyweight: "HW",
};

/**
 * Gym Wars hub (design brief §5 P1) — rating, shield, coverage, attack
 * actions, and the standing defense lineup. Lives on the night surface.
 */
export default function PvpHub({ fighters }) {
  const navigate = useNavigate();
  const [state, setState] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const load = useCallback(() => {
    api("/pvp/state")
      .then(setState)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  async function callout(fighterId) {
    setBusy(true);
    setError(null);
    try {
      const d = await api("/pvp/callout", {
        method: "POST",
        body: { fighterId },
      });
      navigate(`/pvp/${d.event.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function gymWar() {
    setBusy(true);
    setError(null);
    try {
      const d = await api("/pvp/gymwar", { method: "POST", body: {} });
      navigate(`/pvp/${d.event.id}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function setLineup(weightClass, fighterId) {
    try {
      await api("/pvp/defense", {
        method: "PUT",
        body: { lineup: { [weightClass]: fighterId || null } },
      });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  if (!state) return null;

  const warReady =
    state.classesCovered >= state.minClassesForWar && state.gymWarsLeft > 0;
  const eligible = fighters.filter((f) => !f.retired);

  return (
    <div
      style={{
        background: "var(--night-surface)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--night-line)",
        padding: 14,
        marginBottom: 20,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 4,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            color: "var(--night-muted)",
          }}
        >
          Gym vs Gym
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {state.shieldUntil && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: "var(--night-muted)",
                background: "rgba(140,128,103,0.2)",
                padding: "2px 8px",
                borderRadius: "var(--radius-chip)",
              }}
            >
              SHIELDED{" "}
              {formatRemaining(
                new Date(state.shieldUntil).getTime() - Date.now(),
              )}
            </span>
          )}
          <span
            className="mono"
            style={{ fontSize: 16, fontWeight: 600, color: "var(--ember)" }}
          >
            {state.rating}
          </span>
          <span style={{ fontSize: 10, color: "var(--night-muted)" }}>
            RATING
          </span>
        </div>
      </div>

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "var(--corner-red)",
            background: "rgba(198,50,62,0.12)",
            borderRadius: "var(--radius-md)",
            padding: "8px 10px",
            margin: "8px 0 10px",
          }}
        >
          {error}
        </div>
      )}

      {/* Coverage strip — full class coverage is a competitive necessity (GDD §9.2) */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {Object.entries(state.coverage).map(([wc, pick]) => (
          <div
            key={wc}
            style={{
              flex: 1,
              textAlign: "center",
              padding: "6px 2px",
              borderRadius: "var(--radius-md)",
              background: pick
                ? "rgba(255,90,41,0.12)"
                : "rgba(140,128,103,0.12)",
              border: `1px solid ${pick ? "var(--ember)" : "var(--night-line)"}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: pick ? "var(--ember)" : "var(--night-muted)",
                letterSpacing: "0.06em",
              }}
            >
              {CLASS_LABELS[wc]}
            </div>
            <div
              style={{
                fontSize: 9,
                color: "var(--night-muted)",
                marginTop: 1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {pick ? pick.name.split(" ").pop() : "forfeit"}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={() => setPickerOpen(!pickerOpen)}
          disabled={busy || state.calloutsLeft <= 0}
          className="pressable"
          style={{
            flex: 1,
            padding: "8px 6px",
            cursor: "pointer",
            background: "transparent",
            color:
              state.calloutsLeft > 0 ? "var(--ember)" : "var(--night-muted)",
            border: "1.5px solid currentColor",
            borderRadius: "var(--radius-button)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            Callout ({state.calloutsLeft} left)
          </div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>
            one fighter, one bout
          </div>
        </button>
        <button
          onClick={gymWar}
          disabled={busy || !warReady}
          className="pressable"
          style={{
            flex: 1,
            padding: "8px 6px",
            cursor: "pointer",
            background: warReady ? "var(--ember)" : "rgba(140,128,103,0.2)",
            color: warReady ? "#fff" : "var(--night-muted)",
            border: "none",
            borderRadius: "var(--radius-button)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {busy
              ? "Fighting…"
              : state.gymWarsLeft > 0
                ? "Start Gym War"
                : "War fought today"}
          </div>
          <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>
            full card, every weight class
          </div>
        </button>
      </div>
      {state.classesCovered < state.minClassesForWar && (
        <p
          style={{
            fontSize: 11,
            color: "var(--night-muted)",
            margin: "8px 0 0",
          }}
        >
          Gym Wars need {state.minClassesForWar} weight classes covered — you
          have {state.classesCovered}. Sign into another division.
        </p>
      )}

      {/* Callout fighter picker */}
      {pickerOpen && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: "1px solid var(--night-line)",
          }}
        >
          <div
            style={{
              fontSize: 10,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              color: "var(--night-muted)",
              marginBottom: 6,
            }}
          >
            Who makes the callout?
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {eligible.map((f) => (
              <button
                key={f.id}
                onClick={() => callout(f.id)}
                disabled={busy}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 10px",
                  fontSize: 13,
                  cursor: "pointer",
                  background: "transparent",
                  color: "var(--night-text)",
                  border: "1px solid var(--night-line)",
                  borderRadius: "var(--radius-md)",
                }}
              >
                <span style={{ fontWeight: 600 }}>{f.name}</span>
                <span style={{ color: "var(--night-muted)", fontSize: 11 }}>
                  {CLASS_LABELS[f.weightClass]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Defense lineup editor (GDD §9.6) */}
      <h3 style={{ fontSize: 14 }}>Standing defense lineup</h3>
      <div
        style={{
          marginTop: 8,
          display: "flex",
          flexDirection: "column",
          gap: 6,
        }}
      >
        {Object.entries(state.coverage).map(([wc, pick]) => {
          const options = eligible.filter((f) => f.weightClass === wc);
          return (
            <div
              key={wc}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: "var(--night-muted)",
                  width: 32,
                }}
              >
                {CLASS_LABELS[wc]}
              </span>
              {options.length > 0 ? (
                <ChoiceCards
                  label={`${CLASS_LABELS[wc]} defense fighter`}
                  value={pick?.isLineupPick ? String(pick.fighterId) : ""}
                  onChange={(value) => setLineup(wc, value || null)}
                  disabled={busy}
                  options={[
                    {
                      value: "",
                      label: `Auto (best available${pick ? `: ${pick.name}` : ""})`,
                    },
                    ...options.map((f) => ({
                      value: String(f.id),
                      label: f.name,
                    })),
                  ]}
                />
              ) : (
                <span style={{ fontSize: 11, color: "var(--night-muted)" }}>
                  No fighter — this class forfeits
                </span>
              )}
            </div>
          );
        })}
        <p
          style={{
            fontSize: 10,
            color: "var(--night-muted)",
            margin: "4px 0 0",
          }}
        >
          Defenders fight with their saved gameplans while you're offline.
        </p>
      </div>
    </div>
  );
}
