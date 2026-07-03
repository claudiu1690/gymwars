const express = require("express");
const router = express.Router();
const pvpController = require("../controllers/pvpController");

router.get("/state", pvpController.getState);
router.put("/defense", pvpController.setDefense);
router.post("/callout", pvpController.callout);
router.post("/gymwar", pvpController.gymWar);
router.get("/events", pvpController.listEvents);
router.get("/events/:id", pvpController.getEvent);
router.get("/notifications", pvpController.listNotifications);
router.post("/notifications/read", pvpController.markNotificationsRead);

module.exports = router;
