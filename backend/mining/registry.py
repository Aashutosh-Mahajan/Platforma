"""Model version + metrics registry (PRD §4 mining/registry.py).

Thin helpers around MiningRun so every module starts/finishes a run the
same way, and so the serving layer (product surfaces reading mining
output) always asks "what's the latest successful run for this module"
through one place rather than each view reimplementing that query.
"""
from django.utils import timezone
from mining.models import MiningRun

MODEL_VERSION = '1.0.0'


def start_run(module, params=None):
    return MiningRun.objects.create(module=module, model_version=MODEL_VERSION, params=params or {})


def finish_run(run, metrics=None, status='succeeded', error_message=''):
    run.finished_at = timezone.now()
    run.metrics = metrics or {}
    run.status = status
    run.error_message = error_message
    run.save(update_fields=['finished_at', 'metrics', 'status', 'error_message'])
    return run


def latest_successful_run(module):
    return MiningRun.objects.filter(module=module, status='succeeded').order_by('-finished_at').first()
