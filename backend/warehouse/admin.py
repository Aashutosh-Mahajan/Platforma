from django.contrib import admin
from warehouse.models import (
    DimDate, DimTime, DimCustomer, DimLocation, DimPayment,
    DimRestaurant, DimMenuItem, DimPromotion, DimEvent, DimVenue, DimTicketType,
    FactOrder, FactOrderItem, FactBooking, FactTicketSale,
    EtlRunAudit, EtlQuarantine,
    CbDailyOutletRevenue, CbDailyItemPerformance, CbMonthlyCustomerActivity,
    CbDailyEventSales, CbHourlyDemandProfile,
)


@admin.register(EtlRunAudit)
class EtlRunAuditAdmin(admin.ModelAdmin):
    list_display = ['run_id', 'table_name', 'status', 'rows_read', 'rows_loaded', 'rows_rejected', 'started_at', 'ended_at']
    list_filter = ['status', 'table_name']
    search_fields = ['run_id']


@admin.register(EtlQuarantine)
class EtlQuarantineAdmin(admin.ModelAdmin):
    list_display = ['table_name', 'source_pk', 'violated_rule', 'quarantined_at']
    list_filter = ['table_name', 'violated_rule']


@admin.register(DimCustomer)
class DimCustomerAdmin(admin.ModelAdmin):
    list_display = ['customer_id', 'signup_cohort', 'tenure_band', 'rfm_segment', 'is_current', 'valid_from']
    list_filter = ['tenure_band', 'is_current']


@admin.register(DimRestaurant)
class DimRestaurantAdmin(admin.ModelAdmin):
    list_display = ['restaurant_id', 'name', 'cuisine', 'price_band', 'rating_band', 'is_current']
    list_filter = ['price_band', 'rating_band', 'is_current']


@admin.register(DimMenuItem)
class DimMenuItemAdmin(admin.ModelAdmin):
    list_display = ['item_id', 'item_name', 'category', 'list_price', 'is_current']
    list_filter = ['category', 'is_current']


@admin.register(DimEvent)
class DimEventAdmin(admin.ModelAdmin):
    list_display = ['event_id', 'title', 'category', 'is_current']
    list_filter = ['category', 'is_current']


admin.site.register(DimDate)
admin.site.register(DimTime)
admin.site.register(DimLocation)
admin.site.register(DimPayment)
admin.site.register(DimPromotion)
admin.site.register(DimVenue)
admin.site.register(DimTicketType)
admin.site.register(FactOrder)
admin.site.register(FactOrderItem)
admin.site.register(FactBooking)
admin.site.register(FactTicketSale)
admin.site.register(CbDailyOutletRevenue)
admin.site.register(CbDailyItemPerformance)
admin.site.register(CbMonthlyCustomerActivity)
admin.site.register(CbDailyEventSales)
admin.site.register(CbHourlyDemandProfile)
