# CLAUDE.md

Guidance for Claude Code (and any AI agent) working in this repository. Keep
this file short; defer to the authoritative docs rather than duplicating them.

Repo: <https://github.com/Souhib/thaqafa>. CI runs on every
push (non-`main`) and PR to `main` — three parallel jobs (pipeline,
backend, web) defined in `.github/workflows/ci.yml`. The gate is
`uv run poe check && uv run poe test` for backend, `uv run poe check`
for the pipeline, and `bun run typecheck && bun run lint && bun run format:check && bun run test`
for the web. Make your local pre-flight `make check` so you don't push
red.

## What this project is

"Thaqafa" — a mobile app (Flutter, not started), website
(Vite + React + TanStack Router), and backend (FastAPI) that surface one
verified historical event from Islamic history per day of the year
(Gregorian + Hijri).

Current state: `data-pipeline/`, `backend/`, and `web/` all exist and run
end-to-end. Flutter `mobile/` is not started yet. The dataset (1256 events
+ ~50 lessons + 25 observances + ~600 people at last count) is the
foundation everything else rests on.

## Repository layout

```
thaqafa/
├── README.md          # public project overview + running instructions
├── EDITORIAL.md       # the bar for any content edit — READ BEFORE EDITING YAML
├── AUDIT.md           # dataset audit snapshot + human-review backlog
├── CLAUDE.md          # this file
├── data-pipeline/     # YAML → SQLite ETL + sitemap.xml / robots.txt / feed.xml emitter
├── backend/           # FastAPI read-only API (private — only the FE talks to it)
└── web/               # Vite + React reading surface (Tailwind v4, i18next, TanStack)
```

### data-pipeline/

```
data-pipeline/
├── pyproject.toml
├── data/
│   ├── curated/           # authoritative input (YAML)
│   │   ├── sources.yaml
│   │   ├── people.yaml
│   │   ├── observances.yaml
│   │   ├── events/*.yaml  # dated events, split by era
│   │   └── lessons/*.yaml # dateless Qur'an / Sunnah / hadith lessons
│   └── output/            # generated SQLite (ephemeral)
└── src/pipeline/
    ├── build.py           # orchestrator (python -m pipeline.build)
    ├── validate.py        # structural validator for refs
    ├── source_urls.py     # deterministic sunnah.com / quran.com / wikidata URL derivation
    ├── ingestion/         # YAML / Wikidata / OpenITI loaders
    ├── models/db.py       # SQLModel ORM (single-file schema)
    ├── images/            # image fetcher + restricted-figure policy
    ├── conversion/        # Hijri ↔ Gregorian tabular conversion
    └── syndication.py     # generates sitemap.xml + robots.txt + feed.xml (called from build)
```

The pipeline writes to **two destinations**:

- `data-pipeline/data/output/thaqafa.db` — the SQLite consumed by the
  backend (private).
- `web/public/{sitemap.xml, robots.txt, feed.xml}` — public syndication
  files, served as static assets by the FE host. See "Syndication" below.

### backend/

```
backend/thaqafa/
├── app.py                         # FastAPI factory + exception handlers + routers
├── main.py                        # uvicorn entry
├── settings.py                    # pydantic-settings, env-file resolver
├── database.py                    # async SQLAlchemy engine + session
├── dependencies.py                # FastAPI Depends providers (controllers)
├── logger_config.py               # loguru sink config
├── observability.py               # Sentry init, gated on $SENTRY_DSN
└── api/
    ├── cache.py                   # Cache-Control dependencies (CACHE_DAY, CACHE_HOUR, ...)
    ├── constants.py               # Hijri/Gregorian month names, limits
    ├── errors.py                  # BaseError + typed per-resource subclasses
    ├── middleware.py              # pure ASGI: SecurityMiddleware, RequestID, Logging
    ├── controllers/               # one class per resource — DB queries + raise typed errors
    ├── routes/                    # FastAPI routers, zero business logic, attach Cache-Control
    ├── schemas/                   # Pydantic response models (camelCase JSON via to_camel)
    ├── services/
    │   ├── calendar.py            # Gregorian / Hijri pairing helpers (calendar_for, hijri_month_index)
    │   └── projections.py         # ORM row → response model — pure functions
    └── utils/
        └── cache.py               # in-process TTLCache for hot endpoints (optional)
```

### web/

