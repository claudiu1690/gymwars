import { importantWeekReport } from "../trainingPlans.mjs";
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { isDefiniteRejection, requestId } from "../careerRequest.mjs";
import { useAuth } from "../auth";
import { careerGuide } from "../careerGuide.mjs";
import { assignmentFor } from "../careerAssignment.mjs";
import CareerFightNight from "../components/CareerFightNight";
import CareerFighter from "../components/CareerFighter";
import { CampPlanner, TrainingWeekReport } from "../components/CareerTraining";
import { RarityBadge } from "../components/FighterRarity";
import { SignatureLine } from "../components/CareerIdentity";
import SignatureBadge from "../components/SignatureBadge";
import { Action, Badge, Face } from "../components/CareerControls";
import { FightBrief } from "../components/CareerPreparation";
import FightBooking from "../components/CareerBooking";
import CareerSchedule from "../components/CareerSchedule";
import CareerScouting from "../components/CareerScouting";
import CareerGym from "../components/CareerGym";
import CareerHome from "../components/CareerHome";
import CareerChrome from "../components/CareerChrome";
import { ORIGINAL_CLUB_LOOK } from "../components/ClubIdentity";
import CareerTurnBar from "../components/CareerTurnBar";
import { TrainingDraftContext } from "../TrainingDraftContext";
import CareerCampaign from "../components/CareerCampaign";
import CareerWars from "../components/CareerWars";
import CareerShop from "../components/CareerShop";
import CareerAchievements from "../components/CareerAchievements";
import CareerProfile from "../components/CareerProfile";
import CareerHelp from "../components/CareerHelp";
import {
  experienceSettings,
  unlockSound,
  playSound,
  acceptedSound,
} from "../gameExperience.mjs";
import "../components/alpha-experience.css";
import { TeamCoverage } from "../components/CareerAvailability";
import { calendarDate } from "../careerCalendar.mjs";
import { starterStyles } from "../starterStyles.mjs";
import "./career.css";
import "./preparation.css";
import "./fighter-cards.css";
import "./fight-night.css";
import "./fighter-camp.css";
import "./review-four.css";
import "./game-shell.css";
import "./game-shell-combat.css";
import "./game-shell-market.css";
import "./clubhouse.css";
import "../components/career-experience.css";
import "./career-responsive-shell.css";
import "./career-review-twenty.css";
import "./career-review-twenty-two.css";
import "../components/fighter-rarity-presence.css";

const money = (n) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
const label = (s) =>
  (s || "").replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const stats = ["striking", "grappling", "submissions", "conditioning"];
