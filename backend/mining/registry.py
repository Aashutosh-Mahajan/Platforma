"""Model version + metrics registry (PRD §4 mining/registry.py).

Thin helpers around MiningRun so every module starts/finishes a run the
same way, and so the serving layer (product surfaces reading mining
output) always asks "what's the latest successful run for this module"
through one place rather than each view reimplementing that query.
"""
from django.utils import timezone
from mining.models import MiningRun

MODEL_VERSION = '1.1.0'

# Successful runs kept per module. Every output table cascades from its
# run, so pruning a run removes its rows too, which keeps the warehouse
# database small (the serving layer only ever reads the latest run).
KEEP_RUNS = 2


def start_run(module, params=None):
    return MiningRun.objects.create(module=module, model_version=MODEL_VERSION, params=params or {})


def finish_run(run, metrics=None, status='succeeded', error_message=''):
    run.finished_at = timezone.now()
    run.metrics = metrics or {}
    run.status = status
    run.error_message = error_message
    run.save(update_fields=['finished_at', 'metrics', 'status', 'error_message'])
    if status == 'succeeded':
        prune_old_runs(run.module)
    return run


def latest_successful_run(module):
    return MiningRun.objects.filter(module=module, status='succeeded').order_by('-finished_at').first()


def prune_old_runs(module, keep=KEEP_RUNS):
    keep_ids = list(
        MiningRun.objects.filter(module=module, status='succeeded')
        .order_by('-finished_at').values_list('id', flat=True)[:keep]
    )
    stale = MiningRun.objects.filter(module=module).exclude(id__in=keep_ids).exclude(status='running')
    stale.delete()


def execute(module, params, body):
    """Run `body(run) -> metrics` inside a MiningRun. A body may return
    {'skipped': True, 'reason': ...} when there isn't enough data; that
    still counts as a successful run (with no output rows), so the serving
    layer shows "not enough data yet" instead of last month's results.
    """
    run = start_run(module, params=params)
    try:
        metrics = body(run)
    except Exception as exc:
        finish_run(run, status='failed', error_message=str(exc))
        raise
    finish_run(run, metrics=metrics)
    return run
