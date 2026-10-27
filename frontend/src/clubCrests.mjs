import crests from "../../consts/clubCrests.json" with { type: "json" };

export const clubCrestArt = (lookId) =>
  Object.hasOwn(crests, lookId) ? crests[lookId] : null;