```
web/src/
├── main.tsx                       # router boot + Sentry init + i18n boot
├── index.css                      # Tailwind v4 @import + token CSS vars + .dark variant
├── vite-env.d.ts                  # ImportMetaEnv types for VITE_* vars
├── i18n/
│   ├── index.ts                   # i18next bootstrap (lazy locale loader)
│   ├── months.ts                  # Hijri month name constants (single source of truth)
│   └── locales/{en,fr,ar}.json    # UI strings — content i18n is on the API
├── api/
│   ├── client-setup.ts            # configures generated hey-api client at boot
│   ├── queryKeys.ts               # central queryKey map for invalidation/prefetch
│   ├── generated/                 # @hey-api/openapi-ts output — DO NOT EDIT
│   └── {today,events,lessons,...}.ts  # thin TanStack Query hook wrappers
├── components/
│   ├── design/                    # editorial primitives (FriezeRule, EightPointStar, …)
│   ├── disputed/                  # DisputeBadge + DisputedDrawer (Radix dialog)
│   ├── reader/                    # Masthead, DetailHeader, Footer, rails, EventCard, …
│   └── ui/                        # Loading, Empty, NotFound, ErrorBoundary
├── providers/                     # ThemeProvider (toggles html.dark), LanguageProvider, QueryProvider
└── routes/                        # TanStack file-based routing
```

## Common commands

Easiest path: the root `Makefile`.

```sh
make install            # uv sync (data-pipeline + backend) + bun install (web)
make build              # rebuilds the pipeline DB + syndication files
make dev                # boots backend (:5111) + web (:3000) in parallel
make check              # lint + typecheck + tests across all three packages
make fix                # ruff format + ruff fix; oxfmt + oxlint --fix
```

Per-package detail (when you want finer control):

```sh
# backend/
uv sync
uv run python main.py                   # dev server on :5111
uv run poe check                        # ruff lint + format check
uv run poe test                         # pytest (real pipeline DB)
uv run poe pre-commit                   # check + test (CI gate)
uv run poe fix                          # format + lint --fix

# web/
bun install
bun run dev                             # vite on :3000, proxies /api → :5111
bun run generate-api                    # regenerate hey-api client from openapi.json
bun run check                           # typecheck + lint + test
bun run format                          # oxfmt
```

Regenerate the OpenAPI client whenever the backend schema changes:

```sh
# from backend/
uv run python -c "import json; from thaqafa.app import create_app; print(json.dumps(create_app().openapi()))" \
  > openapi.json && cp openapi.json ../web/openapi.json
# from web/
bun run generate-api
```

## Non-negotiable editorial rules

These are the accuracy guardrails. Read `EDITORIAL.md` in full before touching
any content; the summary below is the short version:

