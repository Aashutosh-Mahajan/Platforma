"""Mumbai gazetteer: the single list of localities the platform serves.

Platforma operates in Mumbai only (the area under the Brihanmumbai
Municipal Corporation: the island city plus the western and eastern
suburbs). Everything that places something on the map reads from here:
the demo data generator, the warehouse ETL (dim_location / dim_zone), the
area-clustering mining module and the serializers that refuse addresses
outside the city.

Each area carries:
  zone        South Mumbai | Central Mumbai | Western Suburbs | Eastern Suburbs
  district    Mumbai City | Mumbai Suburban (the two revenue districts)
  lat, lng    approximate locality centre
  pincode     the locality's main post office
  population  relative residential weight (how many customers live there)
  affluence   0..1, drives order value and how often residents order

`SOURCE_LOCATIONS` maps the free-text localities in the scraped restaurant
data onto these areas. `OUTSIDE_MUMBAI` lists the ones that belong to
Thane, Navi Mumbai, Mira-Bhayander or Vasai-Virar and are dropped.
"""
import math

CITY = 'Mumbai'
STATE = 'Maharashtra'
CITY_CENTRE = (19.0760, 72.8777)

ZONES = {
    'South Mumbai': {'district': 'Mumbai City', 'order': 1},
    'Central Mumbai': {'district': 'Mumbai City', 'order': 2},
    'Western Suburbs': {'district': 'Mumbai Suburban', 'order': 3},
    'Eastern Suburbs': {'district': 'Mumbai Suburban', 'order': 4},
}

# name: (zone, lat, lng, pincode, population, affluence)
_AREAS = {
    # South Mumbai
    'Colaba': ('South Mumbai', 18.9067, 72.8147, '400005', 0.6, 0.90),
    'Churchgate': ('South Mumbai', 18.9322, 72.8264, '400020', 0.5, 0.85),
    'Fort': ('South Mumbai', 18.9345, 72.8355, '400001', 0.5, 0.75),
    'Kalbadevi': ('South Mumbai', 18.9480, 72.8300, '400002', 0.8, 0.40),
    'Girgaon': ('South Mumbai', 18.9560, 72.8160, '400004', 0.8, 0.55),
    'Malabar Hill': ('South Mumbai', 18.9620, 72.8050, '400006', 0.5, 1.00),
    'Tardeo': ('South Mumbai', 18.9750, 72.8150, '400034', 0.7, 0.75),
    'Byculla': ('South Mumbai', 18.9790, 72.8340, '400027', 1.0, 0.35),
    # Central Mumbai
    'Lower Parel': ('Central Mumbai', 18.9950, 72.8300, '400013', 0.8, 0.85),
    'Worli': ('Central Mumbai', 19.0176, 72.8162, '400018', 0.9, 0.90),
    'Dadar': ('Central Mumbai', 19.0178, 72.8478, '400014', 1.2, 0.60),
    'Wadala': ('Central Mumbai', 19.0180, 72.8650, '400031', 0.9, 0.40),
    'Matunga': ('Central Mumbai', 19.0270, 72.8550, '400019', 0.8, 0.60),
    'Sion': ('Central Mumbai', 19.0400, 72.8620, '400022', 1.0, 0.45),
    # Western Suburbs
    'Bandra West': ('Western Suburbs', 19.0596, 72.8295, '400050', 1.1, 0.95),
    'BKC': ('Western Suburbs', 19.0630, 72.8650, '400051', 0.6, 0.80),
    'Khar': ('Western Suburbs', 19.0710, 72.8370, '400052', 0.8, 0.85),
    'Santacruz': ('Western Suburbs', 19.0810, 72.8410, '400054', 1.0, 0.70),
    'Vile Parle': ('Western Suburbs', 19.0990, 72.8490, '400057', 1.0, 0.65),
    'Juhu': ('Western Suburbs', 19.1075, 72.8263, '400049', 0.8, 0.95),
    'Andheri East': ('Western Suburbs', 19.1150, 72.8700, '400069', 1.6, 0.55),
    'Andheri West': ('Western Suburbs', 19.1360, 72.8296, '400058', 1.7, 0.75),
    'Versova': ('Western Suburbs', 19.1310, 72.8140, '400061', 0.8, 0.70),
    'Jogeshwari': ('Western Suburbs', 19.1380, 72.8490, '400060', 1.1, 0.40),
    'Goregaon': ('Western Suburbs', 19.1650, 72.8490, '400063', 1.4, 0.55),
    'Malad': ('Western Suburbs', 19.1860, 72.8480, '400064', 1.6, 0.50),
    'Kandivali': ('Western Suburbs', 19.2050, 72.8520, '400067', 1.5, 0.50),
    'Borivali': ('Western Suburbs', 19.2307, 72.8567, '400066', 1.6, 0.55),
    'Dahisar': ('Western Suburbs', 19.2500, 72.8590, '400068', 1.0, 0.40),
    # Eastern Suburbs
    'Kurla': ('Eastern Suburbs', 19.0700, 72.8800, '400070', 1.3, 0.35),
    'Chembur': ('Eastern Suburbs', 19.0620, 72.9000, '400071', 1.2, 0.60),
    'Ghatkopar': ('Eastern Suburbs', 19.0860, 72.9080, '400077', 1.4, 0.55),
    'Powai': ('Eastern Suburbs', 19.1176, 72.9060, '400076', 1.1, 0.85),
    'Vikhroli': ('Eastern Suburbs', 19.1100, 72.9280, '400079', 0.9, 0.45),
    'Bhandup': ('Eastern Suburbs', 19.1440, 72.9370, '400078', 1.1, 0.40),
    'Mulund': ('Eastern Suburbs', 19.1720, 72.9560, '400080', 1.2, 0.60),
}

