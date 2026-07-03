const express = require("express");
const router = express.Router();
const fighterController = require("../controllers/fighterController");

router.get("/", fighterController.listMyFighters);
router.get("/:id", fighterController.getFighter);

module.exports = router;
