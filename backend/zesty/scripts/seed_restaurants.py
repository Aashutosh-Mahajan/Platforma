import json
import random
import re
from pathlib import Path


AREA_CHOICES = (
    "Bandra",
    "Andheri",
    "Juhu",
    "Colaba",
    "Dadar",
    "Powai",
    "Worli",
    "Churchgate",
    "Thane",
    "Borivali",
)

# Keep this deterministic so repeated seeds are reproducible.
MIXED_SELECTION_SEED = 20260408
TARGET_MIXED_RATIO = 0.60

SOURCE_JSON_CANDIDATES = (
    Path(__file__).with_name("zesty_mumbai_restaurants.json"),
    Path(__file__).resolve().parents[4] / "zesty_mumbai_restaurants.json",
)

LOCATION_AREA_KEYWORDS = {
    "Bandra": ("bandra", "khar", "pali", "linking", "hill road", "turner"),
    "Andheri": ("andheri", "lokhandwala", "versova", "jogeshwari", "dn nagar"),
    "Juhu": ("juhu", "ville parle", "santacruz"),
    "Colaba": ("colaba", "fort", "cuffe parade", "nariman", "marine drive"),
    "Dadar": ("dadar", "matunga", "mahim", "sion", "prabhadevi"),
    "Powai": ("powai", "chandivali", "saki vihar", "hiranandani", "vikhroli"),
    "Worli": ("worli", "lower parel", "parel", "elphinstone"),
    "Churchgate": ("churchgate", "marine lines", "charni", "grant road"),
    "Thane": ("thane", "ghodbunder", "mira road", "kalwa", "dombivli"),
    "Borivali": ("borivali", "kandivali", "malad", "dahisar", "eksar"),
}

TAG_ALIASES = {
    "deserts": "dessert",
    "desserts": "dessert",
    "icecream": "ice cream",
    "friedrice": "fried rice",
    "vadapav": "vada pav",
}

NON_VEG_DISH_BANK = [
    {
        "name": "Chicken Tikka",
        "description": "Char-grilled chicken tikka with smoky tandoori spices",
    },
    {
        "name": "Butter Chicken",
        "description": "Tender chicken in creamy tomato-makhani gravy",
    },
    {
        "name": "Chicken Biryani",
        "description": "Layered basmati biryani cooked with saffron and spices",
    },
    {
        "name": "Mutton Rogan Josh",
        "description": "Slow-cooked Kashmiri-style mutton curry",
    },
    {
        "name": "Fish Curry",
        "description": "Coastal fish curry with kokum and coconut",
    },
    {
        "name": "Prawn Masala",
        "description": "Juicy prawns tossed in a spicy masala base",
    },
    {
        "name": "Chicken Shawarma Roll",
        "description": "Grilled chicken wrapped with fresh veggies and sauce",
    },
    {
        "name": "Chicken Fried Rice",
        "description": "Wok-tossed fried rice with chicken and spring onions",
    },
    {
        "name": "Chicken Hakka Noodles",
        "description": "Stir-fried noodles with chicken strips and vegetables",
    },
    {
        "name": "Pepper Chicken",
        "description": "Chicken tossed in cracked pepper and herbs",
    },
    {
        "name": "Chicken Kathi Roll",
        "description": "Paratha roll filled with spiced chicken and onions",
    },
    {
        "name": "Tandoori Pomfret",
        "description": "Whole pomfret marinated and roasted in tandoor",
    },
    {
        "name": "Egg Bhurji",
        "description": "Mumbai-style scrambled eggs with masala",
    },
    {
        "name": "Chicken Keema Pav",
        "description": "Spiced minced chicken served with buttery pav",
    },
    {
        "name": "Mutton Seekh Kebab",
        "description": "Juicy minced mutton kebabs grilled over open flame",
    },
]


def _normalize_spaces(value):
    return re.sub(r"\s+", " ", str(value or "")).strip()


def _normalize_name(value):
    return _normalize_spaces(value).lower()


def _normalize_tag(value):
    normalized = _normalize_spaces(value).lower().replace("_", " ").replace("-", " ")
    normalized = re.sub(r"\s+", " ", normalized).strip()
    return TAG_ALIASES.get(normalized, normalized)


