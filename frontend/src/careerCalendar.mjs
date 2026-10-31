// A career has one fictional calendar. UTC arithmetic keeps dates identical
// across browser time zones, daylight-saving changes and saved-game reloads.
export const calendarStart = "2026-10-05";
export function careerDay(s, week = s.week) {
  const date = new Date(`${s.calendarStart || calendarStart}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + week * 7);
  return date;
}
// Career time is shown in its own units, never as a real-looking date: real
// timestamps (allowance refills, league seasons) sit beside it on screen.
const weeksPerYear = 52;
export function calendarDate(s, week = s.week, full = false) {
  const index = Math.max(0, Math.floor(week));
  const year = Math.floor(index / weeksPerYear) + 1;
  const weekOfYear = (index % weeksPerYear) + 1;
  if (full) return `Year ${year} · Week ${weekOfYear}`;
  return year === 1 ? `Week ${weekOfYear}` : `Week ${weekOfYear}, Year ${year}`;
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
