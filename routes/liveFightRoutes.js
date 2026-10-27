const express = require("express");
const router = express.Router();
const liveFightController = require("../controllers/liveFightController");

router.post("/start", liveFightController.start);
router.post("/:id/round", liveFightController.round);

module.exports = router;
