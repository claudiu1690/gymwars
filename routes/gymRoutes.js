const express = require("express");
const router = express.Router();
const gymController = require("../controllers/gymController");

// Identity read does not advance the real-time comparison simulation.
router.get('/identity', async (req,res,next) => {
    try {
        const gym=await require('../models/gymModel').findById(req.user.gymId).lean();
        if(!gym)return res.status(404).json({message:'No gym found for this account'});
        res.json({gym});
    }catch(e){next(e);}
});
router.get("/me", gymController.getMyGym);
router.get("/overview", gymController.getOverview);
router.post("/upgrade", gymController.startUpgrade);
router.get("/staff/market", gymController.getStaffMarket);
router.post("/staff/hire", gymController.hireStaff);
router.delete("/staff/:id", gymController.fireStaff);
router.post("/mentoring", gymController.startMentoring);
router.get("/hall-of-fame", gymController.getHallOfFame);

module.exports = router;