AREAS = {
    name: {
        'name': name, 'zone': zone, 'district': ZONES[zone]['district'], 'city': CITY,
        'lat': lat, 'lng': lng, 'pincode': pin, 'population': pop, 'affluence': aff,
    }
    for name, (zone, lat, lng, pin, pop, aff) in _AREAS.items()
}
AREA_NAMES = list(AREAS)

# Scraped restaurant localities -> gazetteer area.
SOURCE_LOCATIONS = {
    'Colaba': 'Colaba',
    'Churchgate': 'Churchgate', 'Nariman Point': 'Churchgate', 'Marine Lines': 'Churchgate',
    'Dhobi Talao': 'Churchgate',
    'Fort': 'Fort', 'CST': 'Fort',
    'Kalbadevi': 'Kalbadevi', 'Bhuleshwar': 'Kalbadevi', 'Crawford Market': 'Kalbadevi',
    'Null Bazaar': 'Kalbadevi', 'Sandhurst': 'Kalbadevi',
    'Girgaon': 'Girgaon', 'Charni Road': 'Girgaon', 'Grant Road': 'Girgaon',
    'Breach Candy': 'Malabar Hill', 'Peddar Road': 'Malabar Hill',
    'Tardeo': 'Tardeo', 'Haji Ali': 'Tardeo', 'Mumbai Central': 'Tardeo', 'Mahalaxmi': 'Tardeo',
    'Byculla': 'Byculla', 'Mazgaon': 'Byculla', 'Dockyard': 'Byculla', 'Dockyard Road': 'Byculla',
    'Reay Road': 'Byculla', 'Chinchpokli': 'Byculla', 'Cotton Green': 'Byculla',
    'Lower Parel': 'Lower Parel', 'Elphinstone': 'Lower Parel', 'Currey Road': 'Lower Parel', 'Parel': 'Lower Parel',
    'Worli': 'Worli',
    'Dadar': 'Dadar', 'Prabhadevi': 'Dadar',
    'Wadala': 'Wadala', 'Sewri': 'Wadala',
    'Matunga': 'Matunga',
    'Sion': 'Sion', 'Chunabhatti': 'Sion',
    'Bandra': 'Bandra West', 'Bandra West': 'Bandra West',
    'Bandra East': 'BKC',
    'Khar': 'Khar', 'Khar West': 'Khar',
    'Santacruz': 'Santacruz', 'Santacruz East': 'Santacruz', 'Santacruz West': 'Santacruz',
    'Vile Parle': 'Vile Parle',
    'Andheri East': 'Andheri East', 'Chakala': 'Andheri East', 'Marol': 'Andheri East',
    'SEEPZ': 'Andheri East', 'Sakinaka': 'Andheri East',
    'Andheri': 'Andheri West', 'Andheri West': 'Andheri West', 'DN Nagar': 'Andheri West',
    'Lokhandwala': 'Andheri West', 'Oshiwara': 'Andheri West',
    'Versova': 'Versova',
    'Jogeshwari': 'Jogeshwari',
    'Goregaon': 'Goregaon', 'Pahadi Goregaon': 'Goregaon', 'Film City': 'Goregaon',
    'Malad': 'Malad', 'Malad West': 'Malad',
    'Kandivali': 'Kandivali', 'Poisar': 'Kandivali',
    'Borivali': 'Borivali', 'Borivali East': 'Borivali', 'Magathane': 'Borivali', 'Eksar': 'Borivali',
    'Mandapeshwar': 'Borivali', 'IC Colony': 'Borivali',
    'Dahisar': 'Dahisar',
    'Kurla': 'Kurla',
    'Chembur': 'Chembur', 'Trombay': 'Chembur', 'Govandi': 'Chembur', 'Mankhurd': 'Chembur',
    'Ghatkopar': 'Ghatkopar',
    'Powai': 'Powai', 'Chandivali': 'Powai',
    'Vikhroli': 'Vikhroli', 'Kanjurmarg': 'Vikhroli',
    'Bhandup': 'Bhandup', 'Nahur': 'Bhandup',
    'Mulund': 'Mulund',
}

