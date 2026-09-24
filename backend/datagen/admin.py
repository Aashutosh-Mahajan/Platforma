from django.contrib import admin
from datagen.models import GenerationRun, PlantedAnomaly


@admin.register(GenerationRun)
class GenerationRunAdmin(admin.ModelAdmin):
    list_display = ['id', 'seed', 'scale', 'months', 'started_at', 'finished_at']


@admin.register(PlantedAnomaly)
class PlantedAnomalyAdmin(admin.ModelAdmin):
    list_display = ['anomaly_type', 'target_type', 'target_id', 'run', 'created_at']
    list_filter = ['anomaly_type', 'target_type']