1. **No fabricated precision.** If classical sources only attest a year, store
   a year. Never invent a day to make the calendar nicer.

   **Companion rule — date uncertainty protocol** (see EDITORIAL.md "Date
   uncertainty — protocol" for full detail):
   - Event reality (attested in ≥2 classical Sunni sources) is a **prerequisite**;
     never speculate an event into existence.
   - When sources disagree on date: use the majority opinion, set
     `disputed: true` + `dispute_about: date`, and explicitly justify the chosen
     date in the description (which source, why preferred, what the alternatives
     are).
   - When no date is attested or dates are too contested to commit: **convert
     the entry to a dateless lesson** (`data/curated/lessons/`) rather than
     anchor it to a fabricated date.
2. **No images of restricted figures.** Prophets, Sahaba, Ahl al-Bayt — ever.
   Enforced in `src/pipeline/images/fetcher.py`; defense in depth downstream.
3. **Every claim carries a source.** `Event.claims` references a `Source` row;
   `hadith_refs` and `quran_refs` are structurally validated by
   `pipeline.validate`.
4. **Disputes are data, not editorial.** Multiple `claims` + `disputed: true`
   when Sunni sources disagree. Don't pick one and silence the others.
5. **Sunni-orthodoxy scope — the four-madhhab bar.** Sources and editorial
   framing draw from the Sunni canon. Every figure must be defensible
   within Ahl al-Sunna wa-l-Jamāʿa as represented by the four mainstream
   fiqh schools (Ḥanafī, Mālikī, Shāfiʿī, Ḥanbalī). Karbala / Ahl al-Bayt /
   Rashidun are shared heritage and stay; Shia-doctrinal-specific content
   (e.g. the twelve imams *as imams*) is out of scope. Sufi orders firmly
   embedded in mainstream Sunni fiqh (Qādiriyya, Naqshbandiyya, Shādhiliyya,
   Suhrawardiyya, Chishtiyya, Kubrawiyya, Mawlawiyya, etc.) are included;
   tarīqas whose adherents accord their founder quasi-prophetic status,
   treat their works as quasi-revelation, or substitute the order's
   gathering for canonical Sunni obligations are **excluded by name**
   (Mouride, Tijani-Niassene fayḍa branch). Borderline cases (Tijaniyya
   broadly, Akbarian *waḥdat al-wujūd* school, Aḥmad Sirhindī's
   *qayyūmiyya* claim) are kept factually but flagged. See
   `EDITORIAL.md` rule 8 for the full list.
6. **Only ṣaḥīḥ hadith** presented as authoritative. As of the 2026-04-27
   audit, the dataset enforces strict-ṣaḥīḥ policy: `hadith_refs` must point
   to Bukhārī/Muslim (ṣaḥīḥ by consensus) or to non-Ṣaḥīḥayn narrations
   graded ṣaḥīḥ by Darussalam / al-Albānī / Shuʿayb al-Arnāʾūṭ. Ḥasan and
   ḍaʿīf citations are not permitted — drop the entry rather than cite
   weakly. Verify each new ref via sunnah.com before commit.
7. **Drop an entry rather than keep a wrong one.** Accuracy is
   non-negotiable — when in doubt, cut it. The dataset's value is the
   guarantee that what's in it is *true*; one wrong entry corrodes that
   guarantee for the entire calendar. Prefer 100 perfect events over 5,000
   that include errors.
8. **If you encounter an error in any event, lesson, or observance —
   correct it or remove it on the spot.** Never leave a known-wrong entry in
   place. This applies to dates, hadith citations, biographical claims,
   sectarian framing, anything. When fixing, prefer correction backed by a
   classical source; when correction is uncertain, delete the entry from
   the YAML and rebuild. Drift is the failure mode this project most needs
   to avoid.
9. **`disputed: true` requires `verification_status >= cross_verified`.**
   The disputed flag means "the date or a small detail is contested across
   classical sources" — it does *not* license including unverified events.
   The event itself must be confirmed by ≥2 independent classical Sunni
   sources before any dispute can be claimed. Enforced by
   `pipeline.validate`; CI fails on violations.
10. **`disputed: true` requires `dispute_about ∈ {date, detail, interpretation}`.**
    The frontend uses this to calibrate how prominently the dispute is
    surfaced (date = subtle badge, interpretation = stronger). Enforced by
    `pipeline.validate`.
11. **The build is curated-only — no auto-ingestion.** `pipeline.build`
    only ever ingests `data/curated/*.yaml`. There is no
    `--include-bulk` flag and no `pipeline.verify` script. Every entry
    that lands in the API has been hand-vetted against the editorial
    bar (Sunni framing, classical sources, hadith refs, trilingual
    coverage). The brand promise is unconditional: *every entry has
    been editorially reviewed*.
12. **Bulk discovery happens out-of-band via `scripts/discovery/`.** The
    Wikidata SPARQL helper and the OpenITI metadata helper now live
    under `data-pipeline/scripts/discovery/` and produce JSON reports
    of *candidate* entries the curator may consider promoting into
    YAML. They never write to the SQLite directly. Use them when you
    want to surface events you might have missed; the human-in-the-
    loop applies the editorial bar before anything reaches the API.
13. **Wikidata QIDs are not trusted by default.** A 2026-04-26 audit
    found ~95 % of declared `wikidata_qid` values in `people.yaml`
    pointed to unrelated entities (training-memory hallucinations).
    All QIDs were purged. Before adding a new QID, verify via the
    `wbgetentities` API that the QID resolves to the correct entity
    and matches the declared name. The field is optional — omit it
    when uncertain rather than introducing contamination.

    The frontend shows verification chips on every card so readers see
    the trust level (`SINGLE SOURCE` / `CROSS-VERIFIED` /
    `SCHOLAR-REVIEWED`). The deprecated `auto_verified` tier is gone
    from every layer.
14. **Trilingual policy.** Every curated `Event`, `DatelessLesson`, and
    `Observance` should carry `title_{en,ar,fr}` (or `name_{en,ar,fr}` for
    observances) and `description_{en,ar,fr}`. English is required;
    Arabic + French are strongly preferred. The frontend picks based on
    user pref with fallback chain (requested → en → first non-null).
    Schema columns are already in place; the audit-pass adds the values.
15. **No `?on=YYYY-MM-DD` on the public Today route.** Daily-ritual
    constraint — the project's value depends on users coming back each
    day, not bingeing through every calendar date in an afternoon.
    Permalinks for specific events live on `/api/v1/events/{slug}` etc.,
    so sharing / SEO / academic citation are still covered without
    breaking the cadence.

`verification_status` ladder: `unverified` → `single_source` → `cross_verified`
→ `scholar_reviewed`. Promotions only; never demote without a corrected
source. The `auto_verified` tier was retired (see rule 11) — every
entry in the API is editorially reviewed by definition.

## Source URLs

Every event / lesson has a single `source_url` — the "verify this" link
surfaced by the app. Precedence (see `pipeline/source_urls.py`):

1. Explicit `source_url:` in YAML (Wikipedia / IslamQA / academic) — always
   wins.
2. Auto-derived `sunnah.com/<collection>:<N>` from `hadith_refs`.
3. Auto-derived `quran.com/<surah>/<ayah>` from `quran_refs`.
4. Auto-derived `wikidata.org/wiki/<QID>` for bulk imports.

Don't hand-fill a sunnah.com or quran.com URL in YAML if the structured ref
already produces the right one — let the helper do it.

## Pipeline commands

Run from `data-pipeline/`:

```sh
uv sync
uv run python -m pipeline.build                      # full rebuild (incl. syndication)
uv run python -m pipeline.build --db-only            # DB-only (skip sitemap/feed/quran-extracts; used by backend entrypoint)
uv run python -m pipeline.validate                   # check refs are well-formed
uv run poe check                                     # ruff lint + format check
uv run poe fix                                       # ruff format + lint --fix
# Discovery (out-of-band, never writes to the SQLite):
# uv run python scripts/discovery/wikidata_leads.py   # candidate report → JSON
# uv run python scripts/discovery/openiti_leads.py    # candidate report → JSON
```

The DB at `data-pipeline/data/output/thaqafa.db` is **ephemeral** —
regenerated from YAML + live Wikidata + live OpenITI on every run. Never
hand-edit it.

## Syndication (sitemap.xml + robots.txt + feed.xml)

These three files exist so external tools can read the site without scraping
it page-by-page:

- **`robots.txt`** tells crawlers (Google, Bing, …) what they're allowed to
  crawl and points them at the sitemap. Also blocks AI scrapers (GPTBot,
  Claude-Web, etc.) — same blocklist Souhib uses on LaTabdhir.
- **`sitemap.xml`** lists every public URL on the site (~1900 — the static
  landings plus every event/lesson/observance/people detail page) with a
  `<lastmod>` date so search engines crawl selectively.
- **`feed.xml`** is an Atom 1.0 feed of the headline picked for each of the
  last 14 calendar days — exactly what `/api/v1/recent` returns, but in a
  format any RSS reader (Feedly, NetNewsWire, …) understands.

**Why the pipeline owns this and not the backend.** The whole content of
these three files is derived from the dataset (the slugs, the headline
rotation, the `updated_at` per event). The pipeline is the single authority
on the dataset and runs in batch, so adding syndication as the final step of
the build is the natural fit. The alternative — a FastAPI route — would
require exposing the API publicly (Google must reach `thaqafa.app/sitemap.xml`,
not `api.thaqafa.app/sitemap.xml`) and adding a reverse-proxy rule in prod;
generating static files instead keeps the backend 100 % private.

Output goes to `web/public/{sitemap.xml, robots.txt, feed.xml,
quran-extracts.json, dataset-meta.json}`, where the FE bundle ships
them as static assets. `pipeline.build` regenerates the DB and these
files in one shot; the `--db-only` flag skips the FE-asset steps and
is what the backend container's entrypoint runs (the backend never
serves these files — nginx does, from its baked-in copy).

