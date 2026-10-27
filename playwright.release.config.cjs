const base = require("./playwright.config.cjs");
module.exports = {
  ...base,
  projects: [
    ...base.projects,
    {
      name: "phone-narrow",
      testMatch: [
        "**/release-phone.spec.cjs",
        "**/rarity.spec.cjs",
        "**/style-signatures.spec.cjs",
        "**/release-polish.spec.cjs",
        "**/mentoring.spec.cjs",
      ],
      use: {
        browserName: "chromium",
        viewport: { width: 320, height: 740 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "phone-landscape",
      testMatch: [
        "**/release-phone.spec.cjs",
        "**/rarity.spec.cjs",
        "**/style-signatures.spec.cjs",
        "**/release-polish.spec.cjs",
        "**/mentoring.spec.cjs",
      ],
      use: {
        browserName: "chromium",
        viewport: { width: 844, height: 390 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      name: "phone-webkit",
      testMatch: [
        "**/release-phone.spec.cjs",
        "**/late-game.spec.cjs",
        "**/core.spec.cjs",
        "**/wars.spec.cjs",
        "**/profiles.spec.cjs",
        "**/landing.spec.cjs",
        "**/rarity.spec.cjs",
        "**/style-signatures.spec.cjs",
        "**/release-polish.spec.cjs",
        "**/mentoring.spec.cjs",
      ],
      use: {
        browserName: "webkit",
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 2,
        isMobile: true,
        hasTouch: true,
      },
    },
  ],
};
