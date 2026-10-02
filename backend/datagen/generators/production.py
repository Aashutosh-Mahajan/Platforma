"""Production-like demo dataset: a Mumbai food + events platform with months
of believable activity, sized for a small hosted database.

Unlike the evaluation generators (gen_data), which plant exact patterns for
scoring and stamp a run tag into every name, this builds data meant to be
*looked at*:

  - real Mumbai restaurants and menus (zesty/scripts/zesty_mumbai_restaurants.json)
    and real Mumbai venues, with coordinates near their locality;
  - customers with a long-tailed activity level (a few regulars, many
    occasional users), favourite restaurants and favourite event types;
  - lunch and dinner peaks, busier weekends, month-on-month growth;
  - promotions, reviews, payouts, gate scans and no-shows, searches, and
    small admin approval queues;
  - nothing dated in the future: upcoming events only carry the tickets
    sold so far.

Generated customers, owners and organisers use @example.com addresses
(reserved for examples, so no real inbox can ever receive the app's
emails) and an unusable password, so they can't be logged into.
"""
import datetime
import random
import uuid
import zlib
from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

import numpy as np
from django.contrib.auth.hashers import make_password
from django.db.models import Min, Q
from django.utils import timezone
from django.utils.text import slugify

from core.models import Address, AuditLog, Notification, Payment, SearchLog, User
from eventra.models import Booking, BookingSeat, BookingStatusHistory, Event, EventReview, Seat, Ticket, TicketType, Venue
from zesty.models import MenuItem, Order, OrderItem, OrderStatusHistory, Payout, Promotion, Restaurant, Review
from datagen.planted import cancellation_probability, no_show_probability, prep_minutes, transit_minutes
from .common import FIRST_NAMES, LAST_NAMES, historical_timestamps, payment_object_id

EMAIL_DOMAIN = 'example.com'
BATCH = 2000

# Locality centres (approximate) for the areas the restaurant data uses.
AREA_CENTRES = {
    'Bandra': (19.0596, 72.8295), 'Andheri': (19.1197, 72.8468), 'Juhu': (19.1075, 72.8263),
    'Colaba': (18.9067, 72.8147), 'Dadar': (19.0178, 72.8478), 'Powai': (19.1176, 72.9060),
    'Worli': (19.0176, 72.8162), 'Churchgate': (18.9322, 72.8264), 'Thane': (19.2183, 72.9781),
    'Borivali': (19.2307, 72.8567),
}

# (name, area, capacity, indoor)
VENUES = [
    ('NSCI Dome', 'Worli', 4500, True), ('Jio World Garden', 'Bandra', 6000, False),
    ('Royal Opera House', 'Churchgate', 570, True), ('NCPA Tata Theatre', 'Churchgate', 1000, True),
    ('Prithvi Theatre', 'Juhu', 220, True), ("St. Andrew's Auditorium", 'Bandra', 750, True),
    ('Wankhede Stadium', 'Churchgate', 33000, False), ('DY Patil Stadium', 'Thane', 45000, False),
    ('Bombay Exhibition Centre', 'Andheri', 8000, True), ('Canvas Laugh Club', 'Worli', 180, True),
    ('The Habitat', 'Juhu', 150, True), ('Phoenix Marketcity Atrium', 'Powai', 1200, True),
    ('Nehru Centre Auditorium', 'Worli', 900, True), ('Shanmukhananda Hall', 'Dadar', 2700, True),
    ('Rangsharda Auditorium', 'Bandra', 900, True), ('Dome SVP Stadium', 'Worli', 4000, True),
    ('Hiranandani Gardens Amphitheatre', 'Powai', 1500, False), ('Mahalaxmi Racecourse Lawns', 'Worli', 10000, False),
    ('G5A Foundation', 'Worli', 300, True), ('Bal Gandharva Rang Mandir', 'Bandra', 600, True),
    ('Kashinath Ghanekar Natyagruha', 'Thane', 1000, True), ('Prabodhankar Thackeray Natyagruha', 'Borivali', 900, True),
    ('The Comedy Store Mumbai', 'Andheri', 200, True), ('PVR ICON Phoenix', 'Andheri', 320, True),
]

EVENT_NAMES = {
    'concert': ['Indie Nights Live', 'Sufi Sundays', 'Monsoon Melodies', 'Bollywood Retro Night', 'Jazz by the Bay',
                'Electronic Skyline', 'Unplugged Evenings', 'Classical Confluence', 'Rock On Mumbai', 'Ghazal Sandhya'],
    'comedy': ['Laugh Out Loud', 'Stand-up Saturday', 'Roast Night', 'Comedy Gold Mumbai', 'Open Mic Madness',
               'Improv Theatre Live', 'Desi Comic Night', 'Punchline Fridays'],
    'theater': ['The Last Monsoon', 'Ek Raat Ki Baat', 'Midsummer in Mumbai', 'Kathak Kahaniyan', 'The Ghost of Marine Drive',
                'Tumhari Amrita', 'Broadway Hits Live', 'Magic of Maya'],
    'movie': ['Classic Cinema Club', 'Midnight Horror Marathon', 'Short Film Showcase', 'Anime Fest Screening',
              'Documentary Nights', 'Retro Bollywood Matinee', 'IMAX Science Special'],
    'sports': ['Mumbai Derby: Football', 'T20 Corporate Cup Final', 'Pro Kabaddi Showdown', 'Mumbai Half Marathon',
               'Badminton Open Finals', 'Esports Valorant Cup'],
    'expo': ['Startup Mumbai Summit', 'Design Week Exhibition', 'Mumbai Book Fair', 'AI & Data Conference',
             'Photography Masterclass', 'Career Fair 2026', 'Art District Open'],
    'dining': ["Chef's Table: Coastal Konkan", 'Street Food Festival', 'Wine & Cheese Evening', 'Biryani Trail',
               'Sunday Brunch Social', 'Mithai & Masala Tasting'],
}
EVENT_TYPES = {
    'concert': ['live_concert', 'music_festival', 'dj_night', 'classical_recital'],
    'comedy': ['standup_comedy', 'improv_comedy', 'comedy_open_mic'],
    'theater': ['play', 'musical', 'dance_performance', 'magic_show'],
    'movie': ['film_screening', 'film_festival', 'documentary_screening'],
    'sports': ['football_match', 'cricket_match', 'kabaddi_match', 'marathon', 'esports_tournament'],
    'expo': ['conference', 'trade_show', 'workshop', 'art_exhibition', 'book_fair', 'career_fair'],
    'dining': ['food_festival', 'chefs_table', 'tasting_event'],
}
# The type that fits each named event (a marathon is never an esports cup).
NAME_TYPES = {
    'Indie Nights Live': 'live_concert', 'Sufi Sundays': 'live_concert', 'Monsoon Melodies': 'music_festival',
    'Bollywood Retro Night': 'dj_night', 'Jazz by the Bay': 'live_concert', 'Electronic Skyline': 'dj_night',
    'Unplugged Evenings': 'live_concert', 'Classical Confluence': 'classical_recital', 'Rock On Mumbai': 'music_festival',
    'Ghazal Sandhya': 'classical_recital',
    'Laugh Out Loud': 'standup_comedy', 'Stand-up Saturday': 'standup_comedy', 'Roast Night': 'standup_comedy',
    'Comedy Gold Mumbai': 'standup_comedy', 'Open Mic Madness': 'comedy_open_mic', 'Improv Theatre Live': 'improv_comedy',
    'Desi Comic Night': 'standup_comedy', 'Punchline Fridays': 'standup_comedy',
    'The Last Monsoon': 'play', 'Ek Raat Ki Baat': 'play', 'Midsummer in Mumbai': 'play',
    'Kathak Kahaniyan': 'dance_performance', 'The Ghost of Marine Drive': 'play', 'Tumhari Amrita': 'play',
    'Broadway Hits Live': 'musical', 'Magic of Maya': 'magic_show',
    'Classic Cinema Club': 'film_screening', 'Midnight Horror Marathon': 'film_festival',
    'Short Film Showcase': 'film_festival', 'Anime Fest Screening': 'film_festival',
    'Documentary Nights': 'documentary_screening', 'Retro Bollywood Matinee': 'film_screening',
    'IMAX Science Special': 'documentary_screening',
    'Mumbai Derby: Football': 'football_match', 'T20 Corporate Cup Final': 'cricket_match',
    'Pro Kabaddi Showdown': 'kabaddi_match', 'Mumbai Half Marathon': 'marathon',
    'Badminton Open Finals': 'badminton_tournament', 'Esports Valorant Cup': 'esports_tournament',
    'Startup Mumbai Summit': 'conference', 'Design Week Exhibition': 'trade_show', 'Mumbai Book Fair': 'book_fair',
    'AI & Data Conference': 'conference', 'Photography Masterclass': 'workshop', 'Career Fair 2026': 'career_fair',
    'Art District Open': 'art_exhibition',
    "Chef's Table: Coastal Konkan": 'chefs_table', 'Street Food Festival': 'food_festival',
    'Wine & Cheese Evening': 'tasting_event', 'Biryani Trail': 'food_festival', 'Sunday Brunch Social': 'food_festival',
    'Mithai & Masala Tasting': 'tasting_event',
}
CATEGORY_MIX = {'concert': 0.2, 'comedy': 0.2, 'theater': 0.12, 'movie': 0.14, 'sports': 0.08, 'expo': 0.12, 'dining': 0.14}
TIER_SETS = {
    'sports': [('General', 1.0), ('Premium', 2.2), ('VIP', 4.5)],
    'concert': [('General', 1.0), ('Fan Pit', 1.8), ('VIP', 3.5)],
    'default': [('General', 1.0), ('Premium', 1.7), ('VIP', 2.8)],
}
BASE_PRICE = {'concert': 899, 'comedy': 499, 'theater': 699, 'movie': 299, 'sports': 799, 'expo': 399, 'dining': 1499}

