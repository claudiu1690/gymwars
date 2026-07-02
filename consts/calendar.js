/**
 * The calendar — the single source of truth for Gym Wars' time model.
 *
 * Locked ratio (GDD §10.2): 1 real day = 1 game-week.
 * Everything time-related derives from these constants; no other file may
 * hardcode a real-time↔game-time conversion.
 *
 * Under this ratio:
 *   - a full 6-game-week camp  ≈ 6 real days
 *   - a 1-game-week camp       ≈ 1 real day
 *   - Gym War cooldown (1/day) ≈ once per game-week
 *   - a ~10-year career        ≈ 520 real days (~1.4 real years)
 */

const MS_PER_REAL_DAY = 24 * 60 * 60 * 1000;

/** How many real milliseconds one game-week lasts. */
const MS_PER_GAME_WEEK = MS_PER_REAL_DAY;

/** Game-weeks per game-year (aging math runs on this). */
const GAME_WEEKS_PER_GAME_YEAR = 52;

/** Real ms per game-year — ≈52 real days. */
const MS_PER_GAME_YEAR = MS_PER_GAME_WEEK * GAME_WEEKS_PER_GAME_YEAR;

/**
 * DEV TIME WARP — multiplies the passage of game time for local iteration
 * (TIME_WARP=24 makes a game-week pass in an hour). Refuses to engage outside
 * LOCAL_MODE so it can never distort a deployed environment.
 */
function getTimeWarp() {
    const config = require("../config");
    const warp = Number(process.env.TIME_WARP) || 1;
    if (warp !== 1 && !config.localMode) {
        console.warn("[calendar] TIME_WARP ignored — only honored in LOCAL_MODE");
        return 1;
    }
    return Math.max(1, warp);
}

/** Effective real-ms length of a game-week after any dev time warp. */
function gameWeekMs() {
    return MS_PER_GAME_WEEK / getTimeWarp();
}

/** Convert a number of game-weeks to real milliseconds (warp-aware). */
function gameWeeksToMs(weeks) {
    return weeks * gameWeekMs();
}

/** Elapsed game-weeks between two real timestamps (warp-aware, fractional). */
function elapsedGameWeeks(fromDate, toDate = new Date()) {
    return (toDate.getTime() - new Date(fromDate).getTime()) / gameWeekMs();
}

/** Start of the current UTC day — the daily tick boundary (scout refresh,
 *  cooldown reset, aging). All "daily" logic anchors here, never local time. */
function utcDayStart(date = new Date()) {
    const d = new Date(date);
    d.setUTCHours(0, 0, 0, 0);
    return d;
}

/** Start of the next UTC day — when today's timers refresh. */
function nextUtcDayStart(date = new Date()) {
    const d = utcDayStart(date);
    d.setUTCDate(d.getUTCDate() + 1);
    return d;
}

/** True if two real timestamps fall on the same UTC day (dedupe daily grants). */
function isSameUtcDay(a, b) {
    return utcDayStart(a).getTime() === utcDayStart(b).getTime();
}

module.exports = {
    MS_PER_REAL_DAY,
    MS_PER_GAME_WEEK,
    GAME_WEEKS_PER_GAME_YEAR,
    MS_PER_GAME_YEAR,
    getTimeWarp,
    gameWeekMs,
    gameWeeksToMs,
    elapsedGameWeeks,
    utcDayStart,
    nextUtcDayStart,
    isSameUtcDay,
};