The public origin used in the absolute URLs comes from `$FRONTEND_URL`
(defaults to `http://localhost:3000`). In prod set it to your real
domain before running the pipeline.

**Daily refresh path.** The feed.xml headline rotates per calendar day.
The daily Dokploy redeploy (`0 4 * * *`) rebuilds the FE image, whose
`pipeline` stage runs the full `pipeline.build` and bakes a fresh
feed/sitemap/quran-extracts into the nginx bundle. The backend
container's entrypoint runs `pipeline.build --db-only` — refreshes
postgres content from YAML, but doesn't waste ~70s re-fetching the
quran-extracts JSON that nobody in the backend ever serves.

## Deployment & daily rebuild (Dokploy)

The web nginx upstream uses `thaqafa-backend:5111` and Docker DNS with
`resolve` (nginx >= 1.27.3). Do not use the generic `backend` hostname on
the shared Dokploy network: the September 16 outage resolved it to another
application, returning 502 despite a healthy Thaqafa backend. DNS refresh
also follows backend container replacements without a frontend restart.

Production runs on Dokploy (`docker-compose.dokploy.yml` at the repo
root). Three services:
- `thaqafa-db` — PostgreSQL 16, named volume `thaqafa-postgres-data`,
  internal network only.
- `thaqafa-backend` — FastAPI, runs the pipeline on every container
  start (entrypoint), then serves the API.
- `thaqafa-frontend` — nginx serving the Vite bundle, behind Traefik +
  Let's Encrypt.

