# Platforma — Decisions Log

Every `[DECIDE]` resolution from the PRD, plus deliberate simplifications made
during implementation, recorded here per PRD §0/§12.

---

## DB-01 — Auth mechanism

**PRD:** `Auth via session or JWT [DECIDE]`

**Decision:** JWT (`djangorestframework-simplejwt`), matching what the existing
codebase already had wired up before this PRD's implementation began
(`REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`, `SIMPLE_JWT` settings).
Rotating refresh tokens with blacklist-after-rotation.

---

## DB-02 — Warehouse database

**PRD:** `Warehouse DB, separate database/schema 'warehouse' [DECIDE] DuckDB acceptable for local dev`

**Decision:** Same PostgreSQL instance (Neon) as the operational database, in
a separate Django app (`warehouse`) with its own fully isolated migration
graph (`dependencies = []` — verified, no FK crosses from `warehouse` models
into any operational app's models). Not a separate physical database/schema
namespace — everything lives in the `public` schema of the same Postgres
instance. If a genuinely separate warehouse database is needed later (e.g.
to enforce PRD §3's "must never read warehouse tables inside a request that
serves a customer transaction" at the connection-permission level, not just
by convention), this can move to a second Django database alias without
touching model code, since no cross-app FK exists to break.

**Not DuckDB** — the whole stack already runs on Postgres/psycopg2; adding a
second DB engine for local dev only would cost more in tooling complexity
than it saves.

---

## MONEY-01 — Storage precision

**PRD:** `Money: Decimal everywhere, never float. Store minor units or DECIMAL(12,2) consistently [DECIDE]`

**Decision:** `DECIMAL(N,2)` (Django `DecimalField`), matching every existing
operational model (`Order.total`, `Booking.total`, `MenuItem.price`, etc.).
Not minor units (integer paise/cents) — changing this now would touch every
existing model and serializer for no behavior change, since the codebase
was already consistently using `DecimalField` before this PRD's warehouse/
mining work began.

---

## WH-01 — Fact table partitioning

**PRD §8.1:** `Fact tables partitioned by date_key month.`

**Simplification:** Not implemented. Native Postgres `PARTITION BY` isn't
expressible through Django's migration system without hand-written raw SQL,
and was judged out of scope for a first working warehouse. `date_key` is
indexed on every fact table as the next-best thing. Revisit if/when fact
table row counts make full-table scans on `date_key` filters a measured
problem — not before, since partitioning empty-to-small tables adds
operational complexity (partition maintenance jobs) for no benefit yet.

---

## WH-02 — Cuboid refresh strategy

**PRD §8.2 stage 5:** `Refresh affected cuboids only.`

**Simplification:** All 5 cuboids are fully rebuilt (delete + re-aggregate
from fact tables) on every `run_etl` invocation, not incrementally refreshed
for only the partitions touched by the current delta window. Correct and
simple; costs re-computing unaffected history on every run. Revisit only if
cuboid refresh time becomes the ETL's bottleneck at real data volume — the
aggregation itself runs server-side in Postgres via `GROUP BY`, so refresh
time scales with fact table size, not with Python-side row iteration.

---

## WH-03 — Staging tables

**PRD §8.2 stage 2:** `Stage. Land raw, untyped, in staging_* tables.`

**Simplification:** No literal `staging_*` database tables exist. Extracted
rows are held in memory as ORM query results between the extract and
cleanse/transform/load stages within a single `run_etl` process. This
trades away the ability to inspect a failed run's raw extract after the
fact (which real `staging_*` tables would give you) for not having to build
and maintain a second copy of every operational table's schema. Revisit if
debugging a specific ETL failure ever actually requires that inspection
capability.

---

## WH-04 — dim_event.genre / dim_event.language

**PRD §8.1:** `dim_event: event_id, title, category, genre, organiser, language`

**Gap, not a decision:** the operational `eventra.Event` model has no
`genre` or `language` field — only `category` (movie/concert/sports/etc).
The ETL currently sets `genre = category` (same value duplicated into both
columns) and `language = 'en'` (hardcoded) rather than leaving them blank,
so downstream queries against `dim_event.genre` don't silently return NULL
for every row. If genre and language ever need to be genuinely distinct
from category, that requires an operational model change to `Event` first
— the warehouse dimension already has the column, waiting for a real source.

---

## WH-05 — dim_promotion has no operational source

**PRD §8.1:** `dim_promotion: campaign_name, promo_type, discount_pct, channel`

**Gap, not a decision:** no `Promotion`/`Campaign` model exists anywhere in
the operational schema (PRD §5.2's own model list for `zesty` doesn't
include one either). `dim_promotion` exists as a table (so `fact_order`
already has a `promotion_key` FK ready) but the ETL's extract stage for it
is presently a no-op — every `fact_order.promotion_key` is `NULL`. Needs an
operational `Promotion` model before this dimension can be populated.

---

## LEGACY-01 — `orders` app retired

The legacy `orders` app (a second, unauthenticated, IDOR-vulnerable
`Order` model duplicating `zesty.Order`, with zero frontend usage) was
deregistered and its code deleted. Its now-orphaned `orders_order` table
(0 rows) was deliberately left in place rather than dropped — a destructive
`DROP TABLE` against production data needs an explicit human call, not an
agent's judgment call, even for an empty legacy table.

## LEGACY-02 — `restaurants` app — not yet retired

Unlike `orders`, the legacy `restaurants` app is actively used by the
frontend (`/api/restaurants/`, `/api/areas/`) and shares its underlying
`restaurants` database table with `zesty.Restaurant` (same `db_table`).
Retiring it needs a frontend migration plan first, not just a backend
deletion — left open.
