const liveFightService = require("../services/liveFightService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[livefight]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function start(req, res) {
    try {
        res.status(201).json(await liveFightService.start(req.user.gymId, req.body?.fighterId));
    } catch (err) { handle(res, err); }
}

async function round(req, res) {
    try {
        const { openingPlan, decisionId } = req.body || {};
        res.json(await liveFightService.round(req.user.gymId, req.params.id, { openingPlan, decisionId }));
    } catch (err) { handle(res, err); }
}

module.exports = { start, round };
