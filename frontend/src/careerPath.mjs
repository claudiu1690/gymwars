export function careerPathFocus(s) {
  const journey = s.journey;
  const stage = journey.stages.find((item) => item.status === "current");
  const due = s.fights.find((bout) => ["ready", "live"].includes(bout.status));
  if (due) {
    const fighter = s.fighters.find((f) => f.id === due.fighterId);
    return {
      title: `${fighter?.name || "Your fighter"}'s fight is ready`,
      description:
        "Your corner is waiting. Finish this fight before the calendar moves on.",
      reward: stage?.reward,
      progress: stage?.progress,
      action: {
        label: due.status === "live" ? "Resume fight" : "Enter fight night",
        href: `/career/fight-night/${due.id}`,
      },
      status: "FIGHT NIGHT",
    };
  }
  const checkIn = s.fighters.find(
    (f) => !f.retired && !f.released && f.camp?.needsReview,
  );
  if (checkIn)
    return {
      title: `${checkIn.name}'s camp check-in`,
      description:
        "Review the camp before you End week. Continue training or finish early and recover.",
      reward: stage?.reward,
      progress: stage?.progress,
      action: {
        label: "Review camp",
        href: `/career/gym/training/${checkIn.id}`,
      },
      status: "YOUR NEXT STEP",
    };
  if (journey.completion?.complete)
    return {
      title: "Your gym made history.",
      description: journey.completion.description,
      action: journey.completion.nextAction,
      status: "CAREER COMPLETE",
    };
  if (journey.complete) {
    let action = journey.completion?.nextAction || journey.nextAction;
    const challenge =
      journey.postInvitationalChallenge ||
      s.gymDevelopment?.challenges.find(
        (item) => item.actionLabel === action?.label,
      );
    if (challenge)
      action = { label: challenge.actionLabel, href: challenge.href };
    const goal = s.gymDevelopment?.goals.find(
      (item) => item.name === action?.label,
    );
    return {
      title: challenge?.name || goal?.name || "Keep climbing the circuits",
      description:
        challenge?.description ||
        goal?.description ||
        journey.completion?.description,
      reward: challenge?.reward
        ? `${challenge.reward.trophy} · +${challenge.reward.legacy} reputation`
        : goal?.reward,
      progress: goal
        ? {
            current: goal.current,
            target: goal.target,
            label: `${goal.current} / ${goal.target} ${goal.unit}`,
          }
        : null,
      action,
      status: "YOUR NEXT MILESTONE",
    };
  }
  let action = journey.nextAction;
  if (
    journey.currentStageId === "invitational" &&
    journey.invitational.attempt?.status === "active"
  )
    action = { label: "Review Invitational card", href: "#campaign-scorecard" };
  if (action?.href === "/career/campaign")
    action = {
      ...action,
      href:
        journey.invitational.attempt?.status === "active"
          ? "#campaign-scorecard"
          : "#campaign-lineup",
    };
  const preparation = action?.href?.match(/^\/career\/gym\/training\/([^/]+)$/);
  const booked =
    preparation &&
    s.fights.find(
      (b) => b.fighterId === preparation[1] && b.status === "scheduled",
    );
  if (booked)
    action = {
      label: "Review fight preparation",
      href: `/career/bout/${booked.id}`,
    };
  return {
    ...stage,
    title: stage?.name || journey.title,
    action,
    status: "YOUR NEXT MILESTONE",
  };
}
