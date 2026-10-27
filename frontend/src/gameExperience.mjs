const KEY = "gw-experience-v1";
let context,
  lastPlayed = 0;
export function experienceSettings() {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || "{}");
    return {
      sound: saved?.sound === true,
      reduceMotion: saved?.reduceMotion === true,
    };
  } catch {
    return { sound: false, reduceMotion: false };
  }
}
export function saveExperience(patch) {
  const next = { ...experienceSettings(), ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("gw:experience"));
  if (next.sound) unlockSound();
  return next;
}
export function reducedMotion() {
  return (
    experienceSettings().reduceMotion ||
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
export function unlockSound() {
  if (!experienceSettings().sound) return;
  try {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (Audio) {
      context ||= new Audio();
      if (context.state === "suspended") context.resume().catch(() => {});
    }
  } catch {
    /* Audio is optional. */
  }
}
const notes = {
  select: [[420, 0.03, 0]],
  confirm: [
    [440, 0.06, 0],
    [660, 0.08, 0.07],
  ],
  week: [
    [330, 0.08, 0],
    [440, 0.08, 0.09],
    [550, 0.13, 0.18],
  ],
  impact: [[105, 0.06, 0]],
  ability: [
    [620, 0.05, 0],
    [930, 0.08, 0.06],
    [1240, 0.09, 0.13],
  ],
  "discover-elite": [
    [392, 0.1, 0],
    [587, 0.12, 0.1],
    [784, 0.2, 0.22],
  ],
  "discover-legend": [
    [392, 0.12, 0],
    [494, 0.12, 0.1],
    [659, 0.15, 0.2],
    [988, 0.3, 0.34],
  ],
  win: [
    [392, 0.12, 0],
    [494, 0.12, 0.12],
    [587, 0.2, 0.24],
  ],
  loss: [
    [330, 0.1, 0],
    [247, 0.2, 0.13],
  ],
  draw: [
    [392, 0.1, 0],
    [392, 0.13, 0.12],
  ],
};
export function playSound(kind) {
  if (
    !experienceSettings().sound ||
    !context ||
    context.state !== "running" ||
    (kind === "select" && Date.now() - lastPlayed < 70)
  )
    return false;
  lastPlayed = Date.now();
  try {
    const start = context.currentTime;
    for (const [frequency, duration, offset] of notes[kind] || notes.confirm) {
      const osc = context.createOscillator(),
        gain = context.createGain();
      osc.type = kind === "impact" ? "triangle" : "sine";
      osc.frequency.setValueAtTime(frequency, start + offset);
      gain.gain.setValueAtTime(0, start + offset);
      gain.gain.linearRampToValueAtTime(
        kind === "impact" ? 0.05 : 0.025,
        start + offset + 0.008,
      );
      gain.gain.exponentialRampToValueAtTime(0.001, start + offset + duration);
      osc.connect(gain);
      gain.connect(context.destination);
      osc.start(start + offset);
      osc.stop(start + offset + duration + 0.01);
    }
    return true;
  } catch {
    return false;
  }
}
export function acceptedSound(body, data) {
  if (data.duplicate) return;
  const cmd = body.command;
  if (cmd.type === "investigate") {
    const report = data.career?.board?.find((r) => r.id === cmd.reportId);
    if (
      report?.investigated &&
      ["elite", "legend"].includes(report.fighter.rarity)
    )
      return playSound(`discover-${report.fighter.rarity}`);
  }
  if (cmd.type === "advance") return playSound("week");
  if (["round", "auto-fight"].includes(cmd.type)) {
    const b = data.career.fights.find((b) => b.id === cmd.fightId);
    if (b?.status === "resolved")
      return playSound(
        b.result.winner === "A"
          ? "win"
          : b.result.winner === "B"
            ? "loss"
            : "draw",
      );
    const events = b?.latestEvents || [];
    return playSound(
      events.some((e) => e.type === "signature-active") ? "ability" : "impact",
    );
  }
  return playSound("confirm");
}
