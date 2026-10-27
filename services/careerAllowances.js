// Only the repository supplies time. Calendar weeks never refill these banks.
const DAY = 24 * 60 * 60 * 1000;
const previewMode = () =>
  process.env.LOCAL_MODE === "true" &&
  process.env.SHOP_PREVIEW_ENABLED === "true" &&
  process.env.NODE_ENV !== "production";
const bonusKey = (preview) => (preview ? "extraPreview" : "extraLive");
const availableBalance = (bank, { preview = previewMode() } = {}) =>
  (bank?.balance || 0) + (bank?.[bonusKey(preview)] || 0);
const RULES = Object.freeze({
  careerWeeks: Object.freeze({ initial: 8, refill: 4, maximum: 12 }),
  leagueCards: Object.freeze({ initial: 1, refill: 1, maximum: 3 }),
});
const timestamp = (value) => {
  const n = value instanceof Date ? value.getTime() : Number(value);
  if (!Number.isFinite(n))
    throw new Error("A trusted server timestamp is required.");
  return n;
};
function materialize(saved, nowMs = Date.now()) {
  const now = timestamp(nowMs);
  const anchor = saved?.anchorAt ? Date.parse(saved.anchorAt) : now;
  if (!Number.isFinite(anchor))
    throw new Error("Invalid saved allowance schedule.");
  const elapsed = Math.max(0, Math.floor((now - anchor) / DAY));
  const next = { anchorAt: new Date(anchor).toISOString() };
  for (const [kind, rule] of Object.entries(RULES)) {
    const bank = saved?.[kind];
    const interval = Number.isSafeInteger(bank?.interval)
      ? Math.max(0, bank.interval)
      : 0;
    const balance = Number.isSafeInteger(bank?.balance)
      ? Math.max(0, bank.balance)
      : rule.initial;
    // Advance through discarded refills too: a full bank has no hidden backlog.
    next[kind] = {
      // Server-issued playtest/support grants survive above the refill cap.
      // Refills still stop at the ordinary maximum and never grow that grant.
      balance: Math.max(
        balance,
        Math.min(
          rule.maximum,
          balance + Math.max(0, elapsed - interval) * rule.refill,
        ),
      ),
      interval: Math.max(interval, elapsed),
      ...(Number.isSafeInteger(bank?.extraPreview) && bank.extraPreview > 0
        ? { extraPreview: bank.extraPreview }
        : {}),
      ...(Number.isSafeInteger(bank?.extraLive) && bank.extraLive > 0
        ? { extraLive: bank.extraLive }
        : {}),
    };
  }
  return next;
}
function publicAllowances(
  saved,
  nowMs = Date.now(),
  { preview = previewMode() } = {},
) {
  const next = materialize(saved, nowMs);
  const view = {
    anchorAt: next.anchorAt,
    serverNow: new Date(timestamp(nowMs)).toISOString(),
  };
  for (const [kind, rule] of Object.entries(RULES)) {
    view[kind] = {
      available: availableBalance(next[kind], { preview }),
      freeAvailable: next[kind].balance,
      extraAvailable: next[kind][bonusKey(preview)] || 0,
      maximum: rule.maximum,
      refill: rule.refill,
      nextRefillAt: new Date(
        Date.parse(next.anchorAt) + (next[kind].interval + 1) * DAY,
      ).toISOString(),
    };
  }
  return view;
}
function spend(
  saved,
  kind,
  amount,
  nowMs = Date.now(),
  { preview = previewMode() } = {},
) {
  if (!RULES[kind] || !Number.isSafeInteger(amount) || amount < 0)
    throw new Error("Invalid allowance consumption.");
  const next = materialize(saved, nowMs);
  if (availableBalance(next[kind], { preview }) < amount) {
    const label = kind === "careerWeeks" ? "career weeks" : "league cards";
    throw Object.assign(
      new Error(
        `No ${label} ready. Team planning and ready fights are still available.`,
      ),
      {
        statusCode: 409,
        expose: true,
        code: "ALLOWANCE_EMPTY",
      },
    );
  }
  const free = Math.min(amount, next[kind].balance);
  next[kind].balance -= free;
  if (amount > free) next[kind][bonusKey(preview)] -= amount - free;
  return next;
}
function grant(saved, kind, amount, channel, nowMs = Date.now()) {
  if (
    !RULES[kind] ||
    !Number.isSafeInteger(amount) ||
    amount < 1 ||
    !["preview", "live"].includes(channel)
  )
    throw new Error("Invalid supply grant.");
  const next = materialize(saved, nowMs),
    key = bonusKey(channel === "preview");
  next[kind][key] = (next[kind][key] || 0) + amount;
  if (!Number.isSafeInteger(next[kind][key]))
    throw new Error("Supply balance exceeds supported range.");
  return next;
}
module.exports = {
  DAY,
  RULES,
  materialize,
  publicAllowances,
  spend,
  grant,
  availableBalance,
};