const liveBout = (b) => ["ready", "live"].includes(b?.status);
const roster = (s) => s.fighters.filter((f) => !f.retired && !f.released);
function Status({ f, s }) {
  return (
    <Badge
      tone={f.camp?.needsReview ? "orange" : f.fatigue > 35 ? "amber" : "green"}
    >
      {assignmentFor(s, f).label}
    </Badge>
  );
}
function FighterCard({ f, s, onOpen }) {
  return (
    <div className="career-fighter-shell">
      <button
        className="career-fighter"
        data-rarity={f.rarity}
        onClick={() => onOpen(f.id)}
      >
        <div className="career-fighter-art">
          <Face fighter={f} />
          <span className="career-card-record">
            {f.record.wins}W · {f.record.losses}L
          </span>
        </div>
        <div className="career-fighter-info">
          <div className="rarity-nameplate">
            <RarityBadge rarity={f.rarity} />
          </div>
          <h3>{f.name}</h3>
          <p>
            {label(f.weightClass)} · {label(f.style)}
          </p>
          <div className="career-card-state">
            <Status f={f} s={s} />
            <small>Age {Math.floor(f.age)}</small>
          </div>
          <SignatureLine fighter={f} definitions={s.rules.signatures} />
          <span className="career-text-link">View fighter</span>
        </div>
      </button>
      <SignatureBadge fighter={f} definitions={s.rules.signatures} />
    </div>
  );
}
export default function Career() {
  const { gym, logout } = useAuth(),
    navigate = useNavigate(),
    location = useLocation();
  const [, , section, routeTarget, routeTab = "overview"] =
    location.pathname.split("/");
  const gymWorkspace =
    section === "gym" && ["training", "week-report"].includes(routeTarget);
  const page = gymWorkspace ? routeTarget : section || "home";
  const targetId = gymWorkspace ? routeTab : routeTarget;
  const selectedTab = gymWorkspace ? "overview" : routeTab;
  const activePage =
    page === "bout" && selectedTab === "training"
      ? "gym"
      : ["bout", "booking", "fight-night"].includes(page)
        ? "fights"
        : ["training", "week-report"].includes(page)
          ? "gym"
          : page === "fighter"
            ? "roster"
            : page === "rankings"
              ? "fights"
              : page;
  const [saved, setSaved] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null),
    [dialog, setDialog] = useState(null),
    [showWeekResults, setShowWeekResults] = useState(false),
    [acceptedWeekReport, setAcceptedWeekReport] = useState(null),
    [notice, setNotice] = useState("");
  const lock = useRef(false),
    dialogRef = useRef(null);
  const [trainingDraft, setTrainingDraft] = useState(null);
  const [appearanceState, setAppearanceState] = useState(null);
  const [accountProfile, setAccountProfile] = useState(null),
    [experience, setExperience] = useState(experienceSettings);
  useEffect(() => {
    const update = () => setExperience(experienceSettings());
    const press = (event) => {
      if (event.type === "keydown" && !["Enter", " "].includes(event.key))
        return;
      unlockSound();
    };
    const click = (event) => {
      const target = event.target.closest?.("button,a");
      if (target && !target.disabled && target.closest(".career-app"))
        playSound("select");
    };
    window.addEventListener("gw:experience", update);
    document.addEventListener("pointerdown", press);
    document.addEventListener("keydown", press);
    document.addEventListener("click", click);
    return () => {
      window.removeEventListener("gw:experience", update);
      document.removeEventListener("pointerdown", press);
      document.removeEventListener("keydown", press);
      document.removeEventListener("click", click);
    };
  }, []);
  useEffect(() => {
    let active = true;
    api("/account")
      .then((value) => {
        if (active) setAccountProfile(value);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [gym?._id]);
  useEffect(() => {
    if (accountProfile?.analyticsEnabled && saved?.career)
      api("/career/analytics/visit", { method: "POST" }).catch(() => {});
  }, [accountProfile?.analyticsEnabled, location.pathname, !!saved?.career]);
  useEffect(() => {
    let active = true;
    let controller;
    const cancelRead = () => controller?.abort();
    const loadShop = () => {
      cancelRead();
      const current = (controller = new AbortController());
      return api("/career/achievements", { signal: current.signal })
        .then((value) => {
          if (active && controller === current && !current.signal.aborted)
            setAppearanceState(value);
        })
        .catch(() => {});
    };
    loadShop();
    window.addEventListener("focus", loadShop);
    window.addEventListener("pagehide", cancelRead);
    return () => {
      active = false;
      cancelRead();
      window.removeEventListener("focus", loadShop);
      window.removeEventListener("pagehide", cancelRead);
    };
  }, [gym?._id, saved?.revision]);
  const load = useCallback(async () => {
    try {
      const data = await api("/career");
      setSaved(data);
      setError("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
    try {
      setPending(
        JSON.parse(sessionStorage.getItem("gw-career-pending") || "null"),
      );
    } catch {
      /* discard invalid local UI state */
    }
  }, [load]);
  useEffect(() => {
    const refresh = () => {
      if (!lock.current && document.visibilityState === "visible") load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    const now = Date.parse(saved?.allowances?.serverNow || "");
    const dates = [
      saved?.allowances?.careerWeeks?.nextRefillAt,
      saved?.allowances?.leagueCards?.nextRefillAt,
    ]
      .map((date) => Date.parse(date || ""))
      .filter(Number.isFinite);
    const delay =
      Number.isFinite(now) && dates.length
        ? Math.max(1000, Math.min(...dates) - now + 1000)
        : null;
    const timer =
      delay == null ? null : setTimeout(refresh, Math.min(delay, 2147483647));
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
      if (timer) clearTimeout(timer);
    };
  }, [
    load,
    saved?.allowances?.serverNow,
    saved?.allowances?.careerWeeks?.nextRefillAt,
    saved?.allowances?.leagueCards?.nextRefillAt,
  ]);
  useEffect(() => {
    if (dialog && dialogRef.current && !dialogRef.current.open)
      dialogRef.current.showModal();
  }, [dialog]);
  const go = (p, options) =>
    navigate(`/career/${p === "home" ? "" : p}`, options);
  useEffect(() => {
    if (!location.state?.preserveScroll) {
      const anchor =
        location.hash && document.getElementById(location.hash.slice(1));
      if (anchor) anchor.scrollIntoView({ block: "start" });
      else window.scrollTo({ top: 0, left: 0 });
    }
    setShowWeekResults(false);
  }, [location.pathname, location.hash, !!saved?.career]);
  async function send(body) {
    if (lock.current) return false;
    lock.current = true;
    setBusy(true);
    setError("");
    setPending(body);
    sessionStorage.setItem("gw-career-pending", JSON.stringify(body));
    try {
      const data = await api("/career/command", { method: "POST", body });
      acceptedSound(body, data);
      setSaved(data);
      setPending(null);
      sessionStorage.removeItem("gw-career-pending");
      setNotice("Career saved");
      if (!body.endWeek) setShowWeekResults(false);
      if (body.endWeek) {
        setDialog(null);
        const report =
          data.acceptedAction?.lastAdvance ||
          (!data.duplicate ? data.career.lastAdvance : null);
        setAcceptedWeekReport(report);
        setShowWeekResults(importantWeekReport(report));
        setNotice(
          data.duplicate
            ? report
              ? "Previously saved week recovered. No extra week was used."
              : "This action was already completed. Your latest save is loaded."
            : "Week complete · plans played and roster updated. Week report is available in the turn bar.",
        );
      } else if (body.trainingFighterId) {
        setDialog(null);
        const trainingPath = `/career/gym/training/${body.trainingFighterId}`;
        if (location.pathname !== trainingPath)
          navigate(trainingPath, {
            replace: true,
            state: { preserveScroll: true },
          });
      } else if (body.command.type === "advance") {
        const due = data.career.fights.find(liveBout);
        if (body.reviewFighterId) {
          setDialog(null);
          navigate(`/career/gym/week-report/${body.reviewFighterId}`);
        } else if (due) {
          setDialog(null);
          navigate(`/career/fight-night/${due.id}`);
        }
      }
      return data;
    } catch (e) {
      setError(e.message);
      if (isDefiniteRejection(e)) {
        setPending(null);
        sessionStorage.removeItem("gw-career-pending");
        await load();
        setError(e.message);
      }
      return false;
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  const command = (cmd, options = {}) =>
    send({
      id: requestId(),
      revision: options.revision ?? saved.revision,
      command: cmd,
      ...(options.reviewFighterId
        ? { reviewFighterId: options.reviewFighterId }
        : {}),
      ...(options.trainingFighterId
        ? { trainingFighterId: options.trainingFighterId }
        : {}),
      ...(options.endWeek ? { endWeek: true } : {}),
    });
  const close = () => {
    if (!busy) setDialog(null);
  };
  const openFighter = (id) => {
    setDialog(null);
    go(`fighter/${id}`);
  };
  const mutate = async (cmd) => {
    const ok = await command(cmd);
    if (ok) setDialog(null);
    return ok;
  };
  const s = saved?.career
    ? {
        ...saved.career,
        shopIdentity:
          appearanceState?.selected ||
          appearanceState?.looks?.find((look) => look.id === "original") ||
          ORIGINAL_CLUB_LOOK,
        uiPreferences: experience,
      }
    : null;
  const guide = s ? careerGuide(s) : null;
  const openBout = (id, tab = "overview") => {
    setDialog(null);
    if (tab === "training")
      return openTraining(s.fights.find((bout) => bout.id === id).fighterId);
    go(`bout/${id}/${tab}`);
  };
  const openTraining = (id) => {
    setDialog(null);
    go(`gym/training/${id}`);
  };
  const openReviewWeek = (id, untilEvent = false, intent = "saved") => {
    setDialog(null);
    go(`gym/training/${id}`, {
      state: { reviewWeek: true, untilEvent, intent },
    });
  };
  const openBooking = (id) => {
    setDialog(null);
    go(`booking/${id}`);
  };
  const selectBookingFighter = (id) =>
    go(`booking/${id}`, { replace: true, state: { preserveScroll: true } });
  const openFightNight = (id) => {
    setDialog(null);
    go(`fight-night/${id}`);
  };
  const followCoach = (action) => {
    if (action.kind === "advance") endWeek();
    else if (action.kind === "fight") openFightNight(action.id);
    else if (action.kind === "rebuild") command({ type: "rebuild" });
    else if (action.href) navigate(action.href);
    else if (["train", "camp-review"].includes(action.kind))
      openTraining(action.id);
    else openBooking(action.id);
  };
  const team = s ? roster(s) : [];
  const disabled = busy || !!pending;
  const endWeek = () => {
    if (!s || disabled || s.blocking) return;
    if (saved.allowances?.careerWeeks.available === 0) {
      setNotice(
        "Your career week bank is empty. Practice, prepare and recruit from the current board while it refills.",
      );
      return;
    }
    if (trainingDraft && page === "training") {
      setNotice(
        "This camp is still a preview. Assign it, or choose Rest this week in the turn bar.",
      );
      return;
    }
    return command(
      { type: "advance", untilEvent: false, confirmCosts: true },
      { endWeek: true },
    );
  };
  return (
    <TrainingDraftContext.Provider
      value={{ draft: trainingDraft, setDraft: setTrainingDraft }}
    >
      <div
        data-training-draft={Boolean(trainingDraft && page === "training")}
        data-reduced-motion={experience.reduceMotion || undefined}
        className={`career-app game-mode clubhouse gw-responsive-shell ${s && !["fight-night", "shop", "help", "achievements", "profile"].includes(page) ? "has-turn-bar" : ""} ${page === "training" ? "training-page" : ""} ${page === "fight-night" ? "fight-night-mode" : ""} ${["fighter", "training", "week-report"].includes(page) || (page === "bout" && selectedTab === "training") ? "fighter-focus-mode" : ""}`}
      >
        <CareerChrome
          s={s}
          gym={gym}
          page={page}
          activePage={activePage}
          go={go}
          logout={logout}
          disabled={disabled}
          guide={guide}
          onAction={followCoach}
        />
        <main className="career-main">
          <header className="career-top">
            <div>
              <div className="career-eyebrow">
                {s ? calendarDate(s, s.week, true) : "A NEW CHAPTER"}
              </div>
              <h1>
                {{
                  home: "Your gym",
                  roster: "Meet your corner",
                  fights: "Your fights",
                  scouting: "Scouting",
                  bout: "Fight preparation",
                  "fight-night": "Fight night",
                  training: "Training",
                  fighter: "Fighter locker",
                  "week-report": "Your gym week",
                  booking: "Book a fight",
                  gym: "Your gym",
                  rankings: "The regional circuit",
                  campaign: "Career Path",
                  "gym-wars": "Gym Wars",
                  shop: "Supply Shop",
                  achievements: "Achievements",
                  profile: "Club profile",
                  help: "Help & settings",
                }[page] || "Your gym"}
              </h1>
              <p>
                {page === "home"
                  ? s?.boutsCompleted
                    ? "Build your team. Prepare your next win."
                    : "Your first goal: finish one fight. Your coach will guide you."
                  : page === "shop"
                    ? "Extra career weeks and Gym Wars tokens. You choose when to play."
                    : page === "achievements"
                      ? "Complete quests. Earn your club’s colors."
                      : "Every decision becomes part of your gym’s story."}
              </p>
            </div>
            {s && !["shop", "profile"].includes(page) && (
              <div className="career-wallet">
                <span>Gym funds</span>
                <strong>{money(s.cash)}</strong>
                <small>{money(s.weeklyCost)} / week</small>
              </div>
            )}
          </header>
          {error && (
            <div className="career-error" role="alert">
              <span>{error}</span>
              <Action
                secondary
                onClick={pending ? () => send(pending) : load}
                disabled={busy}
              >
                {pending ? "Retry saved action" : "Reload"}
              </Action>
            </div>
          )}
          <div className="career-save-slot">
            {pending && !error && !busy && (
              <p className="career-save" role="status">
                {busy
                  ? "Saving your decision…"
                  : "An interrupted action is waiting."}
                {!busy && (
                  <Action secondary onClick={() => send(pending)}>
                    Recover action
                  </Action>
                )}
              </p>
            )}
          </div>
          {loading ? (
            <section className="career-panel">
              <p role="status">Opening your gym…</p>
            </section>
          ) : !s ? (
            <Setup name={gym?.name || ""} onStarted={setSaved} />
          ) : (
            <>
              {page === "rankings" && (
                <nav
                  className="fight-hub-tabs"
                  aria-label="Regional fight pages"
                >
                  <Link
                    aria-current={page === "fights" ? "page" : undefined}
                    to="/career/fights"
                  >
                    Fight board
                  </Link>
                  <Link
                    aria-current={page === "rankings" ? "page" : undefined}
                    to="/career/rankings"
                  >
                    Regional rankings
                  </Link>
                </nav>
              )}
              {page === "fights" && <CareerSchedule s={s} />}
              {page === "home" && (
                <CareerHome
                  s={s}
                  command={command}
                  guide={guide}
                  disabled={disabled}
                  onAction={followCoach}
                  onFighter={openFighter}
                  onTraining={openTraining}
                  allowances={saved.allowances}
                />
              )}
              {team.length === 0 &&
                ["home", "roster", "scouting"].includes(page) && (
                  <section className="career-panel">
                    <h2>A new generation</h2>
                    <p>
                      Your active roster is empty. A local development
                      scholarship can bring in one free prospect to restart the
                      gym.
                    </p>
                    <Action
                      disabled={disabled}
                      onClick={() => command({ type: "rebuild" })}
                    >
                      Recruit rebuilding prospect
                    </Action>
                  </section>
                )}
              {page === "roster" && (
                <>
                  <TeamCoverage fighters={team} showChallenge={false} />
                  <div className="career-fighter-grid">
                    {team.map((f) => (
                      <FighterCard
                        key={f.id}
                        f={f}
                        s={s}
                        onOpen={openFighter}
                      />
                    ))}
                  </div>
                  <div className="career-scout-strip">
                    <span>
                      <strong>
                        {team.length} /{" "}
                        {s.rules.facilities[s.facilityTier].slots} roster places
                        filled
                      </strong>
                      <small>
                        Find new prospects and review reports in Scouting.
                      </small>
                    </span>
                    <Action secondary onClick={() => go("scouting")}>
                      Recruit a fighter
                    </Action>
                  </div>
                </>
              )}
              {page === "scouting" && (
                <CareerScouting
                  s={s}
                  command={command}
                  disabled={disabled}
                  onFighter={openFighter}
                />
              )}
              {page === "fighter" &&
                (s.fighters.find((f) => f.id === targetId) ? (
                  <CareerFighter
                    key={targetId}
                    s={s}
                    f={s.fighters.find((f) => f.id === targetId)}
                    command={command}
                    disabled={disabled}
                    onTraining={() => openTraining(targetId)}
                    onBook={() => openBooking(targetId)}
                    onFight={openFightNight}
                    onBrief={openBout}
                  />
                ) : (
                  <p>Fighter not found. Choose a fighter from your roster.</p>
                ))}
              {page === "week-report" &&
                (s.fighters.find((f) => f.id === targetId) ? (
                  <TrainingWeekReport
                    s={s}
                    f={s.fighters.find((f) => f.id === targetId)}
                    onTraining={openTraining}
                    onBook={openBooking}
                    onFight={openFightNight}
                    onReviewWeek={openReviewWeek}
                  />
                ) : (
                  <p>Fighter not found. Choose a fighter from your roster.</p>
                ))}
              {page === "training" &&
                (s.fighters.find((f) => f.id === targetId) ? (
                  <CampPlanner
                    key={`${targetId}-${location.key}`}
                    s={s}
                    f={s.fighters.find((f) => f.id === targetId)}
                    revision={saved.revision}
                    command={command}
                    disabled={disabled}
                    onBook={() => openBooking(targetId)}
                    onFight={openFightNight}
                    onTraining={openTraining}
                    onBrief={openBout}
                    reviewWeek={!!location.state?.reviewWeek}
                    reviewUntilEvent={!!location.state?.untilEvent}
                    reviewIntent={location.state?.intent}
                    onWeekResults={() => {
                      setAcceptedWeekReport(s.lastAdvance);
                      setShowWeekResults(true);
                    }}
                  />
                ) : (
                  <p>Fighter not found. Choose a fighter from your roster.</p>
                ))}
              {page === "booking" &&
                (s.fighters.find((f) => f.id === targetId) ? (
                  <FightBooking
                    key={`${targetId}:${location.search}`}
                    preferredCircuit={new URLSearchParams(location.search).get(
                      "circuit",
                    )}
                    s={s}
                    f={s.fighters.find((f) => f.id === targetId)}
                    command={command}
                    disabled={disabled}
                    onHome={() => go("home")}
                    onSelect={selectBookingFighter}
                    onBooked={(id) => openBout(id)}
                  />
                ) : (
                  <p>Fighter not found. Choose a fighter from your roster.</p>
                ))}
              {page === "bout" &&
                (s.fights.find((b) => b.id === targetId) ? (
                  <FightBrief
                    key={targetId}
                    s={s}
                    b={s.fights.find((b) => b.id === targetId)}
                    tab={
                      ["overview", "training", "tactics"].includes(selectedTab)
                        ? selectedTab
                        : "overview"
                    }
                    onTab={(tab) => openBout(targetId, tab)}
                    revision={saved.revision}
                    command={command}
                    disabled={disabled}
                    onFight={openFightNight}
                    onHome={() => go("home")}
                    onTraining={openTraining}
                    onBook={openBooking}
                    onBrief={openBout}
                  />
                ) : (
                  <p>Fight not found. Choose a bout from Fights.</p>
                ))}
              {page === "fight-night" &&
                (s.fights.find(
                  (b) => b.id === targetId && b.status !== "scheduled",
                ) ? (
                  <CareerFightNight
                    key={targetId}
                    s={s}
                    b={s.fights.find((b) => b.id === targetId)}
                    command={command}
                    disabled={disabled}
                    onDone={() => go("home")}
                    onFight={openFightNight}
                    onRankings={() => go("rankings")}
                  />
                ) : (
                  <section className="career-panel">
                    <h2>Fight night is not ready yet</h2>
                    <p>
                      Prepare your fighter and reach the booked fight week
                      first.
                    </p>
                    <Action onClick={() => openBout(targetId)}>
                      Open fight brief
                    </Action>
                  </section>
                ))}
              {page === "gym" && (
                <CareerGym
                  s={s}
                  revision={saved.revision}
                  command={command}
                  disabled={disabled}
                  openFighter={openFighter}
                  onTraining={openTraining}
                  onReviewWeek={openReviewWeek}
                  section={targetId}
                  juniorId={
                    selectedTab === "overview" ? undefined : selectedTab
                  }
                  savedFighterId={location.state?.campSaved}
                />
              )}
              {page === "campaign" && (
                <CareerCampaign
                  s={s}
                  command={command}
                  disabled={disabled}
                  onTraining={openTraining}
                  onFight={openFightNight}
                />
              )}

              {page === "rankings" && (
                <Ladder s={s} openFighter={openFighter} />
              )}
              {page === "help" && (
                <CareerHelp onProfileChange={setAccountProfile} />
              )}
              {page === "shop" && gym?._id && (
                <CareerShop
                  key={gym._id}
                  gymId={gym?._id}
                  clubName={s.name}
                  onChange={load}
                />
              )}
              {page === "achievements" && (
                <CareerAchievements
                  revision={saved.revision}
                  clubName={s.name}
                  onChange={setAppearanceState}
                  onRefresh={load}
                />
              )}
              {page === "profile" && (
                <CareerProfile
                  gymId={targetId || "me"}
                  revision={saved.revision}
                  signatures={s.rules.signatures}
                />
              )}
              {page === "gym-wars" && (
                <CareerWars
                  revision={saved.revision}
                  s={s}
                  allowances={saved.allowances}
                  onRefresh={load}
                />
              )}
              <footer className="career-footer">
                <span role="status">
                  {busy
                    ? "Saving…"
                    : (page === "roster" && notice === "Week complete"
                        ? "Career saved"
                        : notice) || "Progress saved after every decision"}
                </span>
                {[
                  "home",
                  "gym",
                  "training",
                  "week-report",
                  "fights",
                  "bout",
                ].includes(page) && (
                  <span>One shared calendar · pauses at every decision</span>
                )}
                <div className="career-mobile-account">
                  {page === "home" &&
                    import.meta.env.DEV &&
                    import.meta.env.VITE_ENABLE_REALTIME_COMPARISON ===
                      "true" && (
                      <Link to="/realtime">Real-time comparison</Link>
                    )}
                  <button onClick={logout}>Sign out</button>
                </div>
              </footer>
            </>
          )}
        </main>
        {s &&
          ![
            "fight-night",
            "gym-wars",
            "shop",
            "help",
            "achievements",
            "profile",
          ].includes(page) && (
            <CareerTurnBar
              s={s}
              allowance={saved.allowances?.careerWeeks}
              reportOverride={acceptedWeekReport}
              disabled={disabled}
              busy={busy}
              onEndWeek={endWeek}
              onRestWeek={() => {
                if (saved.allowances?.careerWeeks.available === 0) return;
                return command(
                  { type: "advance", untilEvent: false, confirmCosts: true },
                  { endWeek: true },
                );
              }}
              onResolve={() => followCoach(guide)}
              onTraining={openTraining}
              showResults={showWeekResults}
              onDismissResults={() => setShowWeekResults(false)}
            />
          )}
        {dialog && s && (
          <dialog
            ref={dialogRef}
            className="career-dialog"
            onCancel={(e) => {
              e.preventDefault();
              close();
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                const r = e.currentTarget.getBoundingClientRect();
                if (
                  e.clientX < r.left ||
                  e.clientX > r.right ||
                  e.clientY < r.top ||
                  e.clientY > r.bottom
                )
                  close();
              }
            }}
          >
            <button
              className="career-close"
              aria-label="Close panel"
              onClick={close}
              disabled={busy}
            >
              ×
            </button>
            {error && (
              <p className="career-error" role="alert">
                {error}
              </p>
            )}
          </dialog>
        )}
      </div>
    </TrainingDraftContext.Provider>
  );
}

function Setup({ name: initial, onStarted }) {
  const [name, setName] = useState(initial),
    [style, setStyle] = useState("boxing"),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      onStarted(
        await api("/career/start", { method: "POST", body: { name, style } }),
      );
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="career-setup">
      <img
        src="/art/cartoon-gym-starter.webp"
        alt="A small MMA gym ready for your team"
      />
      <form onSubmit={submit}>
        <Badge tone="orange">Your first chapter</Badge>
        <h2>
          Start small.
          <br />
          Build something lasting.
        </h2>
        <p>
          You are the manager: choose opponents, train your fighter, and help
          them recover. Your coach will walk you through the first fight.
        </p>
        <label>
          Gym name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            minLength={3}
            maxLength={30}
            required
            placeholder="Northside MMA"
          />
        </label>
        <fieldset className="starter-styles">
          <legend>Choose your starter’s style</legend>
          <div role="group" aria-label="Starter fighting style">
            {starterStyles.map(({ id, name: styleName, description }) => (
              <button
                type="button"
                key={id}
                aria-pressed={style === id}
                onClick={() => setStyle(id)}
              >
                <strong>{styleName}</strong>
                <small>{description}</small>
              </button>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="career-error">
            {error}
          </p>
        )}
        <button className="career-action" disabled={busy}>
          {busy ? "Opening gym…" : "Begin career"}
        </button>
        <small>Your first bout opens the road to a championship gym.</small>
      </form>
    </div>
  );
}
function Ladder({ s, openFighter }) {
  const [wc, setWc] = useState(
    s.fighters.find((f) => !f.retired && !f.released)?.weightClass ||
      "lightweight",
  );
  return (
    <section className="career-panel">
      <div className="career-section-head">
        <div>
          <h2>Regional standings</h2>
          <p>
            Earn 80 ranking points to challenge the champion. Wins +25 · losses
            −8.
          </p>
        </div>
        <div
          className="rank-weight-tabs"
          role="group"
          aria-label="Weight class"
        >
          {["featherweight", "lightweight", "middleweight", "heavyweight"].map(
            (w) => (
              <button
                type="button"
                key={w}
                aria-pressed={wc === w}
                onClick={() => setWc(w)}
              >
                {label(w)}
              </button>
            ),
          )}
        </div>
      </div>
      <div className="career-ladder">
        {s.ladder
          .filter((f) => f.weightClass === wc)
          .map((f, i) => {
            const own = s.fighters.some((p) => p.id === f.id);
            return (
              <div
                className={`career-ladder-row ${own ? "own" : ""}`}
                key={f.id}
              >
                <strong>{f.isChampion ? "♜" : i + 1}</strong>
                <Face fighter={f} />
                <div>
                  <strong>{f.name}</strong>
                  <small>
                    {own ? "Your gym" : `${f.gymName} · AI rival`} ·{" "}
                    {label(f.style)}
                  </small>
                </div>
                <span>
                  {f.record.wins}W – {f.record.losses}L
                </span>
                <strong>{f.rankingPoints} pts</strong>
                {own && (
                  <button
                    className="career-text-link"
                    onClick={() => openFighter(f.id)}
                  >
                    Manage
                  </button>
                )}
              </div>
            );
          })}
      </div>
      <p>
        Rivals compete every other career week. This ladder belongs to your
        personal career.
      </p>
    </section>
  );
}
