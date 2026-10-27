const Fighter = require("../models/fighterModel");
const Camp = require("../models/campModel");
const Fight = require("../models/fightModel");
const Gym = require("../models/gymModel");
const lifecycleService = require("../services/lifecycleService");
const campService = require("../services/campService");
const mentoringService = require("../services/mentoringService");

/** Active roster — every read runs the lazy time engine (camps due, fatigue,
 *  aging), so returning players always see the world caught up. */
async function listMyFighters(req, res) {
    try {
        // $ne:true (not ===false) so fighters predating the field still match.
        const fighters = await Fighter.find({ gymId: req.user.gymId, retired: { $ne: true } }).sort({ signedAt: 1 });
        const out = [];
        for (const fighter of fighters) {
            const camp = await lifecycleService.ensureFresh(fighter);
            out.push(fighter.toPublic({ camp }));
        }
        res.json({ fighters: out });
    } catch (err) {
        console.error("listMyFighters error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getFighter(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });
        const camp = await lifecycleService.ensureFresh(fighter);
        const lastCamp = await campService.lastCompletedCamp(fighter._id);
        res.json({
            fighter: fighter.toPublic({ camp }),
            lastCamp: lastCamp ? lastCamp.toPublic() : null,
            coaching: await coachingSummary(req.user.gymId, fighter),
        });
    } catch (err) {
        console.error("getFighter error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * How the hired coach shapes THIS fighter's camps — the effective gain
 * multiplier (phase + chemistry baked in) plus the per-week base, so the camp
 * screen can project gains and show what the coach adds. Uncapped by hidden
 * potential (that stays secret; the post-camp "ceiling" note is the reveal).
 */
async function coachingSummary(gymId, fighter) {
    const Staff = require("../models/staffModel");
    const staffService = require("../services/staffService");
    const { STYLES } = require("../consts/styles");
    const { TRAINING } = require("../consts/training");
    const coach = await Staff.findOne({ gymId, role: "coach" });
    const careerPhase = fighter.careerPhase();
    const gainMult = staffService.coachGainMult(coach, { careerPhase, style: fighter.style });
    const phaseMult = TRAINING.phaseMultipliers[careerPhase] ?? 1;
    const family = STYLES[fighter.style]?.family;
    return {
        hasCoach: !!coach,
        coachName: coach?.name ?? null,
        gainMult,                                   // effective coach boost for this fighter (1 = none)
        specialty: coach?.specialty ?? null,
        specialtyMatch: coach ? coach.specialty === family : null,
        rising: careerPhase === "Rising",
        basePerWeek: TRAINING.basePointsPerWeek * phaseMult * gainMult, // stat points/week to distribute
        neglectFloorPct: TRAINING.neglectFloorPct,
        atrophyPerWeek: TRAINING.atrophyPerWeek,
    };
}

/** Corner instructions (GDD §5.4) — validated by the schema enums. */
async function setGameplan(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });
        const { approach, pace, finish } = req.body || {};
        if (approach) fighter.gameplan.approach = approach;
        if (pace) fighter.gameplan.pace = pace;
        if (finish) fighter.gameplan.finish = finish;
        await fighter.save();
        await require("../services/onboardingService").complete(req.user.gymId, "gameplan");
        res.json({ gameplan: fighter.gameplan });
    } catch (err) {
        if (err.name === "ValidationError") return res.status(400).json({ message: "Invalid gameplan value" });
        console.error("setGameplan error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Release a fighter — a permanent cut (distinct from retirement: no Hall of
 * Fame plaque). Blocked while the fighter is mid-commitment so a manager can't
 * cut someone out of an obligation. Frees the roster slot immediately.
 */
async function releaseFighter(req, res) {
    try {
        const fighter = await Fighter.findOne({ _id: req.params.id, gymId: req.user.gymId });
        if (!fighter) return res.status(404).json({ message: "Fighter not found" });

        // Mid-commitment guards.
        if (await Camp.findOne({ fighterId: fighter._id, status: "active" })) {
            return res.status(409).json({ message: "This fighter is in camp — you can't release them mid-camp." });
        }
        if (await Fight.findOne({ fighterId: fighter._id, status: "scheduled" })) {
            return res.status(409).json({ message: "This fighter has a fight booked — the bout has to resolve first." });
        }
        if (await mentoringService.isInActivePair(fighter._id)) {
            return res.status(409).json({ message: "This fighter is in a mentoring arc — you can't release them until it completes." });
        }

        // Drop them from any standing defense lineup.
        const gym = await Gym.findById(req.user.gymId);
        if (gym) {
            let changed = false;
            for (const wc of Object.keys(gym.defenseLineup?.toObject?.() ?? gym.defenseLineup ?? {})) {
                if (String(gym.defenseLineup[wc]) === String(fighter._id)) { gym.defenseLineup[wc] = null; changed = true; }
            }
            if (changed) await gym.save();
        }

        await Fighter.deleteOne({ _id: fighter._id });
        res.json({ released: true, id: String(fighter._id) });
    } catch (err) {
        console.error("releaseFighter error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = { listMyFighters, getFighter, setGameplan, releaseFighter };
for (const key of Object.keys(module.exports)) module.exports[key] = require('../lib/atomic').handler(module.exports[key]);
