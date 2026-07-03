const express = require("express");
const router = express.Router();
const gymController = require("../controllers/gymController");

router.get("/me", gymController.getMyGym);
router.get("/overview", gymController.getOverview);
router.post("/upgrade", gymController.startUpgrade);
router.get("/staff/market", gymController.getStaffMarket);
router.post("/staff/hire", gymController.hireStaff);
router.delete("/staff/:id", gymController.fireStaff);
router.post("/mentoring", gymController.startMentoring);
router.get("/hall-of-fame", gymController.getHallOfFame);

module.exports = router;
