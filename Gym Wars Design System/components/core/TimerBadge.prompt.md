Countdown timer display using IBM Plex Mono. Timers are first-class citizens in Gym Wars — they are the primary reason a player opens the app.

```jsx
<TimerBadge value="3d 12h" label="Camp ends" />
<TimerBadge value="0d 45m" urgent />              {/* → corner-red */}
<TimerBadge value="Complete" complete />           {/* → win-green + checkmark */}
<TimerBadge value="6h 30m" size="lg" />
```

Notable variants/props:
- `urgent` triggers corner-red styling — use when < ~6h remaining or shield about to expire
- `complete` triggers win-green with "✓" prefix — replaces `urgent` check
- `label` renders a small overline above the badge (e.g. "Scout refresh", "Camp ends")
- `size` affects badge font size: sm/md/lg
- Always use IBM Plex Mono values; never round to friendly text until < 1h
