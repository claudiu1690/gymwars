/**
 * Fight commentary — seeded template picks, sports-desk register per the
 * design system's content rules: present tense, dry, no hype.
 */
function pick(rng, arr) {
    return arr[Math.floor(rng() * arr.length)];
}

const commentary = {
    roundStart: (rng, r) => pick(rng, [
        `Round ${r} begins.`,
        `Round ${r}. They touch gloves.`,
        `Round ${r} underway.`,
    ]),
    roundEnd: (rng, r) => pick(rng, [
        `End of Round ${r}.`,
        `The horn sounds — Round ${r} is over.`,
        `Round ${r} goes to the cards.`,
    ]),
    bigStrike: (rng, a, b) => pick(rng, [
        `${a} lands a clean right hand. ${b} feels it.`,
        `${a} digs a heavy leg kick. ${b} switches stance.`,
        `${a} counters over the top. ${b} backs off.`,
        `${a} lands a sharp combination. ${b} covers up.`,
        `${a} finds the body. ${b} breathes hard.`,
    ]),
    knockdown: (rng, a, b) => pick(rng, [
        `${a} drops ${b} with a right hand.`,
        `${b} is down — ${a} connects flush.`,
        `${a} catches ${b} clean. ${b} hits the canvas.`,
    ]),
    ko: (rng, a, b) => pick(rng, [
        `KO — ${a} lands the finishing shot. ${b} is out. Fight over.`,
        `It's over. ${a} knocks ${b} out cold.`,
    ]),
    tko: (rng, a, b) => pick(rng, [
        `TKO — ${a} pours it on and the referee steps in. Fight over.`,
        `${b} can't answer back. The referee waves it off — TKO for ${a}.`,
    ]),
    tkoGround: (rng, a, b) => pick(rng, [
        `TKO — ${a} rains down ground strikes. The referee has seen enough.`,
        `${a} takes the back and flattens ${b} out. Referee stoppage — TKO.`,
    ]),
    takedown: (rng, a, b) => pick(rng, [
        `${a} shoots and finishes the takedown. ${b} is on the mat.`,
        `${a} chains a double-leg. ${b} lands on bottom.`,
        `${a} drags ${b} down against the fence.`,
    ]),
    takedownStuffed: (rng, a, b) => pick(rng, [
        `${a} shoots — ${b} sprawls and defends.`,
        `${a} changes levels but ${b} stuffs it.`,
        `${b} shrugs off the takedown attempt.`,
    ]),
    submission: (rng, a, b) => pick(rng, [
        `SUB — ${a} locks in the choke. ${b} taps. Fight over.`,
        `${a} isolates the arm. ${b} has to tap — submission.`,
    ]),
    submissionOffBack: (rng, a, b) => pick(rng, [
        `SUB — ${a} throws up a triangle off the back. ${b} taps. Fight over.`,
        `${a} sweeps into an armbar from guard. ${b} taps — submission.`,
    ]),
    subEscape: (rng, a, b) => pick(rng, [
        `${a} hunts a submission — ${b} scrambles free.`,
        `${a} threatens the choke but ${b} defends and escapes.`,
        `${a} attacks the arm. ${b} pulls it clear.`,
    ]),
};

module.exports = { commentary };
