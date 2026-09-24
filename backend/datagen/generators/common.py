"""Shared reference data and helpers for all datagen generators."""
import random
import zlib
import numpy as np
from django.contrib.auth.hashers import make_password

MAX_PAYMENT_OBJECT_ID = 2_147_483_647


def payment_object_id(order_id):
    """Same deterministic 32-bit-safe id scheme as
    zesty.views.OrderViewSet._payment_object_id — Payment.object_id is a
    plain IntegerField but zesty.Order's pk is a UUID, so a UUID-keyed
    order needs a stable hash rather than a literal cast.
    """
    try:
        value = int(order_id)
    except (TypeError, ValueError, OverflowError):
        value = zlib.crc32(str(order_id).encode('utf-8'))
    value = abs(value) or 1
    if value > MAX_PAYMENT_OBJECT_ID:
        value = (value % MAX_PAYMENT_OBJECT_ID) or MAX_PAYMENT_OBJECT_ID
    return value

FIRST_NAMES = [
    'Aarav', 'Vivaan', 'Aditya', 'Vihaan', 'Arjun', 'Sai', 'Reyansh', 'Krishna',
    'Ishaan', 'Shaurya', 'Ananya', 'Diya', 'Saanvi', 'Aadhya', 'Kavya', 'Myra',
    'Anika', 'Riya', 'Pari', 'Ira', 'Rohan', 'Kabir', 'Aryan', 'Dhruv', 'Yash',
    'Priya', 'Neha', 'Pooja', 'Sneha', 'Meera', 'Rahul', 'Amit', 'Sanjay',
    'Vikram', 'Rajesh', 'Anjali', 'Divya', 'Nikhil', 'Karan', 'Varun',
]
LAST_NAMES = [
    'Sharma', 'Verma', 'Gupta', 'Kumar', 'Singh', 'Patel', 'Shah', 'Mehta',
    'Joshi', 'Rao', 'Reddy', 'Nair', 'Iyer', 'Agarwal', 'Bansal', 'Malhotra',
    'Kapoor', 'Chopra', 'Desai', 'Pandey', 'Mishra', 'Yadav', 'Jain', 'Bhatt',
]
AREAS = [
    ('Andheri', 'Mumbai'), ('Bandra', 'Mumbai'), ('Powai', 'Mumbai'),
    ('Versova', 'Mumbai'), ('Malad', 'Mumbai'), ('Juhu', 'Mumbai'),
    ('Koramangala', 'Bengaluru'), ('Indiranagar', 'Bengaluru'), ('Whitefield', 'Bengaluru'),
    ('Hauz Khas', 'Delhi'), ('Connaught Place', 'Delhi'), ('Saket', 'Delhi'),
    ('Banjara Hills', 'Hyderabad'), ('Gachibowli', 'Hyderabad'),
    ('Viman Nagar', 'Pune'), ('Koregaon Park', 'Pune'),
]
CUISINES = [
    'North Indian', 'South Indian', 'Chinese', 'Italian', 'Continental',
    'Mexican', 'Thai', 'Japanese', 'Fast Food', 'Desserts', 'Bakery', 'Mughlai',
]
MENU_CATEGORIES = ['Starters', 'Main Course', 'Bread', 'Curry', 'Rice', 'Beverages', 'Desserts']

MENU_ITEM_POOL = {
    'Starters': ['Paneer Tikka', 'Chicken 65', 'Spring Roll', 'Masala Papad', 'Garlic Bread'],
    'Main Course': ['Paneer Butter Masala', 'Butter Chicken', 'Dal Makhani', 'Veg Biryani', 'Chole Bhature'],
    'Bread': ['Butter Naan', 'Tandoori Roti', 'Garlic Naan', 'Lachha Paratha'],
    'Curry': ['Dal Makhani', 'Rajma', 'Kadai Paneer', 'Chicken Curry'],
    'Rice': ['Veg Fried Rice', 'Jeera Rice', 'Chicken Biryani', 'Hyderabadi Biryani'],
    'Beverages': ['Cold Coffee', 'Masala Chai', 'Fresh Lime Soda', 'Mango Lassi'],
    'Desserts': ['Chocolate Brownie', 'Gulab Jamun', 'Ice Cream', 'Rasmalai'],
}

