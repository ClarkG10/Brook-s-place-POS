# Roadmap

## ✅ Phase 0 — Foundation + thin slice (current)

**Backend (Laravel 13 + MySQL)**
- Sanctum token auth, staff roles (owner/manager/cashier/barista)
- Configurable single-store **Settings** (shop name, tagline, currency, tax, receipt text)
- Per-surface **color palettes** (public + admin) resolved from `config/palettes.php`
- Domain: categories, products, option groups/options, ingredients (+packaging), recipes, orders, order items
- **Smart inventory service**: max-producible per drink, limiting ingredient, auto sold-out, low-stock traffic-lights, auto-deduction on order completion
- Cached catalog + settings with automatic invalidation
- REST API: public (settings, menu, place order, order status) + admin (auth, dashboard, settings, orders, inventory)
- Seeders: Brook's Place demo menu + inventory + staff

**Shared design system** (`packages/ui`)
- Runtime theming via CSS variables (`applyTheme`), driven by the API palette
- Tokens + Tailwind preset + core components (Button, Card, Badge, Input, Label, Skeleton, Spinner, EmptyState)
- Built to the **UI/UX Pro Max** skill's standards (no emoji icons, focus rings, 150–300ms motion, reduced-motion, 4.5:1 contrast)

**Public ordering app** (`apps/order`) — no login
- QR table capture → welcome → menu (categories + availability) → customize (size/sugar/ice/add-ons/notes) → cart → checkout → live order status

**Admin portal** (`apps/admin`) — login
- Dashboard (today's sales, orders, avg, active, low-stock alert, 7-day revenue, top drinks)
- Orders queue (kitchen/bar view, one-touch status advance, auto-refresh)
- Settings (editable shop name + palette pickers for both surfaces, live admin re-theme)

## ▶ Phase 1 — Next
- POS screen (staff-created orders, discounts, payment capture, change due)
- Receipt printing (Bluetooth / network / USB) with the templated layout
- Product & category CRUD, recipe builder UI, inventory restock UI
- Reports (daily/weekly/monthly, CSV/Excel/PDF export)
- QR code generator for tables

## ▶ Phase 2 — Scale
- Real-time order updates (websockets/broadcasting) instead of polling
- Redis cache/queue in production, queued receipt jobs
- Kitchen Display System, digital menu boards
- Loyalty, promotions/coupons, online ordering & pickup

## ▶ Phase 3 — Future-ready
- Multi-branch / multi-tenant (schema already isolates a single store cleanly)
- AI sales forecasting + automated purchasing suggestions
- Multi-language / multi-currency

## Notes
- Local dev cache/queue use the `database` driver; production uses Redis (see `backend/.env.example`).
- The **UI/UX Pro Max** skill is auto-applied on every frontend edit via the `PostToolUse` hook in `.claude/settings.json` (see `.claude/hooks/uiux-reminder.sh`).
