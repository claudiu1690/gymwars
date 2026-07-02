Badge showing a fighter's fighting style archetype. 6 archetypes in 3 families: Striker (Boxer, Muay Thai), Grappler (Wrestler, Judo), Hybrid (MMA, BJJ).

```jsx
<StyleBadge style="boxer" />
<StyleBadge style="wrestler" />
<StyleBadge style="bjj" showFamily />  {/* → "BJJ · Hybrid" */}
<StyleBadge style="muay-thai" />
```

Notable variants/props:
- Striker styles render in corner-red tint (not as danger — purely categorical)
- Grappler styles render in ember tint
- Hybrid styles render in neutral surface-sunken
- `showFamily={true}` appends the family label — use in detail / scout report contexts