Account / bookmark / token tables are created by the backend on lifespan
startup (`thaqafa.database._create_backend_tables`) and are excluded
from `pipeline.constants.CONTENT_TABLE_NAMES` — the pipeline's
drop-and-recreate cycle leaves them alone.

**The pipeline runs at container start, not at image build.** See
`backend/Dockerfile` (production stage) + `backend/entrypoint.sh`:
the entrypoint execs `python -m pipeline.build` against
`$DATABASE_URL` (the postgres in compose), which drops + recreates the
content tables from YAML and writes `web/public/{sitemap,robots,feed,
quran-extracts}.xml|json`. Then it execs `python main.py`.

Why container start instead of image build:
- The image is **content-free**; the dataset lives in postgres, which
  persists across redeploys via the named volume. Content is the build
  artifact of YAML + the pipeline run, but it doesn't get baked into a
  Docker layer — it's installed into the live DB at boot.
- User data (accounts, bookmarks, tokens) survives every redeploy
  because the pipeline's allowlist only drops content tables.

**Daily rebuild = scheduled redeploy.** Configure in the Dokploy UI:

1. Dokploy → application `thaqafa` → **Schedules** → Create.
2. Service: pick the application (Compose stack), action: **Redeploy**.
3. Cron expression: `0 4 * * *` (04:00 UTC — quiet hour, before
   European morning traffic).

Each redeploy:
- Re-builds the backend image (fast: no pipeline run during build).
- Re-builds the frontend image — its `pipeline` Dockerfile stage runs
  the **full** `pipeline.build` (with the FE-asset steps) so
  `web/public/{sitemap.xml, robots.txt, feed.xml, quran-extracts.json,
  dataset-meta.json}` are baked into the nginx image afresh. The feed's
  daily-rotated headline rides on this.
- New backend container's entrypoint runs `pipeline.build --db-only`
  against the live postgres — drops + recreates content tables from
  YAML, skips the FE-asset steps (those live in the nginx image, not
  the backend).
- Switches Traefik over once both new containers pass their healthchecks.

**Required env in Dokploy:**
- `POSTGRES_PASSWORD` — long random secret (generate with
  `python -c 'import secrets; print(secrets.token_urlsafe(32))'`).
  Compose refuses to start without it.
- `JWT_SECRET_KEY` — same generator, signs auth tokens.

If you ever need a manual refresh between scheduled rebuilds, click
**Redeploy** in the Dokploy UI for the same effect.

## Backend conventions

Read these before changing backend code — they're the rules the
codebase is shaped by.

1. **Snake-case discriminants over English labels.** `verification_status`,
   `dispute_about`, `weight` are `Literal[...]` discriminants. The API
   never emits a human-readable label — the FE owns rendering via i18n.
   See `backend/thaqafa/api/schemas/event.py`.
2. **One typed error per resource.** `EventNotFoundError`,
   `LessonNotFoundError`, etc. — derived from `BaseError` which auto-
   generates `error_key` from the class name (`EventNotFoundError` →
   `errors.api.eventNotFound`) and self-logs at smart per-status defaults
   (5xx → ERROR, 401/403/409 → WARNING, 4xx → DEBUG). Controllers raise
   the typed error; the handler in `app.py` shapes the JSON envelope.
   Pass `log=False` if you're raising inside a try/except that's about to
   handle the error locally — keeps the log stream clean.
3. **Projections live in `services/projections.py`** and calendar /
   observance helpers in `services/calendar.py`. ORM → Pydantic mapping
   is a pure function, callable from any controller. **Never** put
   projection helpers on a controller class — that path forces
   controller-to-controller imports and turns the feature surface into
   a tangle.
4. **Routes are zero-business-logic.** They `Depends(...)` a controller,
   call one method, return its result. `Cache-Control` is set via
   `dependencies=[CACHE_DAY]` etc. (see `thaqafa/api/cache.py`), not by
   mutating the response inside the handler.
5. **No `?on=YYYY-MM-DD` on the public Today route.** Daily-ritual
   constraint — letting users binge through arbitrary calendar dates
   would dissolve the cadence the project is built on. Permalinks for
   specific events live on `/api/v1/events/{slug}` instead.
6. **Pure ASGI middleware.** `SecurityMiddleware`, `RequestIDMiddleware`,
   `LoggingMiddleware` — no `BaseHTTPMiddleware` (perf cost under load).
7. **Sentry init is gated on `$SENTRY_DSN`** in `thaqafa/observability.py`.
   Empty DSN = no init, no network — zero overhead in dev. The loguru
   sink forwards WARNING+ records as Sentry messages and exception logs
   as Sentry exceptions automatically, so you don't need to call the
   SDK directly from controllers.

