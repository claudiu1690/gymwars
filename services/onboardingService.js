const Gym = require("../models/gymModel");
const notificationService = require("./notificationService");
const { ONBOARDING_TASKS } = require("../consts/onboarding");

/**
 * First Fight Week — completion is event-marked by the action that fulfils
 * each task and pays instantly (Travian-style: the reward funds the next
 * step). Idempotent: the filter only matches gyms that haven't done the task,
 * so the purse can never be paid twice. Call sites fire-and-forget — a
 * checklist hiccup must never fail a game action.
 */
async function complete(gymId, key) {
    const task = ONBOARDING_TASKS.find((t) => t.key === key);
    if (!task || !gymId) return;
    const gym = await Gym.findOneAndUpdate(
        { _id: gymId, isAi: { $ne: true }, "onboarding.done": { $ne: key } },
        { $addToSet: { "onboarding.done": key }, $inc: { purse: task.reward } },
        { new: true }
    );
    if (!gym) return; // already completed, or an AI gym
    await notificationService.notify(gymId, "info", `First Fight Week — ${task.label} ✓ (+$${task.reward} purse)`);
}

/** Checklist shape for the client. */
function state(gym) {
    const done = gym.onboarding?.done ?? [];
    return {
        tasks: ONBOARDING_TASKS.map((t) => ({ key: t.key, label: t.label, hint: t.hint, reward: t.reward, done: done.includes(t.key) })),
        complete: ONBOARDING_TASKS.every((t) => done.includes(t.key)),
    };
}

module.exports = { complete, state };

// All database changes commit together; retryable transaction failures roll back.
module.exports = require("../lib/atomic").protect(module.exports);
