# Deployment

Three deployables live in this one monorepo:

| Piece | Path | Host |
|-------|------|------|
| Backend API (Laravel) | `backend/` | **Laravel Forge** |
| Customer ordering app | `apps/order/` | **Vercel** (project #1) |
| Admin portal | `apps/admin/` | **Vercel** (project #2) |

Deploy the **backend first** (you need its URL for the frontends), then the two frontends.

Auth is **Sanctum bearer tokens** (no cookies), so cross-origin is just a CORS allow-list — no shared-domain/SPA-cookie setup needed.

---

## 1. Backend → Laravel Forge

### 1.1 Server
Provision a server with **PHP 8.3+**, **MySQL 8**, and **Redis** (Forge offers all three at creation).

### 1.2 Site
- **Create a site** on the server, e.g. `api.brooks.place`.
- **Repository:** `ClarkG10/Brook-s-place-POS`, branch `main`.
- **IMPORTANT — monorepo directories** (Forge → site → *Meta/Directories*): set **Root directory = `/backend`** and **Web directory = `/public`**. Forge then serves `…/current/backend/public` and runs the deploy context inside `backend/`. (On older Forge without a Root-directory field, instead set Web Directory to `/backend/public`.)
- Enable **Let's Encrypt SSL**.

### 1.3 Database
In Forge → **Database**, create a database (e.g. `brooks_place`) and a user; note the credentials.

### 1.4 Environment
Forge → **Environment**. Set:

```dotenv
APP_NAME="Brook's Place"
APP_ENV=production
APP_KEY=            # click "Generate" in Forge, or: php artisan key:generate --show
APP_DEBUG=false
APP_URL=https://api.brooks.place     # MUST be this API's own domain (used for uploaded image URLs)

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=brooks_place
DB_USERNAME=forge
DB_PASSWORD=xxxxxxxx

# Production uses Redis for cache + queue
CACHE_STORE=redis
QUEUE_CONNECTION=redis
SESSION_DRIVER=redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# Lock the API to your two Vercel URLs (comma-separated, no trailing slash)
CORS_ALLOWED_ORIGINS=https://order.brooks.place,https://admin.brooks.place
```

### 1.5 Deploy script
The deploy script runs from the **repo root** (`$FORGE_RELEASE_DIRECTORY` = `…/releases/NNN`) — Forge's "Root directory" setting only changes what Nginx serves, **not** the script's working dir. So the script must `cd` into `backend/`. Forge → **Deployments → Deploy Script**:

```bash
$CREATE_RELEASE()

cd $FORGE_RELEASE_DIRECTORY/backend

$FORGE_COMPOSER install --no-dev --no-interaction --prefer-dist --optimize-autoloader
$FORGE_PHP artisan migrate --force
$FORGE_PHP artisan app:create-owner --if-missing --no-interaction
$FORGE_PHP artisan storage:link
$FORGE_PHP artisan optimize

$ACTIVATE_RELEASE()

$RESTART_QUEUES()
```

- **`app:create-owner --if-missing --no-interaction`** runs right after `migrate`: it ensures the store settings row and, **only if no owner exists yet**, bootstraps the first owner from `OWNER_EMAIL` / `OWNER_USERNAME` / `OWNER_PASSWORD` (set these in the Forge env). `--if-missing` means later deploys skip it, so a password the owner changes in-app is never overwritten; run non-interactively with no `OWNER_*` env it simply skips (never hangs or fails the deploy). Omit these env vars and it's a harmless no-op — create the owner manually per §1.8 instead.

- **`cd $FORGE_RELEASE_DIRECTORY/backend`** — `$FORGE_RELEASE_DIRECTORY` is the repo root; the Laravel app is in `backend/` (fixes *"could not find a composer.json file in …/releases/NNN"*).
- **Do NOT add `ln -nsf ../.env .env`.** With **Root directory = `/backend`**, Forge already links the real env at `backend/.env`. A bridge symlink overwrites it with a broken link → Laravel can't read `.env` → falls back to the framework default `DB_CONNECTION=sqlite`, silently migrating into a throwaway `database/database.sqlite` instead of MySQL.
- **Keep the leading `$` on all three macros** — `CREATE_RELEASE()` without `$` is parsed as a function definition → `syntax error near unexpected token 'cd'`.
- **Remove the default `npm ci` / `npm run build` lines** — the frontends deploy to Vercel; this backend is API-only.
- `optimize` = config + route + view cache in one.

### 1.5.1 Keep uploaded images across deploys (important for monorepo)
With Forge's default **zero-downtime (release) deploys**, each deploy is a new folder, so files uploaded to `backend/storage/app/public` (product & logo images) would disappear on the next deploy. Pick one:

- **Easiest:** turn **OFF** "Zero-downtime deployment" for this site (Forge → site → *Deployments* settings). Then `backend/storage` is stable and uploads persist. The script above still works.
- **Keep zero-downtime:** point `backend/storage` at Forge's shared storage by adding this **above** the composer line, then re-run `storage:link`:
  ```bash
  mkdir -p ../storage/app/public ../storage/framework/{cache,sessions,views} ../storage/logs
  rm -rf backend/storage && ln -nsf ../storage backend/storage
  ```
- **Best for scale (later):** set `FILESYSTEM_DISK=s3` and upload to S3/R2 so local disk doesn't matter.

### 1.6 Queue worker (for background jobs / heavy operations)
Forge → **Daemons** (not the Queue tab, because we need the `backend/` subdir):
- **Command:** `php8.3 artisan queue:work redis --sleep=3 --tries=3 --max-time=3600`
- **Directory:** `/home/forge/api.brooks.place/backend`

### 1.7 Scheduler (for scheduled jobs)
Forge → **Scheduler**:
- **Command:** `php8.3 /home/forge/api.brooks.place/backend/artisan schedule:run`
- **Frequency:** Every minute.

### 1.8 First run (one time)
SSH in and create the store settings row + a real owner account (do **not** use the demo seeders' `password` in production). **Preferred:** the idempotent artisan command — no tinker, safe to re-run (also resets the password):

```bash
cd /home/forge/api.brooks.place/backend
php artisan migrate --force
php artisan app:create-owner --email=you@yourshop.com --username=owner --password='CHANGE-ME-strong'
# Or run it with no flags to be prompted (the password input is hidden):
#   php artisan app:create-owner
# Or set OWNER_EMAIL / OWNER_USERNAME / OWNER_PASSWORD in the Forge env and run it flagless.
```

Owners log into the admin app with **either** their username or email. Roles: `owner` (full access incl. settings + staff management), `manager`/`cashier`/`barista` (operations only). Owners can create the rest of the team from the admin **Staff** page.

> Avoid `php artisan tinker` + `User::create([... 'password' => bcrypt(...)])` — the model casts `password => 'hashed'`, so it **auto-hashes**; wrapping in `bcrypt()` double-hashes it and login silently fails. Pass the plaintext password (the command above does this correctly).

**Starter catalog** (inventory + full menu with recipes & customization options) is seeded **automatically** by a data migration on the first `migrate` — but only when the catalog is empty, so it never overwrites a live menu or edits you make in the admin UI (and it's skipped entirely in the test env). To re-seed or refresh it later: `php artisan app:seed-starter` (add `--if-empty` to make it a no-op when products already exist).

---

## 2. Frontends → Vercel (two projects, same repo)

Create **two** Vercel projects from `ClarkG10/Brook-s-place-POS`.

### 2.1 Customer app
- **Root Directory:** `apps/order`  ← set this in Project Settings.
- **Framework Preset:** Vite (auto-detected; `vercel.json` also pins it).
- **Environment variable:** `VITE_API_URL = https://api.brooks.place` (your Forge URL, no trailing slash).
- Deploy. Add a custom domain, e.g. `order.brooks.place`.

### 2.2 Admin app
- **Root Directory:** `apps/admin`.
- Same **`VITE_API_URL`**.
- Deploy. Domain e.g. `admin.brooks.place`.

### 2.3 Monorepo / workspaces note
Vercel auto-detects the root `package.json` **npm workspaces** and installs from the repo root, so the shared `packages/ui` resolves during build. If a build ever fails on missing workspace deps, set the project's **Install Command** to `npm install --workspaces=false` → no; instead use: **Install Command** `cd ../.. && npm install`. The included `vercel.json` already sets the build command and SPA rewrites (deep links like `/order/table/5`, `/cart`, admin `/pos` fall back to `index.html`).

> `VITE_*` vars are baked in **at build time** — change one → redeploy.

---

## 3. Wire them together (after all three are up)
1. On Forge, set `CORS_ALLOWED_ORIGINS` to the two Vercel domains and redeploy (or `php artisan config:cache`).
2. Open the admin app → sign in with the owner account → **Settings**: set the shop name, logo, palettes, tax.
3. **Table QR codes** point to the customer app: `https://order.brooks.place/order/table/1` (one per table). Generate QR images for each URL.

---

## 4. Redeploys
- **Push to `main`** → Vercel auto-deploys both frontends; enable Forge **Quick Deploy** for the backend to auto-run the deploy script on push.

## 5. Gotchas checklist
- [ ] Backend **Web Directory = `/backend/public`** (monorepo).
- [ ] `APP_URL` = the API's own https domain (uploaded product/logo images build their URLs from it).
- [ ] `CORS_ALLOWED_ORIGINS` = exact Vercel URLs, no trailing slash.
- [ ] `VITE_API_URL` set on **both** Vercel projects, then redeploy.
- [ ] Redis running; `CACHE_STORE`/`QUEUE_CONNECTION=redis`.
- [ ] `php artisan storage:link` ran (product & logo images).
- [ ] Queue Daemon + Scheduler point at the **`backend/`** directory.
