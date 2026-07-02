Primary call-to-action for all user interactions. Use `primary` for the single most important action on a screen, `secondary` for alternatives, `ghost` for tertiary/destructive-adjacent, `danger` for irreversible destructive actions.

```jsx
<Button variant="primary" size="md">Start Camp</Button>
<Button variant="secondary" size="md">Set Gameplan</Button>
<Button variant="ghost" size="sm">Cancel</Button>
<Button variant="danger" size="md">Retire Fighter</Button>
<Button variant="tint" size="sm">View Results</Button>
```

Notable variants/props:
- `icon` prop accepts any React node as a leading icon
- `disabled` dims to 50% opacity and blocks pointer events
- Hover automatically darkens primary to `--ember-strong`; secondary/ghost fills to `--ember-tint`
- Never use `primary` twice on the same screen — one CTA per view
