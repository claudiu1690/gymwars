const MentorPair = require("../models/mentorPairModel");
const Fighter = require("../models/fighterModel");
const Gym = require("../models/gymModel");
const { createRng, newSeed } = require("../utils/rng");
const { gameWeeksToMs } = require("../consts/calendar");
const { FACILITY_TIERS } = require("../consts/facilities");
const { STYLES } = require("../consts/styles");

/**
 * Mentoring — GDD §4.5. A senior fighter (30+) passes a personality trait to
 * a junior over an 8–12 game-week sparring arc. Same style family transfers
 * faster and more reliably; a trait the junior already conflicts with can't
 * be picked. Both fighters are tied up — no camps while the arc runs.
 */

function err(message, statusCode = 400) {
    return Object.assign(new Error(message), { statusCode, expose: true });
}

const MENTOR_MIN_AGE = 30;
/** Personality opposites (GDD §3.4/§4.5 — direction matters). */
const CONFLICTS = {
    "iron-chin": "suspect-chin", "suspect-chin": "iron-chin",
    "killer-instinct": "passive", "passive": "killer-instinct",
    "fast-starter": "slow-starter", "slow-starter": "fast-starter",
};

/** Pure compatibility math — exported for tests. */
function evaluatePairing(mentor, junior) {
    const transferable = (mentor.traits || []).filter((t) =>
        !(junior.traits || []).includes(t) && !(junior.traits || []).includes(CONFLICTS[t]));
    const sameFamily = STYLES[mentor.style]?.family === STYLES[junior.style]?.family;
    return {
        transferable,
        compatible: sameFamily,
        weeks: sameFamily ? 8 : 12,
        successChance: sameFamily ? 0.9 : 0.7,
    };
}

async function startPairing(gymId, mentorId, juniorId, now = new Date()) {
    if (String(mentorId) === String(juniorId)) throw err("A fighter can't mentor themselves");

    const gym = await Gym.findById(gymId);
    const capacity = FACILITY_TIERS[gym.facilityTier]?.mentoringCapacity ?? 1;
    const active = await MentorPair.countDocuments({ gymId, status: "active" });
    if (active >= capacity) throw err(`Your facility supports ${capacity} mentoring pair${capacity === 1 ? "" : "s"} — upgrade for more`, 409);

    const [mentor, junior] = await Promise.all([
        Fighter.findOne({ _id: mentorId, gymId, retired: { $ne: true } }),
        Fighter.findOne({ _id: juniorId, gymId, retired: { $ne: true } }),
    ]);
    if (!mentor || !junior) throw err("Fighter not found", 404);
    if (mentor.age < MENTOR_MIN_AGE) throw err(`A mentor needs the miles — age ${MENTOR_MIN_AGE}+ (this one is ${Math.floor(mentor.age)})`, 409);

    const busy = await MentorPair.findOne({ status: "active", $or: [{ mentorId }, { juniorId: mentorId }, { mentorId: juniorId }, { juniorId }] });
    if (busy) throw err("One of these fighters is already in a mentoring arc", 409);

    const evaluation = evaluatePairing(mentor, junior);
    if (evaluation.transferable.length === 0) {
        throw err(`${mentor.name} has nothing left to teach ${junior.name} — no transferable traits`, 409);
    }

    const seed = newSeed();
    const rng = createRng(`mentor:${seed}`);
    const trait = rng.pick(evaluation.transferable);

    return MentorPair.create({
        gymId,
        mentorId,
        juniorId,
        mentorName: mentor.name,
        juniorName: junior.name,
        trait,
        compatible: evaluation.compatible,
        successChance: evaluation.successChance,
        startedAt: now,
        endsAt: new Date(now.getTime() + gameWeeksToMs(evaluation.weeks)),
        seed,
    });
}

/** Resolve a due arc — atomic claim; success transfers AND reveals the trait. */
async function resolvePairIfDue(pairId, now = new Date()) {
    const pair = await MentorPair.findOneAndUpdate(
        { _id: pairId, status: "active", endsAt: { $lte: now } },
        { $set: { resolvedAt: now } },
        { new: true }
    );
    if (!pair || pair.status !== "active") return null;

    const rng = createRng(`mentor-resolve:${pair.seed}`);
    const succeeded = rng() < pair.successChance;
    pair.status = succeeded ? "succeeded" : "failed";
    await pair.save();

    if (succeeded) {
        const junior = await Fighter.findById(pair.juniorId);
        if (junior && !junior.traits.includes(pair.trait)) {
            junior.traits.push(pair.trait);
            junior.discoveredTraits.push(pair.trait); // taught, so known
            await junior.save();
        }
        const legacyService = require("./legacyService");
        await legacyService.award(pair.gymId, "mentoring-lineage", `${pair.mentorName} passed ${pair.trait} to ${pair.juniorName}`);
        console.log(`[mentoring] ${pair.mentorName} passed ${pair.trait} to ${pair.juniorName}.`);
    }
    return pair;
}

/** Lazy pass for a gym: resolve any due arcs; return active + recent pairs. */
async function getPairs(gymId, now = new Date()) {
    const due = await MentorPair.find({ gymId, status: "active", endsAt: { $lte: now } });
    for (const pair of due) await resolvePairIfDue(pair._id, now);
    return MentorPair.find({ gymId }).sort({ startedAt: -1 }).limit(10);
}

/** True if a fighter is tied up in an active arc (blocks camps). */
async function isInActivePair(fighterId) {
    return Boolean(await MentorPair.findOne({ status: "active", $or: [{ mentorId: fighterId }, { juniorId: fighterId }] }));
}

module.exports = { startPairing, resolvePairIfDue, getPairs, isInActivePair, evaluatePairing, MENTOR_MIN_AGE };
