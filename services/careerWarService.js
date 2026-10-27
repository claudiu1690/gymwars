const mongoose = require("mongoose");
const { createHmac } = require("node:crypto");
const Career = require("../models/careerModel");
const {
  Defense,
  Match,
  Rival,
  SeasonRule,
} = require("../models/careerWarModel");
const {
  leagueClubSnapshots,
  lateGymSnapshots,
  botSnapshot,
} = require("../consts/careerExhibitionBots");
const {
  TOTAL_POINTS,
  BEST_TEN,
  defaultSeasonRule,
  powerBand,
  powerBandLabel,
  scoreSeasonCards,
  leaderboardFor,
} = require("../engine/careerWarStandings");
const { CURRENT_FIGHT_VERSION } = require("../engine/fightEngine");
const { publicAllowances, spend, DAY } = require("./careerAllowances");
const { publicWarResult } = require("./careerWarPresentation");
const {
  hash,
  snapshotFor,
  botDefense,
  publicFighter,
  publicDefense,
  resolveWar,
  leagueProgress,
  coverageFor,
  chooseLineup,
  assertComplete,
  fighterStrength,
  divisions,
  fail,
} = require("../engine/careerWarEngine");
const versionPattern = /^[a-f0-9]{64}$/;
const validRevision = (revision) =>
  Number.isSafeInteger(revision) && revision >= 0;
