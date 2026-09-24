-- =============================================================================
--  PLATFORMA – Complete Database Creation + Sample Data + OLAP Queries
--  PostgreSQL
--
--  HOW TO RUN:
--    psql -U <user> -d <database> -f database_create.sql
--
--  SECTIONS:
--    1. DROP (re-runnable)
--    2. DJANGO BUILT-IN TABLES
--    3. CORE APP   (users, addresses, payments, notifications)
--    4. RESTAURANTS APP  (legacy catalogue)
--    5. ZESTY APP  (restaurants, menu_items, orders, order_items, reviews,
--                   delivery_tracking)
--    6. EVENTRA APP (events, ticket_types, seats, bookings, booking_seats,
--                    event_reviews, event_analytics)
--    7. ORDERS APP  (legacy_orders)
--    8. SIMPLEJWT TOKEN BLACKLIST
--    9. HELPFUL VIEWS
--   10. SAMPLE DATA  (users → restaurants → menu_items → orders →
--                     payments → events → bookings)
--   11. VERIFY DATA
--   12. OLAP OPERATIONS
--       12.1 Slice
--       12.2 Dice
--       12.3 Roll-Up
--       12.4 Drill-Down
--       12.5 Pivot
--       12.6 Drill-Across
-- =============================================================================

-- =============================================================================
--  SECTION 1 – DROP EVERYTHING (safe re-run)
-- =============================================================================
DROP TABLE IF EXISTS "token_blacklist_blacklistedtoken"  CASCADE;
DROP TABLE IF EXISTS "token_blacklist_outstandingtoken"  CASCADE;
DROP TABLE IF EXISTS "django_admin_log"                  CASCADE;
DROP TABLE IF EXISTS "django_session"                    CASCADE;
DROP TABLE IF EXISTS "django_migrations"                 CASCADE;
DROP TABLE IF EXISTS "auth_group_permissions"            CASCADE;
DROP TABLE IF EXISTS "auth_permission"                   CASCADE;
DROP TABLE IF EXISTS "auth_group"                        CASCADE;
DROP TABLE IF EXISTS "django_content_type"               CASCADE;
DROP VIEW  IF EXISTS "v_upcoming_events"                 CASCADE;
DROP VIEW  IF EXISTS "v_active_restaurants"              CASCADE;
DROP TABLE IF EXISTS "event_analytics"                   CASCADE;
DROP TABLE IF EXISTS "event_reviews"                     CASCADE;
DROP TABLE IF EXISTS "booking_seats"                     CASCADE;
DROP TABLE IF EXISTS "bookings"                          CASCADE;
DROP TABLE IF EXISTS "seats"                             CASCADE;
DROP TABLE IF EXISTS "ticket_types"                      CASCADE;
DROP TABLE IF EXISTS "events"                            CASCADE;
DROP TABLE IF EXISTS "legacy_orders"                     CASCADE;
DROP TABLE IF EXISTS "delivery_tracking"                 CASCADE;
DROP TABLE IF EXISTS "order_items"                       CASCADE;
DROP TABLE IF EXISTS "reviews"                           CASCADE;
DROP TABLE IF EXISTS "orders"                            CASCADE;
DROP TABLE IF EXISTS "menu_items"                        CASCADE;
DROP TABLE IF EXISTS "restaurants"                       CASCADE;
DROP TABLE IF EXISTS "restaurant_catalogue"              CASCADE;
DROP TABLE IF EXISTS "notifications"                     CASCADE;
DROP TABLE IF EXISTS "payments"                          CASCADE;
DROP TABLE IF EXISTS "addresses"                         CASCADE;
DROP TABLE IF EXISTS "users_user_permissions"            CASCADE;
DROP TABLE IF EXISTS "users_groups"                      CASCADE;
DROP TABLE IF EXISTS "users"                             CASCADE;

-- =============================================================================
--  SECTION 2 – DJANGO BUILT-IN TABLES
-- =============================================================================

CREATE TABLE "auth_group" (
    "id"   BIGSERIAL    PRIMARY KEY,
    "name" VARCHAR(150) NOT NULL UNIQUE
);

CREATE TABLE "django_content_type" (
    "id"        BIGSERIAL    PRIMARY KEY,
    "app_label" VARCHAR(100) NOT NULL,
    "model"     VARCHAR(100) NOT NULL,
    UNIQUE ("app_label", "model")
);

CREATE TABLE "auth_permission" (
    "id"              BIGSERIAL    PRIMARY KEY,
    "name"            VARCHAR(255) NOT NULL,
    "codename"        VARCHAR(100) NOT NULL,
    "content_type_id" BIGINT       NOT NULL
        REFERENCES "django_content_type"("id") ON DELETE CASCADE
);

CREATE TABLE "auth_group_permissions" (
    "id"            BIGSERIAL PRIMARY KEY,
    "group_id"      BIGINT    NOT NULL REFERENCES "auth_group"("id")      ON DELETE CASCADE,
    "permission_id" BIGINT    NOT NULL REFERENCES "auth_permission"("id") ON DELETE CASCADE,
    UNIQUE ("group_id", "permission_id")
);

CREATE TABLE "django_migrations" (
    "id"      BIGSERIAL    PRIMARY KEY,
    "app"     VARCHAR(255) NOT NULL,
    "name"    VARCHAR(255) NOT NULL,
    "applied" TIMESTAMPTZ  NOT NULL
);

CREATE TABLE "django_session" (
    "session_key"  VARCHAR(40) PRIMARY KEY,
    "session_data" TEXT        NOT NULL,
    "expire_date"  TIMESTAMPTZ NOT NULL
);
CREATE INDEX "django_session_expire_date_idx" ON "django_session" ("expire_date");