ORGANIZER_COMPANIES = ['Skyline Live', 'Bayside Events', 'Mumbai Comedy Collective', 'Curtain Call Productions',
                       'Reel Room Screenings', 'Arena Sports Co', 'Summit Expos', 'Tasting Table Co']

REVIEW_COMMENTS = {
    5: ['Loved it, will order again!', 'Hot, fresh and on time.', 'Best in the area.', 'Perfect every time.'],
    4: ['Really good food.', 'Tasty, slightly late.', 'Good portions.', 'Nice packaging, good taste.'],
    3: ['Okay, nothing special.', 'Average this time.', 'Could be hotter.'],
    2: ['Arrived cold.', 'Too oily for me.', 'Missing an item.'],
    1: ['Very late delivery.', 'Not what I ordered.'],
}
EVENT_REVIEW_COMMENTS = ['What a night!', 'Totally worth it.', 'Great vibe and crowd.', 'Sound could be better.',
                         'Would go again.', 'Seats were great.']

UNMET_SEARCHES = ['poke bowl', 'vegan biryani', 'keto bowl', 'jazz brunch', 'kids workshop', 'korean bbq', 'sushi platter']
TRENDING_SEARCH = 'korean fried chicken'

# Menu categories are inferred from dish names (the source menus carry none).
CATEGORY_KEYWORDS = [
    ('Beverages', ['lassi', 'shake', 'coffee', 'tea', 'chai', 'juice', 'soda', 'cola', 'mojito', 'buttermilk', 'chaas',
                   'smoothie', 'lemonade', 'drink', 'water', 'falooda']),
    ('Desserts', ['ice cream', 'gulab', 'rasmalai', 'brownie', 'cake', 'kulfi', 'halwa', 'jamun', 'pastry', 'waffle',
                  'sundae', 'kheer', 'rasgulla', 'mousse', 'cheesecake', 'tiramisu', 'jalebi', 'shrikhand', 'sweet']),
    ('Breads', ['naan', 'roti', 'paratha', 'kulcha', 'bhatura', 'pav', 'chapati', 'puri', 'bun']),
    ('Rice', ['rice', 'biryani', 'pulao', 'khichdi']),
    ('Starters', ['tikka', 'kebab', 'kabab', ' 65', 'fries', 'samosa', 'pakora', 'bhaji', 'soup', 'manchurian', 'spring roll',
                  'chilli', 'wings', 'nuggets', 'vada', 'chaat', 'puri', 'dhokla', 'tikki', 'momo', 'roll', 'sandwich']),
]