EVENT_CATEGORIES = ['movie', 'concert', 'sports', 'theater', 'comedy', 'expo', 'dining']
EVENT_NAME_POOL = {
    'concert': ['Midnight Ragas', 'Electric Skyline Tour', 'Acoustic Nights', 'Bass Drop Festival'],
    'movie': ['Premiere Night', 'Classic Cinema Revival', 'Indie Film Fest'],
    'sports': ['Premier League Night', 'City Marathon', 'Cricket Clash'],
    'theater': ['The Last Curtain', 'Broadway Echoes', 'Shadow Play'],
    'comedy': ['Laugh Riot Live', 'Stand-Up Showdown', 'Open Mic Nights'],
    'expo': ['Tech Frontier Expo', 'Art & Design Fair', 'Startup Showcase'],
    'dining': ['Chef\'s Table Experience', 'Wine & Dine Evening'],
}
PAYMENT_METHODS = ['credit_card', 'debit_card', 'upi', 'wallet', 'net_banking', 'cash_on_delivery']

SYNTHETIC_PASSWORD_HASH = make_password('Synthetic-Dev-Password-1!')


def rng(seed):
    random.seed(seed)
    return np.random.default_rng(seed)


def growth_curve_dates(n, start, end, np_rng, seasonal_peaks=()):
    """n datetimes between start/end following a growth curve (more mass
    toward `end`) with extra density near any month in `seasonal_peaks`
    (1-12), per PRD §10's 'growth curve with seasonal acquisition peaks'.
    """
    total_days = (end - start).days
    # Skew toward later days: sample from a Beta(2, 1) distribution (weights recent).
    fractions = np_rng.beta(2.0, 1.0, size=n)
    days_offset = (fractions * total_days).astype(int)
    dates = [start + __import__('datetime').timedelta(days=int(d)) for d in days_offset]

    if seasonal_peaks:
        boosted = []
        for d in dates:
            if d.month in seasonal_peaks and np_rng.random() < 0.3:
                jitter = np_rng.integers(-5, 5)
                d = d + __import__('datetime').timedelta(days=int(jitter))
            boosted.append(d)
        dates = boosted
    return sorted(dates)


def fix_auto_timestamps(model, objs, fields, batch_size=2000):
    """BUGGY BY CONSTRUCTION — kept only so any stale call sites fail
    loudly instead of silently reintroducing the bug below. Use
    bulk_create_with_timestamps() instead.

    The bug: Django's Field.pre_save() overwrites auto_now/auto_now_add
    attributes IN PLACE on the same Python object during bulk_create()'s
    INSERT. Calling this function *after* bulk_create() — which is exactly
    how every generator in this package originally called it — reads back
    the already-clobbered `timezone.now()` value from `objs`, not the
    historical date the caller originally set, and writes that same wrong
    value right back via bulk_update(). Net effect: every synthetic
    Order/Booking/Payment ended up dated "now" (generation time) instead
    of its intended historical date, which is why the warehouse's fact
    tables and RFM segmentation showed almost zero date variance despite
    datagen's growth-curve/seasonality logic looking correct in isolation.
    """
    raise RuntimeError(
        "fix_auto_timestamps() is broken by construction (see docstring) — "
        "use bulk_create_with_timestamps() instead."
    )


def bulk_create_with_timestamps(model, objs, timestamp_fields, create_batch_size=2000, update_batch_size=2000):
    """bulk_create `objs`, then restore any auto_now/auto_now_add fields
    (e.g. created_at) to the historical values the caller actually set.

    Values must be snapshotted *before* bulk_create runs — Django's
    Field.pre_save() mutates auto_now/auto_now_add attributes on the same
    Python objects during the INSERT, so reading them back afterward
    returns timezone.now(), not what the caller originally set (see
    fix_auto_timestamps' docstring for how this bit us). Returns the
    created objects (with real pks, and now the correct timestamps).
    """
    if not objs:
        return objs
    snapshots = [{f: getattr(obj, f) for f in timestamp_fields} for obj in objs]
    created = model.objects.bulk_create(objs, batch_size=create_batch_size)
    for obj, snap in zip(created, snapshots):
        for f, v in snap.items():
            setattr(obj, f, v)
    model.objects.bulk_update(created, timestamp_fields, batch_size=update_batch_size)
    return created


def weighted_hour(np_rng, day_part_weights=None):
    """Sample an hour of day with lunch/evening peaks (§8.4 day_part)."""
    hours = list(range(24))
    weights = np.array([
        0.5, 0.3, 0.2, 0.2, 0.2, 0.3, 0.5, 1.0,   # 0-7
        1.5, 1.2, 1.0, 1.5, 3.0, 3.5, 2.0, 1.2,   # 8-15 (lunch peak ~12-14)
        1.5, 2.0, 3.0, 4.0, 3.5, 2.5, 1.5, 0.8,   # 16-23 (evening peak ~19-20)
    ])
    weights = weights / weights.sum()
    return int(np_rng.choice(hours, p=weights))
