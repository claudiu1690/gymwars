/**
 * Seeded RNG — the whole sim layer draws from this, never Math.random().
 * Seeds are stored on the documents they produced (fighters, fights) so any
 * generation or fight can be replayed exactly. mulberry32 + xmur3: tiny,
 * fast, and plenty for game randomness (not cryptographic).
 */

/** Hash an arbitrary string seed into a 32-bit int. */
function xmur3(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) {
        h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
        h = (h << 13) | (h >>> 19);
    }
    return () => {
        h = Math.imul(h ^ (h >>> 16), 2246822507);
        h = Math.imul(h ^ (h >>> 13), 3266489909);
        return (h ^= h >>> 16) >>> 0;
    };
}

function mulberry32(a) {
    return () => {
        a |= 0;
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

/**
 * Create a seeded RNG from any string. Returns a callable `rng()` → [0,1)
 * with helpers attached.
 */
function createRng(seed) {
    const rng = mulberry32(xmur3(String(seed))());

    /** Integer in [min, max] inclusive. */
    rng.int = (min, max) => min + Math.floor(rng() * (max - min + 1));

    /** Pick one element. */
    rng.pick = (arr) => arr[Math.floor(rng() * arr.length)];

    /**
     * Weighted pick from entries [{key, weight}, ...] or an object
     * {key: weight}. Returns the key.
     */
    rng.weighted = (weights) => {
        const entries = Array.isArray(weights)
            ? weights.map((e) => [e.key, e.weight])
            : Object.entries(weights);
        const total = entries.reduce((s, [, w]) => s + w, 0);
        let roll = rng() * total;
        for (const [key, w] of entries) {
            roll -= w;
            if (roll <= 0) return key;
        }
        return entries[entries.length - 1][0];
    };

    /** Sample n distinct elements. */
    rng.sample = (arr, n) => {
        const pool = [...arr];
        const out = [];
        while (out.length < n && pool.length > 0) {
            out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
        }
        return out;
    };

    return rng;
}

/** Fresh random seed string (uses entropy — only for creating NEW seeds,
 *  which are then persisted; all derived randomness is seeded). */
function newSeed() {
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

module.exports = { createRng, newSeed };
