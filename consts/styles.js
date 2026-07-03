/**
 * Combat styles — GDD §3.2. Six named archetypes in three families that
 * reproduce the real MMA trinity: wrestling beats striking, striking beats
 * jiu-jitsu, jiu-jitsu beats wrestling.
 */
const STYLE_FAMILIES = {
    striking:   { label: "Striking",   primaryStat: "striking",    beats: "submission", losesTo: "wrestling" },
    wrestling:  { label: "Wrestling",  primaryStat: "grappling",   beats: "striking",   losesTo: "submission" },
    submission: { label: "Submission", primaryStat: "submissions", beats: "wrestling",  losesTo: "striking" },
};

const STYLES = {
    boxing:      { label: "Boxing",    family: "striking" },
    "muay-thai": { label: "Muay Thai", family: "striking" },
    wrestling:   { label: "Wrestling", family: "wrestling" },
    judo:        { label: "Judo",      family: "wrestling" },
    bjj:         { label: "BJJ",       family: "submission" },
    sambo:       { label: "Sambo",     family: "submission" },
};

/** Draft matchup modifiers (GDD §3.2/§7.1) — favorable ≈ +15%, unfavorable ≈ −10%. */
const MATCHUP_MODIFIERS = { favorable: 0.15, unfavorable: -0.10, neutral: 0 };

module.exports = { STYLE_FAMILIES, STYLES, MATCHUP_MODIFIERS };
