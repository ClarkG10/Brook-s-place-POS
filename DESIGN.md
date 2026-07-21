# Design System — Brook's Place

These rules are derived from the **UI/UX Pro Max** skill and are enforced across both frontends.
The shared implementation lives in `packages/ui` (tokens) and each app's `tailwind` config.

## Non-negotiable checklist (every screen)

- [ ] **No emoji as icons** — use Lucide (SVG) icons only.
- [ ] **`cursor-pointer`** on every interactive element.
- [ ] **Hover states** with smooth `150–300ms` transitions.
- [ ] **Text contrast ≥ 4.5:1** (light) and validated in dark mode (admin only).
- [ ] **Keyboard navigable** with a **visible focus ring** on every focusable element.
- [ ] **`prefers-reduced-motion`** honored — animations disabled/reduced when set.
- [ ] Responsive at **375 / 768 / 1024 / 1440** px.
- [ ] Meaningful **empty / loading (skeleton) / success / error** states.
- [ ] **Large touch targets** (min 44×44px) for tablet & phone.

## Color hierarchy

Coffee-house warm palette. Tokens are CSS variables (HSL) so branding can later be themed per shop.

| Token | Role | Light |
|-------|------|-------|
| `--primary` | Brand / primary actions | `25 65% 31%` (espresso brown) |
| `--accent` | CTA / highlights | `32 95% 44%` (warm amber) |
| `--background` | Page bg | `36 33% 97%` (cream) |
| `--foreground` | Body text | `25 25% 15%` |
| `--muted` | Secondary surfaces | `36 20% 92%` |
| `--success` / `--warning` / `--danger` | Stock & status | green / amber / red |

**Inventory status colors** (Low-Stock Intelligence): `green → yellow → orange → red`.

## Typography

- Display / headings: **Poppins** (geometric, friendly).
- Body / UI: **Inter**.
- Consistent scale, generous line-height, clear hierarchy.

## Motion

- General transitions `200–300ms`, gentle easing (`ease-out`).
- Soft shadows + subtle scale on press for touch feedback.
- Framer Motion for page/route and cart transitions; all wrapped to respect reduced-motion.

## Surfaces

- **Customer (order) app:** bright, high-contrast, image-forward product cards, big tap targets. Light only.
- **Staff (admin) app:** data-dense but calm; **dark-mode supported**.
