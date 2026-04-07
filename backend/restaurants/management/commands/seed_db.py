from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from restaurants.models import Restaurant
from zesty.scripts.fetch_images import fetch_pexels_image
from zesty.scripts.fetch_overpass_restaurants import fetch_overpass_restaurants


class Command(BaseCommand):
    help = "Seed Restaurant data from fake script and optional real Overpass API data."

    AREA_COORDINATES = {
        "Bandra": (Decimal("19.059600"), Decimal("72.829500")),
        "Andheri": (Decimal("19.113600"), Decimal("72.869700")),
        "Juhu": (Decimal("19.107500"), Decimal("72.826300")),
        "Colaba": (Decimal("18.906700"), Decimal("72.814700")),
        "Worli": (Decimal("19.017900"), Decimal("72.813600")),
        "Dadar": (Decimal("19.018000"), Decimal("72.843000")),
        "Powai": (Decimal("19.117600"), Decimal("72.906000")),
        "Churchgate": (Decimal("18.935000"), Decimal("72.826400")),
        "Thane": (Decimal("19.218300"), Decimal("72.978100")),
        "Borivali": (Decimal("19.229000"), Decimal("72.857000")),
    }

    AREA_KEYWORDS = {
        "Bandra": ("bandra",),
        "Andheri": ("andheri",),
        "Juhu": ("juhu",),
        "Colaba": ("colaba", "fort"),
        "Dadar": ("dadar",),
        "Powai": ("powai",),
        "Worli": ("worli",),
        "Churchgate": ("churchgate", "marine lines"),
        "Thane": ("thane",),
        "Borivali": ("borivali",),
    }

    CUISINE_KEYWORDS = {
        "North Indian": ("north", "punjabi", "biryani", "kebab"),
        "South Indian": ("south", "dosa", "idli", "udupi"),
        "Chinese": ("chinese", "indo-chinese", "szechuan"),
        "Italian": ("italian", "pizza", "pasta"),
        "Continental": ("continental", "european", "grill", "bistro"),
        "Fast Food": ("fast", "burger", "pizza", "sandwich"),
        "Street Food": ("street", "chaat", "snack"),
        "Seafood": ("seafood", "fish", "prawn", "coastal"),
        "Mughlai": ("mughlai", "korma", "tandoor"),
        "Indian": ("indian", "veg", "vegetarian", "thali"),
    }

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Delete all existing restaurants before seeding.",
        )
        parser.add_argument(
            "--skip-real",
            action="store_true",
            help="Seed only fake script data and skip Overpass API fetch.",
        )
        parser.add_argument(
            "--real-limit",
            type=int,
            default=80,
            help="Maximum number of real restaurants to fetch from Overpass API.",
        )

    def handle(self, *args, **options):
        try:
            from zesty.scripts.seed_restaurants import RESTAURANTS
        except Exception as exc:
            raise CommandError(f"Could not import RESTAURANTS: {exc}") from exc

        if not isinstance(RESTAURANTS, list):
            raise CommandError("RESTAURANTS must be a list of dictionaries.")

        if options.get("clear"):
            deleted_count, _ = Restaurant.objects.all().delete()
            self.stdout.write(
                self.style.WARNING(f"Cleared {deleted_count} existing restaurants.")
            )

        fake_stats = self._seed_fake_records(RESTAURANTS)

        real_stats = {
            "fetched": 0,
            "created": 0,
            "updated": 0,
            "unchanged": 0,
            "errors": 0,
            "skipped": options.get("skip_real", False),
        }

        if not options.get("skip_real"):
            try:
                real_records = fetch_overpass_restaurants(limit=options.get("real_limit", 80))
                real_stats["fetched"] = len(real_records)
                seeded_real_stats = self._seed_real_records(real_records)
                real_stats.update(seeded_real_stats)
            except Exception as exc:
                real_stats["errors"] += 1
                self.stderr.write(
                    self.style.WARNING(
                        f"Real data fetch failed, fake data was still seeded: {exc}"
                    )
                )

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("Seeding complete."))
        self.stdout.write("Fake data summary:")
        self.stdout.write(f"  Source records: {len(RESTAURANTS)}")
        self.stdout.write(self.style.SUCCESS(f"  Created: {fake_stats['created']}"))
        if fake_stats["errors"]:
            self.stdout.write(self.style.WARNING(f"  Errors: {fake_stats['errors']}"))
        else:
            self.stdout.write(self.style.SUCCESS("  Errors: 0"))

        if real_stats["skipped"]:
            self.stdout.write("Real data summary:")
            self.stdout.write("  Skipped: yes (--skip-real)")
        else:
            self.stdout.write("Real data summary:")
            self.stdout.write(f"  Fetched: {real_stats['fetched']}")
            self.stdout.write(self.style.SUCCESS(f"  Created: {real_stats['created']}"))
            self.stdout.write(self.style.SUCCESS(f"  Updated: {real_stats['updated']}"))
            self.stdout.write(f"  Unchanged: {real_stats['unchanged']}")
            if real_stats["errors"]:
                self.stdout.write(self.style.WARNING(f"  Errors: {real_stats['errors']}"))
            else:
                self.stdout.write(self.style.SUCCESS("  Errors: 0"))

    def _seed_fake_records(self, records):
        stats = {"created": 0, "errors": 0}

        for index, record in enumerate(records):
            name = (record.get("name") or "").strip()
            if not name:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR("Skipped fake entry with missing name."))
                continue

            try:
                Restaurant.objects.create(**self._build_fake_create_fields(record, index))
                stats["created"] += 1
            except Exception as exc:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR(f"Failed to seed fake '{name}': {exc}"))

        return stats

    def _seed_real_records(self, records):
        stats = {"created": 0, "updated": 0, "unchanged": 0, "errors": 0}

        for index, record in enumerate(records):
            name = (record.get("name") or "").strip()
            source_osm_id = (record.get("osm_id") or "").strip()
            if not name or not source_osm_id:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR("Skipped real entry with missing name or osm_id."))
                continue

            try:
                resolved_osm_id = self._resolve_real_osm_id(source_osm_id, index)
                existing = Restaurant.objects.filter(
                    data_source="real",
                    osm_id=resolved_osm_id,
                ).first()

                update_fields = self._build_real_update_fields(record, index)

                if existing:
                    changed_fields = []
                    for field_name, value in update_fields.items():
                        if getattr(existing, field_name) != value:
                            setattr(existing, field_name, value)
                            changed_fields.append(field_name)

                    if changed_fields:
                        existing.save(update_fields=changed_fields)
                        stats["updated"] += 1
                    else:
                        stats["unchanged"] += 1
                    continue

                create_fields = {
                    "osm_id": resolved_osm_id,
                    **update_fields,
                }
                Restaurant.objects.create(**create_fields)
                stats["created"] += 1
            except Exception as exc:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR(f"Failed to seed real '{name}': {exc}"))

        return stats

    def _build_fake_create_fields(self, record, index):
        area = self._normalize_area(record.get("area", "Bandra"))
        latitude, longitude = self.AREA_COORDINATES.get(area, self.AREA_COORDINATES["Bandra"])
        cuisine = self._normalize_cuisine(record.get("cuisine", "Indian"))
        hours = (record.get("hours") or "").strip()
        image_url = (record.get("image_url") or "").strip()
        if not image_url:
            image_url = fetch_pexels_image(cuisine, index)

        is_open = bool(record.get("is_open", True))

        return {
            "osm_id": self._build_unique_fake_osm_id(record.get("name", "restaurant"), index),
            "name": record.get("name", "Restaurant"),
            "area": area,
            "cuisine": cuisine,
            "rating": self._to_rating(record.get("rating", 4.1)),
            "price_range": self._to_price_range(record.get("price_range", 2)),
            "image_url": image_url,
            "address": (record.get("address") or "").strip(),
            "hours": hours,
            "is_open": is_open,
            "veg_only": bool(record.get("veg_only", False)),
            "description": (record.get("description") or "").strip(),
            "opening_hours": hours,
            "phone": "",
            "website": "",
            "photo_url": image_url,
            "city": "Mumbai",
            "is_active": is_open,
            "latitude": latitude,
            "longitude": longitude,
            "data_source": "fake",
        }

    def _build_real_update_fields(self, record, index):
        area = self._normalize_area(record.get("area", ""))
        fallback_lat, fallback_lon = self.AREA_COORDINATES.get(area, self.AREA_COORDINATES["Bandra"])
        latitude = self._to_decimal(record.get("latitude"), fallback_lat)
        longitude = self._to_decimal(record.get("longitude"), fallback_lon)

        cuisine = self._normalize_cuisine(record.get("cuisine", "Indian"))
        hours = (record.get("hours") or "").strip()
        image_url = (record.get("image_url") or "").strip()
        if not image_url:
            image_url = fetch_pexels_image(cuisine, index)

        is_open = bool(record.get("is_open", True))

        return {
            "name": (record.get("name") or "").strip() or "Restaurant",
            "area": area,
            "cuisine": cuisine,
            "rating": self._to_rating(record.get("rating", 4.1)),
            "price_range": self._to_price_range(record.get("price_range", 2)),
            "image_url": image_url,
            "address": (record.get("address") or "").strip(),
            "hours": hours,
            "is_open": is_open,
            "veg_only": bool(record.get("veg_only", False)),
            "description": (record.get("description") or "").strip(),
            "opening_hours": hours,
            "phone": (record.get("phone") or "").strip(),
            "website": (record.get("website") or "").strip(),
            "photo_url": image_url,
            "city": (record.get("city") or "Mumbai").strip() or "Mumbai",
            "is_active": is_open,
            "latitude": latitude,
            "longitude": longitude,
            "data_source": "real",
        }

    def _resolve_real_osm_id(self, source_osm_id, index):
        base = source_osm_id.strip() or f"osm_real_generated_{index}"

        if Restaurant.objects.filter(data_source="real", osm_id=base).exists():
            return base

        if not Restaurant.objects.filter(osm_id=base).exclude(data_source="real").exists():
            return base

        suffix = 1
        while True:
            candidate = f"{base}_real_{suffix}"
            if Restaurant.objects.filter(data_source="real", osm_id=candidate).exists():
                return candidate
            if not Restaurant.objects.filter(osm_id=candidate).exists():
                return candidate
            suffix += 1

    def _build_unique_fake_osm_id(self, name, index):
        slug = slugify(name) or "restaurant"
        base = f"seed_{slug}_{index}"
        candidate = base
        suffix = 1

        while Restaurant.objects.filter(osm_id=candidate).exists():
            candidate = f"{base}_{suffix}"
            suffix += 1

        return candidate

    def _normalize_area(self, value):
        area = (value or "").strip()
        if area in dict(Restaurant.AREA_CHOICES):
            return area

        normalized = area.lower()
        for area_name, keywords in self.AREA_KEYWORDS.items():
            if any(keyword in normalized for keyword in keywords):
                return area_name

        return "Bandra"

    def _normalize_cuisine(self, value):
        cuisine = (value or "").strip()
        if cuisine in dict(Restaurant.CUISINE_CHOICES):
            return cuisine

        normalized = cuisine.lower()
        for cuisine_name, keywords in self.CUISINE_KEYWORDS.items():
            if any(keyword in normalized for keyword in keywords):
                return cuisine_name

        return "Indian"

    def _to_rating(self, value):
        try:
            parsed = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            parsed = Decimal("4.1")

        bounded = min(Decimal("5.0"), max(Decimal("1.0"), parsed))
        return bounded.quantize(Decimal("0.01"))

    def _to_price_range(self, value):
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            parsed = 2

        return max(1, min(4, parsed))

    def _to_decimal(self, value, fallback):
        try:
            parsed = Decimal(str(value))
            return parsed.quantize(Decimal("0.000001"))
        except (InvalidOperation, TypeError, ValueError):
            return fallback
