import os
import random
import time
from collections import defaultdict

import requests
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db.models import Q

from restaurants.models import Restaurant


class Command(BaseCommand):
    help = "Assign Unsplash food photos to restaurants by cuisine."

    unsplash_search_url = "https://api.unsplash.com/search/photos"
    fallback_queries = {
        "": "street food india",
        "indian": "indian food restaurant",
        "chinese": "chinese food restaurant",
        "pizza": "pizza restaurant",
        "burger": "burger restaurant",
        "cafe": "cafe coffee india",
        "fast_food": "fast food restaurant india",
        "seafood": "seafood restaurant india",
    }

    def handle(self, *args, **options):
        access_key = getattr(settings, "UNSPLASH_ACCESS_KEY", None) or os.environ.get(
            "UNSPLASH_ACCESS_KEY"
        )
        if not access_key:
            self.stderr.write(self.style.ERROR("UNSPLASH_ACCESS_KEY is not configured."))
            return

        distinct_cuisine_values = Restaurant.objects.values_list(
            "cuisine", flat=True
        ).distinct()
        unique_cuisines = self._get_unique_primary_cuisines(distinct_cuisine_values)

        cuisine_photo_map = {}
        for cuisine in unique_cuisines:
            photo_url = self._get_photo_for_cuisine(cuisine, access_key)
            if photo_url:
                cuisine_photo_map[cuisine] = photo_url

        restaurants_without_photos = Restaurant.objects.filter(
            Q(photo_url__isnull=True) | Q(photo_url="")
        ).values_list("id", "cuisine")

        cuisine_restaurant_ids = defaultdict(list)
        for restaurant_id, cuisine_value in restaurants_without_photos.iterator():
            primary_cuisine = self._normalize_cuisine(cuisine_value)
            cuisine_restaurant_ids[primary_cuisine].append(restaurant_id)

        assigned_count = 0
        assigned_cuisine_count = 0
        for cuisine, restaurant_ids in cuisine_restaurant_ids.items():
            photo_url = cuisine_photo_map.get(cuisine) or cuisine_photo_map.get("")
            if not photo_url:
                continue

            updated = Restaurant.objects.filter(
                Q(photo_url__isnull=True) | Q(photo_url=""),
                id__in=restaurant_ids,
            ).update(photo_url=photo_url)

            if updated:
                assigned_count += updated
                assigned_cuisine_count += 1

        self.stdout.write(
            f"Assigned photos to {assigned_count} restaurants across {assigned_cuisine_count} cuisine types"
        )

    def _get_unique_primary_cuisines(self, cuisine_values):
        unique = set()
        for cuisine_value in cuisine_values:
            unique.add(self._normalize_cuisine(cuisine_value))
        return sorted(unique)

    def _normalize_cuisine(self, cuisine_value):
        if not cuisine_value:
            return ""
        return str(cuisine_value).split(";")[0].strip().lower()

    def _get_photo_for_cuisine(self, cuisine, access_key):
        query = f"{cuisine} food restaurant india".strip()
        photo_url = self._search_unsplash(query, access_key)
        if photo_url:
            return photo_url

        fallback_query = self.fallback_queries.get(
            cuisine, self.fallback_queries.get("", "street food india")
        )
        if fallback_query and fallback_query != query:
            return self._search_unsplash(fallback_query, access_key)

        return None

    def _search_unsplash(self, query, access_key):
        try:
            response = requests.get(
                self.unsplash_search_url,
                params={
                    "query": query,
                    "per_page": 8,
                    "orientation": "landscape",
                },
                headers={"Authorization": f"Client-ID {access_key}"},
                timeout=30,
            )
            response.raise_for_status()
            payload = response.json()
            results = payload.get("results", [])
            if not results:
                return None

            chosen = random.choice(results)
            return (chosen.get("urls") or {}).get("regular")
        except requests.RequestException as exc:
            self.stderr.write(
                self.style.WARNING(
                    f"Unsplash request failed for query '{query}': {exc}"
                )
            )
            return None
        except ValueError as exc:
            self.stderr.write(
                self.style.WARNING(
                    f"Unsplash response parsing failed for query '{query}': {exc}"
                )
            )
            return None
        finally:
            time.sleep(1.5)