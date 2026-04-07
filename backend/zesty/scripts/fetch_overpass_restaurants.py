import json
import urllib.parse
import urllib.request


OVERPASS_ENDPOINTS = [
    "https://overpass-api.de/api/interpreter",
    "https://lz4.overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
]


def _extract_coordinates(element):
    if "lat" in element and "lon" in element:
        return element["lat"], element["lon"]

    center = element.get("center") or {}
    if "lat" in center and "lon" in center:
        return center["lat"], center["lon"]

    return None, None


def _build_address(tags):
    parts = [
        tags.get("addr:housenumber", "").strip(),
        tags.get("addr:street", "").strip(),
        tags.get("addr:suburb", "").strip(),
        tags.get("addr:city", "Mumbai").strip(),
    ]
    return ", ".join(part for part in parts if part)


def fetch_overpass_restaurants(limit=80, timeout=45):
    query = """
    [out:json][timeout:25];
    (
      node["amenity"="restaurant"](around:16000,19.0760,72.8777);
      way["amenity"="restaurant"](around:16000,19.0760,72.8777);
      relation["amenity"="restaurant"](around:16000,19.0760,72.8777);
    );
    out center tags;
    """

    elements = []
    payload = urllib.parse.urlencode({"data": query}).encode("utf-8")
    for endpoint in OVERPASS_ENDPOINTS:
        request = urllib.request.Request(
            endpoint,
            data=payload,
            headers={"Content-Type": "application/x-www-form-urlencoded; charset=utf-8"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=timeout) as response:
                raw = response.read().decode("utf-8")
                parsed = json.loads(raw)
                elements = parsed.get("elements") or []
            if elements:
                break
        except Exception:
            continue

    if not elements:
        return []

    elements = elements[: int(limit)]

    restaurants = []
    for element in elements:
        tags = element.get("tags") or {}
        name = (tags.get("name") or "").strip()
        if not name:
            continue

        lat, lon = _extract_coordinates(element)
        if lat is None or lon is None:
            continue

        osm_id = f"osm_{element.get('type', 'node')}_{element.get('id', '0')}"

        restaurants.append(
            {
                "osm_id": osm_id,
                "name": name,
                "area": tags.get("addr:suburb", ""),
                "cuisine": tags.get("cuisine", ""),
                "rating": tags.get("stars") or tags.get("rating") or 4.1,
                "price_range": tags.get("price_range") or 2,
                "address": _build_address(tags),
                "hours": tags.get("opening_hours", ""),
                "is_open": True,
                "veg_only": tags.get("diet:vegetarian", "").lower() in {"yes", "only"},
                "description": tags.get("description", ""),
                "image_url": "",
                "latitude": lat,
                "longitude": lon,
                "phone": tags.get("phone", ""),
                "website": tags.get("website", ""),
                "city": tags.get("addr:city", "Mumbai") or "Mumbai",
            }
        )

    return restaurants
