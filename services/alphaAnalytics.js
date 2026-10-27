const { AlphaEvent } = require("../models/alphaModel");
const kinds = new Set([
  "visit",
  "career-start",
  "booked-fight",
  "assigned-training",
  "end-week",
  "first-result",
  "complete-team",
  "gym-war",
  "staff-promoted",
  "gym-expanded",
  "gym-expansion-started",
  "blocked",
]);
const actions = new Set([
  "book",
  "accept-offer",
  "camp",
  "advance",
  "round",
  "auto-fight",
  "investigate",
  "sign",
  "upgrade-staff",
  "upgrade",
  "upgrade-gym",
  "hire",
  "publish-defense",
  "gym-war",
]);
function reasonFor(error) {
  const text = String(error?.message || "");
  return /career weeks|cards.*refill|No.*weeks|No.*cards/i.test(text)
    ? "allowance"
    : /cash|fund|\$|afford/i.test(text)
      ? "budget"
      : /revision|another request|changed|stale/i.test(text)
        ? "save-conflict"
        : /commitment|camp|scheduled|ready|fight date/i.test(text)
          ? "schedule"
          : /division|four fighters|four.*team/i.test(text)
            ? "team"
            : /quest|rank|unlock|gym tier/i.test(text)
              ? "progression"
              : "invalid-action";
}
function repository(
  Model = AlphaEvent,
  {
    now = Date.now,
    consent = async (actor) =>
      !!(await require("../models/userModel").exists({
        _id: actor.id,
        gymId: actor.gymId,
        analyticsEnabled: true,
        deleted: false,
      })),
  } = {},
) {
  async function record(actor, eventId, kind, details = {}) {
    if (
      !actor?.analyticsEnabled ||
      !actor.gymId ||
      !kinds.has(kind) ||
      !/^[a-zA-Z0-9_-]{1,140}$/.test(String(eventId))
    )
      return;
    const safe = {};
    for (const key of [
      "week",
      "bouts",
      "roster",
      "tier",
      "rank",
      "powerGap",
      "outcome",
      "reason",
      "action",
    ]) {
      const value = details[key];
      if (typeof value === "number" && Number.isFinite(value))
        safe[key] = value;
      else if (
        ["outcome", "reason"].includes(key) &&
        typeof value === "string" &&
        /^[a-z-]{1,30}$/.test(value)
      )
        safe[key] = value;
      else if (key === "action" && actions.has(value)) safe[key] = value;
    }
    try {
      if (!(await consent(actor))) return;
      await Model.create({
        gymId: actor.gymId,
        eventId: String(eventId).slice(0, 140),
        kind,
        details: safe,
        createdAt: new Date(now()),
      });
    } catch (e) {
      if (e.code !== 11000) console.warn("[analytics] event not saved", e.name);
    } finally {
      // A consent change racing an accepted action must also erase a late write.
      try {
        if (!(await consent(actor)))
          await Model.deleteMany({ gymId: actor.gymId });
      } catch (e) {
        console.warn("[analytics] consent check unavailable", e.name);
      }
    }
  }
  return {
    record,
    async visit(actor) {
      return record(
        actor,
        "visit-" + new Date(now()).toISOString().slice(0, 10),
        "visit",
      );
    },
    async accepted(actor, body, result) {
      if (!result?.acceptedAction || result.duplicate) return;
      const s = result.career,
        cmd = body.command || {},
        id = "career-" + body.id;
      const fields = {
        week: s.week,
        bouts: s.boutsCompleted,
        roster: s.fighters.filter((f) => !f.retired && !f.released).length,
        tier: s.facilityTier,
      };
      const kind = {
        book: "booked-fight",
        "accept-offer": "booked-fight",
        camp: "assigned-training",
        advance: "end-week",
        "upgrade-staff": "staff-promoted",
        upgrade: "gym-expansion-started",
      }[cmd.type];
      if (kind)
        await record(actor, id + "-" + kind, kind, {
          ...fields,
          ...(cmd.type === "upgrade-staff"
            ? { rank: s.staff?.[cmd.role]?.rank }
            : {}),
        });
      if (s.facilityTier > 1)
        await record(
          actor,
          `gym-expanded-tier-${s.facilityTier}`,
          "gym-expanded",
          fields,
        );
      if (
        ["round", "auto-fight"].includes(cmd.type) &&
        s.boutsCompleted === 1 &&
        s.fights.some((b) => b.id === cmd.fightId && b.status === "resolved")
      )
        await record(actor, "first-result", "first-result", fields);
      if (
        new Set(
          s.fighters
            .filter((f) => !f.retired && !f.released)
            .map((f) => f.weightClass),
        ).size === 4
      )
        await record(actor, "complete-team", "complete-team", fields);
    },
    async blocked(actor, body, error) {
      const action = body?.command?.type || body?.action;
      if (!actions.has(action)) return;
      const supplied = body?.id || body?.requestId;
      const key =
        typeof supplied === "string" && /^[a-zA-Z0-9_-]{8,100}$/.test(supplied)
          ? supplied
          : new Date(now()).toISOString().slice(0, 13).replace(/\W/g, "");
      await record(
        actor,
        "blocked-" + key + "-" + reasonFor(error),
        "blocked",
        { action, reason: reasonFor(error) },
      );
    },
  };
}
module.exports = { ...repository(), repository, reasonFor };