CREATE TABLE "django_admin_log" (
    "id"              BIGSERIAL    PRIMARY KEY,
    "action_time"     TIMESTAMPTZ  NOT NULL,
    "object_id"       TEXT,
    "object_repr"     VARCHAR(200) NOT NULL,
    "action_flag"     SMALLINT     NOT NULL CHECK ("action_flag" >= 0),
    "change_message"  TEXT         NOT NULL,
    "content_type_id" BIGINT       REFERENCES "django_content_type"("id") ON DELETE SET NULL,
    "user_id"         BIGINT       NOT NULL   -- FK wired after users table
);

-- =============================================================================
--  SECTION 3 – CORE APP
-- =============================================================================

CREATE TABLE "users" (
    "id"                BIGSERIAL    PRIMARY KEY,
    "password"          VARCHAR(128) NOT NULL DEFAULT '',
    "last_login"        TIMESTAMPTZ,
    "is_superuser"      BOOLEAN      NOT NULL DEFAULT FALSE,
    "username"          VARCHAR(150) NOT NULL UNIQUE,
    "first_name"        VARCHAR(150) NOT NULL DEFAULT '',
    "last_name"         VARCHAR(150) NOT NULL DEFAULT '',
    "is_staff"          BOOLEAN      NOT NULL DEFAULT FALSE,
    "is_active"         BOOLEAN      NOT NULL DEFAULT TRUE,
    "date_joined"       TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "email"             VARCHAR(254) NOT NULL UNIQUE,
    "phone"             VARCHAR(20)  NOT NULL DEFAULT '',
    "avatar"            VARCHAR(100),
    "role"              VARCHAR(20)  NOT NULL DEFAULT 'customer'
                            CHECK ("role" IN ('customer','restaurant_owner','event_organizer','delivery_partner','admin')),
    "restaurant_name"   VARCHAR(255) NOT NULL DEFAULT '',
    "company_name"      VARCHAR(255) NOT NULL DEFAULT '',
    "is_email_verified" BOOLEAN      NOT NULL DEFAULT FALSE,
    "is_phone_verified" BOOLEAN      NOT NULL DEFAULT FALSE,
    "created_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    "updated_at"        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "users_email_idx" ON "users" ("email");
CREATE INDEX "users_phone_idx" ON "users" ("phone");
CREATE INDEX "users_role_idx"  ON "users" ("role");

CREATE TABLE "users_groups" (
    "id"       BIGSERIAL PRIMARY KEY,
    "user_id"  BIGINT    NOT NULL REFERENCES "users"("id")      ON DELETE CASCADE,
    "group_id" BIGINT    NOT NULL REFERENCES "auth_group"("id") ON DELETE CASCADE,
    UNIQUE ("user_id", "group_id")
);

CREATE TABLE "users_user_permissions" (
    "id"            BIGSERIAL PRIMARY KEY,
    "user_id"       BIGINT    NOT NULL REFERENCES "users"("id")           ON DELETE CASCADE,
    "permission_id" BIGINT    NOT NULL REFERENCES "auth_permission"("id") ON DELETE CASCADE,
    UNIQUE ("user_id", "permission_id")
);

ALTER TABLE "django_admin_log"
    ADD CONSTRAINT "django_admin_log_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

CREATE TABLE "addresses" (
    "id"          BIGSERIAL    PRIMARY KEY,
    "user_id"     BIGINT       NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "label"       VARCHAR(20)  NOT NULL DEFAULT 'home'
                      CHECK ("label" IN ('home','work','other')),
    "street"      VARCHAR(255) NOT NULL,
    "city"        VARCHAR(100) NOT NULL,
    "state"       VARCHAR(100) NOT NULL,
    "postal_code" VARCHAR(20)  NOT NULL,
    "latitude"    NUMERIC(10,8),
    "longitude"   NUMERIC(11,8),
    "is_default"  BOOLEAN      NOT NULL DEFAULT FALSE,
    "created_at"  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE TABLE "payments" (
    "id"             BIGSERIAL     PRIMARY KEY,
    "user_id"        BIGINT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "amount"         NUMERIC(10,2) NOT NULL,
    "currency"       VARCHAR(3)    NOT NULL DEFAULT 'INR',
    "method"         VARCHAR(20)   NOT NULL DEFAULT 'credit_card'
                         CHECK ("method" IN ('credit_card','debit_card','upi','wallet','net_banking','cash_on_delivery')),
    "status"         VARCHAR(20)   NOT NULL DEFAULT 'pending'
                         CHECK ("status" IN ('pending','completed','failed','refunded')),
    "transaction_id" VARCHAR(255)  UNIQUE,
    "content_type"   VARCHAR(50)   NOT NULL DEFAULT '',
    "object_id"      BIGINT,
    "created_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "payments_user_id_idx"    ON "payments" ("user_id");
CREATE INDEX "payments_status_idx"     ON "payments" ("status");
CREATE INDEX "payments_created_at_idx" ON "payments" ("created_at" DESC);

CREATE TABLE "notifications" (
    "id"           BIGSERIAL    PRIMARY KEY,
    "user_id"      BIGINT       NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "type"         VARCHAR(30)  NOT NULL DEFAULT 'system'
                       CHECK ("type" IN ('order_status','booking_confirmation','event_reminder','promotion','system')),
    "title"        VARCHAR(255) NOT NULL,
    "message"      TEXT         NOT NULL,
    "related_id"   BIGINT,
    "related_type" VARCHAR(50)  NOT NULL DEFAULT '',
    "is_read"      BOOLEAN      NOT NULL DEFAULT FALSE,
    "created_at"   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "notifications_user_id_idx"    ON "notifications" ("user_id");
CREATE INDEX "notifications_is_read_idx"    ON "notifications" ("is_read");
CREATE INDEX "notifications_created_at_idx" ON "notifications" ("created_at" DESC);

-- =============================================================================
--  SECTION 4 – RESTAURANTS APP  (legacy catalogue)
-- =============================================================================

CREATE TABLE "restaurant_catalogue" (
    "id"            BIGSERIAL     PRIMARY KEY,
    "osm_id"        VARCHAR(50)   NOT NULL UNIQUE,
    "name"          VARCHAR(255)  NOT NULL,
    "slug"          VARCHAR(255)  NOT NULL UNIQUE DEFAULT '',
    "area"          VARCHAR(100)  NOT NULL DEFAULT 'Bandra'
                        CHECK ("area" IN ('Bandra','Andheri','Juhu','Colaba','Dadar','Powai','Worli','Churchgate','Thane','Borivali')),
    "cuisine"       VARCHAR(100)  NOT NULL DEFAULT 'Indian'
                        CHECK ("cuisine" IN ('Indian','Chinese','Italian','Continental','Fast Food','Street Food','Seafood','Mughlai','South Indian','North Indian')),
    "cuisine_types" VARCHAR(255)  NOT NULL DEFAULT '',
    "rating"        NUMERIC(3,2)  NOT NULL DEFAULT 1.00
                        CHECK ("rating" >= 1 AND "rating" <= 5),
    "price_range"   INTEGER       NOT NULL DEFAULT 2
                        CHECK ("price_range" >= 1 AND "price_range" <= 4),
    "image_url"     VARCHAR(1000) NOT NULL DEFAULT '',
    "address"       VARCHAR(500)  NOT NULL DEFAULT '',
    "hours"         VARCHAR(255)  NOT NULL DEFAULT '',
    "is_open"       BOOLEAN       NOT NULL DEFAULT TRUE,
    "veg_only"      BOOLEAN       NOT NULL DEFAULT FALSE,
    "description"   TEXT          NOT NULL DEFAULT '',
    "data_source"   VARCHAR(10)   NOT NULL DEFAULT 'fake'
                        CHECK ("data_source" IN ('fake','real')),
    "latitude"      NUMERIC(9,6)  NOT NULL DEFAULT 0,
    "longitude"     NUMERIC(9,6)  NOT NULL DEFAULT 0,
    "opening_hours" VARCHAR(500),
    "phone"         VARCHAR(50),
    "website"       VARCHAR(500),
    "photo_url"     VARCHAR(1000),
    "city"          VARCHAR(100)  NOT NULL DEFAULT 'Mumbai',
    "is_active"     BOOLEAN       NOT NULL DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "restaurant_catalogue_data_source_idx" ON "restaurant_catalogue" ("data_source");

-- =============================================================================
--  SECTION 5 – ZESTY APP  (food delivery)
-- =============================================================================

CREATE TABLE "restaurants" (
    "id"                BIGSERIAL     PRIMARY KEY,
    "owner_id"          BIGINT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name"              VARCHAR(255)  NOT NULL,
    "description"       TEXT          NOT NULL DEFAULT '',
    "cuisine_types"     VARCHAR(255)  NOT NULL DEFAULT '',
    "address"           VARCHAR(255)  NOT NULL DEFAULT '',
    "latitude"          NUMERIC(10,8),
    "longitude"         NUMERIC(11,8),
    "delivery_fee"      NUMERIC(5,2)  NOT NULL DEFAULT 0,
    "delivery_time_min" INTEGER       NOT NULL DEFAULT 20,
    "delivery_time_max" INTEGER       NOT NULL DEFAULT 40,
    "image"             VARCHAR(100),
    "banner"            VARCHAR(100),
    "rating"            NUMERIC(3,2)  NOT NULL DEFAULT 0,
    "review_count"      INTEGER       NOT NULL DEFAULT 0,
    "phone"             VARCHAR(20)   NOT NULL DEFAULT '',
    "is_active"         BOOLEAN       NOT NULL DEFAULT TRUE,
    "is_verified"       BOOLEAN       NOT NULL DEFAULT FALSE,
    "created_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updated_at"        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "restaurants_rating_idx"    ON "restaurants" ("rating");
CREATE INDEX "restaurants_is_active_idx" ON "restaurants" ("is_active");

CREATE TABLE "menu_items" (
    "id"            BIGSERIAL    PRIMARY KEY,
    "restaurant_id" BIGINT       NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
    "name"          VARCHAR(255) NOT NULL,
    "description"   TEXT         NOT NULL DEFAULT '',
    "price"         NUMERIC(8,2) NOT NULL,
    "category"      VARCHAR(100) NOT NULL,
    "image"         VARCHAR(100),
    "is_vegetarian" BOOLEAN      NOT NULL DEFAULT FALSE,
    "is_vegan"      BOOLEAN      NOT NULL DEFAULT FALSE,
    "is_available"  BOOLEAN      NOT NULL DEFAULT TRUE,
    "created_at"    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);
CREATE INDEX "menu_items_restaurant_id_idx" ON "menu_items" ("restaurant_id");
CREATE INDEX "menu_items_category_idx"      ON "menu_items" ("category");

-- orders  (UUID primary key – gen_random_uuid() requires pgcrypto or PG 13+)
CREATE TABLE "orders" (
    "id"                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id"                 BIGINT        NOT NULL REFERENCES "users"("id")       ON DELETE CASCADE,
    "restaurant_id"           BIGINT        NOT NULL REFERENCES "restaurants"("id") ON DELETE RESTRICT,
    "status"                  VARCHAR(20)   NOT NULL DEFAULT 'pending'
                                  CHECK ("status" IN ('pending','confirmed','preparing','ready','out_for_delivery','delivered','cancelled')),
    "delivery_address"        JSONB         NOT NULL DEFAULT '{}',
    "subtotal"                NUMERIC(10,2) NOT NULL DEFAULT 0,
    "delivery_fee"            NUMERIC(5,2)  NOT NULL DEFAULT 0,
    "tax"                     NUMERIC(8,2)  NOT NULL DEFAULT 0,
    "total_amount"            NUMERIC(10,2) NOT NULL DEFAULT 0,
    "estimated_delivery_time" TIMESTAMPTZ,
    "special_instructions"    TEXT          NOT NULL DEFAULT '',
    "payment_method"          VARCHAR(20)   NOT NULL DEFAULT 'cod',
    "payment_status"          VARCHAR(10)   NOT NULL DEFAULT 'pending',
    "created_at"              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updated_at"              TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "orders_user_id_idx"       ON "orders" ("user_id");
CREATE INDEX "orders_restaurant_id_idx" ON "orders" ("restaurant_id");
CREATE INDEX "orders_status_idx"        ON "orders" ("status");
CREATE INDEX "orders_created_at_idx"    ON "orders" ("created_at" DESC);

CREATE TABLE "order_items" (
    "id"             BIGSERIAL     PRIMARY KEY,
    "order_id"       UUID          NOT NULL REFERENCES "orders"("id")     ON DELETE CASCADE,
    "menu_item_id"   BIGINT        NOT NULL REFERENCES "menu_items"("id") ON DELETE RESTRICT,
    "quantity"       INTEGER       NOT NULL DEFAULT 1,
    "unit_price"     NUMERIC(8,2)  NOT NULL,
    "total_price"    NUMERIC(10,2) NOT NULL,
    "customizations" JSONB         NOT NULL DEFAULT '{}'
);
CREATE INDEX "order_items_order_id_idx" ON "order_items" ("order_id");

CREATE TABLE "reviews" (
    "id"            BIGSERIAL   PRIMARY KEY,
    "user_id"       BIGINT      NOT NULL REFERENCES "users"("id")       ON DELETE CASCADE,
    "restaurant_id" BIGINT      NOT NULL REFERENCES "restaurants"("id") ON DELETE CASCADE,
    "order_id"      UUID        UNIQUE REFERENCES "orders"("id")        ON DELETE SET NULL,
    "rating"        INTEGER     NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
    "comment"       TEXT        NOT NULL DEFAULT '',
    "created_at"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("user_id", "restaurant_id")
);

CREATE TABLE "delivery_tracking" (
    "id"                          BIGSERIAL     PRIMARY KEY,
    "order_id"                    UUID          NOT NULL UNIQUE REFERENCES "orders"("id") ON DELETE CASCADE,
    "delivery_partner_name"       VARCHAR(100)  NOT NULL DEFAULT 'Delivery Partner',
    "delivery_partner_phone"      VARCHAR(20)   NOT NULL DEFAULT '+910000000000',
    "current_lat"                 NUMERIC(10,8),
    "current_lng"                 NUMERIC(11,8),
    "delivery_partner_avatar_url" VARCHAR(1000) NOT NULL DEFAULT '',
    "status_timeline"             JSONB         NOT NULL DEFAULT '[]',
    "updated_at"                  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  SECTION 6 – EVENTRA APP
-- =============================================================================

CREATE TABLE "events" (
    "id"              BIGSERIAL     PRIMARY KEY,
    "organizer_id"    BIGINT        NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name"            VARCHAR(255)  NOT NULL,
    "description"     TEXT          NOT NULL DEFAULT '',
    "category"        VARCHAR(20)   NOT NULL
                          CHECK ("category" IN ('movie','concert','sports','theater','comedy','expo','dining')),
    "venue_name"      VARCHAR(255)  NOT NULL,
    "address"         VARCHAR(255)  NOT NULL DEFAULT '',
    "latitude"        NUMERIC(10,8),
    "longitude"       NUMERIC(11,8),
    "event_date"      TIMESTAMPTZ   NOT NULL,
    "event_end_date"  TIMESTAMPTZ,
    "image"           VARCHAR(100),
    "banner"          VARCHAR(100),
    "rating"          NUMERIC(3,2)  NOT NULL DEFAULT 0,
    "review_count"    INTEGER       NOT NULL DEFAULT 0,
    "total_seats"     INTEGER       NOT NULL DEFAULT 0,
    "available_seats" INTEGER       NOT NULL DEFAULT 0,
    "is_published"    BOOLEAN       NOT NULL DEFAULT FALSE,
    "is_cancelled"    BOOLEAN       NOT NULL DEFAULT FALSE,
    "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "events_event_date_idx"   ON "events" ("event_date" DESC);
CREATE INDEX "events_category_idx"     ON "events" ("category");
CREATE INDEX "events_organizer_id_idx" ON "events" ("organizer_id");

CREATE TABLE "ticket_types" (
    "id"                 BIGSERIAL     PRIMARY KEY,
    "event_id"           BIGINT        NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
    "name"               VARCHAR(100)  NOT NULL,
    "price"              NUMERIC(10,2) NOT NULL,
    "quantity_total"     INTEGER       NOT NULL,
    "quantity_available" INTEGER       NOT NULL,
    "description"        TEXT          NOT NULL DEFAULT '',
    "benefits"           TEXT          NOT NULL DEFAULT ''
);
CREATE INDEX "ticket_types_event_id_idx" ON "ticket_types" ("event_id");

CREATE TABLE "seats" (
    "id"             BIGSERIAL   PRIMARY KEY,
    "event_id"       BIGINT      NOT NULL REFERENCES "events"("id")       ON DELETE CASCADE,
    "ticket_type_id" BIGINT      NOT NULL REFERENCES "ticket_types"("id") ON DELETE RESTRICT,
    "section"        VARCHAR(50) NOT NULL,
    "row"            VARCHAR(10) NOT NULL,
    "seat_number"    VARCHAR(10) NOT NULL,
    "status"         VARCHAR(20) NOT NULL DEFAULT 'available'
                         CHECK ("status" IN ('available','booked','reserved','blocked')),
    UNIQUE ("event_id", "section", "row", "seat_number")
);
CREATE INDEX "seats_event_id_idx" ON "seats" ("event_id");
CREATE INDEX "seats_status_idx"   ON "seats" ("status");

CREATE TABLE "bookings" (
    "id"                BIGSERIAL     PRIMARY KEY,
    "user_id"           BIGINT        NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
    "event_id"          BIGINT        NOT NULL REFERENCES "events"("id")   ON DELETE CASCADE,
    "payment_id"        BIGINT        UNIQUE   REFERENCES "payments"("id") ON DELETE SET NULL,
    "booking_reference" VARCHAR(50)   NOT NULL UNIQUE,
    "status"            VARCHAR(20)   NOT NULL DEFAULT 'pending'
                            CHECK ("status" IN ('pending','confirmed','completed','cancelled')),
    "total_tickets"     INTEGER       NOT NULL DEFAULT 0,
    "subtotal"          NUMERIC(10,2) NOT NULL DEFAULT 0,
    "tax"               NUMERIC(8,2)  NOT NULL DEFAULT 0,
    "total"             NUMERIC(10,2) NOT NULL DEFAULT 0,
    "booking_date"      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    "confirmation_sent" TIMESTAMPTZ
);
CREATE INDEX "bookings_user_id_idx"  ON "bookings" ("user_id");
CREATE INDEX "bookings_event_id_idx" ON "bookings" ("event_id");
CREATE INDEX "bookings_status_idx"   ON "bookings" ("status");

CREATE TABLE "booking_seats" (
    "id"         BIGSERIAL PRIMARY KEY,
    "booking_id" BIGINT    NOT NULL REFERENCES "bookings"("id") ON DELETE CASCADE,
    "seat_id"    BIGINT    NOT NULL REFERENCES "seats"("id")    ON DELETE RESTRICT,
    UNIQUE ("booking_id", "seat_id")
);

CREATE TABLE "event_reviews" (
    "id"         BIGSERIAL   PRIMARY KEY,
    "user_id"    BIGINT      NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
    "event_id"   BIGINT      NOT NULL REFERENCES "events"("id")   ON DELETE CASCADE,
    "booking_id" BIGINT      UNIQUE   REFERENCES "bookings"("id") ON DELETE SET NULL,
    "rating"     INTEGER     NOT NULL CHECK ("rating" BETWEEN 1 AND 5),
    "comment"    TEXT        NOT NULL DEFAULT '',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE ("user_id", "event_id")
);

CREATE TABLE "event_analytics" (
    "id"             BIGSERIAL     PRIMARY KEY,
    "event_id"       BIGINT        NOT NULL UNIQUE REFERENCES "events"("id") ON DELETE CASCADE,
    "views"          INTEGER       NOT NULL DEFAULT 0,
    "bookings_count" INTEGER       NOT NULL DEFAULT 0,
    "revenue"        NUMERIC(12,2) NOT NULL DEFAULT 0,
    "updated_at"     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  SECTION 7 – ORDERS APP  (legacy flat orders against catalogue)
-- =============================================================================

CREATE TABLE "legacy_orders" (
    "id"              BIGSERIAL     PRIMARY KEY,
    "restaurant_id"   BIGINT        NOT NULL REFERENCES "restaurant_catalogue"("id") ON DELETE CASCADE,
    "items"           JSONB         NOT NULL DEFAULT '[]',
    "subtotal"        NUMERIC(10,2) NOT NULL,
    "gst"             NUMERIC(10,2) NOT NULL,
    "platform_fee"    NUMERIC(10,2) NOT NULL,
    "delivery_charge" NUMERIC(10,2) NOT NULL,
    "total"           NUMERIC(10,2) NOT NULL,
    "status"          VARCHAR(30)   NOT NULL DEFAULT 'placed'
                          CHECK ("status" IN ('placed','confirmed','preparing','out_for_delivery','delivered')),
    "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX "legacy_orders_restaurant_id_idx" ON "legacy_orders" ("restaurant_id");
CREATE INDEX "legacy_orders_status_idx"        ON "legacy_orders" ("status");

-- =============================================================================
--  SECTION 8 – SIMPLEJWT TOKEN BLACKLIST
-- =============================================================================

CREATE TABLE "token_blacklist_outstandingtoken" (
    "id"         BIGSERIAL    PRIMARY KEY,
    "user_id"    BIGINT       REFERENCES "users"("id") ON DELETE SET NULL,
    "jti"        VARCHAR(255) NOT NULL UNIQUE,
    "token"      TEXT         NOT NULL,
    "created_at" TIMESTAMPTZ,
    "expires_at" TIMESTAMPTZ  NOT NULL
);

CREATE TABLE "token_blacklist_blacklistedtoken" (
    "id"                   BIGSERIAL   PRIMARY KEY,
    "outstanding_token_id" BIGINT      NOT NULL UNIQUE
                               REFERENCES "token_blacklist_outstandingtoken"("id") ON DELETE CASCADE,
    "blacklisted_at"       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================================================
--  SECTION 9 – HELPFUL VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW "v_active_restaurants" AS
SELECT r.id, r.name, r.cuisine_types, r.rating, r.delivery_fee,
       u.email AS owner_email
FROM "restaurants" r
JOIN "users" u ON u.id = r.owner_id
WHERE r.is_active = TRUE;

CREATE OR REPLACE VIEW "v_upcoming_events" AS
SELECT e.id, e.name, e.category, e.event_date, e.venue_name,
       e.available_seats, e.rating, u.email AS organizer_email
FROM "events" e
JOIN "users" u ON u.id = e.organizer_id
WHERE e.is_published = TRUE
  AND e.is_cancelled = FALSE
  AND e.event_date > NOW()
ORDER BY e.event_date ASC;

-- =============================================================================
--  SECTION 10 – SAMPLE DATA
-- =============================================================================

-- ── 10.1  Users ──────────────────────────────────────────────────────────────
INSERT INTO "users"
    (username, email, password, role, phone, is_active, first_name, last_name)
VALUES
    ('rahul',      'rahul@gmail.com',     '123', 'customer',          '9876543210', TRUE, 'Rahul',   'Sharma'),
    ('priya',      'priya@gmail.com',     '123', 'customer',          '9876543211', TRUE, 'Priya',   'Verma'),
    ('amit',       'amit@gmail.com',      '123', 'customer',          '9876543212', TRUE, 'Amit',    'Singh'),
    ('neha',       'neha@gmail.com',      '123', 'customer',          '9876543213', TRUE, 'Neha',    'Gupta'),
    ('rohit',      'rohit@gmail.com',     '123', 'customer',          '9876543214', TRUE, 'Rohit',   'Kumar'),
    ('owner1',     'owner1@gmail.com',    '123', 'restaurant_owner',  '9876543215', TRUE, 'Vikram',  'Patel'),
    ('owner2',     'owner2@gmail.com',    '123', 'restaurant_owner',  '9876543216', TRUE, 'Sunita',  'Nair'),
    ('organizer1', 'organizer@gmail.com', '123', 'event_organizer',   '9876543217', TRUE, 'Arjun',   'Mehta');

-- ── 10.2  Restaurants (zesty) ────────────────────────────────────────────────
-- owner1 = id 6 | owner2 = id 7
INSERT INTO "restaurants"
    (owner_id, name, cuisine_types, address, delivery_fee, rating, is_active)
VALUES
    (6, 'Spice Hub',     'Indian',    'Mumbai',      30, 4.7, TRUE),
    (6, 'Pizza World',   'Italian',   'Mumbai',      40, 4.5, TRUE),
    (7, 'Burger Point',  'Fast Food', 'Thane',       20, 4.3, TRUE),
    (7, 'Sushi Corner',  'Japanese',  'Navi Mumbai', 50, 4.8, TRUE);

-- ── 10.3  Menu Items ─────────────────────────────────────────────────────────
INSERT INTO "menu_items"
    (restaurant_id, name, price, category, is_available)
VALUES
    -- Spice Hub (id 1)
    (1, 'Paneer Tikka',    350, 'Starter',      TRUE),
    (1, 'Butter Naan',      50, 'Bread',         TRUE),
    (1, 'Dal Makhani',     280, 'Main Course',   TRUE),
    -- Pizza World (id 2)
    (2, 'Margherita Pizza',450, 'Pizza',         TRUE),
    (2, 'Farmhouse Pizza', 650, 'Pizza',         TRUE),
    -- Burger Point (id 3)
    (3, 'Veg Burger',      180, 'Burger',        TRUE),
    (3, 'French Fries',    120, 'Snacks',        TRUE),
    -- Sushi Corner (id 4)
    (4, 'California Roll', 700, 'Sushi',         TRUE),
    (4, 'Miso Soup',       250, 'Soup',          TRUE);

-- ── 10.4  Orders (UUID PK – no hard-coded IDs needed) ───────────────────────
-- payment_method must be a value accepted by the column (VARCHAR(20), no CHECK,
-- so any short string works; we keep values consistent with payments.method).
INSERT INTO "orders"
    (user_id, restaurant_id, status, subtotal, delivery_fee, tax,
     total_amount, payment_method, payment_status)
VALUES
    (1, 1, 'delivered',      700.00, 30, 35.00,   765.00,   'upi',             'completed'),
    (2, 1, 'delivered',      400.00, 30, 20.00,   450.00,   'upi',             'completed'),
    (3, 2, 'pending',        650.00, 40, 32.50,   722.50,   'credit_card',     'pending'),
    (4, 2, 'confirmed',      450.00, 40, 22.50,   512.50,   'credit_card',     'completed'),
    (5, 3, 'delivered',      300.00, 20, 15.00,   335.00,   'cash_on_delivery','completed'),
    (1, 3, 'cancelled',      180.00, 20,  9.00,   209.00,   'cash_on_delivery','failed'),
    (2, 4, 'delivered',      950.00, 50, 47.50,  1047.50,   'upi',             'completed'),
    (3, 4, 'ready',          700.00, 50, 35.00,   785.00,   'upi',             'completed');

-- ── 10.5  Payments ───────────────────────────────────────────────────────────
INSERT INTO "payments"
    (user_id, amount, method, status)
VALUES
    (1,  765.00,  'upi',             'completed'),
    (2,  450.00,  'upi',             'completed'),
    (3,  722.50,  'credit_card',     'pending'),
    (4,  512.50,  'credit_card',     'completed'),
    (5,  335.00,  'cash_on_delivery','completed'),
    (1,  209.00,  'cash_on_delivery','failed'),
    (2, 1047.50,  'upi',             'completed'),
    (3,  785.00,  'upi',             'completed');

-- ── 10.6  Events ─────────────────────────────────────────────────────────────
-- organizer1 = user id 8
INSERT INTO "events"
    (organizer_id, name, description, category,
     venue_name, address, event_date, total_seats, available_seats, is_published)
VALUES
    (8, 'Rock Night',    'Live Rock Music Concert', 'concert',
     'Phoenix Arena', 'Mumbai', '2026-08-15 18:00:00+05:30', 500, 180, TRUE),
    (8, 'Food Carnival', 'Street Food Festival',    'expo',
     'BKC Ground',    'Mumbai', '2026-08-20 10:00:00+05:30', 800, 350, TRUE),
    (8, 'Comedy Show',   'Stand-up Comedy Night',   'comedy',
     'NCPA',          'Mumbai', '2026-09-05 20:00:00+05:30', 300, 120, TRUE);

-- ── 10.7  Bookings ───────────────────────────────────────────────────────────
INSERT INTO "bookings"
    (user_id, event_id, booking_reference, status,
     total_tickets, subtotal, tax, total)
VALUES
    (1, 1, 'BK101', 'confirmed', 2, 3000.00, 150.00, 3150.00),
    (2, 1, 'BK102', 'completed', 4, 6000.00, 300.00, 6300.00),
    (3, 2, 'BK103', 'confirmed', 3, 2400.00, 120.00, 2520.00),
    (4, 3, 'BK104', 'pending',   2, 1800.00,  90.00, 1890.00),
    (5, 2, 'BK105', 'completed', 5, 4000.00, 200.00, 4200.00);

-- =============================================================================
--  SECTION 11 – VERIFY DATA
-- =============================================================================

\echo '============================================================'
\echo '  ROW COUNT SUMMARY'
\echo '============================================================'
SELECT 'users'       AS table_name, COUNT(*) AS row_count FROM "users"
UNION ALL
SELECT 'restaurants',  COUNT(*) FROM "restaurants"
UNION ALL
SELECT 'menu_items',   COUNT(*) FROM "menu_items"
UNION ALL
SELECT 'orders',       COUNT(*) FROM "orders"
UNION ALL
SELECT 'payments',     COUNT(*) FROM "payments"
UNION ALL
SELECT 'events',       COUNT(*) FROM "events"
UNION ALL
SELECT 'bookings',     COUNT(*) FROM "bookings";

\echo ''
\echo '============================================================'
\echo '  TABLE: users'
\echo '============================================================'
SELECT id, username, email, role, phone, is_active FROM "users";

\echo ''
\echo '============================================================'
\echo '  TABLE: restaurants'
\echo '============================================================'
SELECT id, owner_id, name, cuisine_types, address, delivery_fee, rating, is_active FROM "restaurants";

\echo ''
\echo '============================================================'
\echo '  TABLE: menu_items'
\echo '============================================================'
SELECT id, restaurant_id, name, price, category, is_available FROM "menu_items";

\echo ''
\echo '============================================================'
\echo '  TABLE: orders'
\echo '============================================================'
SELECT id, user_id, restaurant_id, status, subtotal, delivery_fee, tax, total_amount, payment_method, payment_status FROM "orders";

\echo ''
\echo '============================================================'
\echo '  TABLE: payments'
\echo '============================================================'
SELECT id, user_id, amount, currency, method, status FROM "payments";

\echo ''
\echo '============================================================'
\echo '  TABLE: events'
\echo '============================================================'
SELECT id, organizer_id, name, category, venue_name, event_date, total_seats, available_seats, is_published FROM "events";

\echo ''
\echo '============================================================'
\echo '  TABLE: bookings'
\echo '============================================================'
SELECT id, user_id, event_id, booking_reference, status, total_tickets, subtotal, tax, total FROM "bookings";

-- =============================================================================
--  SECTION 12 – OLAP OPERATIONS
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
--  12.1  SLICE  –  Single-dimension filter
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.1 SLICE — Delivered Orders  [TABLE: orders]'
\echo '============================================================'
SELECT id, user_id, restaurant_id, total_amount, status
FROM "orders"
WHERE status = 'delivered';

\echo ''
\echo '============================================================'
\echo '  OLAP 12.1 SLICE — Concert Events  [TABLE: events]'
\echo '============================================================'
SELECT name, venue_name, event_date
FROM "events"
WHERE category = 'concert';

-- ─────────────────────────────────────────────────────────────────────────────
--  12.2  DICE  –  Multi-dimension filter
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.2 DICE — Delivered + UPI + Completed'
\echo '  [TABLES: orders JOIN users JOIN restaurants]'
\echo '============================================================'
SELECT
    o.id,
    u.username,
    r.name          AS restaurant,
    o.total_amount,
    o.status,
    o.payment_status
FROM "orders"      o
JOIN "users"       u ON u.id = o.user_id
JOIN "restaurants" r ON r.id = o.restaurant_id
WHERE o.status         = 'delivered'
  AND o.payment_status = 'completed'
  AND o.payment_method = 'upi';

-- ─────────────────────────────────────────────────────────────────────────────
--  12.3  ROLL-UP  –  Aggregate to higher granularity
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.3 ROLL-UP — Revenue & Orders per Restaurant'
\echo '  [TABLES: restaurants JOIN orders]'
\echo '============================================================'
SELECT
    r.name                  AS restaurant,
    SUM(o.total_amount)     AS revenue,
    COUNT(o.id)             AS total_orders
FROM "restaurants" r
JOIN "orders"      o ON r.id = o.restaurant_id
GROUP BY r.name
ORDER BY revenue DESC;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.3 ROLL-UP — Monthly Revenue'
\echo '  [TABLE: orders]'
\echo '============================================================'
SELECT
    DATE_TRUNC('month', o.created_at) AS month,
    SUM(o.total_amount)               AS revenue
FROM "orders" o
GROUP BY month
ORDER BY month;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.3 ROLL-UP — Revenue by Payment Method'
\echo '  [TABLE: orders]'
\echo '============================================================'
SELECT
    payment_method,
    SUM(total_amount) AS revenue
FROM "orders"
GROUP BY payment_method
ORDER BY revenue DESC;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.3 ROLL-UP — Booking Revenue per Event'
\echo '  [TABLES: events JOIN bookings]'
\echo '============================================================'
SELECT
    e.name          AS event,
    COUNT(b.id)     AS total_bookings,
    SUM(b.total)    AS booking_revenue
FROM "events"   e
JOIN "bookings" b ON e.id = b.event_id
GROUP BY e.name
ORDER BY booking_revenue DESC;

-- ─────────────────────────────────────────────────────────────────────────────
--  12.4  DRILL-DOWN  –  Break aggregate into finer detail
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.4 DRILL-DOWN — Restaurant → Each Order'
\echo '  [TABLES: restaurants JOIN orders JOIN users]'
\echo '============================================================'
SELECT
    r.name       AS restaurant,
    o.id         AS order_id,
    u.username,
    o.total_amount,
    o.status,
    o.created_at
FROM "restaurants" r
JOIN "orders"      o ON r.id = o.restaurant_id
JOIN "users"       u ON u.id = o.user_id
ORDER BY r.name, o.created_at;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.4 DRILL-DOWN — Event → Each Booking'
\echo '  [TABLES: events JOIN bookings JOIN users]'
\echo '============================================================'
SELECT
    e.name                AS event,
    b.booking_reference,
    u.username,
    b.total_tickets,
    b.total,
    b.status
FROM "events"   e
JOIN "bookings" b ON e.id = b.event_id
JOIN "users"    u ON u.id = b.user_id
ORDER BY e.name, b.booking_date;

-- ─────────────────────────────────────────────────────────────────────────────
--  12.5  PIVOT  –  Reshape rows into columns
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.5 PIVOT — Revenue by Order Status per Restaurant'
\echo '  [TABLE: orders]'
\echo '============================================================'
SELECT
    restaurant_id,
    SUM(CASE WHEN status = 'delivered'  THEN total_amount ELSE 0 END) AS delivered,
    SUM(CASE WHEN status = 'pending'    THEN total_amount ELSE 0 END) AS pending,
    SUM(CASE WHEN status = 'confirmed'  THEN total_amount ELSE 0 END) AS confirmed,
    SUM(CASE WHEN status = 'cancelled'  THEN total_amount ELSE 0 END) AS cancelled,
    SUM(CASE WHEN status = 'ready'      THEN total_amount ELSE 0 END) AS ready
FROM "orders"
GROUP BY restaurant_id
ORDER BY restaurant_id;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.5 PIVOT — Order Count by Payment Status per Method'
\echo '  [TABLE: orders]'
\echo '============================================================'
SELECT
    payment_method,
    COUNT(CASE WHEN payment_status = 'completed' THEN 1 END) AS completed,
    COUNT(CASE WHEN payment_status = 'pending'   THEN 1 END) AS pending,
    COUNT(CASE WHEN payment_status = 'failed'    THEN 1 END) AS failed
FROM "orders"
GROUP BY payment_method
ORDER BY payment_method;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.5 PIVOT — Booking Status Count per Event'
\echo '  [TABLES: events JOIN bookings]'
\echo '============================================================'
SELECT
    e.name                                                  AS event,
    COUNT(CASE WHEN b.status = 'confirmed'  THEN 1 END)    AS confirmed,
    COUNT(CASE WHEN b.status = 'completed'  THEN 1 END)    AS completed,
    COUNT(CASE WHEN b.status = 'pending'    THEN 1 END)    AS pending,
    COUNT(CASE WHEN b.status = 'cancelled'  THEN 1 END)    AS cancelled
FROM "events"   e
JOIN "bookings" b ON e.id = b.event_id
GROUP BY e.name
ORDER BY e.name;

-- ─────────────────────────────────────────────────────────────────────────────
--  12.6  DRILL-ACROSS  –  Join facts from multiple subject areas
-- ─────────────────────────────────────────────────────────────────────────────

\echo ''
\echo '============================================================'
\echo '  OLAP 12.6 DRILL-ACROSS — Users + Orders + Restaurants + Payments'
\echo '  [TABLES: users JOIN orders JOIN restaurants JOIN payments]'
\echo '============================================================'
SELECT
    u.username,
    r.name          AS restaurant,
    o.total_amount  AS order_amount,
    p.amount        AS payment_amount,
    p.method        AS payment_method,
    p.status        AS payment_status
FROM "users"       u
JOIN "orders"      o ON u.id = o.user_id
JOIN "restaurants" r ON r.id = o.restaurant_id
JOIN "payments"    p ON p.user_id = u.id
ORDER BY u.username;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.6 DRILL-ACROSS — Users + Bookings + Events'
\echo '  [TABLES: users JOIN bookings JOIN events]'
\echo '============================================================'
SELECT
    u.username,
    e.name          AS event,
    e.category,
    b.total_tickets,
    b.total         AS booking_total,
    b.status        AS booking_status
FROM "users"    u
JOIN "bookings" b ON u.id = b.user_id
JOIN "events"   e ON e.id = b.event_id
ORDER BY e.name, u.username;

\echo ''
\echo '============================================================'
\echo '  OLAP 12.6 DRILL-ACROSS — Cross-Platform Total Spend per User'
\echo '  [TABLES: users LEFT JOIN orders LEFT JOIN bookings]'
\echo '============================================================'
SELECT
    u.username,
    COALESCE(SUM(o.total_amount), 0)  AS food_spend,
    COALESCE(SUM(b.total),        0)  AS event_spend,
    COALESCE(SUM(o.total_amount), 0)
    + COALESCE(SUM(b.total),      0)  AS total_spend
FROM "users" u
LEFT JOIN "orders"   o ON u.id = o.user_id
LEFT JOIN "bookings" b ON u.id = b.user_id
GROUP BY u.username
ORDER BY total_spend DESC;

-- =============================================================================
--  END OF SCRIPT
-- =============================================================================
