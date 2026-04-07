from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import timedelta
from decimal import Decimal
from html import escape

from django.contrib.auth import get_user_model
from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from django.utils.text import slugify

from eventra.models import Booking, BookingSeat, Event, EventAnalytics, EventReview, Seat, TicketType


@dataclass(frozen=True)
class EventTemplate:
    title: str
    venue: str
    city: str
    description: str


@dataclass(frozen=True)
class TicketTemplate:
    name: str
    price: Decimal
    quantity: int
    description: str
    benefits: str


class Command(BaseCommand):
    help = "Seed Eventra with rich demo events, ticket types, seats, and SVG images."

    CATEGORY_TEMPLATES: dict[str, list[EventTemplate]] = {
        "sports": [
            EventTemplate(
                title="Premier League Clash: Mumbai Meteors vs Bangalore Blasters",
                venue="Wankhede Stadium",
                city="Mumbai",
                description=(
                    "A high-intensity T20 match night with live commentary zones, "
                    "fan activities, and pre-match music performances."
                ),
            ),
            EventTemplate(
                title="Derby Day: Chennai Chargers vs Hyderabad Hawks",
                venue="MA Chidambaram Stadium",
                city="Chennai",
                description=(
                    "Big derby atmosphere with stadium choreography, family stands, "
                    "and premium hospitality lounges."
                ),
            ),
            EventTemplate(
                title="North Zone Cup Final",
                venue="Arun Jaitley Stadium",
                city="New Delhi",
                description=(
                    "Championship fixture with headline opening ceremony and curated "
                    "food courts from top local brands."
                ),
            ),
            EventTemplate(
                title="All-Star Weekend: Legends XI",
                venue="Narendra Modi Stadium",
                city="Ahmedabad",
                description=(
                    "A celebration match featuring fan-favorite athletes, skills "
                    "challenge zones, and live entertainment segments."
                ),
            ),
            EventTemplate(
                title="Super Cup Semi-Final Night",
                venue="Eden Gardens",
                city="Kolkata",
                description=(
                    "Semi-final showdown with dynamic light shows and merchandise "
                    "experience centers around the concourse."
                ),
            ),
            EventTemplate(
                title="Weekend Showdown: Royals vs Titans",
                venue="Sawai Mansingh Stadium",
                city="Jaipur",
                description=(
                    "Weekend prime-time contest with multi-camera replay walls and "
                    "interactive fan prediction contests."
                ),
            ),
        ],
        "movie": [
            EventTemplate(
                title="Interstellar Re-Run: IMAX Special",
                venue="PVR IMAX Select Citywalk",
                city="New Delhi",
                description=(
                    "A remastered IMAX screening with immersive audio, premium seat "
                    "tiers, and collector event passes."
                ),
            ),
            EventTemplate(
                title="Midnight Thriller Festival",
                venue="INOX Phoenix Marketcity",
                city="Mumbai",
                description=(
                    "Back-to-back thriller showcases curated for night audiences with "
                    "lounge access and exclusive previews."
                ),
            ),
            EventTemplate(
                title="Classic Cinema Saturday",
                venue="Cinepolis Nexus Koramangala",
                city="Bengaluru",
                description=(
                    "A restored classics marathon featuring iconic films, filmmaker "
                    "commentaries, and themed concessions."
                ),
            ),
            EventTemplate(
                title="Family Animation Weekend",
                venue="PVR Lulu Mall",
                city="Kochi",
                description=(
                    "Animated feature lineup for families with dedicated kids zones "
                    "and bundled snack combos."
                ),
            ),
            EventTemplate(
                title="Sci-Fi Universe Marathon",
                venue="Miraj Cinemas",
                city="Pune",
                description=(
                    "Multi-film science-fiction marathon with immersive projection "
                    "settings and overnight pass bundles."
                ),
            ),
            EventTemplate(
                title="Director's Cut Showcase",
                venue="PVR Director's Cut",
                city="Gurugram",
                description=(
                    "A luxury auditorium experience featuring director's cut editions, "
                    "curated intros, and concierge service."
                ),
            ),
        ],
        "concert": [
            EventTemplate(
                title="Midnight Echoes Live Tour",
                venue="Jawaharlal Nehru Stadium Grounds",
                city="New Delhi",
                description=(
                    "Large-format live concert with synchronized LED visuals, "
                    "festival-style food courts, and fan pit access."
                ),
            ),
            EventTemplate(
                title="Indie City Nights",
                venue="Phoenix Arena",
                city="Hyderabad",
                description=(
                    "An indie artist lineup with standing zones, acoustic side stage, "
                    "and signature merch drop booths."
                ),
            ),
            EventTemplate(
                title="Synthwave Sunset Festival",
                venue="BKC Open Grounds",
                city="Mumbai",
                description=(
                    "Open-ground electronic music evening with panoramic stage design "
                    "and immersive color-wave lighting."
                ),
            ),
            EventTemplate(
                title="Rock Republic Reunion",
                venue="YMCA Grounds",
                city="Chennai",
                description=(
                    "Arena-scale rock set with premium deck viewing areas and "
                    "priority gates for early entrants."
                ),
            ),
            EventTemplate(
                title="Acoustic Under The Stars",
                venue="Cubbon Park Amphitheatre",
                city="Bengaluru",
                description=(
                    "A curated unplugged evening with premium lounge seating and a "
                    "minimalist stage atmosphere."
                ),
            ),
            EventTemplate(
                title="Global Beats Carnival",
                venue="Salt Lake Cultural Arena",
                city="Kolkata",
                description=(
                    "A multi-genre live music carnival with dance zones, visual art "
                    "installations, and after-show access tiers."
                ),
            ),
        ],
        "theater": [
            EventTemplate(
                title="Broadway Nights: The Phantom Ensemble",
                venue="NCPA Tata Theatre",
                city="Mumbai",
                description=(
                    "A premium theatrical production with orchestral score, dramatic "
                    "set transitions, and curated pre-show experiences."
                ),
            ),
            EventTemplate(
                title="Shakespeare in the City",
                venue="Kamani Auditorium",
                city="New Delhi",
                description=(
                    "Contemporary Shakespeare adaptation with immersive stage blocking "
                    "and post-show cast interaction sessions."
                ),
            ),
            EventTemplate(
                title="Classical Drama Evening",
                venue="Ravindra Kalakshetra",
                city="Bengaluru",
                description=(
                    "A heritage theatre evening featuring classical dramatic forms, "
                    "live score, and detailed set craftsmanship."
                ),
            ),
            EventTemplate(
                title="Mystery Stage Chronicles",
                venue="Prithvi Theatre",
                city="Mumbai",
                description=(
                    "A suspense-led theatre presentation with intimate seating layout "
                    "and interactive interval storytelling."
                ),
            ),
            EventTemplate(
                title="Legends of Literature Live",
                venue="Bharat Bhavan",
                city="Bhopal",
                description=(
                    "Multi-act stage adaptation of literary classics with art-forward "
                    "set pieces and actor-led panel moments."
                ),
            ),
            EventTemplate(
                title="Folk Theatre Fusion Night",
                venue="Tagore Theatre",
                city="Chandigarh",
                description=(
                    "Folk and modern storytelling blend featuring high-energy ensemble "
                    "performances and immersive costumes."
                ),
            ),
        ],
        "comedy": [
            EventTemplate(
                title="Laugh Riot Arena: Stand-Up Superlineup",
                venue="Indira Gandhi Indoor Stadium",
                city="New Delhi",
                description=(
                    "A headline comedy lineup with high-energy stand-up sets, surprise "
                    "acts, and crowd interaction rounds."
                ),
            ),
            EventTemplate(
                title="Friday Roast Night",
                venue="The Habitat",
                city="Mumbai",
                description=(
                    "Late-evening roast showcase featuring top comics and live crowd "
                    "battle segments."
                ),
            ),
            EventTemplate(
                title="Open Mic Saturday Special",
                venue="The Comedy Theatre",
                city="Bengaluru",
                description=(
                    "Curated open mic with mentor picks, rapid rounds, and audience "
                    "choice finalists."
                ),
            ),
            EventTemplate(
                title="Improv Clash League",
                venue="G5A Warehouse",
                city="Mumbai",
                description=(
                    "A fast-paced improv showdown between top troupes with audience "
                    "prompts and voting-led finales."
                ),
            ),
            EventTemplate(
                title="Weekend Punchlines Live",
                venue="Shilpakala Vedika",
                city="Hyderabad",
                description=(
                    "Regional and national comics in one stage event featuring themed "
                    "segments and late-night specials."
                ),
            ),
            EventTemplate(
                title="Comedy Marathon XL",
                venue="Biswa Bangla Convention Centre",
                city="Kolkata",
                description=(
                    "An all-evening comedy format with rotating hosts, sketch blocks, "
                    "and fan-favorite surprise guests."
                ),
            ),
        ],
        "expo": [
            EventTemplate(
                title="Tech Future Expo 2026",
                venue="Pragati Maidan",
                city="New Delhi",
                description=(
                    "A large technology expo featuring startup zones, AI showcases, "
                    "hardware demos, and keynote stages."
                ),
            ),
            EventTemplate(
                title="Auto Innovation Expo",
                venue="BIEC",
                city="Bengaluru",
                description=(
                    "Next-gen mobility showcase with EV displays, track demos, and "
                    "engineering product reveals."
                ),
            ),
            EventTemplate(
                title="Design and Build Summit",
                venue="Bombay Exhibition Centre",
                city="Mumbai",
                description=(
                    "Architecture and design industry expo with product galleries, "
                    "live workshops, and trend showcases."
                ),
            ),
            EventTemplate(
                title="Creator Economy Convention",
                venue="HITEX Exhibition Centre",
                city="Hyderabad",
                description=(
                    "Digital creator and media-tech summit with monetization sessions, "
                    "brand collaboration pods, and live studios."
                ),
            ),
            EventTemplate(
                title="Green Energy Showcase",
                venue="India Expo Mart",
                city="Greater Noida",
                description=(
                    "Clean-tech and sustainable energy expo featuring product launches, "
                    "policy forums, and investor networking."
                ),
            ),
            EventTemplate(
                title="Health and Bio Innovation Expo",
                venue="CIDCO Exhibition Centre",
                city="Navi Mumbai",
                description=(
                    "Healthcare, biotech, and wellness innovation expo with startup "
                    "pods, equipment demos, and research panels."
                ),
            ),
        ],
        "dining": [
            EventTemplate(
                title="Culinary Passport Festival",
                venue="Nehru Centre Grounds",
                city="Mumbai",
                description=(
                    "A multi-cuisine tasting festival with chef counters, live music, "
                    "and premium dining enclaves."
                ),
            ),
            EventTemplate(
                title="Street Food Carnival Night",
                venue="Jawahar Circle Food Plaza",
                city="Jaipur",
                description=(
                    "Regional street-food focused festival with tasting passes, quick "
                    "service lanes, and family-friendly zones."
                ),
            ),
            EventTemplate(
                title="Chef's Table City Edition",
                venue="The Grand Ballroom",
                city="Pune",
                description=(
                    "A curated fine dining experience with rotating chef stations, "
                    "course-led tasting menus, and beverage pairing options."
                ),
            ),
            EventTemplate(
                title="Midnight Food Market",
                venue="CyberHub Plaza",
                city="Gurugram",
                description=(
                    "Late-night gourmet market format featuring artisanal pop-ups, "
                    "dessert labs, and global food trucks."
                ),
            ),
            EventTemplate(
                title="Farm to Fork Summit",
                venue="Eco Convention Lawn",
                city="Bengaluru",
                description=(
                    "Sustainable dining and producer showcase with chef talks, tasting "
                    "sessions, and ingredient storytelling zones."
                ),
            ),
            EventTemplate(
                title="Regional Flavors Weekender",
                venue="Kala Ghoda Food Street",
                city="Mumbai",
                description=(
                    "A celebration of regional cuisine with rotating menus, tasting "
                    "cards, and spotlight chef collaborations."
                ),
            ),
        ],
    }

    TICKET_TEMPLATES: dict[str, list[TicketTemplate]] = {
        "sports": [
            TicketTemplate("Upper Stand", Decimal("899.00"), 140, "Entry stand seating", "Fast entry lane"),
            TicketTemplate("Premium Pavilion", Decimal("1899.00"), 90, "Closer center view", "Dedicated service counters"),
            TicketTemplate("VIP Box", Decimal("4999.00"), 30, "Private lounge access", "Hospitality + parking"),
        ],
        "movie": [
            TicketTemplate("Silver", Decimal("299.00"), 120, "Classic seating", "Standard snack lane"),
            TicketTemplate("Gold", Decimal("499.00"), 80, "Center seating", "Priority entry"),
            TicketTemplate("Platinum Recliner", Decimal("799.00"), 40, "Recliner seats", "Lounge beverage voucher"),
        ],
        "theater": [
            TicketTemplate("Balcony", Decimal("399.00"), 90, "Balcony seating", "Theatre guide booklet"),
            TicketTemplate("Orchestra", Decimal("799.00"), 60, "Front orchestra view", "Fast check-in"),
            TicketTemplate("Royal Circle", Decimal("1299.00"), 30, "Premium center block", "Complimentary interval box"),
        ],
        "concert": [
            TicketTemplate("General Access", Decimal("1299.00"), 180, "Open ground access", "Festival food court access"),
            TicketTemplate("Fan Pit", Decimal("2499.00"), 100, "Closer stage access", "Early gate entry"),
            TicketTemplate("VIP Deck", Decimal("4599.00"), 40, "Elevated deck view", "Dedicated bar + lounge"),
        ],
        "comedy": [
            TicketTemplate("Regular", Decimal("499.00"), 120, "Regular seating", "Standard entry"),
            TicketTemplate("Priority", Decimal("899.00"), 70, "Best-view seating", "Priority gate"),
            TicketTemplate("Front Row VIP", Decimal("1499.00"), 25, "Front-row seating", "Meet and greet chance"),
        ],
        "expo": [
            TicketTemplate("Day Pass", Decimal("399.00"), 220, "Single day access", "Public keynote access"),
            TicketTemplate("Pro Pass", Decimal("999.00"), 120, "Extended hall access", "Workshop access"),
            TicketTemplate("Delegate Pass", Decimal("1999.00"), 60, "Full event access", "Networking lounge"),
        ],
        "dining": [
            TicketTemplate("Tasting Pass", Decimal("699.00"), 160, "Multi-stall tasting", "Quick serve lane"),
            TicketTemplate("Chef Counter", Decimal("1299.00"), 90, "Curated chef plates", "Reserved counter access"),
            TicketTemplate("Signature Table", Decimal("2499.00"), 40, "Premium dining deck", "Pairing and concierge"),
        ],
    }

    CATEGORY_COLORS: dict[str, tuple[str, str, str]] = {
        "sports": ("#0b3d2e", "#1f8f5f", "#8ef7c0"),
        "movie": ("#2d1a47", "#6b3cc8", "#f6e58d"),
        "theater": ("#3f1d1d", "#9b2d30", "#ffd4aa"),
        "concert": ("#1a1e4f", "#4d66ff", "#a5f3fc"),
        "comedy": ("#43240d", "#d97924", "#ffe8b6"),
        "expo": ("#11253d", "#2f6aa5", "#d6f0ff"),
        "dining": ("#2b2a12", "#8a7a2a", "#fef3c7"),
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--events-per-category",
            type=int,
            default=4,
            help="Number of events to generate for each Eventra category (default: 4).",
        )
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Clear existing Eventra records before seeding.",
        )
        parser.add_argument(
            "--skip-images",
            action="store_true",
            help="Create events without generated SVG images.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=42,
            help="Random seed for deterministic ratings and ordering.",
        )

    def handle(self, *args, **options):
        events_per_category = options["events_per_category"]
        if events_per_category < 1 or events_per_category > 12:
            raise CommandError("--events-per-category must be between 1 and 12")

        self.skip_images = bool(options["skip_images"])
        randomizer = random.Random(options["seed"])

        if options["reset"]:
            self._reset_eventra_data()

        organizer = self._get_or_create_organizer()
        now = timezone.localtime()
        base_date = now.replace(hour=18, minute=30, second=0, microsecond=0) + timedelta(days=7)

        created_events = 0
        updated_events = 0
        total_ticket_types = 0
        total_seats = 0

        for category_index, category in enumerate(self.CATEGORY_TEMPLATES.keys()):
            templates = self.CATEGORY_TEMPLATES[category]

            for position in range(events_per_category):
                template = templates[position % len(templates)]
                sequence = category_index * events_per_category + position
                event_date = base_date + timedelta(days=sequence * 2, hours=(position % 3))
                end_date = event_date + timedelta(hours=3)

                defaults = {
                    "organizer": organizer,
                    "description": template.description,
                    "category": category,
                    "venue_name": template.venue,
                    "address": f"{template.venue}, {template.city}",
                    "event_end_date": end_date,
                    "is_published": True,
                    "is_cancelled": False,
                }

                event, created = Event.objects.get_or_create(
                    name=template.title,
                    event_date=event_date,
                    defaults=defaults,
                )

                if created:
                    created_events += 1
                else:
                    updated_events += 1
                    event.description = template.description
                    event.category = category
                    event.venue_name = template.venue
                    event.address = f"{template.venue}, {template.city}"
                    event.event_end_date = end_date
                    event.is_published = True
                    event.is_cancelled = False

                if not self.skip_images:
                    self._apply_svg_images(event=event, category=category, sequence=sequence)

                ticket_count, seat_count = self._seed_tickets_and_seats(event, category)
                total_ticket_types += ticket_count
                total_seats += seat_count

                event.total_seats = seat_count
                event.available_seats = seat_count
                event.rating = Decimal(str(round(randomizer.uniform(4.0, 4.9), 2)))
                event.review_count = randomizer.randint(24, 1200)
                event.save()

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Eventra seeding complete."))
        self.stdout.write(self.style.SUCCESS(f"  Events created: {created_events}"))
        self.stdout.write(self.style.SUCCESS(f"  Events updated: {updated_events}"))
        self.stdout.write(self.style.SUCCESS(f"  Ticket types generated: {total_ticket_types}"))
        self.stdout.write(self.style.SUCCESS(f"  Seats generated: {total_seats}"))
        if self.skip_images:
            self.stdout.write(self.style.WARNING("  Images: skipped (--skip-images)"))
        else:
            self.stdout.write(self.style.SUCCESS("  Images: generated SVG posters and banners"))

    def _reset_eventra_data(self):
        BookingSeat.objects.all().delete()
        Booking.objects.all().delete()
        EventReview.objects.all().delete()
        EventAnalytics.objects.all().delete()
        Seat.objects.all().delete()
        TicketType.objects.all().delete()
        Event.objects.all().delete()
        self.stdout.write(self.style.WARNING("Existing Eventra records cleared."))

    def _get_or_create_organizer(self):
        user_model = get_user_model()
        user, created = user_model.objects.get_or_create(
            email="eventra.organizer@platforma.local",
            defaults={
                "username": "eventra_organizer",
                "first_name": "Eventra",
                "last_name": "Organizer",
                "role": "event_organizer",
                "phone": "+910000000001",
            },
        )

        if created:
            user.set_password("EventraPass123!")
            user.save()
            self.stdout.write(self.style.SUCCESS("Created seed organizer user: eventra.organizer@platforma.local"))

        return user

    def _seed_tickets_and_seats(self, event: Event, category: str) -> tuple[int, int]:
        if event.bookings.exists():
            seat_count = event.seats.count()
            ticket_count = event.ticket_types.count()
            self.stdout.write(
                self.style.WARNING(
                    f"Skipping seat regeneration for '{event.name}' because bookings already exist."
                )
            )
            return ticket_count, seat_count

        event.seats.all().delete()
        event.ticket_types.all().delete()

        total_seats = 0
        created_tickets = 0

        for ticket_index, ticket_template in enumerate(self.TICKET_TEMPLATES[category]):
            ticket = TicketType.objects.create(
                event=event,
                name=ticket_template.name,
                price=ticket_template.price,
                quantity_total=ticket_template.quantity,
                quantity_available=ticket_template.quantity,
                description=ticket_template.description,
                benefits=ticket_template.benefits,
            )
            created_tickets += 1

            prefix = f"{ticket_template.name.split()[0][:3].upper()}{ticket_index + 1}"
            self._create_seats(event=event, ticket=ticket, section_prefix=prefix)
            total_seats += ticket_template.quantity

        return created_tickets, total_seats

    def _create_seats(self, event: Event, ticket: TicketType, section_prefix: str):
        seats_to_create = []
        seats_per_row = 12
        rows_per_section = 8

        for index in range(ticket.quantity_total):
            section_number = (index // (seats_per_row * rows_per_section)) + 1
            row_number = ((index // seats_per_row) % rows_per_section) + 1
            seat_number = (index % seats_per_row) + 1

            seats_to_create.append(
                Seat(
                    event=event,
                    ticket_type=ticket,
                    section=f"{section_prefix}-{section_number}",
                    row=f"R{row_number:02d}",
                    seat_number=f"{seat_number:02d}",
                    status="available",
                )
            )

        Seat.objects.bulk_create(seats_to_create)

    def _apply_svg_images(self, event: Event, category: str, sequence: int):
        color_start, color_end, accent = self.CATEGORY_COLORS[category]
        safe_slug = slugify(f"{event.name}-{event.event_date.date()}-{sequence}")[:90] or f"event-{sequence}"

        poster_svg = self._build_svg(
            title=event.name,
            subtitle=f"{event.venue_name} | {event.category.upper()}",
            width=720,
            height=960,
            color_start=color_start,
            color_end=color_end,
            accent=accent,
        )
        banner_svg = self._build_svg(
            title=event.name,
            subtitle=f"{event.venue_name} | {timezone.localtime(event.event_date).strftime('%d %b %Y, %I:%M %p')}",
            width=1600,
            height=900,
            color_start=color_start,
            color_end=color_end,
            accent=accent,
        )

        event.image.save(f"{safe_slug}-poster.svg", ContentFile(poster_svg), save=False)
        event.banner.save(f"{safe_slug}-banner.svg", ContentFile(banner_svg), save=False)

    def _build_svg(
        self,
        *,
        title: str,
        subtitle: str,
        width: int,
        height: int,
        color_start: str,
        color_end: str,
        accent: str,
    ) -> bytes:
        safe_title = escape(title)
        safe_subtitle = escape(subtitle)

        svg = f"""
<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="{color_start}" />
      <stop offset="100%" stop-color="{color_end}" />
    </linearGradient>
    <radialGradient id="glow" cx="0.8" cy="0.2" r="0.8">
      <stop offset="0%" stop-color="{accent}" stop-opacity="0.45" />
      <stop offset="100%" stop-color="{accent}" stop-opacity="0" />
    </radialGradient>
  </defs>

  <rect width="100%" height="100%" fill="url(#bg)" />
  <rect width="100%" height="100%" fill="url(#glow)" />

  <g opacity="0.16" fill="none" stroke="{accent}">
    <circle cx="{int(width * 0.14)}" cy="{int(height * 0.18)}" r="{int(min(width, height) * 0.16)}" />
    <circle cx="{int(width * 0.84)}" cy="{int(height * 0.82)}" r="{int(min(width, height) * 0.22)}" />
  </g>

  <text x="{int(width * 0.08)}" y="{int(height * 0.62)}" fill="#ffffff"
        font-family="'Segoe UI', Arial, sans-serif" font-size="{int(width * 0.06)}"
        font-weight="800" letter-spacing="1">{safe_title}</text>
  <text x="{int(width * 0.08)}" y="{int(height * 0.70)}" fill="#ffffff"
        font-family="'Segoe UI', Arial, sans-serif" font-size="{int(width * 0.024)}"
        font-weight="600" opacity="0.92">{safe_subtitle}</text>
  <text x="{int(width * 0.08)}" y="{int(height * 0.92)}" fill="#ffffff"
        font-family="'Segoe UI', Arial, sans-serif" font-size="{int(width * 0.022)}"
        font-weight="700" opacity="0.85">EVENTRA</text>
</svg>
""".strip()

        return svg.encode("utf-8")
