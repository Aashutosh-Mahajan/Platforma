"""Restaurant + menu item generation, with planted basket-pair items woven
into menus so market-basket mining (§8.4) has real signal to recover.
"""
import random
import datetime
from django.db import connection
from django.utils import timezone
from django.utils.text import slugify

from core.models import User
from zesty.models import Restaurant, MenuItem
from .common import (
    FIRST_NAMES, LAST_NAMES, AREAS, CUISINES, MENU_CATEGORIES, MENU_ITEM_POOL,
    SYNTHETIC_PASSWORD_HASH,
)
from datagen.planted import PLANTED_ITEM_PAIRS

PRICE_RANGE_BY_BAND = {'budget': 1, 'mid': 2, 'premium': 4}

# "High density" areas get a premium price-band skew (PRD §10: "price band
# correlates with density").
HIGH_DENSITY_AREAS = {'Bandra', 'Koramangala', 'Connaught Place', 'Banjara Hills'}

RESTAURANT_NAME_PREFIXES = ['The', 'Royal', 'Spice', 'Urban', 'Green', 'Golden', 'Corner', 'Classic']
RESTAURANT_NAME_SUFFIXES = ['Kitchen', 'Diner', 'Bistro', 'Cafe', 'House', 'Grill', 'Eatery', 'Table']


def _price_for_band(band, np_rng):
    ranges = {'budget': (99, 199), 'mid': (200, 399), 'premium': (400, 799)}
    lo, hi = ranges[band]
    return round(float(np_rng.uniform(lo, hi)), 2)


def generate_catalog(n_restaurants, items_per_restaurant, np_rng, run_tag):
    """Bulk-create restaurants (each with its own owner) and menu items.

    Every restaurant's menu includes at least one side of each planted
    item pair with elevated probability, so PLANTED_ITEM_PAIRS actually
    co-occurs across many restaurants' menus — basket mining operates
    within a single restaurant's order, so the pair has to live on the
    same menu to ever be orderable together.
    """
    owners = []
    for i in range(n_restaurants):
        first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        owners.append(User(
            email=f"owner.{run_tag}{i}@synthetic.platforma.dev",
            username=f"owner{run_tag}{i}",
            first_name=first, last_name=last,
            role='restaurant_owner',
            is_email_verified=True,
            password=SYNTHETIC_PASSWORD_HASH,
        ))
    User.objects.bulk_create(owners, batch_size=1000)
    owners = list(User.objects.filter(username__startswith=f"owner{run_tag}"))

    # The `restaurants` table is shared with the legacy `restaurants` app
    # (same db_table), which has its own NOT NULL columns — area, city,
    # cuisine, data_source, hours, image_url, is_open, price_range, slug,
    # veg_only — that zesty.Restaurant's Django model doesn't declare at
    # all. A normal Restaurant.objects.bulk_create() omits them from the
    # INSERT and violates those NOT NULL constraints, so this goes through
    # raw SQL instead, supplying every required column explicitly.
    now = timezone.now()
    rows = []
    for i, owner in enumerate(owners):
        area, city = random.choice(AREAS)
        cuisine = random.choice(CUISINES)
        band = 'premium' if area in HIGH_DENSITY_AREAS and np_rng.random() < 0.5 else (
            'budget' if np_rng.random() < 0.4 else 'mid'
        )
        name = f"{random.choice(RESTAURANT_NAME_PREFIXES)} {cuisine.split()[0]} {random.choice(RESTAURANT_NAME_SUFFIXES)} {run_tag}{i}"
        is_active = bool(np_rng.random() < 0.95)
        rows.append({
            'owner_id': owner.id, 'name': name,
            'description': f"Serving authentic {cuisine} cuisine in {area}.",
            'cuisine_types': cuisine,
            'address': f"{random.randint(1, 200)}, {area}, {city}",
            'latitude': round(random.uniform(12.8, 28.7), 6),
            'longitude': round(random.uniform(72.8, 88.4), 6),
            'delivery_fee': round(float(np_rng.uniform(20, 60)), 2),
            'delivery_time_min': random.randint(15, 25),
            'delivery_time_max': random.randint(30, 55),
            'phone': f"+91{random.randint(7000000000, 9999999999)}",
            'is_active': is_active,
            'is_verified': True,  # datagen output is meant to be immediately usable/visible
            'rating': round(float(np_rng.uniform(3.0, 4.9)), 2),
            'review_count': int(np_rng.integers(5, 400)),
            'created_at': now, 'updated_at': now,
            'area': area, 'city': city, 'cuisine': cuisine,
            'data_source': 'fake', 'hours': '', 'image_url': '',
            'is_open': is_active, 'price_range': PRICE_RANGE_BY_BAND[band],
            'slug': f"{slugify(name)}-{run_tag}{i}",
            'veg_only': False,
            '_band': band,
        })

    created_ids = []
    with connection.cursor() as cursor:
        for row in rows:
            band = row.pop('_band')
            columns = list(row.keys())
            placeholders = ', '.join(['%s'] * len(columns))
            cursor.execute(
                f"INSERT INTO restaurants ({', '.join(columns)}) VALUES ({placeholders}) RETURNING id",
                [row[c] for c in columns],
            )
            created_ids.append((cursor.fetchone()[0], band))

    created_restaurants = list(
        Restaurant.objects.filter(id__in=[rid for rid, _ in created_ids]).select_related('owner')
    )
    band_by_restaurant = dict(created_ids)

    trigger_items = {pair[0] for pair in PLANTED_ITEM_PAIRS}
    companion_items = {pair[0]: pair[1] for pair in PLANTED_ITEM_PAIRS}

    menu_items = []
    for restaurant in created_restaurants:
        band = band_by_restaurant[restaurant.id]
        chosen_names = set()
        # Guarantee planted pairs appear together on a subset of menus.
        if np_rng.random() < 0.6:
            trigger, companion = random.choice(PLANTED_ITEM_PAIRS)[:2]
            chosen_names.add(trigger)
            chosen_names.add(companion)

        target_count = items_per_restaurant
        all_pool = [name for names in MENU_ITEM_POOL.values() for name in names]
        while len(chosen_names) < target_count:
            chosen_names.add(random.choice(all_pool))

        for name in chosen_names:
            category = next((cat for cat, names in MENU_ITEM_POOL.items() if name in names), 'Main Course')
            menu_items.append(MenuItem(
                restaurant=restaurant, name=name,
                description=f"{name} prepared fresh.",
                price=_price_for_band(band, np_rng),
                category=category,
                is_vegetarian=name not in ('Chicken 65', 'Chicken Curry', 'Butter Chicken', 'Chicken Biryani'),
                is_available=np_rng.random() < 0.97,
            ))

    MenuItem.objects.bulk_create(menu_items, batch_size=1000)
    return created_restaurants
