"""Venue + event + ticket-type + seat generation."""
import datetime
import random
from django.utils import timezone

from core.models import User
from eventra.models import Event, Venue, TicketType, Seat
from .common import (
    FIRST_NAMES, LAST_NAMES, AREAS, EVENT_CATEGORIES, EVENT_NAME_POOL,
    SYNTHETIC_PASSWORD_HASH, growth_curve_dates,
)
from datagen.planted import PLANTED_CROSS_DOMAIN_GENRE

TIER_NAMES = [('General', 1.0), ('Premium', 1.8), ('VIP', 2.8)]


def generate_venues(n, np_rng, run_tag):
    venues = []
    for i in range(n):
        area, city = random.choice(AREAS)
        venues.append(Venue(
            name=f"{area} {'Arena' if i % 3 == 0 else 'Hall' if i % 3 == 1 else 'Grounds'} {run_tag}{i}",
            address=f"{random.randint(1, 100)}, {area}, {city}",
            area=area, city=city,
            latitude=round(random.uniform(12.8, 28.7), 6),
            longitude=round(random.uniform(72.8, 88.4), 6),
            capacity=int(np_rng.integers(200, 5000)),
            is_indoor=bool(np_rng.random() < 0.7),
        ))
    Venue.objects.bulk_create(venues, batch_size=500)
    return list(Venue.objects.filter(name__in=[v.name for v in venues]))


def generate_events(n, venues, np_rng, start, end, run_tag):
    """Events biased toward PLANTED_CROSS_DOMAIN_GENRE so the cross-domain
    genre->cuisine mining module has enough concert events to correlate
    against restaurant orders in the same zone/window.
    """
    organizers = []
    for i in range(n):
        first, last = random.choice(FIRST_NAMES), random.choice(LAST_NAMES)
        organizers.append(User(
            email=f"organizer.{run_tag}{i}@synthetic.platforma.dev",
            username=f"organizer{run_tag}{i}",
            first_name=first, last_name=last,
            role='event_organizer', company_name=f"{last} Events",
            is_email_verified=True,
            password=SYNTHETIC_PASSWORD_HASH,
        ))
    User.objects.bulk_create(organizers, batch_size=500)
    organizers = list(User.objects.filter(username__startswith=f"organizer{run_tag}"))

    event_dates = growth_curve_dates(n, start, end + datetime.timedelta(days=90), np_rng)

    events = []
    for i, organizer in enumerate(organizers):
        # Bias category toward the planted genre so cross-domain mining has signal.
        category = PLANTED_CROSS_DOMAIN_GENRE if np_rng.random() < 0.35 else random.choice(EVENT_CATEGORIES)
        venue = random.choice(venues)
        name = f"{random.choice(EVENT_NAME_POOL.get(category, ['Live Show']))} {run_tag}{i}"
        event_date = timezone.make_aware(
            datetime.datetime.combine(event_dates[i], datetime.time(hour=random.choice([18, 19, 20, 21])))
        )
        # Sellable capacity for this specific event — capped well below the
        # venue's full physical capacity, or ~62k ticket sales across 900
        # events (PRD §10) would require an unreasonably large seat table.
        total_seats = int(min(venue.capacity, np_rng.integers(60, 320)))
        events.append(Event(
            organizer=organizer, name=name,
            description=f"{name} at {venue.name}.",
            category=category,
            venue=venue, venue_name=venue.name, address=venue.address,
            latitude=venue.latitude, longitude=venue.longitude,
            event_date=event_date,
            event_end_date=event_date + datetime.timedelta(hours=3),
            is_published=True, is_approved=True, is_cancelled=False,
            total_seats=total_seats, available_seats=total_seats,
            rating=round(float(np_rng.uniform(3.0, 4.9)), 2),
            review_count=int(np_rng.integers(0, 300)),
        ))

    Event.objects.bulk_create(events, batch_size=500)
    created = list(Event.objects.filter(name__in=[e.name for e in events]).select_related('venue'))

    # Restore created_at (auto_now_add) — not semantically critical here
    # since event_date carries the real timeline, but kept consistent.
    return created


def generate_ticket_types_and_seats(events, np_rng):
    """Every event gets 1-3 tiers and a full seat map sized to venue capacity."""
    ticket_types = []
    tt_meta = []  # (event, tier_name) -> list index bookkeeping
    for event in events:
        n_tiers = random.choice([1, 2, 3])
        tiers = TIER_NAMES[:n_tiers]
        remaining = event.total_seats
        per_tier = max(1, remaining // n_tiers)
        base_price = float(np_rng.uniform(299, 1499))
        for idx, (tier_name, multiplier) in enumerate(tiers):
            qty = per_tier if idx < n_tiers - 1 else remaining - per_tier * (n_tiers - 1)
            qty = max(qty, 1)
            tt = TicketType(
                event=event, name=tier_name, price=round(base_price * multiplier, 2),
                quantity_total=qty, quantity_available=qty,
                is_refundable=np_rng.random() < 0.8,
                refund_cutoff_hours=random.choice([12, 24, 48]),
            )
            ticket_types.append(tt)
            tt_meta.append((event.id, tier_name, qty))

    TicketType.objects.bulk_create(ticket_types, batch_size=1000)
    created_tt = list(TicketType.objects.filter(event__in=events))
    tt_by_event_tier = {(tt.event_id, tt.name): tt for tt in created_tt}

    seats = []
    SEATS_PER_ROW = 20
    for event_id, tier_name, qty in tt_meta:
        tt = tt_by_event_tier[(event_id, tier_name)]
        section = tier_name[:1]
        placed = 0
        row_num = 1
        while placed < qty:
            for seat_num in range(1, SEATS_PER_ROW + 1):
                if placed >= qty:
                    break
                seats.append(Seat(
                    event_id=event_id, section=section, row=str(row_num),
                    seat_number=str(seat_num), ticket_type=tt, status='available',
                ))
                placed += 1
            row_num += 1
    Seat.objects.bulk_create(seats, batch_size=2000, ignore_conflicts=True)
    return created_tt