def _resolve_source_json_path():
    for candidate in SOURCE_JSON_CANDIDATES:
        if candidate.exists():
            return candidate
    checked = ", ".join(str(path) for path in SOURCE_JSON_CANDIDATES)
    raise FileNotFoundError(f"Could not find source restaurant JSON. Checked: {checked}")


def _load_source_records():
    source_path = _resolve_source_json_path()
    with source_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    if not isinstance(payload, list):
        raise ValueError("Source JSON must be a list of restaurant objects.")

    return payload


def _parse_int(value, default):
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _parse_float(value, default):
    try:
        return float(value)
    except (TypeError, ValueError):
        return default


def _infer_area(location, name):
    location_text = _normalize_spaces(location).lower()
    for area_name, keywords in LOCATION_AREA_KEYWORDS.items():
        if any(keyword in location_text for keyword in keywords):
            return area_name

    # Deterministic fallback for unknown localities.
    seed_text = location_text or _normalize_spaces(name).lower()
    seed_value = sum(ord(char) for char in seed_text) if seed_text else 0
    return AREA_CHOICES[seed_value % len(AREA_CHOICES)]


def _to_price_range(cost_for_two):
    amount = _parse_int(cost_for_two, 250)
    if amount <= 180:
        return 1
    if amount <= 320:
        return 2
    if amount <= 450:
        return 3
    return 4


def _extract_cuisine_tags(record):
    tag_candidates = []

    primary = record.get("primary_cuisine")
    if primary:
        tag_candidates.append(primary)

    cuisines = record.get("cuisines")
    if isinstance(cuisines, list):
        tag_candidates.extend(cuisines)
    elif cuisines:
        tag_candidates.extend(str(cuisines).replace(";", ",").split(","))

    raw_cuisine_types = record.get("cuisine_types")
    if raw_cuisine_types:
        tag_candidates.extend(str(raw_cuisine_types).replace(";", ",").split(","))

    deduped_tags = []
    seen = set()
    for raw_tag in tag_candidates:
        normalized = _normalize_tag(raw_tag)
        if not normalized:
            continue
        if normalized in seen:
            continue
        seen.add(normalized)
        deduped_tags.append(normalized)

    if not deduped_tags:
        deduped_tags.append("indian")

    return deduped_tags


def _normalize_menu_item(item, index, rng, fallback_cost):
    if not isinstance(item, dict):
        return None

    name = _normalize_spaces(item.get("name"))
    description = _normalize_spaces(item.get("description"))
    if not name:
        return None

    raw_price = item.get("price")
    if isinstance(raw_price, str):
        raw_price = re.sub(r"[^0-9]", "", raw_price)
    parsed_price = _parse_int(raw_price, 0)
    if parsed_price <= 0:
        base_cost = max(120, _parse_int(fallback_cost, 250))
        parsed_price = max(70, int(base_cost * rng.uniform(0.28, 0.52)))

    if not description:
        description = f"Chef special item #{index + 1}"

    return {
        "name": name,
        "price": parsed_price,
        "description": description,
        "is_veg": bool(item.get("is_veg", True)),
    }


def _build_clean_menu(record, rng):
    fallback_cost = record.get("cost_for_two")
    raw_menu = record.get("menu")
    if not isinstance(raw_menu, list):
        raw_menu = []

    normalized_menu = []
    seen_items = set()

    for index, item in enumerate(raw_menu):
        cleaned = _normalize_menu_item(item, index, rng, fallback_cost)
        if cleaned is None:
            continue

        key = _normalize_name(cleaned["name"])
        if key in seen_items:
            continue

        seen_items.add(key)
        normalized_menu.append(cleaned)

    if normalized_menu:
        return normalized_menu

    # Safe fallback menu if source item list is missing.
    cuisine_hint = _normalize_spaces(record.get("primary_cuisine") or "Indian")
    return [
        {
            "name": f"{cuisine_hint} Signature Platter",
            "price": 220,
            "description": "Chef-crafted platter with house favorites",
            "is_veg": True,
        },
        {
            "name": "Classic Veg Combo",
            "price": 180,
            "description": "Balanced combo meal with main, side and bread",
            "is_veg": True,
        },
    ]


