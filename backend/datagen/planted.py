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
