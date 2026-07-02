Scouting card showing noisy stat ranges (not exact values) and pity progress. A compliance requirement: pity progress MUST always be visible.

```jsx
<ScoutReport
  region="Southeast Asia"
  styleLean="Striker"
  rarityRevealed={false}
  statRanges={{ striking: [42, 55], grappling: [30, 48], submissions: [20, 35], conditioning: [55, 70] }}
  pityCount={4}
  pityMax={7}
  guaranteedTier="Contender+"
  onSign={() => signFighter(id)}
  onPass={() => passFighter(id)}
/>

// After reveal ceremony:
<ScoutReport rarityRevealed rarityTier="contender" ... />
```

Notable variants/props:
- Stat ranges are intentionally noisy — never show exact values before signing
- `rarityRevealed={false}` hides the tier and shows "? Rarity"
- `rarityRevealed={true}` + `rarityTier` shows the tier with rarity color + glow on the card
- Pity bar + text is ALWAYS visible regardless of reveal state (legal requirement per GDD §6.2)
- `guaranteedTier` defaults to "Contender+" — change if the pity pool guarantees a different tier
