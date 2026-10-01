"""Database routing: the warehouse and mining apps live in their own
database (the 'warehouse' alias, from WAREHOUSE_DATABASE_URL) so the
transactional app on 'default' never shares a connection pool, lock or
disk with nightly ETL, OLAP queries or model training.

Neither app has a foreign key into the operational schema — every warehouse
row carries plain natural ids (customer_id, restaurant_id, ...) instead —
so splitting them across two physical databases needs no schema changes.

If WAREHOUSE_DATABASE_URL isn't set, `warehouse_db()` returns 'default'
and this router steps aside entirely (single-database mode), which is what
local development without a second database gets.

Setting up a new warehouse database:
    python manage.py setup_warehouse
which runs `migrate --database=warehouse` and the first ETL + mining pass.
"""
from django.conf import settings

WAREHOUSE_APPS = frozenset({'warehouse', 'mining'})
WAREHOUSE_ALIAS = 'warehouse'


def warehouse_db():
    """The alias warehouse/mining models read and write through."""
    return WAREHOUSE_ALIAS if WAREHOUSE_ALIAS in settings.DATABASES else 'default'


def is_split():
    return warehouse_db() != 'default'


class WarehouseRouter:
    def _is_warehouse(self, model):
        return model._meta.app_label in WAREHOUSE_APPS

    def db_for_read(self, model, **hints):
        if self._is_warehouse(model):
            return warehouse_db()
        return None

    def db_for_write(self, model, **hints):
        if self._is_warehouse(model):
            return warehouse_db()
        return None

    def allow_relation(self, obj1, obj2, **hints):
        a, b = self._is_warehouse(obj1), self._is_warehouse(obj2)
        if a and b:
            return True
        if a != b and is_split():
            return False
        return None

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if not is_split():
            return None
        if app_label in WAREHOUSE_APPS:
            return db == WAREHOUSE_ALIAS
        if db == WAREHOUSE_ALIAS:
            return False
        return None
