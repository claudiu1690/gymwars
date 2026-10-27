import { useCallback, useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Button } from "../components/ds/Button.jsx";
import { TimerBadge } from "../components/ds/TimerBadge.jsx";
import { useCountdown } from "../hooks/useCountdown";
import { ChoiceCards } from "../components/GameUI";

const TRAIT_QUALITY_COLORS = {
  budget: "var(--ink-muted)",
  solid: "var(--ember-strong)",
  premium: "var(--gold)",
};
const CLASS_SHORT = {
  featherweight: "FTH",
  lightweight: "LW",
  middleweight: "MW",
  heavyweight: "HW",
};

/** What a tier offers, as one scannable line. Scouts/day shown as the total (base 2 + bonus). */
function tierSummary(t) {
  const parts = [
    `${t.rosterSlots} roster slots`,
    `${2 + t.scoutBonus} scouts/day`,
  ];
  if (t.fatigueRecoveryMult > 1)
    parts.push(`+${Math.round((t.fatigueRecoveryMult - 1) * 100)}% recovery`);
  if (t.calloutBonus > 0) parts.push(`+${t.calloutBonus} callout/day`);
  parts.push(
    `${t.mentoringCapacity} mentor pair${t.mentoringCapacity === 1 ? "" : "s"}`,
  );
  return parts.join(" · ");
}

/** What the next tier actually ADDS over the current one — plain deltas. */
function tierGains(cur, next) {
  const gains = [];
  const slots = next.rosterSlots - cur.rosterSlots;
  if (slots > 0) gains.push(`+${slots} roster slot${slots === 1 ? "" : "s"}`);
  if (next.scoutBonus > cur.scoutBonus)
    gains.push(`+${next.scoutBonus - cur.scoutBonus} scout/day`);
  if (next.fatigueRecoveryMult > cur.fatigueRecoveryMult)
    gains.push(
      `+${Math.round((next.fatigueRecoveryMult - cur.fatigueRecoveryMult) * 100)}% faster fatigue recovery`,
    );
  if (next.calloutBonus > cur.calloutBonus)
    gains.push(`+${next.calloutBonus - cur.calloutBonus} callout/day`);
  const pairs = next.mentoringCapacity - cur.mentoringCapacity;
  if (pairs > 0)
    gains.push(`+${pairs} mentoring pair${pairs === 1 ? "" : "s"}`);
  return gains;
}

