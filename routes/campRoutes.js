const express = require("express");
const router = express.Router();
const campController = require("../controllers/campController");

router.post("/", campController.startCamp);
router.get("/active", campController.listActive);

module.exports = router;
