"""Deliberately planted patterns (PRD §10).

These constants are the single source of truth for what the generators in
`datagen/generators/` inject into the synthetic data, and what the mining
modules (§8.4) are later scored against. A mining module that fails to
recover one of these above its configured threshold indicates a pipeline
defect, not absent signal — so nothing here should be treated as fixed
prose that's out of sync with the actual generator code that reads it.

Basket rules — item pairs
--------------------------
Whenever a cart/basket includes the "trigger" item, the "companion" item is
added with elevated probability (`lift_boost`), on top of its base
popularity. Planted at both item level (this list) and category level
(`PLANTED_CATEGORY_PAIRS`) — item-level pairs can fall under a low support
threshold where the category-level pattern is still obvious, per §8.4's
own note that this is exactly why both levels are mined.

Cross-domain — genre to cuisine
--------------------------------
Customers who book a ticket in `PLANTED_CROSS_DOMAIN_GENRE` are, within
`PLANTED_CROSS_DOMAIN_WINDOW_HOURS` of the event and in the same zone,
given an elevated probability of ordering from `PLANTED_CROSS_DOMAIN_CUISINE`.

Cancellation — lead time and payment mode
-------------------------------------------
`cancellation_probability(lead_time_days, payment_mode)` is the single
function both the booking generator and (later) the risk-mining evaluation
should agree on as "the true generating function" — the mined model is
scored on how well it recovers this relationship from the data alone.
"""

# ---- Basket rules: item-level ----
# Menu item *names* (matched case-insensitively when generating restaurant
# menus) that should co-occur far more often than chance.
PLANTED_ITEM_PAIRS = [
    ('Butter Naan', 'Paneer Butter Masala', 0.55),
    ('French Fries', 'Cheeseburger', 0.50),
    ('Garlic Bread', 'Margherita Pizza', 0.45),
    ('Cold Coffee', 'Chocolate Brownie', 0.40),
    ('Masala Papad', 'Dal Makhani', 0.35),
]

# ---- Basket rules: category-level ----
PLANTED_CATEGORY_PAIRS = [
    ('Beverages', 'Desserts', 0.35),
    ('Starters', 'Main Course', 0.45),
    ('Bread', 'Curry', 0.50),
]

# ---- Cross-domain: one genre -> one cuisine, same zone, within N hours ----
PLANTED_CROSS_DOMAIN_GENRE = 'concert'
PLANTED_CROSS_DOMAIN_CUISINE = 'North Indian'
PLANTED_CROSS_DOMAIN_WINDOW_HOURS = 3
PLANTED_CROSS_DOMAIN_LIFT_BOOST = 0.40  # added probability on top of baseline


def cancellation_probability(lead_time_days: float, payment_mode: str) -> float:
    """The true, deliberately-simple generating function for booking
    cancellation. Longer lead time -> more time to change plans -> higher
    cancellation odds; 'cash_on_delivery'/pay-at-venue-style modes commit
    the customer less than a prepaid method, so they cancel more too.

    Bounded to [0.02, 0.65] so no combination of inputs makes cancellation
    a certainty or an impossibility — the risk model has something to learn.
    """
    base = 0.05 + min(lead_time_days, 60) * 0.006
    payment_multiplier = {
        'cash_on_delivery': 1.6,
        'wallet': 1.1,
        'upi': 1.0,
        'net_banking': 0.9,
        'credit_card': 0.8,
        'debit_card': 0.85,
    }.get(payment_mode, 1.0)
    return max(0.02, min(0.65, base * payment_multiplier))


# ---- Anomaly injection rate ----
ANOMALY_RATE = 0.01  # ~1% of transactions, per §10


# ---- No-show: the true generating function ----
# Only decided for confirmed bookings of events that have already happened
# (datagen/generators/enrichment.py). The risk-mining module is scored on
# how well it recovers this from lead time, payment mode, ticket price and
# event weekday alone.
def no_show_probability(lead_time_days: float, payment_mode: str, ticket_price: float, event_weekday: int) -> float:
    base = 0.04 + min(lead_time_days, 90) * 0.0015
    payment_multiplier = {
        'cash_on_delivery': 2.0,
        'wallet': 1.2,
        'upi': 1.0,
        'net_banking': 0.9,
        'credit_card': 0.8,
        'debit_card': 0.85,
    }.get(payment_mode, 1.0)
    price_multiplier = 1.5 if ticket_price < 500 else (0.6 if ticket_price > 2000 else 1.0)
    weekday_multiplier = 1.3 if event_weekday < 4 else 1.0  # Mon-Thu events lose more people
    return max(0.01, min(0.45, base * payment_multiplier * price_multiplier * weekday_multiplier))


# ---- Delivery time: the true generating function (minutes) ----
# Kitchen time grows with basket size and rush hour; transit depends on a
# fixed per-restaurant distance (0-15 min) plus rush hour and weekends.
PEAK_DELIVERY_HOURS = {12, 13, 14, 19, 20, 21}


def prep_minutes(item_count: int, hour: int) -> float:
    return 8 + 2.5 * min(item_count, 12) + (6 if hour in PEAK_DELIVERY_HOURS else 0)


def transit_minutes(restaurant_distance: float, hour: int, is_weekend: bool) -> float:
    return 12 + restaurant_distance + (6 if hour in PEAK_DELIVERY_HOURS else 0) + (3 if is_weekend else 0)


# ---- Promotions ----
# A share of restaurants run one 3-week promo; during it, order volume rises
# by PROMO_ORDER_UPLIFT and PROMO_REDEMPTION_RATE of orders use the code.
# The promo-effect module should measure roughly this uplift.
PROMO_RESTAURANT_SHARE = 0.08
PROMO_ORDER_UPLIFT = 0.30
PROMO_REDEMPTION_RATE = 0.35
PROMO_WINDOW_DAYS = 21

# ---- Search ----
# Terms people search for that nothing on the platform matches (search
# mining should surface these as unmet demand), and one term that spikes
# over the last ten days (it should rank as trending).
UNMET_SEARCH_TERMS = ['poke bowl', 'vegan biryani', 'keto bowl', 'jazz night', 'kids workshop']
TRENDING_SEARCH_TERM = 'korean fried chicken'
