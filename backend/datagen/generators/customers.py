"""Customer + address generation with a growth curve and festival-season
acquisition peaks (PRD §10).
"""
import datetime
import random
from django.utils import timezone

from core.models import User, Address
from .common import (
    FIRST_NAMES, LAST_NAMES, AREAS, SYNTHETIC_PASSWORD_HASH, growth_curve_dates,
    bulk_create_with_timestamps,
)

# Oct/Nov (festival season) and Dec (year-end) get extra signups.
SEASONAL_SIGNUP_MONTHS = (10, 11, 12)


def generate_customers(n, start, end, np_rng, run_tag):
    """Bulk-create n customers with signup dates on a growth curve.

    Returns the list of created User instances (with real pks, fetched
    back after bulk_create since Postgres assigns ids server-side).
    """
    signup_dates = growth_curve_dates(n, start, end, np_rng, seasonal_peaks=SEASONAL_SIGNUP_MONTHS)

    users = []
    for i in range(n):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        email = f"{first.lower()}.{last.lower()}.{run_tag}{i}@synthetic.platforma.dev"
        signup = signup_dates[i]
        signup_dt = timezone.make_aware(
            datetime.datetime.combine(signup, datetime.time(hour=random.randint(6, 23)))
        )
        # is_email_verified skews toward True for older accounts (they've
        # had time to verify) and lower for very recent signups — a
        # realistic, not-uniform verification rate for later analysis.
        days_since_signup = (end - signup).days
        verified = np_rng.random() < min(0.95, 0.4 + days_since_signup * 0.01)

        user = User(
            email=email,
            username=f"{first.lower()}{last.lower()}{run_tag}{i}",
            first_name=first,
            last_name=last,
            phone=f"+91{random.randint(7000000000, 9999999999)}",
            role='customer',
            is_email_verified=bool(verified),
            password=SYNTHETIC_PASSWORD_HASH,
        )
        user.created_at = signup_dt
        users.append(user)

    created = bulk_create_with_timestamps(User, users, ['created_at'], create_batch_size=1000, update_batch_size=1000)

    addresses = []
    for user in created:
        area, city = random.choice(AREAS)
        addresses.append(Address(
            user=user, label=random.choice(['home', 'work', 'other']),
            street=f"{random.randint(1, 999)}, {area} Road",
            city=city, state='Maharashtra' if city == 'Mumbai' else 'Karnataka' if city == 'Bengaluru' else 'Delhi',
            postal_code=str(random.randint(400001, 700001)),
            latitude=round(random.uniform(12.8, 28.7), 6),
            longitude=round(random.uniform(72.8, 88.4), 6),
            is_default=True,
        ))
    Address.objects.bulk_create(addresses, batch_size=1000)

    return created
