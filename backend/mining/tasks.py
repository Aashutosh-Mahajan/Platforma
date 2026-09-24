"""Celery task for the mining app — runs basket + segmentation mining on
schedule instead of requiring a manual `manage.py run_mining`. Depends on
`warehouse.tasks.run_etl_task` having populated fact tables first, so it's
scheduled to run after the nightly ETL, not independently.
"""
from celery import shared_task
from django.core.management import call_command


@shared_task
def run_mining_task():
    call_command('run_mining', module='all')
