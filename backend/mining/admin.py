from django.contrib import admin
from mining.models import (
    MiningRun, MiningBasketRule, MiningCustomerSegment, MiningAnomaly, MiningRiskScore, MiningForecast,
    MiningSellOutForecast, MiningRecommendation, MiningSequenceRule, MiningCustomerScore,
    MiningDeliveryEstimate, MiningHotspot, MiningSearchTerm, MiningPromoEffect, MiningPriceElasticity,
)


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


@admin.register(MiningAnomaly)
class MiningAnomalyAdmin(admin.ModelAdmin):
    list_display = ['domain', 'target_id', 'rank', 'score', 'amount', 'review_status', 'occurred_on']
    list_filter = ['domain', 'review_status']
    ordering = ['domain', 'rank']


@admin.register(MiningRiskScore)
class MiningRiskScoreAdmin(admin.ModelAdmin):
    list_display = ['kind', 'target_id', 'entity_id', 'probability', 'band']
    list_filter = ['kind', 'band']


@admin.register(MiningCustomerScore)
class MiningCustomerScoreAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'churn_probability', 'churn_band', 'predicted_90d_value', 'value_band']
    list_filter = ['churn_band', 'value_band']


@admin.register(MiningSequenceRule)
class MiningSequenceRuleAdmin(admin.ModelAdmin):
    list_display = ['antecedent', 'consequent', 'window_hours', 'occurrences', 'confidence', 'lift']
    ordering = ['-lift']


@admin.register(MiningSearchTerm)
class MiningSearchTermAdmin(admin.ModelAdmin):
    list_display = ['term', 'cluster', 'searches', 'searches_7d', 'trend', 'zero_result_rate', 'flag']
    list_filter = ['flag']


@admin.register(MiningPromoEffect)
class MiningPromoEffectAdmin(admin.ModelAdmin):
    list_display = ['promo_code', 'restaurant_id', 'window_start', 'uplift_pct', 'roi', 'verdict']
    list_filter = ['verdict']


for model in (MiningForecast, MiningSellOutForecast, MiningRecommendation, MiningDeliveryEstimate,
              MiningHotspot, MiningPriceElasticity):
    admin.site.register(model)
