const express = require("express");
const router = express.Router();
const fightController = require("../controllers/fightController");

router.post("/book", fightController.book);
router.get("/", fightController.list);
router.get("/:id", fightController.get);

module.exports = router;
