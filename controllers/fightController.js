const fightService = require("../services/fightService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[fights]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function book(req, res) {
    try {
        const { fighterId, weeks } = req.body || {};
        const fight = await fightService.bookFight(req.user.gymId, fighterId, Number(weeks));
        res.status(201).json({ fight: await fightService.toPublic(fight) });
    } catch (err) { handle(res, err); }
}

async function list(req, res) {
    try {
        const fights = await fightService.listFights(req.user.gymId);
        res.json({ fights: await Promise.all(fights.map((f) => fightService.toPublic(f))) });
    } catch (err) { handle(res, err); }
}

async function get(req, res) {
    try {
        const fight = await fightService.getFight(req.user.gymId, req.params.id);
        if (!fight) return res.status(404).json({ message: "Fight not found" });
        res.json({ fight: await fightService.toPublic(fight) });
    } catch (err) { handle(res, err); }
}

module.exports = { book, list, get };