## Single-database constraint (content tables vs. user tables)

Dataset and user data live in **one** database — SQLite in dev / tests,
PostgreSQL in production. The pipeline is allowed to drop *only* the
dataset tables — see `pipeline/constants.py:CONTENT_TABLE_NAMES`.
Anything not in that allowlist (``users``, ``bookmarks``,
``password_reset_tokens``, ``email_verification_tokens``,
``email_change_tokens``) is left alone, even when ``pipeline.build``
runs a full rebuild. That is **the** mechanism that lets us drop +
recreate content from YAML on every redeploy without nuking user
accounts.

When you add a new content table, add its name to ``CONTENT_TABLE_NAMES``
**and** to the schema in ``pipeline/models/db.py``. Forgetting to add it
to the allowlist means the pipeline won't drop it on rebuild — annoying
but recoverable. Forgetting to add it to the schema means the table
won't be created at all — caught immediately on the next run.

User tables live in the **backend** package (`thaqafa/models/user.py`),
registered on the same ``SQLModel.metadata``. The backend's lifespan
``_create_backend_tables`` runs ``create_all`` for them on every boot;
``create_all`` is a no-op when the tables already exist. The pipeline's
``_content_tables()`` filter never includes them.

**Database URL.** Single env var ``DATABASE_URL``. Dev/tests default to
the bundled SQLite at ``data-pipeline/data/output/thaqafa.db`` (no env
needed); prod compose sets ``postgresql://thaqafa:${POSTGRES_PASSWORD}@db:5432/thaqafa``.
Both backend (``_to_async_url``) and pipeline (``_to_sync_url``)
normalise the URL to their respective drivers (asyncpg / psycopg).
Bookmarks reference content via plain string slugs (no FK across the
content/user boundary), so ``DROP TABLE events`` in the pipeline rebuild
never violates a foreign key from the user tables.

## Frontend conventions

1. **Custom Tailwind components, not shadcn.** Editorial design (frieze
   rosettes, eight-point stars, dot-chips) is too bespoke for shadcn's
   defaults; adopting shadcn would force re-theming every primitive. We
   ship our own; Radix is used selectively for a11y-critical primitives
   only (currently `@radix-ui/react-dialog` under `DisputedDrawer`).
2. **CSS variables, not JS branching.** All color / typography tokens
   live in `web/src/index.css` as CSS custom properties on `:root` and
   `.dark`. `ThemeProvider` toggles `html.classList.dark`; nothing else
   in the tree branches on `dark`. Tailwind utilities (`text-ink`,
   `bg-paper`, `font-mono`) read the same vars.
3. **i18next for UI strings.** Locales are `web/src/i18n/locales/*.json`,
   loaded lazily. Component text uses `useTranslation()`'s `t(...)`. The
   trilingual *content* (event titles, descriptions, etc.) is selected
   via `pickLocalised(...)` from the API payload — different system,
   different concern.
4. **`@hey-api/openapi-ts` for the API client.** Types and TanStack
   Query hooks are auto-generated; never edit `src/api/generated/`.
   Regenerate after backend schema changes (see commands above).
5. **No `ky`, no second HTTP client.** The generated client uses
   `@hey-api/client-fetch` and that's all. When auth lands, configure
   it on the generated client via `client.setConfig(...)` or interceptors
   — don't drag a second fetch lib in.
6. **Sentry init is gated on `VITE_SENTRY_DSN`** in `main.tsx`. Empty
   DSN = no init, no network. The release tag is read from
   `VITE_APP_VERSION` (auto-injected from `package.json`).

## Python conventions (shared with Majlisna + LaTabdhir)

The Python style in this repo matches Souhib's other two active projects —
**Majlisna** at `/Users/souhib/Projects/IPG/` (the folder is named `IPG`, the
product is `majlisna`) and **LaTabdhir** at
`/Users/souhib/Projects/LaTabdhir/`. When in doubt, grep those repos; the
conventions below are the short list.

### Language + typing

1. **Python 3.12+.** `requires-python = ">=3.12"`, `target-version = "py312"`.
2. **Never** add `from __future__ import annotations`. 3.12 is the runtime;
   use native syntax directly.
3. **PEP 604 unions only:** `str | None`, `int | None`, `dict[str, int]`.
   Never `Optional[X]`, `List[X]`, `Dict[K, V]`. No
   `from typing import Optional`.
4. **Collection protocols come from `collections.abc`:**
   `from collections.abc import Iterator, Sequence, Mapping, Callable` — not
   from `typing`.