def _inject_non_veg_menu_items(menu, cost_for_two, rng):
    mixed_menu = [dict(item) for item in menu]
    existing_names = {_normalize_name(item.get("name")) for item in mixed_menu}
    add_count = rng.randint(2, 4)

    base_cost = max(180, _parse_int(cost_for_two, 300))
    for dish in rng.sample(NON_VEG_DISH_BANK, add_count):
        key = _normalize_name(dish["name"])
        if key in existing_names:
            continue

        price = int(max(120, base_cost * rng.uniform(0.35, 0.65)))
        mixed_menu.append(
            {
                "name": dish["name"],
                "price": price,
                "description": dish["description"],
                "is_veg": False,
            }
        )
        existing_names.add(key)

    return mixed_menu


def _dedupe_by_name(records):
    deduped_records = []
    seen_names = set()

    for record in records:
        if not isinstance(record, dict):
            continue

        name = _normalize_spaces(record.get("name"))
        key = _normalize_name(name)
        if not key or key in seen_names:
            continue

        seen_names.add(key)
        record["name"] = name
        deduped_records.append(record)

    return deduped_records


def _build_description(primary_cuisine, location, menu, is_mixed):
    style = "veg + non-veg" if is_mixed else "pure veg"
    return (
        f"Popular {primary_cuisine} kitchen in {location} with {style} offerings. "
        f"Known for {len(menu)} curated dishes and reliable delivery."
    )


def build_seed_restaurants():
    source_records = _dedupe_by_name(_load_source_records())
    if not source_records:
        return []

    selection_rng = random.Random(MIXED_SELECTION_SEED)
    mixed_target = int(round(len(source_records) * TARGET_MIXED_RATIO))
    mixed_indices = set(selection_rng.sample(range(len(source_records)), mixed_target))

    compiled = []
    for index, source in enumerate(source_records):
        name = _normalize_spaces(source.get("name") or f"Restaurant #{index + 1}")
        location = _normalize_spaces(source.get("location") or source.get("area") or "Mumbai")
        primary_cuisine = _normalize_spaces(source.get("primary_cuisine") or source.get("cuisine") or "Indian")
        cuisines = _extract_cuisine_tags(source)
        if _normalize_tag(primary_cuisine) not in cuisines:
            cuisines.insert(0, _normalize_tag(primary_cuisine))

        record_rng = random.Random(f"{name}:{index}:menu")
        menu = _build_clean_menu(source, record_rng)

        is_mixed = index in mixed_indices
        if is_mixed:
            menu = _inject_non_veg_menu_items(menu, source.get("cost_for_two"), record_rng)
            veg_only = False
        else:
            for menu_item in menu:
                menu_item["is_veg"] = True
            veg_only = True

        rating = _parse_float(source.get("rating"), 4.1)
        rating = max(1.0, min(5.0, round(rating, 2)))

        compiled.append(
            {
                "name": name,
                "area": _infer_area(location, name),
                "cuisine": primary_cuisine,
                "primary_cuisine": primary_cuisine,
                "cuisines": cuisines,
                "cuisine_types": ";".join(cuisines),
                "rating": rating,
                "total_ratings": _parse_int(source.get("total_ratings"), 120),
                "cost_for_two": _parse_int(source.get("cost_for_two"), 250),
                "price_range": _to_price_range(source.get("cost_for_two")),
                "address": _normalize_spaces(source.get("address") or f"{location}, Mumbai"),
                "hours": _normalize_spaces(source.get("hours") or "10:00 AM - 11:00 PM"),
                "is_open": bool(source.get("is_open", True)),
                "veg_only": veg_only,
                "pure_veg": veg_only,
                "description": _normalize_spaces(
                    source.get("description")
                    or _build_description(primary_cuisine, location, menu, is_mixed)
                ),
                "image_url": _normalize_spaces(source.get("image_url")),
                "menu": menu,
                "location": location,
                "city": _normalize_spaces(source.get("city") or "Mumbai"),
                "delivery_time": _normalize_spaces(source.get("delivery_time") or "30-40 mins"),
            }
        )

    return compiled


RESTAURANTS = build_seed_restaurants()