OUTSIDE_MUMBAI = {
    'Ambarnath', 'Badlapur', 'Belapur', 'Bhayander', 'Dombivli', 'Kalyan', 'Kasara', 'Kopar Khairane',
    'Kopri', 'Mira Road', 'Nalasopara', 'Nerul', 'Panvel', 'Thane', 'Thane East', 'Thane West',
    'Titwala', 'Ulhasnagar', 'Vasai', 'Vashi', 'Virar',
}

# Rough bounding box of the BMC area, used to reject coordinates elsewhere.
BOUNDS = {'lat': (18.88, 19.28), 'lng': (72.77, 72.99)}


def area_for_location(location):
    """Gazetteer area for a scraped locality, or None when it lies outside Mumbai."""
    location = (location or '').strip()
    if location in OUTSIDE_MUMBAI:
        return None
    if location in SOURCE_LOCATIONS:
        return SOURCE_LOCATIONS[location]
    lowered = location.lower()
    for source, area in SOURCE_LOCATIONS.items():
        if source.lower() in lowered:
            return area
    for name in AREA_NAMES:
        if name.lower() in lowered:
            return name
    return None


def canonical_area(value):
    """Matches free text ('andheri w', 'Bandra') to a gazetteer area name, or None."""
    text = (value or '').strip()
    if not text:
        return None
    for name in AREA_NAMES:
        if name.lower() == text.lower():
            return name
    return area_for_location(text)


def km_between(lat1, lng1, lat2, lng2):
    """Great-circle distance in kilometres."""
    r = 6371.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lng2 - lng1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def nearest_area(lat, lng):
    """The gazetteer area whose centre is closest to a point (None if no point)."""
    if lat is None or lng is None:
        return None
    lat, lng = float(lat), float(lng)
    return min(AREAS.values(), key=lambda a: (a['lat'] - lat) ** 2 + (a['lng'] - lng) ** 2)['name']


def neighbours(area, radius_km=3.5):
    """Areas whose centres lie within `radius_km` of `area` (itself included)."""
    a = AREAS[area]
    return [b['name'] for b in AREAS.values() if km_between(a['lat'], a['lng'], b['lat'], b['lng']) <= radius_km]


def in_mumbai(lat, lng):
    if lat is None or lng is None:
        return True
    lat, lng = float(lat), float(lng)
    return BOUNDS['lat'][0] <= lat <= BOUNDS['lat'][1] and BOUNDS['lng'][0] <= lng <= BOUNDS['lng'][1]
