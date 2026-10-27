const Career = require("../models/careerModel"),
  Shop = require("../models/clubShopModel"),
  { Match } = require("../models/careerWarModel");
const { project } = require("../engine/achievements"),
  { lookById, ACHIEVEMENTS } = require("../consts/achievements"),
  { previewEnabled } = require("./clubShopService");
const fail = (message, statusCode = 409) =>
  Object.assign(new Error(message), { statusCode, expose: true });
function repository({
  CareerModel = Career,
  ShopModel = Shop,
  MatchModel = Match,
  canPreview = previewEnabled,
  beforeCommit = async () => {},
} = {}) {
  async function evidence(gymId) {
    const [doc, old, matches] = await Promise.all([
      CareerModel.findOne({ gymId }).lean(),
      ShopModel.findOne({ gymId }).lean(),
      MatchModel.find({ gymId }).select("result requestId").lean(),
    ]);
    const legacy = old?.[canPreview() ? "preview" : "live"] || {},
      cards = new Map();
    for (const m of [...matches, ...(doc?.warReceipts || [])])
      cards.set(m.requestId, { id: m.requestId, result: m.result });
    return { doc, legacy, wars: [...cards.values()] };
  }
  function view({ doc, legacy, wars }) {
    if (!doc)
      return {
        achievements: [],
        looks: [],
        earnedCount: 0,
        total: ACHIEVEMENTS.length,
        revision: 0,
        selected: null,
      };
    const data = project(doc.state, wars, legacy.owned || []),
      selectedId =
        doc.state.cosmeticLookId === undefined
          ? legacy.selected ||
            (doc.state.clubStyle?.selected !== "original"
              ? doc.state.clubStyle?.selected
              : null)
          : doc.state.cosmeticLookId;
    return {
      ...data,
      revision: doc.revision,
      selected: data.looks.find((l) => l.id === selectedId && l.owned) || null,
    };
  }
  return {
    async get(gymId) {
      return view(await evidence(gymId));
    },
    async equip(gymId, { lookId, revision } = {}) {
      if (
        typeof lookId !== "string" ||
        !lookById(lookId) ||
        !Number.isSafeInteger(revision) ||
        revision < 0
      )
        throw fail("Choose an earned look and refresh Achievements.", 400);
      const source = await evidence(gymId),
        data = view(source),
        doc = source.doc;
      if (!doc) throw fail("Start your gym first.", 404);
      if (!data.looks.find((l) => l.id === lookId)?.owned)
        throw fail(
          "Complete the achievement before equipping this cosmetic.",
          403,
        );
      const selected = lookId === "original" ? null : lookId;
      if (
        (data.selected?.id === "original"
          ? null
          : data.selected?.id || null) === selected
      )
        return data;
      if (doc.revision !== revision)
        throw fail(
          "Your gym changed. Refresh Achievements before equipping a look.",
        );
      const state = structuredClone(doc.state);
      state.cosmeticLookId = selected;
      state.achievements ||= { earned: {} };
      state.achievements.earned ||= {};
      for (const a of data.achievements)
        if (a.earned && !state.achievements.earned[a.id])
          state.achievements.earned[a.id] = { week: state.week };
      if (selected === null)
        state.clubStyle = { ...state.clubStyle, selected: "original" };
      await beforeCommit(state);
      const saved = await CareerModel.findOneAndUpdate(
        { gymId, revision },
        { $set: { state }, $inc: { revision: 1 } },
        { new: true },
      ).lean();
      if (!saved)
        throw fail(
          "Another action finished first. Refresh to see your equipped look.",
        );
      return view({ ...source, doc: saved });
    },
  };
}
module.exports = { ...repository(), repository };
