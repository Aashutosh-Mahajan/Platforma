"""Celery app for Platforma (PRD §3: task queue, Beat schedule for nightly
ETL / model runs). Also carries lightweight recurring jobs that the request
cycle shouldn't own, like expiring stale seat holds.
"""
import os
from celery import Celery

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('platforma')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()
