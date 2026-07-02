const express = require("express");
const router = express.Router();
const gymController = require("../controllers/gymController");

router.get("/me", gymController.getMyGym);

module.exports = router;
