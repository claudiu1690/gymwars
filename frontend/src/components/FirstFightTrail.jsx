import { Link } from "react-router-dom";
export default function FirstFightTrail({ s }) {
  if (s.boutsCompleted > 0) return null;
  const bout = s.fights.find((b) => b.status !== "resolved"),
    fighter = s.fighters.find(
      (f) => f.id === (bout?.fighterId || s.fighters[0]?.id),
    );
  const ready = ["ready", "live"].includes(bout?.status),
    prepared = !!(fighter?.camp || fighter?.lastCamp),
    advanced = s.week > 0;
  const items = [
    {
      name: "Book",
      detail: "Choose an opponent and date.",
      done: !!bout,
      href: fighter ? `/career/booking/${fighter.id}` : "/career/roster",
    },
    {
      name: "Prepare",
      detail: "Pick training, rest and tactics.",
      done: prepared,
      href: bout
        ? `/career/bout/${bout.id}`
        : fighter
          ? `/career/gym/training/${fighter.id}`
          : "/career/roster",
    },
    {
      name: "End week",
      detail: "You move time. One click, one week.",
      done: advanced,
      href: "/career",
    },
    {
      name: "Fight",
      detail: "Call the rounds and see the result.",
      done: false,
      href: ready
        ? `/career/fight-night/${bout.id}`
        : bout
          ? `/career/bout/${bout.id}`
          : "/career/fights",
    },
  ];
  const current = !bout
    ? 0
    : ready
      ? 3
      : !prepared && bout.eventWeek - s.week >= 2
        ? 1
        : 2;
  return (
    <section className="first-fight-trail" aria-label="Your first fight">
      <header>
        <div>
          <span className="career-eyebrow">YOUR FIRST CHAPTER</span>
          <h2>One fighter. One fight.</h2>
        </div>
        <Link to="/career/help">How to play</Link>
      </header>
      <ol>
        {items.map((item, i) => (
          <li
            key={item.name}
            data-state={
              i === current ? "current" : item.done ? "done" : "later"
            }
          >
            <Link
              to={item.href}
              aria-current={i === current ? "step" : undefined}
            >
              <b>{i + 1}</b>
              <strong>{item.name}</strong>
              <span>{item.detail}</span>
            </Link>
          </li>
        ))}
      </ol>
      <p>
        Training and tactics save a plan. Only End week moves the calendar. You
        can choose your own approach.
      </p>
    </section>
  );
}
