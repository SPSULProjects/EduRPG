# UI Requirements (for shadcn/ui)

## Components to Use
- **Button**: primary/secondary/destructive; loading states.
- **Card**: dashboard tiles, job cards, progress/achievements.
- **Dialog**: first‑login policy, review job applicants.
- **Table**: class lists, job assignments, sync status.
- **Form**: login, XP grant, create job/item/achievement/event.
- **Toast**: success/error feedback for actions.

## Themes / Tokens
- **Rarity Colors**: bronze, silver, gold, emerald, diamond.
- **Spacing**: 4/8/12/16 px scale; **Radius**: 12–16px for cards.
- **Typography**: Titles (xl–2xl), body (base), captions (sm).

## Accessibility
- ARIA labels for interactive controls.
- Keyboard navigable; visible focus ring.
- Contrast ≥ WCAG AA.
- Czech default texts from i18n JSON.

## Responsiveness
- Mobile first; adapts cleanly to 8K screens without content stretching.
- Avoid layout shifts; lazy‑load long lists.
