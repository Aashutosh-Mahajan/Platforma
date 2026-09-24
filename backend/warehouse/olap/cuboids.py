"""Cuboid refresh (PRD §8.3).

Each cuboid is rebuilt with one GROUP BY query against the fact+dim
tables (aggregation happens in Postgres, not Python, so refresh time
doesn't scale with fact-table row count) and then swapped in via a
delete-and-bulk_create pass. PRD's "refresh affected cuboids only" (an
incremental, partition-aware refresh) is simplified here to a full
rebuild of all five every run — correct and simple, at the cost of
redoing unaffected history on every refresh. Worth revisiting only if
refresh time becomes the bottleneck at real data volume.
"""
from django.db.models import Sum, Count, Max, F, Q
from django.db.models.functions import TruncMonth

from warehouse.models import (
    FactOrder, FactOrderItem, FactBooking, FactTicketSale,
    DimDate, DimRestaurant, DimMenuItem, DimCustomer, DimEvent, DimTicketType,
    CbDailyOutletRevenue, CbDailyItemPerformance, CbMonthlyCustomerActivity,
    CbDailyEventSales, CbHourlyDemandProfile,
)


def refresh_daily_outlet_revenue():
    rows = (
        FactOrder.objects.filter(is_cancelled=False)
        .values('date__full_date', 'restaurant__restaurant_id', 'restaurant__name', 'restaurant__area')
        .annotate(net_revenue=Sum('order_total'), order_count=Count('fact_key'), item_count=Sum('item_count'))
    )
    objs = [
        CbDailyOutletRevenue(
            date=r['date__full_date'], restaurant_id=r['restaurant__restaurant_id'],
            restaurant_name=r['restaurant__name'] or '', area=r['restaurant__area'] or '',
            net_revenue=r['net_revenue'] or 0, order_count=r['order_count'] or 0,
            item_count=r['item_count'] or 0,
        )
        for r in rows
    ]
    CbDailyOutletRevenue.objects.all().delete()
    CbDailyOutletRevenue.objects.bulk_create(objs, batch_size=2000)
    return len(objs)


def refresh_daily_item_performance():
    rows = (
        FactOrderItem.objects
        .values('date__full_date', 'menu_item__item_id', 'menu_item__item_name', 'restaurant__restaurant_id')
        .annotate(net_revenue=Sum('net_amount'), quantity_sold=Sum('quantity'))
    )
    objs = [
        CbDailyItemPerformance(
            date=r['date__full_date'], menu_item_id=r['menu_item__item_id'],
            item_name=r['menu_item__item_name'] or '', restaurant_id=r['restaurant__restaurant_id'],
            net_revenue=r['net_revenue'] or 0, quantity_sold=r['quantity_sold'] or 0,
        )
        for r in rows
    ]
    CbDailyItemPerformance.objects.all().delete()
    CbDailyItemPerformance.objects.bulk_create(objs, batch_size=2000)
    return len(objs)


def refresh_monthly_customer_activity():
    order_rows = (
        FactOrder.objects.filter(is_cancelled=False)
        .annotate(month=TruncMonth('date__full_date'))
        .values('month', 'customer__customer_id')
        .annotate(total_spend=Sum('order_total'), transaction_count=Count('fact_key'),
                  last_date=Max('date__full_date'))
    )
    booking_rows = (
        FactBooking.objects.filter(is_cancelled=False)
        .annotate(month=TruncMonth('date__full_date'))
        .values('month', 'customer__customer_id')
        .annotate(total_spend=Sum('booking_total'), transaction_count=Count('fact_key'),
                  last_date=Max('date__full_date'))
    )

    objs = []
    for r in order_rows:
        objs.append(CbMonthlyCustomerActivity(
            month=r['month'].strftime('%Y-%m'), customer_id=r['customer__customer_id'],
            domain='zesty', total_spend=r['total_spend'] or 0,
            transaction_count=r['transaction_count'] or 0,
            last_transaction_date=r['last_date'],
        ))
    for r in booking_rows:
        objs.append(CbMonthlyCustomerActivity(
            month=r['month'].strftime('%Y-%m'), customer_id=r['customer__customer_id'],
            domain='eventra', total_spend=r['total_spend'] or 0,
            transaction_count=r['transaction_count'] or 0,
            last_transaction_date=r['last_date'],
        ))

    CbMonthlyCustomerActivity.objects.all().delete()
    CbMonthlyCustomerActivity.objects.bulk_create(objs, batch_size=2000)
    return len(objs)


def refresh_daily_event_sales():
    rows = (
        FactTicketSale.objects
        .values('date__full_date', 'event__event_id', 'event__title',
                 'venue__venue_id', 'ticket_type__ticket_type_id', 'ticket_type__class_name')
        .annotate(net_revenue=Sum('ticket_revenue'), tickets_sold=Count('fact_key'))
    )
    objs = [
        CbDailyEventSales(
            date=r['date__full_date'], event_id=r['event__event_id'], event_title=r['event__title'] or '',
            venue_id=r['venue__venue_id'], ticket_type_id=r['ticket_type__ticket_type_id'],
            tier_name=r['ticket_type__class_name'] or '',
            net_revenue=r['net_revenue'] or 0, tickets_sold=r['tickets_sold'] or 0,
        )
        for r in rows
    ]
    CbDailyEventSales.objects.all().delete()
    CbDailyEventSales.objects.bulk_create(objs, batch_size=2000)
    return len(objs)


def refresh_hourly_demand_profile():
    order_rows = (
        FactOrder.objects.filter(is_cancelled=False)
        .values('date__full_date', 'time__day_part', 'location__area')
        .annotate(transaction_count=Count('fact_key'), net_revenue=Sum('order_total'))
    )
    booking_rows = (
        FactBooking.objects.filter(is_cancelled=False)
        .values('date__full_date', 'time__day_part', 'venue__zone')
        .annotate(transaction_count=Count('fact_key'), net_revenue=Sum('booking_total'))
    )

    objs = []
    for r in order_rows:
        objs.append(CbHourlyDemandProfile(
            date=r['date__full_date'], day_part=r['time__day_part'] or '', area=r['location__area'] or '',
            domain='zesty', transaction_count=r['transaction_count'] or 0, net_revenue=r['net_revenue'] or 0,
        ))
    for r in booking_rows:
        objs.append(CbHourlyDemandProfile(
            date=r['date__full_date'], day_part=r['time__day_part'] or '', area=r['venue__zone'] or '',
            domain='eventra', transaction_count=r['transaction_count'] or 0, net_revenue=r['net_revenue'] or 0,
        ))

    CbHourlyDemandProfile.objects.all().delete()
    CbHourlyDemandProfile.objects.bulk_create(objs, batch_size=2000)
    return len(objs)


def refresh_all_cuboids():
    return {
        'cb_daily_outlet_revenue': refresh_daily_outlet_revenue(),
        'cb_daily_item_performance': refresh_daily_item_performance(),
        'cb_monthly_customer_activity': refresh_monthly_customer_activity(),
        'cb_daily_event_sales': refresh_daily_event_sales(),
        'cb_hourly_demand_profile': refresh_hourly_demand_profile(),
    }
