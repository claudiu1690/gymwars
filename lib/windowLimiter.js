// Bounded, process-local security-email throttling. The production deployment
// uses one application replica; share this store before horizontal scaling.
function windowLimiter({ limit, windowMs, maxKeys = 10000, now = Date.now }) {
  const entries = new Map();
  return (key) => {
    const time = now();
    let entry = entries.get(key);
    if (entry && entry.until <= time) {
      entries.delete(key);
      entry = undefined;
    }
    if (!entry) {
      if (entries.size >= maxKeys) {
        for (const [savedKey, saved] of entries) {
          if (saved.until <= time) entries.delete(savedKey);
        }
      }
      // Do not evict active limits and let callers bypass them with new keys.
      if (entries.size >= maxKeys) return false;
      entry = { count: 0, until: time + windowMs };
      entries.set(key, entry);
    }
    return ++entry.count <= limit;
  };
}
module.exports = { windowLimiter };
