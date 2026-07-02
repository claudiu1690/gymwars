THE hero component of Gym Wars. Appears on every major screen: Roster, Scouting, Matchups, Defense Lineup. Three variants for three contexts.

```jsx
// List row — compact, scannable, used in the Roster list
<FighterCard
  variant="compact"
  name="Marcus Vega"
  weightClass="lightweight"
  style="boxer"
  age={26}
  careerPhase="Prime"
  stats={{ striking: 76, grappling: 61, submissions: 44, conditioning: 68 }}
  record={{ wins: 12, losses: 3 }}
  rarity="contender"
  status={{ type: 'in-camp', countdown: '3d 12h' }}
/>

// Grid card — 2-3 col grid on Roster desktop
<FighterCard variant="grid" ... />

// Detail header — top of Fighter Detail screen
<FighterCard variant="detail" ... />
```

Notable variants/props:
- `rarity` controls the glow/box-shadow on the card border — never use color fill for rarity
- `careerPhase` color-codes the phase label: Rising → green, Prime → ember, Declining → warn
- Stats auto-color their bar: ≥60 ember, 35–59 gray, <35 warn
- `status.countdown` only renders for `in-camp` and `shielded`
- Portrait is a colored silhouette placeholder pending the portrait pipeline
