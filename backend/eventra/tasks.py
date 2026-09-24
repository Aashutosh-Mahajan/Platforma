"""Celery tasks for eventra.

Seat holds already expire *logically* the moment `expires_at` passes — every
read path (seat map, booking creation, new hold requests) filters on
`expires_at__gt=now()`, so a hold never blocks anyone past its window even
if this task hasn't run yet. This task's job is purely housekeeping: delete
the now-dead rows so `seat_holds` doesn't grow forever.
"""
from celery import shared_task
from django.utils import timezone


@shared_task
def expire_seat_holds():
    from eventra.models import SeatHold
    deleted_count, _ = SeatHold.objects.filter(expires_at__lte=timezone.now()).delete()
    return deleted_count
