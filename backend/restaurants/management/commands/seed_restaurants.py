import time
from decimal import Decimal, InvalidOperation

import requests
from django.core.management.base import BaseCommand

from restaurants.models import Restaurant


class Command(BaseCommand):
    help = "Seed Mumbai restaurants from the Overpass API."

    overpass_url = "https://overpass-api.de/api/interpreter"
    areas = [
        {"name": "Bandra", "bbox": "19.0200,72.8000,19.0800,72.8600"},
        {"name": "Andheri", "bbox": "19.0900,72.8200,19.1500,72.8800"},
        {"name": "Juhu", "bbox": "19.0800,72.8100,19.1200,72.8400"},
        {"name": "Powai", "bbox": "19.1000,72.8900,19.1400,72.9300"},
        {"name": "Lower Parel", "bbox": "18.9800,72.8100,19.0200,72.8500"},
        {"name": "Colaba", "bbox": "18.8900,72.8000,18.9300,72.8400"},
        {"name": "Dadar", "bbox": "19.0000,72.8300,19.0500,72.8600"},
    ]

    def handle(self, *args, **options):
        total_added = 0
        total_skipped = 0

        for index, area in enumerate(self.areas):
            area_name = area["name"]
            bbox = area["bbox"]
            self.stdout.write(f"Seeding {area_name}...")

            try:
                query = self._build_query(bbox)
                elements = self._fetch_elements_with_retry(query, area_name)

                added_count = 0
                skipped_count = 0
                for element in elements:
                    extracted = self._extract_restaurant_data(element, area_name)
                    if extracted is None:
                        continue

                    restaurant_name = extracted.get("name", "")
                    if Restaurant.objects.filter(name=restaurant_name, area=area_name).exists():
                        skipped_count += 1
                        continue

                    osm_id = extracted.pop("osm_id")
                    _, created = Restaurant.objects.get_or_create(
                        osm_id=osm_id,
                        defaults=extracted,
                    )
                    if created:
                        added_count += 1
                    else:
                        skipped_count += 1

                total_added += added_count
                total_skipped += skipped_count
                self.stdout.write(
                    f"  Added {added_count} new restaurants, skipped {skipped_count} duplicates"
                )
            except Exception as exc:
                self.stderr.write(self.style.WARNING(f"  Failed {area_name}: {exc}"))
            finally:
                if index < len(self.areas) - 1:
                    time.sleep(10)

        self.stdout.write(
            self.style.SUCCESS(
                f"Total: {total_added} restaurants added, {total_skipped} skipped across {len(self.areas)} areas"
            )
        )

    def _fetch_elements_with_retry(self, query, area_name, max_retries=3, retry_delay=5):
        for attempt in range(1, max_retries + 1):
            try:
                response = requests.post(
                    self.overpass_url,
                    data={"data": query},
                    headers={"Content-Type": "application/x-www-form-urlencoded"},
                    timeout=120,
                )
                response.raise_for_status()
                payload = response.json()
                return payload.get("elements", [])
            except Exception as exc:
                if attempt == max_retries:
                    raise

                self.stderr.write(
                    self.style.WARNING(
                        f"  Overpass request failed for {area_name} "
                        f"(attempt {attempt}/{max_retries}): {exc}. "
                        f"Retrying in {retry_delay} seconds..."
                    )
                )
                time.sleep(retry_delay)

        return []

    def _build_query(self, bbox):
        return (
            "[out:json][timeout:60];\n"
            f"nwr[amenity=restaurant]({bbox});\n"
            "out center tags;"
        )

    def _extract_restaurant_data(self, element, area_name):
        element_type = element.get("type")
        element_id = element.get("id")
        if not element_type or element_id is None:
            return None

        tags = element.get("tags", {})
        center = element.get("center", {})

        latitude = center.get("lat", element.get("lat"))
        longitude = center.get("lon", element.get("lon"))
        if latitude is None or longitude is None:
            return None

        try:
            latitude = Decimal(str(latitude))
            longitude = Decimal(str(longitude))
        except (InvalidOperation, ValueError):
            return None

        street = tags.get("addr:street", "")
        housenumber = tags.get("addr:housenumber", "")
        address = f"{housenumber} {street}".strip() or tags.get("addr:full", "")

        return {
            "osm_id": f"osm_{element['type']}_{element['id']}",
            "name": tags.get("name", "Unnamed Restaurant"),
            "cuisine": tags.get("cuisine", ""),
            "address": address,
            "latitude": latitude,
            "longitude": longitude,
            "opening_hours": tags.get("opening_hours", ""),
            "phone": tags.get("phone", tags.get("contact:phone", "")),
            "website": tags.get("website", tags.get("contact:website", "")),
            "photo_url": "",
            "area": area_name,
            "city": "Mumbai",
            "is_active": True,
        }
