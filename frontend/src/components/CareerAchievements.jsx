import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { api } from "../api";
import { GameTabs } from "./GameUI";
import { ClubMark, ClubFlag } from "./ClubIdentity";
import "./achievements.css";
const groups = [
  ["all", "All achievements"],
  ["career", "Career quests"],
  ["training", "Training"],
  ["club", "Your gym"],
  ["gym-wars", "Gym Wars"],
  ["looks", "Earned looks"],
];
export default function CareerAchievements({
  revision,
  clubName,
  onChange,
  onRefresh,
}) {
  const [data, setData] = useState(null),
    [tab, setTab] = useState("all"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [working, setWorking] = useState(false);
  const lock = useRef(false),
    sequence = useRef(0);
  const { hash } = useLocation();
  const followed = useRef("");
  useEffect(() => {
    if (data && hash && hash !== followed.current) {
      const node = document.getElementById(hash.slice(1));
      if (node) {
        node.scrollIntoView({ block: "center", behavior: "auto" });
        followed.current = hash;
      }
    }
  }, [data, hash]);
  const load = useCallback(async () => {
    const request = ++sequence.current;
    try {
      const value = await api("/career/achievements");
      if (request === sequence.current) {
        setData(value);
        onChange(value);
        setError("");
      }
    } catch (e) {
      if (request === sequence.current) setError(e.message);
    }
  }, [onChange]);
  useEffect(() => {
    load();
    return () => {
      sequence.current++;
    };
  }, [revision, load]);
  async function equip(lookId) {
    if (lock.current || !data) return;
    lock.current = true;
    setWorking(true);
    setError("");
    try {
      const value = await api("/career/achievements/equip", {
        method: "POST",
        body: { lookId, revision: data.revision },
      });
      setData(value);
      onChange(value);
      setNotice((value.selected?.name || "Original corner") + " equipped.");
      await onRefresh();
    } catch (e) {
      setError(e.message);
      await load();
      setError(e.message);
    } finally {
      lock.current = false;
      setWorking(false);
    }
  }
  const selected = data?.selected?.id || "original";
  return (
    <div className="career-achievements">
      <section className="achievement-hero">
        <div>
          <span className="career-eyebrow">YOUR CORNER’S TROPHY ROOM</span>
          <h2>
            Earn it.
            <br />
            Wear it.
          </h2>
          <p>
            Career quests, training and gym battles unlock your club’s colors.
            Every look comes from play.
          </p>
          <strong>
            {data?.earnedCount || 0} / {data?.total || 26} achievements earned
          </strong>
        </div>
        <ClubMark
          look={data?.selected || data?.looks.find((l) => l.id === "original")}
        />
      </section>
      <GameTabs
        prefix="achievements"
        label="Achievement categories"
        tabs={groups.map(([id, label]) => ({ id, label }))}
        value={tab}
        onChange={setTab}
      />
      {error && (
        <div role="alert" className="career-error">
          {error}
          <button type="button" onClick={load}>
            Refresh achievements
          </button>
        </div>
      )}
      {notice && (
        <p className="shop-notice" role="status">
          {notice}
        </p>
      )}
      {!data ? (
        <p role="status">Opening your trophy room…</p>
      ) : (
        <section
          className="achievement-grid"
          role="tabpanel"
          id={"achievements-" + tab + "-panel"}
          aria-labelledby={"achievements-" + tab + "-tab"}
        >
          {tab === "looks"
            ? data.looks
                .filter((l) => l.owned)
                .map((l) => (
                  <article
                    key={l.id}
                    className="achievement-card"
                    data-earned="true"
                  >
                    <ClubFlag look={l} name={clubName} />
                    <h3>{l.name}</h3>
                    <p>
                      {l.id === "original"
                        ? "Your founding colors."
                        : l.legacy
                          ? "Previously unlocked club look. Kept with your gym."
                          : "Earned by completing its achievement."}
                    </p>
                    <button
                      type="button"
                      className="career-action"
                      disabled={working || selected === l.id}
                      onClick={() => equip(l.id)}
                    >
                      {selected === l.id ? "Equipped" : "Equip look"}
                    </button>
                  </article>
                ))
            : data.achievements
                .filter((a) => tab === "all" || a.group === tab)
                .map((a) => (
                  <article
                    key={a.id}
                    id={"achievement-" + a.id}
                    className="achievement-card"
                    data-earned={a.earned}
                  >
                    <div
                      className="achievement-reward-art"
                      style={{
                        "--reward-color": a.reward.color,
                        "--reward-dark": a.reward.dark,
                      }}
                    >
                      <span>{a.earned ? "EARNED" : "WORK TOWARD IT"}</span>
                      <ClubMark look={a.reward} />
                      <b>{a.reward.name}</b>
                    </div>
                    <div className="achievement-copy">
                      <small>
                        {a.questId || a.challengeId
                          ? "CAREER QUEST REWARD"
                          : a.group.replace("-", " ").toUpperCase()}
                      </small>
                      <h3>{a.name}</h3>
                      <p>{a.description}</p>
                      <div className="achievement-progress">
                        <progress
                          max={a.target}
                          value={a.earned ? a.target : a.current}
                          aria-label={a.name + " progress"}
                        />
                        <strong>
                          {a.earned ? "Complete" : a.current + " / " + a.target}
                        </strong>
                      </div>
                      <span className="achievement-reward-label">
                        Reward: crest, banner & wall flag
                      </span>
                      {a.earned ? (
                        <button
                          type="button"
                          className="career-action"
                          disabled={working || selected === a.lookId}
                          onClick={() => equip(a.lookId)}
                        >
                          {selected === a.lookId ? "Equipped" : "Equip reward"}
                        </button>
                      ) : (
                        <Link className="career-action secondary" to={a.href}>
                          {a.questId || a.challengeId
                            ? "Follow career quest"
                            : "Work toward this"}
                        </Link>
                      )}
                    </div>
                  </article>
                ))}
        </section>
      )}
    </div>
  );
}
