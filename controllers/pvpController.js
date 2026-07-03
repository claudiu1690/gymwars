const pvpService = require("../services/pvpService");
const notificationService = require("../services/notificationService");

function handle(res, err) {
    const status = err.statusCode || 500;
    if (status >= 500) console.error("[pvp]", err);
    res.status(status).json({ message: status >= 500 && !err.expose ? "Internal server error" : err.message });
}

async function getState(req, res) {
    try { res.json(await pvpService.getState(req.user.gymId)); } catch (err) { handle(res, err); }
}

async function setDefense(req, res) {
    try { res.json({ defenseLineup: await pvpService.setDefenseLineup(req.user.gymId, req.body?.lineup) }); } catch (err) { handle(res, err); }
}

async function callout(req, res) {
    try {
        const { fighterId, revengeOfEventId } = req.body || {};
        const event = await pvpService.callout(req.user.gymId, fighterId, { revengeOfEventId });
        res.status(201).json({ event: await pvpService.getEvent(req.user.gymId, event._id) });
    } catch (err) { handle(res, err); }
}

async function gymWar(req, res) {
    try {
        const { revengeOfEventId } = req.body || {};
        const event = await pvpService.gymWar(req.user.gymId, { revengeOfEventId });
        res.status(201).json({ event: await pvpService.getEvent(req.user.gymId, event._id) });
    } catch (err) { handle(res, err); }
}

async function listEvents(req, res) {
    try { res.json({ events: await pvpService.listEvents(req.user.gymId) }); } catch (err) { handle(res, err); }
}

async function getEvent(req, res) {
    try { res.json({ event: await pvpService.getEvent(req.user.gymId, req.params.id) }); } catch (err) { handle(res, err); }
}

async function listNotifications(req, res) {
    try {
        const notifications = await notificationService.list(req.user.gymId);
        res.json({
            notifications: notifications.map((n) => ({
                id: n._id, type: n.type, message: n.message, data: n.data, read: n.read, createdAt: n.createdAt,
            })),
            unread: notifications.filter((n) => !n.read).length,
        });
    } catch (err) { handle(res, err); }
}

async function markNotificationsRead(req, res) {
    try {
        await notificationService.markAllRead(req.user.gymId);
        res.json({ success: true });
    } catch (err) { handle(res, err); }
}

module.exports = { getState, setDefense, callout, gymWar, listEvents, getEvent, listNotifications, markNotificationsRead };
