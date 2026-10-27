const fightService = require("../services/fightService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[fights]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function offerState(req, res) {
    try {
        res.json(await fightService.getOffer(req.user.gymId, req.params.fighterId));
    } catch (err) { handle(res, err); }
}

async function makeOffer(req, res) {
    try {
        const { fighterId } = req.body || {};
        res.status(201).json(await fightService.makeOffer(req.user.gymId, fighterId));
    } catch (err) { handle(res, err); }
}

async function passOffer(req, res) {
    try {
        const { fighterId } = req.body || {};
        res.json(await fightService.passOffer(req.user.gymId, fighterId));
    } catch (err) { handle(res, err); }
}

async function spar(req, res) {
    try {
        const { fighterId } = req.body || {};
        const fight = await fightService.sparExhibition(req.user.gymId, fighterId);
        const Gym = require("../models/gymModel");
        const gym = await Gym.findById(req.user.gymId);
        res.status(201).json({ fight: await fightService.toPublic(fight), sparsLeft: fightService.sparsLeft(gym) });
    } catch (err) { handle(res, err); }
}

async function book(req, res) {
    try {
        const { fighterId, weeks, rush } = req.body || {};
        const fight = await fightService.bookFight(req.user.gymId, fighterId, Number(weeks), { rush: !!rush });
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

module.exports = { offerState, makeOffer, passOffer, spar, book, list, get };
