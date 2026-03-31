from django.contrib import admin
from eventra.models import Event, TicketType, Seat, Booking, BookingSeat, EventReview, EventAnalytics


class TicketTypeInline(admin.TabularInline):
    model = TicketType
    extra = 1


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    list_display = ['name', 'category', 'venue_name', 'event_date', 'available_seats',
                    'rating', 'is_published']
    list_filter = ['category', 'is_published', 'is_cancelled']
    search_fields = ['name', 'venue_name', 'address']
    inlines = [TicketTypeInline]


@admin.register(Seat)
class SeatAdmin(admin.ModelAdmin):
    list_display = ['event', 'section', 'row', 'seat_number', 'ticket_type', 'status']
    list_filter = ['status', 'section']
    search_fields = ['event__name']


class BookingSeatInline(admin.TabularInline):
    model = BookingSeat
    extra = 0
    readonly_fields = ['seat']


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display = ['booking_reference', 'user', 'event', 'status', 'total', 'booking_date']
    list_filter = ['status']
    search_fields = ['booking_reference', 'user__email', 'event__name']
    inlines = [BookingSeatInline]


@admin.register(EventReview)
class EventReviewAdmin(admin.ModelAdmin):
    list_display = ['event', 'user', 'rating', 'created_at']
    list_filter = ['rating']


@admin.register(EventAnalytics)
class EventAnalyticsAdmin(admin.ModelAdmin):
    list_display = ['event', 'views', 'bookings_count', 'revenue']
