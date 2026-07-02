Horizontal stat bar with label and monospaced number. Used inside FighterCard for the four core stats (Striking, Grappling, Submissions, Conditioning).

```jsx
<StatBar label="Striking"    value={76} />
<StatBar label="Grappling"   value={61} />
<StatBar label="Submissions" value={44} size="sm" />
<StatBar label="Conditioning" value={30} />  {/* renders in --warn color */}
```

Notable variants/props:
- `size="sm"` tightens label width and bar height — use inside compact FighterCard
- Bar color auto-shifts: ≥60 ember, 35–59 ink-secondary, <35 warn (signals atrophy risk)
- `showLabel={false}` hides the text label — useful in space-constrained layouts
- Value is clamped to 0–100; hidden potential is never shown