const SEASON_EPOCH = Date.parse("2026-10-09T00:00:00.000Z");
const SEASON_LENGTH = 28 * DAY;
function seasonFor(nowMs) {
  const index = Math.floor((nowMs - SEASON_EPOCH) / SEASON_LENGTH);
  const starts = SEASON_EPOCH + index * SEASON_LENGTH;
  return {
    id: `gym-wars-${index + 1}`,
    label: `Season ${index + 1}`,
    startsAt: new Date(starts).toISOString(),
    endsAt: new Date(starts + SEASON_LENGTH).toISOString(),
  };
}
const savedResult = (match) => ({
  id: String(match._id),
  ...publicWarResult(match.result, match.inputs),
});
function publishedReady(defense, career) {
  if (
    !defense ||
    defense.combatVersion !== CURRENT_FIGHT_VERSION ||
    defense.id !== String(career.gymId)
  )
    return false;
  try {
    assertComplete(defense.lineup);
    const current = chooseLineup(
      career,
      defense.lineup.map((f) => f.id),
    );
    return defense.lineup.every((f) =>
      current.some(
        (owned) => owned.id === f.id && owned.weightClass === f.weightClass,
      ),
    );
  } catch {
    return false;
  }
}
function requestBody(body) {
  if (
    !body ||
    !validRevision(body.revision) ||
    typeof body.requestId !== "string" ||
    !/^[a-zA-Z0-9_-]{8,100}$/.test(body.requestId)
  )
    throw fail("A challenge ID and current career revision are required.", 400);
  if (
    !mongoose.isObjectIdOrHexString(body.opponentId) ||
    !["bot", "player"].includes(body.opponentType) ||
    typeof body.opponentRevision !== "string" ||
    !versionPattern.test(body.opponentRevision)
  )
    throw fail("Choose a published rival defense.", 400);
  // Old partial-card receipts remain retryable. New acceptance validates four below.
  if (
    !Array.isArray(body.fighterIds) ||
    !body.fighterIds.length ||
    body.fighterIds.length > 4 ||
    body.fighterIds.some((id) => typeof id !== "string") ||
    new Set(body.fighterIds).size !== body.fighterIds.length
  )
    throw fail(
      "Choose four different fighters, one per division, for this challenge.",
      400,
    );
  return {
    revision: body.revision,
    opponentId: String(body.opponentId).toLowerCase(),
    opponentType: body.opponentType,
    opponentRevision: body.opponentRevision,
    fighterIds: [...body.fighterIds].sort(),
  };
}
function repository({
  CareerModel = Career,
  DefenseModel = Defense,
  MatchModel = Match,
  RivalModel = Rival,
  SeasonRuleModel = SeasonRule,
  seasonExperiment = process.env.GYMWARS_BEST_TEN_SEASON || null,
  beforeCommit = async () => {},
  beforeLedger = async () => {},
  now = () => Date.now(),
} = {}) {
  let ledgerReady;
  async function ensureLedger() {
    if (!ledgerReady)
      ledgerReady = (async () => {
        await MatchModel.init();
        // Existing ledgers keep every result; only the obsolete game-week lock is removed.
        const indexes = await MatchModel.collection.indexes();
        for (const index of indexes)
          if (
            index.unique &&
            Object.keys(index.key).join(",") === "gymId,week" &&
            index.key.gymId === 1 &&
            index.key.week === 1
          ) {
            try {
              await MatchModel.collection.dropIndex(index.name);
            } catch (error) {
              if (error.code !== 27) throw error;
            } // Another server may already have migrated it.
          }
      })().catch((error) => {
        ledgerReady = null;
        throw error;
      });
    return ledgerReady;
  }
  async function getCareer(gymId, revision) {
    const career = await CareerModel.findOne({ gymId }).lean();
    if (!career) throw fail("Start a career first.", 404);
    if (revision != null && career.revision !== revision)
      throw fail("Your team changed. Refresh the lineup before continuing.");
    return career;
  }
  async function materializeReceipt(gymId, receipt) {
    let saved = await MatchModel.findOne({
      gymId,
      requestId: receipt.requestId,
    }).lean();
    if (!saved) {
      try {
        saved = await MatchModel.create({
          _id: receipt.matchId,
          gymId,
          defenderGymId: receipt.defenderGymId || null,
          week: receipt.week,
          requestId: receipt.requestId,
          requestHash: receipt.requestHash,
          acceptedCardId: receipt.acceptedCardId,
          seasonId: receipt.seasonId,
          inputs: receipt.inputs,
          result: receipt.result,
          createdAt: new Date(receipt.acceptedAt),
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        saved = await MatchModel.findOne({
          gymId,
          requestId: receipt.requestId,
        }).lean();
        if (!saved || saved.requestHash !== receipt.requestHash) throw error;
      }
    }
    // A canonical receipt already represents an accepted/debited card. An
    // inconsistent secondary ledger is an operational failure, never a 4xx
    // rejection that would tell the client to discard its exact retry.
    if (saved.requestHash !== receipt.requestHash)
      throw new Error(
        "Saved challenge receipt does not match its shared ledger.",
      );
    // The durable ledger owns exact retries after this cleanup. Never discard an unmaterialized receipt.
    await CareerModel.updateOne(
      { gymId },
      { $pull: { warReceipts: { requestId: receipt.requestId } } },
    );
    return savedResult(saved);
  }
  async function recoverPending() {
    const pending = await CareerModel.find({
      "warReceipts.0": { $exists: true },
    }).lean();
    for (const career of pending)
      for (const receipt of career.warReceipts || [])
        await materializeReceipt(career.gymId, receipt);
  }
  async function scoringFor(season, freeze = false) {
    const saved = await SeasonRuleModel.findOne({ seasonId: season.id }).lean();
    if (saved)
      return { mode: saved.mode, limit: saved.limit, version: saved.version };
    const rule = defaultSeasonRule(season);
    if (!freeze) return rule;
    await SeasonRuleModel.init();
    try {
      await SeasonRuleModel.create({
        seasonId: season.id,
        ...rule,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await SeasonRuleModel.findOne({
        seasonId: season.id,
      }).lean();
      return {
        mode: concurrent.mode,
        limit: concurrent.limit,
        version: concurrent.version,
      };
    }
    return rule;
  }
  // An explicit, exact future-season opt-in. A persisted rule remains valid on
  // restarts after the season opens; a newly supplied current/past ID is rejected.
  async function configureSeasonExperiment() {
    if (!seasonExperiment) return null;
    const match = /^gym-wars-([1-9]\d*)$/.exec(seasonExperiment);
    if (!match || !Number.isSafeInteger(Number(match[1])))
      throw new Error(
        "GYMWARS_BEST_TEN_SEASON must name one exact future season.",
      );
    const season = seasonFor(
      SEASON_EPOCH + (Number(match[1]) - 1) * SEASON_LENGTH,
    );
    const existing = await SeasonRuleModel.findOne({
      seasonId: season.id,
    }).lean();
    if (existing) {
      if (existing.mode !== BEST_TEN.mode || existing.limit !== BEST_TEN.limit)
        throw new Error("This season already has a frozen scoring rule.");
      return { ...season, scoring: { ...BEST_TEN } };
    }
    if (
      Date.parse(season.startsAt) <= now() ||
      (await MatchModel.exists({ seasonId: season.id }))
    )
      throw new Error(
        "Best-ten scoring can only be scheduled for an unopened future season without results.",
      );
    try {
      await SeasonRuleModel.create({
        seasonId: season.id,
        ...BEST_TEN,
        startsAt: season.startsAt,
        endsAt: season.endsAt,
      });
    } catch (error) {
      if (error.code !== 11000) throw error;
      const concurrent = await SeasonRuleModel.findOne({
        seasonId: season.id,
      }).lean();
      if (
        concurrent?.mode !== BEST_TEN.mode ||
        concurrent?.limit !== BEST_TEN.limit
      )
        throw new Error("This season already has a frozen scoring rule.");
    }
    return { ...season, scoring: { ...BEST_TEN } };
  }
  async function standings(season = seasonFor(now())) {
    const rule = await scoringFor(season);
    const results = await MatchModel.aggregate([
      { $match: { seasonId: season.id } },
      { $sort: { createdAt: -1, _id: -1 } },
      {
        $group: {
          _id: "$gymId",
          name: { $first: "$result.yourGym" },
          cards: {
            $push: {
              id: "$_id",
              createdAt: "$createdAt",
              points: "$result.pointsEarned",
              outcome: "$result.outcome",
              opponentStrength: "$result.opponentStrength",
              competitionBand: "$result.competitionBand",
              opponentId: "$result.opponentId",
              strengthGap: "$result.strengthGap",
            },
          },
        },
      },
    ]);
    return results
      .map(({ _id, name, cards }) => ({
        gymId: String(_id),
        name,
        ...scoreSeasonCards(cards, rule),
      }))
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.scoredWins - a.scoredWins ||
          (rule.mode === "best-ten"
            ? b.oppositionScore - a.oppositionScore
            : 0) ||
          a.gymId.localeCompare(b.gymId),
      )
      .map((item, index, sorted) => ({
        ...item,
        rank: index + 1,
        bandRank: sorted
          .slice(0, index + 1)
          .filter((row) => row.competitionBand === item.competitionBand).length,
      }));
  }
  async function rivalTeams(career, defenders, ladder) {
    const rivalCareers = defenders.length
      ? await CareerModel.find({
          gymId: { $in: defenders.map((d) => d.gymId) },
        }).lean()
      : [];
    const owned = coverageFor(career).strength;
    const yourPoints =
      ladder.find((row) => row.gymId === String(career.gymId))?.points || 0;
    const candidates = [
      ...leagueClubSnapshots().map((bot) => ({ snapshot: botDefense(bot) })),
      ...defenders,
    ];
    return candidates
      .flatMap((item) => {
        const snapshot = item.snapshot;
        try {
          assertComplete(snapshot.lineup);
        } catch {
          return [];
        }
        const rival = rivalCareers.find(
          (doc) => String(doc.gymId) === snapshot.id,
        );
        if (rival && !publishedReady(snapshot, rival)) return [];
        const strength = rival
          ? coverageFor(rival).strength
          : snapshot.lineup.reduce((sum, f) => sum + fighterStrength(f), 0) / 4;
        const gap = strength - owned;
        const scoringGap =
          snapshot.lineup.reduce((sum, f) => sum + fighterStrength(f), 0) / 4 -
          owned;
        const points =
          ladder.find((row) => row.gymId === snapshot.id)?.points || 0;
        return [
          {
            ...publicDefense(snapshot),
            matchup:
              gap < -10 ? "Developing" : gap > 10 ? "Stretch" : "Matched",
            strengthGap: Math.round(gap * 10) / 10,
            scoringNote:
              scoringGap < -10
                ? "Published defense is lower power: first card can earn 1 point; repeat cards earn 0."
                : "Win 3 points · Draw 1. After two cards against this club, wins earn 1.",
            suitability:
              Math.abs(gap) + Math.min(20, Math.abs(points - yourPoints)) / 4,
          },
        ];
      })
      .sort((a, b) => a.suitability - b.suitability || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map(({ suitability, ...item }) => item);
  }
  async function rivalOpponent(career, rival) {
    let snapshot, strength;
    if (rival.opponentType === "bot") {
      const bot = botSnapshot(rival.opponentId);
      if (
        bot &&
        (!bot.challenge || career.state.facilityTier >= bot.challenge.minTier)
      ) {
        snapshot = botDefense(bot);
        strength =
          snapshot.lineup.reduce(
            (sum, fighter) => sum + fighterStrength(fighter),
            0,
          ) / 4;
      }
    } else if (String(career.gymId) !== rival.opponentId) {
      const [published, other] = await Promise.all([
        DefenseModel.findOne({ gymId: rival.opponentId }).lean(),
        CareerModel.findOne({ gymId: rival.opponentId }).lean(),
      ]);
      if (other && publishedReady(published?.snapshot, other)) {
        snapshot = published.snapshot;
        strength = coverageFor(other).strength;
      }
    }
    if (!snapshot)
      return {
        status: "unavailable",
        reason:
          "This club has no compatible active defense. Your shared results are kept.",
        opponent: null,
      };
    const gap = Math.round((strength - coverageFor(career).strength) * 10) / 10;
    const scoringGap =
      snapshot.lineup.reduce(
        (sum, fighter) => sum + fighterStrength(fighter),
        0,
      ) /
        4 -
      coverageFor(career).strength;
    const drifted =
      !!coverageFor(career).missingDivisions.length || Math.abs(gap) > 10;
    return {
      status: drifted ? "drifted" : "matched",
      reason: drifted
        ? "Your teams have grown apart. Your rivalry and results are kept; the board offers closer matchups."
        : "A comparable club. Normal League cards and repeat scoring apply.",
      opponent: {
        ...publicDefense(snapshot),
        strengthGap: gap,
        matchup: gap < -10 ? "Developing" : gap > 10 ? "Stretch" : "Matched",
        scoringNote:
          scoringGap < -10
            ? "Published defense is lower power: first card can earn 1 point; repeat cards earn 0."
            : "Win 3 points · Draw 1. After two cards against this club, wins earn 1.",
      },
    };
  }
  // Direct review is read-only and independent of the five quick suggestions.
  // Battles still validate this published version and spend normal tokens.
  async function reviewOpponent(gymId, opponentType, opponentId) {
    if (
      !["bot", "player"].includes(opponentType) ||
      !mongoose.isObjectIdOrHexString(opponentId) ||
      String(gymId) === String(opponentId).toLowerCase()
    )
      throw fail("Choose another gym to review its current 4v4 team.", 400);
    const career = await getCareer(gymId);
    return rivalOpponent(career, {
      opponentType,
      opponentId: String(opponentId).toLowerCase(),
    });
  }
  async function rivalryFor(career, saved) {
    if (!saved) return null;
    const gymId = new mongoose.Types.ObjectId(career.gymId);
    const filter = {
      $or: [
        { gymId, "result.opponentId": saved.opponentId },
        ...(saved.opponentType === "player"
          ? [
              {
                gymId: new mongoose.Types.ObjectId(saved.opponentId),
                defenderGymId: gymId,
              },
            ]
          : []),
      ],
    };
    const [opponent, history, latest] = await Promise.all([
      rivalOpponent(career, saved),
      MatchModel.find(filter).select("gymId result.outcome").lean(),
      MatchModel.findOne(filter).sort({ createdAt: -1, _id: -1 }).lean(),
    ]);
    const outcomes = history.map((match) => {
      const outcome = match.result.outcome;
      return String(match.gymId) === String(career.gymId)
        ? outcome
        : outcome === "win"
          ? "loss"
          : outcome === "loss"
            ? "win"
            : "draw";
    });
    return {
      version: saved.version,
      opponentId: saved.opponentId,
      opponentType: saved.opponentType,
      division: saved.division || null,
      followedAt: saved.followedAt,
      ...opponent,
      record: {
        matches: outcomes.length,
        wins: outcomes.filter((outcome) => outcome === "win").length,
        losses: outcomes.filter((outcome) => outcome === "loss").length,
        draws: outcomes.filter((outcome) => outcome === "draw").length,
      },
      lastResult: latest
        ? {
            ...savedResult(latest),
            createdAt: latest.createdAt,
            seasonId: latest.seasonId || null,
            direction:
              String(latest.gymId) === String(career.gymId)
                ? "attack"
                : "defense",
            attackerGymId: String(latest.gymId),
            defenderGymId: latest.defenderGymId
              ? String(latest.defenderGymId)
              : null,
          }
        : null,
    };
  }
  async function followRival(gymId, body) {
    if (
      !body ||
      !validRevision(body.revision) ||
      !(
        body.expectedRivalVersion === null ||
        (typeof body.expectedRivalVersion === "string" &&
          versionPattern.test(body.expectedRivalVersion))
      ) ||
      !(body.division == null || divisions.includes(body.division)) ||
      !(
        body.opponentId === null ||
        (mongoose.isObjectIdOrHexString(body.opponentId) &&
          ["bot", "player"].includes(body.opponentType))
      )
    )
      throw fail(
        "Choose a comparable rival and supply the current rivalry version.",
        400,
      );
    await RivalModel.init();
    const career = await getCareer(gymId, body.revision),
      existing = await RivalModel.findOne({ gymId }).lean();
    const opponentId =
      body.opponentId === null ? null : String(body.opponentId).toLowerCase();
    if (
      existing &&
      existing.opponentId === opponentId &&
      existing.opponentType === body.opponentType &&
      (existing.division || null) === (body.division || null)
    )
      return { rivalry: await rivalryFor(career, existing) };
    if ((existing?.version || null) !== body.expectedRivalVersion)
      throw fail(
        "Your saved rival changed. Refresh before choosing another club.",
      );
    if (opponentId === null) {
      if (existing) {
        const removed = await RivalModel.deleteOne({
          gymId,
          version: existing.version,
        });
        if (!removed.deletedCount)
          throw fail("Your saved rival changed. Refresh before clearing it.");
      }
      return { rivalry: null };
    }
    const rival = {
      opponentId,
      opponentType: body.opponentType,
      division: body.division || null,
    };
    const availability = await rivalOpponent(career, rival);
    if (availability.status !== "matched")
      throw fail(
        "Choose a comparable club with a complete active defense from your rival board.",
      );
    const values = {
      ...rival,
      followedAt: new Date(now()),
      version: hash({
        gymId: String(gymId),
        ...rival,
        nonce: String(new mongoose.Types.ObjectId()),
      }),
    };
    await getCareer(gymId, body.revision);
    let saved;
    if (existing) {
      saved = await RivalModel.findOneAndUpdate(
        { gymId, version: existing.version },
        { $set: values },
        { new: true },
      ).lean();
      if (!saved)
        throw fail(
          "Your saved rival changed. Refresh before choosing another club.",
        );
    } else {
      try {
        saved = await RivalModel.create({ gymId, ...values });
      } catch (error) {
        if (error.code !== 11000) throw error;
        throw fail(
          "A rival was chosen in another request. Refresh your rival board.",
        );
      }
    }
    return { rivalry: await rivalryFor(career, saved) };
  }
  async function lobby(gymId) {
    await ensureLedger();
    await recoverPending();
    await configureSeasonExperiment();
    const objectId = new mongoose.Types.ObjectId(gymId),
      season = seasonFor(now());
    season.scoring = await scoringFor(season);
    const [
      career,
      defense,
      defenders,
      history,
      ladder,
      totals,
      savedRival,
      pastSeasons,
    ] = await Promise.all([
      getCareer(gymId),
      DefenseModel.findOne({ gymId }).lean(),
      DefenseModel.find({
        gymId: { $ne: objectId },
        "snapshot.combatVersion": CURRENT_FIGHT_VERSION,
      })
        .sort({ updatedAt: -1 })
        .limit(60)
        .lean(),
      MatchModel.find({
        $or: [{ gymId: objectId }, { defenderGymId: objectId }],
      })
        .sort({ createdAt: -1, _id: -1 })
        .limit(20)
        .lean(),
      standings(season),
      MatchModel.aggregate([
        { $match: { gymId: objectId } },
        {
          $group: {
            _id: null,
            lifetimePoints: { $sum: "$result.pointsEarned" },
            preseasonPoints: {
              $sum: {
                $cond: [
                  { $eq: [{ $ifNull: ["$seasonId", null] }, null] },
                  "$result.pointsEarned",
                  0,
                ],
              },
            },
          },
        },
      ]),
      RivalModel.findOne({ gymId }).lean(),
      MatchModel.aggregate([
        {
          $match: {
            gymId: objectId,
            seasonId: { $type: "string", $ne: season.id },
          },
        },
        {
          $group: {
            _id: "$seasonId",
            latest: { $max: "$createdAt" },
            cards: {
              $push: {
                id: "$_id",
                createdAt: "$createdAt",
                points: "$result.pointsEarned",
                outcome: "$result.outcome",
                opponentStrength: "$result.opponentStrength",
                opponentId: "$result.opponentId",
                strengthGap: "$result.strengthGap",
              },
            },
          },
        },
        { $sort: { latest: -1 } },
      ]),
    ]);
    const seasonArchive = await Promise.all(
      pastSeasons.map(async ({ _id, cards }) => {
        const score = scoreSeasonCards(cards, await scoringFor({ id: _id }));
        return {
          seasonId: _id,
          label: `Season ${_id.split("-").at(-1)}`,
          points: score.points,
          honors: [...score.seasonPennants, ...score.rivalObjectives]
            .filter((item) => item.earned)
            .map((item) => item.name),
        };
      }),
    );
    const available = career.state.fighters.filter(
      (f) => !f.retired && !f.released,
    );
    const coverage = coverageFor(career),
      current = ladder.find((item) => item.gymId === String(gymId));
    const lifetimePoints = totals[0]?.lifetimePoints || 0;
    const band = current?.competitionBand || powerBand(coverage.strength);
    const nextSeason = seasonFor(Date.parse(season.endsAt));
    const historyItems = history.map((match) => ({
      ...savedResult(match),
      seasonId: match.seasonId || null,
      preseason: !match.seasonId,
      createdAt: match.createdAt,
      direction: String(match.gymId) === String(gymId) ? "attack" : "defense",
      attackerGymId: String(match.gymId),
      defenderGymId: match.defenderGymId ? String(match.defenderGymId) : null,
    }));
    const challengeWins = await MatchModel.find({
      gymId: objectId,
      "result.challenge.id": { $exists: true },
      "result.outcome": "win",
    })
      .select("result.challenge.id")
      .lean();
    return {
      challenges: lateGymSnapshots().map((bot) => ({
        ...publicDefense(botDefense(bot)),
        locked: career.state.facilityTier < bot.challenge.minTier,
        complete: challengeWins.some(
          (m) => m.result.challenge.id === bot.challenge.id,
        ),
        scoringNote:
          "Ranked 4v4 · 1 token · normal points and repeat scoring. Win the card to earn a permanent cosmetic crest.",
      })),
      mine: {
        ...publicDefense(
          snapshotFor(career, undefined, { allowIncomplete: true }),
        ),
        revision: career.revision,
        locked: !!coverage.missingDivisions.length,
        missingDivisions: coverage.missingDivisions,
        choices: available.map((f) =>
          publicFighter({
            id: f.id,
            name: f.name,
            style: f.style,
            weightClass: f.weightClass,
            stats: f.stats,
            gameplan: f.gameplan,
            signatureId: f.signatureId,
            portrait: f.portrait,
            rarity: f.rarity,
            record: f.record,
            fatigue: f.fatigue,
            // Owner-only boolean. Never expose a trait list or a reversible
            // hash of the small hidden-trait space through public profiles.
            defenseTraitsCurrent: Boolean(
              defense?.snapshot.lineup.some(
                (saved) =>
                  saved.id === f.id &&
                  JSON.stringify([...(saved.traits || [])].sort()) ===
                    JSON.stringify([...(f.traits || [])].sort()),
              ),
            ),
          }),
        ),
        defenseVersion: defense?.version || null,
        gameplans: defense?.gameplans || {},
        defenseReady: publishedReady(defense?.snapshot, career),
        defense: defense ? publicDefense(defense.snapshot) : null,
      },
      opponents: await rivalTeams(career, defenders, ladder),
      rivalry: await rivalryFor(career, savedRival),
      league: {
        points: current?.points || 0,
        wins: current?.wins || 0,
        losses: current?.losses || 0,
        draws: current?.draws || 0,
        matches: current?.matches || 0,
        countedCards: current?.countedCards || 0,
        rank: current?.bandRank || null,
        competitionBand: band,
        bandLabel: powerBandLabel(band),
        nextSeason: { ...nextSeason, scoring: await scoringFor(nextSeason) },
        seasonPennants:
          current?.seasonPennants ||
          scoreSeasonCards([], season.scoring).seasonPennants,
        rivalObjectives:
          current?.rivalObjectives ||
          scoreSeasonCards([], season.scoring).rivalObjectives,
        seasonArchive,
        playedThisWeek: false,
        weeklyMatchId: null,
        week: career.state.week,
        season,
        allowance: publicAllowances(career.daily, now()).leagueCards,
        lifetimePoints,
        preseasonPoints: totals[0]?.preseasonPoints || 0,
        ...leagueProgress(lifetimePoints),
        leaderboard: leaderboardFor(ladder, gymId, band),
        standings: ladder
          .filter((row) => !row.competitionBand || row.competitionBand === band)
          .slice(0, 50),
      },
      latestDefense:
        historyItems.find((item) => item.direction === "defense") || null,
      history: historyItems,
    };
  }
  async function publishDefense(gymId, body) {
    if (
      !body ||
      !validRevision(body.revision) ||
      !Array.isArray(body.fighterIds) ||
      !(
        body.expectedDefenseVersion === null ||
        (typeof body.expectedDefenseVersion === "string" &&
          versionPattern.test(body.expectedDefenseVersion))
      )
    )
      throw fail(
        "Choose a lineup and supply its current defense version.",
        400,
      );
    await DefenseModel.init();
    const career = await getCareer(gymId, body.revision);
    const existing = await DefenseModel.findOne({ gymId }).lean();
    // A dedicated Gym Wars plan is stored with the team, independently of
    // booked career fights. Legacy clients preserve a fighter's published call.
    const rosterPlans = Object.fromEntries(
      career.state.fighters
        .filter((fighter) => !fighter.retired && !fighter.released)
        .map((fighter) => [
          fighter.id,
          existing?.gameplans?.[fighter.id] ||
            existing?.snapshot.lineup.find((saved) => saved.id === fighter.id)
              ?.gameplan ||
            fighter.gameplan,
        ]),
    );
    const gameplans =
      body.gameplans === undefined
        ? Object.fromEntries(body.fighterIds.map((id) => [id, rosterPlans[id]]))
        : body.gameplans;
    const snapshot = snapshotFor(career, body.fighterIds, { gameplans });
    const savedPlans = {
      ...rosterPlans,
      ...Object.fromEntries(
        snapshot.lineup.map((fighter) => [fighter.id, fighter.gameplan]),
      ),
    };
    if (
      existing?.version === snapshot.version &&
      publishedReady(existing.snapshot, career)
    )
      return {
        defense: publicDefense(existing.snapshot),
        defenseVersion: existing.version,
      };
    if ((existing?.version || null) !== body.expectedDefenseVersion)
      throw fail(
        "Your saved defense changed in another request. Refresh before publishing.",
      );
    await beforeCommit({ type: "defense", snapshot });
    await getCareer(gymId, body.revision);
    let saved;
    if (!existing) {
      try {
        saved = await DefenseModel.create({
          gymId,
          careerRevision: career.revision,
          version: snapshot.version,
          snapshot,
          gameplans: savedPlans,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
        saved = await DefenseModel.findOne({ gymId }).lean();
        if (saved?.version !== snapshot.version)
          throw fail(
            "Another defense was published first. Refresh before publishing.",
          );
      }
    } else {
      saved = await DefenseModel.findOneAndUpdate(
        { gymId, version: body.expectedDefenseVersion },
        {
          $set: {
            careerRevision: career.revision,
            version: snapshot.version,
            snapshot,
            gameplans: savedPlans,
          },
        },
        { new: true },
      ).lean();
      if (!saved) {
        saved = await DefenseModel.findOne({ gymId }).lean();
        if (saved?.version !== snapshot.version)
          throw fail(
            "Another defense was published first. Refresh before publishing.",
          );
      }
    }
    return {
      defense: publicDefense(saved.snapshot),
      defenseVersion: saved.version,
    };
  }
  async function battle(gymId, body) {
    const normalized = requestBody(body),
      requestHash = hash(normalized);
    await ensureLedger();
    const existing = await MatchModel.findOne({
      gymId,
      requestId: body.requestId,
    }).lean();
    if (existing) {
      if (existing.requestHash !== requestHash)
        throw fail("This challenge ID belongs to a different lineup or rival.");
      return savedResult(existing);
    }
    const career = await getCareer(gymId);
    const pending = (career.warReceipts || []).find(
      (receipt) => receipt.requestId === body.requestId,
    );
    if (pending) {
      if (pending.requestHash !== requestHash)
        throw fail("This challenge ID belongs to a different lineup or rival.");
      return materializeReceipt(gymId, pending);
    }
    await configureSeasonExperiment();
    if (career.revision !== normalized.revision)
      throw fail("Your team changed. Refresh the lineup before continuing.");
    if (
      normalized.opponentType === "player" &&
      String(gymId) === normalized.opponentId
    )
      throw fail("Choose another gym.", 400);
    const ownDefense = await DefenseModel.findOne({ gymId }).lean();
    if (!publishedReady(ownDefense?.snapshot, career))
      throw fail(
        "Save your complete four-fighter defense before entering League play.",
      );
    const acceptedAt = now(),
      daily = spend(career.daily, "leagueCards", 1, acceptedAt);
    // Validate ownership first, then require the same published team for both
    // directions. Client-supplied plans never bypass the saved defense.
    snapshotFor(career, normalized.fighterIds);
    if (
      !normalized.fighterIds.every((id) =>
        ownDefense.snapshot.lineup.some((fighter) => fighter.id === id),
      )
    )
      throw fail(
        "Save your selected four-fighter team before playing a ranked card.",
      );
    const attacker = snapshotFor(career, normalized.fighterIds, {
      gameplans: Object.fromEntries(
        ownDefense.snapshot.lineup.map((fighter) => [
          fighter.id,
          fighter.gameplan,
        ]),
      ),
    });
    let defender;
    if (normalized.opponentType === "bot") {
      const bot = botSnapshot(normalized.opponentId);
      if (!bot)
        throw fail("This rival club is unavailable. Refresh the lobby.");
      if (bot.challenge && career.state.facilityTier < bot.challenge.minTier)
        throw fail(
          "Open gym tier " +
            bot.challenge.minTier +
            " before entering this club challenge.",
        );
      defender = botDefense(bot);
    } else {
      const published = await DefenseModel.findOne({
        gymId: normalized.opponentId,
      }).lean();
      if (!published)
        throw fail(
          "This manager has no published defense. Choose another rival.",
        );
      defender = published.snapshot;
      const rivalCareer = await getCareer(normalized.opponentId);
      if (!publishedReady(defender, rivalCareer))
        throw fail(
          "This gym needs to update its complete active defense. Choose another rival.",
        );
    }
    if (defender.version !== normalized.opponentRevision)
      throw fail(
        "The rival defense changed. Refresh the matchup before fighting.",
      );
    assertComplete(defender.lineup);
    const season = seasonFor(acceptedAt),
      sequence = (career.warCardSequence || 0) + 1;
    season.scoring = await scoringFor(season, true);
    // The private, immutable career seed prevents precomputing next-card rolls
    // against public rival teams. Client IDs, browser time and cosmetics never seed combat.
    const acceptedCardId = createHmac("sha256", String(career.state.seed))
      .update(`career-war:${gymId}:${sequence}`)
      .digest("hex");
    const result = resolveWar(attacker, defender, acceptedCardId);
    const ownedStrength = coverageFor(career).strength;
    const strengthGap =
      Math.round(
        (defender.lineup.reduce((sum, f) => sum + fighterStrength(f), 0) / 4 -
          ownedStrength) *
          10,
      ) / 10;
    if (defender.challenge)
      result.challenge = structuredClone(defender.challenge);
    const priorLedger = await MatchModel.find({
      gymId,
      seasonId: season.id,
      "result.opponentId": defender.id,
    })
      .select("requestId")
      .lean();
    const priorPending = (career.warReceipts || []).filter(
      (r) =>
        r.seasonId === season.id &&
        r.result.opponentId === defender.id &&
        !priorLedger.some((match) => match.requestId === r.requestId),
    ).length;
    const prior = priorLedger.length + priorPending,
      easy = strengthGap < -10;
    const pointsEarned =
      result.outcome === "loss"
        ? 0
        : easy
          ? prior
            ? 0
            : 1
          : result.outcome === "draw"
            ? 1
            : prior >= 2
              ? 1
              : 3;
    Object.assign(result, {
      pointsEarned,
      strengthGap,
      weakerOpponent: easy,
      repeatRival: prior > 0,
      opponentStrength:
        Math.round(
          (defender.lineup.reduce((sum, f) => sum + fighterStrength(f), 0) /
            4) *
            10,
        ) / 10,
      competitionBand: powerBand(ownedStrength),
      pointsReason:
        result.outcome === "loss"
          ? "Team loss: 0 points."
          : easy
            ? prior
              ? "Repeat developing rival: 0 points. Choose a closer matchup to score."
              : "Developing rival: 1 point. Closer matchups award up to 3."
            : prior >= 2 && result.outcome === "win"
              ? "Repeat rival: 1 point after two cards against this club this season."
              : result.outcome === "draw"
                ? "Equal bout wins: team draw, 1 point."
                : result.outcome === "win"
                  ? "Team win: 3 points."
                  : "Team loss: 0 points.",
      acceptedCardId,
      seasonId: season.id,
      season,
      scoringVersion: 2,
      revision: career.revision + 1,
      allowance: publicAllowances(daily, acceptedAt).leagueCards,
    });
    const receipt = {
      matchId: String(new mongoose.Types.ObjectId()),
      requestId: body.requestId,
      requestHash,
      acceptedCardId,
      acceptedAt: new Date(acceptedAt).toISOString(),
      seasonId: season.id,
      defenderGymId:
        normalized.opponentType === "player" ? normalized.opponentId : null,
      week: career.state.week,
      inputs: { attacker, defender },
      result,
    };
    await beforeCommit({ type: "battle", attacker, defender, result });
    const saved = await CareerModel.findOneAndUpdate(
      { gymId, revision: career.revision },
      {
        $set: { daily },
        $inc: { revision: 1, warCardSequence: 1 },
        $push: { warReceipts: receipt },
      },
      { new: true },
    ).lean();
    if (!saved) {
      const committedLedger = await MatchModel.findOne({
        gymId,
        requestId: body.requestId,
      }).lean();
      if (committedLedger) {
        if (committedLedger.requestHash !== requestHash)
          throw fail(
            "This challenge ID belongs to a different lineup or rival.",
          );
        return savedResult(committedLedger);
      }
      const latest = await getCareer(gymId),
        committed = (latest.warReceipts || []).find(
          (r) => r.requestId === body.requestId,
        );
      if (committed) {
        if (committed.requestHash !== requestHash)
          throw fail(
            "This challenge ID belongs to a different lineup or rival.",
          );
        return materializeReceipt(gymId, committed);
      }
      const recovered = await MatchModel.findOne({
        gymId,
        requestId: body.requestId,
      }).lean();
      if (recovered) {
        if (recovered.requestHash !== requestHash)
          throw fail(
            "This challenge ID belongs to a different lineup or rival.",
          );
        return savedResult(recovered);
      }
      throw fail(
        "Another action finished first. Refresh to see your saved team and cards.",
      );
    }
    await beforeLedger(receipt); // An interruption here leaves a recoverable result and debit in the same document.
    return materializeReceipt(gymId, receipt);
  }
  return {
    lobby,
    publishDefense,
    battle,
    standings,
    recoverPending,
    followRival,
    reviewOpponent,
    configureSeasonExperiment,
  };
}
module.exports = { ...repository(), repository, seasonFor, publishedReady };
