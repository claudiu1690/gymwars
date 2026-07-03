const scoutingService = require("../services/scoutingService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[scouting]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function getState(req, res) {
    try {
        res.json(await scoutingService.getState(req.user.gymId));
    } catch (err) { handle(res, err); }
}

async function investigate(req, res) {
    try {
        res.status(201).json(await scoutingService.investigate(req.user.gymId, Number(req.body?.slot)));
    } catch (err) { handle(res, err); }
}

async function signReport(req, res) {
    try {
        res.json(await scoutingService.resolveReport(req.user.gymId, req.params.id, "sign"));
    } catch (err) { handle(res, err); }
}

async function passReport(req, res) {
    try {
        res.json(await scoutingService.resolveReport(req.user.gymId, req.params.id, "pass"));
    } catch (err) { handle(res, err); }
}

module.exports = { getState, investigate, signReport, passReport };