def _q2(value):
    return Decimal(str(value)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


def infer_category(dish_name):
    name = f" {dish_name.lower()} "
    for category, words in CATEGORY_KEYWORDS:
        if any(w in name for w in words):
            return category
    return 'Main Course'


def _aware(day, hour, minute):
    return timezone.make_aware(datetime.datetime.combine(day, datetime.time(hour, minute)))


def _place(area, seed):
    lat, lng = AREA_CENTRES.get(area, (19.0760, 72.8777))
    r = random.Random(zlib.crc32(seed.encode()))
    return round(lat + r.gauss(0, 0.009), 6), round(lng + r.gauss(0, 0.009), 6)


@dataclass
class Config:
    # Defaults fill roughly a quarter of a free-tier Neon database (0.5 GB),
    # leaving room to grow: ~120 MB operational, ~140 MB warehouse.
    months: int = 6
    customers: int = 10000
    restaurants: int = 200
    orders: int = 45000
    events: int = 220
    bookings: int = 21000
    searches: int = 18000
    seed: int = 2026
    demo_owner_email: str = 'demo.owner@demo.platforma.app'
    demo_organizer_email: str = 'demo.organizer@demo.platforma.app'
    demo_customer_email: str = 'demo.customer@demo.platforma.app'


class Builder:
    def __init__(self, cfg, log=print):
        self.cfg = cfg
        self.log = log
        self.rng = np.random.default_rng(cfg.seed)
        random.seed(cfg.seed)
        self.now = timezone.now()
        self.today = timezone.localdate()
        self.start = self.today - datetime.timedelta(days=round(cfg.months * 30.4))
        self.unusable_password = make_password(None)
        self.email_counter = {}
        self.summary = {}

    # ------------------------------------------------------------------
    # people
    # ------------------------------------------------------------------

    def _email(self, first, last):
        base = f"{first}.{last}".lower().replace(' ', '')
        n = self.email_counter.get(base, 0) + 1
        self.email_counter[base] = n
        return f"{base}{'' if n == 1 else n}@{EMAIL_DOMAIN}", f"{base}{'' if n == 1 else n}"

    def _person(self, role, joined, first=None, last=None, **extra):
        first = first or random.choice(FIRST_NAMES)
        last = last or random.choice(LAST_NAMES)
        email, username = self._email(first, last)
        u = User(email=email, username=username, first_name=first, last_name=last, role=role,
                 phone=f"+91{random.randint(7000000000, 9999999999)}", is_email_verified=True,
                 password=self.unusable_password, **extra)
        u.created_at = joined
        u.date_joined = joined
        return u

    def _demo(self, email):
        return User.objects.filter(email=email).first()

    def build_people(self):
        cfg = self.cfg
        n = cfg.customers
        # 35% joined before the window (an established base), the rest join
        # during it with growth towards the present.
        before = int(n * 0.35)
        days = (self.today - self.start).days
        joined = []
        for i in range(n):
            if i < before:
                d = self.start - datetime.timedelta(days=int(self.rng.integers(1, 365)))
            else:
                d = self.start + datetime.timedelta(days=int(days * (self.rng.beta(1.6, 1.0))))
            joined.append(_aware(d, int(self.rng.integers(7, 23)), int(self.rng.integers(0, 60))))
        users = [self._person('customer', j) for j in joined]
        for u in users[::40]:
            u.is_email_verified = False  # a few never finished signing up
        with historical_timestamps(User, 'created_at'):
            customers = User.objects.bulk_create(users, batch_size=BATCH)

        owners = [self._person('restaurant_owner', _aware(self.start - datetime.timedelta(days=200), 11, 0))
                  for _ in range(60)]
        organisers = []
        for company in ORGANIZER_COMPANIES:
            o = self._person('event_organizer', _aware(self.start - datetime.timedelta(days=250), 11, 0))
            o.company_name = company
            organisers.append(o)
        with historical_timestamps(User, 'created_at'):
            owners = User.objects.bulk_create(owners, batch_size=BATCH)
            organisers = User.objects.bulk_create(organisers, batch_size=BATCH)

        addresses = []
        areas = list(AREA_CENTRES)
        self.home_area = {}
        for u in customers:
            area = random.choice(areas)
            self.home_area[u.id] = area
            lat, lng = _place(area, f"home{u.id}")
            addresses.append(Address(user=u, label=random.choice(['home', 'home', 'work']),
                                     street=f"{random.randint(1, 450)}, {area}", city='Mumbai', state='Maharashtra',
                                     postal_code=str(random.randint(400001, 400104)), latitude=lat, longitude=lng,
                                     is_default=True))
        Address.objects.bulk_create(addresses, batch_size=BATCH)

        demo_customer = self._demo(cfg.demo_customer_email)
        if demo_customer:
            customers.append(demo_customer)
            self.home_area[demo_customer.id] = 'Bandra'

        # Long-tailed activity: most customers order now and then, a few daily.
        self.customers = customers
        self.joined = np.array([(u.created_at if hasattr(u, 'created_at') and u.created_at else self.now) for u in customers])
        # Long tail, capped: regulars order a few times a week, not hourly.
        self.activity = np.clip(self.rng.lognormal(0, 0.9, len(customers)), None, 12.0)
        if demo_customer:
            self.activity[-1] = np.quantile(self.activity, 0.97)
            self.joined[-1] = _aware(self.start - datetime.timedelta(days=60), 12, 0)  # a long-time customer
        self.food_affinity = self.rng.uniform(0.6, 1.0, len(customers))
        self.event_affinity = np.where(self.rng.random(len(customers)) < 0.45, self.rng.uniform(0.3, 1.0, len(customers)), 0.02)
        if demo_customer:
            self.event_affinity[-1] = 1.0
        self.owners = owners
        self.organisers = organisers
        self.summary.update(customers=len(customers), owners=len(owners), organisers=len(organisers))
        self.log(f"  people: {len(customers)} customers, {len(owners)} owners, {len(organisers)} organisers")

    # ------------------------------------------------------------------
    # restaurants
    # ------------------------------------------------------------------

    def build_restaurants(self):
        from zesty.scripts.seed_restaurants import RESTAURANTS
        pool = sorted(RESTAURANTS, key=lambda r: -int(r.get('total_ratings') or 0))
        chosen = pool[: self.cfg.restaurants]
        random.shuffle(chosen)

        demo_owner = self._demo(self.cfg.demo_owner_email)
        restaurants = []
        for i, rec in enumerate(chosen):
            owner = demo_owner if (demo_owner and i < 4) else self.owners[i % len(self.owners)]
            area = rec['area']
            lat, lng = _place(area, f"rest{rec['name']}")
            cuisines = ', '.join(dict.fromkeys(c.strip().title() for c in rec['cuisines'] if c.strip()))
            dmin, dmax = 25, 40
            try:
                parts = [int(p) for p in rec['delivery_time'].replace('mins', '').split('-')]
                dmin, dmax = parts[0], parts[-1]
            except (ValueError, IndexError):
                pass
            fee = {1: 19, 2: 29, 3: 39, 4: 49}.get(rec['price_range'], 29)
            r = Restaurant(
                owner=owner, name=rec['name'], slug=slugify(rec['name'])[:240] or f"restaurant-{i}",
                description=rec['description'], cuisine_types=cuisines, cuisine=rec['primary_cuisine'],
                address=f"{rec['location']}, {area}, Mumbai", area=area, city='Mumbai', state='Maharashtra',
                latitude=lat, longitude=lng, price_range=rec['price_range'], veg_only=rec['veg_only'],
                hours=rec['hours'], is_open=True, data_source='seed', delivery_fee=Decimal(fee),
                delivery_time_min=dmin, delivery_time_max=dmax, rating=Decimal(str(rec['rating'])),
                review_count=int(rec['total_ratings']), is_active=True, is_verified=True,
            )
            r.created_at = _aware(self.start - datetime.timedelta(days=int(self.rng.integers(30, 400))), 10, 0)
            restaurants.append(r)
        # A couple of new partners waiting for verification, and one paused.
        for r in restaurants[-2:]:
            r.is_verified = False
            r.created_at = self.now - datetime.timedelta(days=2)
        restaurants[-3].is_active = False
        restaurants[-3].is_open = False
        with historical_timestamps(Restaurant, 'created_at'):
            restaurants = Restaurant.objects.bulk_create(restaurants, batch_size=500)

        items = []
        for r, rec in zip(restaurants, chosen):
            seen = set()
            for dish in rec['menu']:
                key = dish['name'].lower()
                if key in seen:
                    continue
                seen.add(key)
                items.append(MenuItem(restaurant=r, name=dish['name'], description=dish.get('description', ''),
                                      price=_q2(dish['price']), category=infer_category(dish['name']),
                                      is_vegetarian=bool(dish.get('is_veg')), is_available=self.rng.random() > 0.04))
        MenuItem.objects.bulk_create(items, batch_size=BATCH)

        self.restaurants = [r for r in restaurants]
        self.live_restaurants = [r for r in restaurants if r.is_verified and r.is_active]
        menu = {}
        for item in MenuItem.objects.filter(restaurant__in=restaurants, is_available=True):
            menu.setdefault(item.restaurant_id, []).append(item)
        self.menu = menu
        # Popularity follows a Zipf-like curve, demo owner's kitchens near the top.
        ranks = self.rng.permutation(len(self.live_restaurants)) + 1
        for idx, r in enumerate(self.live_restaurants):
            if demo_owner and r.owner_id == demo_owner.id:
                ranks[idx] = int(self.rng.integers(2, 12))
        self.popularity = 1.0 / ranks ** 0.75
        self.popularity /= self.popularity.sum()
        # Each restaurant has a signature pair customers often order together.
        self.signature = {}
        self.item_weight = {}
        for r in self.live_restaurants:
            dishes = menu.get(r.id, [])
            for d in dishes:
                self.item_weight[d.id] = float(self.rng.lognormal(0, 0.8))
            mains = [d for d in dishes if d.category in ('Main Course', 'Rice', 'Starters')]
            # Kitchens with no breads, drinks or desserts pair a main with a starter.
            sides = ([d for d in dishes if d.category in ('Breads', 'Beverages', 'Desserts')]
                     or [d for d in dishes if d.category == 'Starters'])
            if mains and sides:
                main = random.choice(mains)
                pool = [d for d in sides if d.id != main.id]
                if pool:
                    self.signature[r.id] = (main.id, random.choice(pool))
        self.summary.update(restaurants=len(restaurants), menu_items=len(items))
        self.log(f"  restaurants: {len(restaurants)} with {len(items)} dishes")

    def build_favourites(self):
        """3-5 favourite restaurants per customer: mostly near home, some popular."""
        by_area = {}
        for idx, r in enumerate(self.live_restaurants):
            by_area.setdefault(r.area, []).append(idx)
        self.favourites = []
        for u in self.customers:
            local = by_area.get(self.home_area[u.id], [])
            picks = set()
            k = int(self.rng.integers(3, 6))
            while len(picks) < k:
                if local and self.rng.random() < 0.65:
                    picks.add(random.choice(local))
                else:
                    picks.add(int(self.rng.choice(len(self.live_restaurants), p=self.popularity)))
            self.favourites.append(list(picks))

    # ------------------------------------------------------------------
    # promotions
    # ------------------------------------------------------------------

    def build_promotions(self):
        promos = []
        days = (self.today - self.start).days
        # The demo owner's kitchens always run promos (a finished one each,
        # plus one live now), so their promo and discount panels have data.
        demo_owner = self._demo(self.cfg.demo_owner_email)
        demo = [r for r in self.live_restaurants if demo_owner and r.owner_id == demo_owner.id]
        # Busier kitchens run most promotions (a promo at a restaurant with one
        # order a day would barely be redeemed).
        others = [i for i, r in enumerate(self.live_restaurants) if r not in demo]
        weights = np.sqrt(self.popularity[others])
        chosen = self.rng.choice(len(others), size=min(30 - len(demo), len(others)), replace=False,
                                 p=weights / weights.sum())
        picked = demo + [self.live_restaurants[others[int(c)]] for c in chosen]
        live_now = {r.id for r in demo[:2]}
        for i, r in enumerate(picked):
            start = self.start + datetime.timedelta(days=int(self.rng.integers(0, max(1, days - 10))))
            length = int(self.rng.choice([7, 14, 21]))
            if r in demo:
                start = self.today - datetime.timedelta(days=int(self.rng.integers(45, 120)))
            if r.id in live_now:
                promos.append(self._live_promo(r, i))
            pct = int(self.rng.choice([10, 15, 20, 25]))
            code = f"{slugify(r.name).replace('-', '')[:8].upper()}{pct}"[:28] + str(i)
            promos.append(Promotion(
                restaurant=r, code=code, description=f"{pct}% off at {r.name}", discount_type='percent',
                discount_value=Decimal(pct), min_order_value=Decimal('199'), max_discount_amount=Decimal('150'),
                valid_from=_aware(start, 0, 0), valid_until=_aware(start + datetime.timedelta(days=length), 23, 59),
                is_active=start + datetime.timedelta(days=length) >= self.today,
            ))
        promos.append(Promotion(code='WELCOME50', description='Rs 50 off your first order', discount_type='fixed',
                                discount_value=Decimal('50'), min_order_value=Decimal('249'),
                                valid_from=_aware(self.start, 0, 0), is_active=True))
        promos.append(Promotion(code='WEEKEND20', description='20% off weekend dinners', discount_type='percent',
                                discount_value=Decimal('20'), min_order_value=Decimal('399'),
                                max_discount_amount=Decimal('120'), valid_from=_aware(self.start, 0, 0), is_active=True))
        self.promotions = Promotion.objects.bulk_create(promos)
        self.promo_by_restaurant = {}
        for p in self.promotions:
            if p.restaurant_id:
                self.promo_by_restaurant.setdefault(p.restaurant_id, []).append(p)
        self.summary['promotions'] = len(self.promotions)

    def _live_promo(self, r, i):
        """A promo that started a week ago and is still running."""
        start = self.today - datetime.timedelta(days=7)
        return Promotion(
            restaurant=r, code=f"{slugify(r.name).replace('-', '')[:8].upper()}FEST{i}"[:30],
            description=f"Festive 15% off at {r.name}", discount_type='percent', discount_value=Decimal(15),
            min_order_value=Decimal('249'), max_discount_amount=Decimal('100'),
            valid_from=_aware(start, 0, 0), valid_until=_aware(self.today + datetime.timedelta(days=14), 23, 59),
            is_active=True,
        )

    # ------------------------------------------------------------------
    # orders
    # ------------------------------------------------------------------

    HOUR_WEIGHTS = np.array([1.2, 0.6, 0.2, 0.1, 0.1, 0.2, 0.5, 1.4, 2.2, 2.6, 2.4, 3.2,
                             7.0, 8.5, 6.0, 3.0, 2.6, 3.4, 5.0, 8.0, 9.5, 8.6, 5.2, 2.6])

    def _daily_counts(self, total):
        days = (self.today - self.start).days + 1
        dates = [self.start + datetime.timedelta(days=i) for i in range(days)]
        w = []
        for i, d in enumerate(dates):
            growth = 0.7 + 0.6 * (i / max(1, days - 1))
            weekly = {4: 1.15, 5: 1.35, 6: 1.3}.get(d.weekday(), 1.0)
            festival = 1.25 if d.month in (10, 11) else 1.0
            w.append(growth * weekly * festival * float(self.rng.normal(1, 0.08)))
        w = np.clip(np.array(w), 0.1, None)
        # Today is only partly over.
        w[-1] *= min(1.0, (timezone.localtime(self.now).hour + 1) / 24)
        counts = self.rng.multinomial(total, w / w.sum())
        return list(zip(dates, counts))

    def _pick_customer(self, when, weights):
        for _ in range(20):
            i = int(self.rng.choice(len(self.customers), p=weights))
            if self.joined[i] <= when:
                return i
        return len(self.customers) - 1 if self.joined[-1] <= when else 0

    def _basket(self, restaurant):
        dishes = self.menu.get(restaurant.id, [])
        if not dishes:
            return []
        mains = [d for d in dishes if d.category in ('Main Course', 'Rice', 'Starters')] or dishes
        weights = np.array([self.item_weight.get(d.id, 1.0) for d in mains])
        main = mains[int(self.rng.choice(len(mains), p=weights / weights.sum()))]
        basket = {main.id: (main, 1 if self.rng.random() < 0.8 else 2)}
        sig = self.signature.get(restaurant.id)
        if sig and (main.id == sig[0] or self.rng.random() < 0.18) and self.rng.random() < 0.6:
            basket[sig[1].id] = (sig[1], 1)
        by_cat = {}
        for d in dishes:
            by_cat.setdefault(d.category, []).append(d)
        if main.category == 'Main Course' and by_cat.get('Breads') and self.rng.random() < 0.45:
            b = random.choice(by_cat['Breads'])
            basket[b.id] = (b, int(self.rng.choice([1, 2, 2, 3])))
        for cat, p in (('Beverages', 0.28), ('Desserts', 0.2), ('Starters', 0.15)):
            if by_cat.get(cat) and self.rng.random() < p:
                d = random.choice(by_cat[cat])
                basket.setdefault(d.id, (d, 1))
        if self.rng.random() < 0.15:
            extra = random.choice(mains)
            basket.setdefault(extra.id, (extra, 1))
        return list(basket.values())

    def _make_order(self, customer, restaurant, created, rows, promo=None, status=None):
        subtotal = sum((d.price * q for d, q in rows), Decimal('0'))
        discount = Decimal('0')
        if promo and subtotal >= promo.min_order_value:
            if promo.discount_type == 'percent':
                discount = _q2(subtotal * promo.discount_value / 100)
                if promo.max_discount_amount:
                    discount = min(discount, promo.max_discount_amount)
            else:
                discount = min(promo.discount_value, subtotal)
        else:
            promo = None
        tax = _q2((subtotal - discount) * Decimal('0.05'))
        method = str(self.rng.choice(['upi', 'card', 'cod', 'wallet'], p=[0.47, 0.27, 0.17, 0.09]))
        if status is None:
            minutes_ago = (self.now - created).total_seconds() / 60
            if minutes_ago < 75:
                status = ('pending' if minutes_ago < 4 else 'confirmed' if minutes_ago < 12 else 'preparing'
                          if minutes_ago < 30 else 'ready' if minutes_ago < 40 else 'out_for_delivery')
            else:
                p_cancel = 0.035 + (0.04 if method == 'cod' else 0) + (0.02 if timezone.localtime(created).hour >= 23 else 0)
                status = 'cancelled' if self.rng.random() < p_cancel else 'delivered'
        order = Order(
            id=uuid.uuid4(), user=customer, restaurant=restaurant, status=status,
            delivery_address={'street': f"{random.randint(1, 450)}, {self.home_area.get(customer.id, 'Bandra')}",
                              'city': 'Mumbai'},
            subtotal=subtotal, delivery_fee=restaurant.delivery_fee, tax=tax, discount=discount,
            promo_code=promo.code if promo else '', total=subtotal + restaurant.delivery_fee + tax - discount,
            payment_method=method,
            payment_status='refunded' if status == 'cancelled' and method != 'cod' else
                           ('pending' if method == 'cod' and status != 'delivered' else 'completed'),
            created_at=created, updated_at=created,
        )
        items = [OrderItem(order_id=order.id, menu_item=d, quantity=q, unit_price=d.price, total=d.price * q)
                 for d, q in rows]
        payment = None
        if method != 'cod':
            payment = Payment(user=customer, amount=order.total,
                              method={'card': random.choice(['credit_card', 'debit_card'])}.get(method, method),
                              status='refunded' if status == 'cancelled' else 'completed',
                              transaction_id=f"PF{uuid.uuid4().hex[:14].upper()}", content_type='order',
                              object_id=payment_object_id(order.id), created_at=created, updated_at=created)
        return order, items, payment

    def promo_live(self, when):
        """Restaurants running a promotion at `when`."""
        key = when.date()
        if getattr(self, '_promo_day', None) != key:
            self._promo_day = key
            self._promo_restaurants = [
                r for r in self.live_restaurants
                if any(p.valid_from <= when <= p.valid_until for p in self.promo_by_restaurant.get(r.id, []))
            ]
        return self._promo_restaurants

    def build_orders(self):
        weights = self.activity * self.food_affinity
        weights = weights / weights.sum()
        live = self.live_restaurants
        orders, items, payments = [], [], []
        for day, count in self._daily_counts(self.cfg.orders):
            for _ in range(count):
                hour = int(self.rng.choice(24, p=self.HOUR_WEIGHTS / self.HOUR_WEIGHTS.sum()))
                created = _aware(day, hour, int(self.rng.integers(0, 60)))
                if created > self.now:
                    created = self.now - datetime.timedelta(minutes=int(self.rng.integers(1, 180)))
                ci = self._pick_customer(created, weights)
                promoted = [r for r in self.promo_live(created)]
                if promoted and self.rng.random() < 0.004:
                    restaurant = random.choice(promoted)  # a promotion pulls in extra customers
                elif self.rng.random() < 0.75:
                    restaurant = live[random.choice(self.favourites[ci])]
                else:
                    restaurant = live[int(self.rng.choice(len(live), p=self.popularity))]
                rows = self._basket(restaurant)
                if not rows:
                    continue
                promo = None
                for p in self.promo_by_restaurant.get(restaurant.id, []):
                    if p.valid_from <= created <= p.valid_until and self.rng.random() < 0.4:
                        promo = p
                if promo is None and day.weekday() >= 5 and hour >= 19 and self.rng.random() < 0.06:
                    promo = self.promotions[-1]
                order, its, pay = self._make_order(self.customers[ci], restaurant, created, rows, promo)
                orders.append(order)
                items.extend(its)
                if pay:
                    payments.append(pay)
        self._save_orders(orders, items, payments)
        self.orders = orders
        self.summary['orders'] = len(orders)
        self.log(f"  orders: {len(orders)} ({len(items)} items)")

    def _save_orders(self, orders, items, payments):
        with historical_timestamps(Order, 'created_at', 'updated_at'):
            for i in range(0, len(orders), BATCH):
                Order.objects.bulk_create(orders[i:i + BATCH], batch_size=BATCH)
        for i in range(0, len(items), BATCH):
            OrderItem.objects.bulk_create(items[i:i + BATCH], batch_size=BATCH)
        with historical_timestamps(Payment, 'created_at', 'updated_at'):
            for i in range(0, len(payments), BATCH):
                Payment.objects.bulk_create(payments[i:i + BATCH], batch_size=BATCH)

    def build_order_history(self, orders):
        """Status history with realistic kitchen and transit times."""
        from datagen.generators.enrichment import _lifecycle_rows
        n_items = {}
        for oi in OrderItem.objects.filter(order_id__in=[o.id for o in orders]).values('order_id', 'quantity'):
            n_items[oi['order_id']] = n_items.get(oi['order_id'], 0) + oi['quantity']
        rows = []
        for o in orders:
            rows.extend(_lifecycle_rows({'id': o.id, 'created_at': o.created_at, 'status': o.status,
                                         'restaurant_id': o.restaurant_id, 'n_items': n_items.get(o.id, 1)}, self.now))
        with historical_timestamps(OrderStatusHistory, 'changed_at'):
            for i in range(0, len(rows), BATCH * 2):
                OrderStatusHistory.objects.bulk_create(rows[i:i + BATCH * 2], batch_size=BATCH * 2)
        return len(rows)

    def build_reviews(self):
        reviews, seen = [], set()
        rating_of = {r.id: float(r.rating) for r in self.live_restaurants}
        for o in self.orders:
            if o.status != 'delivered' or self.rng.random() > 0.14:
                continue
            key = (o.user_id, o.restaurant_id)
            if key in seen:
                continue
            seen.add(key)
            base = rating_of.get(o.restaurant_id, 4.0)
            rating = int(np.clip(round(self.rng.normal(base, 0.8)), 1, 5))
            reviews.append(Review(user_id=o.user_id, restaurant_id=o.restaurant_id, order_id=o.id, rating=rating,
                                  comment=random.choice(REVIEW_COMMENTS[rating]),
                                  created_at=min(self.now, o.created_at + datetime.timedelta(hours=float(self.rng.uniform(1, 30))))))
        with historical_timestamps(Review, 'created_at'):
            Review.objects.bulk_create(reviews, batch_size=BATCH)
        self.summary['reviews'] = len(reviews)

    def build_payouts(self):
        """Monthly settlements: paid for finished months, pending for the last one."""
        totals = {}
        for o in self.orders:
            if o.status != 'delivered':
                continue
            month = timezone.localtime(o.created_at).date().replace(day=1)
            key = (o.restaurant_id, month)
            n, gross = totals.get(key, (0, Decimal('0')))
            totals[key] = (n + 1, gross + o.subtotal)
        this_month = self.today.replace(day=1)
        rate = {r.id: r.commission_rate for r in self.restaurants}
        payouts = []
        for (rid, month), (n, gross) in totals.items():
            if month >= this_month:
                continue
            next_month = (month + datetime.timedelta(days=32)).replace(day=1)
            commission = _q2(gross * rate[rid] / 100)
            last_finished = next_month == this_month
            created = _aware(next_month, 10, 0) + datetime.timedelta(days=1)
            payouts.append(Payout(
                restaurant_id=rid, period_start=_aware(month, 0, 0), period_end=_aware(next_month, 0, 0),
                order_count=n, gross_revenue=gross, commission_rate=rate[rid], commission_amount=commission,
                net_amount=gross - commission, status='pending' if last_finished else 'paid',
                paid_at=None if last_finished else created + datetime.timedelta(days=int(self.rng.integers(2, 7))),
                created_at=created, updated_at=created,
            ))
        with historical_timestamps(Payout, 'created_at', 'updated_at'):
            Payout.objects.bulk_create(payouts, batch_size=BATCH)
        self.summary['payouts'] = len(payouts)

    # ------------------------------------------------------------------
    # events
    # ------------------------------------------------------------------

    def build_events(self):
        venues = []
        for name, area, capacity, indoor in VENUES:
            lat, lng = _place(area, f"venue{name}")
            venues.append(Venue(name=name, address=f"{name}, {area}, Mumbai", area=area, city='Mumbai',
                                state='Maharashtra', latitude=lat, longitude=lng, capacity=capacity, is_indoor=indoor))
        venues = Venue.objects.bulk_create(venues)

        demo_org = self._demo(self.cfg.demo_organizer_email)
        organisers = self.organisers + ([demo_org] if demo_org else [])
        cats = list(CATEGORY_MIX)
        probs = np.array([CATEGORY_MIX[c] for c in cats])
        span = (self.today - self.start).days
        events, edition = [], {}
        for i in range(self.cfg.events):
            category = str(self.rng.choice(cats, p=probs / probs.sum()))
            base = random.choice(EVENT_NAMES[category])
            edition[base] = edition.get(base, 0) + 1
            name = base if edition[base] == 1 else f"{base} #{edition[base]}"
            fits = [v for v in venues if (v.capacity >= 1500) == (category == 'sports')] or venues
            venue = random.choice(fits)
            upcoming = self.rng.random() < 0.32
            if upcoming:
                day = self.today + datetime.timedelta(days=int(self.rng.integers(1, 61)))
            else:
                day = self.start + datetime.timedelta(days=int(self.rng.integers(5, max(6, span))))
            if day.weekday() < 4 and self.rng.random() < 0.5:
                day += datetime.timedelta(days=(5 - day.weekday()) % 7)
                if not upcoming and day >= self.today:
                    day = self.today - datetime.timedelta(days=1)
            hour = 16 if category == 'sports' else int(self.rng.choice([18, 19, 20, 21]))
            event_date = _aware(day, hour, int(self.rng.choice([0, 30])))
            capacity = int(min(venue.capacity, self.rng.integers(120, 520)))
            organiser = demo_org if (demo_org and i % 6 == 0) else random.choice(self.organisers)
            e = Event(organizer=organiser, name=name, category=category,
                      event_type=NAME_TYPES.get(base) or random.choice(EVENT_TYPES[category]),
                      description=f"{name} at {venue.name}. An evening of {category} in the heart of Mumbai.",
                      venue=venue, venue_name=venue.name, address=venue.address, latitude=venue.latitude,
                      longitude=venue.longitude, event_date=event_date,
                      event_end_date=event_date + datetime.timedelta(hours=3),
                      is_published=True, is_approved=True, is_cancelled=False,
                      total_seats=capacity, available_seats=capacity,
                      rating=Decimal(str(round(float(self.rng.uniform(3.8, 4.9)), 2))),
                      review_count=0, created_at=event_date - datetime.timedelta(days=int(self.rng.integers(45, 120))))
            events.append(e)
        # Admin queue: a few upcoming events awaiting approval, one draft.
        upcoming_events = [e for e in events if e.event_date > self.now]
        for e in upcoming_events[:3]:
            e.is_approved = False
        if len(upcoming_events) > 3:
            upcoming_events[3].is_published = False
        for e in events:
            # Listed 45-120 days ahead, but never in the future: a show only
            # weeks away was listed recently, at a spread of times.
            if e.created_at > self.now - datetime.timedelta(days=1):
                e.created_at = self.now - datetime.timedelta(hours=float(self.rng.uniform(24, 24 * 20)))
        with historical_timestamps(Event, 'created_at'):
            events = Event.objects.bulk_create(events, batch_size=500)

        tiers, tier_meta = [], []
        for e in events:
            tier_set = TIER_SETS.get(e.category, TIER_SETS['default'])[: int(self.rng.choice([2, 3, 3]))]
            shares = [0.6, 0.28, 0.12][: len(tier_set)]
            shares = [s / sum(shares) for s in shares]
            remaining = e.total_seats
            base = BASE_PRICE[e.category] * float(self.rng.uniform(0.75, 1.35))
            for idx, ((tier_name, mult), share) in enumerate(zip(tier_set, shares)):
                qty = remaining if idx == len(tier_set) - 1 else max(1, int(e.total_seats * share))
                remaining -= qty
                price = _q2(round(base * mult / 10) * 10 - 1)
                tiers.append(TicketType(event=e, name=tier_name, price=price, quantity_total=qty,
                                        quantity_available=qty, is_refundable=self.rng.random() < 0.8,
                                        refund_cutoff_hours=int(self.rng.choice([12, 24, 48]))))
        tiers = TicketType.objects.bulk_create(tiers, batch_size=BATCH)
        seats = []
        for t in tiers:
            for n in range(t.quantity_total):
                seats.append(Seat(event_id=t.event_id, section=t.name[:1], row=chr(65 + (n // 20) % 26) + (str(n // 520) if n >= 520 else ''),
                                  seat_number=str(n % 20 + 1), ticket_type=t, status='available'))
        for i in range(0, len(seats), BATCH * 2):
            Seat.objects.bulk_create(seats[i:i + BATCH * 2], batch_size=BATCH * 2)
        self.events = events
        self.tiers_by_event = {}
        for t in tiers:
            self.tiers_by_event.setdefault(t.event_id, []).append(t)
        self.seat_pool = {}
        for s in Seat.objects.filter(event__in=events).values('id', 'ticket_type_id'):
            self.seat_pool.setdefault(s['ticket_type_id'], []).append(s['id'])
        for pool in self.seat_pool.values():
            random.shuffle(pool)
        self.summary.update(venues=len(venues), events=len(events), seats=len(seats))
        self.log(f"  events: {len(events)} at {len(venues)} venues, {len(seats)} seats")

    def _booking_reference(self):
        """EB-XXXXXXXXXX, unique within the load (references are a unique column)."""
        seen = self.__dict__.setdefault('_refs', set())
        while True:
            ref = f"EB-{uuid.uuid4().hex[:10].upper()}"
            if ref not in seen:
                seen.add(ref)
                return ref

    def build_bookings(self):
        """Each event's eventual demand, spread over a booking curve; only
        bookings already made by now are kept, so upcoming events show the
        tickets sold so far.
        """
        cats = list(CATEGORY_MIX)
        # Every event-goer has one or two favourite categories.
        n = len(self.customers)
        fav1 = self.rng.choice(len(cats), n)
        fav2 = self.rng.choice(len(cats), n)
        base_w = self.activity * self.event_affinity
        per_cat = []
        for ci, _ in enumerate(cats):
            w = base_w * np.where((fav1 == ci) | (fav2 == ci), 4.0, 0.35)
            per_cat.append(w / w.sum())

        total_capacity = sum(e.total_seats for e in self.events if e.is_approved and e.is_published)
        avg_seats = 1.9
        scale = min(1.0, self.cfg.bookings * avg_seats / max(1, total_capacity * 0.75))

        bookings, booking_seats, payments, status_history, cancelled_flags = [], [], [], [], []
        north_indian = [r for r in self.live_restaurants if 'north indian' in (r.cuisine or '').lower()]
        cross_orders = []
        for e in self.events:
            if not (e.is_published and e.is_approved):
                continue
            tiers = self.tiers_by_event[e.id]
            sell_through = float(np.clip(self.rng.beta(4, 2.2), 0.15, 1.0)) * scale / 0.75
            target = int(e.total_seats * min(1.0, sell_through))
            sold = 0
            cat_idx = cats.index(e.category)
            while sold < target:
                seats_wanted = int(self.rng.choice([1, 2, 2, 2, 3, 4]))
                lead = float(self.rng.uniform(25, 60)) if self.rng.random() < 0.35 else float(self.rng.exponential(6))
                booked_at = e.event_date - datetime.timedelta(days=lead, minutes=int(self.rng.integers(0, 600)))
                sold += seats_wanted
                if booked_at > self.now:
                    continue  # still to happen
                tier = tiers[0] if self.rng.random() < 0.6 else random.choice(tiers)
                pool = self.seat_pool.get(tier.id, [])
                if len(pool) < seats_wanted:
                    tier = next((t for t in tiers if len(self.seat_pool.get(t.id, [])) >= seats_wanted), None)
                    if tier is None:
                        break
                    pool = self.seat_pool[tier.id]
                ci = int(self.rng.choice(n, p=per_cat[cat_idx]))
                for _ in range(10):
                    if self.joined[ci] <= booked_at:
                        break
                    ci = int(self.rng.choice(n, p=per_cat[cat_idx]))
                customer = self.customers[ci]
                method = str(self.rng.choice(['upi', 'credit_card', 'debit_card', 'wallet', 'net_banking'],
                                             p=[0.42, 0.24, 0.16, 0.1, 0.08]))
                cancelled = self.rng.random() < cancellation_probability(lead, method) * 0.6
                seat_ids = [pool.pop() for _ in range(seats_wanted)]
                subtotal = tier.price * seats_wanted
                tax = _q2(subtotal * Decimal('0.18'))
                b = Booking(user=customer, event=e, booking_reference=self._booking_reference(),
                            status='cancelled' if cancelled else 'confirmed', total_tickets=seats_wanted,
                            subtotal=subtotal, tax=tax, total=subtotal + tax,
                            confirmation_sent=None if cancelled else booked_at)
                b.booking_date = booked_at
                bookings.append(b)
                booking_seats.append((seat_ids, tier))
                cancelled_flags.append(cancelled)
                payments.append(Payment(user=customer, amount=b.total, method=method,
                                        status='refunded' if cancelled else 'completed',
                                        transaction_id=f"PF{uuid.uuid4().hex[:14].upper()}", content_type='booking',
                                        created_at=booked_at, updated_at=booked_at))
                if not cancelled and e.category == 'concert' and north_indian and e.event_date < self.now \
                        and self.rng.random() < 0.35:
                    when = e.event_date - datetime.timedelta(hours=float(self.rng.uniform(0.7, 3)))
                    cross_orders.append((customer, random.choice(north_indian), when))

        with historical_timestamps(Booking, 'booking_date'):
            for i in range(0, len(bookings), BATCH):
                Booking.objects.bulk_create(bookings[i:i + BATCH], batch_size=BATCH)
        with historical_timestamps(Payment, 'created_at', 'updated_at'):
            for i in range(0, len(payments), BATCH):
                Payment.objects.bulk_create(payments[i:i + BATCH], batch_size=BATCH)
        for p, b in zip(payments, bookings):
            p.object_id = b.id
            if p.status == 'completed':
                b.payment_id = p.id
        Payment.objects.bulk_update(payments, ['object_id'], batch_size=BATCH)
        Booking.objects.bulk_update([b for b in bookings if b.payment_id], ['payment_id'], batch_size=BATCH)

        seat_links, tickets, booked_seat_ids = [], [], []
        for b, (seat_ids, tier), cancelled in zip(bookings, booking_seats, cancelled_flags):
            for sid in seat_ids:
                seat_links.append(BookingSeat(booking=b, seat_id=sid))
            if cancelled:
                status_history.append(BookingStatusHistory(
                    booking=b, old_status='confirmed', new_status='cancelled',
                    changed_at=b.booking_date + datetime.timedelta(days=float(self.rng.uniform(0.2, 5)))))
                self.seat_pool.setdefault(tier.id, []).extend(seat_ids)  # released
                continue
            booked_seat_ids.extend(seat_ids)
            for sid in seat_ids:
                tickets.append(Ticket(booking=b, seat_id=sid, qr_token=uuid.uuid4().hex, created_at=b.booking_date))
        for i in range(0, len(seat_links), BATCH * 2):
            BookingSeat.objects.bulk_create(seat_links[i:i + BATCH * 2], batch_size=BATCH * 2)
        for h in status_history:
            h.changed_at = min(h.changed_at, self.now)
        with historical_timestamps(BookingStatusHistory, 'changed_at'):
            BookingStatusHistory.objects.bulk_create(status_history, batch_size=BATCH)
        with historical_timestamps(Ticket, 'created_at'):
            for i in range(0, len(tickets), BATCH * 2):
                Ticket.objects.bulk_create(tickets[i:i + BATCH * 2], batch_size=BATCH * 2)
        for i in range(0, len(booked_seat_ids), 5000):
            Seat.objects.filter(id__in=booked_seat_ids[i:i + 5000]).update(status='booked')

        # Inventory counters.
        sold_by_tier = {}
        for (seat_ids, tier), cancelled in zip(booking_seats, cancelled_flags):
            if not cancelled:
                sold_by_tier[tier.id] = sold_by_tier.get(tier.id, 0) + len(seat_ids)
        tiers = [t for ts in self.tiers_by_event.values() for t in ts]
        for t in tiers:
            t.quantity_available = max(0, t.quantity_total - sold_by_tier.get(t.id, 0))
        TicketType.objects.bulk_update(tiers, ['quantity_available'], batch_size=BATCH)
        for e in self.events:
            e.available_seats = sum(t.quantity_available for t in self.tiers_by_event[e.id])
        Event.objects.bulk_update(self.events, ['available_seats'], batch_size=500)

        # Pre-show dinners: concert-goers ordering North Indian before the show.
        orders, items, pays = [], [], []
        for customer, restaurant, when in cross_orders:
            rows = self._basket(restaurant)
            if rows:
                o, its, p = self._make_order(customer, restaurant, when, rows, status='delivered')
                orders.append(o)
                items.extend(its)
                if p:
                    pays.append(p)
        self._save_orders(orders, items, pays)
        self.orders.extend(orders)
        self.bookings = bookings
        self.summary.update(bookings=len(bookings), tickets=len(tickets), pre_show_orders=len(orders))
        self.log(f"  bookings: {len(bookings)} ({len(tickets)} tickets), {len(orders)} pre-show dinners")

    def build_attendance(self):
        """Gate scans for past events; unscanned live bookings are no-shows."""
        attended, reviews, seen = [], [], set()
        tiers_price = {}
        for ts in self.tiers_by_event.values():
            for t in ts:
                tiers_price[t.event_id] = float(t.price)
        for b in self.bookings:
            if b.status != 'confirmed' or b.event.event_date > self.now:
                continue
            lead = (b.event.event_date - b.booking_date).total_seconds() / 86400
            method = 'upi'
            p = no_show_probability(lead, method, tiers_price.get(b.event_id, 500),
                                    timezone.localtime(b.event.event_date).weekday())
            if self.rng.random() < p:
                continue
            attended.append(b.id)
            if self.rng.random() < 0.12 and (b.user_id, b.event_id) not in seen:
                seen.add((b.user_id, b.event_id))
                rating = int(np.clip(round(self.rng.normal(4.3, 0.7)), 1, 5))
                reviews.append(EventReview(user_id=b.user_id, event_id=b.event_id, booking_id=b.id, rating=rating,
                                           comment=random.choice(EVENT_REVIEW_COMMENTS),
                                           created_at=b.event.event_date + datetime.timedelta(hours=float(self.rng.uniform(4, 48)))))
        from django.db.models import OuterRef, Subquery
        start_of = Subquery(Booking.objects.filter(id=OuterRef('booking_id')).values('event__event_date')[:1])
        for i in range(0, len(attended), 5000):
            Ticket.objects.filter(booking_id__in=attended[i:i + 5000]).update(
                is_scanned=True, scanned_at=start_of, scanned_gate=random.choice(['Gate A', 'Gate B', 'Gate C']))
        for r in reviews:
            r.created_at = min(r.created_at, self.now)
        with historical_timestamps(EventReview, 'created_at'):
            EventReview.objects.bulk_create(reviews, batch_size=BATCH)
        counts = {}
        for r in reviews:
            counts[r.event_id] = counts.get(r.event_id, 0) + 1
        for e in self.events:
            e.review_count = counts.get(e.id, 0)
        Event.objects.bulk_update(self.events, ['review_count'], batch_size=500)
        self.summary.update(attended_bookings=len(attended), event_reviews=len(reviews))

    # ------------------------------------------------------------------
    # search + notifications
    # ------------------------------------------------------------------

    def build_searches(self):
        dishes = list({d.name for ds in self.menu.values() for d in ds})
        cuisines = list({(r.cuisine or '').strip() for r in self.live_restaurants if r.cuisine})
        restaurant_ids = {r.name: r.id for r in self.live_restaurants}
        hits = (
            [(d.lower(), f"menu_items:{random.choice([x.id for xs in self.menu.values() for x in xs if x.name == d][:1] or [0])}")
             for d in random.sample(dishes, min(250, len(dishes)))]
            + [(c.lower(), f"restaurants:{random.choice(self.live_restaurants).id}") for c in cuisines]
            + [(name.lower(), f"restaurants:{rid}") for name, rid in random.sample(list(restaurant_ids.items()), min(80, len(restaurant_ids)))]
            + [(f"{c} tickets", f"events:{random.choice(self.events).id}") for c in CATEGORY_MIX]
            + [(e.name.lower(), f"events:{e.id}") for e in random.sample(self.events, min(40, len(self.events)))]
        )
        weights = self.rng.lognormal(0, 1.2, len(hits))
        weights /= weights.sum()
        logs = []
        span = (self.now - _aware(self.start, 0, 0)).total_seconds()
        for _ in range(self.cfg.searches):
            when = self.now - datetime.timedelta(seconds=float(span * self.rng.beta(1, 1.6)))
            roll = self.rng.random()
            if roll < 0.06:
                query, result = random.choice(UNMET_SEARCHES), 'none'
            elif roll < 0.09:
                q = random.choice(dishes).lower()
                i = random.randrange(1, max(2, len(q) - 1))
                query, result = q[:i] + q[i + 1:], 'none'
            else:
                query, result = hits[int(self.rng.choice(len(hits), p=weights))]
            scope = 'events' if result.startswith('events') else 'all'
            logs.append(SearchLog(session_id=uuid.uuid4().hex[:32], query_text=query[:255], result_type=scope,
                                  result_id=result[:64], clicked=result != 'none' and self.rng.random() < 0.48,
                                  created_at=when))
        for _ in range(max(40, self.cfg.searches // 40)):
            logs.append(SearchLog(session_id=uuid.uuid4().hex[:32], query_text=TRENDING_SEARCH, result_type='all',
                                  result_id='none', clicked=False,
                                  created_at=self.now - datetime.timedelta(days=float(self.rng.uniform(0, 9)))))
        with historical_timestamps(SearchLog, 'created_at'):
            SearchLog.objects.bulk_create(logs, batch_size=BATCH * 2)
        self.summary['searches'] = len(logs)

    def build_notifications(self):
        """A recent inbox for the demo accounts, so their bell isn't empty."""
        notes = []
        demo_customer = self._demo(self.cfg.demo_customer_email)
        if demo_customer:
            for o in sorted([o for o in self.orders if o.user_id == demo_customer.id], key=lambda o: o.created_at)[-6:]:
                notes.append(Notification(user=demo_customer, type='order_status',
                                          title='Order delivered' if o.status == 'delivered' else 'Order update',
                                          message=f"Your order from {o.restaurant.name} is {o.status.replace('_', ' ')}.",
                                          related_type='order', is_read=o.status == 'delivered'))
            for b in [b for b in self.bookings if b.user_id == demo_customer.id][-3:]:
                notes.append(Notification(user=demo_customer, type='booking_status', title='Booking confirmed',
                                          message=f"You're going to {b.event.name}!", related_type='booking'))
        demo_owner = self._demo(self.cfg.demo_owner_email)
        if demo_owner:
            notes.append(Notification(user=demo_owner, type='order_status', title='New Order Received',
                                      message='A new order is waiting for confirmation.', related_type='order'))
        valid_types = {c[0] for c in Notification._meta.get_field('type').choices}
        notes = [n for n in notes if n.type in valid_types] + [
            Notification(user=n.user, type='system', title=n.title, message=n.message, related_type=n.related_type)
            for n in notes if n.type not in valid_types
        ]
        Notification.objects.bulk_create(notes)

    # ------------------------------------------------------------------

    def complete_past_bookings(self):
        """Once a show is over its confirmed bookings are completed (cancelled
        ones stay cancelled). Runs after attendance, which reads them as confirmed."""
        done = Booking.objects.filter(event__in=self.events, event__event_date__lt=self.now, status='confirmed')
        rows = list(done.values_list('id', 'event__event_end_date'))
        history = [BookingStatusHistory(booking_id=bid, old_status='confirmed', new_status='completed',
                                        changed_at=min(self.now, end + datetime.timedelta(hours=1)))
                   for bid, end in rows]
        done.update(status='completed')
        with historical_timestamps(BookingStatusHistory, 'changed_at'):
            BookingStatusHistory.objects.bulk_create(history, batch_size=5000)
        self.summary['completed_bookings'] = len(rows)

    def give_demo_customer_plans(self):
        """The demo customer has a couple of shows coming up (their booking
        page would otherwise only hold history). Moves two upcoming bookings,
        with their payments, to them."""
        demo = self._demo(self.cfg.demo_customer_email)
        if demo is None or Booking.objects.filter(user=demo, event__event_date__gt=self.now).exists():
            return
        chosen, seen = [], set()
        for b in (Booking.objects.filter(event__in=self.events, event__event_date__gt=self.now, status='confirmed')
                  .exclude(user=demo).order_by('event__event_date')):
            if b.event_id not in seen:
                chosen.append(b)
                seen.add(b.event_id)
            if len(chosen) == 2:
                break
        Booking.objects.filter(id__in=[b.id for b in chosen]).update(user=demo)
        Payment.objects.filter(id__in=[b.payment_id for b in chosen if b.payment_id]).update(user=demo)

    def align_listing_dates(self):
        """An event is listed before anyone books it: move each listing to a
        few hours to two days before its first booking when needed."""
        first = dict(Booking.objects.filter(event__in=self.events).values('event_id')
                     .annotate(first=Min('booking_date')).values_list('event_id', 'first'))
        changed = []
        for e in self.events:
            booked = first.get(e.id)
            if booked and booked <= e.created_at:
                e.created_at = booked - datetime.timedelta(hours=float(self.rng.uniform(3, 48)))
                changed.append(e)
        Event.objects.bulk_update(changed, ['created_at'], batch_size=500)

    def build_audit_log(self):
        """The admins' trail over the window: every event they approved,
        restaurants verified as they joined, and a few accounts suspended
        for a while and reinstated (so every account ends up active)."""
        admins = list(User.objects.filter(Q(role='admin') | Q(is_superuser=True)))
        if not admins:
            return
        span = max(1, (self.today - self.start).days)
        rows = []

        def at(when):
            return min(self.now, when)

        for e in self.events:
            if e.is_approved:
                # Approved a few hours to a day and a half after listing (and before now).
                wait = datetime.timedelta(hours=float(self.rng.uniform(2, 40)))
                room = self.now - e.created_at
                if e.created_at + wait > self.now:
                    wait = room * float(self.rng.uniform(0.2, 0.8))
                rows.append(AuditLog(actor=random.choice(admins), action='event.approve', target_type='event',
                                     target_id=str(e.id), metadata={'event_name': e.name},
                                     created_at=e.created_at + wait))
        for r in random.sample(self.live_restaurants, min(30, len(self.live_restaurants))):
            when = _aware(self.start + datetime.timedelta(days=int(self.rng.integers(0, span))),
                          int(self.rng.integers(10, 19)), int(self.rng.integers(0, 60)))
            rows.append(AuditLog(actor=random.choice(admins), action='restaurant.verify', target_type='restaurant',
                                 target_id=str(r.id), metadata={'restaurant_name': r.name}, created_at=at(when)))
        for idx in self.rng.choice(len(self.customers), size=min(4, len(self.customers)), replace=False):
            user = self.customers[int(idx)]
            when = _aware(self.start + datetime.timedelta(days=int(self.rng.integers(10, span))), 11, 30)
            admin = random.choice(admins)
            rows.append(AuditLog(actor=admin, action='user.suspend', target_type='user', target_id=str(user.id),
                                 metadata={'email': user.email, 'reason': 'Repeated payment chargebacks'},
                                 created_at=at(when)))
            rows.append(AuditLog(actor=admin, action='user.reinstate', target_type='user', target_id=str(user.id),
                                 metadata={'email': user.email},
                                 created_at=at(when + datetime.timedelta(days=int(self.rng.integers(2, 8))))))
        with historical_timestamps(AuditLog, 'created_at'):
            AuditLog.objects.bulk_create(rows, batch_size=2000)
        self.summary['audit_log'] = len(rows)

    def run(self):
        steps = [
            ('people', self.build_people), ('restaurants', self.build_restaurants),
            ('favourites', self.build_favourites), ('promotions', self.build_promotions),
            ('orders', self.build_orders), ('events', self.build_events), ('bookings', self.build_bookings),
            ('listing dates', self.align_listing_dates), ('attendance', self.build_attendance),
            ('finished shows', self.complete_past_bookings), ('demo customer plans', self.give_demo_customer_plans),
            ('reviews', self.build_reviews), ('payouts', self.build_payouts),
            ('searches', self.build_searches), ('notifications', self.build_notifications),
            ('audit log', self.build_audit_log),
        ]
        for name, step in steps:
            self.log(f"{name}...")
            step()
        self.log("order status history...")
        self.summary['status_history'] = self.build_order_history(self.orders)
        return self.summary
