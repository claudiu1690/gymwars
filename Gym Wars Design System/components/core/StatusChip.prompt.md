Pill chip indicating a fighter's current status. Appears on every FighterCard variant and in the dashboard camp list.

```jsx
<StatusChip status="in-camp"    countdown="3d 12h" />
<StatusChip status="fight-ready" />
<StatusChip status="fatigued" />
<StatusChip status="shielded"   countdown="6h 30m" />
<StatusChip status="retiring" />
```

Notable variants/props:
- Color-coded: in-camp → ember, fight-ready → green, fatigued → warn, shielded/retiring → muted
- `countdown` only renders for `in-camp` and `shielded` — omit for others
- `size="sm"` for use inside compact FighterCard row
- Never show `fight-ready` and a countdown simultaneously