export default function Gym() {
  const { reloadGym } = useAuth();
  const [data, setData] = useState(null);
  const [market, setMarket] = useState([]);
  const [hof, setHof] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [mentorPick, setMentorPick] = useState("");
  const [juniorPick, setJuniorPick] = useState("");
  const upgradeCountdown = useCountdown(data?.facility?.upgrade?.endsAt);

  const load = useCallback(() => {
    api("/gyms/overview")
      .then(setData)
      .catch((e) => setError(e.message));
    api("/gyms/staff/market")
      .then((d) => setMarket(d.market))
      .catch(() => {});
    api("/gyms/hall-of-fame")
      .then((d) => setHof(d.hallOfFame))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  // Upgrade finished while the page is open — refetch to apply.
  useEffect(() => {
    if (data?.facility?.upgrade && upgradeCountdown.done) {
      const t = setTimeout(() => {
        load();
        reloadGym();
      }, 1500);
      return () => clearTimeout(t);
    }
  }, [data, upgradeCountdown.done, load, reloadGym]);

  async function act(fn) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      reloadGym();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!data && !error)
    return <p style={{ color: "var(--ink-secondary)" }}>Loading the gym…</p>;
  if (!data) return <div className="form-error">{error}</div>;

  const { facility, staff, mentoring } = data;
  const coach = staff.find((s) => s.role === "coach");
  const scout = staff.find((s) => s.role === "scout");
  const activePairs = mentoring.pairs.filter((p) => p.status === "active");
  const pastPairs = mentoring.pairs.filter((p) => p.status !== "active");
  const mentors = mentoring.candidates.filter(
    (c) => c.age >= mentoring.mentorMinAge,
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <h1 className="page-title">Gym</h1>
        <div
          style={{ display: "flex", gap: 16, fontSize: 12, textAlign: "right" }}
        >
          <div title="Where the gym stands right now — PvP rating, facility tier, and current roster strength. Rises and falls with results.">
            <div style={{ color: "var(--ink-secondary)" }}>
              Reputation{" "}
              <strong className="mono" style={{ color: "var(--ink)" }}>
                {data.reputation}
              </strong>
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>
              today's standing
            </div>
          </div>
          <div title="Lifetime honors that never decay — title wins +50, title defenses +20, 5-fight streaks +10, completed careers +10, mentoring lineages +5.">
            <div style={{ color: "var(--ink-secondary)" }}>
              Legacy{" "}
              <strong className="mono" style={{ color: "var(--gold)" }}>
                {data.legacyScore}
              </strong>
            </div>
            <div style={{ fontSize: 10, color: "var(--ink-muted)" }}>
              all-time honors
            </div>
          </div>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}

      <div
        className="stagger"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        {/* Facility */}
        <div className="card">
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8,
            }}
          >
            <div className="section-label" style={{ margin: 0 }}>
              Facility — {facility.spec.label}
            </div>
            {facility.upgrade && (
              <TimerBadge
                value={upgradeCountdown.text || "…"}
                size="sm"
                label="Upgrading"
                complete={upgradeCountdown.done}
              />
            )}
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--ink-secondary)",
              display: "flex",
              gap: 14,
              flexWrap: "wrap",
            }}
          >
            <span>{facility.spec.rosterSlots} roster slots</span>
            <span>{2 + facility.spec.scoutBonus} scouts/day</span>
            {facility.spec.fatigueRecoveryMult > 1 && (
              <span>
                +{Math.round((facility.spec.fatigueRecoveryMult - 1) * 100)}%
                recovery
              </span>
            )}
            <span>
              {facility.spec.mentoringCapacity} mentoring pair
              {facility.spec.mentoringCapacity === 1 ? "" : "s"}
            </span>
          </div>
          {facility.nextTier && !facility.upgrade && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div style={{ fontSize: 12 }}>
                <div style={{ color: "var(--ink-secondary)" }}>
                  Next:{" "}
                  <strong style={{ color: "var(--ink)" }}>
                    {facility.nextTier.label}
                  </strong>{" "}
                  adds{" "}
                  <strong style={{ color: "var(--win)" }}>
                    {tierGains(facility.spec, facility.nextTier).join(" · ")}
                  </strong>
                </div>
                <div style={{ color: "var(--ink-muted)", marginTop: 2 }}>
                  ${facility.nextTier.cost.toLocaleString()} · takes{" "}
                  {facility.nextTier.upgradeWeeks} game-weeks
                  {facility.nextTier.winMilestone && (
                    <span
                      style={{
                        color: facility.nextTier.winMilestoneMet
                          ? "var(--win)"
                          : "var(--warn)",
                      }}
                    >
                      {" "}
                      · needs {facility.nextTier.winMilestone} career wins (you
                      have {facility.nextTier.gymWins})
                    </span>
                  )}
                </div>
              </div>
              <Button
                variant="primary"
                size="sm"
                disabled={busy}
                onClick={() =>
                  act(() => api("/gyms/upgrade", { method: "POST" }))
                }
              >
                Start upgrade
              </Button>
            </div>
          )}
          {facility.tiers && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 10,
                borderTop: "1px solid var(--line)",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  color: "var(--ink-muted)",
                  marginBottom: 6,
                }}
              >
                The Path
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {facility.tiers.map((t) => {
                  const current = t.tier === facility.tier;
                  const upgradingTo = facility.upgrade?.tier === t.tier;
                  const future = t.tier > facility.tier;
                  return (
                    <div
                      key={t.tier}
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "baseline",
                        fontSize: 12,
                        opacity: future && !upgradingTo ? 0.65 : 1,
                        flexWrap: "wrap",
                      }}
                    >
                      <span
                        style={{
                          color: current
                            ? "var(--ember)"
                            : t.tier < facility.tier
                              ? "var(--win)"
                              : "var(--ink-muted)",
                          flexShrink: 0,
                          width: 12,
                        }}
                        aria-hidden="true"
                      >
                        {t.tier}
                      </span>
                      <span
                        style={{
                          fontWeight: current ? 700 : 500,
                          color: "var(--ink)",
                          flexShrink: 0,
                        }}
                      >
                        {t.label}
                        {current && (
                          <span
                            style={{
                              color: "var(--ember-strong)",
                              fontWeight: 600,
                            }}
                          >
                            {" "}
                            — you are here
                          </span>
                        )}
                        {upgradingTo && (
                          <span
                            style={{
                              color: "var(--ember-strong)",
                              fontWeight: 600,
                            }}
                          >
                            {" "}
                            — building…
                          </span>
                        )}
                      </span>
                      <span
                        style={{
                          color: "var(--ink-muted)",
                          fontSize: 11,
                          flex: 1,
                          minWidth: 160,
                        }}
                      >
                        {tierSummary(t)}
                      </span>
                      {t.cost > 0 && (
                        <span
                          className="mono"
                          style={{
                            fontSize: 11,
                            color: "var(--ink-muted)",
                            flexShrink: 0,
                          }}
                        >
                          ${t.cost.toLocaleString()}
                          {t.winMilestone ? ` · ${t.winMilestone} wins` : ""}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Staff */}
        <div className="card">
          <div className="section-label">Staff</div>
          <p
            style={{
              fontSize: 11,
              color: "var(--ink-secondary)",
              margin: "0 0 12px",
            }}
          >
            A <strong>coach</strong> makes training camps produce bigger stat
            gains and sharpens your corner on fight night. A{" "}
            <strong>scout</strong> tightens scouting reports so you sign fewer
            duds. One of each — hire the best you can afford.
          </p>
          {[coach, scout].map(
            (s) =>
              s && (
                <div
                  key={s.id}
                  style={{
                    marginBottom: 12,
                    paddingBottom: 12,
                    borderBottom: "1px solid var(--line)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 6,
                    }}
                  >
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>
                        {s.name}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          color: TRAIT_QUALITY_COLORS[s.quality],
                          marginLeft: 6,
                          textTransform: "capitalize",
                        }}
                      >
                        {s.quality} {s.role}
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          api(`/gyms/staff/${s.id}`, { method: "DELETE" }),
                        )
                      }
                    >
                      Release
                    </Button>
                  </div>
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 4 }}
                  >
                    {(s.effects || []).map((e) => (
                      <div
                        key={e.attr}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: 8,
                          fontSize: 12,
                        }}
                      >
                        <span
                          style={{ color: "var(--win)", flexShrink: 0 }}
                          aria-hidden="true"
                        >
                          ✦
                        </span>
                        <span style={{ flex: 1, color: "var(--ink)" }}>
                          {e.effect}
                        </span>
                        <span
                          className="mono"
                          style={{
                            fontSize: 10,
                            color: "var(--ink-muted)",
                            flexShrink: 0,
                            textTransform: "capitalize",
                          }}
                        >
                          {e.attr}{" "}
                          {typeof e.value === "number" ? e.value : e.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ),
          )}
          <div
            style={{ fontSize: 11, color: "var(--ink-muted)", marginBottom: 6 }}
          >
            Today's market
            {!coach || !scout ? " — refreshes daily" : " (roles filled)"}:
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {market
              .filter((c) => (c.role === "coach" ? !coach : !scout))
              .map((c) => (
                <div
                  key={c.candidateId}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 8,
                    padding: "8px 10px",
                    background: "var(--surface-sunken)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ flex: 1, fontSize: 12 }}>
                    <div>
                      <strong>{c.name}</strong>
                      <span
                        style={{
                          color: TRAIT_QUALITY_COLORS[c.quality],
                          marginLeft: 5,
                          textTransform: "capitalize",
                        }}
                      >
                        {c.quality} {c.role}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 3,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      {(c.effects || []).map((e) => (
                        <span
                          key={e.attr}
                          style={{
                            fontSize: 11,
                            color: "var(--ink-secondary)",
                          }}
                        >
                          · {e.effect}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                      flexShrink: 0,
                    }}
                  >
                    <span className="mono" style={{ fontSize: 12 }}>
                      ${c.fee.toLocaleString()}
                    </span>
                    <Button
                      variant="tint"
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        act(() =>
                          api("/gyms/staff/hire", {
                            method: "POST",
                            body: { candidateId: c.candidateId },
                          }),
                        )
                      }
                    >
                      Hire
                    </Button>
                  </div>
                </div>
              ))}
            {market.filter((c) => (c.role === "coach" ? !coach : !scout))
              .length === 0 && (
              <span style={{ fontSize: 12, color: "var(--ink-muted)" }}>
                Both roles filled — release someone to browse the market.
              </span>
            )}
          </div>
        </div>

        {/* Mentoring */}
        <div className="card">
          <div className="section-label">
            Mentoring — {activePairs.length}/{mentoring.capacity} pairs
          </div>
          {activePairs.map((p) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--ember-tint)",
                borderRadius: "var(--radius-md)",
                padding: "8px 10px",
                marginBottom: 8,
              }}
            >
              <div style={{ fontSize: 12 }}>
                <strong>{p.mentorName}</strong> is mentoring{" "}
                <strong>{p.juniorName}</strong>
                <span style={{ color: "var(--ink-muted)" }}>
                  {" "}
                  ·{" "}
                  {p.compatible
                    ? "same family — smooth"
                    : "cross-family — slower"}
                </span>
              </div>
              <span
                className="mono"
                style={{ fontSize: 11, color: "var(--ember-strong)" }}
              >
                {Math.max(
                  0,
                  Math.ceil((new Date(p.endsAt) - Date.now()) / 86400000),
                )}
                d left
              </span>
            </div>
          ))}
          {activePairs.length < mentoring.capacity && (
            <div
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <ChoiceCards
                label={`Mentor (age ${mentoring.mentorMinAge}+)`}
                value={mentorPick}
                onChange={(value) => {
                  setMentorPick(value);
                  if (value === juniorPick) setJuniorPick("");
                }}
                disabled={busy}
                options={mentors.map((c) => ({
                  value: c.id,
                  label: `${c.name} · ${c.age} · ${CLASS_SHORT[c.weightClass]}`,
                }))}
              />
              <ChoiceCards
                label="Junior"
                value={juniorPick}
                onChange={setJuniorPick}
                disabled={busy}
                options={mentoring.candidates
                  .filter((c) => c.id !== mentorPick)
                  .map((c) => ({
                    value: c.id,
                    label: `${c.name} · ${c.age} · ${CLASS_SHORT[c.weightClass]}`,
                  }))}
              />
              <Button
                variant="primary"
                size="sm"
                disabled={busy || !mentorPick || !juniorPick}
                onClick={() =>
                  act(async () => {
                    await api("/gyms/mentoring", {
                      method: "POST",
                      body: { mentorId: mentorPick, juniorId: juniorPick },
                    });
                    setMentorPick("");
                    setJuniorPick("");
                  })
                }
              >
                Pair up
              </Button>
            </div>
          )}
          {mentors.length === 0 && activePairs.length === 0 && (
            <p
              style={{
                fontSize: 11,
                color: "var(--ink-muted)",
                margin: "6px 0 0",
              }}
            >
              No fighter is {mentoring.mentorMinAge}+ yet — mentors need the
              miles. A veteran's last camps can pass a trait to whoever replaces
              them.
            </p>
          )}
          {pastPairs.length > 0 && (
            <div
              style={{
                marginTop: 10,
                paddingTop: 8,
                borderTop: "1px solid var(--line)",
              }}
            >
              {pastPairs.map((p) => (
                <div
                  key={p.id}
                  style={{
                    fontSize: 11,
                    color:
                      p.status === "succeeded"
                        ? "var(--win)"
                        : "var(--ink-muted)",
                    marginBottom: 2,
                  }}
                >
                  {p.status === "succeeded"
                    ? `${p.mentorName} passed ${p.trait} to ${p.juniorName}`
                    : `${p.mentorName} × ${p.juniorName} — the lessons didn't stick`}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Hall of Fame */}
        <div className="card">
          <div className="section-label">Hall of Fame</div>
          {hof.length === 0 ? (
            <p style={{ fontSize: 12, color: "var(--ink-muted)", margin: 0 }}>
              Empty for now. Every fighter who retires out of this gym gets a
              plaque — their record outlives their career.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {hof.map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    background: "var(--gold-tint)",
                    borderRadius: "var(--radius-md)",
                    padding: "8px 10px",
                  }}
                >
                  <span style={{ color: "var(--gold)" }} aria-hidden="true">
                    ◆
                  </span>
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 13,
                        textTransform: "uppercase",
                      }}
                    >
                      {f.name}
                    </div>
                    <div
                      style={{ fontSize: 11, color: "var(--ink-secondary)" }}
                    >
                      {f.regionLabel} · {CLASS_SHORT[f.weightClass]} ·{" "}
                      {new Date(f.signedAt).getFullYear()}–
                      {new Date(f.retiredAt).getFullYear()}
                    </div>
                  </div>
                  <span className="mono" style={{ fontSize: 12 }}>
                    {f.record.wins}–{f.record.losses}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
