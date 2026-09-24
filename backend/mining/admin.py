from django.contrib import admin
from mining.models import MiningRun, MiningBasketRule, MiningCustomerSegment


@admin.register(MiningRun)
class MiningRunAdmin(admin.ModelAdmin):
    list_display = ['module', 'model_version', 'status', 'started_at', 'finished_at']
    list_filter = ['module', 'status']


@admin.register(MiningBasketRule)
class MiningBasketRuleAdmin(admin.ModelAdmin):
    list_display = ['level', 'restaurant_id', 'antecedent', 'consequent', 'lift', 'confidence', 'support']
    list_filter = ['level']
    ordering = ['-lift']


@admin.register(MiningCustomerSegment)
class MiningCustomerSegmentAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'segment_label', 'recency_days', 'frequency', 'monetary', 'confidence']
    list_filter = ['segment_label']
