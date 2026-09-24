"""The specific kinds of event an organizer can host.

Each type belongs to one of Event.CATEGORY_CHOICES. The category still drives
how seating works (stadium stands for sports, rows for cinema/theatre, zones
for concerts/comedy/expos/dining), so choosing a type also fixes the category.

This module is the single source of truth: the frontend reads it from
GET /api/v1/eventra/event-types.
"""

EVENT_TYPE_GROUPS = [
    ('concert', 'Music & concerts', [
        ('live_concert', 'Live concert'),
        ('music_festival', 'Music festival'),
        ('dj_night', 'DJ / club night'),
        ('classical_recital', 'Classical recital'),
        ('devotional_music', 'Devotional / bhajan evening'),
        ('tribute_show', 'Tribute show'),
        ('open_mic_music', 'Open mic (music)'),
    ]),
    ('sports', 'Sports', [
        ('cricket_match', 'Cricket match'),
        ('football_match', 'Football match'),
        ('kabaddi_match', 'Kabaddi match'),
        ('hockey_match', 'Hockey match'),
        ('basketball_game', 'Basketball game'),
        ('badminton_tournament', 'Badminton tournament'),
        ('tennis_match', 'Tennis match'),
        ('volleyball_match', 'Volleyball match'),
        ('combat_sports', 'Boxing / wrestling / MMA'),
        ('motorsport', 'Motorsport race'),
        ('marathon', 'Marathon / fun run'),
        ('esports_tournament', 'Esports tournament'),
    ]),
    ('movie', 'Movies & screenings', [
        ('film_screening', 'Film screening'),
        ('film_premiere', 'Film premiere'),
        ('film_festival', 'Film festival'),
        ('special_format_screening', 'IMAX / 4DX special screening'),
        ('documentary_screening', 'Documentary screening'),
    ]),
    ('theater', 'Theatre & performing arts', [
        ('play', 'Play / drama'),
        ('musical', 'Musical'),
        ('dance_performance', 'Dance performance'),
        ('opera', 'Opera'),
        ('magic_show', 'Magic show'),
        ('kids_show', "Children's show"),
    ]),
    ('comedy', 'Comedy', [
        ('standup_comedy', 'Stand-up comedy'),
        ('improv_comedy', 'Improv comedy'),
        ('comedy_open_mic', 'Comedy open mic'),
        ('sketch_comedy', 'Sketch comedy'),
    ]),
    ('expo', 'Expos, talks & workshops', [
        ('conference', 'Conference'),
        ('trade_show', 'Trade show / exhibition'),
        ('workshop', 'Workshop / masterclass'),
        ('product_launch', 'Product launch'),
        ('art_exhibition', 'Art exhibition'),
        ('book_fair', 'Book fair'),
        ('career_fair', 'Career fair'),
        ('hackathon', 'Hackathon'),
        ('meetup', 'Meetup / networking'),
    ]),
    ('dining', 'Food & dining experiences', [
        ('food_festival', 'Food festival'),
        ('chefs_table', "Chef's table"),
        ('tasting_event', 'Wine / beverage tasting'),
        ('supper_club', 'Supper club'),
        ('brunch', 'Brunch party'),
        ('cooking_class', 'Cooking class'),
    ]),
]

EVENT_TYPE_CHOICES = [(value, label) for _, _, types in EVENT_TYPE_GROUPS for value, label in types]
_CATEGORY_BY_TYPE = {value: category for category, _, types in EVENT_TYPE_GROUPS for value, _ in types}
_LABEL_BY_TYPE = dict(EVENT_TYPE_CHOICES)


def category_for(event_type):
    """The category an event type belongs to, or None if unknown/blank."""
    return _CATEGORY_BY_TYPE.get(event_type or '')


def label_for(event_type):
    return _LABEL_BY_TYPE.get(event_type or '', '')


def as_api_payload():
    return [
        {'category': category, 'label': label, 'types': [{'value': v, 'label': l} for v, l in types]}
        for category, label, types in EVENT_TYPE_GROUPS
    ]