5. **Google-style docstrings** (`Args:` / `Returns:` / `Yields:` / `Raises:`).
   Single-line docstrings are fine for simple getters. Match the surrounding
   file. (Majlisna's legacy Sphinx `:param:` style is an artifact — forward-
   going code is Google style.)

### Schemas + data

6. **Pydantic v2 everywhere.** Prefer typed Pydantic models over bare `dict`
   at every API/schema boundary. A `dict[str, Any]` return signature is a
   smell — replace it with a `BaseModel` subclass in `schemas/`.
7. **Constants** live in a single `constants.py` per package. No magic
   numbers / strings scattered through modules.
8. In Majlisna / LaTabdhir specifically, **never inherit from
   `pydantic.BaseModel` or `sqlmodel.SQLModel` directly** — use each
   project's `schemas.shared.BaseModel` / `BaseTable`. This pipeline repo is
   standalone, so plain `pydantic.BaseModel` / `sqlmodel.SQLModel` are fine
   *here*; keep the inheritance rule in mind if/when code moves into the
   backend service.

### Structure + flow

9. **Imports at the top of the file, always.** Never inside functions.
   Groups: stdlib → third-party → first-party, blank line between groups.
   `ruff` `I` (isort) enforces this.
10. **No nested function definitions.** Extract helpers to module level or
    class methods.
11. **Early returns / guard clauses** for edge cases; happy path last.
12. **Route → Controller → Projection.** Routes have zero business logic:
    they `Depends(...)` a controller, call one method, return its result.
    Cache-Control is a `dependencies=[CACHE_*]` entry on the route
    decorator (see `thaqafa/api/cache.py`), never set inside the handler.
    Controllers run the queries and raise typed errors. ORM-row → response
    schema mapping lives in `thaqafa/api/services/projections.py` so any
    controller can call it.
13. **No code in `__init__.py`.** Package init files carry the package
    docstring and nothing else — no re-exports, no `from x import y`,
    no `__all__`, no `__version__`. Re-exports add a second import path
    every reader has to keep in sync, and they hide where a name actually
    lives. Callers import from the actual submodule (`from
    pipeline.schemas.inputs import EventIn`, not `from pipeline.schemas
    import EventIn`). Package version constants live in a dedicated
    `version.py`.

### Async + logging (FastAPI backend)

13. **All DB operations async** in the backend: `AsyncSession` from
    SQLModel, `await session.exec(select(...))`. The data-pipeline is a
    one-shot batch builder and uses sync `Session` intentionally — the
    async rule applies to the API service, not the pipeline.
14. **Structured logging with loguru** (`from loguru import logger`,
    `serialize=True`). Bind context with `.bind(user_id=..., event=...)`.
    Never f-string inside `logger.info()` — prefer key-value bindings so the
    JSON output stays queryable. `BaseError` already self-logs at smart
    per-status levels (5xx → ERROR, 401/403/409 → WARNING, 4xx → DEBUG);
    don't duplicate that in handlers.

### Tooling

15. **`uv` for everything.** `uv sync`, `uv run <cmd>`. Don't invoke `pip`
    or a global `python` directly.
16. **Ruff config** (this repo matches Majlisna/LaTabdhir verbatim):
    ```toml
    [tool.ruff]
    line-length = 120
    target-version = "py312"

    [tool.ruff.lint]
    select = ["E", "W", "F", "I", "UP", "B", "SIM", "C90", "N", "PL", "ARG"]
    ignore = ["E501", "PLR0913", "PLR2004", "ARG002", "B008"]

    [tool.ruff.lint.isort]
    known-first-party = ["pipeline"]
    ```
17. **Poe tasks** (`[tool.poe.tasks]`): `lint`, `format`, `format-check`,
    `check`, `lint-fix`, `fix`, plus `test` / `test-fast` / `pre-commit`
    when the project has tests. Always `uv run poe <task>`, not bare `poe`.
18. **Run `uv run poe check` before committing.**

### Git + commits

19. **Conventional Commits with emoji scope** — the format used across
    Majlisna and LaTabdhir: `feat(auth): ✨ add login flow`,
    `fix(game): 🐛 fix draw timer`, `refactor(api): ♻️ extract controller`.
