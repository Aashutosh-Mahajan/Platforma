from __future__ import annotations

from copy import deepcopy
from typing import Any

from django.db import connection
from django.db.utils import OperationalError, ProgrammingError

from zesty.models import Order, Restaurant


def _build_hero_frames() -> list[str]:
    return [
        f"/hero/Slice_of_pizza_202604051228_{frame_number:03d}.jpg"
        for frame_number in range(11, 54)
    ]


BASE_LANDING_PAGE_CONTENT: dict[str, Any] = {
    "header": {
        "title": "Zesty",
        "navLinks": [
            {"label": "Add restaurant", "href": "#collections"},
            {"label": "Log in", "href": "#download"},
            {"label": "Sign up", "href": "#download"},
        ],
    },
    "hero": {
        "title": "Zesty",
        "subtitle": "India's #1\nfood delivery app",
        "description": "Experience fast & easy online ordering\non the Zesty app",
        "frames": _build_hero_frames(),
    },
    "stats": {
        "title": "Better food for\nmore people",
        "description": (
            "For over a decade, we've enabled our customers to discover new tastes, "
            "delivered right to their doorstep"
        ),
        "images": {
            "burger": (
                "https://lh3.googleusercontent.com/aida-public/"
                "AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36"
                "NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu"
                "0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp"
                "3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0"
                "SLTnlHXphnHOfHA"
            ),
            "sushi": (
                "https://lh3.googleusercontent.com/aida-public/"
                "AB6AXuAOzmnpeUgKXh1rHSiAoc1lGmIANdTAGuuUvm4DvpoA9i_9jwuFalX2FwLF"
                "Nc2561SXB3XIPVAqvbYQQGsosBWdxDOTs0juvSAsxV7Rxtd3OD-_Te1-vmYGU5uz"
                "x7HH0bnjGS3TAL7uaXyiiJKaVK9MhuAxsa47eSCK86B00PjdqfNVRU_1EVp0NmR0"
                "49KHK7Q6k6PM2kIT19T-J-Lxa7s1G1IUJyWCG3HCq7XR_dfSBCxl6N4A60wI_ROz"
                "dK4NsL23VlIsq97Bjg"
            ),
        },
        "metrics": [
            {"value": "3,00,000+", "label": "restaurants", "icon": "storefront"},
            {"value": "800+", "label": "cities", "icon": "location_on"},
            {"value": "3 billion+", "label": "orders delivered", "icon": "shopping_bag"},
        ],
    },
    "categories": [
        {
            "title": "Order Online",
            "description": "Stay home and order to your doorstep",
            "image": (
                "https://lh3.googleusercontent.com/aida-public/"
                "AB6AXuA6QtA4EE05XvCQSJo3vUy3JmlextZMRID77kFFM67y_dZvi3tljFU1uiv36"
                "NMOohVswrm1Hfsk6cT7ZRq7tlBOZqnTh96V4Okj0URNu-LPknIT04qC3E_Rru5Fu"
                "0c7Z-AGSJLyuIBjOgq3MOoPGImBU5zJW3SHIkUSMq5omJq34laTQCPuNQiYCaHfUp"
                "3MaJ7P6qSQiSsGjQwWBP2TomshpjJJaYYImDdIRPCt0F7_GlndQRRjugVoyNu81I0"
                "SLTnlHXphnHOfHA"
            ),
        },
        {
            "title": "Dining",
            "description": "View the city's favourite dining venues",
            "image": (
                "https://lh3.googleusercontent.com/aida-public/"
                "AB6AXuDHqrFRhipIgypWnjmP-ZGj6DWJ1lQqc6XupdJ2XXYj67SzbApqvcmY_8uW"
                "dfES2AZJzToVBVKQTRmd1FVOiEgZzQRPT080zVCHZ-hjBddLvfdDQtoOkEmlfjmL"
                "eVM5Og1c4aMazT1mbrxFeXjobJlUeiAtF_ZCUi5VJWJFJmg8UkbtHa1l-Xih4ECw"
                "tT9X5tZECORdD83PvK0BUX11MXvJvS0FY56ejx2XlFCWDN6kBBoGPcHgB_9hcA3Xb"
                "8uBZT7vU_jrSsRimg"
            ),
        },
        {
            "title": "Nightlife",
            "description": "Explore the city's top nightlife spots",
            "image": (
                "https://lh3.googleusercontent.com/aida-public/"
                "AB6AXuCA4qJ9U5ojPE1ytAauzTDmsgWLTscvyabqEpOYEmTD_B88ZUwQ3WbwW5k"
                "-I72-8AwV1EOhODT60Iekcuq5UnbDdyVY121-KrBaUR8FxUX-ZKeBqNnnKTGVH0f"
                "yxE-x-03f8C4pv1fZfnwVozH50UOLiKzXGJQXLltcDmzZSgXUzWvsYF2M1sgZuZV"
                "HIZTENl07yT7jF8UioSQhc7zFUjIhph1QBC59i2sZvHC__WlQb5_CqmuqYqgywpO"
                "A3NrxO3I-ZhCcxPBuYQ"
            ),
        },
    ],
    "collections": {
        "title": "Collections",
        "description": (
            "Explore curated lists of top restaurants, cafes, pubs, and bars in "
            "Mumbai, based on trends"
        ),
        "items": [
            {
                "title": "Newly Opened",
                "places": "18 Places",
                "image": (
                    "https://lh3.googleusercontent.com/aida-public/"
                    "AB6AXuAOzmnpeUgKXh1rHSiAoc1lGmIANdTAGuuUvm4DvpoA9i_9jwuFalX2FwL"
                    "FNc2561SXB3XIPVAqvbYQQGsosBWdxDOTs0juvSAsxV7Rxtd3OD-_Te1-vmYGU5"
                    "uzx7HH0bnjGS3TAL7uaXyiiJKaVK9MhuAxsa47eSCK86B00PjdqfNVRU_1EVp0N"
                    "mR049KHK7Q6k6PM2kIT19T-J-Lxa7s1G1IUJyWCG3HCq7XR_dfSBCxl6N4A60wI"
                    "_ROzdK4NsL23VlIsq97Bjg"
                ),
            },
            {
                "title": "Trending this week",
                "places": "30 Places",
                "image": (
                    "https://lh3.googleusercontent.com/aida-public/"
                    "AB6AXuAQVPgiJWYOD1aEBZlCclBtwiXVLECDppuWKTjXPTftaVGMzPR7-HuHia"
                    "3aY3C5pjgXrgza0lzqsVKduC6b2VuGdzHgQNirB4vLwOLWoc-IwBoEgEyfIJstL"
                    "j3Csuu6zn4uxTH6oLuGrztaio0JPyotwqza9s5xi1a7FhqgF8z01gTPqpg--nyw"
                    "5CZUE3uPVhqSxXsfCu06Ln10Kh7OH5ZcQWej3CsSwCkYgkjs4sJqhf43yzCkS2T"
                    "ZHNritQbtAlTCmPw0Tt0b_A"
                ),
            },
            {
                "title": "Best of Mumbai",
                "places": "25 Places",
                "image": (
                    "https://lh3.googleusercontent.com/aida-public/"
                    "AB6AXuBXcCXKS7Wdupu4oLbZpby5ltmtHN5R1ikv7h-9_9L7-LfGGUAaydhqOLI"
                    "vaHPStUL-06yp6XfhSSCTd2TktfihgJp6HrBR92NDK_xuyVc9HuL5FaFCyRR-u1"
                    "wm_jgVUAq9tB3OEUR14FvUoqLljGNlSNlySziI_gUv6ZDos4L0DLtmgTRqL7Q1A"
                    "jL8xeBqqVC-h42H6GLu_csKXWopEAunHN4CQPV9oARDP2cnn0Ve5KRU1hjyddqg"
                    "rkdL6QlqDtN6FWgqXTsa7g"
                ),
            },
            {
                "title": "Rooftop Views",
                "places": "12 Places",
                "image": (
                    "https://lh3.googleusercontent.com/aida-public/"
                    "AB6AXuBHlzdFh0RILGAgH_gOIwmIF5Vz4gbbRCR3skrZldXsDOGpUoHd9XfJWG7"
                    "HMyH9_kbHRK8I2bzWf5BcRYFbsOIzWG-bR3a2IaJqp3q-6QFtfgyh3AaEHs8wEi"
                    "meQW0gmAsNln0Yj6YkGRsPO9CHIXdd2Xoz5E-Drkf-9dvCT4RbuH8b6HsyGPXez"
                    "DEJ-ig7sI4f58m9xfWkWtQlSWkmGVULLqR2azzcNILs5Z_TjxfsLtMS0f9tnKFu"
                    "Y-YMbmbghK2_3jStIlkxbg"
                ),
            },
        ],
    },
    "experience": {
        "eyebrow": "The Zesty Experience",
        "title": "What's waiting for you on the app?",
        "description": (
            "Discover personalized recommendations, live order tracking, and "
            "exclusive discounts from over 50,000 restaurants across India."
        ),
        "features": [
            {
                "title": "Lightning Fast Delivery",
                "description": (
                    "Get your food delivered in under 30 minutes, every single time."
                ),
                "icon": "speed",
            },
            {
                "title": "Exclusive Zesty Pro Deals",
                "description": (
                    "Save up to 40% on every order with our premium membership."
                ),
                "icon": "loyalty",
            },
        ],
        "image": (
            "https://lh3.googleusercontent.com/aida-public/"
            "AB6AXuCcwUWT5s-Eg59xM8lRUKXzZKEJ_XDFP1mj-NlbHvU2OeNv8xxzV_G9U8ye"
            "U5QDuRYHpl9dlHv9zj-WS45pmm8Sd_VGgwtJfR7YQOwg4_UX_0HhQUSScfsg8Nej"
            "wFl8JU086o1yJ2iSML6D5NlfGvSuqRbP5w7kJTFECZqy7jlWNtV5JWU6KdXvPWHs"
            "kLD7XN3EssGALkEVz67X6CzF6z8yy-dy3bVb9v2eOBUuEKF8ddaxSd5RDtv_HiiA"
            "7Ep11nY4EEgWEQnt4w"
        ),
    },
    "download": {
        "title": "Get the Zesty app",
        "description": (
            "We will send you a link, open it on your phone to download the app"
        ),
        "appStoreImage": (
            "https://lh3.googleusercontent.com/aida-public/"
            "AB6AXuAHfxAmLNX8Yjln6BdyEAPfLIkOpU9nQwNqoT1WvxSteW_6vRCMEKTEIr6N"
            "E09ePm7A8EImAOD2t5OYJTm9VWdb_QZGRvsLvJviSWkZN5MIY1e5gRvKcNXHgGu"
            "-ioeHpS2TqgHnwSzquISSXZTb4gsAydC53IfwNLl3NU_r_PPAZ8JRTfHStGH9Tzk"
            "ClUwGJmNj5s9eFX3tfAyeD1-tAYAn0o0_X1oOCZ-eNL6ppXJNRy46_QEuSOLowOx"
            "rj2dLF-GzVK5GWXaxAg"
        ),
        "playStoreImage": (
            "https://lh3.googleusercontent.com/aida-public/"
            "AB6AXuBTdQx1rVnpUoSovCp3oHbXl2RuNA0KBAQl7Xg_h32baQK2GQ-H-GWlIZsV"
            "aYF9jMPpm7K5Ev9tK53s8v1BYBG2uJRE6TOUO4e4e73atq_zcO87WiW3ApS6CG3U"
            "E-A9hBYRCDienVXwLAW4DWh3vM3zIENL4co2FoqpwpkClRpNfQY9lDhWyKJz7kWR"
            "UdLenO2erfoSO3gm3YFgCrin2i9_Z68sZGtfHNNpO8a8s5XolmBKU3BX1lteoDp9"
            "hM0JmMRnhc6DnmF5jQ"
        ),
        "qrCodeImage": "https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=https://zesty.com/download",
    },
    "footer": {
        "title": "Zesty",
        "tagline": "Experience the art of food delivery.",
        "copyright": "(c) 2024 Zesty Technologies Ltd. All rights reserved.",
        "links": {
            "Company": ["About Zesty", "Partner With Us", "Apps For You"],
            "Legal": ["Privacy Policy", "Terms of Service"],
            "Contact": ["support@zesty.com", "1800-ZESTY-APP"],
        },
    },
}


