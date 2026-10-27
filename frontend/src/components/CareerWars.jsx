import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { isDefiniteRejection, requestId } from "../careerRequest.mjs";
import { Action } from "./CareerControls";
import WarLineup from "./WarLineup";
import WarResult from "./WarResult";
import { ClubCrest, GymWarArena, WarRivals, WarTactics } from "./GymWarVisuals";
import { AllowanceLine } from "./CareerAvailability";
import { GameTabs } from "./GameUI";
import GymWarClub, { GymWarLeaderboard } from "./GymWarClub";
import { selectedTeam, teamPlanDrafts } from "../warTeamDrafts.mjs";
import {
  defenseMatches,
  divisionCoverage,
  divisionLabel,
} from "../careerCompetition.mjs";
import "./career-wars.css";
import "./gym-team-workbench.css";

export default function CareerWars({ revision, s, allowances, onRefresh }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const requestedRival = searchParams.get("rival");
  const requestedType = searchParams.get("type");
  const [data, setData] = useState(null),
    [selected, setSelected] = useState(null);
  const [lineup, setLineup] = useState({}),
    [result, setResult] = useState(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [animateResult, setAnimateResult] = useState(false);
  const [tab, setTab] = useState(
    ["team", "club", "leaderboard"].includes(searchParams.get("tab"))
      ? searchParams.get("tab")
      : "battle",
  );
  const [openingMatchup, setOpeningMatchup] = useState(false);
  const [gameplans, setGameplans] = useState({});
  const [editingDivision, setEditingDivision] = useState("featherweight");
  const lock = useRef(false),
    retry = useRef(null),
    rivalRetry = useRef(null);
  const loadSequence = useRef(0);
  async function load() {
    const sequence = ++loadSequence.current;
    try {
      const value = await api("/career/wars/lobby");
      if (requestedRival && requestedType) {
        value.requestedMatch = await api(
          `/career/wars/opponents/${encodeURIComponent(requestedType)}/${encodeURIComponent(requestedRival)}`,
        );
      }
      if (sequence !== loadSequence.current) return;
      setData(value);
      setGameplans((previous) => teamPlanDrafts(value.mine, previous));
      setSelected((id) =>
        [
          ...value.opponents,
          ...(value.requestedMatch?.opponent
            ? [value.requestedMatch.opponent]
            : []),
          ...(value.challenges || []).filter((c) => !c.locked),
        ].some((opponent) => opponent.id === (id || requestedRival)) ||
        (value.rivalry?.status === "matched" &&
          value.rivalry.opponent?.id === id)
          ? id || requestedRival
          : requestedRival && requestedType
            ? requestedRival
            : value.opponents[0]?.id,
      );
      setLineup((previous) =>
        Object.fromEntries(
          (value.mine?.lineup || []).map((fighter) => [
            fighter.weightClass,
            value.mine.choices?.some(
              (choice) =>
                choice.id === previous[fighter.weightClass] &&
                choice.weightClass === fighter.weightClass,
            )
              ? previous[fighter.weightClass]
              : value.mine.choices?.find(
                  (choice) =>
                    choice.id ===
                    value.mine.defense?.lineup?.find(
                      (saved) => saved.weightClass === fighter.weightClass,
                    )?.id,
                )?.id || fighter.id,
          ]),
        ),
      );
      setError(
        value.requestedMatch && !value.requestedMatch.opponent
          ? value.requestedMatch.reason
          : "",
      );
    } catch (e) {
      if (sequence === loadSequence.current) setError(e.message);
    } finally {
      if (sequence === loadSequence.current) setOpeningMatchup(false);
    }
  }
  useEffect(() => {
    setSelected(null);
  }, [requestedRival, requestedType]);
  useEffect(() => {
    load();
    return () => {
      loadSequence.current += 1;
    };
  }, [revision, allowances?.serverNow, requestedRival, requestedType]);
  const choices = data?.mine?.choices || [];
  const fighters = selectedTeam(data?.mine, lineup, gameplans);
  const coverage = divisionCoverage(s.fighters);
  const full = coverage.complete && fighters.length === 4;
  const published = Boolean(
    data?.mine?.defenseReady && defenseMatches(data?.mine?.defense, fighters),
  );
  const savedLineup = data?.mine?.defense?.lineup;
  const sameTeamAndCalls = Boolean(
    savedLineup?.length === 4 &&
    fighters.length === 4 &&
    fighters.every((f) =>
      savedLineup.some(
        (old) =>
          old.id === f.id &&
          JSON.stringify(old.gameplan) === JSON.stringify(f.gameplan),
      ),
    ),
  );
  const refreshTrained = !published && sameTeamAndCalls;
  const refreshTraits =
    refreshTrained && fighters.some((f) => f.defenseTraitsCurrent === false);
  const refreshRules =
    refreshTrained &&
    data.mine.defense.combatVersion !== data.mine.combatVersion;
  const followed = data?.rivalry;
  const rival =
    [
      ...(data?.requestedMatch?.opponent ? [data.requestedMatch.opponent] : []),
      ...(data?.opponents || []),
      ...(data?.challenges || []).filter((c) => !c.locked),
    ].find((opponent) => opponent.id === selected) ||
    (followed?.status === "matched" && followed.opponent?.id === selected
      ? followed.opponent
      : null);
  const pairs = rival
    ? fighters.flatMap((you) => {
        const them = rival.lineup.find(
          (fighter) => fighter.weightClass === you.weightClass,
        );
        return them ? [{ you, them }] : [];
      })
    : [];
  const league = data?.league;
  const allowance = league?.allowance || allowances?.leagueCards;
  const empty = allowance?.available === 0;
  function openMatchup(target) {
    if (busy || !target?.id || !target.type) return;
    retry.current = null;
    setResult(null);
    setSelected(null);
    setTab("battle");
    setOpeningMatchup(true);
    if (requestedRival === target.id && requestedType === target.type) load();
    else setSearchParams({ rival: target.id, type: target.type });
  }
  function rematchTarget(card) {
    return card.direction === "defense"
      ? { id: card.attackerGymId, type: "player" }
      : { id: card.opponentId, type: card.opponentType };
  }
  function editTactics(fighter) {
    setEditingDivision(fighter.weightClass);
    setTab("team");
  }
  async function followRival(target, again = false) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    const body =
      again && rivalRetry.current
        ? rivalRetry.current
        : {
            revision: data.mine.revision,
            expectedRivalVersion: followed?.version || null,
            opponentId: target?.id || null,
            opponentType: target?.type || null,
            division: null,
          };
    rivalRetry.current = body;
    try {
      await api("/career/wars/rival", { method: "POST", body });
      rivalRetry.current = null;
      setNotice(
        body.opponentId
          ? "Rival followed. Your actual card history stays here; normal ranked-card costs and scoring still apply."
          : "Rival cleared. Your recorded cards remain in club history.",
      );
      await onRefresh?.();
      await load();
    } catch (failure) {
      setError(failure.message);
      if (isDefiniteRejection(failure)) {
        rivalRetry.current = null;
        await load();
        setError(failure.message);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  async function perform(kind, again = false) {
    const exactRetry = again && retry.current;
    if (
      lock.current ||
      (!exactRetry &&
        (!full || (kind === "battle" && (!rival || empty || !published))))
    )
      return;
    lock.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    const payload =
      again && retry.current
        ? retry.current
        : {
            kind,
            body:
              kind === "defense"
                ? {
                    revision: data.mine.revision,
                    fighterIds: fighters.map((fighter) => fighter.id),
                    gameplans: Object.fromEntries(
                      fighters.map((fighter) => [fighter.id, fighter.gameplan]),
                    ),
                    expectedDefenseVersion:
                      data.mine.defenseVersion ??
                      data.mine.defense?.version ??
                      null,
                  }
                : {
                    requestId: requestId(),
                    revision: data.mine.revision,
                    fighterIds: fighters.map((fighter) => fighter.id),
                    opponentId: rival.id,
                    opponentType: rival.type,
                    opponentRevision: rival.version,
                  },
          };
    retry.current = payload;
    try {
      const value = await api(`/career/wars/${payload.kind}`, {
        method: "POST",
        body: payload.body,
      });
      if (payload.kind === "battle") {
        setAnimateResult(true);
        setResult(value);
        await onRefresh?.();
      } else {
        setGameplans((previous) => ({
          ...previous,
          ...Object.fromEntries(
            value.defense.lineup.map((fighter) => [
              fighter.id,
              fighter.gameplan,
            ]),
          ),
        }));
        setNotice(
          "Team and tactics saved. These instructions are used for your Gym Wars attacks and defenses. No cards spent.",
        );
      }
      retry.current = null;
      await load();
    } catch (e) {
      setError(e.message);
      if (isDefiniteRejection(e)) {
        retry.current = null;
        await load();
        setError(e.message);
      }
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const next = league?.nextMilestone;
  return (
    <div className="career-wars gw-fight-night">
      <div className="gw-mode-header">
        <div>
          <span className="career-eyebrow">YOUR GYM. YOUR CORNER.</span>
          <h2>Take on another gym.</h2>
        </div>
        <span className="gw-format-label">RANKED · 4V4</span>
      </div>
      {error && (
        <div className="career-error" role="alert">
          {error}
          <Action
            disabled={busy}
            onClick={() =>
              rivalRetry.current
                ? followRival(null, true)
                : retry.current
                  ? perform(retry.current.kind, true)
                  : load()
            }
          >
            {retry.current || rivalRetry.current
              ? "Retry action"
              : "Refresh teams"}
          </Action>
        </div>
      )}
      {notice && (
        <p className="war-notice" role="status">
          {notice}
        </p>
      )}
      {!data && !error && <p role="status">Finding rival gyms…</p>}
      {openingMatchup && (
        <p role="status">Loading this gym’s current 4v4 team…</p>
      )}
      {result ? (
        <WarResult
          result={result}
          s={s}
          animate={animateResult}
          onClose={() => {
            setResult(null);
            setTab("battle");
          }}
          onRematch={
            rematchTarget(result).id && rematchTarget(result).type
              ? () => openMatchup(rematchTarget(result))
              : undefined
          }
          clubProgress={
            league
              ? {
                  points: league.lifetimePoints,
                  nextMilestone: league.nextMilestone,
                }
              : null
          }
        />
      ) : (
        data && (
          <>
            <div className="gw-league-strip">
              <AllowanceLine
                allowance={allowance}
                noun="Gym Wars tokens"
                shortNoun="tokens"
              />
              <span>
                <b>{league?.lifetimePoints || 0}</b> permanent club points
                {next
                  ? ` · Next: ${next.title} at ${next.points}`
                  : " · All club honors earned"}
              </span>
            </div>
            <GameTabs
              label="Gym Wars screens"
              prefix="gym-wars"
              tabs={[
                { id: "battle", label: "Battle" },
                { id: "team", label: "Team" },
                { id: "club", label: "Club" },
                { id: "leaderboard", label: "Leaderboard" },
              ]}
              value={tab}
              onChange={setTab}
            />
            <section
              className="gw-war-panel"
              id="gym-wars-battle-panel"
              role="tabpanel"
              aria-labelledby="gym-wars-battle-tab"
              hidden={tab !== "battle"}
            >
              {full && (
                <WarRivals
                  opponents={data.opponents}
                  selected={selected}
                  disabled={busy}
                  onChange={(id) => {
                    setSelected(id);
                    setSearchParams({ rival: id });
                    setError("");
                    retry.current = null;
                  }}
                />
              )}
              <GymWarArena
                yourGym={data.mine.name}
                yourLook={s.shopIdentity}
                theirGym={rival?.name}
                fighters={fighters}
                opponents={rival?.lineup}
              >
                <div>
                  <strong>
                    {!full
                      ? "Four divisions make a gym."
                      : !published
                        ? refreshTrained
                          ? refreshRules
                            ? "Your team needs the updated fight rules."
                            : refreshTraits
                              ? "Your fighters have learned new traits."
                              : "Your fighters have improved."
                          : "Lock in your four-fighter team."
                        : !rival
                          ? "Choose a rival to review."
                          : empty
                            ? "Your next ranked card is refilling."
                            : "Your corner is ready."}
                  </strong>
                  <p>
                    {!full
                      ? "Recruit one Featherweight, Lightweight, Middleweight and Heavyweight. Any rarity qualifies."
                      : !published
                        ? refreshTrained
                          ? refreshRules
                            ? "Refresh your four-fighter team once. Saved fighters and tactical calls stay selected; no token or week is spent."
                            : "Update their skills and learned traits for attack and defense. Your saved fighters and tactics stay selected. No token spent."
                          : "Save these four fighters and their tactics for attack and defense."
                        : !rival && data.requestedMatch?.reason
                          ? data.requestedMatch.reason
                          : rival?.scoringNote ||
                            "Four bouts. The gym with more wins takes the card."}
                  </p>
                </div>
                <div>
                  {!full ? (
                    <Link className="career-action" to="/career/scouting">
                      Complete your team
                    </Link>
                  ) : !published ? (
                    <Action
                      disabled={busy}
                      onClick={() =>
                        refreshTrained ? perform("defense") : setTab("team")
                      }
                    >
                      {refreshTrained
                        ? refreshRules
                          ? "Update team for new rules"
                          : refreshTraits
                            ? "Update learned traits"
                            : "Update trained fighters"
                        : "Set team & tactics"}
                    </Action>
                  ) : (
                    <Action
                      disabled={busy || empty || !rival || pairs.length !== 4}
                      onClick={() => perform("battle")}
                    >
                      {busy
                        ? "Playing card…"
                        : empty
                          ? "No Gym Wars tokens available"
                          : "Play 4v4 · 1 token"}
                    </Action>
                  )}
                </div>
              </GymWarArena>
              {rival?.type === "player" && (
                <Link
                  className="gw-profile-entry"
                  to={`/career/profile/${rival.id}`}
                >
                  View {rival.name} profile
                </Link>
              )}
              {!full && (
                <div className="gw-missing-divisions">
                  {coverage.missing.map((division) => (
                    <Link
                      className="career-action secondary"
                      key={division}
                      to={`/career/scouting?division=${division}`}
                    >
                      Recruit {divisionLabel(division)}
                    </Link>
                  ))}
                </div>
              )}
              {full && rival && (
                <WarTactics
                  fighters={fighters}
                  opponent={rival}
                  s={s}
                  onEdit={editTactics}
                />
              )}
              <section
                className="gw-club-cups"
                aria-label="Gym upgrade challenges"
              >
                <header>
                  <span className="career-eyebrow">
                    BUILD A HOME. EARN A CUP.
                  </span>
                  <h3>Your club’s next challenges</h3>
                  <p>
                    One ranked 4v4 card · 1 token. Normal points and repeat
                    scoring. Win to earn each crest permanently.
                  </p>
                </header>
                <div>
                  {(data.challenges || []).map((club) => (
                    <article key={club.id} data-selected={selected === club.id}>
                      <img
                        src={`/art/headquarters-tier-${club.challenge.minTier}.webp`}
                        alt=""
                        loading="lazy"
                      />
                      <div>
                        <span className="career-eyebrow">
                          {club.complete
                            ? "CREST EARNED"
                            : `GYM TIER ${club.challenge.minTier}`}
                        </span>
                        <h4>{club.name}</h4>
                        <p>{club.description}</p>
                        <strong>
                          {club.challenge.goal} · {club.challenge.rewardName}{" "}
                          crest
                        </strong>
                        {club.locked ? (
                          <Link
                            className="career-action secondary"
                            to="/career/gym/facilities"
                          >
                            Open tier {club.challenge.minTier}
                          </Link>
                        ) : (
                          <Action
                            secondary
                            disabled={busy || !full}
                            onClick={() => {
                              setSelected(club.id);
                              setSearchParams({ rival: club.id });
                              setError("");
                              retry.current = null;
                              document
                                .querySelector(".gw-arena")
                                ?.scrollIntoView({ block: "center" });
                            }}
                          >
                            {selected === club.id
                              ? "Selected for your next card"
                              : "Review this 4v4 matchup"}
                          </Action>
                        )}
                      </div>
                    </article>
                  ))}
                </div>
              </section>
              {!!data.history.length && (
                <section className="war-league-history">
                  <header>
                    <span className="career-eyebrow">YOUR GYM’S STORY</span>
                    <h3>Recent gym battles</h3>
                  </header>
                  {data.history.slice(0, 8).map((card) => (
                    <article className="gw-history-card" key={card.id}>
                      <button
                        type="button"
                        className="gw-history-watch"
                        onClick={() => {
                          setAnimateResult(false);
                          setResult(card);
                        }}
                      >
                        <ClubCrest
                          name={
                            card.direction === "defense"
                              ? card.yourGym
                              : card.opponent
                          }
                          rival
                        />
                        <span>
                          {card.direction === "defense"
                            ? "Defense"
                            : "Challenge"}{" "}
                          ·{" "}
                          {card.direction === "defense"
                            ? card.yourGym
                            : card.opponent}
                          <small>Ranked · 4 bouts</small>
                        </span>
                        <strong>
                          {card.direction === "defense"
                            ? card.losses
                            : card.wins}
                          –
                          {card.direction === "defense"
                            ? card.wins
                            : card.losses}
                        </strong>
                        <span>Watch card</span>
                      </button>
                      {rematchTarget(card).id && rematchTarget(card).type && (
                        <button
                          className="gw-history-rematch"
                          type="button"
                          disabled={busy || openingMatchup}
                          onClick={() => openMatchup(rematchTarget(card))}
                        >
                          Rematch{" "}
                          {card.direction === "defense"
                            ? card.yourGym
                            : card.opponent}
                        </button>
                      )}
                      {rematchTarget(card).type === "player" &&
                        rematchTarget(card).id && (
                          <Link
                            className="gw-history-profile"
                            to={`/career/profile/${rematchTarget(card).id}`}
                            aria-label={`View profile for ${card.direction === "defense" ? card.yourGym : card.opponent}`}
                          >
                            View profile
                          </Link>
                        )}
                    </article>
                  ))}
                </section>
              )}
            </section>
            <section
              className="gw-war-panel gw-team-settings"
              id="gym-wars-team-panel"
              role="tabpanel"
              aria-labelledby="gym-wars-team-tab"
              hidden={tab !== "team"}
            >
              <header className="gw-team-hero">
                <div>
                  <span className="career-eyebrow">IN YOUR CORNER</span>
                  <h3>Four fighters. Your game plan.</h3>
                  <p>Pick a fighter. Set their tactics. Save the team.</p>
                </div>
                <span className="gw-team-stamp">4V4 · ATTACK & DEFENSE</span>
              </header>
              <WarLineup
                fighters={fighters}
                choices={choices}
                selected={lineup}
                editingDivision={editingDivision}
                onEdit={setEditingDivision}
                opponent={rival}
                gameplans={gameplans}
                onPlanChange={(id, plan) => {
                  setGameplans((previous) => ({ ...previous, [id]: plan }));
                  retry.current = null;
                  setNotice("");
                }}
                onChange={(value) => {
                  setLineup(value);
                  retry.current = null;
                  setNotice("");
                }}
                disabled={busy}
              />
              {full && (
                <div
                  className="war-defense-save gw-team-save"
                  aria-label="Save Gym Wars team"
                >
                  <div role="status">
                    <strong>
                      {published
                        ? "Team and tactics saved"
                        : refreshTrained
                          ? refreshRules
                            ? "Update team for new rules"
                            : refreshTraits
                              ? "Learned traits need updating"
                              : "Trained skills need updating"
                          : "Unsaved team changes"}
                    </strong>
                    <p>
                      {published
                        ? "Ready for your next ranked card."
                        : "Save all four fighters together. No cards or career weeks spent."}
                    </p>
                  </div>
                  <Action
                    disabled={busy || published}
                    onClick={() => perform("defense")}
                  >
                    {busy
                      ? "Saving team…"
                      : refreshTrained
                        ? refreshRules
                          ? "Update team for new rules"
                          : refreshTraits
                            ? "Update learned traits"
                            : "Update trained fighters"
                        : "Save team & tactics"}
                  </Action>
                  {published && (
                    <Action
                      secondary
                      disabled={busy}
                      onClick={() => setTab("battle")}
                    >
                      Choose a rival
                    </Action>
                  )}
                </div>
              )}
            </section>
            <section
              className="gw-war-panel"
              id="gym-wars-club-panel"
              role="tabpanel"
              aria-labelledby="gym-wars-club-tab"
              hidden={tab !== "club"}
            >
              <GymWarClub
                mine={{ ...data.mine, look: s.shopIdentity }}
                league={league}
                followed={followed}
                rival={rival}
                busy={busy}
                onBattle={(id) => {
                  if (typeof id === "string" && followed?.opponent?.id === id) {
                    openMatchup(followed.opponent);
                    return;
                  }
                  if (typeof id === "string") setSelected(id);
                  setTab("battle");
                }}
                onLeaderboard={() => setTab("leaderboard")}
                onWatch={(card) => {
                  setAnimateResult(false);
                  setResult(card);
                }}
                onFollow={followRival}
              />
            </section>
            <section
              className="gw-war-panel"
              id="gym-wars-leaderboard-panel"
              role="tabpanel"
              aria-labelledby="gym-wars-leaderboard-tab"
              hidden={tab !== "leaderboard"}
            >
              <GymWarLeaderboard
                mine={{ ...data.mine, look: s.shopIdentity }}
                league={league}
                onBattle={() => setTab("battle")}
                onChallenge={openMatchup}
              />
            </section>
          </>
        )
      )}
    </div>
  );
}
