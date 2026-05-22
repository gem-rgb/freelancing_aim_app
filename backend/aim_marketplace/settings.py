"""
Django settings for aim_marketplace — production-ready via python-decouple.
"""

from pathlib import Path
from datetime import timedelta
from decouple import config, Csv

BASE_DIR = Path(__file__).resolve().parent.parent

# ─── Core ─────────────────────────────────────────────────────────────────────
SECRET_KEY  = config('SECRET_KEY', default='django-insecure-change-me-in-production')
DEBUG       = config('DEBUG', cast=bool, default=True)
ENVIRONMENT = config('ENVIRONMENT', default='development')  # 'development' | 'production'

ALLOWED_HOSTS = config(
    'ALLOWED_HOSTS',
    cast=Csv(),
    default='localhost,127.0.0.1',
)

# ─── Applications ─────────────────────────────────────────────────────────────
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'corsheaders',
    'channels',
    'django_filters',
    'aim_marketplace',
    'authentication',
    'listings',
    'transactions',
    'chat',
    'bounties',
    'verification',
    'escrow',
    'ratings',
    'manager_hiring',
    'fraud_detection',
    'task_engine',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF  = 'aim_marketplace.urls'
WSGI_APPLICATION = 'aim_marketplace.wsgi.application'
ASGI_APPLICATION = 'aim_marketplace.asgi.application'

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

# ─── Database ─────────────────────────────────────────────────────────────────
_db_name = config('DB_NAME', default='')
if _db_name and _db_name != 'db.sqlite3':
    DATABASES = {
        'default': {
            'ENGINE':   'django.db.backends.postgresql',
            'NAME':     _db_name,
            'USER':     config('DB_USER',     default=''),
            'PASSWORD': config('DB_PASSWORD', default=''),
            'HOST':     config('DB_HOST',     default='localhost'),
            'PORT':     config('DB_PORT',     default='5432'),
            'OPTIONS': {'sslmode': config('DB_SSLMODE', default='prefer')},
        }
    }
else:
    DATABASES = {
        'default': {
            'ENGINE': 'django.db.backends.sqlite3',
            'NAME':   BASE_DIR / 'db.sqlite3',
        }
    }

# ─── Auth ─────────────────────────────────────────────────────────────────────
AUTH_USER_MODEL = 'authentication.User'

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

# ─── Internationalisation ─────────────────────────────────────────────────────
LANGUAGE_CODE = 'en-us'
TIME_ZONE     = 'UTC'
USE_I18N      = True
USE_TZ        = True

# ─── Static & Media ───────────────────────────────────────────────────────────
STATIC_URL  = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
MEDIA_URL   = 'media/'
MEDIA_ROOT  = BASE_DIR / 'media'
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ─── Email (SMTP) ─────────────────────────────────────────────────────────────
EMAIL_BACKEND      = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST         = config('EMAIL_HOST',         default=None)
EMAIL_PORT         = config('EMAIL_PORT',         cast=int, default=587)
EMAIL_HOST_USER    = config('EMAIL_HOST_USER',    default=None)
EMAIL_HOST_PASSWORD = config('EMAIL_HOST_PASSWORD', default=None)
EMAIL_USE_TLS      = config('EMAIL_USE_TLS',      cast=bool, default=True)
EMAIL_USE_SSL      = config('EMAIL_USE_SSL',      cast=bool, default=False)

ADMIN_USER_NAME  = config('ADMIN_USER_NAME',  default='AIM Admin')
ADMIN_USER_EMAIL = config('ADMIN_USER_EMAIL', default='')

DEFAULT_FROM_EMAIL = config('EMAIL_HOST_USER', default='noreply@aim.market')
SERVER_EMAIL       = DEFAULT_FROM_EMAIL

MANAGERS = []
ADMINS   = []
if ADMIN_USER_NAME and ADMIN_USER_EMAIL:
    ADMINS   = [(ADMIN_USER_NAME, ADMIN_USER_EMAIL)]
    MANAGERS = ADMINS

# Fallback: use console backend locally when no SMTP host is configured
if not EMAIL_HOST:
    EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'

# ─── OTP ──────────────────────────────────────────────────────────────────────
OTP_EXPIRY_MINUTES = config('OTP_EXPIRY_MINUTES', cast=int, default=10)

# ─── REST Framework ───────────────────────────────────────────────────────────
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_FILTER_BACKENDS': [
        'django_filters.rest_framework.DjangoFilterBackend',
    ],
}

# ─── JWT ──────────────────────────────────────────────────────────────────────
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME':  timedelta(minutes=config('JWT_ACCESS_TOKEN_LIFETIME',  cast=int, default=60)),
    'REFRESH_TOKEN_LIFETIME': timedelta(minutes=config('JWT_REFRESH_TOKEN_LIFETIME', cast=int, default=1440)),
    'ROTATE_REFRESH_TOKENS':  True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM':   'HS256',
    'SIGNING_KEY': config('JWT_SECRET_KEY', default=SECRET_KEY),
}

# ─── CORS ─────────────────────────────────────────────────────────────────────
_cors_origins = config(
    'CORS_ALLOWED_ORIGINS',
    default='http://localhost:3000,http://127.0.0.1:3000',
)
CORS_ALLOWED_ORIGINS = [o.strip() for o in _cors_origins.split(',') if o.strip()]
CORS_ALLOW_CREDENTIALS = True

# ─── Channels / Redis ─────────────────────────────────────────────────────────
CHANNEL_LAYERS = {
    'default': {
        'BACKEND': 'channels_redis.core.RedisChannelLayer',
        'CONFIG': {
            'hosts': [config('REDIS_URL', default='redis://localhost:6379/0')],
        },
    },
}

