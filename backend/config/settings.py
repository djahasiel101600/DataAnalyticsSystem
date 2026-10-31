"""
Django settings for Data Analytics System backend.
"""
import os
from pathlib import Path
from django.core.exceptions import ImproperlyConfigured

BASE_DIR = Path(__file__).resolve().parent.parent

# Load .env from backend directory so OPENAI_API_KEY etc. are set
_env_file = BASE_DIR / '.env'
if _env_file.exists():
    from dotenv import load_dotenv
    load_dotenv(_env_file)

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'dev-secret-key-change-in-production')

# Optional: set OPENAI_API_KEY in .env or environment for AI analytics feature
OPENAI_API_KEY = os.environ.get('OPENAI_API_KEY', '')

DEBUG = os.environ.get('DJANGO_DEBUG', '1') == '1'

if not DEBUG and (
    not os.environ.get('DJANGO_SECRET_KEY')
    or SECRET_KEY in {
        'dev-secret-key-change-in-production',
        'replace-with-a-long-random-secret',
    }
):
    raise ImproperlyConfigured('DJANGO_SECRET_KEY must be configured when DJANGO_DEBUG=0')

ALLOWED_HOSTS = [
    host.strip()
    for host in os.environ.get('DJANGO_ALLOWED_HOSTS', 'localhost,127.0.0.1').split(',')
    if host.strip()
]
ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, 'localhost', '127.0.0.1']))

CSRF_TRUSTED_ORIGINS = [
    origin.strip()
    for origin in os.environ.get('DJANGO_CSRF_TRUSTED_ORIGINS', '').split(',')
    if origin.strip()
]

INSTALLED_APPS = [
    'django.contrib.contenttypes',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'api',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'config.urls'

WSGI_APPLICATION = 'config.wsgi.application'

DATABASES = {}

CORS_ALLOW_ALL_ORIGINS = DEBUG
CORS_ALLOWED_ORIGINS = [
    'http://localhost:5175',
    'http://127.0.0.1:5175',
] if not DEBUG else []

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR.parent / 'frontend' / 'dist'],
        'APP_DIRS': False,
        'OPTIONS': {
            'context_processors': [],
        },
    },
]

# Serve SPA assets under /assets/ so MEDIA_URL /media/ is not within STATIC_URL
STATIC_URL = '/assets/'
_dist = BASE_DIR.parent / 'frontend' / 'dist'
_dist_assets = _dist / 'assets'
STATICFILES_DIRS = [_dist_assets] if _dist_assets.exists() else []
STATIC_ROOT = BASE_DIR / 'staticfiles'
STORAGES = {
    'default': {
        'BACKEND': 'django.core.files.storage.FileSystemStorage',
    },
    'staticfiles': {
        'BACKEND': 'whitenoise.storage.CompressedStaticFilesStorage',
    },
}

MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# SPA: serve index.html for non-API routes
SPA_INDEX = BASE_DIR.parent / 'frontend' / 'dist' / 'index.html'

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'UTC'
USE_I18N = True
USE_TZ = True

SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
SECURE_SSL_REDIRECT = os.environ.get('DJANGO_SECURE_SSL_REDIRECT', '0') == '1'
SECURE_HSTS_SECONDS = int(os.environ.get('DJANGO_SECURE_HSTS_SECONDS', '0'))
SECURE_HSTS_INCLUDE_SUBDOMAINS = False
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = 'same-origin'
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
}
