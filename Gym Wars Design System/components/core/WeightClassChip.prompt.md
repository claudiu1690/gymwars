Small pill chip labeling a fighter's weight class. Accepts full names or abbreviations — normalizes to the standard 8-class MMA ladder.

```jsx
<WeightClassChip weightClass="lightweight" />            {/* → LW */}
<WeightClassChip weightClass="Lightweight" variant="full" /> {/* → Lightweight */}
<WeightClassChip weightClass="HW" />                     {/* → HW */}
```

Notable variants/props:
- `variant="short"` (default) shows the 2–3-letter abbreviation
- `variant="full"` shows the full weight class name — use in detail / GamePlan screens
- Rendered in `--surface-sunken` with `--ink-secondary` text — intentionally quiet; not the hero data