def _table_exists(model: type[Restaurant] | type[Order]) -> bool:
    try:
        return model._meta.db_table in connection.introspection.table_names()
    except (OperationalError, ProgrammingError):
        return False


def _build_media_url(request: Any, field: Any) -> str | None:
    if not field:
        return None

    image_url = getattr(field, "url", None)
    if not image_url:
        return None

    return request.build_absolute_uri(image_url)


def _format_count(value: int) -> str:
    return f"{value:,}+"


def build_landing_page_content(request: Any) -> dict[str, Any]:
    content = deepcopy(BASE_LANDING_PAGE_CONTENT)

    if not _table_exists(Restaurant):
        return content

    restaurants_qs = Restaurant.objects.filter(is_active=True).order_by("-rating", "-review_count")
    top_restaurants = list(restaurants_qs[:4])

    if not top_restaurants:
        return content

    fallback_collection_items = content["collections"]["items"]
    featured_restaurants: list[dict[str, str]] = []

    for index, restaurant in enumerate(top_restaurants):
        fallback_item = fallback_collection_items[index % len(fallback_collection_items)]
        image_url = (
            _build_media_url(request, restaurant.banner)
            or _build_media_url(request, restaurant.image)
            or fallback_item["image"]
        )
        featured_restaurants.append(
            {
                "title": restaurant.name,
                "places": f"{restaurant.review_count} reviews",
                "image": image_url,
            }
        )

    content["collections"]["items"] = featured_restaurants
    content["collections"]["description"] = "Top-rated places from the live Zesty backend."

    fallback_categories = content["categories"]
    cuisine_cards: list[dict[str, str]] = []
    seen_cuisines: set[str] = set()

    for restaurant in top_restaurants:
        cuisines = [item.strip() for item in restaurant.cuisine_types.split(",") if item.strip()]
        if not cuisines:
            continue

        primary_cuisine = next(
            (cuisine for cuisine in cuisines if cuisine.lower() not in seen_cuisines),
            cuisines[0],
        )
        cuisine_key = primary_cuisine.lower()
        if cuisine_key in seen_cuisines:
            continue

        seen_cuisines.add(cuisine_key)
        image_url = (
            _build_media_url(request, restaurant.image)
            or _build_media_url(request, restaurant.banner)
            or fallback_categories[len(cuisine_cards) % len(fallback_categories)]["image"]
        )
        cuisine_cards.append(
            {
                "title": primary_cuisine,
                "description": f"Customer favourites from {restaurant.name}",
                "image": image_url,
            }
        )

        if len(cuisine_cards) == len(fallback_categories):
            break

    if cuisine_cards:
        while len(cuisine_cards) < len(fallback_categories):
            cuisine_cards.append(fallback_categories[len(cuisine_cards)])
        content["categories"] = cuisine_cards

    content["stats"]["metrics"][0]["value"] = _format_count(restaurants_qs.count())

    unique_cities = {
        address.split(",")[-1].strip()
        for address in restaurants_qs.values_list("address", flat=True)
        if address and address.strip()
    }
    if unique_cities:
        content["stats"]["metrics"][1]["value"] = _format_count(len(unique_cities))

    if _table_exists(Order):
        order_count = Order.objects.count()
        if order_count:
            content["stats"]["metrics"][2]["value"] = _format_count(order_count)

    return content
