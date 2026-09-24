"""
Django settings for Platforma project.
"""
import os
from pathlib import Path
from datetime import timedelta
from urllib.parse import parse_qsl, unquote, urlparse

from decouple import config, Csv
from django.core.exceptions import ImproperlyConfigured
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
PROJECT_ROOT = BASE_DIR.parent

# Load environment variables before reading any config values.
load_dotenv(PROJECT_ROOT / '.env')
load_dotenv(BASE_DIR / '.env')

# ====================
# CORE SETTINGS 
# ====================
SECRET_KEY = config('DJANGO_SECRET_KEY', default='django-insecure-platforma-dev-key')
DEBUG = config('DJANGO_DEBUG', default=True, cast=bool)
ALLOWED_HOSTS = config('DJANGO_ALLOWED_HOSTS', default='localhost,127.0.0.1', cast=Csv())

# ====================
# APPLICATIONS
# ====================
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Third-party
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'django_filters',
    'django_celery_beat',

    # Local apps
    'core',
    'zesty',
    'eventra',
    'datagen',
    'warehouse',
    'mining',
]

# ====================
# MIDDLEWARE
# ====================
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'config.wsgi.application'

# ====================
# DATABASE
# ====================
def _build_postgres_database_config():
    database_url = config('DATABASE_URL', default='').strip()
    if not database_url:
        raise ImproperlyConfigured(
            'DATABASE_URL is required. SQLite is disabled for this project.'
        )

    parsed = urlparse(database_url)
    allowed_schemes = {'postgres', 'postgresql', 'postgresql+psycopg2'}

    if parsed.scheme not in allowed_schemes:
        if parsed.scheme.startswith('sqlite'):
            raise ImproperlyConfigured(
                'SQLite is disabled. Set DATABASE_URL to a PostgreSQL URL.'
            )
        raise ImproperlyConfigured(
            'Unsupported DATABASE_URL scheme. Use a PostgreSQL URL.'
        )

    db_name = parsed.path.lstrip('/')
    if not db_name:
        raise ImproperlyConfigured('DATABASE_URL must include a database name.')

    db_config = {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': db_name,
        'USER': unquote(parsed.username or ''),
        'PASSWORD': unquote(parsed.password or ''),
        'HOST': parsed.hostname or '',
        'PORT': str(parsed.port) if parsed.port else '',
        'CONN_MAX_AGE': 600,
    }

    options = dict(parse_qsl(parsed.query, keep_blank_values=False))
    if options:
        db_config['OPTIONS'] = options

    return db_config


DATABASES = {
    'default': _build_postgres_database_config(),
}

# ====================
# AUTH
# ====================
AUTH_USER_MODEL = 'core.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ====================
# REST FRAMEWORK
# ====================
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
        'rest_framework.authentication.SessionAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticatedOrReadOnly',
    ],
    'DEFAULT_PAGINATION_CLASS': 'utils.pagination.StandardPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
        'rest_framework.filters.SearchFilter',
        'rest_framework.filters.OrderingFilter',
    ],
    'EXCEPTION_HANDLER': 'utils.exception_handlers.custom_exception_handler',
    # Catalog browsing (restaurants, events, menus) went AllowAny this
    # session so guests can shop without logging in — throttle by IP/user
    # so that openness doesn't become an easy scraping/abuse surface.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '120/min',
        'user': '300/min',
    },
}

# ====================
# JWT
# ====================
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(
        minutes=config('JWT_ACCESS_TOKEN_LIFETIME_MINUTES', default=60, cast=int)
    ),
    'REFRESH_TOKEN_LIFETIME': timedelta(
        days=config('JWT_REFRESH_TOKEN_LIFETIME_DAYS', default=7, cast=int)
    ),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# ====================
# CORS
# ====================
CORS_ALLOWED_ORIGINS = config(
    'CORS_ALLOWED_ORIGINS',
    default=(
        'http://localhost:3000,http://127.0.0.1:3000,'
        'http://localhost:5173,http://127.0.0.1:5173,'
        'http://localhost:4173,http://127.0.0.1:4173'
    ),
    cast=Csv()
)

# In local development, frontend dev servers may run on different ports
# (for example 3000, 3001, 3002). Allow localhost origins by regex so
# CORS does not break whenever Vite picks a new available port.
if DEBUG:
    CORS_ALLOWED_ORIGIN_REGEXES = [
        r'^http://localhost:\d+$',
        r'^http://127\.0\.0\.1:\d+$',
    ]

CORS_ALLOW_CREDENTIALS = True

# ====================
# INTERNATIONALIZATION
# ====================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Asia/Kolkata'
USE_I18N = True
USE_TZ = True

# ====================
# STATIC & MEDIA
# ====================
STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ====================
# DEFAULT PRIMARY KEY
# ====================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ====================
# EMAIL (console for dev)
# ====================
EMAIL_BACKEND = config('EMAIL_BACKEND', default='django.core.mail.backends.console.EmailBackend')
DEFAULT_FROM_EMAIL = config('DEFAULT_FROM_EMAIL', default='noreply@platforma.com')
# SMTP delivery for verification and reset codes. Set EMAIL_BACKEND to
# django.core.mail.backends.smtp.EmailBackend and fill these in to send real mail.
EMAIL_HOST = config('EMAIL_HOST', default='localhost')
EMAIL_PORT = config('EMAIL_PORT', default=587, cast=int)
EMAIL_HOST_USER = config('EMAIL_HOST_USER', default='')
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default='')
EMAIL_USE_TLS = config('EMAIL_USE_TLS', default=True, cast=bool)

UNSPLASH_ACCESS_KEY = os.environ.get('UNSPLASH_ACCESS_KEY')

# ====================
# CELERY (task queue — PRD §3)
# ====================
from celery.schedules import crontab

REDIS_URL = config('REDIS_URL', default='redis://localhost:6379/0')
CELERY_BROKER_URL = REDIS_URL
CELERY_RESULT_BACKEND = REDIS_URL
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE = TIME_ZONE
CELERY_BEAT_SCHEDULER = 'django_celery_beat.schedulers:DatabaseScheduler'

CELERY_BEAT_SCHEDULE = {
    'expire-seat-holds': {
        'task': 'eventra.tasks.expire_seat_holds',
        'schedule': 60.0,  # every minute; holds themselves last SEAT_HOLD_WINDOW_MINUTES
    },
    # Nightly warehouse refresh, staggered so mining always sees the ETL's
    # output rather than racing it: ETL at 2 AM, cuboids at 2:30, mining at 3.
    'nightly-warehouse-etl': {
        'task': 'warehouse.tasks.run_etl_task',
        'schedule': crontab(hour=2, minute=0),
    },
    'nightly-cuboid-refresh': {
        'task': 'warehouse.tasks.refresh_cuboids_task',
        'schedule': crontab(hour=2, minute=30),
    },
    'nightly-mining-run': {
        'task': 'mining.tasks.run_mining_task',
        'schedule': crontab(hour=3, minute=0),
    },
}