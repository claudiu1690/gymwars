// A career has one fictional calendar. UTC arithmetic keeps dates identical
// across browser time zones, daylight-saving changes and saved-game reloads.
export const calendarStart = "2026-10-05";
export function careerDay(s, week = s.week) {
  const date = new Date(`${s.calendarStart || calendarStart}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + week * 7);
  return date;
}
export function calendarDate(s, week = s.week, full = false) {
  return careerDay(s, week).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
    ...(full ? { weekday: "short" } : {}),
  });
}
export function daysUntil(s, week) {
  const weeks = Math.max(0, week - s.week);
  return weeks === 0 ? "This week" : `In ${weeks} ${weeks === 1 ? "week" : "weeks"}`;
}
export function calendarText(s, text = "") {
  // Historical journals remain intact; their old absolute week references
  // are translated only at the presentation boundary.
  return text.replace(/\bweek (\d+)\b/gi, (_, w) => calendarDate(s, Number(w)));
}
