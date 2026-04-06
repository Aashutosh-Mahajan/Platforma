from django.db import models


class Restaurant(models.Model):
    osm_id = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=255)
    cuisine = models.CharField(max_length=255, blank=True)
    address = models.CharField(max_length=500, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    opening_hours = models.CharField(max_length=500, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    website = models.CharField(max_length=500, blank=True, null=True)
    photo_url = models.CharField(max_length=1000, blank=True, null=True)
    area = models.CharField(max_length=100, blank=True)
    city = models.CharField(max_length=100, default='Mumbai')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name
