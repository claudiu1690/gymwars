const router = require("express").Router();
const career = require("../services/careerService");
const wars = require("../services/careerWarService");
const practice = require("../services/careerPracticeService");
const shop = require("../services/clubShopService");
const analytics = require("../services/alphaAnalytics");
const handle = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    await analytics.blocked(
      req.user,
      req.path === "/wars/battle"
        ? { ...req.body, action: "gym-war" }
        : req.body,
      e,
    );
    next(e);
  }
};
router.get(
  "/",
  handle((req) => career.get(req.user.gymId)),
);
router.post(
  "/start",
  handle(async (req) => {
    const result = await career.start(req.user.gymId, req.body);
    await analytics.record(req.user, "career-start", "career-start");
    return result;
  }),
);
router.post(
  "/command",
  handle(async (req) => {
    const result = await career.command(req.user.gymId, req.body);
    await analytics.accepted(req.user, req.body, result);
    return result;
  }),
);
router.post(
  "/forecast",
  handle((req) => career.forecast(req.user.gymId, req.body)),
);
router.get(
  "/shop",
  handle((req) => shop.get(req.user.gymId)),
);
router.post(
  "/shop/preview-purchases",
  handle((req) => shop.purchasePreview(req.user.gymId, req.body)),
);
router.post("/shop/equip", (req, res) =>
  res.status(410).json({
    message: "Cosmetics are now earned and equipped in Achievements.",
  }),
);
router.get(
  "/achievements",
  handle((req) =>
    require("../services/achievementService").get(req.user.gymId),
  ),
);
router.get(
  "/profiles/:gymId",
  handle((req) =>
    require("../services/gymProfileService").get(
      req.user.gymId,
      req.params.gymId,
    ),
  ),
);
router.post(
  "/achievements/equip",
  handle((req) =>
    require("../services/achievementService").equip(req.user.gymId, req.body),
  ),
);
// Retire old bookmarked/client practice URLs without creating any new matches.
router.use("/exhibitions", (req, res) =>
  res.status(410).json({
    message:
      "Practice has been removed. Gym Wars is ranked 4v4 gym competition.",
  }),
);
router.get(
  "/wars/lobby",
  handle((req) => wars.lobby(req.user.gymId)),
);
router.get(
  "/wars/opponents/:type/:id",
  handle((req) =>
    wars.reviewOpponent(req.user.gymId, req.params.type, req.params.id),
  ),
);
router.post(
  "/wars/defense",
  handle((req) => wars.publishDefense(req.user.gymId, req.body)),
);
router.post(
  "/wars/battle",
  handle(async (req) => {
    const result = await wars.battle(req.user.gymId, req.body);
    await analytics.record(req.user, "war-" + result.id, "gym-war", {
      outcome: result.outcome,
    });
    return result;
  }),
);
router.post(
  "/wars/rival",
  handle((req) => wars.followRival(req.user.gymId, req.body)),
);
router.post(
  "/practice/room",
  handle((req) => practice.room(req.user.gymId, req.body)),
);
router.post(
  "/practice/replay",
  handle((req) => practice.replay(req.user.gymId, req.body)),
);
router.post(
  "/analytics/visit",
  handle(async (req) => {
    await analytics.visit(req.user);
    return { ok: true };
  }),
);
module.exports = router;
