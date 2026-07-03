const express = require("express");
const router = express.Router();
const scoutingController = require("../controllers/scoutingController");

router.get("/state", scoutingController.getState);
router.post("/investigate", scoutingController.investigate);
router.post("/reports/:id/sign", scoutingController.signReport);
router.post("/reports/:id/pass", scoutingController.passReport);

module.exports = router;
