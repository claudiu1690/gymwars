import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { TeamCoverage } from "./CareerAvailability";
import { Action, Face } from "./CareerControls";
import { RarityBadge, RarityBenefits, RarityGuide } from "./FighterRarity";
import { rarityDiscovery } from "../fighterRarity.mjs";
import { reducedMotion } from "../gameExperience.mjs";
import { SignatureLine } from "./CareerIdentity";
import SignatureBadge from "./SignatureBadge";
import { divisionLabel, warDivisions } from "../careerCompetition.mjs";
import "./career-scouting.css";
import "./career-design.css";

const skills = ["striking", "grappling", "submissions", "conditioning"];
const label = (value = "") =>
  value.replaceAll("-", " ").replace(/^./, (c) => c.toUpperCase());
const money = (value) => `$${value.toLocaleString("en-US")}`;
const activeTeam = (s) => s.fighters.filter((f) => !f.retired && !f.released);

function SkillReport({ fighter, teammate }) {
  return (
    <div className="scout-skill-report">
      {skills.map((skill) => {
        const [low, high] = fighter.statRanges[skill];
        const exact = low === high;
        const current = teammate?.stats[skill];
        const comparison =
          current == null
            ? null
            : low > current
              ? "Above your fighter"
              : high < current
                ? "Below your fighter"
                : exact
                  ? "Matches your fighter"
                  : "Could be above or below";
        return (
          <div className="scout-skill" key={skill}>
            <div>
              <strong>{label(skill)}</strong>
              <span>
                {exact ? low : `${low}–${high}`}{" "}
                <small>{exact ? "confirmed" : "estimated"}</small>
              </span>
            </div>
            <div className="scout-skill-track" aria-hidden="true">
              <span
                style={{
                  left: `${low}%`,
                  width: `${Math.max(1, high - low)}%`,
                }}
              />
              {current != null && <i style={{ left: `${current}%` }} />}
            </div>
            {teammate && (
              <small>
                {teammate.name}: {current} · {comparison}
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function CareerScouting({ s, command, disabled, onFighter }) {
  const location = useLocation();
  const requestedDivision = new URLSearchParams(location.search).get(
    "division",
  );
  const division = warDivisions.includes(requestedDivision)
    ? requestedDivision
    : null;
  const board = s.board.filter(
    (report) => !division || report.fighter.weightClass === division,
  );
  const [selectedId, setSelectedId] = useState(
    () => board.find((report) => !report.signed)?.id || board[0]?.id,
  );
  const [compareId, setCompareId] = useState("");
  const [contract, setContract] = useState(null);
  const [pending, setPending] = useState(null);
  const [announcement, setAnnouncement] = useState("");
  const [discovery, setDiscovery] = useState(null);
  const [revealing, setRevealing] = useState(false);
  const actionLock = useRef(false);
  const contractButton = useRef(null);
  const dossierRef = useRef(null);
  const selected =
    board.find((r) => r.id === selectedId) ||
    board.find((r) => !r.signed) ||
    board[0];
  const team = activeTeam(s);
  const comparisons = team.filter(
    (f) =>
      f.id !== selected?.fighter.id &&
      f.weightClass === selected?.fighter.weightClass,
  );
  const teammate =
    comparisons.find((f) => f.id === compareId) || comparisons[0];
  const capacity = s.rules.facilities[s.facilityTier].slots;
  const full = team.length >= capacity;
  const remaining = Math.max(0, s.rules.scoutsPerWeek - s.scoutsUsed);
  const locked = disabled || !!pending;
  const exactScout = s.staffOptions?.scout?.current?.reportWidth === 0;
  const exactReport =
    selected?.investigated &&
    skills.every((skill) => {
      const [low, high] = selected.fighter.statRanges[skill];
      return low === high;
    });
  const isSelectedContract = contract === selected?.id;
  const selectedFighter =
    s.fighters.find((fighter) => fighter.id === selected?.fighter.id) ||
    selected?.fighter;

  useEffect(() => {
    setSelectedId(board.find((report) => !report.signed)?.id || board[0]?.id);
    setContract(null);
    setCompareId("");
    setAnnouncement("");
    setDiscovery(null);
    setRevealing(false);
  }, [division]);
  useEffect(() => {
    if (!s.board.some((r) => r.id === selectedId)) {
      setSelectedId(s.board[0]?.id);
      setContract(null);
      setAnnouncement("");
      setDiscovery(null);
      setRevealing(false);
    }
  }, [s.board, selectedId]);
  useEffect(() => {
    if (contract) contractButton.current?.focus();
  }, [contract]);
  useEffect(() => {
    if (!revealing) return;
    const timer = setTimeout(() => setRevealing(false), 950);
    return () => clearTimeout(timer);
  }, [revealing, discovery]);

  async function act(cmd) {
    if (locked || actionLock.current) return;
    actionLock.current = true;
    setPending(cmd.type);
    setAnnouncement("");
    const anchorTop = dossierRef.current?.getBoundingClientRect().top;
    try {
      const result = await command(cmd);
      if (result) {
        setContract(null);
        const found =
          cmd.type === "investigate"
            ? rarityDiscovery(result, cmd.reportId)
            : null;
        if (found) {
          setDiscovery(found);
          setRevealing(!reducedMotion());
        }
        setAnnouncement(
          cmd.type === "investigate"
            ? `${found ? `${found.label} discovered. ` : "Scouting report ready. "}Compare their skills, then decide whether to sign.`
            : `${selected.fighter.name} has joined your gym.${["elite", "legend"].includes(selected.fighter.rarity) ? " Their signature is ready to choose." : " Complete a career bout and a camp to earn their signature choice."} Open their fighter card to choose the next step.`,
        );
        requestAnimationFrame(() => {
          if (cmd.type === "investigate") {
            const summary = dossierRef.current?.querySelector(
              ".fighter-rarity-benefits",
            );
            const box = summary?.getBoundingClientRect();
            if (box && (box.top < 90 || box.bottom > window.innerHeight - 100))
              summary.scrollIntoView({ block: "center", behavior: "instant" });
            return;
          }
          if (anchorTop != null && dossierRef.current)
            window.scrollBy({
              top: dossierRef.current.getBoundingClientRect().top - anchorTop,
              behavior: "instant",
            });
        });
      }
    } finally {
      actionLock.current = false;
      setPending(null);
    }
  }

  function choose(id) {
    if (actionLock.current) return;
    setSelectedId(id);
    setContract(null);
    setAnnouncement("");
    setDiscovery(null);
    setRevealing(false);
  }

  return (
    <section className="scouting-hub" aria-labelledby="scouting-title">
      <header className="scout-hero">
        <div>
          <span className="scout-kicker">Build your fight team</span>
          <h2 id="scouting-title">Find your next fighter.</h2>
          <p>Pick a face. Get the report. Make the call.</p>
        </div>
        <div className="scout-resources" aria-label="Recruitment resources">
          <div data-empty={remaining === 0}>
            <strong>
              {remaining}
              <small>/{s.rules.scoutsPerWeek}</small>
            </strong>
            <span>Free investigations</span>
          </div>
          <div>
            <strong>{money(s.cash)}</strong>
            <span>Signing budget</span>
          </div>
          <div data-empty={full}>
            <strong>
              {team.length}
              <small>/{capacity}</small>
            </strong>
            <span>Roster slots filled</span>
          </div>
        </div>
      </header>
      <TeamCoverage fighters={team} compact />
      {(s.scouting?.investigations || 0) < 12 && (
        <aside className="design-recruit-value">
          <strong>
            Your talent book · {s.scouting?.investigations || 0}/12 reports
          </strong>
          <p>
            Investigate twelve fighters to earn the Talent Book crest. No
            signing required. Compare development potential and fighting styles
            when choosing a reserve.
          </p>
          <Link to="/career/achievements#achievement-talent-book">
            View earned looks
          </Link>
        </aside>
      )}
      {full && (
        <div className="scout-capacity-actions">
          <strong>Your roster is full.</strong>
          <p>Reports stay available. Free a place or expand before signing.</p>
          <Link className="career-action secondary" to="/career/roster">
            Manage roster
          </Link>
          <Link className="career-action secondary" to="/career/gym/facilities">
            Expand gym
          </Link>
        </div>
      )}

      {s.fighters.length === 1 && !full && (
        <aside className="design-recruit-value">
          <strong>Your first teammate signs for free.</strong>
          <p>
            Investigate any prospect, then choose who joins. A second fighter
            can earn career purses while your starter trains or recovers.
            Fighters add no weekly wage.
          </p>
        </aside>
      )}

      <div className="scout-board-heading">
        <h3>
          {division
            ? `${divisionLabel(division)} prospects`
            : "This week’s prospects"}
        </h3>
        <span>New faces arrive only when you advance the calendar.</span>
      </div>
      <nav
        className="scout-weight-filters"
        aria-label="Filter prospects by weight class"
      >
        <Link
          to="/career/scouting"
          aria-current={!division ? "page" : undefined}
        >
          All weight classes
        </Link>
        {warDivisions.map((weightClass) => (
          <Link
            key={weightClass}
            to={`/career/scouting?division=${weightClass}`}
            aria-current={division === weightClass ? "page" : undefined}
          >
            {divisionLabel(weightClass)}
            <span>
              {
                s.board.filter(
                  (report) =>
                    !report.signed &&
                    report.fighter.weightClass === weightClass,
                ).length
              }{" "}
              available
            </span>
          </Link>
        ))}
      </nav>
      {board.length === 0 && (
        <div className="scout-empty" role="status">
          <strong>
            No {divisionLabel(division).toLowerCase()} prospects on this week’s
            board.
          </strong>
          <p>
            Check another weight class, or End week when your team is ready for
            new faces. Changing this filter never uses an investigation or moves
            time.
          </p>
        </div>
      )}
      <div
        className="scout-prospect-row"
        role="group"
        aria-label="Choose a prospect"
      >
        {board.map((report, index) => (
          <div className="scout-prospect-shell" key={report.id}>
            <button
              type="button"
              className="scout-prospect-card"
              data-rarity={
                report.investigated ? report.fighter.rarity : "unknown"
              }
              aria-pressed={selected?.id === report.id}
              aria-label={`View ${report.fighter.name}${report.signed ? ", signed" : report.investigated ? ", report ready" : ", unscouted"}`}
              disabled={!!pending}
              onClick={() => choose(report.id)}
            >
              <div className="scout-prospect-art">
                <span className="scout-card-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <Face fighter={report.fighter} />
              </div>
              <div className="scout-card-copy">
                <RarityBadge
                  rarity={
                    report.investigated ? report.fighter.rarity : undefined
                  }
                />
                <strong>{report.fighter.name}</strong>
                <span>
                  {label(report.fighter.style)} · Age {report.fighter.age}
                </span>
                <small>{label(report.fighter.weightClass)}</small>
                <b>
                  {report.signed
                    ? "Joined your gym"
                    : report.investigated
                      ? "Read report"
                      : "Scout this fighter"}
                </b>
              </div>
            </button>
            <SignatureBadge
              fighter={
                s.fighters.find(
                  (fighter) => fighter.id === report.fighter.id,
                ) || report.fighter
              }
              definitions={s.rules.signatures}
            />
          </div>
        ))}
      </div>

      <p className="scout-announcement" role="status" aria-live="polite">
        {announcement}
      </p>
      {selected && (
        <article
          className="scout-dossier"
          ref={dossierRef}
          data-rarity={
            selected.investigated ? selected.fighter.rarity : "unknown"
          }
          aria-label={`${selected.fighter.name} scouting report`}
        >
          <SignatureBadge
            fighter={
              s.fighters.find(
                (fighter) => fighter.id === selected.fighter.id,
              ) || selected.fighter
            }
            definitions={s.rules.signatures}
          />
          <header>
            <div>
              <span className="scout-kicker">
                {selected.signed
                  ? "Welcome to the team"
                  : selected.investigated
                    ? "Your scout’s report"
                    : "Your next investigation"}
              </span>
              <h3>{selected.fighter.name}</h3>
              {selected.signed && (
                <SignatureLine
                  fighter={
                    s.fighters.find(
                      (fighter) => fighter.id === selected.fighter.id,
                    ) || selected.fighter
                  }
                  definitions={s.rules.signatures}
                />
              )}
              <p>
                {label(selected.fighter.style)} ·{" "}
                {label(selected.fighter.weightClass)} · Age{" "}
                {selected.fighter.age}
              </p>
            </div>
            <RarityBadge
              rarity={
                selected.investigated ? selected.fighter.rarity : undefined
              }
            />
          </header>
          <ol className="scout-steps" aria-label="Recruitment steps">
            <li data-active={!selected.investigated}>
              <span>1</span>Investigate
            </li>
            <li data-active={selected.investigated && !selected.signed}>
              <span>2</span>Read the report
            </li>
            <li data-active={selected.signed}>
              <span>3</span>
              {selected.signed ? "Signed" : "Choose to sign"}
            </li>
          </ol>

          {!selected.investigated ? (
            <div className="scout-unseen">
              <div className="scout-unseen-art">
                <Face fighter={selected.fighter} />
                <span aria-hidden="true">?</span>
              </div>
              <div>
                <h4>Looks aren’t a scouting report.</h4>
                <p>
                  Spend one free investigation to reveal their rarity,{" "}
                  {exactScout ? "exact" : "estimated"} skills and signing fee.{" "}
                  {exactScout
                    ? "Your global network confirms their current skills before signing."
                    : "Their exact ability stays unknown until they join your gym."}
                </p>
                <div className="scout-hidden-skills">
                  {skills.map((skill) => (
                    <span key={skill}>
                      {label(skill)} <strong>?</strong>
                    </span>
                  ))}
                </div>
                <Action
                  disabled={locked || remaining === 0}
                  onClick={() =>
                    act({ type: "investigate", reportId: selected.id })
                  }
                >
                  {pending === "investigate"
                    ? "Scout is checking…"
                    : `Investigate ${selected.fighter.name} · Free`}
                </Action>
                <small>
                  {remaining
                    ? `Uses 1 of your ${remaining} remaining investigations. No time passes.`
                    : "All investigations used. Advance the calendar to meet new prospects."}
                </small>
                {full && (
                  <p className="scout-blocker">
                    Your roster is full. You can still investigate, but you’ll
                    need an open slot to sign.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              <RarityBenefits
                fighter={selectedFighter}
                signatures={s.rules.signatures}
                discovery={discovery?.reportId === selected.id}
                animate={revealing && discovery?.reportId === selected.id}
                onSkip={() => setRevealing(false)}
              />
              <div className="scout-report-body">
                <div className="scout-comparison">
                  <div className="scout-comparison-heading">
                    <h4>How would they fit?</h4>
                    <span>Skill scale 0–100</span>
                  </div>
                  {comparisons.length > 0 ? (
                    <>
                      <div
                        className="scout-compare-team"
                        role="group"
                        aria-label="Compare with your fighter"
                      >
                        {comparisons.map((f) => (
                          <button
                            type="button"
                            key={f.id}
                            aria-pressed={teammate?.id === f.id}
                            onClick={() => setCompareId(f.id)}
                          >
                            <Face fighter={f} compact />
                            <span>{f.name}</span>
                          </button>
                        ))}
                      </div>
                      <div
                        className="scout-range-key"
                        aria-label="Comparison guide"
                      >
                        <span>
                          <i
                            className="scout-range-swatch"
                            aria-hidden="true"
                          />
                          {exactReport
                            ? "Prospect’s confirmed skill"
                            : "Prospect’s estimated range"}
                        </span>
                        <span>
                          <i
                            className="scout-teammate-swatch"
                            aria-hidden="true"
                          />
                          {teammate.name}’s exact skill
                        </span>
                      </div>
                    </>
                  ) : (
                    <p>
                      No{" "}
                      {divisionLabel(
                        selected.fighter.weightClass,
                      ).toLowerCase()}{" "}
                      teammate to compare yet.{" "}
                      {exactReport
                        ? "Your global network confirms their current skills."
                        : "Estimated skill ranges. Sign to see exact numbers."}
                    </p>
                  )}
                  <SkillReport fighter={selected.fighter} teammate={teammate} />
                  {selected.fighter.scoutReport && (
                    <section className="scout-development-report">
                      <h4>Development report</h4>
                      {Object.entries(selected.fighter.scoutReport.growth).map(
                        ([skill, outlook]) => (
                          <p key={skill}>
                            <strong>{label(skill)}</strong> · {outlook}
                          </p>
                        ),
                      )}
                      {selected.fighter.scoutReport.verifiedTraits.map(
                        (trait) => (
                          <p key={trait}>
                            <strong>{label(trait)}</strong> ·{" "}
                            {s.rules.traits[trait]}
                          </p>
                        ),
                      )}
                      {selected.fighter.scoutReport.completeTraitProfile &&
                        !selected.fighter.scoutReport.verifiedTraits.length && (
                          <p>No special traits. Full profile verified.</p>
                        )}
                      <small>{selected.fighter.scoutReport.note}</small>
                    </section>
                  )}
                  <p className="scout-estimate-note">
                    {exactReport ? (
                      "Your global network has confirmed these current skills. The development report describes their room to grow."
                    ) : (
                      <>
                        {s.staff.scout
                          ? "Your hired scout narrows these ranges."
                          : "A hired scout can narrow these ranges."}{" "}
                        An overlapping range is uncertain, not a guaranteed
                        improvement.
                      </>
                    )}
                  </p>
                </div>
                <div className="scout-decision">
                  <div className="design-recruit-fit">
                    <strong>
                      {team.some(
                        (f) => f.weightClass === selected.fighter.weightClass,
                      )
                        ? "Adds depth to your division"
                        : "Opens another division"}
                    </strong>
                    <p>
                      {team.some(
                        (f) => f.weightClass === selected.fighter.weightClass,
                      )
                        ? "Another option when a teammate is training, resting or unavailable."
                        : `Your first ${label(selected.fighter.weightClass).toLowerCase()} fighter gives your gym more matchups.`}
                    </p>
                  </div>
                  <div className="scout-report-note">
                    <h4>What you know</h4>
                    <strong>
                      {selected.fighter.discoveredTraits?.length
                        ? "Known traits"
                        : "Traits: undiscovered"}
                    </strong>
                    {selected.fighter.discoveredTraits?.length ? (
                      selected.fighter.discoveredTraits.map((trait) => (
                        <p key={trait}>
                          {label(trait)} — {s.rules.traits[trait]}
                        </p>
                      ))
                    ) : (
                      <p>
                        Fights can reveal hidden traits; mentoring can teach
                        known traits. An empty report does not mean this fighter
                        has none.
                      </p>
                    )}
                  </div>
                  {selected.signed ? (
                    <div className="scout-signed">
                      <strong>{selected.fighter.name} is on your team</strong>
                      <p>
                        Exact skills are now available on their fighter card.
                      </p>
                      {onFighter && (
                        <Action onClick={() => onFighter(selected.fighter.id)}>
                          Meet your fighter
                        </Action>
                      )}
                    </div>
                  ) : (
                    <div className="scout-signing">
                      <span>One-time signing fee</span>
                      <strong>
                        {selected.fee === 0
                          ? "Free signing"
                          : money(selected.fee)}
                      </strong>
                      {selected.fee === 0 && (
                        <p>
                          Your first recruit joins for free. No recurring
                          fighter wage.
                        </p>
                      )}
                      {full ? (
                        <p className="scout-blocker">
                          Roster full: {team.length}/{capacity}. Free a slot or
                          expand your gym first.
                        </p>
                      ) : s.cash < selected.fee ? (
                        <p className="scout-blocker">
                          You need {money(selected.fee - s.cash)} more to sign
                          this fighter.
                        </p>
                      ) : (
                        <p>
                          {money(s.cash - selected.fee)} left after signing ·{" "}
                          {team.length + 1}/{capacity} slots filled.
                        </p>
                      )}
                      {isSelectedContract ? (
                        <div
                          className="scout-contract"
                          aria-label="Confirm fighter signing"
                        >
                          <h4>Give them a place in your gym?</h4>
                          <p>
                            Sign {selected.fighter.name} for{" "}
                            {money(selected.fee)}. Signing reveals their exact
                            skills and uses one roster slot. No time passes.
                          </p>
                          <button
                            type="button"
                            className="career-action"
                            ref={contractButton}
                            disabled={locked || full || s.cash < selected.fee}
                            onClick={() =>
                              act({ type: "sign", reportId: selected.id })
                            }
                          >
                            {pending === "sign"
                              ? "Signing…"
                              : `Confirm signing · ${money(selected.fee)}`}
                          </button>
                          <button
                            type="button"
                            className="scout-text-button"
                            disabled={locked}
                            onClick={() => setContract(null)}
                          >
                            Keep looking
                          </button>
                        </div>
                      ) : (
                        <Action
                          disabled={locked || full || s.cash < selected.fee}
                          onClick={() => setContract(selected.id)}
                        >
                          Offer a place · {money(selected.fee)}
                        </Action>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </article>
      )}

      <section
        className="scout-rulebook"
        aria-labelledby="scout-rulebook-title"
      >
        <h3 id="scout-rulebook-title">Scouting guarantees, rarity & odds</h3>
        <p>
          Every investigation counts. Progress carries across weeks; a find at a
          tier or above resets that guarantee. Signing and refreshing the page
          do not count.
        </p>
        <div className="scout-guarantees" aria-label="Scouting guarantees">
          {(s.scouting?.guarantees || []).map((g) => (
            <div key={g.tier} data-rarity={g.tier}>
              <RarityBadge rarity={g.tier} />
              <strong>
                {g.remaining === 1
                  ? "Next investigation guaranteed"
                  : `Within ${g.remaining} investigations`}
              </strong>
              <small>
                {g.tier === "legend" ? "Legend find" : "This tier or higher"} ·{" "}
                {g.misses}/{g.threshold} misses
              </small>
            </div>
          ))}
        </div>
        <RarityGuide />
        <p>
          <strong>Base odds:</strong>{" "}
          {(s.scouting?.odds || [])
            .map(
              ({ tier, odds }) =>
                `${label(tier)} ${(odds * 100).toFixed(1).replace(/\.0$/, "")}%`,
            )
            .join(" · ")}
          . Guarantees override these odds when due.
        </p>
      </section>
    </section>
  );
}