20. **Never add `Co-Authored-By` lines or AI attribution** in commit
    messages. (This overrides the default Claude Code commit template for
    Souhib's projects.)

### Testing — the rule that bit us before

21. **Never add a polling fallback to make an E2E test pass.** If a Socket.IO
    E2E test fails, fix the Socket.IO infrastructure (Redis, Docker
    networking, event emission) — do not change `refetchInterval:
    socketConnected ? false : 2_000` to a polling interval. That pattern is
    sacred in Majlisna; the same principle applies anywhere real-time
    behaviour is under test here.

## Editing curated YAML — workflow

When adding / editing an event or lesson:

1. Read `EDITORIAL.md` — the checklist is authoritative.
2. Identify the event in at least one classical Sunni source **by name**
   (al-Tabari, Ibn Kathir, al-Dhahabi, Six Books, etc.).
3. Use the **highest precision the source actually attests** — no higher.
4. Populate `hadith_refs` / `quran_refs` for every hadith or verse cited in
   the description.
5. Set `verification_status`: 1 source → `single_source`; ≥2 → `cross_verified`.
6. If Sunni sources disagree on date or essential facts: `disputed: true` +
   an additional `claims` entry per alternative position.
7. Rebuild + validate:
   ```sh
   uv run python -m pipeline.build
   uv run python -m pipeline.validate
   ```

## What belongs in memory vs. the repo

This file is the project-level truth. User-specific preferences
(terseness, style) live in `~/.claude/.../memory/`. If you learn something
*project-specific* worth persisting (a decision, a constraint, a deadline),
consider whether it belongs in `EDITORIAL.md` / `AUDIT.md` first; memory is
the fallback, not the default.

## Backend dev tips

- **Generated OpenAPI lives at `backend/openapi.json`** and is mirrored
  into `web/openapi.json` by the regen command (see "Common commands").
  Don't hand-edit it.
- **Tests hit the real pipeline DB** (`tests/conftest.py`). They expect
  `data-pipeline/data/output/thaqafa.db` to exist — run
  `pipeline.build` once before the first test run.
- **Cache-Control vocabulary lives in `thaqafa/api/cache.py`:**
  `CACHE_UNTIL_MIDNIGHT` (Today / Recent — pivots at UTC midnight),
  `CACHE_DAY` (Observances), `CACHE_HOUR` (detail routes), `CACHE_FIVE_MIN`
  (lists), `NO_STORE` (Health). Always pick from this list, never inline
  a string.
- **Verification ladder in the API is `Literal`-typed:**
  `scholar_reviewed | cross_verified | single_source | unverified`.
  The projection coerces stray ORM values (including the deprecated
  `auto_verified`) to `unverified` rather than leak invalid payloads —
  see `services/projections._coerce_verification_status`.
- **User-admin CLI lives at `backend/scripts/users.py`.** Same shape
  as Majlisna's `generate_fake_data.py` and LaTabdhir's
  `expire_pending_orders.py` — async-engine boot, one operation,
  teardown. Run from `backend/` with `uv run python scripts/users.py
  <subcommand>`:

  ```sh
  uv run python scripts/users.py list                                            # every user + bookmark count
  uv run python scripts/users.py create --email me@example.com --display-name X  # prompts for password
  uv run python scripts/users.py create --email me@example.com --display-name X --unverified
  uv run python scripts/users.py delete --email me@example.com [--yes]           # cascades bookmarks + tokens
  uv run python scripts/users.py delete-all                                      # previews counts and refuses
  uv run python scripts/users.py delete-all --yes                                # actually wipes
  ```

  `delete` and `delete-all` cascade in the right FK order
  (`bookmarks` → `password_reset_tokens` → `email_verification_tokens` →
  `users`) in a single transaction. Email validation reuses the API's
  `EmailStr` so the same shapes are accepted. Passwords prompt via
  `getpass()` when `--password` is omitted — keeps the secret out of
  shell history. On prod the script runs in the backend container
  (Dokploy → Open Terminal → `cd /opt/backend`).

## Frontend dev tips

- **Tokens live as CSS variables in `web/src/index.css`.** Reach for
  Tailwind utilities (`text-ink`, `bg-paper`, `font-mono`, …) which read
  the same vars — never branch on `theme === "dark"` in React.
- **Typed query keys live in `web/src/api/queryKeys.ts`** — use them for
  invalidation / prefetch instead of re-deriving the hey-api options
  object at the callsite.
- **Shared chrome:** `DetailHeader` for `*-detail` pages (events,
  lessons, observances, people), `PageShell` for landings with subtitle
  + footer. Both already wire the language switcher and theme toggle.
- **Hijri month names** come from `@/i18n/months.ts` (single source of
  truth — backend exposes the same constants). Don't redeclare them in
  a route file.
- **`Loading` / `Empty` / `NotFound` / `ErrorBoundary`** are shared in
  `web/src/components/ui/`. Don't reinvent per-route variants.

## Further reading

- `README.md` — public overview, database stats, running instructions for
  pipeline / backend / web.
- `EDITORIAL.md` — the full editorial bar; non-negotiable rules in detail.
- `AUDIT.md` — dataset audit state + the human-review backlog (what still
  needs a qualified Muslim reviewer).
