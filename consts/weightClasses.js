/**
 * Weight classes — GDD §4.2. Four at MVP, no class-switching once signed.
 * `styleLean` nudges the generator so each division has its documented
 * texture (featherweights finish by submission, heavyweights by KO).
 */
const WEIGHT_CLASSES = {
    featherweight: { label: "Featherweight", order: 1, styleLean: { "muay-thai": 1, boxing: 1, bjj: 2, sambo: 1 } },
    lightweight:   { label: "Lightweight",   order: 2, styleLean: {} }, // deepest division — no lean
    middleweight:  { label: "Middleweight",  order: 3, styleLean: {} },
    heavyweight:   { label: "Heavyweight",   order: 4, styleLean: { boxing: 2, "muay-thai": 1, wrestling: 2 } },
};

module.exports = { WEIGHT_CLASSES };
