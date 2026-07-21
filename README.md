# Brook's Place — Smart Beverage POS

A modern, cloud-based POS for coffee shops, milk-tea stores, cafés, juice & smoothie bars.
The shop name ("Brook's Place" by default) and branding are **configurable in Settings** — they are
not hard-coded.

The platform is two separate frontends sharing one Laravel backend:

| App | Path | Auth | Purpose |
|-----|------|------|---------|
| **Admin Portal** | `apps/admin` | Login required | POS, orders, kitchen queue, inventory, products, reports, settings |
| **Public Ordering** | `apps/order` | No login | QR / tablet / phone self-ordering |
| **Backend API** | `backend` | Sanctum tokens | REST API, smart inventory, queues, caching |
| **Design System** | `packages/ui` | — | Shared tokens + components |

## Stack

- **Frontend:** React + TypeScript + Vite + TailwindCSS + shadcn/ui + TanStack Query + React Router + Framer Motion + React Hook Form + Zod + PWA
- **Backend:** Laravel 13 (REST API), **MySQL**, Redis cache + queue (production), Sanctum auth
- **Deploy:** Frontends → Vercel, Backend → Laravel Forge

> The app uses **MySQL**. Create a database named `brooks_place` (or edit `backend/.env`).
> Locally the cache/queue use the `database` driver so Redis isn't required for dev;
> production uses **Redis** — see `backend/.env.example`.

## Quick start

```bash
# 1. Install JS deps (workspaces)
npm install

# 2. Backend
cd backend
composer install
cp .env.example .env
php artisan key:generate
# Ensure MySQL is running and a database exists:
mysql -e "CREATE DATABASE IF NOT EXISTS brooks_place CHARACTER SET utf8mb4;"
php artisan migrate:fresh --seed        # creates schema + Brook's Place demo data
php artisan serve                       # http://127.0.0.1:8000

# 3. Frontends (from repo root, separate terminals)
npm run dev:order     # public ordering  -> http://localhost:5173
npm run dev:admin     # admin portal     -> http://localhost:5174
```

Demo admin login is printed by the seeder (default `owner@brooks.place` / `password`).

## Documentation

- [`DESIGN.md`](./DESIGN.md) — design-system rules (applied from the UI/UX Pro Max skill)
- [`docs/ROADMAP.md`](./docs/ROADMAP.md) — build phases & what's next