# ─── Celery ───────────────────────────────────────────────────────────────────
CELERY_BROKER_URL        = config('CELERY_BROKER_URL',    default='redis://localhost:6379/0')
CELERY_RESULT_BACKEND    = config('CELERY_RESULT_BACKEND', default='redis://localhost:6379/1')
CELERY_ACCEPT_CONTENT    = ['json']
CELERY_TASK_SERIALIZER   = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_TIMEZONE          = 'UTC'

# ─── MinIO / S3 ───────────────────────────────────────────────────────────────
AWS_ACCESS_KEY_ID       = config('AWS_ACCESS_KEY_ID',       default='minioadmin')
AWS_SECRET_ACCESS_KEY   = config('AWS_SECRET_ACCESS_KEY',   default='minioadmin123')
AWS_STORAGE_BUCKET_NAME = config('AWS_STORAGE_BUCKET_NAME', default='aim-content')
AWS_S3_REGION_NAME      = config('AWS_S3_REGION_NAME',      default='us-east-1')
AWS_S3_ENDPOINT_URL     = config('AWS_S3_ENDPOINT_URL',     default='http://localhost:9000')
AWS_S3_FILE_OVERWRITE   = False
AWS_DEFAULT_ACL         = 'private'
AWS_S3_SIGNATURE_VERSION = 's3v4'

# ─── Paystack ─────────────────────────────────────────────────────────────────
PAYSTACK_SECRET_KEY = config('PAYSTACK_SECRET_KEY', default='')
PAYSTACK_PUBLIC_KEY = config('PAYSTACK_PUBLIC_KEY', default='')

# ─── M-Pesa (Safaricom Daraja) ────────────────────────────────────────────────
MPESA_ENVIRONMENT        = config('MPESA_ENVIRONMENT',        default='sandbox')  # 'sandbox' | 'production'
MPESA_CONSUMER_KEY       = config('MPESA_CONSUMER_KEY',       default='')
MPESA_CONSUMER_SECRET    = config('MPESA_CONSUMER_SECRET',    default='')
MPESA_SHORTCODE          = config('MPESA_SHORTCODE',          default='174379')   # Safaricom sandbox default
MPESA_PASSKEY            = config('MPESA_PASSKEY',            default='')
MPESA_CALLBACK_URL       = config('MPESA_CALLBACK_URL',       default='https://yourdomain.com/api/transactions/mpesa/webhook/')
MPESA_ACCOUNT_REFERENCE  = config('MPESA_ACCOUNT_REFERENCE',  default='AIM')
MPESA_TRANSACTION_DESC   = config('MPESA_TRANSACTION_DESC',   default='AIM Marketplace Payment')

# ─── Frontend & Platform ──────────────────────────────────────────────────────
FRONTEND_URL             = config('FRONTEND_URL',             default='http://localhost:3000')
PLATFORM_FEE_PERCENT     = config('PLATFORM_FEE_PERCENT',     cast=int, default=15)
MINIMUM_SELLER_STAKE     = config('MINIMUM_SELLER_STAKE',     cast=int, default=500)
ESCROW_AUTO_RELEASE_HOURS = config('ESCROW_AUTO_RELEASE_HOURS', cast=int, default=12)
ENCRYPTION_KEY           = config('ENCRYPTION_KEY', default='development-32-byte-encryption-key')

# ─── Production security ──────────────────────────────────────────────────────
if not DEBUG:
    SECURE_SSL_REDIRECT            = True
    SECURE_HSTS_SECONDS            = 31536000
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD            = True
    SECURE_BROWSER_XSS_FILTER      = True
    SECURE_CONTENT_TYPE_NOSNIFF    = True
    SESSION_COOKIE_SECURE          = True
    CSRF_COOKIE_SECURE             = True
    X_FRAME_OPTIONS                = 'DENY'
    _csrf_trusted = config('CSRF_TRUSTED_ORIGINS', default='')
    if _csrf_trusted:
        CSRF_TRUSTED_ORIGINS = [o.strip() for o in _csrf_trusted.split(',') if o.strip()]

# ─── Logging ──────────────────────────────────────────────────────────────────
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {'format': '{levelname} {asctime} {module} {message}', 'style': '{'},
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': BASE_DIR / 'debug.log',
            'formatter': 'verbose',
        },
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'] if DEBUG else ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'aim_marketplace': {
            'handlers': ['file', 'console'] if DEBUG else ['file'],
            'level': 'DEBUG' if DEBUG else 'WARNING',
            'propagate': True,
        },
    },
}

# ── ML Microservice ──────────────────────────────────────────────────────
import os
ML_SERVICE_URL = os.environ.get('ML_SERVICE_URL', 'http://localhost:8100')
ML_SERVICE_TIMEOUT = float(os.environ.get('ML_SERVICE_TIMEOUT', '30'))

# ── Celery Beat Schedule ─────────────────────────────────────────────────
CELERY_BEAT_SCHEDULE = {
    'process-escrow-releases': {
        'task': 'escrow.process_scheduled_releases',
        'schedule': 300.0,  # Every 5 minutes
    },
    'daily-trust-snapshot': {
        'task': 'ratings.take_daily_snapshot',
        'schedule': 86400.0,  # Daily
    },
    'recalculate-trust-scores': {
        'task': 'ratings.recalculate_all_trust',
        'schedule': 3600.0,  # Hourly
    },
    'recalculate-manager-rankings': {
        'task': 'task_engine.recalculate_rankings',
        'schedule': 1800.0,  # Every 30 minutes
    },
    'expire-overdue-tasks': {
        'task': 'task_engine.expire_overdue_tasks',
        'schedule': 600.0,  # Every 10 minutes
    },
}
