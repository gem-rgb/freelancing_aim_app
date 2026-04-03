import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "aim_marketplace.settings")

app = Celery("aim_marketplace")
app.config_from_object("django.conf:settings", namespace="CELERY")
app.autodiscover_tasks()


# ── Periodic Tasks ────────────────────────────────────────────────────────────
app.conf.beat_schedule = {
    # Auto-release escrow transactions older than 72 h
    "auto-release-escrow": {
        "task": "transactions.tasks.auto_release_escrow",
        "schedule": crontab(minute="*/30"),  # every 30 min
    },
    # Expire old bounties past their deadline
    "expire-old-bounties": {
        "task": "bounties.tasks.expire_bounties",
        "schedule": crontab(minute=0, hour="*/6"),  # every 6 h
    },
}

app.conf.timezone = "UTC"


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f"Request: {self.request!r}")
