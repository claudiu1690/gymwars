const express = require("express");
const router = express.Router();
const fightController = require("../controllers/fightController");

// Offer routes must precede "/:id" so "offer" isn't captured as a fight id.
router.get("/offer/:fighterId", fightController.offerState);
router.post("/offer", fightController.makeOffer);
router.post("/offer/pass", fightController.passOffer);
router.post("/exhibition", fightController.spar);
router.post("/book", fightController.book);
router.get("/", fightController.list);
router.get("/:id", fightController.get);

module.exports = router;
