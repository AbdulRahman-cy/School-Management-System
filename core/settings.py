"""
Django settings for core project.
"""

from datetime import timedelta
from pathlib import Path
from environ import Env

BASE_DIR = Path(__file__).resolve().parent.parent

env = Env()
env.read_env()

SECRET_KEY = env('SECRET_KEY')
ENVIRONMENT = env('ENVIRONMENT', default='production')

if ENVIRONMENT == 'production':
    DEBUG = False
else:
    DEBUG = True

# ─── Hosts / CSRF ─────────────────────────────────────────────────────────────
# CHANGED: was `ALLOWED_HOSTS = []`, which 403s every request once DEBUG=False.
# Comma-separated in .env, e.g.:
#   ALLOWED_HOSTS=your-domain.com,www.your-domain.com,203.0.113.10
ALLOWED_HOSTS = env.list('ALLOWED_HOSTS', default=['localhost', '127.0.0.1'])

# NEW: required by Django 4+ for any unsafe (POST/PUT/DELETE/PATCH) request
# that isn't strictly same-origin. Must include the scheme (https://).
CSRF_TRUSTED_ORIGINS = env.list("CSRF_TRUSTED_ORIGINS")
INSTALLED_APPS = [
    'corsheaders',
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'users',
    'academics',
    'scheduling',
    'records',
    'rest_framework',
    'django_filters',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'drf_spectacular',
]

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

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# ─── Database ─────────────────────────────────────────────────────────────────
# CHANGED: was hardcoded to the dev docker-compose values. Reading from env
# means this SAME file works locally and in prod — only .env differs. Names
# match the official postgres image's own env vars (POSTGRES_DB/USER/
# PASSWORD), so the db service and Django read the exact same .env.
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': env('POSTGRES_DB', default='university_db'),
        'USER': env('POSTGRES_USER', default='postgres_user'),
        'PASSWORD': env('POSTGRES_PASSWORD', default='postgres_password'),
        'HOST': env('POSTGRES_HOST', default='db'),
        'PORT': env('POSTGRES_PORT', default='5432'),
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True

# ─── Static & media ───────────────────────────────────────────────────────────
STATIC_URL = 'static/'
# NEW: collectstatic needs somewhere to put files. nginx serves this folder
# directly at /static/ — admin CSS/JS and drf-spectacular's docs UI need it.
STATIC_ROOT = BASE_DIR / 'staticfiles'

# NEW: only relevant if you actually store uploaded files (ImageField/
# FileField). Delete these two lines if you don't have any.
MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

AUTH_USER_MODEL = 'users.BaseUser'

# ─── CORS ─────────────────────────────────────────────────────────────────────
# We use a Vite proxy in dev (frontend → /api → Django), and nginx does the
# exact same job in prod, so requests are same-origin from the browser's
# point of view either way. CORS is a safety net for anything that bypasses
# that proxy, not something the deployed app actually depends on.
#
# CHANGED: origins now come from env instead of being hardcoded, so adding
# a staging domain later doesn't mean editing code.
CORS_ALLOWED_ORIGINS = env.list('CORS_ALLOWED_ORIGINS', default=[
    'http://localhost:5173',
    'http://127.0.0.1:5173',
])
CORS_ALLOW_CREDENTIALS = True

# ─── DRF ──────────────────────────────────────────────────────────────────────

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'users.api.authentication.JWTCookieAuthentication',
    ),
    'DEFAULT_SCHEMA_CLASS': 'drf_spectacular.openapi.AutoSchema',

    # Every list endpoint returns {count, next, previous, results}.
    'DEFAULT_PAGINATION_CLASS': 'core.pagination.StandardPagination',

    # Throttle state lives in the default cache. With no CACHES configured that
    # is per-process LocMemCache, so each gunicorn worker counts separately
    # (effective limit = rate x workers) and counters reset on restart. Point
    # CACHES at Redis for exact, shared limits.
    'DEFAULT_THROTTLE_CLASSES': (
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ),
    'DEFAULT_THROTTLE_RATES': {
        # Per IP. Kept generous because a whole campus can share one NAT IP;
        # brute force is handled per-account by the 'login' scope below.
        'anon':  env('THROTTLE_RATE_ANON',  default='100/minute'),
        # Per user. The enrollment page polls live-capacities every 5 s (12/min).
        'user':  env('THROTTLE_RATE_USER',  default='300/minute'),
        # Per target email on the login endpoint (users.api.throttling).
        'login': env('THROTTLE_RATE_LOGIN', default='5/minute'),
        # Django admin login POSTs, per IP and per username (core.admin_login).
        'admin_login': env('THROTTLE_RATE_ADMIN_LOGIN', default='5/minute'),
    },
    # nginx sits in front of gunicorn and appends the client IP to
    # X-Forwarded-For. Without this, every anonymous client would be throttled
    # as the nginx container's IP; with it, DRF trusts only the last hop nginx
    # added, so a client-supplied X-Forwarded-For can't spoof its identity.
    'NUM_PROXIES': env.int('DRF_NUM_PROXIES', default=1),
}

# ─── SimpleJWT ────────────────────────────────────────────────────────────────

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':    timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME':   timedelta(days=7),
    'ROTATE_REFRESH_TOKENS':    True,    # new refresh on every refresh call
    'BLACKLIST_AFTER_ROTATION': True,    # old refresh becomes unusable
    'AUTH_HEADER_TYPES':        ('Bearer',),
}

ACCOUNT_USERNAME_BLACKLIST = ['admin', 'root', 'superuser', 'staff', 'user', 'test']

# ─── Production hardening ─────────────────────────────────────────────────────
# NEW: everything below only activates once DEBUG=False, so none of it can
# interfere with local dev.
if not DEBUG:
    # nginx terminates TLS and talks to gunicorn over plain HTTP inside the
    # docker network. Without this header, Django assumes every request is
    # insecure — request.is_secure() is always False, which breaks anything
    # that redirects to HTTPS or marks cookies Secure based on it.
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

    # Leave these False until you actually have a working TLS cert (Phase 7
    # in the roadmap) — turning them on first locks you out over plain HTTP.
    SECURE_SSL_REDIRECT = env.bool('SECURE_SSL_REDIRECT', default=False)
    SESSION_COOKIE_SECURE = env.bool('SECURE_SSL_REDIRECT', default=False)
    CSRF_COOKIE_SECURE = env.bool('SECURE_SSL_REDIRECT', default=False)

# ─── Logging ───────────────────────────────────────────────────────────────────
# NEW: sends everything to stdout, which is exactly what
# `docker compose logs backend` reads from. Without this, unhandled errors
# in prod are easy to lose.
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {'class': 'logging.StreamHandler'},
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
}