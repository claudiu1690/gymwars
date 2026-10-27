const express = require("express");
const router = express.Router();
const fighterController = require("../controllers/fighterController");

router.get("/", fighterController.listMyFighters);
router.get("/:id", fighterController.getFighter);
router.put("/:id/gameplan", fighterController.setGameplan);
router.delete("/:id", fighterController.releaseFighter);

module.exports = router;
