from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils.text import slugify


class Restaurant(models.Model):
    DATA_SOURCE_CHOICES = [
        ("fake", "Fake"),
        ("real", "Real"),
    ]

    AREA_CHOICES = [
        ("Bandra", "Bandra"),
        ("Andheri", "Andheri"),
        ("Juhu", "Juhu"),
        ("Colaba", "Colaba"),
        ("Dadar", "Dadar"),
        ("Powai", "Powai"),
        ("Worli", "Worli"),
        ("Churchgate", "Churchgate"),
        ("Thane", "Thane"),
        ("Borivali", "Borivali"),
    ]

    CUISINE_CHOICES = [
        ("Indian", "Indian"),
        ("Chinese", "Chinese"),
        ("Italian", "Italian"),
        ("Continental", "Continental"),
        ("Fast Food", "Fast Food"),
        ("Street Food", "Street Food"),
        ("Seafood", "Seafood"),
        ("Mughlai", "Mughlai"),
        ("South Indian", "South Indian"),
        ("North Indian", "North Indian"),
    ]

    osm_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True, blank=True)
    area = models.CharField(max_length=100, choices=AREA_CHOICES, default="Bandra")
    cuisine = models.CharField(max_length=100, choices=CUISINE_CHOICES, default="Indian")
    rating = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=1.00,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
    )
    price_range = models.IntegerField(
        default=2,
        validators=[MinValueValidator(1), MaxValueValidator(4)],
    )
    image_url = models.URLField(max_length=1000, blank=True)
    address = models.CharField(max_length=500, blank=True)
    hours = models.CharField(max_length=255, blank=True)
    is_open = models.BooleanField(default=True)
    veg_only = models.BooleanField(default=False)
    description = models.TextField(blank=True)
    data_source = models.CharField(
        max_length=10,
        choices=DATA_SOURCE_CHOICES,
        default="fake",
        db_index=True,
    )

    # Legacy fields retained for existing API and seed command compatibility.
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    opening_hours = models.CharField(max_length=500, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.CharField(max_length=500, blank=True, null=True)
    photo_url = models.CharField(max_length=1000, blank=True, null=True)
    city = models.CharField(max_length=100, default='Mumbai')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        base_slug = slugify(self.name) or "restaurant"
        slug_candidate = base_slug
        suffix = 1
        while Restaurant.objects.filter(slug=slug_candidate).exclude(pk=self.pk).exists():
            slug_candidate = f"{base_slug}-{suffix}"
            suffix += 1
        self.slug = slug_candidate
        super().save(*args, **kwargs)
