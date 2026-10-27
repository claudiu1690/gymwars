import { calendarDate } from "./careerCalendar.mjs";
import {
  campTitle,
  fighterBout,
  fighterPair,
  readiness,
} from "./trainingPlans.mjs";

// Assignment answers what End week will do. Readiness is a separate condition,
// never an implicit training assignment or an eligibility promise.
export function assignmentFor(s, f) {
  const bout = fighterBout(s, f);
  const pair = fighterPair(s, f);
  const trainingHref = `/career/gym/training/${f.id}`;
  if (f.retired || f.released)
    return {
      kind: "inactive",
      label: f.retired ? "Retired" : "Released",
      detail: "Career history preserved.",
      href: `/career/fighter/${f.id}`,
      action: "View history",
    };
  if (["ready", "live"].includes(bout?.status))
    return {
      kind: "fight",
      label: "Fight ready",
      detail:
        bout.status === "live"
          ? "Finish this bout before the next week."
          : "Enter the corner before the next week.",
      href: `/career/fight-night/${bout.id}`,
      action: bout.status === "live" ? "Resume fight" : "Enter fight",
      bout,
    };
  if (f.camp?.needsReview)
    return {
      kind: "decision",
      label: "Check-in due",
      detail: `${f.camp.completed}/${f.camp.weeks} weeks complete · Continue or finish early.`,
      href: trainingHref,
      action: "Review camp",
      bout,
    };
  if (
    f.camp?.scheduleVersion >= 2 &&
    f.camp.weeks > 1 &&
    f.camp.completed === f.camp.weeks - 1
  )
    return {
      kind: "training",
      label: "Camp recovery finish",
      detail: `End week to recover and earn your camp preparation. Camp ends ${calendarDate(s, f.camp.endWeek)}.`,
      href: trainingHref,
      action: "Open camp",
      bout,
    };
  if (f.camp)
    return {
      kind: "training",
      label:
        f.camp.completed === 0
          ? "Camp assigned"
          : `Camp ${f.camp.completed}/${f.camp.weeks} weeks`,
      detail: `${campTitle(s, f.camp)} · Ends ${calendarDate(s, f.camp.endWeek)}. End week to train.${f.camp.scheduleVersion >= 2 && f.camp.weeks > 1 ? " Final week: recovery." : ""}`,
      href: trainingHref,
      action: f.camp.completed === 0 ? "Review assigned camp" : "Open camp",
      bout,
    };
  if (pair)
    return {
      kind: "mentoring",
      label: "Mentoring",
      detail: `Lesson ends ${calendarDate(s, pair.endWeek)}. End week to learn and recover.`,
      href: "/career/gym/mentoring",
      action: "View lesson",
      bout,
    };
  return {
    kind: "rest",
    label: "Resting this week",
    detail:
      readiness(f) < 100
        ? "Rest & recover is your current plan. End week restores readiness."
        : "Rest & recover is your current plan. Your fighter stays fresh when you End week.",
    href: trainingHref,
    action: "Change training plan",
    bout,
  };
}

export function fighterNextAction(s, f) {
  const assignment = assignmentFor(s, f);
  if (!["rest", "inactive"].includes(assignment.kind)) return assignment;
  if (assignment.kind === "inactive") return assignment;
  if (assignment.bout)
    return {
      ...assignment,
      kind: "prepare",
      href: `/career/bout/${assignment.bout.id}`,
      action: "Review fight preparation",
    };
  if (f.fatigue >= (s.rules.recoveryPerWeek || 18))
    return { ...assignment, action: "Plan recovery" };
  if (f.offers?.some((offer) => !offer.unavailable))
    return {
      ...assignment,
      kind: "book",
      href: `/career/booking/${f.id}`,
      action: "Find a fight",
    };
  return assignment;
}

export function investmentPreview(s, cost, weeklyCostAfter = s.weeklyCost) {
  const cashAfterPurchase = s.cash - cost;
  return {
    cost,
    cashAfterPurchase,
    weeklyCostBefore: s.weeklyCost,
    weeklyCostAfter,
    weeksCovered:
      weeklyCostAfter > 0
        ? Math.max(0, Math.floor(cashAfterPurchase / weeklyCostAfter))
        : null,
  };
}

// Facts, not a win prediction: current skills, biggest relative danger, and date.
export function matchupRead(s, f, opponent, eventWeek) {
  const skills = ["striking", "grappling", "submissions", "conditioning"];
  const differences = skills.map((skill) => ({
    skill,
    gap: f.stats[skill] - opponent.stats[skill],
  }));
  const best = [...differences].sort((a, b) => b.gap - a.gap)[0];
  const danger = [...differences].sort((a, b) => a.gap - b.gap)[0];
  const weeks = Math.max(0, eventWeek - s.week);
  return {
    opening:
      best.gap > 0
        ? `${best.skill}: ${f.stats[best.skill]} vs ${opponent.stats[best.skill]}`
        : "No current skill lead. Compare the full matchup.",
    danger:
      danger.gap < 0
        ? `${danger.skill}: ${f.stats[danger.skill]} vs ${opponent.stats[danger.skill]}`
        : `Their strongest skill is ${skills.reduce((a, b) => (opponent.stats[a] >= opponent.stats[b] ? a : b))}.`,
    time: weeks
      ? `${weeks} ${weeks === 1 ? "week" : "weeks"} until fight night · ${calendarDate(s, eventWeek)}`
      : "Fight night is here",
  };
}
