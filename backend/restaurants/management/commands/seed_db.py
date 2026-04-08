import random
import re
from decimal import Decimal, InvalidOperation

from django.db import OperationalError, close_old_connections
from django.core.management.base import BaseCommand, CommandError
from django.utils.text import slugify

from restaurants.models import Restaurant
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

    FILTER_TAG_KEYWORDS = {
        "dessert": ("dessert", "pastry", "cake", "waffle", "ice cream", "kulfi", "brownie"),
        "sweet": ("sweet", "mithai", "jalebi", "laddu", "halwa", "kheer", "rasmalai"),
        "north": ("north", "punjabi", "tandoor", "kebab", "mughlai"),
        "fast": ("fast", "burger", "fries", "pizza", "sandwich", "chaat", "wrap"),
        "biryani": ("biryani", "pulao", "dum"),
    }

    DEFAULT_IMAGE_URL = "https://images.pexels.com/photos/262978/pexels-photo-262978.jpeg"

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
        self.seed_token = random.randint(1, 10_000_000)

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
        self.stdout.write(self.style.SUCCESS(f"  Updated: {fake_stats['updated']}"))
        self.stdout.write(f"  Duplicate names skipped: {fake_stats['duplicates']}")
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
        stats = {"created": 0, "updated": 0, "duplicates": 0, "errors": 0}
        seen_names = set()

        for index, record in enumerate(records):
            name = (record.get("name") or "").strip()
            if not name:
                stats["errors"] += 1
                self.stderr.write(self.style.ERROR("Skipped fake entry with missing name."))
                continue

            canonical_name = self._canonical_name(name)
            if canonical_name in seen_names:
                stats["duplicates"] += 1
                continue

            seen_names.add(canonical_name)

            try:
                create_fields = self._build_fake_create_fields(record, index)

                def upsert_fake_record():
                    existing_fake = Restaurant.objects.filter(
                        data_source="fake",
                        name__iexact=name,
                    ).first()

                    if existing_fake:
                        changed_fields = []
                        for field_name, value in create_fields.items():
                            if field_name == "osm_id":
                                continue

                            if getattr(existing_fake, field_name) != value:
                                setattr(existing_fake, field_name, value)
                                changed_fields.append(field_name)

                        if changed_fields:
                            existing_fake.save(update_fields=changed_fields)
                            return "updated"

                        return "duplicate"

                    if Restaurant.objects.exclude(data_source="fake").filter(name__iexact=name).exists():
                        return "duplicate"

                    Restaurant.objects.create(**create_fields)
                    return "created"

                outcome = self._execute_with_retry(upsert_fake_record)
                if outcome == "created":
                    stats["created"] += 1
                elif outcome == "updated":
                    stats["updated"] += 1
                else:
                    stats["duplicates"] += 1
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
        rng = self._build_rng(record, index)
        area = self._normalize_area(record.get("area", "Bandra"))
        latitude, longitude = self.AREA_COORDINATES.get(area, self.AREA_COORDINATES["Bandra"])
        cuisine = self._normalize_cuisine(record.get("cuisine", "Indian"))
        cuisine_types = self._build_cuisine_types(record, cuisine, rng)
        price_range_value = self._resolve_price_range_value(record)
        hours = (record.get("hours") or "").strip()
        image_url = (record.get("image_url") or "").strip()
        if not image_url:
            image_url = (record.get("photo_url") or "").strip()
        if not image_url:
            image_url = self.DEFAULT_IMAGE_URL

        is_open = bool(record.get("is_open", True))
        veg_only = self._resolve_veg_only(record, cuisine, cuisine_types, rng, prefer_record=True)

        return {
            "osm_id": self._build_unique_fake_osm_id(record.get("name", "restaurant"), index),
            "name": record.get("name", "Restaurant"),
            "area": area,
            "cuisine": cuisine,
            "cuisine_types": cuisine_types,
            "rating": self._to_randomized_rating(record.get("rating", 4.1), rng),
            "price_range": self._to_price_range(price_range_value),
            "image_url": image_url,
            "address": (record.get("address") or "").strip(),
            "hours": hours,
            "is_open": is_open,
            "veg_only": veg_only,
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
        rng = self._build_rng(record, index)
        area = self._normalize_area(record.get("area", ""))
        fallback_lat, fallback_lon = self.AREA_COORDINATES.get(area, self.AREA_COORDINATES["Bandra"])
        latitude = self._to_decimal(record.get("latitude"), fallback_lat)
        longitude = self._to_decimal(record.get("longitude"), fallback_lon)

        cuisine = self._normalize_cuisine(record.get("cuisine", "Indian"))
        cuisine_types = self._build_cuisine_types(record, cuisine, rng)
        price_range_value = self._resolve_price_range_value(record)
        hours = (record.get("hours") or "").strip()
        image_url = (record.get("image_url") or "").strip()
        if not image_url:
            image_url = (record.get("photo_url") or "").strip()
        if not image_url:
            image_url = self.DEFAULT_IMAGE_URL

        is_open = bool(record.get("is_open", True))
        veg_only = self._resolve_veg_only(record, cuisine, cuisine_types, rng, prefer_record=False)

        return {
            "name": (record.get("name") or "").strip() or "Restaurant",
            "area": area,
            "cuisine": cuisine,
            "cuisine_types": cuisine_types,
            "rating": self._to_randomized_rating(record.get("rating", 4.1), rng),
            "price_range": self._to_price_range(price_range_value),
            "image_url": image_url,
            "address": (record.get("address") or "").strip(),
            "hours": hours,
            "is_open": is_open,
            "veg_only": veg_only,
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

    def _canonical_name(self, value):
        return re.sub(r"\s+", " ", (value or "").strip().lower())

    def _execute_with_retry(self, operation, attempts=3):
        last_error = None
        for _ in range(attempts):
            try:
                return operation()
            except OperationalError as exc:
                last_error = exc
                close_old_connections()

        if last_error is not None:
            raise last_error

        return operation()

    def _resolve_price_range_value(self, record):
        explicit_range = record.get("price_range")
        if explicit_range not in (None, ""):
            return explicit_range
        return self._price_range_from_cost_for_two(record.get("cost_for_two"))

    def _price_range_from_cost_for_two(self, value):
        try:
            amount = int(value)
        except (TypeError, ValueError):
            return 2

        if amount <= 180:
            return 1
        if amount <= 320:
            return 2
        if amount <= 450:
            return 3
        return 4

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

    def _build_rng(self, record, index):
        name = (record.get("name") or "restaurant").strip().lower()
        seed_token = getattr(self, "seed_token", 0)
        return random.Random(f"{seed_token}:{index}:{name}")

    def _build_cuisine_types(self, record, cuisine, rng):
        text_blob = " ".join(
            [
                str(record.get("name") or ""),
                str(record.get("description") or ""),
                str(record.get("cuisine") or ""),
                str(record.get("primary_cuisine") or ""),
                str(record.get("cuisines") or ""),
                str(record.get("cuisine_types") or ""),
                str(cuisine or ""),
            ]
        ).lower()

        tags = set(self._extract_explicit_cuisine_tags(record))
        for tag, keywords in self.FILTER_TAG_KEYWORDS.items():
            if any(keyword in text_blob for keyword in keywords):
                tags.add(tag)

        cuisine_tag_aliases = {
            "North Indian": "north indian",
            "South Indian": "south indian",
            "Fast Food": "fast food",
            "Street Food": "street food",
            "Seafood": "seafood",
            "Mughlai": "mughlai",
            "Chinese": "chinese",
            "Italian": "italian",
            "Continental": "continental",
            "Indian": "indian",
        }
        normalized_primary = self._normalize_filter_tag(cuisine_tag_aliases.get(cuisine, cuisine))
        if normalized_primary:
            tags.add(normalized_primary)

        if cuisine == "North Indian":
            tags.add("north")
            if rng.random() < 0.55:
                tags.add("biryani")
        elif cuisine == "Mughlai":
            tags.add("north")
            if rng.random() < 0.65:
                tags.add("biryani")
        elif cuisine == "Fast Food":
            tags.add("fast")
        elif cuisine == "Street Food":
            tags.add("fast")
            if rng.random() < 0.35:
                tags.add("sweet")
        elif cuisine == "Indian" and rng.random() < 0.50:
            tags.add("north")

        if "dessert" not in tags and rng.random() < 0.24:
            tags.add("dessert")
        if "sweet" not in tags and ("dessert" in tags or rng.random() < 0.22):
            tags.add("sweet")
        if "biryani" not in tags and cuisine in {"North Indian", "Mughlai", "Indian"} and rng.random() < 0.22:
            tags.add("biryani")

        if not tags:
            tags.add(self._normalize_filter_tag(cuisine.split()[0]))

        return ";".join(sorted(tag for tag in tags if tag))

    def _extract_explicit_cuisine_tags(self, record):
        raw_tags = []
        for key in ("primary_cuisine", "cuisine", "cuisine_types", "cuisines"):
            raw_tags.extend(self._split_raw_tags(record.get(key)))

        normalized_tags = set()
        for raw_tag in raw_tags:
            normalized = self._normalize_filter_tag(raw_tag)
            if normalized:
                normalized_tags.add(normalized)

        return normalized_tags

    def _split_raw_tags(self, value):
        if value is None:
            return []

        if isinstance(value, (list, tuple, set)):
            items = []
            for entry in value:
                items.extend(self._split_raw_tags(entry))
            return items

        text = str(value).replace("|", ";").replace(",", ";").replace("/", ";")
        return [part.strip() for part in text.split(";") if part.strip()]

    def _normalize_filter_tag(self, value):
        normalized = str(value or "").strip().lower()
        normalized = normalized.replace("_", " ").replace("-", " ")
        normalized = re.sub(r"\s+", " ", normalized).strip()
        aliases = {
            "deserts": "dessert",
            "desserts": "dessert",
            "icecream": "ice cream",
            "friedrice": "fried rice",
            "vadapav": "vada pav",
        }
        return aliases.get(normalized, normalized)

    def _resolve_veg_only(self, record, cuisine, cuisine_types, rng, prefer_record=False):
        explicit_value = record.get("veg_only")
        if explicit_value is None:
            explicit_value = record.get("pure_veg")

        normalized_explicit = self._to_optional_bool(explicit_value)
        if normalized_explicit is not None:
            return normalized_explicit

        tags = {tag for tag in (cuisine_types or "").split(";") if tag}

        if "dessert" in tags or "sweet" in tags:
            return rng.random() < 0.68
        if cuisine in {"South Indian", "Street Food"}:
            return rng.random() < 0.62
        if cuisine in {"Mughlai", "Seafood"}:
            return rng.random() < 0.08
        if cuisine == "North Indian":
            return rng.random() < 0.30
        if cuisine == "Fast Food":
            return rng.random() < 0.35

        return rng.random() < 0.40

    def _to_optional_bool(self, value):
        if isinstance(value, bool):
            return value

        if isinstance(value, (int, float)) and value in {0, 1}:
            return bool(value)

        if isinstance(value, str):
            normalized = value.strip().lower()
            if normalized in {"true", "1", "yes", "y"}:
                return True
            if normalized in {"false", "0", "no", "n"}:
                return False

        return None

    def _to_rating(self, value):
        if isinstance(value, str):
            matched_number = re.search(r"\d+(\.\d+)?", value)
            if matched_number:
                value = matched_number.group(0)

        try:
            parsed = Decimal(str(value))
        except (InvalidOperation, TypeError, ValueError):
            parsed = Decimal("4.1")

        bounded = min(Decimal("5.0"), max(Decimal("1.0"), parsed))
        return bounded.quantize(Decimal("0.01"))

    def _to_randomized_rating(self, value, rng):
        base_rating = self._to_rating(value)
        jitter = Decimal(str(rng.uniform(-0.55, 0.55)))
        randomized_rating = base_rating + jitter
        bounded_rating = min(Decimal("4.95"), max(Decimal("3.10"), randomized_rating))
        return bounded_rating.quantize(Decimal("0.01"))

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
