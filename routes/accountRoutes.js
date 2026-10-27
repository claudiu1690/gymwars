const router = require("express").Router(),
  bcrypt = require("bcryptjs"),
  crypto = require("node:crypto");
const User = require("../models/userModel"),
  Career = require("../models/careerModel");
const { AlphaEvent, SupportReport } = require("../models/alphaModel");
const { publicState } = require("../engine/careerEngine");
const fail = (message, statusCode = 400) =>
  Object.assign(new Error(message), { statusCode, expose: true });
const handle = (fn) => async (req, res, next) => {
  try {
    res.json(await fn(req));
  } catch (e) {
    next(e);
  }
};
const profile = (user) => ({
  email: user.email,
  emailConfirmed: user.emailConfirmed,
  analyticsEnabled: !!user.analyticsEnabled,
  emailEnabled: user.notifications?.emailEnabled !== false,
  securityEmailAvailable: !!process.env.RESEND_API_KEY,
  supportEmail: process.env.SUPPORT_EMAIL || null,
  localPreview: process.env.LOCAL_MODE === "true",
  analyticsRetentionDays: 90,
});
router.get(
  "/",
  handle(async (req) => profile(await User.findById(req.user.id).lean())),
);
router.patch(
  "/preferences",
  handle(async (req) => {
    const patch = {};
    if (typeof req.body?.analyticsEnabled === "boolean")
      patch.analyticsEnabled = req.body.analyticsEnabled;
    if (typeof req.body?.emailEnabled === "boolean")
      patch["notifications.emailEnabled"] = req.body.emailEnabled;
    if (!Object.keys(patch).length)
      throw fail("Choose a preference to update.");
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: patch },
      { new: true },
    ).lean();
    if (patch.analyticsEnabled === false)
      await AlphaEvent.deleteMany({ gymId: req.user.gymId });
    return profile(user);
  }),
);
router.post(
  "/password",
  handle(async (req) => {
    const { currentPassword, newPassword } = req.body || {};
    if (
      typeof currentPassword !== "string" ||
      typeof newPassword !== "string" ||
      newPassword.length < 8 ||
      newPassword.length > 128
    )
      throw fail(
        "Enter your current password and a new password of 8–128 characters.",
      );
    const user = await User.findById(req.user.id);
    if (!(await bcrypt.compare(currentPassword, user.passwordHash)))
      throw fail("Current password is incorrect.", 403);
    const updated = await User.findOneAndUpdate(
      { _id: user._id, passwordHash: user.passwordHash },
      {
        $set: {
          passwordHash: await bcrypt.hash(newPassword, 10),
          passwordResetToken: null,
          passwordResetExpires: null,
        },
        $inc: { sessionEpoch: 1 },
      },
      { new: true },
    );
    if (!updated)
      throw fail(
        "Your account changed. Sign in again before changing the password.",
        409,
      );
    return {
      ok: true,
      token: require("../controllers/authController").signToken(updated),
    };
  }),
);
router.post(
  "/verify-email",
  handle(async (req) => {
    if (!process.env.RESEND_API_KEY)
      throw fail(
        "Email delivery is not configured in this local environment. No email was sent.",
        503,
      );
    await require("../services/accountService").sendVerifyEmail(
      await User.findById(req.user.id),
    );
    return { ok: true };
  }),
);
router.get(
  "/export",
  handle(async (req) => {
    const [user, career, shop, reports, achievements] = await Promise.all([
      User.findById(req.user.id).lean(),
      Career.findOne({ gymId: req.user.gymId }).lean(),
      require("../services/clubShopService").get(req.user.gymId),
      SupportReport.find({ gymId: req.user.gymId })
        .select("reference category message context status createdAt -_id")
        .lean(),
      require("../services/achievementService").get(req.user.gymId),
    ]);
    return {
      exportedAt: new Date().toISOString(),
      account: profile(user),
      career: career ? publicState(career.state) : null,
      supplies: shop,
      cosmetics: achievements.looks.filter((l) => l.owned),
      achievements,
      reports,
    };
  }),
);
router.get(
  "/reports",
  handle(async (req) => ({
    reports: await SupportReport.find({ gymId: req.user.gymId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("reference category message status createdAt -_id")
      .lean(),
  })),
);
router.post(
  "/reports",
  handle(async (req) => {
    const { requestId, category, message, context } = req.body || {};
    if (
      typeof requestId !== "string" ||
      !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId) ||
      !["gameplay", "bug", "purchase", "playtest"].includes(category) ||
      typeof message !== "string" ||
      message.trim().length < 4 ||
      message.length > 2000
    )
      throw fail("Choose a report type and enter 4–2,000 characters.");
    const safe = {};
    if (
      typeof context?.screen === "string" &&
      /^[a-z-]{1,30}$/.test(context.screen)
    )
      safe.screen = context.screen;
    if (
      typeof context?.reference === "string" &&
      /^[a-zA-Z0-9_-]{1,80}$/.test(context.reference)
    )
      safe.reference = context.reference;
    const reference =
      "GW-" +
      crypto
        .createHash("sha256")
        .update(String(req.user.gymId) + ":" + requestId)
        .digest("hex")
        .slice(0, 10)
        .toUpperCase();
    let report = await SupportReport.findOne({
      gymId: req.user.gymId,
      requestId,
    }).lean();
    if (
      report &&
      (report.message !== message.trim() || report.category !== category)
    )
      throw fail("This report ID belongs to another message.", 409);
    if (!report) {
      try {
        report = (
          await SupportReport.create({
            gymId: req.user.gymId,
            requestId,
            reference,
            category,
            message: message.trim(),
            context: safe,
          })
        ).toObject();
      } catch (e) {
        if (e.code !== 11000) throw e;
        report = await SupportReport.findOne({
          gymId: req.user.gymId,
          requestId,
        }).lean();
        if (report.message !== message.trim() || report.category !== category)
          throw fail("This report ID belongs to another message.", 409);
      }
    }
    return {
      reference: report.reference,
      status: report.status,
      message:
        "Saved for Digital Olive to review. Keep this reference for follow-up.",
    };
  }),
);
module.exports = router;
