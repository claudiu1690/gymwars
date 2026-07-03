const campService = require("../services/campService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[camps]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function startCamp(req, res) {
    try {
        const { fighterId, allocations, weeks } = req.body || {};
        const camp = await campService.startCamp(req.user.gymId, fighterId, allocations, Number(weeks));
        res.status(201).json({ camp: camp.toPublic() });
    } catch (err) { handle(res, err); }
}

async function listActive(req, res) {
    try {
        const byFighter = await campService.activeCampsByFighter(req.user.gymId);
        res.json({ camps: [...byFighter.values()].map((c) => c.toPublic()) });
    } catch (err) { handle(res, err); }
}

module.exports = { startCamp, listActive };
