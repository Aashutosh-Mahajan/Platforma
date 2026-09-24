"""Celery tasks for the warehouse app.

Both the ETL and the cuboid refresh were, until now, manual-only
(`manage.py run_etl` / a Python shell call) — meaning the analytics the
admin dashboard reads only reflected reality the moment someone remembered
to run them. Scheduling them nightly via Celery beat keeps that data live
without anyone having to babysit it.
"""
from celery import shared_task
from django.core.management import call_command


@shared_task
def run_etl_task():
    call_command('run_etl')


@shared_task
def refresh_cuboids_task():
    from warehouse.olap.cuboids import refresh_all_cuboids
    refresh_all_cuboids()
